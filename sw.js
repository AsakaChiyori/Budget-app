// Service Worker — 讓 App 可離線使用
// 只要版本號有變，activate 時就會清掉舊快取
const CACHE = 'budget-app-v12';

// 靜態資源（不常變動，用 Cache First）
const STATIC = ['./manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled(STATIC.map(f => c.add(f))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // index.html（document 請求）→ Network First
  // 有網路：永遠拿最新版並更新快取
  // 無網路：fallback 到快取（離線仍可使用）
  if (event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res && res.status === 200)
            caches.open(CACHE).then(c => c.put(event.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 其他靜態資源 → Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(res => {
          if (res && res.status === 200)
            caches.open(CACHE).then(c => c.put(event.request, res.clone()));
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
