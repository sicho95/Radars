// Service Worker V2.7 pour Radar Detector
const CACHE_NAME = 'radar-detector-v2.7';
const BASE = '/Radars/';

// Fichiers à mettre en cache
const OFFLINE_URLS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.webmanifest',
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(OFFLINE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stratégie : Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-HTTP et les API externes
  if (!event.request.url.startsWith('http')) return;

  // Pour les API de radars, toujours essayer le réseau
  if (event.request.url.includes('api') || 
      event.request.url.includes('lufop.net') || 
      event.request.url.includes('blitzer.de')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Pour le reste : Network First avec fallback Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si succès réseau, mettre en cache et retourner
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si erreur réseau, chercher dans le cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving from cache:', event.request.url);
              return cachedResponse;
            }
            // Si pas dans le cache non plus, retourner page offline
            if (event.request.mode === 'navigate') {
              return caches.match(BASE + 'index.html');
            }
          });
      })
  );
});
