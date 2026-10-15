// Service Worker for NorwinLabs Site
// HTML: network-first (so updates ship immediately)
// Static same-origin assets: cache-first (they carry ?v= cache busters)

const CACHE_NAME = "norwinlabs-v2";

const PRECACHE_ASSETS = [
  "/",
  "/styles.min.css?v=7f8e0f3e",
  "/script.min.js?v=f01f84af",
  "/media/logo-96.webp",
  "/media/fonts/inter-latin-400-normal.woff2",
  "/media/fonts/inter-latin-600-normal.woff2",
  "/media/fonts/space-grotesk-latin-700-normal.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.log("SW: precache error", err))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate" || url.pathname.endsWith(".html")) {
    event.respondWith(networkFirst(request));
  } else if (/\.(css|js|png|jpg|jpeg|gif|webp|svg|woff2?|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    return cached || new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok && response.status === 200) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
  }
}
