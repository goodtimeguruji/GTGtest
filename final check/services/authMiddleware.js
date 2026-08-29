import jwt  from "jsonwebtoken";
import { db } from "./db.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    // 1. Verify signature & expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

    // 2. Check session is still active in DB (handles logout/revocation)
    const [rows] = await db.execute(
      "SELECT status, expires_at FROM user_sessions WHERE token = ? AND user_id = ?",
      [token, decoded.id]
    );

    if (!rows.length || rows[0].status !== "active") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 3. Check DB-side expiry (double-check beyond JWT expiry)
    const expiresAt = new Date(rows[0].expires_at).getTime();
    if (!expiresAt || expiresAt < Date.now()) {
      await db.execute("UPDATE user_sessions SET status = 'expired' WHERE token = ?", [token]);
      return res.status(401).json({ message: "Session expired" });
    }

    // 4. Defense in depth: confirm the account is still email-verified.
    //    (A token can only be issued post-verification, but this guards
    //    against edge cases like manual DB rollbacks or token replay.)
    const [userRows] = await db.execute(
      "SELECT email_verified FROM users WHERE id = ?",
      [decoded.id]
    );

    if (!userRows.length || !userRows[0].email_verified) {
      return res.status(403).json({ message: "Please verify your email to access this feature." });
    }

    req.user = decoded;
    next();

  } catch (err) {
    // Don't reveal whether it was expired vs invalid
    console.error(`[${new Date().toISOString()}] Auth error: ${err.message}`);
    return res.status(401).json({ message: "Unauthorized" });
  }
};