const DEFAULT_FORMS_BASE_URL = "https://assets.chsboyssoccer.com/forms/";
const DEFAULT_FORMS_MANIFEST_URL = `${DEFAULT_FORMS_BASE_URL}forms.json`;
const FORMS_PREFIX = "forms/";

function getFormsBaseUrl(context) {
  const baseUrl = context.env.FORMS_PUBLIC_BASE_URL || DEFAULT_FORMS_BASE_URL;
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

function encodePath(path) {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function getFormName(path) {
  const filename = decodeURIComponent(String(path || "").split("/").pop() || "");
  const withoutExtension = filename.replace(/\.[^.]+$/, "");

  return withoutExtension
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeFormFile(file, baseUrl = DEFAULT_FORMS_BASE_URL) {
  const rawPath = typeof file === "string" ? file : file.path || file.key || file.name;
  if (!rawPath) return null;

  const path = rawPath.startsWith(FORMS_PREFIX)
    ? rawPath.slice(FORMS_PREFIX.length)
    : rawPath;

  if (!path || path.endsWith("/") || path === "forms.json") return null;

  return {
    id: path,
    name: file.title || file.label || getFormName(path),
    url: file.url || `${baseUrl}${encodePath(path)}`,
    mimeType: file.mimeType || file.httpMetadata?.contentType || "",
  };
}

async function listBucketForms(bucket, baseUrl) {
  const forms = [];
  let cursor = undefined;

  do {
    const result = await bucket.list({
      prefix: FORMS_PREFIX,
      cursor,
    });

    (result.objects || []).forEach((object) => {
      const form = normalizeFormFile(object, baseUrl);
      if (form) forms.push(form);
    });

    cursor = result.truncated ? result.cursor : undefined;
  } while (cursor);

  return forms.sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchManifestForms(manifestUrl, baseUrl) {
  const response = await fetch(manifestUrl, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return Response.json(
      { error: "Unable to fetch forms manifest.", forms: [] },
      { status: 502 }
    );
  }

  const data = await response.json();
  const entries = Array.isArray(data) ? data : data.forms || [];
  const forms = entries
    .map((entry) => normalizeFormFile(entry, baseUrl))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  return Response.json(
    { forms, source: "manifest" },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}

function getConfiguredForms(value, baseUrl) {
  if (!value) return null;

  const forms = value
    .split(/\r?\n|,/)
    .map((path) => normalizeFormFile(path.trim(), baseUrl))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  return forms;
}

export async function onRequestGet(context) {
  const baseUrl = getFormsBaseUrl(context);
  const bucket = context.env.FORMS_BUCKET || context.env.ASSETS_BUCKET;
  const configuredForms = getConfiguredForms(context.env.FORMS_FILES, baseUrl);
  const manifestUrl = context.env.FORMS_MANIFEST_URL || DEFAULT_FORMS_MANIFEST_URL;

  try {
    if (bucket?.list) {
      const forms = await listBucketForms(bucket, baseUrl);

      return Response.json(
        { forms, source: "bucket" },
        {
          headers: {
            "Cache-Control": "public, max-age=300",
          },
        }
      );
    }

    if (configuredForms) {
      return Response.json(
        { forms: configuredForms, source: "env" },
        {
          headers: {
            "Cache-Control": "public, max-age=300",
          },
        }
      );
    }

    return fetchManifestForms(manifestUrl, baseUrl);
  } catch (error) {
    return Response.json(
      { error: "Unable to load forms.", forms: [] },
      { status: 500 }
    );
  }
}
