const GRAPH_API_VERSION = "v24.0";
const INSTAGRAM_CACHE_SECONDS = 900;
const DEFAULT_POST_LIMIT = 6;
const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
].join(",");

function getPostLimit(context) {
  const limit = Number(context.env.INSTAGRAM_POST_LIMIT || DEFAULT_POST_LIMIT);
  if (!Number.isFinite(limit)) return DEFAULT_POST_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), 12);
}

function normalizePost(post) {
  const imageUrl =
    post.media_type === "VIDEO" || post.media_type === "REELS"
      ? post.thumbnail_url || post.media_url
      : post.media_url;

  return {
    id: post.id,
    caption: post.caption || "",
    mediaType: post.media_type,
    imageUrl,
    permalink: post.permalink,
    timestamp: post.timestamp,
  };
}

function getInstagramHeaders(cacheStatus) {
  return {
    "Cache-Control": `public, max-age=${INSTAGRAM_CACHE_SECONDS}`,
    "Content-Type": "application/json; charset=utf-8",
    "X-Instagram-Cache": cacheStatus,
  };
}

async function fetchInstagramPosts(context) {
  const accountId = context.env.INSTAGRAM_ACCOUNT_ID;
  const accessToken = context.env.INSTAGRAM_ACCESS_TOKEN;
  const limit = getPostLimit(context);

  if (!accountId || !accessToken) {
    return Response.json(
      {
        error: "Instagram feed is not configured.",
        posts: [],
      },
      {
        status: 503,
        headers: getInstagramHeaders("BYPASS"),
      }
    );
  }

  const url = new URL(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${accountId}/media`
  );
  url.searchParams.set("fields", MEDIA_FIELDS);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cf: {
      cacheEverything: true,
      cacheTtl: INSTAGRAM_CACHE_SECONDS,
    },
  });

  if (!response.ok) {
    return Response.json(
      { error: "Unable to fetch Instagram posts.", posts: [] },
      {
        status: 502,
        headers: getInstagramHeaders("BYPASS"),
      }
    );
  }

  const data = await response.json();
  const posts = (data.data || [])
    .map(normalizePost)
    .filter((post) => post.id && post.imageUrl && post.permalink);

  return new Response(
    JSON.stringify({
      posts,
      source: "instagram",
      updatedAt: new Date().toISOString(),
    }),
    {
      headers: getInstagramHeaders("MISS"),
    }
  );
}

export async function onRequestGet(context) {
  const accountId = context.env.INSTAGRAM_ACCOUNT_ID || "unconfigured";
  const limit = getPostLimit(context);

  try {
    const cache = typeof caches !== "undefined" ? caches.default : null;
    const cacheKey = new Request(
      new URL(`/api/instagram?account=${accountId}&limit=${limit}`, context.request.url),
      context.request
    );

    if (cache) {
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        const headers = new Headers(cachedResponse.headers);
        headers.set("X-Instagram-Cache", "HIT");
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers,
        });
      }
    }

    const response = await fetchInstagramPosts(context);
    if (response.ok && cache) {
      context.waitUntil(cache.put(cacheKey, response.clone()));
    }

    return response;
  } catch (error) {
    return Response.json(
      { error: "Unable to load Instagram feed.", posts: [] },
      { status: 500, headers: getInstagramHeaders("BYPASS") }
    );
  }
}
