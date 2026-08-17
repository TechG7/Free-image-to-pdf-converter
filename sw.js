self.addEventListener('install', (e) => {
 e.waitUntil(caches.open('pdf-tool').then((cache) => cache.addAll(['./index.html', './style.css', './script.js', './icon.png'])));
});
self.addEventListener('fetch', (e) => e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request))));

