/* Sparglas — Service Worker, bewusst minimal.
   Aufgabe: die App-Dateien vorhalten, damit sich die App auch ohne Netz öffnet
   und den zuletzt gespeicherten Stand zeigt. Anfragen an das Apps Script werden
   NICHT abgefangen — Buchungen sollen nie aus einem Cache beantwortet werden.

   Nach Änderungen an index.html die Zahl in CACHE erhöhen. */

const CACHE = "sparglas-v5";
const DATEIEN = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-32.png",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const anfrage = e.request;
  if (anfrage.method !== "GET") return;

  const url = new URL(anfrage.url);
  if (url.origin !== self.location.origin) return;   // Apps Script & Co. unangetastet

  // Seite selbst: erst Netz (damit Updates ankommen), sonst Cache.
  if (anfrage.mode === "navigate") {
    e.respondWith(
      fetch(anfrage)
        .then((antwort) => {
          const kopie = antwort.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", kopie));
          return antwort;
        })
        .catch(() => caches.match("./index.html").then((t) => t || caches.match("./")))
    );
    return;
  }

  // Icons und Manifest: erst Cache, im Hintergrund auffrischen.
  e.respondWith(
    caches.match(anfrage).then((treffer) => {
      const ausDemNetz = fetch(anfrage)
        .then((antwort) => {
          if (antwort && antwort.ok) {
            const kopie = antwort.clone();
            caches.open(CACHE).then((c) => c.put(anfrage, kopie));
          }
          return antwort;
        })
        .catch(() => treffer);
      return treffer || ausDemNetz;
    })
  );
});
