/* EH service worker: network-first, 옛 캐시 정리 */
var C = 'eh-net-first';
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    var ks = await caches.keys();
    await Promise.all(ks.filter(function(k){ return k !== C; }).map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
    var cs = await self.clients.matchAll({type:'window'});
    cs.forEach(function(c){ try{ c.navigate(c.url); }catch(err){} });
  })());
});
self.addEventListener('fetch', function(e){
  var r = e.request;
  if(r.method !== 'GET') return;
  var u = new URL(r.url);
  if(u.origin !== location.origin) return;
  if(u.pathname.indexOf('/api') === 0 || u.pathname.indexOf('/socket.io') === 0) return;
  e.respondWith((async function(){
    try{
      var res = await fetch(r, {cache:'no-store'});
      if(res && res.ok){ var c = await caches.open(C); c.put(r, res.clone()); }
      return res;
    }catch(err){
      var m = await caches.match(r, {ignoreSearch:true});
      if(m) return m;
      if(r.mode === 'navigate'){
        var a = await caches.match('/app.html', {ignoreSearch:true});
        if(a) return a;
      }
      throw err;
    }
  })());
});