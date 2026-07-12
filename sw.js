/**
 * Service Worker — Mark Publicidad Impresa
 * Estrategia: Network-First para HTML/CSS y Cache-First para assets versionados.
 */
const CACHE_NAME = 'mark-publicidad-v20260703';
const PRECACHE_URLS = [
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

// Fetch: no interceptar API/admin; Network-First para documentos y CSS.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // No interceptar llamadas a la API ni al admin
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/')) return;

  const wantsFresh = e.request.mode === 'navigate' ||
    e.request.destination === 'style' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html');

  if (wantsFresh) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

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
