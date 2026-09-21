/**
 * sw.js
 * Offline Caching Service Worker for Aura Command Center
 */

const CACHE_NAME = 'aura-cache-v6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './js/app.js',
  './js/store.js',
  './js/data.js',
  './js/search.js',
  './js/weather.js',
  './js/omnibar.js',
  './js/sync.js',
  './js/tabs/command-center.js',
  './js/tabs/studio-3d.js',
  './js/tabs/library-explorer.js',
  './js/tabs/utilities.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Pass-through for external weather or search APIs
  if (e.request.url.includes('open-meteo.com') || e.request.url.includes('google.com/s2/favicons')) {
    return;
  }

  // Network-first with cache fallback
  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(e.request))
  );
});
