// Polyglotte de poche : fonctionne hors ligne
const CACHE = "polyglotte-v2";
const FONTS = "polyglotte-fonts";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Fichiers de l'appli : version en cache tout de suite, mise à jour en arrière-plan
  if (url.origin === self.location.origin) {
    e.respondWith(caches.open(CACHE).then(async c => {
      const cached = (await c.match(req, { ignoreSearch: true })) ||
                     (req.mode === "navigate" ? await c.match("./") : undefined);
      const network = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => cached);
      return cached || network;
    }));
    return;
  }

  // Polices Google : gardées en cache au fur et à mesure
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone());
        return r;
      } catch (err) {
        return new Response("", { status: 504 });
      }
    }));
  }
});
