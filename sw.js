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
    (async () => {
      const version = await getVersion();
      const CACHE_NAME = CACHE_NAME_PREFIX + version;
      console.log("Installing service worker with cache name:", CACHE_NAME);

      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(urlsToCache);

      // Save the cache name for later use in the activate event
      self.CACHE_NAME = CACHE_NAME;
    })()
  );
  self.skipWaiting(); // Force immediate activation of the new SW
});

// Activate Event: Delete Old Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          // .filter((name) => name !== self.CACHE_NAME) // don't delete this line. otherwise, it will not delete the currently used cache. no thanks to ChatGPT
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim(); // Force immediate control over all clients
});

// Fetch Event: Serve from Cache or Fetch from Network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
