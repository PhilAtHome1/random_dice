// Service Worker: hält die App offline verfügbar.
// Bei Änderungen an den Dateien die Versionsnummer erhöhen.
const CACHE = 'wuerfelbox-v4';
const V = '?v=4';
const FILES = [
  './',
  './index.html',
  './css/style.css' + V,
  './js/poker.js' + V,
  './js/dice3d.js' + V,
  './js/poly3d.js' + V,
  './js/app.js' + V,
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Online: immer beim Server nachfragen (kein veralteter Browser-Cache).
// Offline: gespeicherte Version aus dem Cache.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req.url, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match(req, { ignoreSearch: true })))
  );
});
