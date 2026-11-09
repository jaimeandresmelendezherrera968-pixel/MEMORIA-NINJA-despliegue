# AGENTS.md — Memorice Duel (Ninja Memory)

## Qué es esto

Juego de cartas de memoria temático de Naruto. Interfaz y comentarios de código en español.
Sin build system, sin bundler, sin linter, sin CI — frontend vanilla HTML/CSS/JS, backend Node.js + Express.

## Estructura del repositorio

- **Raíz**: frontend estático (páginas HTML + `js/` + `css/` + `assets/`). Cada página = un HTML + un CSS + un JS.
- **`backend-poderes/`**: app Node.js aparte para el sistema de poderes. Tiene su propio `package.json`.
- **`Agrupar/`**: versión legado/prototipo del juego — no modificar salvo pedido explícito.
- **`-files`**: volcado del log de git (archivo de texto de 15KB), no es un archivo fuente real.
- **`README.md` (raíz)**: guía real del proyecto en español (ya no es el placeholder roto `# MEMORIA-NINJA-1111`).

## Frontend (raíz)

- Flujo de entrada: `login.html` → `menu.html` → `game-online.html`
- El estado se guarda en `localStorage` (sesión de usuario, nombres de jugadores, historial de partidas, nivel de dificultad), con sincronización best-effort al backend por HTTP
- `js/sesion-guard.js` (script clásico) valida la sesión contra `GET /api/auth/me` en cada página protegida (menu + páginas de juego), refresca la copia local del usuario y deja el estado en `localStorage["estadoSesion"]` (`activa`/`invitado`/`offline`). **Nunca redirige**: el juego es jugable como invitado/offline
- `js/mock-server.js` provee datos falsos del juego; `js/nucleo-GAME ONLI/datos/ProveedorDatosServidor.js` es el proveedor REAL (POST `/api/partida`, PostgreSQL) que cae al mock cuando el servidor no responde
- Las imágenes de cartas están en `assets/img/cards/aldeas/{village}/` — carpetas reales: `akatsuki`, `arena`, `konoha/{hyuga,sarutobi,uchiha,uzumaki}`, `niebla`, `nube`, `roca`. En el lobby online los alias `hyuga|sarutobi|uchiha|uzumaki` se mapean a `konoha/*`, `konoha` → `konoha/uchiha` y `otros` → `akatsuki`
- `js/board-manager.js` tiene la lógica central de render del tablero; la variable `ALDEA` de arriba controla qué cartas de aldea se muestran en modo local (el online usa el mazo del servidor)
- `js/game-online.js` es un bootstrap chico de ES module (`new GestorPartida().iniciar()`). El motor vivo real está en `js/nucleo-GAME ONLI/` (ver abajo). Con `game-online.html?codigo=XXXX` arranca en modo sala online

### Módulos en capas de `js/` (auth + flujos de cuenta)

`js/` también contiene una arquitectura en capas pequeña que refleja el estilo SOLID del backend:

- `controladores/` — `LoginController`, `RegistroController`, `RecuperacionController`, `VerificacionController`, `FormularioControllerBase`
- `core/` — `entities/Usuario.js` + `interfaces/` (`ICodigoGenerador`, `INotificador`, `IUsuarioRepositorio`)
- `infraestructura/` — `repositorios/LocalStorageUsuarioRepositorio`, `generadores/` (códigos alfanuméricos + numéricos), `notificadores/` (alerta DOM + mensaje)
- `servicios/` — `AutenticacionService`, `RegistroService`, `RecuperacionService`, `SesionService`, `VerificacionService`
- `utils/` — `ModalHelper`, `TogglePasswordHelper`

Algunos archivos son ES modules (`import`/`export`); `require` estilo CommonJS puede no funcionar — revisá el estilo de módulo de cada archivo.

### Sistema de poderes duplicado (`js/nucleo-GAME ONLI/`)

- El nombre de la carpeta **contiene espacios**: `js/nucleo-GAME ONLI/` — usá comillas o `-LiteralPath` en comandos de shell. Las rutas de import también usan el espacio (funciona en la resolución de módulos del navegador, pero los glob del shell necesitan comillas).
- **Este ES el motor vivo.** `game-online.js` es un bootstrap delgado; el motor real: `GestorPartida.js` (raíz de composición), `GestorTurno.js`, `GestorTiempo.js`, `entidades/Personaje.js`, `poderes/Poder.js` (Template Method) + las 6 clases de poderes + `GestorPoderes.js`, `datos/ProveedorDatos*.js`, `vista/VistaPartida.js`
- Conexión de datos + persistencia: `ProveedorDatosServidor` crea la partida en el backend (`POST /api/partida` → PostgreSQL) y `Poder.activar()` notifica `POST /api/poder/activar` best-effort; ambos caen silenciosamente a la lógica simulada local cuando el servidor no responde, así el juego funciona offline también. **En partidas online (1v1 o 2v2) no se usa el proveedor ni XP**: `Poder.activar()` delega en `activarPoderOnline()`. En 1v1 el servidor ya es autoritativo para chakra, vida, combo, tiempos, aciertos/errores, los 6 poderes, Byakugan/Sello/Genjutsu reales y contrarrestos (Parte 5.1); falta la prueba manual con 2 clientes y la paridad de poderes en 2v2 (Parte 5.3).
- `COMO-QUEDO-ORGANIZADO.md` dentro de la carpeta mapea el código viejo de `game-online.js` a las clases nuevas.
- Hay un archivo basura de 0 bytes `{entidades,poderes,datos,vista}` en la carpeta (brace-expansion roto), ignorarlo sin problema.

### Multijugador online real (Socket.io)

- Backend: `backend-poderes/src/servicios/online/GestorSalas.js`, montado por `server.js` sobre el mismo HTTP server (Socket.io 4.8.4). Salas **en memoria** (no PostgreSQL): efímeras, se pierden al reiniciar. Soporta **1v1** y **2v2** (`config.modo`), capacidad 2/4 y asientos `0-1 = Equipo A`, `2-3 = Equipo B`.
- Eventos: `crear-sala`, `unirse-sala` (auto-start con 2 en 1v1 y 4 en 2v2), `marcar-listo`, `listar-salas`, `buscar-sala-por-codigo`, `buscar-partida` (matchmaking por modo), `cancelar-busqueda`, `reincorporarse-sala`, `voltear-carta`, `revancha-sala`, `abandonar-sala`. El servidor emite `partida-iniciada`, `sala-actualizada`, `carta-volteada`, `acierto`, `fallo`, `turno-cambiado`, `tiempo-actualizado`, `poder-activado`, `poder-efecto`, `partida-terminada`, `jugador-desconectado|reconectado`, `error-sesion`.
- Identidad: token estable por pestaña en `sessionStorage["memoriaNinjaTokenJugador"]` (no `socket.id`), enviado en `handshake.auth.token`; permite reincorporarse tras recargar. Gracia de reconexión: **15 s**; si expira en partida → abandono del rival (en 2v2 el equipo sigue si queda un integrante). Salas se limpian 30 s después de terminar.
- Reglas: solo el jugador del turno puede voltear (en 2v2 cualquier integrante activo del equipo del turno); acierto suma pareja y conserva turno; fallo bloquea 800 ms y cambia turno; el mazo no filtra `valor/aldea` de cartas no descubiertas. Empate posible (`ganadorId: null`). El abandono explícito hace perder al equipo.
- `partida-terminada` incluye `idPartida`, `motivo` (`completada`/`abandono`), ganador/perdedor y equipo, `parejasEquipos`, `puntaje`, roster y `config`. `revancha-sala` solo la puede pedir el anfitrión, exige partida terminada y todos los conectados; reutiliza la sala y emite `partida-iniciada`.
- Frontend: `js/multijugador/ClienteMultijugador.js` (import dinámico same-origin `/socket.io/socket.io.esm.min.js`, acks con timeout, `buscarPartidaRapida(modo)`, `solicitarRevancha(config)`) + `js/multijugador/GestorSalaCliente.js` (estado, equipos, marcador, turno compartido, `#onlineEstado`, rejoin). `GestorPartida.js` decide local vs online por `?codigo`, muestra `#modalFinal` (victoria/derrota/empate) y guarda el historial online (`online-1v1`/`online-2v2`). `HistoryModal.js` separa normales/online/sala y muestra empates.
- Lobby: el panel verde MULTIJUGADOR y el morado DOS JUGADORES abren `twoPlayersModal` (`TwoPlayersModal.js`); el stub `multiplayerModal` ya no existe. Incluye selector 1v1/2v2, matchmaking por modo, panel de espera con equipos y QR/LAN. `GET /api/salas/:codigo/compartir` (`src/routes/salasRoutes.js` + `src/utils/compartirSala.js`) devuelve `menu.html?codigo=XXXX` (IP LAN si el host es localhost) y un PNG data URL; `menu.html?codigo=` autoabre el lobby y une al jugador. La CSP de `helmet` incluye `connect-src ws: wss:` e `img-src data:` (configurado en `server.js`).

## Sesión (frontend): 3 estados

La sesión real vive en la cookie httpOnly `memoria_ninja_sesion`. El frontend expone `window.SesionNinja` (`js/sesion-guard.js`), que consulta `GET /api/auth/me` y marca:

- **`activa`** (200): sesión válida; menú completo y funciones de perfil/ranking/historial habilitadas.
- **`invitado`** (401): online pero sin sesión; se puede jugar, el menú muestra un cartel ("inicia sesión para guardar tu progreso y aparecer en el ranking") y perfil/ranking/historial piden login (`MenuController.estaBloqueado`).
- **`offline`** (el servidor no responde): igual que invitado, jugable con guardado local.

El **logout es real**: `window.SesionNinja.cerrarSesion()` (usado por `js/menu.js` y `js/services/GameSessionService.js`) hace `POST /api/auth/logout` (revoca la cookie en el servidor), limpia `localStorage` y vuelve a `login.html`. No se fuerza el login: `login.html` no redirige. Trabajo futuro: reintento automático al reconectar la cola offline (Parte 7 de `PLAN-DESARROLLO.md`) — la cola local `historialPendiente` y el merge invitado→cuenta (`POST /api/usuarios/:id/importar`, sub-parte 3.5) ya están implementados: lo jugado como invitado se encola y se sube al iniciar sesión.

## Backend (`backend-poderes/`)

```bash
cd backend-poderes
npm install
npm start          # corre en http://localhost:3000
npm test           # runner nativo de Node (--test): 166 tests, 25 suites, todas verdes
npm run check:js   # sintaxis de todo el JS del repo (frontend + backend)
npm run seed:demo  # llena PGDATABASE con datos demo (7 cuentas @demo.ninja / clave123)
```

### Datos demo / seed

`npm run seed:demo` (`scripts/seed-demo.js`) llena todas las tablas y vistas para que nada se vea vacío en pgAdmin, y crea cuentas reales con las que se puede iniciar sesión (7 usuarios ninja, `@demo.ninja`, contraseña `clave123`). Es **idempotente**: borra solo las filas demo (`@demo.ninja` / `estado_json` que contiene `"demo":true`) y las vuelve a crear; ejercita los 3 procedimientos almacenados y `fn_confirmar_codigo`, y dispara los 5 triggers (auditoría, código previo inválido, `actualizado_en`). Equivalente en SQL puro: `sql/datos-simulados.sql`. Consultas listas para pegar en pgAdmin: `sql/consultas-demo.sql`. Guía paso a paso: `sql/COMO-VER-EN-PGADMIN.md`. Nota: PostgreSQL prohíbe subconsultas como argumento de `CALL`, por eso tanto el seed SQL como `consultas-demo.sql` envuelven los `CALL` en bloques `DO`.

- Arquitectura: en capas (entities → factories → repositories → services → controllers → routes)
- `server.js` es la **raíz de composición** — único lugar donde se instancian implementaciones concretas con `new`
- `src/servicios/online/GestorSalas.js` maneja el multijugador en tiempo real (Socket.io); sus tests usan `socket.io-client` y un servidor HTTP en puerto 0, sin tocar PostgreSQL
- 6 poderes: byakugan, sustitucion, robo, genjutsu, sello, bomba. Endpoints: `POST /api/poder/activar`, `POST /api/partida` (crea + persiste una partida, PostgreSQL), `POST /api/partida/prueba` (demo legado), y los endpoints de usuario/historial/perfil bajo `/api/usuarios` (register/login/list/search/history/`GET|POST :id/perfil`) — más `POST :id/importar` (merge invitado→cuenta, mini-guard de cookie propio hasta la Parte 4)
- Tres implementaciones de repositorio: `PartidaRepositoryMemoria` (en memoria), `PartidaRepositoryArchivo` (en archivo) y `PartidaRepositorySQL` (PostgreSQL, default en producción) — todas pasan los mismos tests de contrato (prueba de LSP)
- Los tests son basados en contratos: la misma batería corre contra varias implementaciones
- `PartidaRepositoryArchivo` escribe un snapshot JSON por partida en `backend-poderes/data/` (ignorado por git vía `data/*.json`). `obtener()` revisa primero el caché en memoria y, si falla, **relee el archivo JSON del disco** y reconstruye la entidad `Partida` (igual que el repo SQL) — las partidas sobreviven un reinicio del servidor. Verificado por los tests de "persistencia REAL en disco"
- Bug conocido de código muerto: `BombaPoder.activar()` chequea `rival.tieneSustitucionActiva === true`, pero `Jugador` nunca setea esa propiedad — la rama "−10 si Sustitución activa" nunca corre
- `Poder.usosPermitidos` está definido en la clase base pero nunca se aplica en ningún lado

## Sistema de experiencia / perfil (XP)

Cubre **solo partidas de 1 jugador** (nunca el motor online ni el modo de 2 jugadores). Reglas de negocio:

- Toda cuenta nace con **500 XP**, el resto de las estadísticas en 0; nivel = `floor(xp / 1000) + 1`.
- **Victoria → +100 XP**, +1 victoria, +1 racha. **Derrota → +1 derrota, racha = 0, sin XP.**
- `puntajeMax` guarda el mejor puntaje histórico (nunca baja).

Backend:

- `usuarios` tiene columnas `xp/victorias/derrotas/racha/puntaje_max`; `DatabaseSqlite.#migrarColumnasPerfil()` las agrega de forma idempotente a bases viejas (defaults 500/0/0/0/0). Las mismas columnas están en `sql/esquema.sql`.
- `UsuarioService.obtenerPerfil(id)` (null si la cuenta no existe) y `registrarFinPartidaPerfil({idUsuario, victoria, puntaje})` con `XP_POR_VICTORIA = 100`.
- Rutas `GET|POST /api/usuarios/:idUsuario/perfil` — GET → 404 si falta, POST → 400 si falta. Tests en `tests/usuarioPerfil.test.js`.

Frontend (todo ES modules):

- `js/domain/ProgresoReglas.js` — **única fuente de verdad en el navegador** (defaults, nivel, `aplicarFinPartida`); refleja la constante del backend. `js/domain/IPerfilRepositorio.js` es el contrato.
- `js/infraestructura/repositorios/` — `HttpPerfilRepositorio` (404 → null, red caída → `ErrorDeConexion`), `LocalStoragePerfilRepositorio` (clave `perfil:<id>`), `PerfilRepositorioConRespaldo` (invitado / cuenta desconocida / sin backend → local; los errores de negocio se propagan).
- `js/services/ProfileService.js` (async: `obtenerPerfil()`, `registrarFinPartida()` que es best-effort y nunca lanza) + **singleton `js/services/progresoService.js`** — la composición que importan tanto `js/app.js` (modal del menú) como cada página de juego.
- `js/ui/ProfileModal.js` llena `modalName/modalLevel/modalExpBar/modalExpText/statWins/statLosses/statStreak/statHighScore` de forma asíncrona.

Hooks (12 páginas, todas llaman a `progresoService.registrarFinPartida({victoria, puntaje})`):

- Los 9 controllers con `guardarResultadoServidor(victoria)`: akatsuki, arena, hyuga, niebla, nube, roca, sarutobi, uchiha, uzumaki.
- `MuerteController.mostrarVictoria()` / `tiempoAgotado()` — protegidos por `!this.modo2Jugadores`.
- `OrdenController.mostrarVictoria()` / `perder()`; `js/pares.js terminarPartida(victoria)` (script clásico → `import()` dinámico desde `document.baseURI`).
- Las sesiones de invitado usan `perfil:invitado` y nunca tocan HTTP.

## Testing

- **Solo backend** — no hay tests de frontend; `npm run check:js` valida la sintaxis de todo el JS
- Correr desde el directorio `backend-poderes/`: `npm test` (su `pretest` corre `node scripts/db-setup.js --test`, que aplica `sql/esquema.sql` a `memoria_ninja_test`)
- Las suites de integración `usuarioService.test.js`, `usuarioPerfil.test.js`, `procedimientoService.test.js` e `importarProgreso.test.js` corren contra **PostgreSQL** (`memoria_ninja_test`), no SQLite. Comparten `tests/helpers/baseDatosPrueba.js` (`crearDatabasePrueba()` / `limpiarDatabase()` → `TRUNCATE ... CASCADE`) y limpian las 7 tablas entre tests.
- Los repos son async-safe: los métodos de escritura de `UsuarioRepositorySQL`/`HistorialPartidaRepositorySQL` hacen `return` de la promesa `run()` para que el PostgreSQL (async) sea awaited; esperar el resultado síncrono de SQLite es un no-op, así funcionan ambos motores.
- `DatabaseSqlite` sigue respaldando solo los tests SQL de partidas (`partidaRepositorySQL.test.js`, `partidaService.test.js`) y el test de migración `DatabaseSqlite.#migrarColumnasPerfil()` (solo SQLite) dentro de `usuarioPerfil.test.js`.
- `tests/authE2e.test.js` es un test end-to-end real: levanta `server.js` como proceso hijo (en `SERVER_PORT_E2E`, default 3099, `PGDATABASE=PGDATABASE_TEST`, `MAILER=consola`, `RATE_LIMIT_DESACTIVADO=1`), recorre registro→verificación→login/cookie→logout→recuperación por HTTP, y luego mata el servidor. Lee los códigos de verificación del stdout del hijo (`MAILER=consola` imprime `... es: 123456`).
- `RATE_LIMIT_DESACTIVADO=1` (server.js) hace que ambos rate-limiters hagan `skip` — se usa solo en el test e2e para que corridas repetidas de `npm test` no choquen con 429.
- Archivos de test: `contratoPartidaRepository.js`, `contratoPoder.test.js`, `poderService.test.js`, `partidaService.test.js`, `partidaRepositorySQL.test.js`, `usuarioService.test.js`, `usuarioPerfil.test.js`, `importarProgreso.test.js` (merge invitado→cuenta), `gestorSalas.test.js` (Socket.io, 21 tests 1v1/2v2/revancha), `compartirSala.test.js` (QR/LAN, 7 tests), más uno por cada implementación de repositorio
- Correr los tests crea data fixture real bajo `backend-poderes/data/` solo cuando el repositorio de archivo es ejercitado por los tests

## Skills instaladas (Autoskills)

Hay cuatro skills especializadas instaladas y se deben cargar vía la tool `skill` cuando surjan tareas relevantes:

| Skill | Cuándo aplicarla |
|---|---|
| `nodejs-backend-patterns` | Construir o modificar rutas Express, controllers, middleware, manejo de errores o diseño de API en `backend-poderes/` |
| `nodejs-best-practices` | Decisiones de arquitectura en el backend — patrones async, seguridad, estructura de módulos, elección de framework |
| `frontend-design` | Crear o rediseñar componentes de UI, páginas o elementos visuales en el frontend (`*.html`, `css/`, `js/` con manipulación del DOM) |
| `accessibility` | Auditar o mejorar el cumplimiento de WCAG 2.2, soporte de lectores de pantalla, navegación por teclado o uso de ARIA en cualquier página HTML |

### Reglas

- Cargá siempre la skill relevante **antes** de empezar el trabajo, no después.
- Para tareas de backend, cargá **ambas** `nodejs-backend-patterns` y `nodejs-best-practices` si la tarea toca arquitectura *e* implementación.
- Para trabajo visual de frontend, cargá `frontend-design` primero; si la página también necesita arreglos de a11y, seguí con `accessibility`.
- Las skills dan guía específica del contexto — seguí sus recomendaciones por encima de los defaults generales.

## Cosas a tener en cuenta

- La raíz tiene un `package.json` legado (Express 5 + `mysql2`) que no usa el backend real; el backend vive en `backend-poderes/` con Express 4. No instalar dependencias desde la raíz.
- El frontend no tiene dev server — abrí los HTML directamente o usá un servidor de archivos estáticos
- Algunos archivos JS usan ES modules, otros no — revisá el estilo de módulo de cada archivo antes de agregar código
- El backend sirve el frontend con `helmet()` → **CSP activo**: no usar `onclick`/`onerror` ni `<script>` inline en las páginas HTML (el navegador los bloquea). Conectar todo con `addEventListener` desde el JS de la página. Único HTML con inline: `Agrupar/facil.html` (legado, no se toca)
- El backend está conectado al frontend para auth, creación de partidas, historial y perfil/XP (HTTP best-effort con fallback local); las páginas de juego por zona (`pares.js`, `uzumaki.js`, `muerte.js`, `arena.js`, etc.) siguen guardando el estado de su partida en `localStorage`
- Los nombres de variables/funciones mezclan español e inglés; `verifivacion.html` es un nombre de archivo real (mal escrito)
- La carpeta `js/nucleo-GAME ONLI/` tiene un espacio en su nombre — se requieren comillas/`-LiteralPath` en comandos de shell
