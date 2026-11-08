// ===== Service Worker · IF TCH v15 =====
// Guarda la app en el aparato para que abra sin senal,
// pero SIEMPRE intenta traer la version nueva primero.
// Las llamadas a script.google.com nunca se guardan.

var CACHE = 'iftch-v15';
var ARCHIVOS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ARCHIVOS); }).catch(function(){})
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(nombres){
      return Promise.all(nombres.map(function(n){
        if (n !== CACHE) return caches.delete(n);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function redPrimero(req){
  return fetch(req, { cache: 'no-store' }).then(function(resp){
    var copia = resp.clone();
    caches.open(CACHE).then(function(c){ c.put('./index.html', copia); });
    return resp;
  }).catch(function(){
    return caches.match('./index.html');
  });
}

self.addEventListener('fetch', function(e){
  var url;
  try { url = new URL(e.request.url); } catch(err){ return; }
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  if (e.request.mode === 'navigate' || url.pathname.indexOf('index.html') >= 0) {
    e.respondWith(redPrimero(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(hit){
      if (hit) return hit;
      return fetch(e.request).then(function(resp){
        if (resp && resp.status === 200) {
          var copia = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(e.request, copia); });
        }
        return resp;
      });
    })
  );
});

self.addEventListener('message', function(e){
  if (e.data === 'ACTUALIZAR') self.skipWaiting();
});
