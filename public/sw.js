// ExperiMind Labs ERP - Progressive Web App Service Worker
const CACHE_NAME = 'experimind-erp-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

// Install: precache essential shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache incomplete:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: cleanup stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-first for API & dynamic mutations, Cache-first for static Google fonts & icons
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bypass non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Bypass API calls, let network handle them
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Font stylesheets / scripts / images: Stale-While-Revalidate or Cache-First
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // General navigation: Network with fallback to cached root
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
