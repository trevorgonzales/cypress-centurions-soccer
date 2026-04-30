const DEFAULT_ROSTER_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSj9425PibPbiWiL0mqfM63_ncS0R6dHQgE5GJ0ConpoV2cyCeFET2f2GcfdOJPlEEC_UDGoHwUEOet/pub?gid=0&single=true&output=csv";

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

function parseRosterCsv(csvText) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  const [headerLine, ...rows] = lines;
  if (!headerLine) return [];

  const headers = parseCsvLine(headerLine).map((header) =>
    header.toLowerCase().trim()
  );
  const teamIndex = headers.indexOf("team");
  const nameIndex = headers.indexOf("name");

  if (teamIndex < 0 || nameIndex < 0) return [];

  const groups = new Map();
  rows.forEach((row) => {
    const cells = parseCsvLine(row);
    const team = cells[teamIndex]?.trim();
    const name = cells[nameIndex]?.trim();

    if (!team || !name) return;
    if (!groups.has(team)) groups.set(team, []);
    groups.get(team).push(name);
  });

  return Array.from(groups, ([team, names]) => ({ team, names }));
}

export async function onRequestGet(context) {
  const rosterCsvUrl = context.env.ROSTER_CSV_URL || DEFAULT_ROSTER_CSV_URL;

  try {
    const response = await fetch(rosterCsvUrl, {
      headers: {
        Accept: "text/csv,text/plain,*/*",
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: "Unable to fetch roster.", groups: [] },
        { status: 502 }
      );
    }

    const csvText = await response.text();
    const groups = parseRosterCsv(csvText);

    return Response.json(
      { groups },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  } catch (error) {
    return Response.json(
      { error: "Unable to load roster.", groups: [] },
      { status: 500 }
    );
  }
}
