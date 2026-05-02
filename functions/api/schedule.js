const DEFAULT_ICS_URL =
  "https://calendar.google.com/calendar/ical/cypresshighsoccer%40gmail.com/public/basic.ics";
const SCHEDULE_CACHE_SECONDS = 300;

const SCHOOL_LOGOS = {
  "Anaheim HS": "https://assets.chsboyssoccer.com/anaheim_hs.png",
  "Beckman HS": "https://assets.chsboyssoccer.com/beckman-high.png",
  "Buena Park HS": "https://assets.chsboyssoccer.com/buena-park-hs.png",
  "Cal HS": "https://assets.chsboyssoccer.com/cal-high.png",
  "Corona del Mar HS": "https://assets.chsboyssoccer.com/corona_del_mar_hs.png",
  "Cypress HS": "https://assets.chsboyssoccer.com/Cypress_High_School_40th_Anniversary_Logo.png",
  "Cypress High School": "https://assets.chsboyssoccer.com/Cypress_High_School_40th_Anniversary_Logo.png",
  "Crean Luthern HS": "https://assets.chsboyssoccer.com/crean-luthern-hs.png",
  "Edison HS": "https://assets.chsboyssoccer.com/edison-hs.png",
  "El Toro HS": "https://assets.chsboyssoccer.com/el-toro-hs.png",
  "Laguna Hills HS": "https://assets.chsboyssoccer.com/laguna-hills-hs.png",
  "Newport Harbor HS": "https://assets.chsboyssoccer.com/newport-harbor-hs.png",
  "Santa Ana Valley HS": "https://assets.chsboyssoccer.com/santa-ana-valley-hs.png",
  "St. Margarets HS": "https://assets.chsboyssoccer.com/st-margarets-hs.png",
  "Sunny Hills HS": "https://assets.chsboyssoccer.com/sunny-hills-hs.png",
  "Trabuco Hills HS": "https://assets.chsboyssoccer.com/trabuco-hills-hs.png",
  "Troy HS": "https://assets.chsboyssoccer.com/troy-hs.png",
  "Valencia HS": "https://assets.chsboyssoccer.com/valencia_placentia_hs.png",
  "Valencia HS (Placentia)": "https://assets.chsboyssoccer.com/valencia_placentia_hs.png",
  "Villa Park HS": "https://assets.chsboyssoccer.com/villa-park-hs.png",
  "Warren HS": "https://assets.chsboyssoccer.com/warren-hs.png",
  "Yorba Linda HS": "https://assets.chsboyssoccer.com/yorba-linda-hs.png",
};

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getCell(row, headers, names) {
  for (const name of names) {
    const index = headers.indexOf(normalizeHeader(name));
    if (index >= 0) return row[index]?.trim() || "";
  }

  return "";
}

function toDateParts(value) {
  const text = String(value || "").trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    };
  }

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return null;

  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  return {
    year,
    month: Number(match[1]),
    day: Number(match[2]),
  };
}

function formatDateValue(parts) {
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function getTimeSortValue(timeValue) {
  const text = String(timeValue || "").trim();
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return 24 * 60;

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const period = match[3]?.toUpperCase();

  if (period === "PM" && hour < 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
}

function buildSummary(team, opponent, homeAway) {
  const separator = /^away$/i.test(homeAway) ? "@" : "vs";
  return [team, separator, opponent].filter(Boolean).join(" ");
}

function isActiveEvent(status) {
  return !/^(cancelled|canceled|postponed)$/i.test(String(status || "").trim());
}

function parseScheduleCsv(csvText) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  const [headerLine, ...rows] = lines;
  if (!headerLine) return [];

  const headers = parseCsvLine(headerLine).map(normalizeHeader);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return rows
    .map((rowText) => {
      const row = parseCsvLine(rowText);
      const dateParts = toDateParts(getCell(row, headers, ["date"]));
      const team = getCell(row, headers, ["team"]);
      const opponent = getCell(row, headers, ["opponent"]);
      const status = getCell(row, headers, ["status"]);

      if (!dateParts || !team || !opponent || !isActiveEvent(status)) return null;

      const time = getCell(row, headers, ["time"]) || "Time TBD";
      const homeAway = getCell(row, headers, ["homeAway", "home away"]);
      const location = getCell(row, headers, ["location"]) || "Location TBD";
      const logoKey = getCell(row, headers, ["logoKey", "logo key"]) || opponent;
      const logoUrl = getCell(row, headers, ["logoUrl", "logo url"]);
      const summary =
        getCell(row, headers, ["eventName", "event name", "summary"]) ||
        buildSummary(team, opponent, homeAway);
      const sortDate = new Date(dateParts.year, dateParts.month - 1, dateParts.day);
      sortDate.setMinutes(getTimeSortValue(time));

      return {
        date: formatDateValue(dateParts),
        summary,
        team,
        opponent,
        time,
        location,
        homeAway,
        status: status || "scheduled",
        logo: logoUrl || SCHOOL_LOGOS[logoKey] || SCHOOL_LOGOS[opponent] || "",
        sortValue: sortDate.valueOf(),
      };
    })
    .filter((event) => event && new Date(`${event.date}T00:00:00`) >= now)
    .sort((a, b) => a.sortValue - b.sortValue)
    .map(({ sortValue, ...event }) => event);
}

function unfoldIcs(value) {
  return value.replace(/\r?\n[ \t]/g, "");
}

function parseIcsDate(value) {
  if (!value) return null;

  if (/^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    return new Date(year, month, day);
  }

  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second, utc] = match;
  if (utc) {
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      )
    );
  }

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

function cleanIcsText(value = "") {
  return value
    .replace(/\\n/g, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function getProperty(eventText, propertyName) {
  const line = eventText
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${propertyName}`));

  if (!line) return "";
  const separator = line.indexOf(":");
  return separator >= 0 ? line.slice(separator + 1) : "";
}

function parseEvents(icsText) {
  const unfolded = unfoldIcs(icsText);
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return blocks
    .map((block) => {
      const start = parseIcsDate(getProperty(block, "DTSTART"));
      if (!start) return null;

      const summary = cleanIcsText(getProperty(block, "SUMMARY")) || "Game";
      const location = cleanIcsText(getProperty(block, "LOCATION"));
      const isAllDay = /^\d{8}$/.test(getProperty(block, "DTSTART"));

      return {
        date: start.toISOString().slice(0, 10),
        summary,
        opponent: summary,
        time: isAllDay
          ? "Time TBD"
          : new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: "America/Los_Angeles",
            }).format(start),
        location: location || "Location TBD",
      };
    })
    .filter((event) => event && new Date(`${event.date}T00:00:00`) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function parseVarsityOpponent(summary) {
  const match = summary.match(/\bVarsity\b\s*(?:vs\.?|@|at)\s*(.+)$/i);
  return match ? match[1].trim() : "";
}

function isVarsityEvent(event) {
  const team = String(event.team || "").trim();
  if (team) return /^varsity$/i.test(team);

  return (
    /\bVarsity\b/i.test(event.summary) &&
    !/\b(Jr\.?|Junior|JV)\s*Varsity\b/i.test(event.summary)
  );
}

function getNextVarsityMatch(events) {
  const varsityMatch = events.find((event) => isVarsityEvent(event));
  if (!varsityMatch) return null;

  const opponent =
    varsityMatch.opponent ||
    parseVarsityOpponent(varsityMatch.summary) ||
    varsityMatch.summary;

  return {
    date: varsityMatch.date,
    opponent,
    time: varsityMatch.time,
    location: varsityMatch.location,
    logo: varsityMatch.logo || SCHOOL_LOGOS[opponent] || "",
  };
}

function getScheduleHeaders(cacheStatus) {
  return {
    "Cache-Control": `public, max-age=${SCHEDULE_CACHE_SECONDS}`,
    "Content-Type": "application/json; charset=utf-8",
    "X-Calendar-Cache": cacheStatus,
  };
}

async function fetchCsvSchedule(csvUrl) {
  const response = await fetch(csvUrl, {
    headers: {
      Accept: "text/csv,text/plain,*/*",
    },
    cf: {
      cacheEverything: true,
      cacheTtl: SCHEDULE_CACHE_SECONDS,
    },
  });

  if (!response.ok) {
    return Response.json(
      { error: "Unable to fetch schedule sheet.", events: [] },
      { status: 502 }
    );
  }

  const csvText = await response.text();
  const events = parseScheduleCsv(csvText);
  const nextVarsityMatch = getNextVarsityMatch(events);

  return new Response(
    JSON.stringify({
      events,
      nextVarsityMatch,
      source: "google-sheets",
      updatedAt: new Date().toISOString(),
    }),
    {
      headers: getScheduleHeaders("MISS"),
    }
  );
}

async function fetchIcsSchedule(icsUrl) {
  const response = await fetch(icsUrl, {
    headers: {
      Accept: "text/calendar,text/plain,*/*",
    },
    cf: {
      cacheEverything: true,
      cacheTtl: SCHEDULE_CACHE_SECONDS,
    },
  });

  if (!response.ok) {
    return Response.json(
      { error: "Unable to fetch calendar.", events: [] },
      { status: 502 }
    );
  }

  const icsText = await response.text();
  const events = parseEvents(icsText);
  const nextVarsityMatch = getNextVarsityMatch(events);

  return new Response(
    JSON.stringify({
      events,
      nextVarsityMatch,
      source: "google-calendar",
      updatedAt: new Date().toISOString(),
    }),
    {
      headers: getScheduleHeaders("MISS"),
    }
  );
}

export async function onRequestGet(context) {
  const csvUrl = context.env.SCHEDULE_CSV_URL;
  const icsUrl = context.env.GOOGLE_CALENDAR_ICS_URL || DEFAULT_ICS_URL;
  const sourceUrl = csvUrl || icsUrl;

  try {
    const cache = typeof caches !== "undefined" ? caches.default : null;
    const cacheKey = new Request(
      new URL(`/api/schedule?source=${encodeURIComponent(sourceUrl)}`, context.request.url),
      context.request
    );

    if (cache) {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const headers = new Headers(cachedResponse.headers);
        headers.set("X-Calendar-Cache", "HIT");
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers,
        });
      }
    }

    const response = csvUrl
      ? await fetchCsvSchedule(csvUrl)
      : await fetchIcsSchedule(icsUrl);
    if (response.ok && cache) {
      context.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (error) {
    return Response.json(
      { error: "Unable to load schedule.", events: [] },
      { status: 500 }
    );
  }
}
