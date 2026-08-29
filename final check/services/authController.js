import bcrypt        from "bcryptjs";
import jwt            from "jsonwebtoken";
import crypto          from "crypto";
import { OAuth2Client } from "google-auth-library";
import { db }          from "./db.js";
import validator       from "validator"; // npm i validator
import { sendVerificationEmail } from "./emailService.js"; // see note below

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// ── helpers ───────────────────────────────────────────────────────────────────

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h", algorithm: "HS256" });
}

async function saveSession(userId, token) {
  await db.execute(
    "INSERT INTO user_sessions (user_id, token, expires_at, status) VALUES (?, ?, ?, 'active')",
    [userId, token, new Date(Date.now() + 12 * 60 * 60 * 1000)]
  );
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

async function createAndSendVerification(userId, email, name) {
  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  await db.execute(
    "INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, token, expiresAt]
  );

  // Fire-and-forget — don't fail signup if the email provider hiccups.
  try {
    await sendVerificationEmail(email, name, token);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Verification email failed for ${email}:`, err.message);
  }
}

// ── SIGNUP ────────────────────────────────────────────────────────────────────
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Presence check
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // 2. Input validation & sanitization
    const cleanName  = validator.escape(name.trim());
    const cleanEmail = validator.normalizeEmail(email.trim());

    if (!cleanEmail || !validator.isEmail(cleanEmail)) {
      return res.status(400).json({ message: "Invalid email address" });
    }
    if (cleanName.length < 2 || cleanName.length > 60) {
      return res.status(400).json({ message: "Name must be 2–60 characters" });
    }

    // 3. Password strength
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      return res.status(400).json({
        message: "Password must be at least 8 characters and include an uppercase letter, a number, and a special character"
      });
    }

    // 4. Duplicate check — one account per email, regardless of how it was created.
    //    (Covers both password accounts and Google accounts sharing the same address.)
    const [existing] = await db.execute("SELECT id FROM users WHERE email = ?", [cleanEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    // 5. Hash & store — email_verified starts false; user must confirm via email link.
    const hashedPassword = await bcrypt.hash(password, 12); // 12 rounds
    const [result] = await db.execute(
      "INSERT INTO users (name, email, password_hash, email_verified) VALUES (?, ?, ?, 0)",
      [cleanName, cleanEmail, hashedPassword]
    );

    // 6. Send verification email — do NOT issue a login token yet.
    //    The user can't access site features until they verify.
    await createAndSendVerification(result.insertId, cleanEmail, cleanName);

    console.log(`[${new Date().toISOString()}] ✅ Signup (pending verification): ${cleanEmail}`);
    res.status(201).json({
      message: "Signup successful. Please check your email to verify your account before logging in.",
      requiresVerification: true
    });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Signup error:`, err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ── VERIFY EMAIL ──────────────────────────────────────────────────────────────
// This is hit by the user clicking the link in their inbox (a plain GET, not
// an API/XHR call), so it redirects to a dedicated confirmation page rather
// than returning raw JSON. verify-email.html reads ?verified=1|0&reason=...
// and shows the appropriate state (success / expired / invalid / error).
export const verifyEmail = async (req, res) => {
  const redirect = (params) => res.redirect(`/verify-email.html?${new URLSearchParams(params)}`);

  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return redirect({ verified: "0", reason: "missing_token" });
    }

    const [rows] = await db.execute(
      "SELECT user_id, expires_at FROM email_verifications WHERE token = ?",
      [token]
    );

    if (!rows.length) {
      return redirect({ verified: "0", reason: "invalid" });
    }

    const { user_id, expires_at } = rows[0];

    if (new Date(expires_at).getTime() < Date.now()) {
      // Clean up the expired token so it can't be reused
      await db.execute("DELETE FROM email_verifications WHERE token = ?", [token]);
      return redirect({ verified: "0", reason: "expired" });
    }

    await db.execute("UPDATE users SET email_verified = 1 WHERE id = ?", [user_id]);

    // Token is single-use — remove all verification tokens for this user.
    await db.execute("DELETE FROM email_verifications WHERE user_id = ?", [user_id]);

    console.log(`[${new Date().toISOString()}] ✅ Email verified: user_id=${user_id}`);
    return redirect({ verified: "1" });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Verify email error:`, err.message);
    return redirect({ verified: "0", reason: "server_error" });
  }
};

// ── RESEND VERIFICATION ───────────────────────────────────────────────────────
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const cleanEmail = validator.normalizeEmail(email.trim());
    const [users] = await db.execute(
      "SELECT id, name, email_verified, google_id FROM users WHERE email = ?",
      [cleanEmail]
    );

    // Always respond generically — don't reveal whether the email exists.
    const genericResponse = {
      success: true,
      message: "If an account with this email exists and is unverified, a new verification link has been sent."
    };

    if (!users.length || users[0].google_id || users[0].email_verified) {
      return res.json(genericResponse);
    }

    // Remove any stale tokens, then issue a fresh one.
    await db.execute("DELETE FROM email_verifications WHERE user_id = ?", [users[0].id]);
    await createAndSendVerification(users[0].id, cleanEmail, users[0].name);

    return res.json(genericResponse);

  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Resend verification error:`, err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const cleanEmail = validator.normalizeEmail(email.trim());
    if (!cleanEmail || !validator.isEmail(cleanEmail)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [cleanEmail]);

    // Use constant-time comparison path even when user not found (prevents timing attacks)
    const dummyHash = "$2a$12$invalidhashfortimingattackprevention000000000000000000000";
    const user      = users[0] || { password_hash: dummyHash };

    // Account exists but was created via Google only — no password to check against.
    // Compare against the dummy hash anyway (constant-time) so we don't leak
    // via timing whether the account exists or is Google-only, then respond generically.
    const hashToCompare = user.password_hash || dummyHash;
    const isMatch = await bcrypt.compare(password, hashToCompare);

    if (!users[0] || !user.password_hash || !isMatch) {
      if (users[0] && !user.password_hash) {
        // Account exists and is Google-only — give a specific, helpful message.
        return res.status(401).json({ message: "This account uses Google Sign-In. Please continue with Google." });
      }
      // Generic message — don't reveal whether email exists
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Email/password accounts must be verified before logging in.
    if (!user.email_verified) {
      return res.status(403).json({
        message: "Please verify your email before logging in. Check your inbox for the verification link.",
        requiresVerification: true
      });
    }

    const token = generateToken({ id: user.id, email: user.email, name: user.name });
    await saveSession(user.id, token);

    console.log(`[${new Date().toISOString()}] ✅ Login: ${cleanEmail}`);
    res.json({ message: "Login successful", token });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Login error:`, err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ── GOOGLE LOGIN ──────────────────────────────────────────────────────────────
// Google has already verified the email address (we check payload.email_verified
// below), so Google accounts skip both the password check AND our own email
// verification step entirely — they're trusted from the moment of sign-in.
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "Token required" });
    }

    const ticket = await client.verifyIdToken({
      idToken:  token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload?.email_verified) {
      return res.status(401).json({ message: "Google email not verified" });
    }

    const { email, name, sub } = payload;
    const cleanEmail = validator.normalizeEmail(email);
    const cleanName  = validator.escape(name || "");

    const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [cleanEmail]);
    let user;

    if (users.length === 0) {
      // Brand-new account via Google — auto-verified, no password set.
      const [result] = await db.execute(
        "INSERT INTO users (name, email, google_id, email_verified) VALUES (?, ?, ?, 1)",
        [cleanName, cleanEmail, sub]
      );
      user = { id: result.insertId, email: cleanEmail, name: cleanName };
    } else {
      user = users[0];

      // Existing email/password account signing in with Google for the first time:
      // link the google_id and mark verified (Google already proved ownership).
      if (!user.google_id || !user.email_verified) {
        await db.execute(
          "UPDATE users SET google_id = COALESCE(google_id, ?), email_verified = 1 WHERE id = ?",
          [sub, user.id]
        );
      }
    }

    const jwtToken = generateToken({ id: user.id, email: user.email, name: user.name || cleanName });
    await saveSession(user.id, jwtToken);

    console.log(`[${new Date().toISOString()}] ✅ Google login: ${cleanEmail}`);
    res.json({ message: "Google login success", token: jwtToken });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Google login error:`, err.message);
    res.status(401).json({ message: "Invalid Google token" });
  }
};

// ── GET USER ──────────────────────────────────────────────────────────────────
export const getUser = (req, res) => {
  try {
    res.json({ success: true, username: req.user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// ── LOGOUT ────────────────────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      await db.execute("UPDATE user_sessions SET status = 'expired' WHERE token = ?", [token]);
    }
    console.log(`[${new Date().toISOString()}] ✅ Logout: ${req.user?.email}`);
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};
