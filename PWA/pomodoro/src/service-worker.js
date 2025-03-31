/// <reference types="@sveltejs/kit" />
import { build, files, version } from "$service-worker";

const CACHE = `cache-${version}`;
const ASSETS = [...build, ...files]; // Assets to cache

// Install service worker and cache assets
self.addEventListener("install", (event) => {
  async function addFilesToCache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  }
  event.waitUntil(addFilesToCache());
  console.log("[SW] Installed");
});

// Activate service worker and clean up old caches
self.addEventListener("activate", (event) => {
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE) await caches.delete(key);
    }
  }
  event.waitUntil(deleteOldCaches());
  console.log("[SW] Activated");
});

// Intercept fetch requests and serve from cache if available
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return; // Ignore non-GET

  async function respond() {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE);

    // Serve build files and static assets from cache first
    if (ASSETS.includes(url.pathname)) {
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;
    }

    // Try network for everything else
    try {
      const response = await fetch(event.request);
      // Optional: Cache dynamic responses if needed (be careful!)
      // if (response.status === 200) {
      //   cache.put(event.request, response.clone());
      // }
      return response;
    } catch (error) {
      // Network failed
      console.error("[SW] Fetch failed:", error);
      // If it's a page navigation, try serving the root page as fallback
      if (event.request.mode === "navigate") {
        const cachedRoot = await cache.match("/");
        if (cachedRoot) return cachedRoot;
      }
      // Otherwise, just fail
      throw error;
    }
  }
  event.respondWith(respond());
});
