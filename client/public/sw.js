
const CACHE_NAME = 'um-chamado-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/ascenoanimation.json',
  '/icon-192.png',
  '/icon-512.png',
  '/cartas-icon.png',
  '/assets/index.css',
  '/assets/index.js'
];

// Cache strategies
const networkFirst = async (request) => {
  try {
    console.log('[Service Worker] Network first fetching:', request.url);
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
    return response;
  } catch (error) {
    console.log('[Service Worker] Falling back to cache for:', request.url);
    const cached = await caches.match(request);
    return cached || new Response('Network error', { 
      status: 408, 
      headers: { 'Content-Type': 'text/html' },
      body: 'Não foi possível carregar este recurso. Verifique sua conexão com a internet.'
    });
  }
};

const cacheFirst = async (request) => {
  console.log('[Service Worker] Cache first fetching:', request.url);
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    console.log('[Service Worker] Serving from cache:', request.url);
    return cached;
  }
  console.log('[Service Worker] Not in cache, fetching from network:', request.url);
  return networkFirst(request);
};

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing new service worker');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching core app assets');
      return cache.addAll(CORE_ASSETS).then(() => {
        console.log('[Service Worker] All core assets added to cache');
      }).catch(error => {
        console.error('[Service Worker] Error caching core assets:', error);
      });
    })
  );
  self.skipWaiting();
  console.log('[Service Worker] Skipped waiting, now active');
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating new service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Skip cross-origin requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip POST requests and non-GET methods
  if (request.method !== 'GET') {
    return;
  }

  const isHTML = request.headers.get('accept')?.includes('text/html');
  const isNavigationRequest = request.mode === 'navigate';

  // Handle navigation requests with network-first strategy
  if (isNavigationRequest || isHTML) {
    console.log('[Service Worker] Navigation request:', request.url);
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle API requests with network-first strategy
  if (request.url.includes('/api/')) {
    console.log('[Service Worker] API request:', request.url);
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle assets with cache-first strategy
  if (
    request.url.match(/(\.js|\.css|\.png|\.jpe?g|\.gif|\.svg|\.ico|\.json)$/i) ||
    request.url.includes('/assets/')
  ) {
    console.log('[Service Worker] Static asset request:', request.url);
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default to network-first for everything else
  console.log('[Service Worker] Other request:', request.url);
  event.respondWith(networkFirst(request));
});

// Communicate with the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Skip waiting message received');
    self.skipWaiting();
  }
});

// Optional: Listen to push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event);
  
  const title = 'Um Chamado à Edificação';
  const options = {
    body: event.data?.text() || 'Novas cartas disponíveis!',
    icon: '/icon-192.png',
    badge: '/favicon.ico'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});
