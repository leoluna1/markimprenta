/**
 * Service Worker — Mark Publicidad Impresa
 * Estrategia: Cache-First para assets estáticos, Network-First para API
 */
const CACHE_NAME = 'mark-publicidad-v1';
const PRECACHE_URLS = [
  '/',
  '/styles.css',
  '/images/logo.png',
];

// Instalación: pre-cachear assets críticos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activación: limpiar caches viejas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Network-First para API, Cache-First para el resto
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // No interceptar llamadas a la API ni al admin
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchFresh = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchFresh;
    })
  );
});
