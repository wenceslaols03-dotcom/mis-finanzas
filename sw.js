// Funciona sin conexión: guarda la app en el dispositivo. El tipo de cambio siempre se pide a internet.
const CACHE = 'misfinanzas-v3';
const SHELL = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png',
  'js/charts.js', 'js/muestra.js', 'js/store.js', 'js/fx.js', 'js/correo.js', 'js/gmail.js', 'js/motion.js', 'js/app.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // solo los archivos de la app; Google, Gmail y el tipo de cambio siempre van directo a internet
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // la app: primero la red (para tener siempre la última versión), si no hay, lo guardado
  e.respondWith(fetch(e.request).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
