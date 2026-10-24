const CACHE_NAME = 'nur-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// حفظ الملفات الأساسية عند التثبيت
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// حذف الكاش القديم عند التحديث
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// استراتيجية الجلب: الكاش أولاً للصفحات، والشبكة أولاً للـ API
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // إذا كان الطلب لـ API خارجي (مثل مواقيت الصلاة أو القرآن)
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(req).then((res) => {
        // حفظ نسخة من استجابة الـ API في الكاش
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, resClone);
        });
        return res;
      }).catch(() => {
        // إذا فشل الاتصال، استرجع من الكاش
        return caches.match(req);
      })
    );
    return;
  }

  // للصفحات المحلية: الكاش أولاً ثم الشبكة
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      return cachedResponse || fetch(req).then((res) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, res.clone());
          return res;
        });
      });
    })
  );
});
