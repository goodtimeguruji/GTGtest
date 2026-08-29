import bcrypt    from "bcryptjs";
import validator from "validator";
import { db }    from "./db.js";
import {
  getMuhuratHistory,
  getMuhuratRequestResults,
  deleteMuhuratRequest
} from "./muhuratService.js";

// ── GET PROFILE ───────────────────────────────────────────────────────────────
// Returns everything the Profile page needs to render: name, email,
// mobile number, account type (Google vs password), and join date.
export const getProfile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, email, mobile_number, google_id, email_verified, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const u = rows[0];
    res.json({
      success: true,
      profile: {
        name:          u.name,
        email:         u.email,
        mobileNumber:  u.mobile_number || "",
        accountType:   u.google_id ? "google" : "password",
        emailVerified: !!u.email_verified,
        memberSince:   u.created_at
      }
    });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Get profile error:`, err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── UPDATE PROFILE ────────────────────────────────────────────────────────────
// Allows updating name + mobile number always. Password change is only
// permitted for password-based accounts (Google accounts have no password
// to change — Google manages that credential).
export const updateProfile = async (req, res) => {
  try {
    const { name, mobileNumber, currentPassword, newPassword } = req.body;

    const [rows] = await db.execute(
      "SELECT id, password_hash, google_id FROM users WHERE id = ?",
      [req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    const user = rows[0];

    // ── Name ──
    let cleanName = null;
    if (name !== undefined) {
      cleanName = validator.escape(String(name).trim());
      if (cleanName.length < 2 || cleanName.length > 60) {
        return res.status(400).json({ success: false, message: "Name must be 2–60 characters" });
      }
    }

    // ── Mobile number (optional field, basic sanity check only) ──
    let cleanMobile = null;
    if (mobileNumber !== undefined) {
      const trimmed = String(mobileNumber).trim();
      if (trimmed && !/^[0-9+\-\s]{6,20}$/.test(trimmed)) {
        return res.status(400).json({ success: false, message: "Invalid mobile number format" });
      }
      cleanMobile = trimmed;
    }

    // ── Password change (password accounts only) ──
    if (newPassword) {
      if (user.google_id && !user.password_hash) {
        return res.status(400).json({
          success: false,
          message: "This account uses Google Sign-In and has no password to change."
        });
      }
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password required to set a new password" });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password_hash || "");
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Current password is incorrect" });
      }

      if (
        newPassword.length < 8 ||
        !/[A-Z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword) ||
        !/[^A-Za-z0-9]/.test(newPassword)
      ) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 8 characters and include an uppercase letter, a number, and a special character"
        });
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, user.id]);
    }

    // ── Apply name / mobile updates ──
    const updates = [];
    const params  = [];
    if (cleanName !== null)   { updates.push("name = ?");           params.push(cleanName); }
    if (cleanMobile !== null) { updates.push("mobile_number = ?");  params.push(cleanMobile); }

    if (updates.length) {
      params.push(user.id);
      await db.execute(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    console.log(`[${new Date().toISOString()}] ✅ Profile updated: user_id=${user.id}`);
    res.json({ success: true, message: "Profile updated successfully" });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Update profile error:`, err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── LIST SEARCH HISTORY ───────────────────────────────────────────────────────
// Paginated list of past searches (newest first), via muhuratService.js.
// Lightweight rows only — no per-date results. Use getSearchById for the
// full breakdown when the user clicks into one entry.
export const listSearchHistory = async (req, res) => {
  try {
    const page  = parseInt(req.query.page, 10)  || 1;
    const limit = parseInt(req.query.limit, 10) || 15;

    const { rows, pagination } = await getMuhuratHistory(req.user.id, { page, limit });

    res.json({ success: true, history: rows, pagination });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ List search history error:`, err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GET ONE SEARCH (FULL RESULTS) ─────────────────────────────────────────────
// Returns the parent request row plus every individual result date
// (filtered + common), each with its full timerange (start/end/lagna).
export const getSearchById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await getMuhuratRequestResults(id, req.user.id);

    if (!data) {
      return res.status(404).json({ success: false, message: "Search record not found" });
    }

    res.json({
      success: true,
      search: {
        id:               data.request.id,
        serviceName:      data.request.service_name,
        selectedFunction: data.request.selected_function,
        fromDate:         data.request.from_date,
        toDate:           data.request.to_date,
        nakshatra:        data.request.nakshatra,
        rasi:             data.request.rasi,
        location:         data.request.location,
        status:           data.request.status,
        resultCount:      data.request.result_count,
        createdAt:        data.request.created_at,
        completedAt:      data.request.completed_at,
        errorMessage:     data.request.error_message,
        filtered:         data.filtered,
        common:           data.common
      }
    });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Get search by id error:`, err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── DELETE ONE SEARCH ─────────────────────────────────────────────────────────
// Deletes the parent muhurat_requests row; muhurat_results rows are removed
// automatically via ON DELETE CASCADE.
export const deleteSearch = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteMuhuratRequest(id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Search record not found" });
    }

    res.json({ success: true, message: "Search deleted" });

  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Delete search error:`, err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
