/* Service worker de Control de Guías.
   - La app (index.html) se pide primero a internet, así cada actualización llega sola; sin señal se usa la copia guardada.
   - Las librerías (CDN) se guardan la primera vez y luego cargan al instante.
   - Firebase y Cloudinary nunca pasan por la caché. */
const CACHE_VERSION = 'guias-v1';
const BASE = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];
const CDN = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'www.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // red primero (para recibir actualizaciones), caché si no hay señal
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE_VERSION).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    return;
  }
  if (CDN.includes(url.hostname)) {
    // librerías con versión fija: caché primero
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE_VERSION).then(c => c.put(req, cp)); }
      return res; })));
  }
  // todo lo demás (Firebase, Cloudinary, fotos) va directo a internet
});
