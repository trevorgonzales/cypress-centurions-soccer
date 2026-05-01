const DEFAULT_ICS_URL =
  "https://calendar.google.com/calendar/ical/cypresshighsoccer%40gmail.com/public/basic.ics";
const SCHEDULE_CACHE_SECONDS = 300;

const SCHOOL_LOGOS = {
  "Anaheim HS": "https://assets.chsboyssoccer.com/anaheim_hs.png",
  "Beckman HS": "https://assets.chsboyssoccer.com/beckman-high.png",
  "Buena Park HS": "https://assets.chsboyssoccer.com/buena-park-hs.png",
  "Cal HS": "https://assets.chsboyssoccer.com/cal-high.png",
  "Corona del Mar HS": "https://assets.chsboyssoccer.com/corona_del_mar_hs.png",
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
  "Valencia HS (Placentia)": "https://assets.chsboyssoccer.com/valencia_placentia_hs.png",
  "Villa Park HS": "https://assets.chsboyssoccer.com/villa-park-hs.png",
  "Warren HS": "https://assets.chsboyssoccer.com/warren-hs.png",
  "Yorba Linda HS": "https://assets.chsboyssoccer.com/yorba-linda-hs.png",
};

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

function getNextVarsityMatch(events) {
  const varsityMatch = events.find((event) => /\bVarsity\b/i.test(event.summary));
  if (!varsityMatch) return null;

  const opponent = parseVarsityOpponent(varsityMatch.summary) || varsityMatch.summary;

  return {
    date: varsityMatch.date,
    opponent,
    time: varsityMatch.time,
    location: varsityMatch.location,
    logo: SCHOOL_LOGOS[opponent] || "",
  };
}

function getScheduleHeaders(cacheStatus) {
  return {
    "Cache-Control": `public, max-age=${SCHEDULE_CACHE_SECONDS}`,
    "Content-Type": "application/json; charset=utf-8",
    "X-Calendar-Cache": cacheStatus,
  };
}

async function fetchSchedule(icsUrl) {
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

  return new Response(JSON.stringify({ events, nextVarsityMatch }), {
    headers: getScheduleHeaders("MISS"),
  });
}

export async function onRequestGet(context) {
  const icsUrl = context.env.GOOGLE_CALENDAR_ICS_URL || DEFAULT_ICS_URL;

  try {
    const cache = typeof caches !== "undefined" ? caches.default : null;
    const cacheKey = new Request(
      new URL(`/api/schedule?ics=${encodeURIComponent(icsUrl)}`, context.request.url),
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

    const response = await fetchSchedule(icsUrl);
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
