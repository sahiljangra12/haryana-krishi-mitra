// Offline support. Pages and app code: network first (always fresh when online), cached copy when offline.
// Fonts, map library, icons and photos: cache first. Live data APIs (satellite, weather, prices): never cached here.
const VERSION = "km-20261126231807";
const TILES = "km-tiles-1", TILE_LIMIT = 900;
let puts = 0;
function trimTiles(c) { if (++puts % 60) return; c.keys().then((ks) => { if (ks.length > TILE_LIMIT) ks.slice(0, ks.length - TILE_LIMIT).forEach((k) => c.delete(k)); }); }
const SHELL = ["./", "index.html", "manifest.webmanifest", "img/logo-240.png", "img/logo-full.png", "fonts/anek-condensed-700-devanagari.woff2", "fonts/anek-condensed-700-latin.woff2", "img/favicon.png", "img/icon-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== TILES).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
const STATIC_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net", "thumb.wikimedia.org", "upload.wikimedia.org"];
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.includes("/data/")) return; // price files: always live
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req, { ignoreSearch: false }).then((r) => r || caches.match("index.html"))));
    return;
  }
  if (STATIC_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })));
    return;
  }
  // Map pictures that never change once made: the sharp photo tiles and the tiles of one dated satellite pass.
  // Kept on the phone so a field opens fast the second time, even on a weak village network.
  const isTile = ((url.hostname === "server.arcgisonline.com" || url.hostname === "ibasemaps-api.arcgis.com") && url.pathname.includes("/tile/")) || (url.hostname === "planetarycomputer.microsoft.com" && url.pathname.includes("/item/tiles/"));
  if (isTile) {
    e.respondWith(caches.open(TILES).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { c.put(req, res.clone()); trimTiles(c); }
      return res;
    }))));
  }
});
