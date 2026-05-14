// PuntoStock Service Worker v1
const CACHE = 'puntostock-v1';

const ASSETS = [
  '/app/',
  '/app/index.html',
  '/css/styles.css',
  '/js/firebase-config.js',
  '/js/app.js',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/ventas.js',
  '/js/stock.js',
  '/js/modules.js',
  '/logo-dark.png',
  '/logo-light.png',
];

// Instalar — cachear assets principales
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ASSETS).catch(() => {
        // Si algún asset falla, continuar igual
        console.log('[SW] Algunos assets no se pudieron cachear');
      });
    })
  );
  self.skipWaiting();
});

// Activar — limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — Network first, cache fallback
self.addEventListener('fetch', e => {
  // Solo manejar requests GET
  if (e.request.method !== 'GET') return;

  // No interceptar Firebase ni APIs externas
  const url = e.request.url;
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.includes('ipapi.co') ||
    url.includes('gstatic.com')
  ) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cachear respuesta exitosa
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, usar cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Fallback para navegación
          if (e.request.destination === 'document') {
            return caches.match('/app/index.html');
          }
        });
      })
  );
});
