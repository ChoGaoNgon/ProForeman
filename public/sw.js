const CACHE_NAME = 'bdi-erp-pwa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];

// Service Worker Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell and core assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Service Worker Activate Event - Cleans up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((allCaches) => {
      return Promise.all(
        allCaches.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Service Worker Fetch Event
self.addEventListener('fetch', (event) => {
  // Only handle GET requests and local/same-origin assets (skip APIs or Chrome extensions)
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Firebase requests or calendar external APIs
  if (event.request.url.includes('/api/') || event.request.url.includes('googleapis.com') || event.request.url.includes('firebase')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background to keep the cache updated (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch((err) => console.log('[Service Worker] Background fetch failed (offline)', err));

        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Cache the requested asset
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // If network fails (offline) and not in cache, fallback to main index.html for SPA routes
          if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/index.html');
          }
        });
    })
  );
});
