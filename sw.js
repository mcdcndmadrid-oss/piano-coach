const CACHE_NAME = 'piano-coach-mvp-v11';
const APP_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './midi-import.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './pieces/demo.json',
  './pieces/twinkle.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const isFreshAsset = requestUrl.origin === self.location.origin
    && (requestUrl.pathname.endsWith('/styles.css') || requestUrl.pathname.endsWith('/app.js') || requestUrl.pathname.endsWith('/midi-import.js'));

  // El CSS y el JavaScript usan "network first": cuando hay conexión se
  // descarga siempre la versión más reciente y se actualiza la copia offline.
  if (isFreshAsset) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            event.waitUntil(
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
            );
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // El resto de recursos conserva la estrategia cache first.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (!response || response.status !== 200 || response.type === 'opaque') return response;
      const copy = response.clone();
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
      );
      return response;
    }).catch(() => caches.match('./index.html')))
  );
});
