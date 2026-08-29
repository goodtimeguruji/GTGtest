import nodemailer from "nodemailer";

// ── Date / time helpers ───────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-");
  return `${day}-${month}-${year}`;
}

function extractTime(dt) {
  if (!dt) return "";
  if (dt.includes("T")) return dt.split("T")[1];
  if (dt.includes(" ")) return dt.split(" ")[1];
  return dt;
}

// ── Design tokens (mirrors --primary-color #8b5a2b palette) ──────────────────
const C = {
  primary:     "#8b5a2b",
  primaryDark: "#6b4320",
  primaryLight:"#f5ede4",
  gold:        "#c9933a",
  goldLight:   "#fdf3e3",
  border:      "#e0c9b3",
  text:        "#3a2710",
  textMuted:   "#7a6050",
  white:       "#ffffff",
  rowAlt:      "#fdf8f4",
  rowHover:    "#f5ede4",
};

// ── Vara → English ────────────────────────────────────────────────────────────
const varaMap = {
  Raviwara: "Sunday", Somawara: "Monday", Mangalawara: "Tuesday",
  Budhawara: "Wednesday", Guruwara: "Thursday",
  Shukrawara: "Friday", Shaniwara: "Saturday",
};

// ── Build time+lagna mini-table (mirrors the lagna-table on the results page) ─
function renderTimeLagnaTable(timerange = []) {
  if (!timerange.length) {
    return `<span style="color:${C.textMuted};font-style:italic;">No valid intervals</span>`;
  }

  const rows = timerange.map((t, i) => {
    const start = extractTime(t.start_time);
    const end   = extractTime(t.end_time);
    const signs = Array.isArray(t.targetSigns) && t.targetSigns.length
      ? t.targetSigns
      : [t.targetSign || t.lagnaSign || "—"];
    const lagna = signs.join(", ");
    const bg    = i % 2 === 1 ? C.rowAlt : C.white;
    return `
      <tr style="background:${bg};">
        <td style="padding:8px 14px;font-family:monospace;font-size:13px;
                   color:${C.text};border-bottom:1px solid ${C.border};
                   white-space:nowrap;">${start}&nbsp;→&nbsp;${end}</td>
        <td style="padding:8px 14px;font-weight:600;font-size:13px;
                   color:${C.primary};border-bottom:1px solid ${C.border};
                   white-space:nowrap;">${lagna}</td>
      </tr>`;
  }).join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border-collapse:collapse;border-radius:6px;overflow:hidden;
                  border:1px solid ${C.border};font-family:Arial,sans-serif;">
      <thead>
        <tr style="background:${C.primaryLight};">
          <th style="padding:8px 14px;text-align:left;font-size:12px;
                     font-weight:700;color:${C.primary};
                     border-bottom:2px solid ${C.border};white-space:nowrap;">
            Time Window
          </th>
          <th style="padding:8px 14px;text-align:left;font-size:12px;
                     font-weight:700;color:${C.primary};
                     border-bottom:2px solid ${C.border};white-space:nowrap;">
            Lagna
          </th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── One detail row (label : value) ────────────────────────────────────────────
function detailRow(label, value, wide = false) {
  const valStyle = wide
    ? `padding:10px 14px;vertical-align:top;color:${C.text};font-size:14px;`
    : `padding:10px 14px;color:${C.text};font-size:14px;`;
  return `
    <tr>
      <td style="padding:10px 14px;white-space:nowrap;font-weight:600;
                 color:${C.textMuted};font-size:13px;vertical-align:top;
                 width:130px;">${label}</td>
      <td style="padding:10px 14px;color:${C.textMuted};font-size:13px;
                 vertical-align:top;width:10px;">:</td>
      <td style="${valStyle}">${value}</td>
    </tr>`;
}

// ── Build one Muhurat card (mirrors .time-card layout) ────────────────────────
function buildCard(item, badgeLabel, badgeGold = true) {
  const date      = formatDate(item.date);
  const wara      = item.wara || "";
  const day       = wara ? `${wara} (${varaMap[wara] || wara})` : "—";
  const nakshatra = item.nakshatraStr || "—";
  const tithi     = item.tithiStr    || "—";
  const yoga      = item.yogaStr     || "—";
  const karana    = item.karanaStr   || "—";

  const badgeBg  = badgeGold ? C.gold      : C.primaryDark;
  const badgeTxt = badgeGold ? C.goldLight : "#e8d5c4";

  return `
  <!-- Card -->
  <table width="100%" cellpadding="0" cellspacing="0"
         style="border-collapse:collapse;border-radius:10px;overflow:hidden;
                border:1px solid ${C.border};margin-bottom:28px;
                box-shadow:0 2px 8px rgba(139,90,43,.12);
                font-family:Arial,sans-serif;">
    <!-- Badge -->
    <tr>
      <td style="background:${badgeBg};padding:12px 20px;">
        <span style="color:${badgeTxt};font-size:15px;font-weight:700;
                     letter-spacing:.4px;">${badgeLabel}</span>
      </td>
    </tr>
    <!-- Detail rows -->
    <tr>
      <td style="padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="border-collapse:collapse;">
          ${detailRow("Date",      date)}
          ${detailRow("Day",       day)}
          <tr>
            <td style="padding:10px 14px;white-space:nowrap;font-weight:600;
                       color:${C.textMuted};font-size:13px;vertical-align:top;
                       width:130px;">Time &amp; Lagna</td>
            <td style="padding:10px 14px;color:${C.textMuted};font-size:13px;
                       vertical-align:top;width:10px;">:</td>
            <td style="padding:10px 14px;vertical-align:top;">
              ${renderTimeLagnaTable(item.timerange || [])}
            </td>
          </tr>
          ${detailRow("Nakshatra", nakshatra)}
          ${detailRow("Tithi",     tithi)}
          ${detailRow("Yoga",      yoga)}
          ${detailRow("Karana",    karana)}
        </table>
      </td>
    </tr>
  </table>`;
}

// ── Full email HTML ───────────────────────────────────────────────────────────
function buildEmailHtml(results, selectedFunction) {
  const [best, ...rest] = results;

  const bestCard = buildCard(best, `✦ Best Time for ${selectedFunction}`, true);

  const nextCards = rest.length
    ? rest.map((item, i) =>
        buildCard(item, `Next Best Time ${rest.length > 1 ? `– Option ${i + 1}` : ""}for ${selectedFunction}`, false)
      ).join("")
    : "";

  const nextSection = rest.length ? `
    <!-- Next Best heading -->
    <tr><td style="padding:4px 0 12px;">
      <p style="margin:0;font-size:16px;font-weight:700;color:${C.primaryDark};
                font-family:Arial,sans-serif;">Next Best Muhurat Timings</p>
    </td></tr>
    <tr><td>${nextCards}</td></tr>` : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0e8df;font-family:Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:#f0e8df;padding:32px 0;">
    <tr><td align="center">

      <!-- Email container -->
      <table width="620" cellpadding="0" cellspacing="0"
             style="max-width:620px;width:100%;border-radius:12px;overflow:hidden;
                    box-shadow:0 4px 20px rgba(139,90,43,.18);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${C.primaryDark} 0%,${C.primary} 100%);
                     padding:28px 32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:22px;font-weight:800;
                      color:${C.white};letter-spacing:.6px;
                      font-family:Georgia,serif;">✦ Good Time Guruji</p>
            <p style="margin:0;font-size:12px;color:#e8d5c4;letter-spacing:.8px;
                      text-transform:uppercase;">
              Ancient Hindu Insight · Modern Technology · Smarter Decisions
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:${C.white};padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">

              <!-- Greeting -->
              <tr><td style="padding-bottom:20px;">
                <p style="margin:0 0 8px;font-size:15px;color:${C.text};">Dear User,</p>
                <p style="margin:0;font-size:14px;color:${C.textMuted};line-height:1.6;">
                  Please find below the recommended Muhurat timings for
                  <strong style="color:${C.primary};">${selectedFunction}</strong>.
                  These recommendations are based on traditional Vedic astrological calculations.
                </p>
              </td></tr>

              <!-- Divider -->
              <tr><td style="padding-bottom:20px;">
                <hr style="border:none;border-top:1px solid ${C.border};margin:0;">
              </td></tr>

              <!-- Best Muhurat heading -->
              <tr><td style="padding-bottom:12px;">
                <p style="margin:0;font-size:16px;font-weight:700;
                           color:${C.primaryDark};font-family:Arial,sans-serif;">
                  Best Muhurat
                </p>
              </td></tr>

              <!-- Best card -->
              <tr><td>${bestCard}</td></tr>

              ${nextSection}

              <!-- Footer note -->
              <tr><td style="padding-top:8px;">
                <hr style="border:none;border-top:1px solid ${C.border};margin:0 0 16px;">
                <p style="margin:0;font-size:13px;color:${C.textMuted};line-height:1.6;">
                  Warm regards,<br>
                  <strong style="color:${C.primary};">Good Time Guruji</strong><br>
                  <a href="mailto:support@goodtimeguruji.in"
                     style="color:${C.gold};text-decoration:none;font-size:12px;">
                    support@goodtimeguruji.in
                  </a>
                </p>
              </td></tr>

            </table>
          </td>
        </tr>

        <!-- Footer bar -->
        <tr>
          <td style="background:${C.primaryDark};padding:14px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#c9a882;letter-spacing:.4px;">
              © 2026 Good Time Guruji · All Rights Reserved
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

// ── Route handler ─────────────────────────────────────────────────────────────
export const sendMuhuratEmail = async (req, res) => {
  try {
    const { filtered = [], common = [], selectedFunction = "Muhurat" } = req.body;
    const email = req.user?.email;

    if (!email) {
      return res.status(400).json({ success: false, message: "User email not found" });
    }

    const allFiltered = Array.isArray(filtered) ? filtered : [];
    const allCommon   = Array.isArray(common)   ? common   : [];

    if (!allFiltered.length && !allCommon.length) {
      return res.status(400).json({ success: false, message: "No Muhurat results available" });
    }

    // Mirror the same Best/Next-Best split used on muhurat-result.html:
    // Best = filtered[0] (fallback to common[0]); Next Best = remainder of
    // both lists, sorted by date.
    const bestItem = allFiltered[0] || allCommon[0];
    const nextBest  = [
      ...(allFiltered.length ? allFiltered.slice(1) : []),
      ...(allFiltered.length ? allCommon : allCommon.slice(1))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    const results = [bestItem, ...nextBest];

    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from:    process.env.EMAIL_USER,
      to:      email,
      subject: `${selectedFunction} – Muhurat Recommendations`,
      html:    buildEmailHtml(results, selectedFunction),
    });

    return res.json({ success: true, message: "Email sent successfully" });

  } catch (error) {
    console.error("Email Error:", error);
    return res.status(500).json({ success: false, message: "Failed to send email" });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// EMAIL VERIFICATION
// ════════════════════════════════════════════════════════════════════════════

const APP_BASE_URL = process.env.APP_BASE_URL || "https://goodtimeguruji.in";

function buildVerificationEmailHtml(name, verifyUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0e8df;font-family:Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0e8df;padding:32px 0;">
    <tr><td align="center">

      <table width="540" cellpadding="0" cellspacing="0"
             style="max-width:540px;width:100%;border-radius:12px;overflow:hidden;
                    box-shadow:0 4px 20px rgba(139,90,43,.18);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${C.primaryDark} 0%,${C.primary} 100%);
                     padding:28px 32px;text-align:center;">
            <p style="margin:0 0 4px;font-size:22px;font-weight:800;
                      color:${C.white};letter-spacing:.6px;
                      font-family:Georgia,serif;">✦ Good Time Guruji</p>
            <p style="margin:0;font-size:12px;color:#e8d5c4;letter-spacing:.8px;
                      text-transform:uppercase;">
              Ancient Hindu Insight · Modern Technology · Smarter Decisions
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:${C.white};padding:32px 36px;text-align:center;">
            <p style="margin:0 0 10px;font-size:17px;font-weight:700;color:${C.primaryDark};">
              Verify your email address
            </p>
            <p style="margin:0 0 6px;font-size:14px;color:${C.text};">
              Hi ${name || "there"},
            </p>
            <p style="margin:0 0 26px;font-size:14px;color:${C.textMuted};line-height:1.6;">
              Thanks for signing up with Good Time Guruji. Please confirm your
              email address to activate your account and start finding
              auspicious Muhurat timings.
            </p>

            <a href="${verifyUrl}"
               style="display:inline-block;background:${C.gold};color:${C.goldLight};
                      font-size:15px;font-weight:700;text-decoration:none;
                      padding:13px 32px;border-radius:8px;letter-spacing:.3px;">
              Verify My Email
            </a>

            <p style="margin:26px 0 0;font-size:12px;color:${C.textMuted};line-height:1.6;">
              This link will expire in 24 hours. If you didn't create this
              account, you can safely ignore this email.
            </p>

            <p style="margin:18px 0 0;font-size:11px;color:${C.textMuted};
                      word-break:break-all;">
              Or copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color:${C.primary};">${verifyUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer bar -->
        <tr>
          <td style="background:${C.primaryDark};padding:14px 32px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#c9a882;letter-spacing:.4px;">
              © 2026 Good Time Guruji · All Rights Reserved
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

/**
 * Sends the account-verification email. Called from authController.signup
 * (and resendVerification) right after a new email/password user record is
 * created with email_verified = 0.
 *
 * Google-authenticated accounts NEVER go through this — Google has already
 * verified the address, so they're marked email_verified = 1 immediately.
 */
export async function sendVerificationEmail(toEmail, name, token) {
  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const verifyUrl = `${APP_BASE_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  await transporter.sendMail({
    from:    process.env.EMAIL_USER,
    to:      toEmail,
    subject: "Verify your email — Good Time Guruji",
    html:    buildVerificationEmailHtml(name, verifyUrl),
  });
}