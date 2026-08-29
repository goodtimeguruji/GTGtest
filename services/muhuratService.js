// ============================================================
//  services/muhuratService.js
//  Handles saving muhurat requests + results to the database
//  and fetching search history for a user.
// ============================================================

import { db } from "./db.js";

// ── CREATE REQUEST (status = pending) ────────────────────────────────────────
export async function createMuhuratRequest({
  userId, serviceName, selectedFunction, fromDate, toDate,
  nakshatra, rasi, location, lat, lon, timezone
}) {
  const [result] = await db.execute(
    `INSERT INTO muhurat_requests
       (user_id, service_name, selected_function, from_date, to_date,
        nakshatra, rasi, location, lat, lon, timezone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [userId, serviceName, selectedFunction, fromDate, toDate,
     nakshatra, rasi, location, lat, lon, timezone]
  );
  return result.insertId;
}

// ── SAVE RESULTS + MARK COMPLETED ────────────────────────────────────────────
export async function saveMuhuratResults(requestId, muhuratResult) {
  const { filtered = [], common = [] } = muhuratResult;
  const allRows = [
    ...filtered.map(r => ({ type: "filtered", ...r })),
    ...common.map(r =>   ({ type: "common",   ...r }))
  ];

  if (allRows.length === 0) {
    await db.execute(
      `UPDATE muhurat_requests
         SET status = 'completed', result_count = 0, completed_at = NOW()
       WHERE id = ?`,
      [requestId]
    );
    return;
  }

  const insertSQL = `
    INSERT INTO muhurat_results
      (request_id, result_type, result_date, wara, nakshatra, tithi,
       yoga, karana, timerange_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  for (const row of allRows) {
    await db.execute(insertSQL, [
      requestId,
      row.type,
      row.date,
      row.wara         || null,
      row.nakshatraStr || null,
      row.tithiStr     || null,
      row.yogaStr      || null,
      row.karanaStr    || null,
      JSON.stringify(row.timerange || [])
    ]);
  }

  await db.execute(
    `UPDATE muhurat_requests
       SET status = 'completed', result_count = ?, completed_at = NOW()
     WHERE id = ?`,
    [allRows.length, requestId]
  );
}

// ── MARK FAILED ───────────────────────────────────────────────────────────────
export async function failMuhuratRequest(requestId, errorMessage) {
  await db.execute(
    `UPDATE muhurat_requests
       SET status = 'failed', error_message = ?, completed_at = NOW()
     WHERE id = ?`,
    [String(errorMessage).slice(0, 500), requestId]
  );
}

// ── LIST HISTORY (paginated, lightweight) ─────────────────────────────────────
export async function getMuhuratHistory(userId, { page = 1, limit = 15 } = {}) {
  const safePage  = Math.max(1, parseInt(page,  10) || 1);
  const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
  const offset    = (safePage - 1) * safeLimit;

  const [rows] = await db.execute(
    `SELECT id, service_name, selected_function, from_date, to_date,
            nakshatra, rasi, location, status, result_count, created_at, completed_at
     FROM muhurat_requests
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, safeLimit, offset]
  );

  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM muhurat_requests WHERE user_id = ?",
    [userId]
  );

  return {
    rows,
    pagination: {
      page:       safePage,
      limit:      safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit)
    }
  };
}

// ── GET FULL RESULTS FOR ONE REQUEST ─────────────────────────────────────────
export async function getMuhuratRequestResults(requestId, userId) {
  const [req] = await db.execute(
    `SELECT id, service_name, selected_function, from_date, to_date, nakshatra,
            rasi, location, status, result_count, created_at, completed_at, error_message
     FROM muhurat_requests
     WHERE id = ? AND user_id = ?`,
    [requestId, userId]
  );

  if (!req.length) return null;

  const [results] = await db.execute(
    `SELECT result_type, result_date, wara, nakshatra, tithi,
            yoga, karana, timerange_json
     FROM muhurat_results
     WHERE request_id = ?
     ORDER BY result_type, result_date`,
    [requestId]
  );

  const parse = r => ({
    ...r,
    date:     r.result_date instanceof Date
                ? r.result_date.toISOString().split("T")[0]
                : String(r.result_date),
    wara:          r.wara      || "",
    nakshatraStr:  r.nakshatra || "",
    tithiStr:      r.tithi     || "",
    yogaStr:       r.yoga      || "",
    karanaStr:     r.karana    || "",
    timerange: (() => { try { return JSON.parse(r.timerange_json || "[]"); } catch { return []; } })(),
    timerange_json: undefined
  });

  return {
    request:  req[0],
    filtered: results.filter(r => r.result_type === "filtered").map(parse),
    common:   results.filter(r => r.result_type === "common").map(parse)
  };
}

// ── DELETE ONE REQUEST (cascade removes results) ──────────────────────────────
export async function deleteMuhuratRequest(requestId, userId) {
  const [result] = await db.execute(
    "DELETE FROM muhurat_requests WHERE id = ? AND user_id = ?",
    [requestId, userId]
  );
  return result.affectedRows > 0;
}
