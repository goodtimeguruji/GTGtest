// ============================================================
//  muhurat-core.js  –  shared engine for all muhurat functions
//  Each ceremony file imports { runAuspiciousCheck } and passes
//  its own secondNakshatraList + disallowedTithis config.
// ============================================================

const API_KEY    = process.env.DIVINE_API_KEY    || "a3a1ab378702c90ccc523c59a888f28b";
const AUTH_TOKEN = process.env.DIVINE_AUTH_TOKEN || "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";

function log(dateStr, msg) {
  console.log(`[${new Date().toISOString()}] 📅 [${dateStr}] ${msg}`);
}
function logWarn(dateStr, msg) {
  console.warn(`[${new Date().toISOString()}] ⚠️  [${dateStr}] ${msg}`);
}
function logErr(dateStr, msg, err) {
  console.error(`[${new Date().toISOString()}] ❌ [${dateStr}] ${msg}`, err?.message || "");
}

const NAKSHATRA_LIST = [
  "Ashwini", "Bharani", "Krittika", "Rohini",
  "Mrigashira", "Ardhra", "Punarvasu", "Pushya",
  "Ashleysha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha",
  "Anuradha", "Jyeshtha", "Moola", "Poorva Ashadha",
  "Uttara Ashadha", "Shravan", "Dhanishta", "Satabhisha",
  "Poorva Bhadrapada", "Uttara Bhadrapada", "Revati"
];

const POSITIONS_TO_REMOVE = new Set([1, 3, 5, 7, 10, 12, 14, 16, 19, 21, 23, 25]);

const NAKSHATRA_WEEKDAY_RULES = {
  Raviwara:    { Magha: "M", Vishakha: "M", Anuradha: "M", Jyeshtha: "M", Dhanishta: "M" },
  Somawara:    { Krittika: "M", Magha: "M", Vishakha: "M", "Uttara Ashadha": "M", "Poorva Bhadrapada": "M" },
  Mangalawara: { Ardhra: "M", Vishakha: "M", Satabhisha: "M", "Poorva Bhadrapada": "M" },
  Budhawara:   { Ashwini: "M", Hasta: "M", Moola: "M", Dhanishta: "M", Revati: "M" },
  Guruwara:    { Krittika: "M", Rohini: "M", Mrigashira: "M", Ardhra: "M", "Uttara Phalguni": "M", Satabhisha: "M" },
  Shukrawara:  { Rohini: "M", Ashleysha: "M", Magha: "M", Jyeshtha: "M" },
  Shaniwara:   { Ashleysha: "M", "Uttara Phalguni": "M", Hasta: "M", Chitra: "M", "Poorva Bhadrapada": "M", Revati: "M" }
};

const DISALLOWED_YOGAS   = new Set(["Vyaghata", "Vishkumbha", "Parigha", "Shoola", "Ganda", "Vyatipaata", "Vajra", "Sula", "Vaidhriti"]);
const DISALLOWED_KARANAS = new Set(["Vishti", "Bhadra", "Chatushpada", "Nagava", "Kimstughna", "Shakuni"]);

const NAKSHATRA_NORMALIZE_MAP = {
  Ashleysha: "Ashlesha",
  "Poorva Ashadha": "Purva Ashada",
  "Uttara Ashadha": "Uttara Ashada"
};

// Zodiac sign order (used for lagna place counting)
const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

// ── helpers ──────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, "0"); }

function buildDateParams(dateStr) {
  const [yyyy, mm, dd] = dateStr.split("-");
  return { day: dd, month: mm, year: yyyy };
}

function buildFormData(dateStr, place, lat, lon, tzone) {
  const { day, month, year } = buildDateParams(dateStr);
  const form = new FormData();
  form.append("api_key", API_KEY);
  form.append("day",   day);
  form.append("month", month);
  form.append("year",  year);
  form.append("Place", place);
  form.append("lat",   lat);
  form.append("lon",   lon);
  form.append("tzone", tzone);
  form.append("lan",   "en");
  return form;
}

function buildURLParams(dateStr, place, lat, lon, tzone) {
  const { day, month, year } = buildDateParams(dateStr);
  return new URLSearchParams({ api_key: API_KEY, day, month, year, Place: place, lat, lon, tzone, lan: "en" });
}

function authHeaders(contentType) {
  const h = { Authorization: AUTH_TOKEN };
  if (contentType) h["Content-Type"] = contentType;
  return h;
}

function endOfDay(dateStr) { return new Date(`${dateStr}T23:59:59`); }

function formatDateTime(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeNakshatra(name) { return NAKSHATRA_NORMALIZE_MAP[name] || name; }

function isNakshatraMarkedM(weekday, nakshatra) {
  return NAKSHATRA_WEEKDAY_RULES[weekday]?.[nakshatra] === "M";
}

function formatDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

// ── API calls ─────────────────────────────────────────────────

async function getNakshatraTimingsForDate(dateStr, lat, lon, tzone, place) {
  log(dateStr, "Fetching nakshatra timings");
  const res = await fetch("https://astroapi-1.divineapi.com/indian-api/v2/find-nakshatra", {
    method: "POST",
    headers: authHeaders("application/x-www-form-urlencoded"),
    body: buildURLParams(dateStr, place, lat, lon, tzone).toString()
  });

  const data = await res.json();
  const merged = [];
  let cur = null;

  for (const p of data?.data?.nakshatras?.nakshatra_pada || []) {
    const sep = p?.end_time_seprated;
    if (!sep) continue;

    const endDateStr = `${sep.year}-${sep.month}-${sep.day}`;
    const endTime    = `${pad(sep.hour)}:${pad(sep.minute)}:${pad(sep.second)}`;
    const fullEnd    = `${endDateStr}T${endTime}`;
    const isNextDay  = endDateStr !== dateStr;
    const truncEnd   = isNextDay ? `${dateStr}T23:59:59` : fullEnd;

    if (!cur) {
      cur = { nakshatra: p.nak_name, start_time: `${dateStr}T00:00:00`, end_time: truncEnd };
    } else if (cur.nakshatra === p.nak_name) {
      cur.end_time = truncEnd;
    } else {
      merged.push(cur);
      if (isNextDay) { merged.push({ nakshatra: p.nak_name, start_time: cur.end_time, end_time: `${dateStr}T23:59:59` }); break; }
      cur = { nakshatra: p.nak_name, start_time: cur.end_time, end_time: truncEnd };
    }
    if (isNextDay) { merged.push(cur); break; }
  }

  if (cur && !merged.includes(cur)) merged.push(cur);
  data.data = null;
  const result = merged.map(i => ({ date: dateStr, nakshatra: i.nakshatra, start_time: i.start_time, end_time: i.end_time }));
  log(dateStr, `Nakshatra → ${result.map(r => r.nakshatra).join(", ")}`);
  return result;
}

async function getTithiDetailsForDate(dateStr, lat, lon, tzone, place) {
  log(dateStr, "Fetching tithi");
  const res  = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-tithi", {
    method: "POST", headers: authHeaders(), body: buildFormData(dateStr, place, lat, lon, tzone)
  });
  const data = await res.json();
  const eod  = endOfDay(dateStr);
  const result = [];

  for (const t of data?.data?.tithis || []) {
    const start = new Date(t.start_time.replace(" ", "T"));
    const end   = new Date(t.end_time.replace(" ", "T"));
    if (start > eod && end > eod) continue;
    result.push({ date: dateStr, tithi: t.tithi, start_time: t.start_time.replace(" ", "T"), end_time: end > eod ? `${dateStr}T23:59:59` : t.end_time.replace(" ", "T") });
  }

  data.data = null;
  log(dateStr, `Tithi → ${result.map(r => r.tithi).join(", ")}`);
  return result;
}

async function getYogaDetailsForDate(dateStr, lat, lon, tzone, place) {
  log(dateStr, "Fetching yoga");
  const res  = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-yoga", {
    method: "POST", headers: authHeaders(), body: buildFormData(dateStr, place, lat, lon, tzone)
  });
  const json  = await res.json();
  const eod   = endOfDay(dateStr);
  const result = [];

  for (const y of json?.data?.yogas ?? []) {
    const yStart = new Date(y.start_time);
    const yEnd   = new Date(y.end_time);
    if (yStart > eod && yEnd > eod) continue;
    result.push({ date: dateStr, yoga: y.yoga_name, start_time: y.start_time, end_time: yEnd > eod ? `${dateStr} 23:59:59` : y.end_time });
  }
  log(dateStr, `Yoga → ${result.map(r => r.yoga).join(", ")}`);
  return result;
}

async function getKaranaDetailsForDate(dateStr, lat, lon, tzone, place) {
  log(dateStr, "Fetching karana");
  const res  = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-karana", {
    method: "POST", headers: authHeaders(), body: buildFormData(dateStr, place, lat, lon, tzone)
  });
  const json  = await res.json();
  const eod   = endOfDay(dateStr);
  const result = [];

  for (const k of json?.data?.karnas || []) {
    const kStart = new Date(k.start_time);
    const kEnd   = new Date(k.end_time);
    if (kStart > eod && kEnd > eod) continue;
    result.push({ date: dateStr, karana: k.karana_name, start_time: k.start_time, end_time: kEnd > eod ? `${dateStr} 23:59:59` : k.end_time });
  }
  log(dateStr, `Karana → ${result.map(r => r.karana).join(", ")}`);
  return result;
}

async function getWaraDetailsForDate(dateStr, lat, lon, tzone, place) {
  log(dateStr, "Fetching wara (weekday / sunrise / sunset)");
  const res  = await fetch("https://astroapi-2.divineapi.com/indian-api/v1/find-sun-and-moon", {
    method: "POST", headers: authHeaders(), body: buildFormData(dateStr, place, lat, lon, tzone)
  });
  const json = await res.json();
  const data = json?.data;
  if (!data) { logWarn(dateStr, "No wara data returned"); return null; }
  log(dateStr, `Wara → ${data.weekday} | sunrise: ${data.sunrise} | sunset: ${data.sunset}`);
  return { date: dateStr, weekday: data.weekday, sunrise: data.sunrise, sunset: data.sunset };
}

async function getInauspiciousTimingsForDate(dateStr, lat, lon, tzone, place) {
  log(dateStr, "Fetching inauspicious timings (Rahu Kaal / Yamaganda / Dur Muhurtam)");
  const res  = await fetch("https://astroapi-3.divineapi.com/indian-api/v1/inauspicious-timings", {
    method: "POST", headers: authHeaders(), body: buildFormData(dateStr, place, lat, lon, tzone)
  });
  const json = await res.json();
  if (!json?.data) { logWarn(dateStr, "No inauspicious timings returned"); return null; }
  log(dateStr, `Inauspicious → Rahu: ${json.data.rahu_kaal?.start_time}–${json.data.rahu_kaal?.end_time}`);
  return { date: dateStr, rahu_kaal: json.data.rahu_kaal, yamaganda: json.data.yamaganda, dur_muhurtam: json.data.dur_muhurtam };
}

// ── Uday Lagna + Lagna Place check ───────────────────────────

async function getUdayLagna(dateStr, lat, lon, tzone, place) {
  log(dateStr, "Fetching uday lagna");
  const res  = await fetch("https://astroapi-3.divineapi.com/indian-api/v1/uday-lagna", {
    method: "POST", headers: authHeaders(), body: buildFormData(dateStr, place, lat, lon, tzone)
  });
  const json = await res.json();
  const list = json?.data?.uday_lagna || [];
  log(dateStr, `Uday lagna → ${list.length} segments: ${list.map(l => l.sign).join(", ")}`);
  return list;
}

// Given a datetime string, find which lagna sign is active at that moment.
function getLagnaSignAtTime(udayLagnaList, timeStr) {
  const target = new Date(timeStr.includes("T") ? timeStr : timeStr.replace(" ", "T"));
  for (const entry of udayLagnaList) {
    const start = new Date(entry.start_time.replace(" ", "T"));
    const end   = new Date(entry.end_time.replace(" ", "T"));
    if (target >= start && target <= end) return entry.sign;
  }
  return null;
}

// Count `place` steps forward from startSign (1-based, wrapping around 12 signs).
function getNthSign(startSign, place) {
  const idx = ZODIAC_SIGNS.indexOf(startSign);
  if (idx === -1) return null;
  return ZODIAC_SIGNS[(idx + place - 1) % 12];
}

// ── Planetary Position API ────────────────────────────────────

/**
 * Fetch planetary positions for a specific date+time from the Divine API.
 * timeStr format: "HH:MM:SS"
 */
async function getPlanetaryPositions(dateStr, timeStr, lat, lon, tzone, place) {
  const [hour, min, sec] = timeStr.split(":").map(Number);
  const { day, month, year } = buildDateParams(dateStr);
  const form = new FormData();
  form.append("api_key",   API_KEY);
  form.append("day",       day);
  form.append("month",     month);
  form.append("year",      year);
  form.append("hour",      String(hour));
  form.append("min",       String(min));
  form.append("sec",       String(sec));
  form.append("Place",     place);
  form.append("lat",       lat);
  form.append("lon",       lon);
  form.append("tzone",     tzone);
  form.append("lan",       "en");
  form.append("full_name", "User");
  form.append("gender",    "male");

  const res  = await fetch("https://astroapi-3.divineapi.com/indian-api/v1/planetary-positions", {
    method: "POST", headers: authHeaders(), body: form
  });
  const json = await res.json();
  return json?.data?.planets || [];
}

// ── House validation (Nakshatra Lord / Sub-Lord rule) ─────────

const BENEFIC_LORDS = new Set(["Jupiter", "Venus"]);

/**
 * Given a list of planets and the target zodiac sign (e.g. "Leo"),
 * find the planet(s) occupying that sign and validate their nakshatra_lord
 * and sub_lord fields.
 *
 * Accept if ANY of the following is true for the planet in that sign:
 *   • nakshatra_lord is empty / missing
 *   • sub_lord       is empty / missing
 *   • nakshatra_lord contains Jupiter or Venus (alone or combined)
 *   • sub_lord       contains Jupiter or Venus (alone or combined)
 *
 * Reject only when neither nakshatra_lord nor sub_lord contains Jupiter/Venus
 * AND both are non-empty.
 *
 * If the sign has NO planet occupying it → accept (empty house is fine).
 */
function isNthHouseAcceptable(planets, targetSign) {
  // Find planets whose sign matches the Nth house sign (exclude Ascendant)
  const occupants = planets.filter(
    p => p.sign === targetSign && p.name !== "Ascendant"
  );

  if (!occupants.length) return true; // empty house → accepted

  // At least ONE occupant must pass; if any passes, the house is valid
  return occupants.some(planet => {
    const nLord = (planet.nakshatra_lord || "").trim();
    const sLord = (planet.sub_lord       || "").trim();

    if (!nLord || !sLord) return true; // empty field → accepted

    const nLordOk = [...BENEFIC_LORDS].some(b => nLord.includes(b));
    const sLordOk = [...BENEFIC_LORDS].some(b => sLord.includes(b));

    return nLordOk || sLordOk;
  });
}

// ── Core lagna filter ─────────────────────────────────────────

/**
 * Final Udaya Lagna + Planetary Position filter.
 *
 * For each already-filtered interval (post all Muhurat filters):
 *  1. Find every Udaya Lagna segment overlapping the interval.
 *  2. Split the interval into per-lagna sub-intervals (clipped to the interval).
 *  3. For each sub-interval, compute the Nth house sign (lagnaPlace).
 *  4. Call the Planetary Position API TWICE per sub-interval:
 *       – once at the exact sub-interval start time
 *       – once at the exact sub-interval end time
 *  5. A sub-interval is VALID only if BOTH API calls pass the
 *     nakshatra_lord / sub_lord validation rule.
 *  6. Invalid sub-intervals are removed entirely (start, end, and lagna sign).
 *  7. If no sub-interval survives, the parent interval is dropped.
 *
 * Each surviving sub-interval in the output carries:
 *   start_time  – sub-interval start (HH:MM:SS boundary)
 *   end_time    – sub-interval end   (HH:MM:SS boundary)
 *   lagnaSign   – Udaya Lagna sign for this sub-interval
 *   targetSign  – Nth house sign (lagnaPlace steps from lagnaSign)
 *   targetSigns – [targetSign]  (array form for frontend compat)
 *   lagnaPlace  – the N used (e.g. 4)
 */
const LAGNA_CONCURRENCY = 5;

async function filterByLagnaPlace(validIntervals, dateStr, udayLagnaList, lagnaPlace, lat, lon, tzone, place) {
  const passed = [];

  for (const interval of validIntervals) {
    const intervalStart = new Date(interval.start_time.replace(" ", "T"));
    const intervalEnd   = new Date(interval.end_time.replace(" ", "T"));

    // 1. Every Udaya Lagna segment that overlaps this muhurat interval
    const overlapping = udayLagnaList.filter(entry => {
      const s = new Date(entry.start_time.replace(" ", "T"));
      const e = new Date(entry.end_time.replace(" ", "T"));
      return s < intervalEnd && e > intervalStart;
    });

    if (!overlapping.length) {
      logWarn(dateStr, `No lagna segments overlap ${interval.start_time} → ${interval.end_time} — dropping interval`);
      continue;
    }

    log(dateStr,
      `Lagna split: ${interval.start_time} → ${interval.end_time} | ` +
      `lagnas=[${overlapping.map(e => e.sign).join(", ")}]`
    );

    // 2. Build per-lagna sub-intervals clipped to the muhurat interval
    const subIntervals = overlapping.map(entry => {
      const lagnaStart = new Date(entry.start_time.replace(" ", "T"));
      const lagnaEnd   = new Date(entry.end_time.replace(" ", "T"));

      const subStart = new Date(Math.max(lagnaStart, intervalStart));
      const subEnd   = new Date(Math.min(lagnaEnd,   intervalEnd));

      const toTimeStr = d => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

      return {
        startDate:  formatDateStr(subStart),
        endDate:    formatDateStr(subEnd),
        startTime:  toTimeStr(subStart),
        endTime:    toTimeStr(subEnd),
        startFull:  formatDateTime(subStart),
        endFull:    formatDateTime(subEnd),
        lagnaSign:  entry.sign,
        targetSign: getNthSign(entry.sign, lagnaPlace)
      };
    }).filter(s => s.targetSign); // drop any where sign arithmetic failed

    // 3–6. Validate each sub-interval with two Planetary Position API calls
    const validSubIntervals = [];

    for (let i = 0; i < subIntervals.length; i += LAGNA_CONCURRENCY) {
      const batch = subIntervals.slice(i, i + LAGNA_CONCURRENCY);

      const results = await Promise.all(
        batch.map(async sub => {
          const { startDate, endDate, startTime, endTime, lagnaSign, targetSign, startFull, endFull } = sub;

          log(dateStr,
            `  → Sub-interval ${startTime}→${endTime} | lagna=${lagnaSign} | house${lagnaPlace}=${targetSign}`
          );

          // Call API at start timestamp
          const planetsStart = await getPlanetaryPositions(startDate, startTime, lat, lon, tzone, place);
          const okStart      = isNthHouseAcceptable(planetsStart, targetSign);
          log(dateStr, `    Start (${startTime}): house${lagnaPlace} (${targetSign}) → ${okStart ? "✅" : "❌"}`);

          // Call API at end timestamp
          const planetsEnd = await getPlanetaryPositions(endDate, endTime, lat, lon, tzone, place);
          const okEnd      = isNthHouseAcceptable(planetsEnd, targetSign);
          log(dateStr, `    End   (${endTime}): house${lagnaPlace} (${targetSign}) → ${okEnd ? "✅" : "❌"}`);

          const valid = okStart && okEnd;
          log(dateStr,
            `  → ${valid ? "✅ PASS" : "❌ FAIL"} — sub-interval ${startTime} → ${endTime} | lagna=${lagnaSign} | house${lagnaPlace}=${targetSign}`
          );

          if (!valid) return null;

          return {
            ...interval,             // carry through the parent's non-time metadata
            start_time:  startFull,
            end_time:    endFull,
            lagnaSign,
            targetSign,
            targetSigns: [targetSign],
            lagnaPlace
          };
        })
      );

      for (const r of results) {
        if (r) validSubIntervals.push(r);
      }
    }

    // 7. Keep only the valid sub-intervals; drop whole interval if none survive
    if (!validSubIntervals.length) {
      log(dateStr, `❌ Interval dropped — all lagna sub-intervals failed: ${interval.start_time} → ${interval.end_time}`);
      continue;
    }

    log(dateStr,
      `✅ Interval kept — ${validSubIntervals.length} valid sub-interval(s): ` +
      validSubIntervals.map(s => `${s.start_time}→${s.end_time} (${s.targetSign})`).join(", ")
    );
    passed.push(...validSubIntervals);
  }

  return passed;
}

async function isNakshatraChandrashtama(dateStr, userNakshatra, lat, lon, tzone, place) {
  log(dateStr, `Checking chandrashtama for ${userNakshatra}`);
  const res  = await fetch("https://astroapi-3.divineapi.com/indian-api/v1/chandrashtama", {
    method: "POST",
    headers: authHeaders("application/x-www-form-urlencoded"),
    body: buildURLParams(dateStr, place, lat, lon, tzone).toString()
  });
  const json = await res.json();
  if (!json.success || !Array.isArray(json?.data)) return false;
  const target = new Date(dateStr);
  const result = json.data.some(({ start_date, end_date, chandrashtama }) =>
    target >= new Date(start_date) && target <= new Date(end_date) &&
    chandrashtama.some(n => n.nakshatra.toLowerCase() === userNakshatra.toLowerCase())
  );
  log(dateStr, `Chandrashtama → ${result ? "❌ YES (skipping day)" : "✅ NO (proceeding)"}`);
  return result;
}

// ── Balam ─────────────────────────────────────────────────────

function getBalamWindow({ values, target, upto, dateStr, key }) {
  const { current = [], next = [] } = values;
  const dayStart = `${dateStr}T00:00:00`;
  const dayEnd   = `${dateStr}T23:59:59`;

  if (!upto) {
    return current.includes(target) ? [{ date: dateStr, [key]: target, start_time: dayStart, end_time: dayEnd }] : null;
  }

  const [timePart, datePart] = upto.split(", ");
  const [monthStr, dayStr]   = datePart.trim().split(" ");
  const MONTHS = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
  const uptoDate    = new Date(new Date(dateStr).getFullYear(), MONTHS[monthStr], parseInt(dayStr));
  const currentDate = new Date(dateStr);

  if (uptoDate > currentDate && current.includes(target)) {
    return [{ date: dateStr, [key]: target, start_time: dayStart, end_time: dayEnd }];
  }

  let [hhmm, ampm] = timePart.trim().split(" ");
  let [hour, minute] = hhmm.split(":").map(Number);
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const cutoff = `${dateStr}T${pad(hour)}:${pad(minute)}:00`;

  const inCurrent = current.includes(target);
  const inNext    = next.includes(target);

  if (inCurrent && inNext) return [{ date: dateStr, [key]: target, start_time: dayStart, end_time: dayEnd }];
  if (inCurrent)           return [{ date: dateStr, [key]: target, start_time: dayStart, end_time: cutoff }];
  if (inNext)              return [{ date: dateStr, [key]: target, start_time: cutoff,   end_time: dayEnd }];
  return null;
}

async function getBalamTimings(dateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
  log(dateStr, `Fetching chandrabalam & tarabalam for nakshatra: ${userNakshatra}, rasi: ${userRasi}`);
  const normNakshatra = normalizeNakshatra(userNakshatra);

  const res  = await fetch("https://astroapi-2.divineapi.com/indian-api/v2/find-chandrabalam-and-tarabalam", {
    method: "POST",
    headers: authHeaders("application/x-www-form-urlencoded"),
    body: buildURLParams(dateStr, place, lat, lon, tzone).toString()
  });
  const json = await res.json();
  const tarabalamData    = json?.data?.tarabalams;
  const chandrabalamData = json?.data?.chandrabalams;

  if (!tarabalamData || !chandrabalamData) return { chandrabalam: [], tarabalam: [] };

  tarabalamData.current = (tarabalamData.current || []).map(normalizeNakshatra);
  tarabalamData.next    = (tarabalamData.next    || []).map(normalizeNakshatra);

  const result = {
    chandrabalam: getBalamWindow({ values: chandrabalamData, target: userRasi,      upto: chandrabalamData.upto, dateStr, key: "rasi"      }) || [],
    tarabalam:    getBalamWindow({ values: tarabalamData,    target: normNakshatra, upto: tarabalamData.upto,    dateStr, key: "nakshatra" }) || []
  };
  log(dateStr, `Balam → chandrabalam: ${result.chandrabalam.length ? "✅" : "❌"} tarabalam: ${result.tarabalam.length ? "✅" : "❌"}`);
  return result;
}

// ── Interval subtraction ──────────────────────────────────────

function removeBlockedIntervals(masterStart, masterEnd, blockedIntervals) {
  const parseLocal = s => {
    if (s instanceof Date) return s;
    if (!s || typeof s !== "string") return null;
    if (s.includes("T")) { const d = new Date(s); return isNaN(d) ? null : d; }
    if (s.includes(" ")) {
      const [dp, tp] = s.split(" ");
      const [yr, mo, dy] = dp.split("-").map(Number);
      const [h,  mi, sc] = tp.split(":").map(Number);
      return new Date(yr, mo-1, dy, h, mi, sc);
    }
    return null;
  };

  const ms = parseLocal(masterStart);
  const me = parseLocal(masterEnd);
  if (!ms || !me) throw new Error("Invalid master time range");

  const intervals = (blockedIntervals || [])
    .map(({ start_time, end_time }) => [parseLocal(start_time), parseLocal(end_time)])
    .filter(([s, e]) => s && e && e > s)
    .sort((a, b) => a[0] - b[0]);

  const merged = [];
  for (const [s, e] of intervals) {
    if (!merged.length || merged.at(-1)[1] < s) merged.push([s, e]);
    else merged.at(-1)[1] = new Date(Math.max(merged.at(-1)[1], e));
  }

  const valid = [];
  let cur = ms;
  for (const [bs, be] of merged) {
    if (bs > cur) valid.push([cur, bs]);
    cur = new Date(Math.max(cur, be));
  }
  if (cur < me) valid.push([cur, me]);

  return valid.map(([s, e]) => ({ start_time: formatDateTime(s), end_time: formatDateTime(e) }));
}

// ── Nakshatra filtering ───────────────────────────────────────

function getFilteredNakshatra(startItem, secondNakshatraList) {
  const startIndex = NAKSHATRA_LIST.indexOf(startItem);
  if (startIndex === -1) return { filtered: [], common: [] };

  const rotated  = [...NAKSHATRA_LIST.slice(startIndex), ...NAKSHATRA_LIST.slice(0, startIndex)];
  const filtered = rotated.filter((_, idx) => !POSITIONS_TO_REMOVE.has(idx + 1));
  const secondSet = new Set(secondNakshatraList);
  const common   = filtered.filter(n => secondSet.has(n));
  return { filtered, common };
}

// ── Master time range ─────────────────────────────────────────
//
//  timeMode (set in each ceremony's CONFIG):
//    "morning"   → 00:00 – 13:00  (Pumsuvanam, Upanayanam)
//    "day"       → 00:00 – 18:00  (default for all others)
//    "evening"   → 18:00 – 23:59  (Shantimuhurtam)

function getMasterTimeRange({ date }, timeMode = "day") {
  if (timeMode === "morning") {
    return { masterStartTime: `${date}T00:00:00`, masterEndTime: `${date}T13:00:00` };
  }
  if (timeMode === "evening") {
    return { masterStartTime: `${date}T18:00:00`, masterEndTime: `${date}T23:59:59` };
  }
  // "day" — default
  return { masterStartTime: `${date}T00:00:00`, masterEndTime: `${date}T18:00:00` };
}

// ── Core window calculator ────────────────────────────────────

async function getAuspiciousTimeWindow(dateStr, userNakshatra, userRasi, lat, lon, tzone, place, config) {
  const { secondNakshatraList, disallowedTithis, timeMode = "day", lagnaPlace = 8 } = config;
  const disallowedTithiSet = new Set(disallowedTithis);

  const waraList      = await getWaraDetailsForDate(dateStr, lat, lon, tzone, place);
  const currentWeekday = waraList?.weekday;

  if (isNakshatraMarkedM(currentWeekday, userNakshatra)) {
    log(dateStr, `Skipped — nakshatra ${userNakshatra} is marked inauspicious on ${currentWeekday}`);
    return null;
  }

  const isChandrashtama = await isNakshatraChandrashtama(dateStr, userNakshatra, lat, lon, tzone, place);
  if (isChandrashtama) { log(dateStr, "Skipped — chandrashtama day"); return null; }

  const [nakshatraList, tithiList, yogaList, karanaList, balam, udayLagnaList] = await Promise.all([
    getNakshatraTimingsForDate(dateStr, lat, lon, tzone, place),
    getTithiDetailsForDate(dateStr, lat, lon, tzone, place),
    getYogaDetailsForDate(dateStr, lat, lon, tzone, place),
    getKaranaDetailsForDate(dateStr, lat, lon, tzone, place),
    getBalamTimings(dateStr, userNakshatra, userRasi, lat, lon, tzone, place),
    getUdayLagna(dateStr, lat, lon, tzone, place)
  ]);

  const chandrabalamList = balam.chandrabalam;
  const tarabalamList    = balam.tarabalam;
  const { filtered: allowedFiltered, common: allowedCommon } = getFilteredNakshatra(userNakshatra, secondNakshatraList);

  async function processWithAllowed(allowedNakshatras, label) {
    const safeNakshatras        = Array.isArray(nakshatraList)     ? nakshatraList     : [];
    const safeTithis            = Array.isArray(tithiList)         ? tithiList         : [];
    const safeYogas             = Array.isArray(yogaList)          ? yogaList          : [];
    const safeKaranas           = Array.isArray(karanaList)        ? karanaList        : [];
    const safeWaras             = waraList                         ? [waraList]        : [];
    const safeChandrabalam      = Array.isArray(chandrabalamList)  ? chandrabalamList  : [];
    const safeTarabalam         = Array.isArray(tarabalamList)     ? tarabalamList     : [];
    const safeAllowedNakshatras = new Set(Array.isArray(allowedNakshatras) ? allowedNakshatras : []);

    const filteredNakshatras = safeNakshatras.filter(n => safeAllowedNakshatras.has(n?.nakshatra));
    const filteredTithis     = safeTithis.filter(t  => !disallowedTithiSet.has(t?.tithi));
    const filteredYogas      = safeYogas.filter(y   => !DISALLOWED_YOGAS.has(y?.yoga));
    const filteredKaranas    = safeKaranas.filter(k  => !DISALLOWED_KARANAS.has(k?.karana));

    const required = [
      ["Nakshatras",   filteredNakshatras],
      ["Tithis",       filteredTithis],
      ["Yogas",        filteredYogas],
      ["Karanas",      filteredKaranas],
      ["Waras",        safeWaras],
      ["Chandrabalam", safeChandrabalam],
      ["Tarabalam",    safeTarabalam]
    ];
    for (const [name, list] of required) {
      if (!list.length) { logWarn(dateStr, `Missing ${name} — skipping ${label}`); return null; }
    }

    let { masterStartTime, masterEndTime } = getMasterTimeRange(safeWaras[0], timeMode);
    log(dateStr, `${label} — master window: ${masterStartTime} → ${masterEndTime} (mode: ${timeMode})`);

    const constrain = (start, end) => {
      if (!start || !end) return;
      const s = new Date(start), e = new Date(end);
      if (isNaN(s) || isNaN(e)) return;
      if (new Date(masterStartTime) < s) masterStartTime = start;
      if (new Date(masterEndTime)   > e) masterEndTime   = end;
    };

    constrain(safeChandrabalam[0].start_time,    safeChandrabalam.at(-1).end_time);
    constrain(safeTarabalam[0].start_time,        safeTarabalam.at(-1).end_time);
    constrain(filteredNakshatras[0].start_time,   filteredNakshatras.at(-1).end_time);
    constrain(filteredTithis[0].start_time,       filteredTithis.at(-1).end_time);
    constrain(filteredYogas[0].start_time,        filteredYogas.at(-1).end_time);
    constrain(filteredKaranas[0].start_time,      filteredKaranas.at(-1).end_time);

    if (new Date(masterStartTime) >= new Date(masterEndTime)) return null;

    const inauspicious   = await getInauspiciousTimingsForDate(dateStr, lat, lon, tzone, place);
    const blocked        = inauspicious
      ? [inauspicious.rahu_kaal, inauspicious.yamaganda, ...(inauspicious.dur_muhurtam || [])]
      : [];
    const afterBlocked   = removeBlockedIntervals(masterStartTime, masterEndTime, blocked);
    log(dateStr, `${label} — after blocking: ${afterBlocked.length} interval(s) remain`);

    // Apply Udaya Lagna + Planetary Position filter.
    // Intervals where NO lagna's Nth house passes nakshatra_lord/sub_lord
    // validation are dropped entirely. Kept intervals carry targetSigns[]
    // (the accepted house signs) for frontend display.
    const validIntervals = udayLagnaList.length
      ? await filterByLagnaPlace(afterBlocked, dateStr, udayLagnaList, lagnaPlace, lat, lon, tzone, place)
      : afterBlocked;

    log(dateStr, `${label} — after lagna filter: ${validIntervals.length} interval(s) passed`);

    if (!validIntervals.length) { log(dateStr, `${label} — no valid intervals, skipping`); return null; }

    return {
      label,
      date:        dateStr,
      nakshatras:  filteredNakshatras.map(n => n.nakshatra),
      nakshatraStr: filteredNakshatras.map(n => n.nakshatra).join(", "),
      rasi:        userRasi,
      tithis:      filteredTithis.map(t => t.tithi),
      tithiStr:    filteredTithis.map(t => t.tithi).join(", "),
      wara:        safeWaras[0]?.weekday || "",
      yogas:       filteredYogas.map(y => y.yoga),
      yogaStr:     filteredYogas.map(y => y.yoga).join(", "),
      karanas:     filteredKaranas.map(k => k.karana),
      karanaStr:   filteredKaranas.map(k => k.karana).join(", "),
      // Each interval: start_time, end_time, lagnaSign, targetSign, targetSigns[], lagnaPlace
      timerange:   validIntervals
    };
  }

  let resultFiltered  = await processWithAllowed(allowedFiltered, "Filtered Only");
  const resultCommon  = await processWithAllowed(allowedCommon,   "Filtered + Common");

  if (resultFiltered && resultCommon &&
      resultFiltered.nakshatraStr === resultCommon.nakshatraStr &&
      resultFiltered.timerange?.toString() === resultCommon.timerange?.toString()) {
    resultFiltered = null;
  }

  return { resultFiltered, resultCommon };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Run the auspicious date check across a date range.
 * @param {string} fromDateStr  "YYYY-MM-DD"
 * @param {string} toDateStr    "YYYY-MM-DD"
 * @param {string} userNakshatra
 * @param {string} userRasi
 * @param {number} lat
 * @param {number} lon
 * @param {number} tzone
 * @param {string} place
 * @param {{ secondNakshatraList: string[], disallowedTithis: string[] }} config
 */
export async function runAuspiciousCheck(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place, config) {
  const resultsFiltered = [];
  const resultsCommon   = [];
  const CONCURRENCY     = 10;

  const parseDate = str => { const [y, m, d] = str.split("-").map(Number); return new Date(y, m-1, d); };

  let current = parseDate(fromDateStr);
  const toDate = parseDate(toDateStr);

  while (current <= toDate) {
    const chunkStart = new Date(current);
    const chunkEnd   = new Date(chunkStart.getFullYear(), chunkStart.getMonth() + 1, 0);
    if (chunkEnd > toDate) chunkEnd.setTime(toDate.getTime());

    const dates = [];
    for (let d = new Date(chunkStart); d <= chunkEnd; d.setDate(d.getDate() + 1)) {
      dates.push(formatDateStr(d));
    }

    for (let i = 0; i < dates.length; i += CONCURRENCY) {
      const batch = dates.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(async dateStr => {
        try {
          log(dateStr, "── Starting auspicious check ──");
          const result = await getAuspiciousTimeWindow(dateStr, userNakshatra, userRasi, lat, lon, tzone, place, config);
          if (result) log(dateStr, "── Check complete ✅ ──");
          else        log(dateStr, "── No auspicious window found ⏭ ──");
          return result ? { date: dateStr, ...result } : null;
        } catch (err) {
          logErr(dateStr, "Check failed", err);
          return null;
        }
      }));

      for (const item of batchResults) {
        if (!item) continue;
        if (item.resultFiltered) resultsFiltered.push({ date: item.date, ...item.resultFiltered });
        if (item.resultCommon)   resultsCommon.push({   date: item.date, ...item.resultCommon   });
      }
    }

    current = new Date(chunkEnd);
    current.setDate(current.getDate() + 1);
  }

  return { filtered: resultsFiltered, common: resultsCommon };
}