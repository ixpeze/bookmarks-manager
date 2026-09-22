/**
 * sw.js
 * Deck — Offline Caching Service Worker
 */

const CACHE_NAME = 'deck-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './deck.webmanifest',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './js/deck.js',
  './js/core/store.js',
  './js/core/registry.js',
  './js/core/sync.js',
  './js/core/events.js',
  './js/data/bookmarks.js',
  './js/services/search.js',
  './js/services/weather.js',
  './js/services/omnibar.js',
  './js/modules/command-center.js',
  './js/modules/studio-3d.js',
  './js/modules/library-explorer.js',
  './js/modules/utilities.js'
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
  // Pass-through for external weather or favicon APIs
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
