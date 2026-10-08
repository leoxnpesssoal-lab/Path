// Guarda o app no aparelho para abrir sem internet.
// Com internet, sempre busca a versão mais nova da página, do nome e das configurações.
const CACHE = 'rumo-v2';
const FILES = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function networkFirst(req, key) {
  return fetch(req, {cache: 'no-cache'}).then(r => {
    if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key || req, copy)); }
    return r;
  }).catch(() => caches.match(key || req).then(hit => hit || caches.match('./index.html')));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, './index.html')); return; }
  if (url.origin === location.origin) {
    // Ícones quase nunca mudam: usa o guardado. O resto (nome do app etc.): busca o mais novo.
    if (url.pathname.includes('/icons/')) {
      e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    } else {
      e.respondWith(networkFirst(req));
    }
    return;
  }
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    })));
  }
});
