const DEFAULT_GALLERY_CSV_URL = "";
const GALLERY_CACHE_SECONDS = 300;
const MAX_SOURCE_PAGES = 8;
const MAX_IMAGES_PER_SOURCE = 80;

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

function getCell(cells, headers, names) {
  const index = names
    .map((name) => headers.indexOf(name))
    .find((value) => value >= 0);

  return index >= 0 ? cells[index]?.trim() || "" : "";
}

function isActive(value) {
  const normalized = value.toLowerCase().trim();
  return !normalized || ["yes", "y", "true", "1", "active"].includes(normalized);
}

function createSlug(value, fallback) {
  const slug = String(value || fallback || "")
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "gallery";
}

function parseGalleryCsv(csvText) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  const [headerLine, ...rows] = lines;
  if (!headerLine) return [];

  const headers = parseCsvLine(headerLine).map((header) =>
    header.toLowerCase().trim().replace(/\s+/g, "_")
  );

  return rows
    .map((row, rowIndex) => {
      const cells = parseCsvLine(row);
      const pageUrl = getCell(cells, headers, ["page_url", "source_url", "gallery_url"]);
      const active = getCell(cells, headers, ["active", "show", "visible"]);
      const orderValue = Number(getCell(cells, headers, ["order", "sort", "position"]));
      const title = getCell(cells, headers, ["title", "name"]);
      const explicitId = getCell(cells, headers, ["id", "slug"]);

      return {
        id: explicitId || createSlug(title || pageUrl, `gallery-${rowIndex}`),
        pageUrl,
        title,
        caption: getCell(cells, headers, ["caption", "description"]),
        alt: getCell(cells, headers, ["alt", "alt_text"]),
        category: getCell(cells, headers, ["category", "album"]),
        order: Number.isFinite(orderValue) ? orderValue : rowIndex,
        active: isActive(active),
      };
    })
    .filter((item) => item.active && item.pageUrl)
    .sort((a, b) => a.order - b.order);
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getAttribute(tag, attributeName) {
  const pattern = new RegExp(`${attributeName}=["']([^"']+)["']`, "i");
  const match = tag.match(pattern);
  return match ? decodeHtml(match[1]) : "";
}

function normalizeUrl(value, baseUrl) {
  if (!value || value.startsWith("data:")) return "";

  try {
    const url = new URL(decodeHtml(value), baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.toString();
  } catch (error) {
    return "";
  }
}

function isPublicPageUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch (error) {
    return false;
  }
}

function getPageTitle(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (h1) return decodeHtml(h1.replace(/<[^>]*>/g, "").trim());

  return (
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    ""
  ).trim();
}

function getMediaCollectionHtml(html) {
  const startMatch = html.match(
    /<div[^>]+class=["'][^"']*\bmedia_collection\b[^"']*["'][^>]*>/i
  );

  if (!startMatch?.index) return "";

  const start = startMatch.index;
  const relatedStart = html.indexOf("<section class=\"project-covers", start);
  const backToTopStart = html.indexOf("<section class=\"back-to-top", start);
  const footerStart = html.indexOf("<footer", start);
  const candidates = [relatedStart, backToTopStart, footerStart].filter((index) => index > start);
  const end = candidates.length ? Math.min(...candidates) : html.length;

  return html.slice(start, end);
}

function getLargestSrcsetImage(srcset, baseUrl) {
  return srcset
    .split(",")
    .map((entry) => {
      const [url, width] = entry.trim().split(/\s+/);
      return {
        url: normalizeUrl(url, baseUrl),
        width: Number.parseInt(width, 10) || 0,
      };
    })
    .filter((entry) => entry.url)
    .sort((a, b) => b.width - a.width)[0]?.url || "";
}

function extractMediaCollectionImages(html, pageUrl, source) {
  const mediaHtml = getMediaCollectionHtml(html);
  if (!mediaHtml) return [];

  const title = source.title || getPageTitle(html) || source.category || "Cypress Boys Soccer";
  const imageTags = mediaHtml.match(/<img\b[^>]*>/gi) || [];
  const seen = new Set();

  return imageTags
    .map((tag, index) => {
      const imageUrl =
        getLargestSrcsetImage(getAttribute(tag, "data-srcset"), pageUrl) ||
        getLargestSrcsetImage(getAttribute(tag, "srcset"), pageUrl) ||
        normalizeUrl(getAttribute(tag, "data-src"), pageUrl) ||
        normalizeUrl(getAttribute(tag, "src"), pageUrl);

      if (!imageUrl || seen.has(imageUrl)) return null;
      seen.add(imageUrl);

      return {
        id: `${source.id}-${index}`,
        imageUrl,
        pageUrl,
        title,
        caption: source.caption || source.category || "",
        alt: source.alt || title,
        category: source.category,
        order: source.order + index / 1000,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_IMAGES_PER_SOURCE);
}

async function fetchPagePhotos(source) {
  if (!isPublicPageUrl(source.pageUrl)) return [];

  const response = await fetch(source.pageUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml,*/*",
      "User-Agent": "Cypress High Soccer gallery loader",
    },
    cf: {
      cacheEverything: true,
      cacheTtl: GALLERY_CACHE_SECONDS,
    },
  });

  if (!response.ok) return [];

  const html = await response.text();
  return extractMediaCollectionImages(html, source.pageUrl, source);
}

async function fetchPageGallery(source) {
  const photos = await fetchPagePhotos(source);
  if (!photos.length) return null;

  return {
    id: source.id,
    title: photos[0].title || source.title || "Cypress Boys Soccer",
    caption: source.caption || "",
    category: source.category || "",
    pageUrl: source.pageUrl,
    coverImageUrl: photos[0].imageUrl,
    photoCount: photos.length,
    order: source.order,
    photos,
  };
}

async function expandGallerySources(sources) {
  const pageSources = sources
    .filter((source) => source.pageUrl)
    .slice(0, MAX_SOURCE_PAGES);

  const galleries = await Promise.all(
    pageSources.map((source) => fetchPageGallery(source))
  );

  return galleries.filter(Boolean).sort((a, b) => a.order - b.order);
}

export async function onRequestGet(context) {
  const galleryCsvUrl = context.env.GALLERY_CSV_URL || DEFAULT_GALLERY_CSV_URL;

  if (!galleryCsvUrl) {
    return Response.json(
      { error: "Gallery feed is not configured.", galleries: [], photos: [] },
      {
        status: 503,
        headers: {
          "Cache-Control": `public, max-age=${GALLERY_CACHE_SECONDS}`,
        },
      }
    );
  }

  try {
    const response = await fetch(galleryCsvUrl, {
      headers: {
        Accept: "text/csv,text/plain,*/*",
      },
      cf: {
        cacheEverything: true,
        cacheTtl: GALLERY_CACHE_SECONDS,
      },
    });

    if (!response.ok) {
      return Response.json(
        { error: "Unable to fetch gallery.", galleries: [], photos: [] },
        { status: 502 }
      );
    }

    const csvText = await response.text();
    const galleries = await expandGallerySources(parseGalleryCsv(csvText));
    const photos = galleries.flatMap((gallery) => gallery.photos);

    return Response.json(
      { galleries, photos, updatedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": `public, max-age=${GALLERY_CACHE_SECONDS}`,
        },
      }
    );
  } catch (error) {
    return Response.json(
      { error: "Unable to load gallery.", galleries: [], photos: [] },
      { status: 500 }
    );
  }
}
