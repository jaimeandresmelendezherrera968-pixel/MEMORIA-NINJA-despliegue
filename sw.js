const NOMBRE_CACHE = "memoria-ninja-v1";
const LIMITE_BYTES = 8 * 1024 * 1024;
const ARCHIVOS_BASE = [
  "/",
  "/login.html",
  "/menu.html",
  "/game-online.html",
  "/css/style.css",
  "/css/menu.css",
  "/css/game-online.css",
  "/css/cargando.css",
  "/js/config.js",
  "/js/sesion-guard.js",
  "/js/login.js",
  "/assets/img/logo.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(NOMBRE_CACHE)
      .then(async (cache) => {
        await Promise.all(
          ARCHIVOS_BASE.map((url) => cache.add(url).catch(() => undefined))
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(
          nombres
            .filter((nombre) => nombre !== NOMBRE_CACHE)
            .map((nombre) => caches.delete(nombre))
        )
      )
      .then(() => self.clients.claim())
  );
});

function esEstaticoValido(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.pathname.startsWith("/socket.io/")) return false;
  return /\.(html|css|js|json|png|jpe?g|gif|svg|webp|woff2?|mp3|ogg|m4a|mp4|webm)$/i.test(
    url.pathname
  );
}

function esNavegacion(peticion) {
  return peticion.mode === "navigate";
}

function respondeDesdeCache(peticion, cache) {
  return cache.match(peticion).then((respuesta) => respuesta || cache.match("/login.html"));
}

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (esNavegacion(request)) {
    evento.respondWith(
      fetch(request)
        .then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(NOMBRE_CACHE).then((cache) => cache.put(request, copia));
          }
          return respuesta;
        })
        .catch(() => caches.open(NOMBRE_CACHE).then((cache) => respondeDesdeCache(request, cache)))
    );
    return;
  }

  if (!esEstaticoValido(url)) return;

  evento.respondWith(
    caches.open(NOMBRE_CACHE).then(async (cache) => {
      const guardada = await cache.match(request);
      if (guardada) return guardada;

      const respuesta = await fetch(request);
      const longitud = Number(respuesta.headers.get("content-length") || 0);
      if (respuesta.ok && (!longitud || longitud <= LIMITE_BYTES)) {
        cache.put(request, respuesta.clone());
      }
      return respuesta;
    })
  );
});
