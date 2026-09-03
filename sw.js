const CACHE_VERSION = 'dewiza-pizza-production-v7-complete';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const MEDIA_CACHE = `${CACHE_VERSION}-media`;

const CORE_ASSETS = [
  './',
  './index.html',
  './menu.html',
  './offline.html',
  './404.html',
  './css/style.css',
  './css/navigation.css',
  './js/icons.js',
  './js/navigation.js',
  './js/main.js',
  './manifest.json',
  './favicon.png',
  './assets/data/site.json',
  './assets/data/menu.json',
  './assets/fonts/poppins.woff2',
  './assets/logo/logo.webp',
  './assets/hero/hero-bg.webp',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => Promise.allSettled(CORE_ASSETS.map(asset => cache.add(asset))))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => ![STATIC_CACHE, DATA_CACHE, MEDIA_CACHE].includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'CACHE_URLS' && Array.isArray(data.urls)) {
    const task = caches.open(MEDIA_CACHE).then(async cache => {
      const urls = [...new Set(data.urls)].slice(0, 100);
      await Promise.allSettled(urls.map(async value => {
        const url = new URL(value, self.location.href);
        if (url.origin !== self.location.origin) return;
        const request = new Request(url.href, { credentials: 'same-origin' });
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
      }));
      await trimCache(MEDIA_CACHE, 100);
    });
    if (typeof event.waitUntil === 'function') event.waitUntil(task);
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, STATIC_CACHE, './offline.html'));
    return;
  }

  if (url.pathname.endsWith('/assets/data/menu.json')) {
    event.respondWith(networkFirstData(request, '[]'));
    return;
  }

  if (url.pathname.endsWith('/assets/data/site.json')) {
    event.respondWith(networkFirstData(request, '{}'));
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      await trimCache(cacheName, cacheName === MEDIA_CACHE ? 100 : 60);
    }
    return response;
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
      await trimCache(cacheName, 60);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = fallbackUrl ? await caches.match(fallbackUrl) : null;
    return fallback || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const excess = keys.length - maxEntries;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map(key => cache.delete(key)));
}

async function networkFirstData(request, fallbackBody) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(fallbackBody, {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Dewiza-Offline-Fallback': '1' }
    });
  }
}
