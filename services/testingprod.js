/**
 * Astro Timing Utilities (Production-Ready)
 * ----------------------------------------
 * - All returned timestamps are ISO 8601 with `T`: YYYY-MM-DDTHH:mm:ss
 * - No secrets hard-coded; read from ENV
 * - Centralized HTTP, parsing, and time utilities
 * - Defensive error handling & input validation
 *
 * Requirements:
 *   Node 18+ (global fetch) OR polyfill fetch.
 *
 * ENV variables (required):
 *   DIVINE_API_KEY   -> your Divine API key (string)
 *   DIVINE_AUTH_TOKEN-> your Bearer token (string, starts with "Bearer ")
 */

import dotenv from "dotenv";
dotenv.config();

const DIVINE_API_KEY = process.env.DIVINE_API_KEY;
const DIVINE_AUTH_TOKEN = process.env.DIVINE_AUTH_TOKEN;

if (!DIVINE_API_KEY || !DIVINE_AUTH_TOKEN) {
  // Fail fast in production if secrets are missing
  throw new Error(
    "Missing DIVINE_API_KEY or DIVINE_AUTH_TOKEN in environment. " +
    "Set them before using astroTiming utilities."
  );
}

// --- API hosts (versioned) ---------------------------------------------------
const HOSTS = {
  v1: {
    main: "https://astroapi-1.divineapi.com",
    aux: "https://astroapi-2.divineapi.com",
    aux3: "https://astroapi-3.divineapi.com",
  },
  v2: {
    main: "https://astroapi-1.divineapi.com",
    aux: "https://astroapi-2.divineapi.com",
    aux3: "https://astroapi-3.divineapi.com",
  },
};

// --- Small helpers -----------------------------------------------------------

/** Pad to 2 digits */
const pad2 = (n) => String(n).padStart(2, "0");

/** Ensure "YYYY-MM-DDTHH:mm:ss" (drop ms & Z if present). Accepts Date|string. */
function toISOSeconds(input) {
  if (input == null) return null;

  // Already "YYYY-MM-DD HH:mm:ss" -> swap space with 'T'
  if (typeof input === "string" && input.includes(" ") && input.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/)) {
    return input.replace(" ", "T");
  }

  // Already "YYYY-MM-DDTHH:mm:ss"
  if (typeof input === "string" && input.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)) {
    return input;
  }

  // General string -> Date
  let d;
  if (typeof input === "string") {
    // Try tolerant parse: replace space with T if present
    const s = input.includes(" ") ? input.replace(" ", "T") : input;
    d = new Date(s);
  } else if (input instanceof Date) {
    d = input;
  } else {
    return null;
  }

  if (Number.isNaN(d.getTime())) return null;

  return [
    d.getFullYear(),
    pad2(d.getMonth() + 1),
    pad2(d.getDate()),
  ].join("-") + "T" + [
    pad2(d.getHours()),
    pad2(d.getMinutes()),
    pad2(d.getSeconds()),
  ].join(":");
}

/** ISO for start of day (local) */
function startOfDayISO(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return toISOSeconds(d);
}

/** ISO for end of day (local) */
function endOfDayISO(dateStr) {
  const d = new Date(`${dateStr}T23:59:59`);
  return toISOSeconds(d);
}

/** Convert "HH:MM:SS AM/PM" (or "HH:MM AM/PM") -> "HH:mm:ss" 24h */
function convert12hTo24h(time12h) {
  if (!time12h) return null;
  const [timePart, ampmRaw] = time12h.trim().split(/\s+/);
  const ampm = (ampmRaw || "").toUpperCase();
  let [h, m, s] = timePart.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (Number.isNaN(s)) s = 0;

  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;

  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

/** Robust boolean guard */
const isNonEmptyArray = (v) => Array.isArray(v) && v.length > 0;

/** Safe JSON extraction helper */
function safeGet(obj, path, fallback = undefined) {
  try {
    const val = path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
    return val == null ? fallback : val;
  } catch {
    return fallback;
  }
}

/** HTTP POST with URL-encoded or multipart (FormData) */
async function httpPost(url, body, { contentType = "application/x-www-form-urlencoded" } = {}) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: DIVINE_AUTH_TOKEN,
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
      body: body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status} ${res.statusText} -> ${text?.slice(0, 200)}`);
    }
    const json = await res.json();
    if (json?.success === false) {
      throw new Error(`API error: ${JSON.stringify(json?.message || json, null, 0).slice(0, 200)}`);
    }
    return json;
  } catch (err) {
    // Centralized error rethrow for observability
    throw new Error(`Request failed for ${url}: ${err.message}`);
  }
}

/** Build URLSearchParams with common fields */
function buildSearchParams(date, place, lat, lon, tzone, lang = "en") {
  const dd = pad2(date.getDate());
  const mm = pad2(date.getMonth() + 1);
  const yyyy = date.getFullYear();

  const p = new URLSearchParams();
  p.set("api_key", DIVINE_API_KEY);
  p.set("day", dd);
  p.set("month", mm);
  p.set("year", String(yyyy));
  p.set("Place", String(place));
  p.set("lat", String(lat));
  p.set("lon", String(lon));
  p.set("tzone", String(tzone));
  p.set("lan", lang);
  return p;
}

/** Validate common inputs (throws) */
function validateInputs(dateStr, lat, lon, tzone, place) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error(`Invalid dateStr "${dateStr}". Expected YYYY-MM-DD.`);
  }
  // Basic sanity checks; you can tighten as needed
  if (lat == null || lon == null || Number.isNaN(+lat) || Number.isNaN(+lon)) {
    throw new Error("lat/lon must be numbers.");
  }
  if (tzone == null || tzone === "") {
    throw new Error("tzone is required.");
  }
  if (!place) {
    throw new Error("place is required.");
  }
}

// --- Public API --------------------------------------------------------------

/**
 * getNakshatraTimingsForDate
 * Returns merged nakshatra intervals for the given date, clamped to that day.
 * All start_time/end_time are ISO (T).
 */
async function getNakshatraTimingsForDate(dateStr, lat, lon, tzone, place) {
  validateInputs(dateStr, lat, lon, tzone, place);

  const date = new Date(`${dateStr}T00:00:00`);
  const baseDateStr = dateStr;
  const params = buildSearchParams(date, place, lat, lon, tzone);

  const url = `${HOSTS.v2.main}/indian-api/v2/find-nakshatra`;
  const data = await httpPost(url, params.toString(), { contentType: "application/x-www-form-urlencoded" });

  const padas = safeGet(data, "data.nakshatras.nakshatra_pada", []);

  const merged = [];
  let current = null;

  for (const p of padas) {
    const sep = p?.end_time_seprated;
    if (!sep) continue;

    const endDateStr = `${sep.year}-${pad2(sep.month)}-${pad2(sep.day)}`;
    const endTime = `${pad2(sep.hour)}:${pad2(sep.minute)}:${pad2(sep.second)}`;
    const fullEnd = `${endDateStr}T${endTime}`;
    const isNextDay = endDateStr !== baseDateStr;
    const truncatedEnd = isNextDay ? endOfDayISO(baseDateStr) : fullEnd;

    if (!current) {
      current = { nakshatra: p.nak_name, start_time: startOfDayISO(baseDateStr), end_time: truncatedEnd };
    } else if (current.nakshatra === p.nak_name) {
      current.end_time = truncatedEnd;
    } else {
      merged.push(current);
      if (isNextDay) {
        merged.push({ nakshatra: p.nak_name, start_time: current.end_time, end_time: endOfDayISO(baseDateStr) });
        break;
      }
      current = { nakshatra: p.nak_name, start_time: current.end_time, end_time: truncatedEnd };
    }

    if (isNextDay) {
      merged.push(current);
      break;
    }
  }

  if (current && !merged.includes(current)) merged.push(current);

  return merged.map((i) => ({
    date: baseDateStr,
    nakshatra: i.nakshatra,
    start_time: toISOSeconds(i.start_time),
    end_time: toISOSeconds(i.end_time),
  }));
}

/**
 * getFilteredNakshatra
 * Rotates from a startItem, removes 1-based positions, returns filtered & common sets.
 */
function getFilteredNakshatra(startItem) {
  const nakshatraList = [
    "Ashwini", "Bharani", "Krittika", "Rohini",
    "Mrigashira", "Ardhra", "Punarvasu", "Pushya",
    "Ashleysha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha",
    "Anuradha", "Jyeshtha", "Moola", "Poorva Ashadha",
    "Uttara Ashadha", "Shravan", "Dhanishta", "Satabhisha",
    "Poorva Bhadrapada", "Uttara Bhadrapada", "Revati",
  ];

  const secondNakshatraList = [
    "Ashwini", "Ardhra", "Punarvasu", "Hasta", "Chitra", "Swati",
    "Anuradha", "Shravan", "Revati",
  ];
  const positionsToRemove = [1, 3, 5, 7, 10, 12, 14, 16, 19, 21, 23, 25];

  const startIndex = nakshatraList.indexOf(startItem);
  if (startIndex === -1) return { filtered: [], common: [] };

  const rotated = nakshatraList.slice(startIndex).concat(nakshatraList.slice(0, startIndex));
  const filtered = rotated.filter((_, idx) => !positionsToRemove.includes(idx + 1));
  const common = filtered.filter((n) => secondNakshatraList.includes(n));
  return { filtered, common };
}

/**
 * getTithiDetailsForDate
 * All times are ISO and clamped to the day.
 */
async function getTithiDetailsForDate(dateStr, lat, lon, tzone, place) {
  validateInputs(dateStr, lat, lon, tzone, place);

  const date = new Date(`${dateStr}T00:00:00`);
  const baseDateStr = dateStr;

  const form = new FormData();
  form.append("api_key", DIVINE_API_KEY);
  form.append("day", pad2(date.getDate()));
  form.append("month", pad2(date.getMonth() + 1));
  form.append("year", String(date.getFullYear()));
  form.append("Place", String(place));
  form.append("lat", String(lat));
  form.append("lon", String(lon));
  form.append("tzone", String(tzone));
  form.append("lan", "en");

  const url = `${HOSTS.v1.main}/indian-api/v1/find-tithi`;
  const data = await httpPost(url, form, { contentType: null });

  const endOfDay = new Date(endOfDayISO(baseDateStr));
  const result = [];

  for (const t of safeGet(data, "data.tithis", [])) {
    const start = new Date(toISOSeconds(t.start_time));
    const end = new Date(toISOSeconds(t.end_time));
    if (start > endOfDay && end > endOfDay) continue;

    result.push({
      date: baseDateStr,
      tithi: t.tithi,
      start_time: toISOSeconds(t.start_time),
      end_time: end > endOfDay ? endOfDayISO(baseDateStr) : toISOSeconds(t.end_time),
    });
  }

  return result;
}

/** Clamp a datetime (string/Date) to a given date, return ISO */
function clampToDate(dateStr, dateTime) {
  const start = new Date(startOfDayISO(dateStr));
  const end = new Date(endOfDayISO(dateStr));
  const d = new Date(toISOSeconds(dateTime));
  const clamped = new Date(Math.min(Math.max(d, start), end));
  return toISOSeconds(clamped);
}

/**
 * getYogaDetailsForDate
 * All times are ISO and clamped to the day.
 */
async function getYogaDetailsForDate(dateStr, lat, lon, tzone, place) {
  validateInputs(dateStr, lat, lon, tzone, place);

  const date = new Date(`${dateStr}T00:00:00`);
  const baseDateStr = dateStr;

  const form = new FormData();
  form.append("api_key", DIVINE_API_KEY);
  form.append("day", pad2(date.getDate()));
  form.append("month", pad2(date.getMonth() + 1));
  form.append("year", String(date.getFullYear()));
  form.append("Place", String(place));
  form.append("lat", String(lat));
  form.append("lon", String(lon));
  form.append("tzone", String(tzone));
  form.append("lan", "en");

  const url = `${HOSTS.v1.main}/indian-api/v1/find-yoga`;
  const json = await httpPost(url, form, { contentType: null });

  const yogas = json?.data?.yogas ?? [];
  const result = [];
  const eod = new Date(endOfDayISO(baseDateStr));

  for (const y of yogas) {
    const yStart = new Date(toISOSeconds(y.start_time));
    const yEnd = new Date(toISOSeconds(y.end_time));
    if (yStart > eod && yEnd > eod) continue;

    result.push({
      date: baseDateStr,
      yoga: y.yoga_name,
      start_time: toISOSeconds(y.start_time),
      end_time: yEnd > eod ? endOfDayISO(baseDateStr) : toISOSeconds(y.end_time),
    });
  }

  return result;
}

/**
 * getWaraDetailsForDate
 * Returns weekday/sunrise/sunset; sunrise/sunset preserved as API strings (you can normalize if needed).
 */
async function getWaraDetailsForDate(dateStr, lat, lon, tzone, place) {
  validateInputs(dateStr, lat, lon, tzone, place);

  const date = new Date(`${dateStr}T00:00:00`);
  const baseDateStr = dateStr;

  const form = new FormData();
  form.append("api_key", DIVINE_API_KEY);
  form.append("day", pad2(date.getDate()));
  form.append("month", pad2(date.getMonth() + 1));
  form.append("year", String(date.getFullYear()));
  form.append("Place", String(place));
  form.append("lat", String(lat));
  form.append("lon", String(lon));
  form.append("tzone", String(tzone));
  form.append("lan", "en");

  const url = `${HOSTS.v1.aux}/indian-api/v1/find-sun-and-moon`;
  const json = await httpPost(url, form, { contentType: null });

  const data = json?.data;
  if (!data) return null;

  return {
    date: baseDateStr,
    weekday: data.weekday,
    sunrise: data.sunrise, // string from API
    sunset: data.sunset,   // string from API
  };
}

/**
 * getInauspiciousTimingsForDate
 * Returns rahu/yamaganda/dur_muhurtam as-is from API; use toISOSeconds on inner fields if you need.
 */
async function getInauspiciousTimingsForDate(dateStr, lat, lon, tzone, place) {
  validateInputs(dateStr, lat, lon, tzone, place);

  const date = new Date(`${dateStr}T00:00:00`);
  const baseDateStr = dateStr;

  const form = new FormData();
  form.append("api_key", DIVINE_API_KEY);
  form.append("day", pad2(date.getDate()));
  form.append("month", pad2(date.getMonth() + 1));
  form.append("year", String(date.getFullYear()));
  form.append("Place", String(place));
  form.append("lat", String(lat));
  form.append("lon", String(lon));
  form.append("tzone", String(tzone));
  form.append("lan", "en");

  const url = `${HOSTS.v1.aux3}/indian-api/v1/inauspicious-timings`;
  const json = await httpPost(url, form, { contentType: null });
  if (!json?.data) return null;

  return {
    date: baseDateStr,
    rahu_kaal: json.data.rahu_kaal,
    yamaganda: json.data.yamaganda,
    dur_muhurtam: json.data.dur_muhurtam,
  };
}

/**
 * getKaranaDetailsForDate
 * All times ISO and clamped to the day.
 */
async function getKaranaDetailsForDate(dateStr, lat, lon, tzone, place) {
  validateInputs(dateStr, lat, lon, tzone, place);

  const date = new Date(`${dateStr}T00:00:00`);
  const baseDateStr = dateStr;

  const form = new FormData();
  form.append("api_key", DIVINE_API_KEY);
  form.append("day", pad2(date.getDate()));
  form.append("month", pad2(date.getMonth() + 1));
  form.append("year", String(date.getFullYear()));
  form.append("Place", String(place));
  form.append("lat", String(lat));
  form.append("lon", String(lon));
  form.append("tzone", String(tzone));
  form.append("lan", "en");

  const url = `${HOSTS.v1.main}/indian-api/v1/find-karana`;
  // NOTE: original endpoint was "find-karana"; Divine API uses "karna" in some versions.
  // If your account uses "find-karana", swap back:
  // const url = `${HOSTS.v1.main}/indian-api/v1/find-karana`;

  const json = await httpPost(url, form, { contentType: null });
  const karanas = json?.data?.karnas || json?.data?.karnas || [];
  const result = [];
  const eod = new Date(endOfDayISO(baseDateStr));

  for (const k of karanas) {
    const kStart = new Date(toISOSeconds(k.start_time));
    const kEnd = new Date(toISOSeconds(k.end_time));
    if (kStart > eod && kEnd > eod) continue;

    result.push({
      date: baseDateStr,
      karana: k.karana_name,
      start_time: toISOSeconds(k.start_time),
      end_time: kEnd > eod ? endOfDayISO(baseDateStr) : toISOSeconds(k.end_time),
    });
  }

  return result;
}

/**
 * getMasterTimeRange
 * Choose a day window start by weekday rule; returns ISO start/end.
 */
function getMasterTimeRange(filteredWara) {
  if (!filteredWara || !filteredWara.date || !filteredWara.weekday) {
    throw new Error("getMasterTimeRange: invalid filteredWara");
  }

  const { date, weekday, sunset } = filteredWara;

  const allowedFullDay = [
    "Somawara", "Mangalawara", "Budhawara",
    "Guruwara", "Shukrawara", "Shaniwara", "Raviwara",
  ];

  const halfDay = [];      // fill if you need 12:00 starts for some weekdays
  const sunsetStart = [];  // add "Shaniwara" if needed

  let masterStartTime;

  if (allowedFullDay.includes(weekday)) {
    masterStartTime = startOfDayISO(date);
  }
  if (halfDay.includes(weekday)) {
    masterStartTime = `${date}T12:00:00`;
  }
  if (sunsetStart.includes(weekday) && sunset) {
    const s24 = convert12hTo24h(String(sunset).trim());
    masterStartTime = `${date}T${s24 || "00:00:00"}`;
  }
  if (!masterStartTime) {
    masterStartTime = startOfDayISO(date);
  }

  return {
    masterStartTime,
    masterEndTime: endOfDayISO(date),
  };
}

/**
 * getTarabalamTimings
 * Returns intervals for provided nakshatra; all ISO.
 */
async function getTarabalamTimings(dateStr, nakshatra, lat, lon, tzone, place) {
  validateInputs(dateStr, lat, lon, tzone, place);
  if (!nakshatra) throw new Error("nakshatra is required.");

  // Normalize edge name variants
  const map = {
    Ashleysha: "Ashlesha",
    "Poorva Ashadha": "Purva Ashada",
    "Uttara Ashadha": "Uttara Ashada",
  };
  const normalize = (name) => map[name] || name;

  const date = new Date(`${dateStr}T00:00:00`);
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const baseDateStr = dateStr;
  const dayStart = startOfDayISO(baseDateStr);
  const dayEnd = endOfDayISO(baseDateStr);

  const params = new URLSearchParams({
    api_key: DIVINE_API_KEY,
    day: dd, month: mm, year: String(yyyy),
    Place: String(place),
    lat: String(lat),
    lon: String(lon),
    tzone: String(tzone),
    lan: "en",
  });

  const url = `${HOSTS.v2.aux}/indian-api/v2/find-chandrabalam-and-tarabalam`;
  const json = await httpPost(url, params.toString(), { contentType: "application/x-www-form-urlencoded" });
  const tarabalam = json?.data?.tarabalams;
  if (!tarabalam) return null;

  let { current = [], next = [], upto = "" } = tarabalam;
  current = current.map(normalize);
  next = next.map(normalize);
  nakshatra = normalize(nakshatra);

  if (!upto) {
    return current.includes(nakshatra)
      ? [{ date: baseDateStr, nakshatra, start_time: dayStart, end_time: dayEnd }]
      : null;
  }

  // Parse "HH:MM AM/PM, Mon DD"
  const [timePartRaw, datePartRaw] = String(upto).split(", ");
  const [monthStr, dayStr] = (datePartRaw || "").trim().split(" ");
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

  const uptoDate = new Date(yyyy, months[monthStr], parseInt(dayStr || "0", 10));
  const userDate = new Date(`${baseDateStr}T00:00:00`);

  if (+uptoDate > +userDate && current.includes(nakshatra)) {
    return [{ date: baseDateStr, nakshatra, start_time: dayStart, end_time: dayEnd }];
  }

  const [hhmm, ampm] = (timePartRaw || "").trim().split(" ");
  let [hour, minute] = (hhmm || "").split(":").map((n) => parseInt(n || "0", 10));
  if (ampm?.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (ampm?.toUpperCase() === "AM" && hour === 12) hour = 0;

  const cutoff = `${baseDateStr}T${pad2(hour)}:${pad2(minute)}:00`;

  const inCurrent = current.includes(nakshatra);
  const inNext = next.includes(nakshatra);

  if (inCurrent && inNext) return [{ date: baseDateStr, nakshatra, start_time: dayStart, end_time: dayEnd }];
  if (inCurrent) return [{ date: baseDateStr, nakshatra, start_time: dayStart, end_time: cutoff }];
  if (inNext) return [{ date: baseDateStr, nakshatra, start_time: cutoff, end_time: dayEnd }];
  return null;
}

/**
 * getChandrabalamTimings
 * Returns intervals for provided rasi; all ISO.
 */
async function getChandrabalamTimings(dateStr, rasi, lat, lon, tzone, place) {
  validateInputs(dateStr, lat, lon, tzone, place);
  if (!rasi) throw new Error("rasi is required.");

  const params = new URLSearchParams({
    api_key: DIVINE_API_KEY,
    day: dateStr.split("-")[2],
    month: dateStr.split("-")[1],
    year: dateStr.split("-")[0],
    Place: String(place),
    lat: String(lat),
    lon: String(lon),
    tzone: String(tzone),
    lan: "en",
  });

  const url = `${HOSTS.v1.aux}/indian-api/v1/find-chandrabalam-and-tarabalam`;
  const json = await httpPost(url, params.toString(), { contentType: "application/x-www-form-urlencoded" });

  const cb = json?.data?.chandrabalams;
  if (!cb) return null;

  const { current = [], next = [], upto = "" } = cb;
  const dayStart = startOfDayISO(dateStr);
  const dayEnd = endOfDayISO(dateStr);

  if (!upto) return current.includes(rasi) ? [{ date: dateStr, rasi, start_time: dayStart, end_time: dayEnd }] : null;

  // Parse "HH:MM AM/PM, Mon DD"
  const [timePart, datePart] = String(upto).split(", ");
  const [monthStr, dayStr] = (datePart || "").trim().split(" ");
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

  const uptoDate = new Date(new Date(dateStr).getFullYear(), months[monthStr], parseInt(dayStr || "0", 10));
  const currentDate = new Date(`${dateStr}T00:00:00`);

  if (+uptoDate > +currentDate && current.includes(rasi)) {
    return [{ date: dateStr, rasi, start_time: dayStart, end_time: dayEnd }];
  }

  const [hhmm, ampm] = (timePart || "").split(" ");
  let [hr, min] = (hhmm || "0:0").split(":").map((n) => parseInt(n || "0", 10));
  if (ampm?.toUpperCase() === "PM" && hr !== 12) hr += 12;
  if (ampm?.toUpperCase() === "AM" && hr === 12) hr = 0;

  const cutoff = `${dateStr}T${pad2(hr)}:${pad2(min)}:00`;

  const inCurrent = current.includes(rasi);
  const inNext = next.includes(rasi);

  if (inCurrent && inNext) return [{ date: dateStr, rasi, start_time: dayStart, end_time: dayEnd }];
  if (inCurrent) return [{ date: dateStr, rasi, start_time: dayStart, end_time: cutoff }];
  if (inNext) return [{ date: dateStr, rasi, start_time: cutoff, end_time: dayEnd }];
  return null;
}

/**
 * removeBlockedIntervals
 * Accepts ISO or "YYYY-MM-DD HH:mm:ss"; outputs ISO.
 */
function removeBlockedIntervals(masterStartTime, masterEndTime, blockedIntervals) {
  const parseLocal = (s) => {
    if (s instanceof Date) return s;
    if (typeof s !== "string") return null;
    const normalized = s.includes(" ") ? s.replace(" ", "T") : s;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const masterStart = parseLocal(masterStartTime);
  const masterEnd = parseLocal(masterEndTime);
  if (!masterStart || !masterEnd) {
    throw new Error("Invalid master start or end time");
  }

  const intervals = (blockedIntervals || [])
    .map(({ start_time, end_time }) => [parseLocal(start_time), parseLocal(end_time)])
    .filter(([start, end]) => start && end && end > start)
    .sort((a, b) => a[0] - b[0]);

  // Merge overlaps
  const merged = [];
  for (const [start, end] of intervals) {
    if (!merged.length || merged[merged.length - 1][1] < start) {
      merged.push([start, end]);
    } else {
      merged[merged.length - 1][1] = new Date(Math.max(merged[merged.length - 1][1], end));
    }
  }

  // Collect free intervals
  const validIntervals = [];
  let currentStart = masterStart;

  for (const [bStart, bEnd] of merged) {
    if (bStart > currentStart) validIntervals.push([currentStart, bStart]);
    currentStart = new Date(Math.max(currentStart, bEnd));
  }
  if (currentStart < masterEnd) validIntervals.push([currentStart, masterEnd]);

  return validIntervals.map(([start, end]) => ({
    start_time: toISOSeconds(start),
    end_time: toISOSeconds(end),
  }));
}

/**
 * isNakshatraChandrashtama
 * Returns true if userNakshatra is under Chandrashtama on date.
 */
async function isNakshatraChandrashtama(dateStr, userNakshatra, lat, lon, tzone, place) {
  validateInputs(dateStr, lat, lon, tzone, place);
  if (!userNakshatra) throw new Error("userNakshatra is required.");

  const params = new URLSearchParams({
    api_key: DIVINE_API_KEY,
    day: dateStr.split("-")[2],
    month: dateStr.split("-")[1],
    year: dateStr.split("-")[0],
    Place: String(place),
    lat: String(lat),
    lon: String(lon),
    tzone: String(tzone),
    lan: "en",
  });

  const url = `${HOSTS.v1.aux3}/indian-api/v1/chandrashtama`;
  const json = await httpPost(url, params.toString(), { contentType: "application/x-www-form-urlencoded" });

  const data = json?.data;
  if (!isNonEmptyArray(data)) return false;

  const target = new Date(`${dateStr}T00:00:00`);
  const lowered = String(userNakshatra).toLowerCase();

  return data.some(({ start_date, end_date, chandrashtama }) => {
    const s = new Date(toISOSeconds(start_date));
    const e = new Date(toISOSeconds(end_date));
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
    if (target < s || target > e) return false;
    return (chandrashtama || []).some((n) => String(n.nakshatra || "").toLowerCase() === lowered);
  });
}

// --- Exports -----------------------------------------------------------------
export {
  getNakshatraTimingsForDate,
  getFilteredNakshatra,
  getTithiDetailsForDate,
  clampToDate,
  getYogaDetailsForDate,
  getWaraDetailsForDate,
  getInauspiciousTimingsForDate,
  getKaranaDetailsForDate,
  getMasterTimeRange,
  getTarabalamTimings,
  getChandrabalamTimings,
  removeBlockedIntervals,
  isNakshatraChandrashtama,

  // utilities if you want to reuse externally:
  toISOSeconds,
  convert12hTo24h,
  startOfDayISO,
  endOfDayISO,
};


async function getAuspiciousTimeWindow(dateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
    const disallowedwaras = [];
    const disallowedTithis = ["Pratipada", "Chaturthi", "Shasthi", "Ashtami", "Navami", "Dwadashi", "Chaturdashi", "Purnima"];
    const disallowedYogas = ["Vyaghata", "Vishkumbha", "Parigha", "Shoola", "Ganda", "Vyatipaata", "Vajra", "Sula", "Vaidhriti"];
    const disallowedKaranas = ["Vishti", "Bhadra", "Chatushpada", "Nagava", "Kimstughna", "Shakuni"];

    const waraList = await getWaraDetailsForDate(dateStr, lat, lon, tzone, place);
  const currentWeekday = waraList?.weekday;

  if (
    isNakshatraMarkedM(
      currentWeekday,
      userNakshatra
    )
  ) {
    return null;
  }


  // ✅ check chandrashtama
  const isChandrashtama = await isNakshatraChandrashtama(dateStr, userNakshatra, lat, lon, tzone, place);
  if (isChandrashtama) {
    console.log("⚠️ Nakshatra under Chandrashtama. Exiting.");
    return null;
  }



  // ✅ fetch lists in parallel
  const [
    nakshatraList,
    tithiList,
    yogaList,
    karanaList,
    balam
  ] = await Promise.all([
    getNakshatraTimingsForDate(
      dateStr,
      lat,
      lon,
      tzone,
      place
    ),
    getTithiDetailsForDate(
      dateStr,
      lat,
      lon,
      tzone,
      place
    ),
    getYogaDetailsForDate(
      dateStr,
      lat,
      lon,
      tzone,
      place
    ),
    getKaranaDetailsForDate(
      dateStr,
      lat,
      lon,
      tzone,
      place
    ),
    getBalamTimings(
      dateStr,
      userNakshatra,
      userRasi,
      lat,
      lon,
      tzone,
      place
    )
  ]);

  const chandrabalamList =
    balam.chandrabalam;

  const tarabalamList =
    balam.tarabalam;

  console.log("Fetching nakshatra timings for:", dateStr);
  console.log("Returned Nakshatras:", (nakshatraList || []).map(n => n.nakshatra));

  // ⬇️ Allowed sets
  const { filtered: allowedFiltered, common: allowedCommon } = getFilteredNakshatra(userNakshatra);

  async function processWithAllowed(allowedNakshatras, label) {
    console.log(`\n=== Processing for ${label} set ===`);

    // ✅ safe defaults
    const safeNakshatras = Array.isArray(nakshatraList) ? nakshatraList : [];
    const safeTithis = Array.isArray(tithiList) ? tithiList : [];
    const safeYogas = Array.isArray(yogaList) ? yogaList : [];
    const safeKaranas = Array.isArray(karanaList) ? karanaList : [];
    const safeWaras = waraList ? [waraList] : [];
    const safeChandrabalam = Array.isArray(chandrabalamList) ? chandrabalamList : [];
    const safeTarabalam = Array.isArray(tarabalamList) ? tarabalamList : [];
    const safeAllowedNakshatras = Array.isArray(allowedNakshatras) ? allowedNakshatras : [];

    // ✅ filters
    const filteredNakshatras = safeNakshatras.filter(n =>
      safeAllowedNakshatras.includes(n?.nakshatra)
    );
    const filteredTithis = safeTithis.filter(t => !disallowedTithis.includes(t?.tithi));
    const filteredYogas = safeYogas.filter(y => !disallowedYogas.includes(y?.yoga));
    const filteredKaranas = safeKaranas.filter(k => !disallowedKaranas.includes(k?.karana));

    // 🛑 data guard
    const mustHaveData = [
      { label: "Nakshatras", list: filteredNakshatras },
      { label: "Tithis", list: filteredTithis },
      { label: "Yogas", list: filteredYogas },
      { label: "Karanas", list: filteredKaranas },
      { label: "Waras", list: safeWaras },
      { label: "Chandrabalam", list: safeChandrabalam },
      { label: "Tarabalam", list: safeTarabalam },
    ];
    for (const { label, list } of mustHaveData) {
      if (!list || !list.length) {
        console.log(`⚠️ Missing ${label}. Skipping this set.`);
        return null;
      }
    }

    // ✅ master time window
    let { masterStartTime, masterEndTime } = getMasterTimeRange(safeWaras[0]);

    const constrain = (start, end) => {
      if (!start || !end || !masterStartTime || !masterEndTime) return;
      const s = new Date(start), e = new Date(end);
      if (isNaN(s) || isNaN(e)) return;
      if (new Date(masterStartTime) < s) masterStartTime = start;
      if (new Date(masterEndTime) > e) masterEndTime = end;
    };

    constrain(safeChandrabalam[0].start_time, safeChandrabalam.at(-1).end_time);
    constrain(safeTarabalam[0].start_time, safeTarabalam.at(-1).end_time);
    constrain(filteredNakshatras[0].start_time, filteredNakshatras.at(-1).end_time);
    constrain(filteredTithis[0].start_time, filteredTithis.at(-1).end_time);
    constrain(filteredYogas[0].start_time, filteredYogas.at(-1).end_time);
    constrain(filteredKaranas[0].start_time, filteredKaranas.at(-1).end_time);

    if (new Date(masterStartTime) >= new Date(masterEndTime)) {
      console.log("⚠️ Invalid master time range after constraints");
      return null;
    }

    // ✅ remove inauspicious intervals
    const inauspicious = await getInauspiciousTimingsForDate(dateStr, lat, lon, tzone, place);
    const blocked = inauspicious
      ? [inauspicious.rahu_kaal, inauspicious.yamaganda, ...(inauspicious.dur_muhurtam || [])]
      : [];

    const validIntervals = removeBlockedIntervals(masterStartTime, masterEndTime, blocked);

    return {
      label,
      date: dateStr,
      nakshatras: filteredNakshatras.map(n => n.nakshatra),
      nakshatraStr: filteredNakshatras.map(n => n.nakshatra).join(", "),
      rasi: userRasi,
      tithis: filteredTithis.map(t => t.tithi),
      tithiStr: filteredTithis.map(t => t.tithi).join(", "),
      wara: safeWaras[0]?.weekday || "",
      yogas: filteredYogas.map(y => y.yoga),
      yogaStr: filteredYogas.map(y => y.yoga).join(", "),
      karanas: filteredKaranas.map(k => k.karana),
      karanaStr: filteredKaranas.map(k => k.karana).join(", "),
      timerange: validIntervals,
    };
  }

  // 🔥 process both sets
  let resultFiltered = await processWithAllowed(allowedFiltered, "Filtered Only");
  const resultCommon = await processWithAllowed(allowedCommon, "Filtered + Common");

  // ⚠️ avoid duplicate discard just by date (since always same)
  if (resultFiltered && resultCommon) {
    if (resultFiltered.nakshatraStr === resultCommon.nakshatraStr &&
        resultFiltered.timerange?.toString() === resultCommon.timerange?.toString()) {
      resultFiltered = null;
    }
  }

  return { resultFiltered, resultCommon };
}


export default async function runAuspiciousCheckAcrossDatesProdtest(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
 const resultsFiltered = [];
  const resultsCommon = [];

  const parseDate = (str) => {
    const [yyyy, mm, dd] = str.split("-").map(Number);
    return new Date(yyyy, mm - 1, dd);
  };

  const fromDate = parseDate(fromDateStr);
  const toDate = parseDate(toDateStr);

  let current = new Date(fromDate);

  while (current <= toDate) {
    const chunkStart = new Date(current);
    const chunkEnd = new Date(
      chunkStart.getFullYear(),
      chunkStart.getMonth() + 1,
      0
    ); // last day of month

    // Cap chunkEnd if it overshoots toDate
    if (chunkEnd > toDate) chunkEnd.setTime(toDate.getTime());

    // Inner loop for daily iteration
    const CONCURRENCY = 10;

// Build all dates in this month chunk
const dates = [];

let day = new Date(chunkStart);

while (day <= chunkEnd) {
  dates.push(
    `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
  );

  day.setDate(day.getDate() + 1);
}

// Process dates in parallel batches
for (let i = 0; i < dates.length; i += CONCURRENCY) {
  const batch = dates.slice(i, i + CONCURRENCY);

  const batchResults = await Promise.all(
    batch.map(async (currentDateStr) => {
      try {
        const result = await getAuspiciousTimeWindow(
          currentDateStr,
          userNakshatra,
          userRasi,
          lat,
          lon,
          tzone,
          place
        );

        return {
          date: currentDateStr,
          ...result
        };
      } catch (err) {
        console.error(
          `Error processing ${currentDateStr}`,
          err
        );

        return null;
      }
    })
  );

  for (const item of batchResults) {
    if (!item) continue;

    if (item.resultFiltered) {
      resultsFiltered.push({
        date: item.date,
        ...item.resultFiltered
      });
    }

    if (item.resultCommon) {
      resultsCommon.push({
        date: item.date,
        ...item.resultCommon
      });
    }
  }
}

    // Move to next month
    current = new Date(chunkEnd);
    current.setDate(current.getDate() + 1);
  }

  // ✅ Return both separately in structured JSON
  return {
    filtered: resultsFiltered,
    common: resultsCommon,
  };

}