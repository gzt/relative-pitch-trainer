const CACHE = 'rpt-v1';
const LOCAL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  ...['doh','dee','ray','ree','mee','fah','fee','sohl','see','lah','lee','tee','leh','meh']
    .map(n => `./voice/${n}.mp3`)];
const REMOTE = [
  'https://surikov.github.io/webaudiofont/npm/dist/WebAudioFontPlayer.js',
  'https://surikov.github.io/webaudiofontdata/sound/0000_Aspirin_sf2_file.js' // default piano
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.allSettled([
      ...LOCAL.map(u => c.add(u)),
      ...REMOTE.map(u => c.add(new Request(u, {mode: 'no-cors'})))
    ]);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function ranged(req, res) {
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range'));
  const s = +m[1], e = m[2] ? +m[2] : buf.byteLength - 1;
  return new Response(buf.slice(s, e + 1), {status: 206, headers: {
    'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
    'Content-Range': `bytes ${s}-${e}/${buf.byteLength}`}});
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    let res = await c.match(req.url);
    if (!res) {
      try {
        res = await fetch(req);
        if (res.ok || res.type === 'opaque') c.put(req.url, res.clone());
      } catch (err) {
        if (req.mode === 'navigate') return c.match('./index.html');
        throw err;
      }
    }
    if (req.headers.has('range') && res.status === 200) return ranged(req, res);
    return res;
  })());
});
