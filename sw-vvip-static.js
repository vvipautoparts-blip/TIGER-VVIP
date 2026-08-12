(function (root, factory) {
  "use strict";

  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }

  api.installRuntime(root);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CACHE_PREFIX = "vvip-static-";
  const CACHE_NAME = "vvip-static-v1";
  const MAX_AGE_MS = 60 * 60 * 1000;
  const CACHED_AT_HEADER = "x-vvip-static-cached-at";
  const ALLOWED_PREFIXES = Object.freeze([
    "/styles/",
    "/scripts/",
    "/workers/",
    "/icons/"
  ]);
  const ALLOWED_EXTENSIONS = new Set([
    ".css",
    ".js",
    ".mjs",
    ".svg",
    ".png",
    ".webp",
    ".jpg",
    ".jpeg",
    ".woff2"
  ]);

  function normalizeScopePath(scopePath) {
    const value = typeof scopePath === "string" && scopePath.trim()
      ? scopePath.trim()
      : "/";
    const withLeading = value.startsWith("/") ? value : "/" + value;
    return withLeading.endsWith("/") ? withLeading : withLeading + "/";
  }

  function scopedPathname(pathname, scopePath) {
    const base = normalizeScopePath(scopePath);
    if (base === "/") return pathname;
    if (!pathname.startsWith(base)) return null;
    const relative = pathname.slice(base.length);
    return "/" + relative;
  }

  function extensionOf(pathname) {
    const lower = String(pathname || "").toLowerCase();
    const slash = lower.lastIndexOf("/");
    const dot = lower.lastIndexOf(".");
    if (dot <= slash) return "";
    return lower.slice(dot);
  }

  function shouldHandleRequest(requestLike, origin, scopePath) {
    if (!requestLike || requestLike.method !== "GET") return false;
    if (requestLike.mode === "navigate" || requestLike.destination === "document") return false;

    let url;
    try {
      url = new URL(requestLike.url);
    } catch (_) {
      return false;
    }

    if (!origin || url.origin !== origin) return false;
    if (url.username || url.password) return false;

    const localPath = scopedPathname(url.pathname, scopePath || "/");
    if (!localPath) return false;
    if (!ALLOWED_PREFIXES.some(function (prefix) { return localPath.startsWith(prefix); })) {
      return false;
    }

    return ALLOWED_EXTENSIONS.has(extensionOf(localPath));
  }

  function cacheControlOf(responseLike) {
    if (!responseLike || !responseLike.headers || typeof responseLike.headers.get !== "function") {
      return "";
    }
    return String(responseLike.headers.get("cache-control") || "").toLowerCase();
  }

  function isResponseCacheable(responseLike) {
    if (!responseLike || responseLike.status !== 200) return false;
    if (responseLike.type && responseLike.type !== "basic") return false;

    const cacheControl = cacheControlOf(responseLike);
    if (/\b(?:no-store|no-cache|private)\b/.test(cacheControl)) return false;

    return true;
  }

  function cachedAt(responseLike) {
    if (!responseLike || !responseLike.headers || typeof responseLike.headers.get !== "function") {
      return null;
    }

    const raw = responseLike.headers.get(CACHED_AT_HEADER);
    if (raw === null || raw === undefined || raw === "") return null;

    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  function isFreshCachedResponse(responseLike, now) {
    const timestamp = cachedAt(responseLike);
    if (timestamp === null) return false;

    const current = Number.isFinite(now) ? now : Date.now();
    const age = current - timestamp;
    return age >= 0 && age <= MAX_AGE_MS;
  }

  function stampedCachedCopy(scope, responseLike, now) {
    const ResponseCtor = scope && scope.Response;
    const HeadersCtor = scope && scope.Headers;

    if (typeof ResponseCtor !== "function" || typeof HeadersCtor !== "function") {
      throw new Error("VVIP_STATIC_CACHE_RESPONSE_PRIMITIVES_UNAVAILABLE");
    }

    const clone = responseLike.clone();
    const responseHeaders = new HeadersCtor(clone.headers);
    responseHeaders.set(CACHED_AT_HEADER, String(now));

    return new ResponseCtor(clone.body, {
      status: clone.status,
      statusText: clone.statusText,
      headers: responseHeaders
    });
  }

  async function handleStaticRequest(scope, requestLike, origin, scopePath) {
    const cache = await scope.caches.open(CACHE_NAME);
    const cached = await cache.match(requestLike);

    if (cached && isFreshCachedResponse(cached)) {
      return cached;
    }

    try {
      const network = await scope.fetch(requestLike);
      if (isResponseCacheable(network)) {
        const cachedCopy = stampedCachedCopy(scope, network, Date.now());
        await cache.put(requestLike, cachedCopy);
      }
      return network;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  }

  async function cleanOldCaches(scope) {
    const names = await scope.caches.keys();
    await Promise.all(names.map(function (name) {
      if (!name.startsWith(CACHE_PREFIX) || name === CACHE_NAME) return undefined;
      return scope.caches.delete(name);
    }));
  }

  function runtimeLocation(scope) {
    try {
      const registrationUrl = new URL(scope.registration.scope);
      return {
        origin: registrationUrl.origin,
        scopePath: normalizeScopePath(registrationUrl.pathname)
      };
    } catch (_) {
      const locationUrl = new URL(scope.location.href);
      return {
        origin: locationUrl.origin,
        scopePath: normalizeScopePath(locationUrl.pathname.replace(/[^/]*$/, ""))
      };
    }
  }

  function installRuntime(scope) {
    if (!scope || typeof scope.addEventListener !== "function") return false;
    if (!scope.caches || typeof scope.fetch !== "function") return false;

    const runtime = runtimeLocation(scope);

    scope.addEventListener("activate", function (event) {
      if (!event || typeof event.waitUntil !== "function") return;
      event.waitUntil(cleanOldCaches(scope));
    });

    scope.addEventListener("fetch", function (event) {
      if (!event || !event.request || typeof event.respondWith !== "function") return;
      if (!shouldHandleRequest(event.request, runtime.origin, runtime.scopePath)) return;

      event.respondWith(handleStaticRequest(
        scope,
        event.request,
        runtime.origin,
        runtime.scopePath
      ));
    });

    return true;
  }

  return Object.freeze({
    CACHE_NAME,
    MAX_AGE_MS,
    shouldHandleRequest,
    isResponseCacheable,
    cachedAt,
    isFreshCachedResponse,
    installRuntime
  });
});
