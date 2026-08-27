// IMPORTANT: bump APP_VERSION on every release, together with version.json.
// Browsers only detect a service worker update via a byte-level diff of
// this file. If APP_VERSION (and therefore this file's content) doesn't
// change, install/activate never re-runs and cached files (stats.js,
// chart.js, ...) stay stale forever, no matter what the server serves.
const APP_VERSION = "0.6.8";
const CACHE_NAME = "my-app-cache-" + APP_VERSION;

const urlsToCache = [
  "index.html",
  "style.css",
  "init.js",
  "js/archive.js",
  "js/chart.js",
  "js/gameLogic.js",
  "js/input.js",
  "js/main.js",
  "js/stats.js",
  "js/storage.js",
  "js/theme.js",
  "chart.js",
  "sweetalert.js",
  "version.js",
  "version.json",
  "resources/stonks.png",
];

// Install Event: Cache Files with Versioned Cache Name
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      console.log("Installing service worker with cache name:", CACHE_NAME);
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(urlsToCache);
    })()
  );
  self.skipWaiting(); // Force immediate activation of the new SW
});

// Activate Event: Delete Old Caches (keep only the current version's cache)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim(); // Force immediate control over all clients
    })()
  );
});

// Fetch Event: Serve from the current version's cache, or fetch from network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      return cached || fetch(event.request);
    })()
  );
});
