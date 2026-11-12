// ===== Service Worker · IF TCH v25 =====
// Guarda la app en el aparato para que abra sin senal,
// pero SIEMPRE intenta traer la version nueva primero.
// Las llamadas a script.google.com nunca se guardan.

var CACHE = 'iftch-v25';
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

function sinSenal(){
  return new Response(
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Sin senal</title></head>'
    + '<body style="font-family:Segoe UI,Arial,sans-serif;background:#1F4E79;color:#fff;'
    + 'display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:24px;">'
    + '<div><div style="font-size:44px;">&#128246;</div>'
    + '<h1 style="font-size:17px;margin:12px 0 6px;">Sin senal</h1>'
    + '<p style="font-size:13px;opacity:.85;line-height:1.5;">La app todavia no se ha guardado en este aparato.<br>'
    + 'Conectate una vez y vuelve a abrirla.</p></div></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

function redPrimero(req){
  return fetch(req, { cache: 'no-store' }).then(function(resp){
    if (resp && resp.status === 200) {
      var copia = resp.clone();
      caches.open(CACHE).then(function(c){ c.put('./index.html', copia); }).catch(function(){});
    }
    return resp;
  }).catch(function(){
    return caches.match('./index.html').then(function(hit){
      return hit || caches.match('./').then(function(h2){ return h2 || sinSenal(); });
    }).catch(function(){ return sinSenal(); });
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
          caches.open(CACHE).then(function(c){ c.put(e.request, copia); }).catch(function(){});
        }
        return resp;
      }).catch(function(){
        return new Response('', { status: 504, statusText: 'Sin senal' });
      });
    }).catch(function(){
      return new Response('', { status: 504, statusText: 'Sin senal' });
    })
  );
});

self.addEventListener('message', function(e){
  if (e.data === 'ACTUALIZAR') self.skipWaiting();
});
