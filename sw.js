// import { getVersion } from "./version.js";

async function getVersion() {
  try {
    const response = await fetch("/version.json");
    const data = await response.json();
    return data.version;
  } catch (error) {
    console.error("Failed to fetch version:", error);
    return "unknown"; // Fallback if fetching fails
  }
}

const CACHE_NAME_PREFIX = "my-app-cache-";
let CACHE_NAME = CACHE_NAME_PREFIX + "default"; // Temporary value before fetching version

const urlsToCache = [
  "index.html",
  "chart.js",
  "version.js",
  "version.json",
  "resources/stonks.png",
];

// Install Event: Cache Files with Versioned Cache Name
self.addEventListener("install", (event) => {
  event.waitUntil(
    getVersion().then((version) => {
      CACHE_NAME = `${CACHE_NAME_PREFIX}${version}`;
      return caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache));
    })
  );
  self.skipWaiting();
});

// Activate Event: Delete Old Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    getVersion().then((version) => {
      const expectedCacheName = `${CACHE_NAME_PREFIX}${version}`;
      return caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== expectedCacheName) {
              return caches.delete(cache);
            }
          })
        );
      });
    })
  );
  self.clients.claim();
});

// Fetch Event: Serve from Cache or Fetch from Network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).then((fetchResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        })
      );
    })
  );
});
