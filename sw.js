const CACHE = 'spogliatoio-v3';
const PRECACHE = ['./index.html', './'];

const NAV_BAR = `<div id="_pwa_nav" style="position:fixed;bottom:20px;right:16px;z-index:99999;display:none;flex-direction:column;gap:8px"><button onclick="history.back()" aria-label="Indietro" style="width:46px;height:46px;border-radius:50%;background:rgba(17,17,17,.92);border:1px solid #2a2a2a;color:#fff;font-size:22px;cursor:pointer;backdrop-filter:blur(8px);box-shadow:0 2px 12px rgba(0,0,0,.5)">&#x2190;</button><button onclick="history.forward()" aria-label="Avanti" style="width:46px;height:46px;border-radius:50%;background:rgba(17,17,17,.92);border:1px solid #2a2a2a;color:#fff;font-size:22px;cursor:pointer;backdrop-filter:blur(8px);box-shadow:0 2px 12px rgba(0,0,0,.5)">&#x2192;</button></div><script>(function(){var n=document.getElementById('_pwa_nav');if(n&&(matchMedia('(display-mode:standalone)').matches||navigator.standalone===true))n.style.display='flex';})();<\/script>`;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting(); // prendi controllo subito, senza aspettare
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()) // applica a tutte le tab aperte
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  const isHTML = (e.request.headers.get('accept') || '').includes('text/html');

  e.respondWith(
    caches.open(CACHE).then(async cache => {

      if (isHTML) {
        // Per le pagine HTML: rete prima (aggiornamenti immediati), poi cache
        try {
          const res = await fetch(e.request);
          if (res.ok) {
            const html = await res.text();
            // Inietta nav solo se non è già presente
            const modified = html.includes('_pwa_nav')
              ? html
              : html.replace('</body>', NAV_BAR + '\n</body>');
            const newRes = new Response(modified, {
              status: res.status,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
            cache.put(e.request, newRes.clone());
            return newRes;
          }
        } catch (_) {}
        // Fallback: servi dalla cache se la rete non risponde
        return cache.match(e.request);

      } else {
        // Per asset (CSS, JS, img): cache prima, poi rete
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const res = await fetch(e.request);
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        } catch (_) {
          return new Response('', { status: 408 });
        }
      }
    })
  );
});
