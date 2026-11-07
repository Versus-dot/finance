const CACHE = 'finance-v85';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './ui-fixes.js',
  './sync-manager.js',
  './backup-manager.js',
  './hedge.js',
  './search-fix.js',
  './mod-sync.js',
  './mod-security.js',
  './mod-ui.js',
  './v56.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  
  // Кэшируем только свои локальные файлы (не запросы к API Яндекса и т.д.)
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(resp => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => caches.match('./index.html')); // Если сети нет, отдаем главную страницу
    })
  );
});
