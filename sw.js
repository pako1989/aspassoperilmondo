// Fa funzionare l'app anche senza connessione (dopo la prima apertura).
// Cambia il numero di versione quando modifichi i file, così i telefoni scaricano la versione nuova.
const VERSIONE = "v1";
const FILE = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "posti.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(FILE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((chiavi) =>
      Promise.all(chiavi.filter((k) => k !== VERSIONE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Prima la rete (così vedi sempre i posti aggiornati), poi la copia salvata se sei offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((risposta) => {
        if (risposta.ok && (risposta.type === "basic" || risposta.type === "cors")) {
          const copia = risposta.clone();
          caches.open(VERSIONE).then((c) => c.put(e.request, copia));
        }
        return risposta;
      })
      .catch(() => caches.match(e.request))
  );
});
