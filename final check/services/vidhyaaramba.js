


const NAKSHATRA_WEEKDAY_RULES = {
  Raviwara: {
    Magha: "M",
    Vishakha: "M",
    Anuradha: "M",
    Jyeshtha: "M",
    Dhanishta: "M"
  },

  Somawara: {
    Krittika: "M",
    Magha: "M",
    Vishakha: "M",
    "Uttara Ashadha": "M",
    "Poorva Bhadrapada": "M"
  },

  Mangalawara: {
    Ardhra: "M",
    Vishakha: "M",
    Satabhisha: "M",
    "Poorva Bhadrapada": "M"
  },

  Budhawara: {
    Ashwini: "M",
    Hasta: "M",
    Moola: "M",
    Dhanishta: "M",
    Revati: "M"
  },

  Guruwara: {
    Krittika: "M",
    Rohini: "M",
    Mrigashira: "M",
    Ardhra: "M",
    "Uttara Phalguni": "M",
    Satabhisha: "M"
  },

  Shukrawara: {
    Rohini: "M",
    Ashleysha: "M",
    Magha: "M",
    Jyeshtha: "M"
  },

  Shaniwara: {
    Ashleysha: "M",
    "Uttara Phalguni": "M",
    Hasta: "M",
    Chitra: "M",
    "Poorva Bhadrapada": "M",
    Revati: "M"
  }
};

function isNakshatraMarkedM(weekday, nakshatra) {
  return (
    NAKSHATRA_WEEKDAY_RULES[weekday]?.[nakshatra] === "M"
  );
}

async function getNakshatraTimingsForDate(dateStr, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";
  const lang = "en";
  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0];
  const formData = new URLSearchParams({
    api_key: apiKey,
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: date.getFullYear(),
    Place: place,
    lat,
    lon,
    tzone,
    lan: lang
  });

  const res = await fetch("https://astroapi-1.divineapi.com/indian-api/v2/find-nakshatra", {
    method: "POST",
    headers: { Authorization: authToken, "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString()
  });

  const data = await res.json();
  const merged = [];
  let current = null;

  for (const p of data?.data?.nakshatras?.nakshatra_pada || []) {
    const sep = p?.end_time_seprated;
    if (!sep) continue;

    const endDateStr = `${sep.year}-${sep.month}-${sep.day}`;
    const endTime = `${sep.hour.toString().padStart(2, "0")}:${sep.minute.toString().padStart(2, "0")}:${sep.second.toString().padStart(2, "0")}`;
    const fullEnd = `${endDateStr}T${endTime}`;
    const isNextDay = endDateStr !== baseDateStr;
    const truncatedEnd = isNextDay ? `${baseDateStr}T23:59:59` : fullEnd;

    if (!current) {
      current = { nakshatra: p.nak_name, start_time: `${baseDateStr}T00:00:00`, end_time: truncatedEnd };
    } else if (current.nakshatra === p.nak_name) {
      current.end_time = truncatedEnd;
    } else {
      merged.push(current);
      if (isNextDay) {
        merged.push({ nakshatra: p.nak_name, start_time: current.end_time, end_time: `${baseDateStr}T23:59:59` });
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

  // 🧹 Manual cleanup of large objects
  current = null;
  data.data = null;

  return merged.map(i => ({
    date: baseDateStr,
    nakshatra: i.nakshatra,
    start_time: i.start_time,
    end_time: i.end_time
  }));
}

function getFilteredNakshatra(startItem) {
  const nakshatraList = [
    'Ashwini', 'Bharani', 'Krittika', 'Rohini',
    'Mrigashira', 'Ardhra', 'Punarvasu', 'Pushya',
    'Ashleysha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
    'Hasta', 'Chitra', 'Swati', 'Vishakha',
    'Anuradha', 'Jyeshtha', 'Moola', 'Poorva Ashadha',
    'Uttara Ashadha', 'Shravan', 'Dhanishta', 'Satabhisha',
    'Poorva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
  ];

  const secondNakshatraList = [
    "Ashwini", "Rohini",
    "Ardhra", "Punarvasu", "Pushya", "Uttara Phalguni", "Hasta", "Chitra", "Swati",
    "Anuradha", "Shravan", "Dhanishta", "Satabhisha",
    "Uttara Bhadrapada", "Revati"


  ];
  const positionsToRemove = [1, 3, 5, 7, 10, 12, 14, 16, 19, 21, 23, 25];

  const startIndex = nakshatraList.indexOf(startItem);
  if (startIndex === -1) return [];

  // 🔁 Step 1: Rotate the list from `startItem`
  const rotated = nakshatraList.slice(startIndex).concat(nakshatraList.slice(0, startIndex));

  // 🧼 Step 2: Remove based on 1-based positions
  const filtered = rotated.filter((_, idx) => !positionsToRemove.includes(idx + 1));
  const common = filtered.filter(n => secondNakshatraList.includes(n));
  return { filtered, common };
}


async function getTithiDetailsForDate(dateStr, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";
  const lang = "en";
  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0];

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("day", String(date.getDate()).padStart(2, "0"));
  form.append("month", String(date.getMonth() + 1).padStart(2, "0"));
  form.append("year", date.getFullYear().toString());
  form.append("Place", place);
  form.append("lat", lat);
  form.append("lon", lon);
  form.append("tzone", tzone);
  form.append("lan", lang);

  const res = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-tithi", {
    method: "POST",
    headers: { Authorization: authToken },
    body: form
  });

  const data = await res.json();
  const endOfDay = new Date(`${baseDateStr}T23:59:59`);

  const result = [];
  for (const t of data?.data?.tithis || []) {
    const start = new Date(t.start_time.replace(" ", "T"));
    const end = new Date(t.end_time.replace(" ", "T"));
    if (start > endOfDay && end > endOfDay) continue;

    result.push({
      date: baseDateStr,
      tithi: t.tithi,
      start_time: t.start_time.replace(" ", "T"),
      end_time: end > endOfDay ? `${baseDateStr}T23:59:59` : t.end_time.replace(" ", "T")
    });
  }

  // 🧹 free up memory
  data.data = null;

  return result;
}



async function getYogaDetailsForDate(dateStr, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";
  const lang = "en";

  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0];

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("day", String(date.getDate()).padStart(2, "0"));
  form.append("month", String(date.getMonth() + 1).padStart(2, "0"));
  form.append("year", date.getFullYear());
  form.append("Place", place);
  form.append("lat", lat);
  form.append("lon", lon);
  form.append("tzone", tzone);
  form.append("lan", lang);

  const res = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-yoga", {
    method: "POST",
    headers: { Authorization: authToken },
    body: form
  });

  const json = await res.json();
  const yogas = json?.data?.yogas ?? [];
  const result = [];

  const endOfDay = new Date(`${baseDateStr}T23:59:59`);
  for (const y of yogas) {
    const yStart = new Date(y.start_time);
    const yEnd = new Date(y.end_time);
    if (yStart > endOfDay && yEnd > endOfDay) continue;

    result.push({
      date: baseDateStr,
      yoga: y.yoga_name,
      start_time: y.start_time,
      end_time: yEnd > endOfDay ? `${baseDateStr} 23:59:59` : y.end_time
    });
  }

  return result;
}

async function getWaraDetailsForDate(dateStr, lat, lon, tzone, place) {
  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0];
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const lang = "en";

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("day", String(date.getDate()).padStart(2, "0"));
  form.append("month", String(date.getMonth() + 1).padStart(2, "0"));
  form.append("year", date.getFullYear());
  form.append("Place", place);
  form.append("lat", lat);
  form.append("lon", lon);
  form.append("tzone", tzone);
  form.append("lan", lang);

  const res = await fetch("https://astroapi-2.divineapi.com/indian-api/v1/find-sun-and-moon", {
    method: "POST",
    headers: { Authorization: authToken },
    body: form
  });

  const json = await res.json();
  const data = json?.data;
  if (!data) return null;

  return {
    date: baseDateStr,
    weekday: data.weekday,
    sunrise: data.sunrise,
    sunset: data.sunset
  };
}

async function getInauspiciousTimingsForDate(dateStr, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";
  const lang = "en";

  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0];

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("day", String(date.getDate()).padStart(2, "0"));
  form.append("month", String(date.getMonth() + 1).padStart(2, "0"));
  form.append("year", date.getFullYear());
  form.append("Place", place);
  form.append("lat", lat);
  form.append("lon", lon);
  form.append("tzone", tzone);
  form.append("lan", lang);

  const res = await fetch("https://astroapi-3.divineapi.com/indian-api/v1/inauspicious-timings", {
    method: "POST",
    headers: { Authorization: authToken },
    body: form
  });

  const json = await res.json();
  if (!json?.data) return null;

  return {
    date: baseDateStr,
    rahu_kaal: json.data.rahu_kaal,
    yamaganda: json.data.yamaganda,
    dur_muhurtam: json.data.dur_muhurtam
  };
}

async function getKaranaDetailsForDate(dateStr, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";
  const lang = "en";

  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0];

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("day", String(date.getDate()).padStart(2, "0"));
  form.append("month", String(date.getMonth() + 1).padStart(2, "0"));
  form.append("year", date.getFullYear());
  form.append("Place", place);
  form.append("lat", lat);
  form.append("lon", lon);
  form.append("tzone", tzone);
  form.append("lan", lang);

  const res = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-karana", {
    method: "POST",
    headers: { Authorization: authToken },
    body: form
  });

  const json = await res.json();
  const karanas = json?.data?.karnas || [];
  const result = [];

  const endOfDay = new Date(`${baseDateStr}T23:59:59`);
  for (const k of karanas) {
    const kStart = new Date(k.start_time);
    const kEnd = new Date(k.end_time);
    if (kStart > endOfDay && kEnd > endOfDay) continue;

    result.push({
      date: baseDateStr,
      karana: k.karana_name,
      start_time: k.start_time,
      end_time: kEnd > endOfDay ? `${baseDateStr} 23:59:59` : k.end_time
    });
  }

  return result;
}


function getMasterTimeRange(filteredWara) {
  const { date, weekday, sunset } = filteredWara;

  const allowedFullDay = [
    "Somawara", "Mangalawara", "Budhawara",
    "Guruwara", "Shukrawara", "Shaniwara", "Raviwara"
  ];

  const halfDay = [];
  const sunsetStart = []; // Add "Shaniwara" if needed

  let masterStartTime;

  if (allowedFullDay.includes(weekday)) {
    masterStartTime = `${date}T00:00:00`;
  }

  if (halfDay.includes(weekday)) {
    masterStartTime = `${date}T12:00:00`;
  }

  if (sunsetStart.includes(weekday)) {
    const sunset24h = convert12hTo24h(sunset.trim());
    masterStartTime = `${date}T${sunset24h}`;
  }

  if (!masterStartTime) {
    console.warn(`⚠️ Unrecognized weekday '${weekday}', using fallback.`);
    masterStartTime = `${date}T00:00:00`;
  }

  return {
    masterStartTime,
    masterEndTime: `${date}T18:00:00`
  };
}

function getBalamWindow({
  values,
  target,
  upto,
  dateStr,
  key
}) {
  const { current = [], next = [] } = values;

  const dayStart = `${dateStr}T00:00:00`;
  const dayEnd = `${dateStr}T23:59:59`;

  if (!upto) {
    return current.includes(target)
      ? [{
        date: dateStr,
        [key]: target,
        start_time: dayStart,
        end_time: dayEnd
      }]
      : null;
  }

  const [timePart, datePart] = upto.split(", ");
  const [monthStr, dayStr] = datePart.trim().split(" ");

  const months = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11
  };

  const year = new Date(dateStr).getFullYear();

  const uptoDate = new Date(
    year,
    months[monthStr],
    parseInt(dayStr)
  );

  const currentDate = new Date(dateStr);

  if (
    uptoDate > currentDate &&
    current.includes(target)
  ) {
    return [{
      date: dateStr,
      [key]: target,
      start_time: dayStart,
      end_time: dayEnd
    }];
  }

  const [hhmm, ampm] = timePart.trim().split(" ");

  let [hour, minute] = hhmm.split(":").map(Number);

  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  const cutoff =
    `${dateStr}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

  const inCurrent = current.includes(target);
  const inNext = next.includes(target);

  if (inCurrent && inNext) {
    return [{
      date: dateStr,
      [key]: target,
      start_time: dayStart,
      end_time: dayEnd
    }];
  }

  if (inCurrent) {
    return [{
      date: dateStr,
      [key]: target,
      start_time: dayStart,
      end_time: cutoff
    }];
  }

  if (inNext) {
    return [{
      date: dateStr,
      [key]: target,
      start_time: cutoff,
      end_time: dayEnd
    }];
  }

  return null;
}

async function getBalamTimings(
  dateStr,
  userNakshatra,
  userRasi,
  lat,
  lon,
  tzone,
  place
) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";

  const authToken =
    "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";

  const nakshatraMap = {
    Ashleysha: "Ashlesha",
    "Poorva Ashadha": "Purva Ashada",
    "Uttara Ashadha": "Uttara Ashada"
  };

  const normalize = name =>
    nakshatraMap[name] || name;

  const [yyyy, mm, dd] =
    dateStr.split("-");

  const formData =
    new URLSearchParams({
      api_key: apiKey,
      day: dd,
      month: mm,
      year: yyyy,
      Place: place,
      lat,
      lon,
      tzone,
      lan: "en"
    });

  const response = await fetch(
    "https://astroapi-2.divineapi.com/indian-api/v2/find-chandrabalam-and-tarabalam",
    {
      method: "POST",
      headers: {
        Authorization: authToken,
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: formData.toString()
    }
  );

  const json = await response.json();

  const tarabalamData =
    json?.data?.tarabalams;

  const chandrabalamData =
    json?.data?.chandrabalams;

  if (
    !tarabalamData ||
    !chandrabalamData
  ) {
    return {
      chandrabalam: [],
      tarabalam: []
    };
  }

  tarabalamData.current =
    (tarabalamData.current || [])
      .map(normalize);

  tarabalamData.next =
    (tarabalamData.next || [])
      .map(normalize);

  userNakshatra =
    normalize(userNakshatra);

  return {
    chandrabalam:
      getBalamWindow({
        values: chandrabalamData,
        target: userRasi,
        upto: chandrabalamData.upto,
        dateStr,
        key: "rasi"
      }) || [],

    tarabalam:
      getBalamWindow({
        values: tarabalamData,
        target: userNakshatra,
        upto: tarabalamData.upto,
        dateStr,
        key: "nakshatra"
      }) || []
  };
}

function removeBlockedIntervals(masterStartTime, masterEndTime, blockedIntervals) {
  // Flexible date parser
  const parseLocal = (s) => {
    if (s instanceof Date) return s;
    if (typeof s !== "string") return null;

    // ISO or other Date-parsable string
    if (s.includes("T")) {
      const d = new Date(s);
      return isNaN(d) ? null : d;
    }

    // "YYYY-MM-DD HH:mm:ss"
    if (s.includes(" ")) {
      const [datePart, timePart] = s.split(" ");
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute, second] = timePart.split(":").map(Number);
      return new Date(year, month - 1, day, hour, minute, second);
    }

    return null;
  };

  // Parse master range
  const masterStart = parseLocal(masterStartTime);
  const masterEnd = parseLocal(masterEndTime);
  if (!masterStart || !masterEnd) {
    throw new Error("Invalid master start or end time");
  }

  console.log("Master start and end time are", masterStart, masterEnd);

  // Convert blocked intervals to Date objects and filter valid ones
  const intervals = (blockedIntervals || [])
    .map(({ start_time, end_time }) => [parseLocal(start_time), parseLocal(end_time)])
    .filter(([start, end]) => start && end && end > start)
    .sort((a, b) => a[0] - b[0]);

  // Merge overlapping blocked intervals
  const merged = [];
  for (const [start, end] of intervals) {
    if (!merged.length || merged[merged.length - 1][1] < start) {
      merged.push([start, end]);
    } else {
      merged[merged.length - 1][1] = new Date(Math.max(merged[merged.length - 1][1], end));
    }
  }

  // Collect valid intervals (free time)
  const validIntervals = [];
  let currentStart = masterStart;

  for (const [blockedStart, blockedEnd] of merged) {
    if (blockedStart > currentStart) {
      validIntervals.push([currentStart, blockedStart]);
    }
    currentStart = new Date(Math.max(currentStart, blockedEnd));
  }

  if (currentStart < masterEnd) {
    validIntervals.push([currentStart, masterEnd]);
  }

  // Format as "YYYY-MM-DD HH:mm:ss"
  const format = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  return validIntervals.map(([start, end]) => ({
    start_time: format(start),
    end_time: format(end)
  }));
}


async function isNakshatraChandrashtama(dateStr, userNakshatra, lat, lon, tzone, place) {
  const formData = new URLSearchParams({
    api_key: "a3a1ab378702c90ccc523c59a888f28b",
    day: dateStr.split("-")[2],
    month: dateStr.split("-")[1],
    year: dateStr.split("-")[0],
    Place: place,
    lat,
    lon,
    tzone,
    lan: "en"
  });

  const response = await fetch("https://astroapi-3.divineapi.com/indian-api/v1/chandrashtama", {
    method: "POST",
    headers: {
      Authorization: "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  });

  const json = await response.json();
  const data = json?.data;
  if (!json.success || !Array.isArray(data)) return false;

  const target = new Date(dateStr);
  return data.some(({ start_date, end_date, chandrashtama }) =>
    target >= new Date(start_date) && target <= new Date(end_date) &&
    chandrashtama.some(n => n.nakshatra.toLowerCase() === userNakshatra.toLowerCase())
  );
}



async function getAuspiciousTimeWindow(dateStr, userNakshatra, userRasi, lat, lon, tzone, place) {



  const disallowedwaras = [];
  const disallowedTithis = ["Pratipada", "Chaturthi", "Ashtami", "Navami", "Chaturdashi", "Purnima","Amavasya"];
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


export default async function runAuspiciousCheckAcrossDatesVidhyaarambha(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
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



