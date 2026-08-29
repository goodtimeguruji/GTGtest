


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

  const res = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-nakshatra", {
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
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira",
    "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha",
    "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati",
    "Vishaka", "Anuradha", "Jyeshtha", "Moola", "Purva Ashadha",
    "Uttara Ashada", "Shravana", "Dhanistha", "Shatabhisaa",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
  ];

  const secondNakshatraList = [
    "Ashwini", "Rohini", "Mrigashira",
    "Punarvasu", "Pushya", "Uttara Phalguni", "Hasta",
    "Anuradha", "Uttara Ashada", "Shravana", "Dhanistha", "Shatabhisaa",
    "Uttara Bhadrapada", "Revati"
  ];
  const positionsToRemove = [1,3,5,7,10,12,14,16,19,21,23,25];

  const startIndex = nakshatraList.indexOf(startItem);
  if (startIndex === -1) return [];

  // 🔁 Step 1: Rotate the list from `startItem`
  const rotated = nakshatraList.slice(startIndex).concat(nakshatraList.slice(0, startIndex));

  // 🧼 Step 2: Remove based on 1-based positions
  const filtered = rotated.filter((_, idx) => !positionsToRemove.includes(idx + 1));
  const common = filtered.filter(n => secondNakshatraList.includes(n));
  return common;
}


async function getTithiDetailsForDate(dateStr, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";
  const lang = "en";

  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear().toString();

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("day", day);
  form.append("month", month);
  form.append("year", year);
  form.append("Place", place);
  form.append("lat", lat);
  form.append("lon", lon);
  form.append("tzone", tzone);
  form.append("lan", lang);

  const response = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-tithi", {
    method: "POST",
    headers: { Authorization: authToken },
    body: form
  });

  const json = await response.json();
  const tithis = json?.data?.tithis || [];

  const result = [];
  const endOfDay = new Date(`${baseDateStr}T23:59:59`);

  for (const tithi of tithis) {
    const tithiStart = new Date(tithi.start_time.replace(" ", "T"));
    const tithiEnd = new Date(tithi.end_time.replace(" ", "T"));
    if (tithiStart > endOfDay && tithiEnd > endOfDay) continue;

    const adjustedEndTime = tithiEnd > endOfDay
      ? `${baseDateStr}T23:59:59`
      : tithi.end_time.replace(" ", "T");

    result.push({
      date: baseDateStr,
      tithi: tithi.tithi,
      start_time: tithi.start_time.replace(" ", "T"),
      end_time: adjustedEndTime
    });
  }

  return result;
}



async function getYogaDetailsForDate(dateStr, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";

  const lang = "en";

  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear().toString();

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("day", day);
  form.append("month", month);
  form.append("year", year);
  form.append("Place", place);
  form.append("lat", lat);
  form.append("lon", lon);
  form.append("tzone", tzone);
  form.append("lan", lang);

  const response = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-yoga", {
    method: "POST",
    headers: { Authorization: authToken },
    body: form
  });

  const json = await response.json();
  const yogas = json?.data?.yogas || [];

  const result = [];
  const endOfDay = new Date(`${baseDateStr}T23:59:59`);
  const startOfDay = new Date(`${baseDateStr}T00:00:00`);

  for (const yoga of yogas) {
    const yogaStart = new Date(yoga.start_time);
    const yogaEnd = new Date(yoga.end_time);

    // Skip yoga if it starts and ends after today
    if (yogaStart > endOfDay && yogaEnd > endOfDay) continue;

    const adjustedEndTime = yogaEnd > endOfDay
      ? `${baseDateStr} 23:59:59`
      : yoga.end_time;

    result.push({
      date: baseDateStr,
      yoga: yoga.yoga_name,
      start_time: yoga.start_time,
      end_time: adjustedEndTime
    });
  }

  return result;
}

async function getWaraDetailsForDate(dateStr, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";

  const lang = "en";

  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0];

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear().toString();

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("day", day);
  form.append("month", month);
  form.append("year", year);
  form.append("Place", place);
  form.append("lat", lat);
  form.append("lon", lon);
  form.append("tzone", tzone);
  form.append("lan", lang);

  const response = await fetch("https://astroapi-2.divineapi.com/indian-api/v1/find-sun-and-moon", {
    method: "POST",
    headers: { Authorization: authToken },
    body: form
  });

  const json = await response.json();

  if (!json?.data) {
    console.error("⚠️ No data returned from Wara API.");
    return null;
  }

  const { sunrise, sunset, weekday } = json.data;

  return {
    date: baseDateStr,
    weekday,
    sunrise,
    sunset
  };
}

async function getInauspiciousTimingsForDate(dateStr, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";

  const lang = "en";

  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0];

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear().toString();

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("day", day);
  form.append("month", month);
  form.append("year", year);
  form.append("Place", place);
  form.append("lat", lat);
  form.append("lon", lon);
  form.append("tzone", tzone);
  form.append("lan", lang);

  const response = await fetch("https://astroapi-3.divineapi.com/indian-api/v1/inauspicious-timings", {
    method: "POST",
    headers: { Authorization: authToken },
    body: form
  });

  const json = await response.json();

  if (!json?.data) {
    console.error("⚠️ No data returned from API.");
    return null;
  }

  const { rahu_kaal, yamaganda } = json.data;

  return {
    date: baseDateStr,
    rahu_kaal,
    yamaganda
  };
}


async function getKaranaDetailsForDate(dateStr, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc";

  const lang = "en";

  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear().toString();

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("day", day);
  form.append("month", month);
  form.append("year", year);
  form.append("Place", place);
  form.append("lat", lat);
  form.append("lon", lon);
  form.append("tzone", tzone);
  form.append("lan", lang);

  const response = await fetch("https://astroapi-1.divineapi.com/indian-api/v1/find-karana", {
    method: "POST",
    headers: { Authorization: authToken },
    body: form
  });

  const json = await response.json();
  const karanas = json?.data?.karnas || [];

  const result = [];
  const endOfDay = new Date(`${baseDateStr}T23:59:59`);
  const startOfDay = new Date(`${baseDateStr}T00:00:00`);

  for (const karana of karanas) {
    const karanaStart = new Date(karana.start_time);
    const karanaEnd = new Date(karana.end_time);

    // Skip karanas that start and end after today
    if (karanaStart > endOfDay && karanaEnd > endOfDay) continue;

    const adjustedEndTime = karanaEnd > endOfDay
      ? `${baseDateStr} 23:59:59`
      : karana.end_time;

    result.push({
      date: baseDateStr,
      karana: karana.karana_name,
      start_time: karana.start_time,
      end_time: adjustedEndTime
    });
  }

  return result;
}

function getMasterTimeRange(filteredWara) {
  const { date, weekday, sunset } = filteredWara;

  let masterStartTime = "";
  let masterEndTime = `${date}T23:59:59`;

  const allowedFullDay = ["Somawara", "Mangalawara", "Budhawara", "Guruwara", "Shukrawara", "Shaniwara", "Raviwara"];
  // const halfDay = ["Mangalawara"];
  // //const sunsetStart = ["Shaniwara", "Raviwara"];
  // const sunsetStart = ["Raviwara"];

  if (allowedFullDay.includes(weekday)) {
    masterStartTime = `${date}T00:00:00`;
  } else if (halfDay.includes(weekday)) {
    masterStartTime = `${date}T12:00:00`;
  } else if (sunsetStart.includes(weekday)) {
    // Convert "07:12:23 PM" → "19:12:23"
    const sunset24h = convert12hTo24h(sunset.trim());
    masterStartTime = `${date}T${sunset24h}`;
  } else {
    console.warn("⚠️ Unrecognized weekday:", weekday);
    masterStartTime = `${date}T00:00:00`;
  }

  return { masterStartTime, masterEndTime };
}

async function getTarabalamTimings(dateStr, nakshatra, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc"; // Replace with actual token

  const lang = "en";

  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const formData = new URLSearchParams();
  formData.append("api_key", apiKey);
  formData.append("day", day);
  formData.append("month", month);
  formData.append("year", year);
  formData.append("Place", place);
  formData.append("lat", lat);
  formData.append("lon", lon);
  formData.append("tzone", tzone);
  formData.append("lan", lang);

  const response = await fetch("https://astroapi-2.divineapi.com/indian-api/v1/find-chandrabalam-and-tarabalam", {
    method: "POST",
    headers: {
      "Authorization": authToken,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  });

  const result = await response.json();

  if (!result || !result.data || !result.data.tarabalams) {
    throw new Error("Invalid API response structure: Missing 'data.tarabalams'");
  }

  function resolveTarabalamWindow(result, nakshatra, dateStr) {
    const tarabalam = result?.data?.tarabalams;
    const { current = [], next = [], upto = "" } = tarabalam;
    const dayStart = `${dateStr}T00:00:00`;
    const dayEnd = `${dateStr}T23:59:59`;

    const months = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };

    if (!upto) {
      return current.includes(nakshatra)
        ? [{ date: dateStr, nakshatra, start_time: dayStart, end_time: dayEnd }]
        : null;
    }

    const [, datePart] = upto.split(", ");
    const [monthStr, dayStr] = datePart.trim().split(" ");
    const uptoDate = new Date(new Date(dateStr).getFullYear(), months[monthStr], parseInt(dayStr));
    const userDate = new Date(dateStr);

    if (uptoDate > userDate) {
      return current.includes(nakshatra)
        ? [{ date: dateStr, nakshatra, start_time: dayStart, end_time: dayEnd }]
        : null;
    }

    // Same-day logic
    const [timePart] = upto.split(", ");
    const [hhmm, ampm] = timePart.trim().split(" ");
    let [hour, minute] = hhmm.split(":").map(Number);
    if (ampm === "PM" && hour !== 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    const uptoTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
    const uptoDateTime = `${dateStr}T${uptoTime}`;

    const inCurrent = current.includes(nakshatra);
    const inNext = next.includes(nakshatra);

    if (inCurrent && inNext) {
      return [{
        date: dateStr,
        nakshatra,
        start_time: dayStart,
        end_time: dayEnd
      }];
    } else if (inCurrent) {
      return [{
        date: dateStr,
        nakshatra,
        start_time: dayStart,
        end_time: uptoDateTime
      }];
    } else if (inNext) {
      return [{
        date: dateStr,
        nakshatra,
        start_time: uptoDateTime,
        end_time: dayEnd
      }];
    }

    return null;
  }

  return resolveTarabalamWindow(result, nakshatra, baseDateStr);
}

async function getChandrabalamTimings(dateStr, rasi, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc"; // Replace with valid token

  const lang = "en";

  const date = new Date(dateStr);
  const baseDateStr = date.toISOString().split("T")[0];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const formData = new URLSearchParams();
  formData.append("api_key", apiKey);
  formData.append("day", day);
  formData.append("month", month);
  formData.append("year", year);
  formData.append("Place", place);
  formData.append("lat", lat);
  formData.append("lon", lon);
  formData.append("tzone", tzone);
  formData.append("lan", lang);

  const response = await fetch("https://astroapi-2.divineapi.com/indian-api/v1/find-chandrabalam-and-tarabalam", {
    method: "POST",
    headers: {
      "Authorization": authToken,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  });

  const result = await response.json();

  if (!result || !result.data || !result.data.chandrabalams) {
    throw new Error("Invalid API response structure: Missing 'chandrabalams'");
  }

  const { current = [], next = [], upto = "" } = result.data.chandrabalams;
  const dayStart = `${dateStr}T00:00:00`;
  const dayEnd = `${dateStr}T23:59:59`;

  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };

  if (!upto) {
    return current.includes(rasi)
      ? [{ date: dateStr, rasi, start_time: dayStart, end_time: dayEnd }]
      : null;
  }

  const [, datePart] = upto.split(", ");
  const [monthStr, dayStr] = datePart.trim().split(" ");
  const uptoDate = new Date(new Date(dateStr).getFullYear(), months[monthStr], parseInt(dayStr));
  const userDate = new Date(dateStr);

  if (uptoDate > userDate) {
    return current.includes(rasi)
      ? [{ date: dateStr, rasi, start_time: dayStart, end_time: dayEnd }]
      : null;
  }

  const [timePart] = upto.split(", ");
  const [hhmm, ampm] = timePart.trim().split(" ");
  let [hour, minute] = hhmm.split(":").map(Number);
  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;
  const uptoTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  const uptoDateTime = `${dateStr}T${uptoTime}`;

  const inCurrent = current.includes(rasi);
  const inNext = next.includes(rasi);

  if (inCurrent && inNext) {
    return [{
      date: dateStr,
      rasi,
      start_time: dayStart,
      end_time: dayEnd
    }];
  } else if (inCurrent) {
    return [{
      date: dateStr,
      rasi,
      start_time: dayStart,
      end_time: uptoDateTime
    }];
  } else if (inNext) {
    return [{
      date: dateStr,
      rasi,
      start_time: uptoDateTime,
      end_time: dayEnd
    }];
  }

  return null;
}

function convert12hTo24h(time12h) {
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes, seconds] = time.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":");
}

function removeBlockedIntervals(masterStartTime, masterEndTime, blockedIntervals) {
  const parse = (s) => new Date(
    s);

  const masterStart = parse(masterStartTime);
  const masterEnd = parse(masterEndTime);

  const intervals = blockedIntervals
    .map(({ start_time, end_time }) => [parse(start_time), parse(end_time)])
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);

  const merged = [];
  for (const [start, end] of intervals) {
    if (!merged.length || merged[merged.length - 1][1] < start) {
      merged.push([start, end]);
    } else {
      merged[merged.length - 1][1] = new Date(Math.max(merged[merged.length - 1][1], end));
    }
  }

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

  // 🔁 Format to "YYYY-MM-DD HH:mm:ss"
  const format = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  return validIntervals.map(([start, end]) => ({
    start_time: format(start),
    end_time: format(end)
  }));
}

async function isNakshatraChandrashtama(dateStr, userNakshatra, lat, lon, tzone, place) {
  const apiKey = "a3a1ab378702c90ccc523c59a888f28b";
  const authToken = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2RpdmluZWFwaS5jb20vcmVnZW5lcmF0ZS1hcGkta2V5cyIsImlhdCI6MTc0ODA5NTgzOSwibmJmIjoxNzQ4MDk1ODM5LCJqdGkiOiI3OFNZRjI2aThSYk9JT1hoIiwic3ViIjoiMzY0NiIsInBydiI6ImU2ZTY0YmIwYjYxMjZkNzNjNmI5N2FmYzNiNDY0ZDk4NWY0NmM5ZDcifQ.2rq14SoOpQocVpJmISJeB2amXpudBPHGHdhR123zPrc"; // Replace with valid token

  const lang = "en";

  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  const formData = new URLSearchParams();
  formData.append("api_key", apiKey);
  formData.append("day", day);
  formData.append("month", month);
  formData.append("year", year);
  formData.append("Place", place);
  formData.append("lat", lat);
  formData.append("lon", lon);
  formData.append("tzone", tzone);
  formData.append("lan", lang);

  const response = await fetch("https://astroapi-3.divineapi.com/indian-api/v1/chandrashtama", {
    method: "POST",
    headers: {
      "Authorization": authToken,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  });

  const result = await response.json();

  if (!result.success || !Array.isArray(result.data)) {
    throw new Error("Invalid or empty response from API");
  }

  const targetDate = new Date(dateStr);

  for (const entry of result.data) {
    const start = new Date(entry.start_date);
    const end = new Date(entry.end_date);

    if (targetDate >= start && targetDate <= end) {
      const isChandrashtama = entry.chandrashtama.some(item =>
        item.nakshatra.toLowerCase() === userNakshatra.toLowerCase()
      );
      return isChandrashtama;
    }
  }

  return false;
}



async function getAuspiciousTimeWindow(dateStr, userNakshatra, userRasi, lat, lon, tzone, place) {



  const disallowedwaras = [];
  const disallowedTithis = ["Pratipada", "Chaturthi", "Shasthi", "Ashtami", "Navami", "Dwadashi", "Chaturdashi", "Purnima"];
  const disallowedYogas = ["Vyaghata", "Vishkumbha", "Parigha", "Shoola", "Ganda", "Vyatipaata", "Vajra", "Sula", "Vaidhriti"];
  const disallowedKaranas = ["Vishti", "Bhadra", "Chatushpada", "Nagava", "Kimstughna", "Shakuni"];

  var finalNakshatra = "";
  var finalTithi = "";
  var finalWara = "";
  var finalYoga = "";
  var finalKarana = "";
  var finalreturn = [];

  const [nakshatraList, tithiList, yogalist, karanalist, waralist, chandrabalamlist, tarabalamlist] = await Promise.all([
    getNakshatraTimingsForDate(dateStr, lat, lon, tzone, place),
    getTithiDetailsForDate(dateStr, lat, lon, tzone, place),
    getYogaDetailsForDate(dateStr, lat, lon, tzone, place),
    getKaranaDetailsForDate(dateStr, lat, lon, tzone, place),
    getWaraDetailsForDate(dateStr, lat, lon, tzone, place),
    getChandrabalamTimings(dateStr, userRasi, lat, lon, tzone, place),
    getTarabalamTimings(dateStr, userNakshatra, lat, lon, tzone, place),
  ]);

  console.log("Fetching nakshatra timings for:", dateStr);
  console.log("Returned Nakshatras:", nakshatraList);

  const allowedNakshatras = getFilteredNakshatra(userNakshatra);
  console.log("Allowed Nakshatras:", allowedNakshatras);


  const filteredNakshatras = nakshatraList.filter(n =>
    allowedNakshatras.includes(n.nakshatra)
  );
  console.log("Filtered Nakshatras:", filteredNakshatras);

  const filteredTithis = tithiList.filter(t =>
    !disallowedTithis.includes(t.tithi)
  );

  console.log(filteredTithis);

  const filteredYogas = yogalist.filter(y =>
    !disallowedYogas.includes(y.yoga)
  );

  console.log("Filtered Yogas:", filteredYogas);

  const filteredKaranas = karanalist.filter(k => !disallowedKaranas.includes(k.karana));
  console.log("Filtered Karanas:", filteredKaranas);

  const filteredWaras = !disallowedwaras.includes(waralist.weekday) ? [waralist] : [];
  console.log("Filtered Waras:", filteredWaras);

  console.log("Filtered Chandrabalam:", chandrabalamlist);
  console.log("Filtered Tarabalam:", tarabalamlist);



  isNakshatraChandrashtama(dateStr, userNakshatra, lat, lon, tzone, place)
    .then(result => {
      if (result) {
        console.log("⚠️ Chandrashtama: Avoid this day.");
        return null; // Early exit if Chandrashtama is found
      } else {
        console.log("✅ Safe: Nakshatra is not under Chandrashtama.");
      }
    });

  if (filteredNakshatras.length > 0)
    finalNakshatra = filteredNakshatras.map(n => n.nakshatra).join(", ");
  if (filteredTithis.length > 0)
    finalTithi = filteredTithis.map(t => t.tithi).join(", ");
  if (filteredWaras.length > 0)
    finalWara = filteredWaras[0].weekday;
  if (filteredYogas.length > 0)
    finalYoga = filteredYogas.map(y => y.yoga).join(", ");
  if (filteredKaranas.length > 0)
    finalKarana = filteredKaranas.map(k => k.karana).join(", ");




  if (chandrabalamlist == null || tarabalamlist == null) {
    console.log("⚠️ No valid Chandrabalam or Tarabalam found for the date.");
    return null;
  }
  else {
    if (filteredWaras.length === 0) {
      console.log("⚠️ No valid Wara window found.");
      return null;
    }
    else {
      finalWara = filteredWaras[0].weekday;
      if (filteredNakshatras.length === 0) {
        console.log("⚠️ No valid Nakshatra window found.");
        return null;
      }
      else {



        const { masterStartTime: initialStartTime, masterEndTime: initialEndTime } = getMasterTimeRange(filteredWaras[0]);
        let masterStartTime = initialStartTime;
        let masterEndTime = initialEndTime;
        console.log("✅ Master Time Range:");
        console.log("Start:", masterStartTime);
        console.log("End:", masterEndTime);

        const cbalamStartTime = chandrabalamlist[0].start_time;
        const cbalamEndTime = chandrabalamlist[chandrabalamlist.length - 1].end_time;
        if (new Date(masterStartTime) < new Date(cbalamStartTime)) {
          masterStartTime = cbalamStartTime;
        }
        if (new Date(masterEndTime) > new Date(cbalamEndTime)) {
          masterEndTime = cbalamEndTime;
        }

        console.log("✅ Chandrabalam Time Found:");
        console.log("Start:", masterStartTime);
        console.log("End:", masterEndTime);

        const tbalamStartTime = tarabalamlist[0].start_time;
        const tbalamEndTime = tarabalamlist[tarabalamlist.length - 1].end_time;
        if (new Date(masterStartTime) < new Date(tbalamStartTime)) {
          masterStartTime = tbalamStartTime;
        }
        if (new Date(masterEndTime) > new Date(tbalamEndTime)) {
          masterEndTime = tbalamEndTime;
        }
        console.log("✅ Tarabalam Time Found:");
        console.log("Start:", masterStartTime);
        console.log("End:", masterEndTime);

        const nakStartTime = filteredNakshatras[0].start_time;
        const nakEndTime = filteredNakshatras[filteredNakshatras.length - 1].end_time;

        if (new Date(masterStartTime) < new Date(nakStartTime)) {
          masterStartTime = nakStartTime;
        }
        if (new Date(masterEndTime) > new Date(nakEndTime)) {
          masterEndTime = nakEndTime;
        }

        console.log("✅ Auspicious Nakshatra Time Found:");
        console.log("Start:", masterStartTime);
        console.log("End:", masterEndTime);

        if (filteredTithis.length === 0) {
          console.log("⚠️ No valid Tithi window found.");
          return null;
        }
        else {



          const tithiStartTime = filteredTithis[0].start_time;
          const tithiEndTime = filteredTithis[filteredTithis.length - 1].end_time;

          if (new Date(masterStartTime) < new Date(tithiStartTime)) {
            masterStartTime = tithiStartTime;
          }
          if (new Date(masterEndTime) > new Date(tithiEndTime)) {
            masterEndTime = tithiEndTime;
          }

          console.log("✅ Auspicious Thithi Time Found:");
          console.log("Start:", masterStartTime);
          console.log("End:", masterEndTime);
          if (filteredYogas.length === 0) {
            console.log("⚠️ No valid Yoga window found.");
            return null;
          }
          else {


            const yogaStartTime = filteredYogas[0].start_time;
            const yogaEndTime = filteredYogas[filteredYogas.length - 1].end_time;

            if (new Date(masterStartTime) < new Date(yogaStartTime)) {
              masterStartTime = yogaStartTime;
            }
            if (new Date(masterEndTime) > new Date(yogaEndTime)) {
              masterEndTime = yogaEndTime;
            }

            console.log("✅ Auspicious Yoga Time Found:");
            console.log("Start:", masterStartTime);
            console.log("End:", masterEndTime);

            if (filteredKaranas.length === 0) {
              console.log("⚠️ No valid Karana window found.");
              return null;
            }
            else {

              const karanaStartTime = filteredKaranas[0].start_time;
              const karanaEndTime = filteredKaranas[filteredKaranas.length - 1].end_time;

              if (new Date(masterStartTime) < new Date(karanaStartTime)) {
                masterStartTime = karanaStartTime;
              }
              if (new Date(masterEndTime) > new Date(karanaEndTime)) {
                masterEndTime = karanaEndTime;
              }

              if (new Date(masterStartTime) >= new Date(masterEndTime)) {
                console.log("⚠️ Invalid time range: Start time is not before end time.");
                return null;
              }

              console.log("✅ Auspicious Karana Time Found:");
              console.log("Start:", masterStartTime);
              console.log("End:", masterEndTime);

              console.log("🎉 Auspicious Time Window for", userNakshatra, "on", dateStr, "is:");
              console.log("From:", masterStartTime);
              console.log("To:", masterEndTime);
              const inauspicious = await getInauspiciousTimingsForDate(dateStr, lat, lon, tzone, place);
              if (!inauspicious) {
                // console.log("⚠️ No inauspicious timings found for the date.");
                // return {
                //     start_time: masterStartTime,
                //     end_time: masterEndTime
                // };
              }
              else {

                const blocked = [inauspicious.rahu_kaal, inauspicious.yamaganda];
                const valid = removeBlockedIntervals(masterStartTime, masterEndTime, blocked);
                console.log("✅ Valid Auspicious Time Windows after removing inauspicious intervals:");

                valid.forEach((interval, index) => {
                  console.log(`Interval ${index + 1}:`);
                  console.log("Start:", interval.start_time);
                  console.log("End:", interval.end_time);
                });
                finalreturn = { 'date': dateStr, 'nakshatra': userNakshatra, 'rasi': userRasi, 'tithi': finalTithi, 'wara': finalWara, 'yoga': finalYoga, 'karana': finalKarana, 'timerange': valid };
                return finalreturn;


              }
            }


          }

        }


      }
    }
  }


}

export default async function runAuspiciousCheckAcrossDates(fromDateStr, toDateStr, userNakshatra, userRasi, lat, lon, tzone, place) {
  const results = [];
  const parseDate = (str) => {
    const [yyyy, mm, dd] = str.split("-").map(Number);
    return new Date(yyyy, mm - 1, dd);  // 🛡️ Ensures correct parsing
  };

  const fromDate = parseDate(fromDateStr);
  const toDate = parseDate(toDateStr);

  console.log(`Running auspicious check from ${fromDate} to ${toDate} for Nakshatra: ${userNakshatra}, Rasi: ${userRasi}`);
  while (fromDate <= toDate) {
    const yyyy = fromDate.getFullYear();
    const mm = String(fromDate.getMonth() + 1).padStart(2, "0");
    const dd = String(fromDate.getDate()).padStart(2, "0");

    const currentDateStr = `${yyyy}-${mm}-${dd}`;

    const intervals = await getAuspiciousTimeWindow(currentDateStr, userNakshatra, userRasi, lat, lon, tzone, place);


    results.push({ date: currentDateStr, intervals });

    fromDate.setDate(fromDate.getDate() + 1);
  }

  results.forEach((res) => {
    console.log(`\n📅 Date: ${res.date}`);
    const data = res.intervals;

    if (!data) {
      console.log("❌ No auspicious intervals found.");
      return;
    }

    console.log("🌙 Nakshatra:", data.nakshatra || "—");
    console.log("♈ Rasi:", data.rasi || "—");
    console.log("🪔 Tithi:", data.tithi || "—");
    console.log("📅 Wara:", data.wara || "—");
    console.log("🌀 Yoga:", data.yoga || "—");
    console.log("🔔 Karana:", data.karana || "—");

    if (Array.isArray(data.timerange) && data.timerange.length > 0) {
      data.timerange.forEach((interval, i) => {
        console.log(`Interval ${i + 1}:`);
        console.log("  Start:", interval.start_time);
        console.log("  End  :", interval.end_time);
      });
    } else {
      console.log("⚠️ No valid intervals.");
    }
  });

  return results;

}



