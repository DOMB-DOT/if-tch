// ===== Service Worker · IF TCH v1 =====
// Guarda la app en el aparato para que abra sin senal.
// Las llamadas a script.google.com NUNCA se guardan: siempre van a la red.

var CACHE = 'iftch-v1';
var ARCHIVOS = ['./', './index.html', './manifest.json'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(ARCHIVOS);
    }).then(function(){
      return self.skipWaiting();
    }).catch(function(){})
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(nombres){
      return Promise.all(nombres.map(function(n){
        if (n !== CACHE) return caches.delete(n);
      }));
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e){
  var url;
  try { url = new URL(e.request.url); } catch(err){ return; }

  // Todo lo que no sea de este sitio (Apps Script) se deja pasar tal cual.
  if (url.origin !== self.location.origin) return;
  if (e.request.method !== 'GET') return;

  // La pagina: primero la red, y si no hay, la copia guardada.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(function(resp){
        var copia = resp.clone();
        caches.open(CACHE).then(function(c){ c.put('./index.html', copia); });
        return resp;
      }).catch(function(){
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Lo demas: primero la copia guardada, y si no esta, la red.
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

// Permite forzar la actualizacion desde la app.
self.addEventListener('message', function(e){
  if (e.data === 'ACTUALIZAR') self.skipWaiting();
});
