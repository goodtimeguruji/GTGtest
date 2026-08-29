// ============================================================
//  spelling-audit.js
//
//  Diagnostic tool: cycles through every day of a given month,
//  calling the same Divine APIs muhurat-core.js uses —
//    • find-nakshatra                (Nakshatra)
//    • find-sun-and-moon             (Wara / weekday)
//    • find-karana                   (Karana)
//    • find-yoga                     (Yoga)
//    • find-tithi                    (Tithi)
//    • find-chandrabalam-and-tarabalam
//  — prints the final day-by-day result for each, and then
//  cross-checks every distinct value the APIs actually returned
//  against muhurat-core.js's internal spelling lists
//  (NAKSHATRA_LIST, NAKSHATRA_WEEKDAY_RULES, DISALLOWED_YOGAS,
//  DISALLOWED_KARANAS) so any mismatch is impossible to miss.
//
//  Usage:
//    node services/spelling-audit.js [YYYY-MM] [lat] [lon] [tzone] [place] [nakshatra] [rasi]
//
//  Example:
//    node services/spelling-audit.js 2026-09 13.0827 80.2707 5.5 "Chennai, India" Ashwini Mesha
//
//  Env vars (same as muhurat-core.js):
//    DIVINE_API_KEY, DIVINE_AUTH_TOKEN
// ============================================================

const API_KEY    = process.env.DIVINE_API_KEY    || "a3a1ab378702c90ccc523c59a888f28b";
const AUTH_TOKEN = process.env.DIVINE_AUTH_TOKEN || "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";

// ── mirrors of the internal spelling lists in muhurat-core.js ──
// (kept as a local copy so this script never has to modify the
//  file under review — update these two blocks together if
//  muhurat-core.js's lists ever change)
const NAKSHATRA_LIST = [
  "Ashwini", "Bharani", "Krittika", "Rohini",
  "Mrigashira", "Ardhra", "Punarvasu", "Pushya",
  "Ashleysha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha",
  "Anuradha", "Jyeshtha", "Moola", "Poorva Ashadha",
  "Uttara Ashadha", "Shravan", "Dhanishta", "Satabhisha",
  "Poorva Bhadrapada", "Uttara Bhadrapada", "Revati"
];
const WEEKDAY_KEYS = ["Raviwara", "Somawara", "Mangalawara", "Budhawara", "Guruwara", "Shukrawara", "Shaniwara"];
const DISALLOWED_YOGAS   = new Set(["Vyaghata", "Vishkumbha", "Parigha", "Shoola", "Ganda", "Vyatipaata", "Vajra", "Sula", "Vaidhriti"]);
const DISALLOWED_KARANAS = new Set(["Vishti", "Bhadra", "Chatushpada", "Nagava", "Kimstughna", "Shakuni"]);

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
  form.append("day", day);
  form.append("month", month);
  form.append("year", year);
  form.append("Place", place);
  form.append("lat", lat);
  form.append("lon", lon);
  form.append("tzone", tzone);
  form.append("lan", "en");
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

function formatDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── API calls (one per category) ────────────────────────────
async function fetchNakshatra(dateStr, place, lat, lon, tzone) {
  const res = await fetch("https://astroapi-1.divineapi.com/indian-api/v2/find-nakshatra", {
    method: "POST",
    headers: authHeaders("application/x-www-form-urlencoded"),
    body: buildURLParams(dateStr, place, lat, lon, tzone).toString()
  });
  const json = await res.json();
  const names = (json?.data?.nakshatras?.nakshatra_pada || []).map(p => p.nak_name);
  return [...new Set(names)];
}

async function fetchWara(dateStr, place, lat, lon, tzone) {
  const res = await fetch("https://astroapi-2.divineapi.com/indian-api/v1/find-sun-and-moon", {
    method: "POST", headers: authHeaders(), body: buildFormData(dateStr, place, lat, lon, tzone)
  });
  const json = await res.json();
  return json?.data?.weekday || null;
}

async function fetchKarana(dateStr, place, lat, lon, tzone) {
  const res = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-karana", {
    method: "POST", headers: authHeaders(), body: buildFormData(dateStr, place, lat, lon, tzone)
  });
  const json = await res.json();
  const names = (json?.data?.karnas || []).map(k => k.karana_name);
  return [...new Set(names)];
}

async function fetchYoga(dateStr, place, lat, lon, tzone) {
  const res = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-yoga", {
    method: "POST", headers: authHeaders(), body: buildFormData(dateStr, place, lat, lon, tzone)
  });
  const json = await res.json();
  const names = (json?.data?.yogas || []).map(y => y.yoga_name);
  return [...new Set(names)];
}

async function fetchTithi(dateStr, place, lat, lon, tzone) {
  const res = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-tithi", {
    method: "POST", headers: authHeaders(), body: buildFormData(dateStr, place, lat, lon, tzone)
  });
  const json = await res.json();
  const names = (json?.data?.tithis || json?.data || []).map(t => t.tithi_name || t.tithi).filter(Boolean);
  return [...new Set(names)];
}

async function fetchChandraTara(dateStr, place, lat, lon, tzone) {
  const res = await fetch("https://astroapi-2.divineapi.com/indian-api/v2/find-chandrabalam-and-tarabalam", {
    method: "POST",
    headers: authHeaders("application/x-www-form-urlencoded"),
    body: buildURLParams(dateStr, place, lat, lon, tzone).toString()
  });
  const json = await res.json();
  const chandra = json?.data?.chandrabalams || {};
  const tara    = json?.data?.tarabalams    || {};
  return {
    chandrabalamCurrent: chandra.current || [],
    tarabalamCurrent:    tara.current    || []
  };
}

// ── main ─────────────────────────────────────────────────────
async function run() {
  const [
    ymArg    = new Date().toISOString().slice(0, 7),
    latArg   = "13.0827",
    lonArg   = "80.2707",
    tzoneArg = "5.5",
    placeArg = "Chennai, India",
    nakshatraArg = "Ashwini",
    rasiArg  = "Mesha"
  ] = process.argv.slice(2);

  const [year, month] = ymArg.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  console.log(`\n🔎 Spelling audit for ${ymArg} — ${placeArg} (userNakshatra=${nakshatraArg}, userRasi=${rasiArg})\n`);

  // running sets of every distinct spelling seen this month, per category
  const seen = {
    nakshatra: new Set(),
    wara: new Set(),
    karana: new Set(),
    yoga: new Set(),
    tithi: new Set(),
    chandrabalam: new Set(),
    tarabalam: new Set()
  };

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = formatDateStr(new Date(year, month - 1, d));

    try {
      const [nakshatras, wara, karanas, yogas, tithis, balam] = await Promise.all([
        fetchNakshatra(dateStr, placeArg, latArg, lonArg, tzoneArg),
        fetchWara(dateStr, placeArg, latArg, lonArg, tzoneArg),
        fetchKarana(dateStr, placeArg, latArg, lonArg, tzoneArg),
        fetchYoga(dateStr, placeArg, latArg, lonArg, tzoneArg),
        fetchTithi(dateStr, placeArg, latArg, lonArg, tzoneArg),
        fetchChandraTara(dateStr, placeArg, latArg, lonArg, tzoneArg)
      ]);

      nakshatras.forEach(n => seen.nakshatra.add(n));
      if (wara) seen.wara.add(wara);
      karanas.forEach(k => seen.karana.add(k));
      yogas.forEach(y => seen.yoga.add(y));
      tithis.forEach(t => seen.tithi.add(t));
      balam.chandrabalamCurrent.forEach(c => seen.chandrabalam.add(c));
      balam.tarabalamCurrent.forEach(t => seen.tarabalam.add(t));

      // final day-by-day result
      console.log(
        `${dateStr}  |  Wara: ${wara ?? "—"}  |  Nakshatra: ${nakshatras.join(", ") || "—"}  |  ` +
        `Tithi: ${tithis.join(", ") || "—"}  |  Yoga: ${yogas.join(", ") || "—"}  |  ` +
        `Karana: ${karanas.join(", ") || "—"}  |  Chandrabalam: ${balam.chandrabalamCurrent.join(", ") || "—"}  |  ` +
        `Tarabalam: ${balam.tarabalamCurrent.join(", ") || "—"}`
      );
    } catch (err) {
      console.error(`${dateStr}  |  ❌ fetch failed:`, err?.message || err);
    }
  }

  // ── cross-check spellings against muhurat-core.js's internal lists ──
  console.log(`\n📋 Distinct values seen this month:`);
  for (const [category, set] of Object.entries(seen)) {
    console.log(`  ${category}: ${[...set].sort().join(", ") || "(none)"}`);
  }

  console.log(`\n⚠️  Spelling mismatches vs muhurat-core.js internal lists:`);
  let mismatchCount = 0;

  for (const n of seen.nakshatra) {
    if (!NAKSHATRA_LIST.includes(n)) {
      console.log(`  Nakshatra "${n}" from API is NOT in NAKSHATRA_LIST — will fail indexOf()/isNakshatraMarkedM() lookups.`);
      mismatchCount++;
    }
  }
  for (const w of seen.wara) {
    if (!WEEKDAY_KEYS.includes(w)) {
      console.log(`  Wara "${w}" from API does NOT match any NAKSHATRA_WEEKDAY_RULES key (${WEEKDAY_KEYS.join(", ")}) — weekday-based filters are inert for this value.`);
      mismatchCount++;
    }
  }
  for (const y of seen.yoga) {
    // Not a mismatch by itself (only DISALLOWED_YOGAS entries matter), but flag
    // near-miss spellings so a real disallowed Yoga isn't silently let through.
    const closeMiss = [...DISALLOWED_YOGAS].some(dy => dy.toLowerCase() === y.toLowerCase() && dy !== y);
    if (closeMiss) {
      console.log(`  Yoga "${y}" from API differs only in case/spelling from a DISALLOWED_YOGAS entry — check for a silent miss.`);
      mismatchCount++;
    }
  }
  for (const k of seen.karana) {
    const closeMiss = [...DISALLOWED_KARANAS].some(dk => dk.toLowerCase() === k.toLowerCase() && dk !== k);
    if (closeMiss) {
      console.log(`  Karana "${k}" from API differs only in case/spelling from a DISALLOWED_KARANAS entry — check for a silent miss.`);
      mismatchCount++;
    }
    if (/^naga/i.test(k) && !DISALLOWED_KARANAS.has(k)) {
      console.log(`  Karana "${k}" from API looks like the Naga karana but isn't in DISALLOWED_KARANAS (which has "Nagava") — likely a typo, verify.`);
      mismatchCount++;
    }
  }

  if (!mismatchCount) console.log(`  None found against this month's data. ✅`);
  console.log("");
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});