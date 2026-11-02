/* Service worker của Tủ Truyện: lưu khung ứng dụng để mở được khi mất mạng.
   Nội dung truyện được trang tự lưu riêng (xem CACHE trong index.html). */
var SHELL = 'tutruyen-shell-v4';
var ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf('tutruyen-shell-') === 0 && k !== SHELL;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;
  var font = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !font) return; // Google Drive API đi thẳng ra mạng
  if (sameOrigin && url.pathname.indexOf('/__data/') === 0) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (r) {
        if (r && r.ok) { var copy = r.clone(); caches.open(SHELL).then(function (c) { c.put('index.html', copy); }); }
        return r;
      }).catch(function () { return caches.match('index.html'); })
    );
    return;
  }

  e.respondWith(
    caches.open(SHELL).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (r) {
          if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
          return r;
        }).catch(function () { return hit; });
        return hit || net;
      });
    })
  );
});
