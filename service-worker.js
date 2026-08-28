const CACHE_NAME = "jalis-library-auto-cache";

// تفعيل ملف الخدمة مباشرة دون انتظار
self.addEventListener("install", event => {
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key); // مسح أي كاش قديم
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// استراتيجية: (الإنترنت أولاً، ثم الذاكرة المحلية)
self.addEventListener("fetch", event => {
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // إذا كان متصلاً بالإنترنت، جلب أحدث نسخة من GitHub وحفظها في الكاش فوراً
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // إذا لم يكن هناك إنترنت (Offline)، جلب النسخة المخزنة من الكاش
                return caches.match(event.request);
            })
    );
});
