const CACHE_PREFIX = "vvip-tiger-pr29-cache-";
const CACHE_NAME = CACHE_PREFIX + "v17";
const ASSETS = [
  "/",
  "/index.html",
  "/reset-password.html",
  "/styles.css",
  "/enhanced-components.css",
  "/vvip-identity.css",
  "/styles/vvip-pr29-home-marketplace.css",
  "/styles/vvip-p03-profile.css",
  "/scripts/vvip-pr29-home-marketplace.js",
  "/scripts/vvip-pr30-resilience.js",
  "/scripts/vvip-p03-profile.js",
  "/scripts/vvip-p03-sign-out.js",
  "/scripts/vvip-p03-route-map.js",
  "/reset-password.js",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg"
];
const ASSET_PATHS = new Set(ASSETS);
const BYPASS_TERMS = ["clerk", "supabase", "token", "auth"];

function shouldBypass(url) {
  const target = (url.pathname + url.search).toLowerCase();
  return BYPASS_TERMS.some(function (term) {
    return target.includes(term);
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (shouldBypass(url)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match("/index.html");
      })
    );
    return;
  }

  if (url.search || !ASSET_PATHS.has(url.pathname)) return;

  event.respondWith(
    caches.match(url.pathname).then(function (cached) {
      if (cached) return cached;

      return fetch(event.request).then(function (response) {
        if (!response || !response.ok || response.type !== "basic") {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(url.pathname, copy);
        });
        return response;
      });
    })
  );
});
