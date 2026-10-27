/* Service worker : met l’app en cache pour un usage hors ligne.
   VERSION et FICHIERS sont remplis par outils/build.py (VERSION = empreinte des fichiers) :
   à chaque nouvelle version, l’ancien cache est supprimé et la page se recharge. */
const VERSION = "87aad00ce099";
const FICHIERS = ["./", "index.html", "manifest.webmanifest", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];
const CACHE = 'ranges-' + VERSION;
const POLICES = 'ranges-polices';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== POLICES).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    // polices : servies depuis le cache, mises à jour en arrière-plan
    e.respondWith(caches.open(POLICES).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(c =>
    c.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).catch(() =>
      req.mode === 'navigate' ? c.match('./') : Response.error()))));
});
