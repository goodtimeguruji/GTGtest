// ============================================================
//  muhurat-core-without-udaylagna.js  –  shared engine for muhurat
//  functions that do NOT require Udaya Lagna processing.
//  Each ceremony file imports { runAuspiciousCheck } and passes
//  its own secondNakshatraList + disallowedTithis config.
//
//  This variant keeps only the original Muhurat filtering
//  (Nakshatra, Vara, Yoga, Karana, Chandrabalam, Tarabalam,
//  Andhrashtama/Chandrashtama, etc.) and returns the Muhurat
//  immediately after those filters. It never calls the Udaya
//  Lagna API or the Planetary Position API.
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

// ── live-API spelling-drift guard ───────────────────────────
// The Aug 2026 spelling audit found several Divine API endpoints using
// spellings this file didn't recognize (e.g. Karana returning "Naga"/
// "Kintughna" while DISALLOWED_KARANAS had "Nagava"/"Kimstughna"; Yoga
// returning "Vraidhiti" while DISALLOWED_YOGAS had "Vaidhriti"; and
// Chandrabalam returning English zodiac names ("Aries") while userRasi is
// Sanskrit ("Mesha")). Those mismatches failed silently — a disallowed day
// simply never got filtered, with no error anywhere.
//
// This helper doesn't change behaviour; it just logs a loud warning
// whenever an API value isn't in the master list this file expects, so a
// future spelling drift is caught in logs immediately instead of months
// later. Call it wherever a raw API value gets compared against one of the
// ALL_*/DISALLOWED_* constants below.
function warnOnUnknownValue(dateStr, category, value, knownValues) {
  if (value == null || value === "") return;
  const known = knownValues instanceof Set ? knownValues : new Set(knownValues);
  if (!known.has(value)) {
    logWarn(dateStr, `Unrecognized ${category} value from API: "${value}" — not in this file's known ${category} list. Possible spelling drift; verify against the live API and update the relevant constant.`);
  }
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
// NOTE: this list intentionally matches the live Nakshatra API's spelling
// (confirmed via the Aug 2026 audit) AND every ceremony CONFIG's
// secondNakshatraList (e.g. StartBuisiness.js uses "Satabhisha") — NOT
// muhurat-finder.html's dropdown spelling, which differs for 3 entries
// ("Shatabhisha", "Purva Ashadha", "Purva Bhadrapada"). Renaming this list
// to match the frontend would have silently broken every ceremony config's
// "common" nakshatra matching instead. Use canonicalNakshatra() (below) to
// translate the frontend's userNakshatra into this spelling before any
// comparison — that's now done at every comparison point in this file.

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

// Confirmed against a full month of live API output (Aug 2026 audit):
// the Karana API actually returns "Naga" and "Kintughna" — NOT "Nagava" or
// "Kimstughna" as previously assumed. Both the corrected and the old
// (in case the API is inconsistent across regions/versions) spellings are
// kept, matching this file's existing Vishti/Bhadra dual-entry pattern.
const DISALLOWED_YOGAS   = new Set(["Vyaghata", "Vishkumbha", "Parigha", "Shoola", "Ganda", "Vyatipaata", "Vajra", "Sula", "Vaidhriti", "Vraidhiti"]);
const DISALLOWED_KARANAS = new Set(["Vishti", "Bhadra", "Chatushpada", "Nagava", "Naga", "Kimstughna", "Kintughna", "Shakuni"]);

// Full master lists (all 27 yogas / 11 karanas / 7 waras / 12 rasis), taken
// from the Aug 2026 live-API audit, used ONLY for drift detection via
// warnOnUnknownValue — they are not filters by themselves.
const ALL_YOGAS = new Set([
  "Vishkumbha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti",
  "Shoola", "Ganda", "Vridhi", "Dhruv", "Vyaghata", "Harshana", "Vajra", "Sidhi", "Vyatipaata",
  "Variyana", "Parigha", "Shiva", "Sadhya", "Shubha", "Shukla", "Bhramha", "Indra or Aindra",
  "Vraidhiti", "Shidha"
]);
const ALL_KARANAS = new Set(["Bav", "Balav", "Kaulava", "Taitila", "Gar", "Vanija", "Vishti", "Shakuni", "Chatushpada", "Naga", "Kintughna"]);
const ALL_WARAS   = new Set(["Raviwara", "Somawara", "Mangalawara", "Budhawara", "Guruwara", "Shukrawara", "Shaniwara"]);
const ALL_RASIS_ENGLISH = new Set(["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]);

// The Chandrabalam API returns English zodiac names ("Aries", "Taurus", …).
// Confirmed by reading muhurat-finder.html: its <select id="rasi"> already
// sends English values, so RASI_NORMALIZE_MAP below is a defensive
// passthrough (it won't match an already-English value, and returns it
// unchanged) — kept in case any other caller ever passes a Sanskrit rasi.
const RASI_NORMALIZE_MAP = {
  Mesha: "Aries", Vrishabha: "Taurus", Mithuna: "Gemini", Karka: "Cancer", Kark: "Cancer",
  Simha: "Leo", Kanya: "Virgo", Tula: "Libra", Vrischika: "Scorpio", Vrishchika: "Scorpio",
  Dhanu: "Sagittarius", Makara: "Capricorn", Kumbha: "Aquarius", Meena: "Pisces", Mina: "Pisces"
};

// Every known spelling variant for each nakshatra across the 3 places a
// spelling can originate from — muhurat-finder.html's dropdown, the live
// Nakshatra API, and the Tarabalam API — mapped to ONE canonical form,
// which is the ORIGINAL spelling this file (and every ceremony CONFIG's
// secondNakshatraList) already uses. This replaces the old, narrower
// NAKSHATRA_NORMALIZE_MAP, which only covered the Nakshatra-API vs
// Tarabalam-API mismatch and was never applied to NAKSHATRA_LIST lookups,
// weekday "M"-rule checks, or the Chandrashtama comparison — exactly the
// 3 places a direct read of muhurat-finder.html found real, silent
// failures (the frontend sends "Shatabhisha"/"Purva Ashadha"/
// "Purva Bhadrapada", 3 of the 27 values, which never matched this file's
// "Satabhisha"/"Poorva Ashadha"/"Poorva Bhadrapada"). canonicalNakshatra()
// is now applied at all of those comparison points.
const NAKSHATRA_SPELLING_GROUPS = [
  ["Ashwini"], ["Bharani"], ["Krittika"], ["Rohini"],
  ["Mrigashira"], ["Ardhra"], ["Punarvasu"], ["Pushya"],
  ["Ashleysha", "Ashlesha"], ["Magha"],
  ["Purva Phalguni"], ["Uttara Phalguni"],
  ["Hasta"], ["Chitra"], ["Swati"], ["Vishakha"],
  ["Anuradha"], ["Jyeshtha"], ["Moola"],
  ["Poorva Ashadha", "Purva Ashadha", "Purva Ashada"],   // canonical: "Poorva Ashadha" (matches NAKSHATRA_LIST/API/configs); frontend sends "Purva Ashadha"; Tarabalam API returns "Purva Ashada"
  ["Uttara Ashadha", "Uttara Ashada"],
  ["Shravan", "Shravana"],
  ["Dhanishta"],
  ["Satabhisha", "Shatabhisha"],                          // canonical: "Satabhisha" (matches NAKSHATRA_LIST/API/configs); frontend sends "Shatabhisha"
  ["Poorva Bhadrapada", "Purva Bhadrapada"],               // canonical: "Poorva Bhadrapada" (matches NAKSHATRA_LIST/API/configs); frontend sends "Purva Bhadrapada"
  ["Uttara Bhadrapada"],
  ["Revati"]
];
const NAKSHATRA_CANONICAL_MAP = Object.fromEntries(
  NAKSHATRA_SPELLING_GROUPS.flatMap(group => group.map(variant => [variant, group[0]]))
);

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

function normalizeNakshatra(name) { return NAKSHATRA_CANONICAL_MAP[name] || name; }
const canonicalNakshatra = normalizeNakshatra; // alias for readability at new call sites
function normalizeRasi(name) { return RASI_NORMALIZE_MAP[name] || name; }

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
    chandrashtama.some(n => {
      const apiNakshatra = canonicalNakshatra(n.nakshatra);
      if (!NAKSHATRA_LIST.includes(apiNakshatra)) {
        logWarn(dateStr, `Unrecognized nakshatra "${n.nakshatra}" from Chandrashtama API — not in NAKSHATRA_LIST even after canonicalization.`);
      }
      return apiNakshatra.toLowerCase() === userNakshatra.toLowerCase();
    })
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
  // Chandrabalam API returns English zodiac names ("Aries", "Taurus", …).
  // Confirmed by reading muhurat-finder.html: its <select id="rasi"> already
  // sends English values, so this is a defensive passthrough (it won't
  // match an already-English value, and returns it unchanged) — kept in
  // case any other caller ever passes a Sanskrit rasi.
  const normRasi = normalizeRasi(userRasi);

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
  (chandrabalamData.current || []).forEach(v => warnOnUnknownValue(dateStr, "rasi (chandrabalam)", v, ALL_RASIS_ENGLISH));
  (chandrabalamData.next    || []).forEach(v => warnOnUnknownValue(dateStr, "rasi (chandrabalam)", v, ALL_RASIS_ENGLISH));

  const result = {
    chandrabalam: getBalamWindow({ values: chandrabalamData, target: normRasi,      upto: chandrabalamData.upto, dateStr, key: "rasi"      }) || [],
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
  const canonicalStartItem = canonicalNakshatra(startItem);
  const startIndex = NAKSHATRA_LIST.indexOf(canonicalStartItem);
  if (startIndex === -1) {
    logWarn("N/A", `Nakshatra "${startItem}" not found in NAKSHATRA_LIST (even after canonicalization) — returning no results. Likely a NEW spelling variant; add it to NAKSHATRA_SPELLING_GROUPS.`);
    return { filtered: [], common: [] };
  }

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
  const { secondNakshatraList, disallowedTithis, timeMode = "day" } = config;
  const disallowedTithiSet = new Set(disallowedTithis);

  // Translate whatever spelling userNakshatra arrived in (frontend, API,
  // etc. — see NAKSHATRA_SPELLING_GROUPS) into this file's canonical form,
  // ONCE, so every comparison below is guaranteed consistent.
  userNakshatra = canonicalNakshatra(userNakshatra);

  const waraList      = await getWaraDetailsForDate(dateStr, lat, lon, tzone, place);
  const currentWeekday = waraList?.weekday;
  warnOnUnknownValue(dateStr, "wara", currentWeekday, ALL_WARAS);

  if (isNakshatraMarkedM(currentWeekday, userNakshatra)) {
    log(dateStr, `Skipped — nakshatra ${userNakshatra} is marked inauspicious on ${currentWeekday}`);
    return null;
  }

  const isChandrashtama = await isNakshatraChandrashtama(dateStr, userNakshatra, lat, lon, tzone, place);
  if (isChandrashtama) { log(dateStr, "Skipped — chandrashtama day"); return null; }

  const [nakshatraList, tithiList, yogaList, karanaList, balam] = await Promise.all([
    getNakshatraTimingsForDate(dateStr, lat, lon, tzone, place),
    getTithiDetailsForDate(dateStr, lat, lon, tzone, place),
    getYogaDetailsForDate(dateStr, lat, lon, tzone, place),
    getKaranaDetailsForDate(dateStr, lat, lon, tzone, place),
    getBalamTimings(dateStr, userNakshatra, userRasi, lat, lon, tzone, place)
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
    safeYogas.forEach(y => warnOnUnknownValue(dateStr, "yoga", y?.yoga, ALL_YOGAS));
    safeKaranas.forEach(k => warnOnUnknownValue(dateStr, "karana", k?.karana, ALL_KARANAS));

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

    if (!afterBlocked.length) { log(dateStr, `${label} — no valid intervals, skipping`); return null; }

    // No Udaya Lagna / Planetary Position filtering in this variant —
    // return the muhurat immediately after the existing filters.
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
      // Each interval: start_time, end_time
      timerange:   afterBlocked
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