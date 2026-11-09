# Plan de desarrollo — Memorice Duel (Memoria Ninja)

> Documento vivo. Órdenes: `[ ]` pendiente · `[~]` en progreso · `[x]` hecho · `[!]` bloqueado.
> Orden real: 1 → 2 → 3 → 4 → 5 (MVP online base) → 5.1 → 5.2 → 6 (despliegue) → 5.3 → 7.

## Reglas de trabajo
- Cada parte o es **100% real** o queda **claramente marcada como simulada**. Nunca mostrar mock como real.
- Una parte se marca `[x]` solo con: código + integración + tests verdes (`npm test`) + docs.

## Protocolo obligatorio ANTES de cada parte
Toda parte sigue estos 5 pasos; no se implementa nada sin cerrar el paso 1.
1. **Revisión previa (auditoría):** releer el estado real del código de esa parte y escribir, en la
   sección "Revisión previa" de abajo, qué EXISTE, qué FALTA y qué NO se tuvo en cuenta.
2. **Plan de aplicación:** listar los archivos exactos a tocar y cómo (con números de línea).
3. **Implementación.**
4. **Verificación:** correr tests + prueba manual del flujo.
5. **Cierre:** marcar `[x]`, anotar fecha y notas en el Registro de avance.

> Al empezar cada parte, revisar esta lista buscando huecos: dependencias, variables de entorno,
> permisos, rutas absolutas, páginas que consumen el endpoint, tests que pueden romperse,
> y datos/config que hagan falta (secretos, dominio, etc.).

---

## Estado base (ya hecho antes de este plan)
- [x] Backend PostgreSQL (7 tablas, 6 vistas, 5 triggers, 8 objetos propios: 5 funciones + 3 procedimientos) + `sql/esquema.sql`.
  > Nota (2026-10-17): el resumen de `npm run db:setup` imprime `funciones_procs: 90` porque cuenta
  > TODO `pg_proc` de `public`: incluye 68 funciones de extensiones (`pgcrypto`, `citext`) y 14
  > built-ins de PostgreSQL 18 (`regexp_*`, `replace`, `split_part`…). Los objetos REALES del
  > proyecto son **8** (5 funciones + 3 procedimientos), tal como aparecen en `sql/esquema.sql`.
- [x] Auth real: registro, login (cookie httpOnly), verificación, recuperación (scrypt/sha256).
- [x] Seed demo (`npm run seed:demo`) + `sql/datos-simulados.sql` + `sql/consultas-demo.sql`.
- [x] pgAdmin reparado. Docs en español.

## Estado actual (2026-10-29)
- Tests backend: **166/166 verdes (25 suites)** con `npm test`.
- Chequeo de sintaxis JS: `npm run check:js` desde `backend-poderes/` (314 archivos).
- P0 corregido: `js/ui/TwoPlayersModal.js` tenía `async async` y rompía `js/app.js`; el menú ya carga sus modales.
- Parte 5 (MVP online 1v1) completa. Además ya existen 2v2, QR/LAN, lista de salas en UI y viewport móvil.
- Parte 5.1 (poderes online): **implementada en código y tests**, pendiente de cierre manual. El servidor 1v1 ya decide chakra, vida, combo, tiempos, aciertos/errores, los 6 poderes y contrarrestos; el cliente aplica efectos al tablero y muestra banner/avisos de poderes. Falta la prueba con 2 clientes reales y la paridad de poderes en 2v2.
- Parte 5.2 (social): **en progreso**. Salas/QR/listas hechas; chat y persistencia online en servidor pendientes.
- Parte 5.3 (2v2/espectadores): **en progreso**. 2v2 hecho y testeado; espectadores pendientes.
- Parte 6 (despliegue/pulido): **en progreso**. Viewport y páginas huérfanas resueltos; faltan despliegue, seguridad Socket.io, móvil real y accesibilidad completa.
- Parte 7 (offline): **en progreso**. Cola/dedup/merge hechos; reintento automático solo activo desde login.

---

## Parte 1 — Correo SMTP profesional (Gmail) · Estado: COMPLETA ✅
**Objetivo:** que los códigos lleguen a correos reales.
**Revisión previa (qué revisar antes de empezar):**
- [x] Confirmado `nodemailer` ^10.1.0 instalado e interfaz `enviar({para, asunto, texto, html})`.
- [x] Revisado quién llama al notificador (VerificacionService:52, RecuperacionService:49 — `notificador.enviar`).
- [x] Revisado `server.js` (:21-23 imports, :79-94 selección con fail-fast) y `authE2e.test.js` (MAILER=consola → texto `es: 123456` intacto).
  > Auditoría 2026-10-19: las líneas originales del plan estaban desfasadas (off-by-one en los
  > servicios; ~15 líneas en `server.js` por los checks de PostgreSQL añadidos arriba). Corregidas.
- [x] Decisiones: se soporta 465 (`secure:true`) y 587; `SMTP_SERVICE=gmail` opcional; `SMTP_FROM` configurable.
- [x] Pre-requisito usuario: 2FA + App Password de Gmail (creada "Memoria Ninja").
**Cómo se aplicará:**
- Nuevo `src/infraestructura/SmtpNotificadorCorreo.js`; selección en `server.js` con *fail-fast*;
  `.env.example` ampliado; test con transporte *stub*; fix del `README.md`.
**Tareas:**
- [x] Crear `SmtpNotificadorCorreo.js` (transporte perezoso, HTML + texto, `SMTP_FROM`, transporte inyectable).
- [x] Añadir `src/utils/plantillaCorreo.js` (plantilla HTML única) y usarla en ambos servicios.
- [x] `server.js`: `MAILER=smtp|ethereal|consola` + error claro si faltan `SMTP_*` (verificado: falla al arrancar con exit 1).
- [x] `.env.example`: `SMTP_SERVICE`, `SMTP_SECURE`, `SMTP_FROM` + notas Gmail.
- [x] `.env` real con Gmail (usuario + app password cargados). No se sube al repo.
- [x] Test unitario `tests/smtpNotificadorCorreo.test.js` (7 casos, sin red) + `npm test` verde (98/98).
- [x] Corregir afirmación falsa del `README.md` y `backend-poderes/README.md`.
- [x] `scripts/probar-correo.js` + `npm run correo:probar` (envío real de prueba).
**Verificación:** `npm run correo:probar` → correo recibido y confirmado por el usuario. ✅
**Riesgos / a confirmar:** Spam / límite ~500 correos/día de Gmail; entregabilidad.
**Pendiente de seguridad:** rotar la contraseña de aplicación (quedó expuesta en el chat).
**Mejora futura:** usar un Gmail propio del juego o un proveedor transaccional (Resend/Brevo).

## Parte 2 — Sesión real + "web normal" · Estado: COMPLETA ✅
**Objetivo:** que la sesión se valide de verdad contra el servidor y el logout sea real.
**Modelo de 3 estados (decidido con el usuario):**
- **200 (sesión válida):** modo normal (acceso completo).
- **401 (online, sin sesión):** **invitado** → se puede jugar; menú limitado (perfil/ranking/historial piden login con un cartel).
- **Fallo de red (servidor caído):** **invitado/offline** → se puede jugar, guardado local (como hoy) y aviso "sin conexión".
- **No se bloquea el juego.** `login.html` se deja igual (no redirige).
**Revisión previa:**
- [x] Inventariadas las páginas HTML (16 que requieren sesión: menu, niveles, pre-partida + 13 de juego).
- [x] Verificado que hoy el usuario se lee de `localStorage["usuarioActivo"]` (LoginController:46; menu.js:16; HttpHistorialRepositorio:30).
- [x] Revisado `AuthController.js` (cookie `secure:false`, `sameSite:lax`) y `GET /api/auth/me` (existía, nadie lo usaba) y `POST /api/auth/logout`.
- [x] Decidido: guard **en el cliente** (no redirige en juego; limita menú). El middleware de servidor es Parte 4.
**Cómo se aplicará:** `js/sesion-guard.js` (script clásico) consulta `/api/auth/me`, refresca el snapshot local y marca estado; el menú reacciona.
**Tareas:**
- [x] Crear `js/sesion-guard.js` (3 estados; nunca redirige en juego).
- [x] Incluir el guard en `menu.html` y en las páginas de juego (refresca usuario).
- [x] Cartel de invitado en el menú ("Inicia sesión para guardar tu progreso y ver el ranking").
- [x] Limitar perfil/ranking/historial en modo invitado/offline.
- [x] Logout real vía `POST /api/auth/logout` (menu.js y GameSessionService).
- [x] Botón **"Jugar como invitado"** en `login.html`: faltaba la PUERTA DE ENTRADA al estado invitado
  (el guard ya sabía marcar `estadoSesion="invitado"` con 401, pero no había forma de elegirlo desde el login).
  Cierra cualquier sesión previa (best-effort), marca `estadoSesion="invitado"` y va al menú.
  Archivos: `login.html` (botón), `js/login.js` (`jugarComoInvitado`), `css/style.css` (`.btn-invitado`).
**Bloqueo detectado (prueba en navegador):** el CSP por defecto de `helmet()` (`script-src-attr 'none'`) bloqueaba los `onclick` inline → login/registro/recuperar/logout no respondían al servir desde el backend.
**Resuelto (Opción A):** se quitaron todos los `onclick`/`onerror` inline del frontend y se conectaron por `addEventListener` (login, registro, recuperar, pre-partida, menu). El simulador de `pre-partida` ya no llama a `actualizarClan` (no existía) y ahora usa el controller; el `<script>` inline de `objetos-postgresql-final.html` se movió a `js/objetos-postgresql-final.js`. Solo queda `Agrupar/facil.html` con inline (legado, no se toca).
**Verificación (2026-10-17, navegador real + PostgreSQL):** el usuario registró una cuenta, recibió y confirmó el **código por correo real (Gmail)**, inició sesión y cerró sesión. Comprobado además por HTTP:
login demo (`kakashi`/`clave123`) → **200** con perfil; `GET /api/auth/me` con cookie → **200**; sin cookie → **401** (estado `invitado`); `POST /api/auth/logout` → **200** y `me` → **401**; `/api/vistas/ranking` → datos reales.
Backend servido en `http://localhost:3000` (Live Server de VS Code **apagado**, que era la causa del "error en el servidor" al registrar). Tests 98/98.
**Pendiente menor:** el usuario aún debe probar los escenarios visuales de invitado (con el nuevo botón) y offline (apagar el servidor y recargar).
**Matices (auditoría 2026-10-19):** `sesion-guard.js:90` tiene un fallback que redirige a `login.html` si
`avisarInvitado()` se invoca en una página sin `#avisoInvitado` (no ocurre en la práctica: solo lo usa
`MenuController`, que sí tiene el cartel); `loading.html` no incluye el guard (es solo pantalla de carga).
**Depende de:** nada. **Habilita:** Parte 3 (ranking/historial reales).

## Parte 3 — Datos reales · Estado: COMPLETADA ✅ (5/5)
**Objetivo:** ranking, historial y perfil con datos del backend; sin mocks ni rutas absolutas.

### Revisión previa (auditoría — paso 1) · 2026-10-17

**Qué EXISTE (verificado en el código):**
- **Endpoints de vistas ya implementados y probados** (nadie los usa desde el frontend):
  `backend-poderes/src/routes/vistaRoutes.js:14-17` → `VistaController` → `VistaService` → `VistaRepositorySQL`.
  Formas de respuesta (`VistaController.js:13-46`):
  - `GET /api/vistas/ranking` → `{ exito, ranking: [{ id_usuario, usuario, mejor_puntaje, total_partidas, ultima_jugada }] }`
  - `GET /api/vistas/historial-detallado` → `{ exito, historial: [{ id, id_usuario, usuario, id_partida, zona, puntaje, modo, ganador, jugada_en }] }`
  - `GET /api/vistas/partidas-recientes` → `{ exito, partidas: [...] }`
  - `GET /api/vistas/usuarios-resumen` → `{ exito, usuarios: [...] }`
- **Historial por usuario ya implementado y usado**: `GET/POST /api/usuarios/:id/historial`
  (consumido por `js/infraestructura/repositorios/HttpHistorialRepositorio.js:37-71`, instancia `historialApi`).
- **Perfil XP ya real**: `GET/POST /api/usuarios/:id/perfil` + `js/services/progresoService.js` (Parte 2).
- **Modales de UI ya cableados** en `js/app.js:35-60` e instanciados por `js/ui/MenuController.js`.
- **Vistas SQL** (`sql/esquema.sql:372-401`): `vw_ranking_mejor_puntaje` (usuario, mejor_puntaje, total_partidas,
  ultima_jugada — **no** trae xp ni nivel) y `vw_historial_detallado` (zona, puntaje, modo, ganador, jugada_en).

**Qué FALTA (el objetivo real de esta parte):**
- `js/ui/RankingModal.js:8-11` es un **stub**: `cargarRanking()` solo abre el modal, NO hace `fetch`.
  El ranking del menú está **hardcodeado** en `menu.html:243-318` (7 filas: Itachi 3250 … Gaara 2200, con NIVEL/XP inventados).
- `js/ui/HistoryModal.js:8-17` tiene **datos falsos hardcodeados** en el constructor
  (`this.partidas.normales` con 4 filas del 12/05/2024); NO consulta el backend.
- `js/menu.js:7,82` usa `#recordsList` / `actualizarHistorial()` con `historialApi`, pero `#recordsList`
  **no existe** en `menu.html` → retorno temprano: **código muerto**.
- **Ping**: `js/menu.js:161,163-167` (`pingSimulado`/`simularPing()` = mock) y `menu.html:589` (texto fijo `45ms`).
- **Multijugador**: salas hardcodeadas en `menu.html:161-208` ("Itachi969", "Sasukexd"…) y
  `js/menu.js:114-117` redirige `#btnFilaItachi` a `game-online.html` (hardcode).
- **URLs absolutas** `http://localhost:3000/api` en **4 archivos**:
  `js/infraestructura/repositorios/HttpHistorialRepositorio.js:21`,
  `js/infraestructura/repositorios/HttpPerfilRepositorio.js:24`,
  `js/nucleo-GAME ONLI/datos/ProveedorDatosServidor.js:3`,
  `js/menu.js:172`.
- `mod.html` (huérfana) tiene ping `45ms` fijo.
- **Merge invitado→cuenta**: no existe nada (ni endpoint de "enlazar" ni lógica en el login).

**Qué NO se tuvo en cuenta (hallazgos):**
1. La vista de ranking **no trae xp ni nivel**, pero la tabla del menú tiene columnas NIVEL y XP. Hay que
   decidir el mapeo (ver decisiones abajo).
2. Hay **dos** mecanismos de historial: el muerto (`menu.js` + `#recordsList`) y el real (`HistoryModal`
   + `#historialBody`). Se usará `HistoryModal` y se eliminará el código muerto.
3. El botón de ranking llama a `estaBloqueado('ver el ranking')` (`MenuController.js:63-66`), así que
   en invitado/offline el modal ni se abre: el ranking real solo aplica a sesión activa (correcto).
4. **No hay tests de frontend** (regla del proyecto) → la verificación de esta parte es HTTP + manual.
5. "Merge invitado→cuenta" es una **funcionalidad nueva y grande** (formato del historial local del
   invitado + endpoint de enlace). El `AGENTS.md` la sitúa entre Partes 3 y 7. Se implementa aparte,
   como sub-parte 3.5, para no mezclarla con lo visual.

### Plan de aplicación (paso 2) — archivos y líneas exactas

1. **URLs relativas** (4 archivos, 1 línea cada uno → `/api`):
   - `js/infraestructura/repositorios/HttpHistorialRepositorio.js:21`
   - `js/infraestructura/repositorios/HttpPerfilRepositorio.js:24`
   - `js/nucleo-GAME ONLI/datos/ProveedorDatosServidor.js:3`
   - `js/menu.js:172` (dentro de `medirPingReal`)
2. **Ranking real**:
   - `menu.html:243-318`: envolver las 7 filas en `<div id="rankingBody">` (el header `:236-241` se mantiene).
   - `js/ui/RankingModal.js`: `cargarRanking()` → `fetch('/api/vistas/ranking')`; render dinámico en `#rankingBody`;
     estado "cargando"/vacío/error. Mapeo de columnas decidido: **# = posición**, **JUGADOR = usuario**,
     **NIVEL → "PARTIDAS" = total_partidas**, **XP → "MEJOR PUNTAJE" = mejor_puntaje** (cabeceras `menu.html:239-240`
     renombradas). Podio (oro/plata/bronce) reutiliza `.badge-rank`.
3. **Historial real**:
   - `js/ui/HistoryModal.js`: quitar `this.partidas` hardcodeado; en `abrir()` leer
     `historialApi.obtener(idUsuario)` de `localStorage['usuarioActivo']`; mapear a
     `{resultado (ganador===usuario ? victoria : derrota), modo, puntaje, fecha, hora}` y reusar `renderTabla`.
     Tabs "online"/"sala" quedan vacíos reales (Parte 5). Invitado/offline → mensaje "inicia sesión".
   - `js/menu.js:7,13-54,82`: eliminar el mecanismo muerto `#recordsList`/`actualizarHistorial`/`renderHistorial`.
4. **Quitar hardcodeos / mocks**:
   - Ping: `menu.html:589` → `Ping: <span id="pingValor">--</span>`; `js/menu.js:161-167,182-187` →
     sin `simularPing`; si el server no responde mostrar `--` (no un número falso). `menu.js:172` ya queda relativo.
   - Multijugador: `menu.html:161-208` → reemplazar las 7 salas falsas por un estado real
     ("No hay salas disponibles — el multijugador online llega en la Parte 5"). Quitar `menu.js:114-117`
     (`#btnFilaItachi`) y `js/menu.js:99-112` (listener de salas falsas).
   - `mod.html`: se deja como huérfana documentada (se trata en la Parte 6); no se toca aquí.
5. **Sub-parte 3.5 — Merge invitado→cuenta** (por separado, requiere endpoint nuevo): marcar como
   pendiente explícita con su propia revisión previa antes de tocar código.

**Verificación:** tests 98/98 verdes + prueba HTTP de `/api/vistas/ranking` y `/api/usuarios/:id/historial`
+ prueba manual en `http://localhost:3000/menu.html` con sesión demo (`kakashi`/`clave123`).

**Tareas:**
- [x] URLs relativas `/api` en los 4 archivos detectados.
      (`HttpHistorialRepositorio.js`, `HttpPerfilRepositorio.js`, `ProveedorDatosServidor.js`, `menu.js:172`.)
- [x] Ranking con `/api/vistas/ranking`. (`RankingModal.js` real + `#rankingBody` + cabeceras PARTIDAS/MEJOR PUNTAJE.)
- [x] Historial desde backend. (`HistoryModal.js` lee `/api/usuarios/:id/historial` vía `historialApi`.)
- [x] Quitar hardcodeos/mocks (ranking hardcodeado, salas "Itachi969" → estado vacío,
      ping "45ms" → real/`--`, `simularPing` eliminado, código muerto `#recordsList` eliminado).
      `mod.html` queda como huérfana para la Parte 6 (documentado).
- [x] **Sub-parte 3.5 — Merge invitado→cuenta** (cerrada 2026-10-19, Opción A: cola local + merge).
      Backend: `POST /api/usuarios/:idUsuario/importar` con mini-guard `soloPropietario` (cookie
      `memoria_ninja_sesion` → 401), `UsuarioService.importarProgresoInvitado` con transacción ACID,
      dedup por `idPartida`, `xp` solo lo ganado por encima de los 500 base, `racha`/`puntajeMax` con
      máximo, `TOPE_IMPORTACION=200`. Frontend: `HttpHistorialRepositorio.guardar()` encola en
      `historialPendiente` (cap 200) si no hay sesión o falla; `SincronizacionInvitadoService.sincronizar()`
      sube cola + `perfil:invitado` al hacer login y limpia solo si el servidor confirma.
      `LoginController.js` lo engancha tras `guardarSesion`.
- [x] **Pendiente (auditoría 2026-10-19):** los 3 mensajes con "localhost:3000" como texto
      (`HttpPerfilRepositorio.js:38`, `HttpUsuarioRepositorio.js:62`, `HttpAuthRepositorio.js:51`)
      limpios el 2026-10-19 → copy genérico "No se pudo conectar con el servidor[...]. Verifica que
      el backend esté corriendo." (solo quedan `localhost:3000` en comentarios de código).
- [x] **Adelanto de Parte 6 (2026-10-19):** `menu.html` → módulo NIVELES con `id="levelBtn"` +
      `cursor:pointer` (el handler `menu.js:34-38` por fin se engancha) y `Gamemodemodal.js` →
      `btnEncontrarPares` apunta a `niveles.html` (ENCONTRAR PARES pasa por el mapa → pre-partida).
      Queda documentado para la Parte 6: `pares.html` quedó **sin ninguna entrada** (huérfana).
**Verificación (2026-10-17):** tests 98/98 ✅; `GET /api/estado` y `GET /api/vistas/ranking` devuelven
datos reales; frontend servido confirma las nuevas marcas (`rankingBody`, `PARTIDAS`, `salas-vacio`,
`/api/estado` relativo, sin `localhost:3000`/`simularPing`/`Itachi969`). Falta prueba visual del usuario
en `http://localhost:3000/menu.html` con sesión demo (`kakashi`/`clave123`).
**Verificación (2026-10-19, cierre):** `npm test` → **104/104** ✅ (98 originales + 6 nuevos de
`tests/importarProgreso.test.js`). Verificación HTTP real del merge (instancia aislada en :3210 contra
la BD de test, 9/9): importar sin cookie → **401**; registro→verificación→login→`auth/me` → id OK;
`POST /importar` → `importados:2`, `perfil.xp:800` (500 base + 300 ganados); re-importar →
`importados:0, omitidos:2` (idempotente, sin duplicar XP); cuenta ajena con cookie propia → **401**;
frontend servido entrega `SincronizacionInvitadoService.js`.

## Parte 4 — Endurecer backend · Estado: COMPLETA ✅
**Objetivo:** proteger endpoints y preparar para producción.
**Revisión previa:**
- [x] Los `onclick`/`onerror` inline ya se eliminaron (Parte 2) → el CSP de `helmet()` ya no rompe la UI.
- [x] Revisados endpoints públicos vs protegidos.
- [x] Implementado middleware de auth (`AutorizacionMiddleware` con `requiereSesion` + `esPropietario`).
- [x] CORS con allowlist (`CORS_ORIGINS`) y cookie `secure` configurable por `COOKIE_SECURE` en producción.
**Tareas:**
- [x] Middleware de autenticación + proteger `/api/usuarios/:id/*` y `/api/poder/activar`.
- [x] CORS restringido con allowlist.
- [x] Cookie `secure` en producción + HTTPS (configurable).
- [x] Proteger `/api/partida/prueba` y rutas sensibles.
- [x] Tests e2e de autorización (`autorizacionE2e.test.js`).
**Verificación:** endpoints protegidos → 401 sin sesión, cuenta ajena → 403, dueño → OK; CORS allowlist; tests **124/124** verdes.
**Cierre:** 2026-10-24. Formalmente completada siguiendo el protocolo del plan.

## Parte 5 — Multijugador online base (MVP 1v1) · Estado: COMPLETA ✅
**Objetivo:** dos jugadores en tiempo real (hoy es simulación local).
> Alcance real: salas, turnos, mazo, reconexión y base 2v2. Poderes, chat, persistencia y espectadores viven en 5.1, 5.2 y 5.3.
**Revisión previa (2026-10-25):**
- [x] Revisado `ProveedorDatosServidor` y su fallback: las partidas online de 2 jugadores NO pasan por
  `/api/partida` ni por XP/perfil (eso sigue siendo exclusivo del modo de 1 jugador). El online usa su propio
  motor de sala en el servidor.
- [x] Decidido **Socket.io 4.8.4** (ya estaba en `package.json`): reconexión y rooms incluidos. Las salas viven
  en memoria (no en PostgreSQL): una partida online es efímera y no se recupera tras reiniciar el backend.
- [x] Reutilizada la UI de `TwoPlayersModal.js` (crear/unirse por código, contraseña, partida rápida). El panel
  verde MULTIJUGADOR y el morado DOS JUGADORES abren el mismo lobby real; se eliminó el modal stub
  `multiplayerModal`.
- [x] CSP de `helmet` resuelta importando el cliente ESM same-origin
  `/socket.io/socket.io.esm.min.js` y ampliando `connect-src` con `ws:`/`wss:`.
- [x] Identidad online decidida: token estable por pestaña en `sessionStorage["memoriaNinjaTokenJugador"]`
  (no `socket.id`), enviado en `handshake.auth.token`; permite reconectar y reincorporarse a la sala.
**Tareas:**
- [x] Servidor de salas + WebSockets: `backend-poderes/src/servicios/online/GestorSalas.js` — crear/unir por
  código, contraseña, listado de salas públicas, matchmaking (`buscar-partida`), inicio automático con 2
  jugadores, `marcar-listo`, abandono y limpieza de salas a los 30 s.
- [x] Sincronización de turnos/estado: solo el jugador del turno puede voltear; acierto suma pareja y conserva
  turno; fallo bloquea 800 ms y cambia turno; `partida-terminada` con ganador por parejas (o empate `null`).
- [x] Reconexión: 15 s de gracia; `reincorporarse-sala` reasocia el socket al token y devuelve el estado
  (mazo, cartas volteadas, parejas, turno). Si expira en partida → abandono del rival.
- [x] Anti-trampa del mazo: el servidor nunca envía `valor/aldea` de cartas no descubiertas (`mazoPublico`);
  `parId` y la comprobación de pareja quedan solo en el servidor.
- [x] Cliente real: `js/multijugador/ClienteMultijugador.js` (import dinámico de Socket.io, ack con timeout,
  eventos window `desconectado`/`reconectado`) y `js/multijugador/GestorSalaCliente.js` (estado de sala,
  nombres, marcadores, turno, bloqueo del tablero, rejoin).
- [x] Tablero online en `js/board-manager.js`: modo online, revelado remoto, cartas ocultas sin filtrar, bloqueo
  por turno y ocultado tras fallo. Se eliminó el `await` ilegal que rompía el script.
- [x] `GestorPartida.js`: rama online vs local (`?codigo=`), rejoin antes de renderizar, modal final online con
  parejas y motivo de abandono, sin `fetch('/api/partida')` ni IDs inexistentes.
- [~] Poderes online: `Poder.activar()` delega en `activarPoderOnline()`; el servidor tiene base de chakra/defensas
  y 3 poderes con lógica. Los efectos completos y los tests siguen en 5.1.
- [x] Corregidas las rutas de aldeas del mazo online (`konoha/hyuga|sarutobi|uchiha|uzumaki`, `akatsuki`) para
  que todas las imágenes existan en `assets/img/cards/aldeas/`.
**Verificación (2026-10-25):**
- `npm test` → **137/137 al cierre** (124 previos + 13 nuevos de `tests/gestorSalas.test.js`); suite actual **166/166**.
- E2E real headless (Edge + CDP + 2 clientes Socket.io contra el servidor): crear sala, unirse, inicio
  automático, 16 cartas, nombres reales en ambos paneles, turno correcto y click que revela la imagen; cero
  excepciones JS.
- Partida local headless: el tablero renderiza 16 cartas (sin errores de módulos).
**Limitaciones conocidas:** salas en memoria; poderes no disponibles online; reconexión limitada a 15 s; dos
pestañas del mismo navegador comparten `sessionStorage` (usar navegadores/perfiles distintos para 2 jugadores).
**Cierre:** 2026-10-25. Formalmente completada siguiendo el protocolo del plan.

## Parte 6 — Pulido y despliegue · Estado: EN PROGRESO
**Revisión previa:**
- [x] Navegación corregida: `menu.js:30` y `menu.js:36` van a `niveles.html`; `#levelBtn` existe y está enganchado.
  > `pre-partida.html:69` es el `<nav class="bottom-nav">` y **NO** apunta a `game.html`; `js/pre-partida.js:69` va a `menu.html`.
- [x] Páginas huérfanas (`loading.html`, `mod.html`, `pares.html`) eliminadas.
- [ ] Decidir hosting/dominio (para HTTPS y `MAILER` real).
**Tareas:**
- [x] Botón NIVELES enganchado (`#levelBtn` en `menu.html` + `cursor:pointer`) y navegación a `niveles.html`.
- [x] Páginas huérfanas (`loading.html`, `mod.html`, `pares.html`) eliminadas.
- [ ] Afinar qué ve el invitado en el menú (UX fina).
- [~] Accesibilidad (WCAG 2.2): `menu.html` tiene skip link/main; faltan páginas de juego y auditoría completa.
- [ ] Desplegar el juego.

## Parte 7 — Modo offline y sincronización · Estado: EN PROGRESO
**Objetivo:** que lo jugado sin conexión no se pierda y se suba al reconectar (patrón "offline-first").
**Revisión previa:**
- [x] Revisar el fallback local de `historialApi.guardar()` y `progresoService` (best-effort).
- [x] Definir una cola local de resultados pendientes (por usuario/dispositivo).
- [x] Ver qué datos hacen falta para reconciliar sin duplicar (id de partida, fecha).
**Tareas:**
- [x] Cola local de partidas/puntos no enviados. (Hecha en la sub-parte 3.5: `historialPendiente`
  en `HttpHistorialRepositorio.js`, cap 200.)
- [~] Reintento/sincronización automática al volver la conexión. `SincronizacionInvitadoService` escucha
  `online`, pero solo se importa desde `LoginController`; falta activarlo en las páginas de juego.
- [x] Evitar duplicados al sincronizar. (Hecho en 3.5: dedup servidor por `idPartida`, transaccional.)
**Verificación:** jugar offline, reconectar y ver los resultados reflejados en el ranking/historial.
**Nota:** marcado como mejora futura por el usuario; va al final. La cola y el merge ya existen
desde la sub-parte 3.5 (2026-10-19); queda el reintento automático.
**Depende de:** Partes 2 y 3.

---

## Registro de avance (actualizar al cerrar cada parte)
| Parte | Estado | Fecha | Notas |
|---|---|---|---|
| 1. Correo SMTP | Completada | 2026-10-12 | SMTP Gmail funcionando + tests 98/98. Reverificado con correo real el 2026-10-17 (app password nueva). Pendiente: cuenta/proveedor propio |
| 2. Sesión real | Completada | 2026-10-17 | Verificado en navegador real: registro + verificación por correo Gmail real + login + logout contra PostgreSQL. Añadido botón "Jugar como invitado". Tests 98/98 |
| 3. Datos reales | Completada (5/5) | 2026-10-19 | Ranking/historial reales, URLs relativas y mocks eliminados. Sub-parte 3.5: merge invitado→cuenta (cola local `historialPendiente` + `POST /importar` transaccional, dedup por idPartida, XP sobre base 500). Tests **104/104**. Verificación HTTP 9/9 (401 sin cookie/ajena, import/idempotencia). Adelantos Parte 6: NIVELES enganchado y ENCONTRAR PARES → mapa (deja `pares.html` huérfana). Falta prueba visual del usuario en `menu.html` |
| 4. Endurecer backend | Completada | 2026-10-24 | Middlewares auth/owner, CORS allowlist, cookies seguras configurables, rutas protegidas. Tests 124/124 + autorizacionE2e. |
| 5. Multijugador online base | Completada | 2026-10-25 | Socket.io real + salas en memoria, matchmaking, turnos, reconexión 15 s y abandono. Lobby verde/morado unificado y stub eliminado. Tests **137/137 al cierre**; suite actual **166/166**. |
| 5.1 Poderes y reglas online | En progreso (código completo, falta E2E manual) | 2026-10-29 | Servidor 1v1 autoritativo para chakra, vida, combo, tiempos, 6 poderes y contrarrestos; cliente aplica Byakugan/Sello/Genjutsu al tablero. 9 tests nuevos de poderes. Banner/avisos/impacto visual implementados; falta prueba con 2 clientes reales. |
| 5.2 Social (salas UI, chat, QR) | En progreso | 2026-10-29 | Lista de salas, QR/LAN y compartir hechos. Faltan chat, filtros/invitaciones y persistencia online en servidor. |
| 5.3 2v2 y espectadores | En progreso | 2026-10-29 | 2v2 real con equipos, turno compartido, abandono y revancha (21 tests de salas). Faltan espectadores y poderes/chakra de equipo. |
| 6. Pulido/despliegue | En progreso | 2026-10-29 | Viewport, páginas huérfanas y botón NIVELES resueltos. Faltan despliegue, seguridad Socket.io, móvil real y accesibilidad completa. |
| 7. Offline/sincronización | En progreso | 2026-10-29 | Cola/dedup/merge hechos. El reintento automático solo se activa desde login; falta en páginas de juego. |

> Los ajustes de cabecera, Parte 5, Parte 6 y Registro de avance ya se aplicaron el 2026-10-29.

---

## Principios para el agente (leer ANTES de cada parte nueva)

1. **Preguntar antes de implementar.** Cada aspecto abre con una lista de preguntas al usuario.
   Prohibido asumir valores, reglas o comportamientos. Se avanza solo con respuesta.
2. **Servidor autoritativo.** El cliente pide, el servidor valida, decide y notifica a todos.
3. **Respetar el diseño del juego.** Paleta morada/dorada/oscura, fuente Permanent Marker,
   Flexbox con `space-between` en paneles laterales, logos y animaciones ya existentes
   (`mostrarAvisoRapido`, banner de poder rival). No introducir colores, fuentes ni layouts nuevos sin preguntar.
4. **Nada simulado.** Lo no implementado se muestra deshabilitado y honesto, nunca falso.
5. **Un aspecto a la vez.** No se pasa al siguiente hasta cerrar el anterior con tests + prueba con 2 clientes reales.
6. **Lógica + visual + CSS juntos.** Cada mejora incluye servidor, cliente y la parte visual; no solo lógica invisible.
7. **Entregar completo.** Al pedir un cambio de JS/CSS, entregar el archivo completo, no fragmentos.
8. **Ciclo por aspecto:** auditar → preguntar → plan con archivos y líneas → implementar → verificar → cerrar.

---

## Objetivo y definición de terminado (pitch de ~15 días)

**Objetivo:** que el juego funcione como un juego online real (estilo COD Mobile en pequeño):
jugadores desde dispositivos distintos, salas, chat real, poderes y reconexión estable.

**Definición de terminado para el pitch (todo esto debe funcionar sí o sí):**
- [ ] Juego desplegado con HTTPS y `wss`, accesible desde internet.
- [ ] Dos teléfonos reales jugando 1v1 en una sala privada por código, sin scroll para llegar a los poderes.
- [x] Invitado puede crear y unirse a salas (sin forzar login).
- [ ] Chat de sala real y seguro.
- [x] Lista de salas públicas visible en la UI + unirse por ID.
- [x] QR para compartir la sala y unirse desde el celular.
- [ ] Poderes online con sus efectos y contrarrestos (al menos Byakugan + Sello, luego el resto).
- [~] Reconexión tras suspender la pestaña del celular (15 s; falta 30–60 s + `visibilitychange`).
- [ ] Plan B de demo (túnel o video grabado) probado.

**Regla de corte:** si no alcanza el tiempo, sacrificar 2v2 y espectadores. Nunca sacrificar:
despliegue, salas privadas, invitados, mobile, QR, chat y poderes básicos.

---

## Análisis del online: ideas vs. estado actual

### Ideas originales

#### Arquitectura del online
- Servidor autoritativo: baraja, valida la pareja, cambia turnos y calcula puntaje. El cliente solo renderiza.
- Salas en memoria con TTL (efímeras); el resultado final se persiste en `historial_partidas`.
- Lobby REST para crear/listar/unirse; tiempo real para el estado de la partida.
- Interfaz `ITransporteSalas` con implementación real y otra en memoria para tests.
- Transporte gratuito y rápido (se evaluó `ws` nativo vs Socket.io vs SSE).
- Cada sala lleva un ID de 10 números generado por el servidor, solo en memoria (sin relación con el ID de 10 números de usuarios).

#### Invitados
- Pueden crear y unirse a salas privadas con configuración por defecto.
- Sin historial, XP ni ranking; sus salas no aparecen en el listado público.
- Nunca forzar login: jugable como invitado.

#### Tablero y configuración
- Mezclar cartas de 2+ aldeas/clanes al azar.
- 6 / 8 / 10 / 12 parejas (default 8, máximo 12); 1–3 aldeas; 10+ parejas exige al menos 2 aldeas.
- Mazos: arena, akatsuki, niebla, nube, roca, konoha (hyuga, sarutobi, uchiha, uzumaki).
- La sala pide la configuración al crearse (cantidad de cartas, aldeas).

#### 2v2 (requisito obligatorio)
- 4 asientos, 2 equipos, turno por equipo, puntaje compartido.
- Cualquier integrante puede voltear, con bloqueo de un clic a la vez.

#### Social y difusión
- Lista de salas, invitaciones y chat.
- Panel verde del menú → **SALAS AMIGAS** (buscar por ID, lista de salas, filtro, unirse por ID exacto);
  panel morado → **CREAR SALA**. Hoy ambos abren el mismo lobby.
- QR + LAN para compartir la partida y que los espectadores la prueben desde su celular.

#### Mobile
- Prioridad: login, menú, modal de salas, pantalla de espera y `game-online.html`.
- El single-player mobile queda para después.

### Qué ya está hecho (Parte 5, cerrada 2026-10-25)

`npm test` en **166/166** (25 suites).

- `GestorSalas.js` con Socket.io 4.8.4: crear/unir por código, contraseña, listado de salas públicas,
  `buscar-partida` (matchmaking), `marcar-listo`, inicio automático con 2 jugadores, abandono y limpieza a los 30 s.
- Turnos autoritativos: solo el del turno voltea, el acierto conserva turno, el fallo bloquea 800 ms y cambia; empate posible.
- Anti-trampa: el servidor no manda `valor`/`aldea` de cartas no descubiertas.
- Reconexión con 15 s de gracia y `reincorporarse-sala` (token estable en `sessionStorage`, no `socket.id`).
- Cliente real: `ClienteMultijugador.js` + `GestorSalaCliente.js`, tablero online en `board-manager.js`,
  rama online por `?codigo=` en `GestorPartida.js`.
- Rutas de aldeas corregidas a carpetas reales (`konoha/*`, `akatsuki`).
- 2v2 real: 4 asientos, equipos A/B, turno compartido, abandono por equipo y revancha.
- QR/LAN, lista de salas en UI y `menu.html?codigo=` para unirse desde el celular.
- Poderes online: base parcial en servidor (chakra, defensas, 3 poderes con lógica); el resto sigue pendiente en 5.1.

### Qué quedó pendiente

| Idea | Estado | Detalle |
|---|---|---|
| Poderes online (6) | ⚠️ Parcial | Chakra/defensas y 3 poderes con lógica; Byakugan/Sello/Genjutsu aún genéricos |
| Chakra, vida y combo en servidor | ⚠️ Parcial | Chakra y defensas sí; vida, combo y temporizador no |
| Contrarrestos entre poderes | ❌ No está | Requieren ventana de reacción en tiempo real |
| 2v2 (4 jugadores, equipos) | ✅ Hecho | `GestorSalas.js` soporta equipos, turno compartido y revancha |
| QR + LAN | ✅ Hecho | `GET /api/salas/:codigo/compartir` + QR data URL |
| Chat | ❌ No está | No existe |
| Espectadores | ❌ No está | Solo jugadores por sala |
| Mobile en `game-online.html` | ✅ Hecho | Ya tiene `<meta name="viewport">`; falta prueba en teléfono real |
| Persistencia en `historial_partidas` | ⚠️ Parcial | El cliente con sesión guarda al terminar; las salas siguen en memoria |
| Quick match | ✅ Hecho | `buscar-partida` |
| Lista de salas | ✅ Hecho | Backend `listar-salas` + pantalla en `TwoPlayersModal.js` |
| Despliegue público | ❌ No está | Solo `localhost` y Tailscale |

### Aclaraciones honestas

1. **El transporte cambió respecto de lo recomendado.** Se propuso `ws` nativo + `ITransporteSalas` para mostrar DIP
   en la sustentación, pero se implementó Socket.io (más rápido, con rooms y reconexión incluidas). Funciona y está
   testeado; en la defensa conviene decir que se eligió por velocidad de entrega, no por pureza arquitectónica.
2. **El 2v2 ya está implementado y testeado**, pero sigue sin poderes/chakra de equipo ni espectadores.
3. **La Parte 5 es el online base**, no el online completo. Por eso 5.1, 5.2 y 5.3 siguen abiertas.

---

## Parte 5.1 — Paridad de jugabilidad online (poderes y reglas) · Estado: EN PROGRESO

**Estado real (2026-10-29):** implementado en servidor y cliente. `GestorSalas.js` es autoritativo en 1v1 para
chakra, vida, combo, aciertos/errores, tiempos por jugador, los 6 poderes, Byakugan/Sello/Genjutsu reales y
contrarrestos. `GestorSalaCliente.js` sincroniza estado y aplica efectos al tablero con `board-manager.js`
(revelar, sellar, mezclar); `GestorPartida.js` muestra avisos y motivos de derrota por vida/tiempo. Tests de salas:
35 (9 nuevos de poderes). Pendiente: prueba manual con 2 navegadores y paridad 2v2.

**Objetivo:** que el modo online tenga TODA la jugabilidad del juego (poderes, chakra, vida, combo, contrarrestos),
decidida por el servidor y con el mismo aspecto visual del juego.

**Fuente de verdad de reglas y visuales:** `game-online.js` (lógica) y `board-manager.js` (tablero).
Según el último análisis del proyecto, `game-online.js` ya tiene los 6 poderes con lógica y animaciones,
más turno, tiempo, combo, chakra y vida, y corre con `MODO_PRUEBA_LOCAL`. El trabajo NO es inventar poderes:
es **trasladar lo existente al servidor autoritativo** (`GestorSalas.js`) para que ambos clientes vean lo mismo.
`ui-manager.js`, `mock-server.js`, `power-manager.js`, `room-manager.js`, `player-manager.js` y
`effects-manager.js` eran placeholders; verificar su estado real antes de usarlos.

### Ciclo obligatorio por aspecto
1. **Auditar** el aspecto en `game-online.js`, `board-manager.js` y `GestorSalas.js`.
2. **Preguntar** al usuario solo lo que el código no defina o lo que cambie por jugar en red.
3. **Plan** con archivos y líneas exactas.
4. **Implementar** servidor + cliente + visual/CSS juntos.
5. **Verificar:** `npm test` + prueba con 2 clientes reales (dos navegadores o perfiles distintos).
6. **Cerrar:** anotar decisiones y fecha en el Registro de avance.

### Aspectos a cubrir (en este orden; no saltar)
| # | Aspecto | Qué debe quedar resuelto |
|---|---|---|
| A | Estado de partida en servidor | chakra, vida, combo, usos por poder y estados activos por jugador |
| B | Turnos | tiempo por turno, qué pasa al agotarse, turno extra, poderes dentro/fuera de turno |
| C | Tablero y cartas | efectos sobre cartas (revelar, bloquear, desorientar) sin filtrar valores ocultos |
| D | Puntaje y combo | bonus de chakra por combo, ruptura de combo, empate |
| E | Chakra y vida | ganancia por pareja, tope, costos, derrota por vida |
| F | Poderes, uno por uno | Byakugan, Sello, Sustitución, Robo, Genjutsu, Bomba |
| G | Contrarrestos e interacciones | matriz poder vs poder, ventanas de reacción, qué se pierde al ser bloqueado |
| H | Red | latencia, desconexión con poder activo, reconexión, orden de eventos |
| I | Visual y móvil | qué ve atacante y atacado, banners, cuenta regresiva, layout móvil sin scroll a los poderes |
| J | Invitados y persistencia | qué se guarda, qué no; resultado final en `historial_partidas` |
| L | Pruebas y balance | tests por poder, E2E con 2 clientes, ajuste de números |

(El aspecto K, 2v2 y social, vive en 5.2 y 5.3.)

### Valores acordados históricamente (VERIFICAR contra `game-online.js`; si difieren, PREGUNTAR)
- Chakra por pareja acertada: **+5**, tope **100**. Bonus por combo: **+3 por nivel** (x2, x3…).
- Costos confirmados contra el código local: Byakugan **30**, Sustitución **25**, Robo **30**, Genjutsu **35**,
  Sello **30**, Bomba **50**; **2 usos** por poder. (La tabla anterior decía Byakugan 20.)
- **Byakugan:** revela 2 cartas ocultas por 3 s (sin encontrar la pareja automáticamente). El rival tiene una
  ventana de **0.8 s** para contrarrestar con Sello; si lo bloquea, el lanzador pierde igual los puntos de chakra
  pero no obtiene la información. Animación: brillo en avatar, símbolo grande, cuenta regresiva 3-2-1, registro de evento.
- **Sustitución:** defensa contra errores, ventana armada de **8 s**; mitiga Bomba y evade Sello.
- **Robo de chakra:** roba ~**20** de chakra al rival.
- **Genjutsu (DEFINICIÓN ACTUALIZADA 2026-10-27):** al activarse, **cambia de posición de forma aleatoria algunas cartas**
  del tablero. Reemplaza la definición anterior ("desorienta visualmente ~5 s sin cambiar posiciones reales").
  Lo contrarresta Byakugan. Detalle de diseño online en la sección "Decisiones de diseño online" de abajo.
- **Sello:** bloquea una carta del rival **5 s**; se evade con Sustitución.
- **Bomba:** **-20 vida**; **-10** si el rival tiene Sustitución activa.
- Contrarrestos definidos: Byakugan↔Sello, Robo↔Sustitución, Genjutsu↔Byakugan, Explosiva↔Sello.
- Principio de balance: poderes sutiles y balanceados, siempre con contraataque posible.
- Cada poder tiene su logo/imagen propia, con tamaño ajustable de forma individual.

### Matriz de interacciones (el agente la completa preguntando)
| Poder atacante | Se contrarresta con | Qué pasa con el chakra | Qué ve el rival |
|---|---|---|---|
| Byakugan | Sello | Se pierde igual (acordado) | Por definir |
| Genjutsu | Byakugan | Por definir | Por definir |
| Robo | Sustitución | Por definir | Por definir |
| Sello | Sustitución | Por definir | Por definir |
| Bomba | Sustitución (mitiga) / Sello | Por definir | Por definir |

### Decisiones de diseño online (propuesta recomendada; el agente la confirma con el usuario)

#### 1. ¿Un tablero compartido o uno distinto por jugador?
**Recomendación: UN SOLO tablero compartido, con la verdad en el servidor.**
- Hoy el servidor ya tiene un único mazo por sala y ambos jugadores ven cada carta que se voltea. Es lo que
  hace justo un juego de memoria por turnos: los dos ven lo mismo y compiten por recordar mejor.
- Un tablero distinto por jugador obligaría a mantener dos mazos o dos "vistas" por sala, duplica la lógica
  anti-trampa y confunde (¿qué ve el espectador?, ¿qué ve el 2v2?). No aporta jugabilidad que no se pueda lograr
  de otra forma.
- Lo que SÍ puede ser distinto por jugador es la **información privada**: qué cartas reveló Byakugan (solo lo ve
  quien lo usó), el chakra exacto, qué poder tiene armado (Sustitución). Eso va por eventos dirigidos a un jugador.
- Lo que es público para todos: cartas volteadas, parejas, turno, marcadores y que "alguien activó un poder".
- Regla: **todo lo que cambie el tablero lo decide el servidor y se emite a todos**; el cliente solo anima.

#### 2. Genjutsu: cambia de lugar algunas cartas al azar
**Cómo funcionaría (propuesta):**
- El servidor elige N cartas al azar (sugerido 2 a 4, por definir) SOLO entre las **no emparejadas y boca abajo**
  (nunca las ya acertadas ni la carta que está volteada en ese instante) y permuta sus posiciones.
- La permutación real vive en el servidor (cambia el orden del mazo). Se emite a todos solo qué **posiciones**
  se intercambiaron, nunca los valores de las cartas ocultas (se conserva el anti-trampa de `mazoPublico`).
- Ambos jugadores ven la animación (cartas que se mezclan/giran con efecto ilusión, tonos morados), así nadie
  queda con un tablero desfasado.
- **Efecto sobre la memoria:** lo que ya vieron los dos jugadores en esas posiciones deja de ser válido para ambos.
  Es un poder simétrico "de remontada": conviene usarlo cuando el rival ya recuerda más cartas que tú.
- **Contraataque con Byakugan (propuesta):** si el rival tiene Byakugan disponible/activo en la ventana, puede
  anular el Genjutsu (no se mueve nada) o, como mínimo, ver qué posiciones se intercambiaron. Por decidir.
- **Casos límite:** ¿se puede usar en medio de un turno (con una carta ya volteada)? ¿cuántas veces por partida?
  ¿costo 35 sigue vigente? ¿qué pasa si quedan menos cartas ocultas que N? ¿y con Sello activo sobre una carta?
- **Alternativa si se quiere asimetría real:** que el Genjutsu desordene solo lo que el rival "sabe" (vista
  distinta para el rival). Es más complejo (traducir clics por jugador); solo si el usuario lo pide.

#### 3. Barra de poderes: el icono cambia al activarse un poder
**Propuesta (reutilizar lo que ya existe en `game-online.js`/CSS, sin colores nuevos):**
- La barra tiene un **espacio central "poder activo"**. En reposo muestra un icono neutro.
- El servidor emite `poder-activado { poder, jugador, estado }` a ambos clientes. Al recibirlo, el espacio cambia al
  **logo del poder usado** (con el tamaño individual configurado para ese poder), el nombre y quién lo usó.
- Estados visuales del mismo espacio: **activando** → **ventana de contrarresto** (cuenta regresiva, p. ej. 0.8 s)
  → **efecto aplicado** o **bloqueado/contrarrestado** (se superpone el logo del poder que lo bloqueó).
- Para el rival se mantiene el **banner grande temporal** con el poder que usó (ya pedido por el usuario).
- Vuelve al icono neutro cuando termina el efecto.
- Debe verse completo en móvil sin scroll, con accesibilidad (texto alternativo y `aria-live` para el anuncio).

### Preguntas pendientes que debe resolver el agente (antes de programar)
0. **Confirmar las 3 decisiones de diseño de arriba** (tablero compartido, Genjutsu con cartas al azar, barra de poderes).
1. **Contrarrestos con dos versiones:** Explosiva↔Sello vs. Bomba mitigada por Sustitución. ¿Cuál es oficial, o valen ambas?
2. **Costos con dos versiones:** 30-50 con 1-2 usos vs. la tabla por poder. ¿Cuál manda? ¿Hay límite de usos?
3. **Ventana de contrarresto:** 0.8 s en local; online hay latencia. ¿Se alarga? ¿Qué pasa si el rival está desconectado?
4. **Temporizador:** el MVP online decía "sin temporizador que corte la partida", pero el roadmap incluía turnos+tiempo. ¿Cuál vale?
5. **Vida:** ¿existe en online 1v1? ¿Se gana también por vida a 0 o solo por parejas?
6. **¿Poderes en 2v2?** ¿Chakra y poderes son por jugador o compartidos por equipo?
7. **Casos límite:** desconexión con poder activo, poder lanzado en el último movimiento, dos poderes a la vez, empate de chakra.
8. **Invitados:** ¿pueden usar poderes? (por defecto sí, sin guardar XP/ranking).

### Tareas
- [x] Aspectos A, C, D, E, F y G implementados en servidor + cliente (contrarrestos automáticos).
- [ ] Cerrar E2E manual con 2 navegadores, revisión del banner/avisos y revisión móvil (aspectos H/I).
- [ ] Aspectos A → L cerrados en orden, cada uno con su ciclo de 6 pasos.
- [ ] Un poder a la vez; no pasar al siguiente hasta probar el anterior con 2 clientes reales.
- [ ] Completar el flujo online de `Poder.activar()` y quitar el fallback de aviso cuando cada poder esté real.
- [ ] Mover la lógica de `game-online.js` al servidor sin cambiar colores ni estructura visual.
**Verificación:** `npm test` verde + E2E con 2 clientes por cada poder y cada contrarresto.
**Depende de:** Parte 5. **Habilita:** 5.3 (2v2 con poderes).

---

## Parte 5.2 — Social y difusión · Estado: EN PROGRESO

**Estado real (2026-10-29):** lista de salas, QR/LAN y `menu.html?codigo=` ya funcionan. Falta chat, filtros/invitaciones
y persistencia online en servidor.

**Objetivo:** que se sienta como un juego online: ver salas, hablar, compartir y entrar desde el celular.

**Tareas:**
- [x] **Pantalla de salas** (modales separados): SALAS AMIGAS (lista pública, filtro por ID, unirse por ID exacto)
  y CREAR SALA (cantidad de parejas, aldeas, contraseña, privada/pública). Usa `listar-salas` que ya existe.
- [ ] **Chat de sala**, seguro desde el inicio:
  - El servidor limita longitud, aplica *rate limit* (~1 mensaje/segundo) y descarta mensajes vacíos.
  - El cliente muestra SIEMPRE con `textContent`, nunca `innerHTML`.
  - Mensajes efímeros (sin persistencia). Invitados pueden escribir con nombre tipo "Invitado123".
  - Chat global y de amigos: fase posterior.
- [x] **QR + enlace** para compartir la sala y unirse desde el celular (sin pedir login).
- [ ] **Invitaciones** a sala (fase posterior).
- [ ] Persistir el resultado final de partidas de usuarios con sesión en `historial_partidas`
  (invitados no guardan historial, XP ni ranking).
- [ ] Apariencia: reutilizar los estilos y componentes del menú; sin colores nuevos.
**Preguntas previas para el agente:** ¿chat visible en pantalla de espera y en partida? ¿filtros de la lista de salas?
¿qué datos muestra cada sala (host, aldeas, parejas, cupo)? ¿QR lleva a la sala o al menú?
**Verificación:** 2 teléfonos reales: crear sala, escanear QR, unirse, chatear, jugar.

---

## Parte 5.3 — 2v2 y espectadores · Estado: EN PROGRESO (espectadores se sacrifican primero si falta tiempo)

**Estado real (2026-10-29):** 2v2, equipos, turno compartido, abandono por equipo y revancha ya están implementados
y cubiertos por `gestorSalas.test.js`. Faltan espectadores y poderes/chakra de equipo.

**Objetivo:** 4 asientos, 2 equipos, turno por equipo, puntaje compartido.

**Reglas ya definidas:** cualquier integrante del equipo en turno puede voltear, con bloqueo de un clic a la vez.
**Tareas:**
- [x] `GestorSalas.js`: salas de 4 asientos, asignación de equipos, turno por equipo.
- [x] Marcadores por equipo y UI de 4 jugadores (respetando el diseño existente).
- [x] Reconexión y abandono en equipos (el equipo sigue si queda un integrante).
- [ ] Poderes y chakra en equipo (según respuesta a la pregunta 6 de la Parte 5.1).
- [ ] Espectadores (solo lectura, sin ver cartas ocultas).
**Orden:** completar 5.1 antes de poderes/chakra de equipo.
**Verificación:** E2E con 4 clientes.

---

## Parte 6 — Pulido y despliegue: ajustes al plan

**Despliegue sube a PRIMERA PRIORIDAD**, antes de poderes y 2v2: sin servidor público no se puede probar
con jugadores en dispositivos distintos, y varios problemas solo aparecen en internet
(latencia, `wss`, cookies `secure`, suspensión de pestañas en el celular).

**Tareas nuevas:**
- [ ] Elegir hosting con WebSockets persistentes (no *serverless*). Opciones: Render, Railway, Fly.io;
  PostgreSQL en Neon o Supabase.
- [ ] **Una sola instancia** (las salas están en memoria).
- [ ] HTTPS + `wss`; `COOKIE_SECURE=1`; `CORS_ORIGINS` con el dominio real; `connect-src` con el dominio.
- [ ] Variables de entorno de producción (`.env` no se sube; documentar en `.env.example`).
- [ ] Correo real (`MAILER=smtp` con proveedor propio) y rotar la contraseña de aplicación expuesta.
- [ ] Planes gratuitos se duermen: despertar el servidor antes de la demo.
- [ ] **Plan B de demo:** túnel (Cloudflare Tunnel o Tailscale Funnel) desde el portátil, o video grabado.
- [x] Agregar `<meta name="viewport" content="width=device-width, initial-scale=1">` a `game-online.html`.
- [~] Afinar UX del invitado y accesibilidad WCAG 2.2 (iniciada; falta completar páginas de juego).

### Seguridad del socket (parte de 6)
- [ ] Si hay sesión, asociar el socket a la cookie de sesión; si no, tratarlo como invitado (nadie suplanta a otro).
- [ ] Validar `origin` del socket y el formato de cada evento.
- [ ] *Rate limit* a eventos como crear sala, buscar partida y chat.
- [ ] Las salas siguen en memoria: documentar que un reinicio del backend las pierde.

### Móvil real (parte de 6)
- [ ] Los celulares suspenden la pestaña al cambiar de app: subir la gracia de reconexión de 15 s a **30–60 s**
  y reconectar con el evento `visibilitychange`.
- [ ] Layout móvil de `game-online.html`: poderes alcanzables sin scroll, banner grande del poder rival.
- [ ] Probar siempre en un teléfono físico, no solo en emulador.
- [ ] Nota: dos pestañas del mismo navegador comparten `sessionStorage`; usar navegadores/perfiles distintos.

---

## Cronograma propuesto (revisado 2026-10-29)

| Días | Qué |
|---|---|
| Hecho | P0 del menú, `npm run check:js`, docs alineadas, 2v2/QR/listas/viewport |
| 1–5 | Parte 5.1: estado de partida y poderes online (Byakugan + Sello primero) |
| 6–7 | Parte 5.2: chat de sala y persistencia online |
| 8–9 | Parte 6: despliegue HTTPS/wss + seguridad Socket.io |
| 10–11 | Prueba con dos teléfonos reales y ajustes móviles |
| 12–13 | Parte 5.3: espectadores y poderes/chakra de equipo (si alcanza) |
| 14–15 | Pulido, ensayo del pitch y plan B |

**Ojo con la ambición:** los poderes completos siguen siendo lo más pesado. Un 1v1 estable con chat y poderes
básicos se ve mejor en una demo que un 2v2 con poderes a medias.

---

## Registro de avance: filas a añadir

| Parte | Estado | Fecha | Notas |
|---|---|---|---|
| 5.1 Poderes y reglas online | En progreso (código completo) | 2026-10-29 | 1v1 autoritativo: vida/combo/tiempos, 6 poderes, contrarrestos y efectos en tablero; banner/avisos/impacto visual hechos, falta E2E manual |
| 5.2 Social (salas UI, chat, QR) | En progreso | 2026-10-29 | Salas/QR/listas hechas; faltan chat y persistencia online en servidor |
| 5.3 2v2 y espectadores | En progreso | 2026-10-29 | 2v2 y revancha hechos; faltan espectadores y poderes/chakra de equipo |

> Estado 2026-10-29: P0 de `TwoPlayersModal.js` corregido, chequeo `npm run check:js` agregado y docs alineadas.
> Siguiente prioridad recomendada: **cerrar 5.1 (poderes online)**; después **5.2 (chat/persistencia)** y **Parte 6 (despliegue/seguridad)**.