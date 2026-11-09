# SQL + JSON — Implementación en Memorice Duel (Ninja Memory)

> Mapa archivo por archivo de cómo se le dio **persistencia real** al proyecto: **PostgreSQL** como base de datos (SQLite solo para tests) y JSON como formato de serialización (en la columna `estado_json`, en el intercambio HTTP y en el respaldo de `localStorage`). Documento de apoyo para la sustentación.

---

## 0. Resumen ejecutivo

El repo pasó de **funcionar 100% en el navegador** (localStorage + `MockServer`) a tener una **base de datos PostgreSQL real** en el backend y una **capa HTTP/JSON** que la conecta con el frontend. El juego quedó así:

| Escenario | Qué pasa |
|---|---|
| Backend arriba | Autenticación (cookie httpOnly), cuentas, partidas, poderes e historial viven en **PostgreSQL** (sobreviven reinicios). |
| Backend caído | Las partidas y los datos no críticos caen a los **respaldos locales** (`localStorage` + `MockServer`); la autenticación es la excepción: requiere el servidor. |
| Servidor responde con error (400/401/403) | Ese error es la verdad del servidor y **se propaga** — no se falsea con datos locales. |

**Dónde vive el JSON (3 sitios):**

1. **Columna `estado_json`** de la tabla `partidas`: la partida entera (jugadores, tablero, eventos, poderes) serializada como JSON.
2. **JSON por HTTP**: cada `fetch` entre frontend y backend envía/recibe JSON.
3. **JSON en `localStorage`**: mismo formato, pero como respaldo offline.

---

## 1. SQL — la base de datos

### 1.1 Esquema (`sql/esquema.sql` — PostgreSQL)

El esquema canónico vive en `sql/esquema.sql` (raíz del repo), es **idempotente** y lo aplica cada PC con `npm run db:setup` usando su propio `.env`. Al arrancar, `DatabasePostgres.init()` lo vuelve a aplicar por si falta algo. Sobre `memoria_ninja` crea **7 tablas, 6 vistas, 5 triggers y 90 funciones/procedimientos**.

```sql
-- partidas: EL cuerpo se guarda como JSON en estado_json
partidas(id, estado_json, creada_en, actualizada_en);

-- usuarios: contraseña SOLO como hash scrypt ("sal:hash") + estado de cuenta
usuarios(id, usuario UNIQUE, correo UNIQUE, password_hash, nacimiento, creado_en,
         xp, victorias, derrotas, racha, puntaje_max,
         correo_verificado, intentos_fallidos, bloqueado_hasta);

-- historial: un registro por partida jugada, con FK al usuario
historial_partidas(id, id_usuario REFERENCES usuarios(id), id_partida, zona,
                   puntaje, modo, ganador, jugada_en);

-- auth: códigos de verificación/recuperación, sesiones y auditoría
codigos_verificacion(...);   sesiones(...);   auditoria_cuentas(...);
```

> `DatabaseSqlite` (SQLite nativo vía `node:sqlite`, cero dependencias npm) se conserva **solo para los tests** (persistencia de partidas y migración de perfil). La aplicación corre **únicamente PostgreSQL** (`DatabasePostgres`, cliente asíncrono).

### 1.2 Repositorios (capa de acceso a datos)

| Archivo | Rol | Clave |
|---|---|---|
| `src/repositories/PartidaRepositorySQL.js` | Guarda/lee partidas en SQL | `estado_json` en `JSON.stringify`/`JSON.parse` |
| `src/repositories/UsuarioRepositorySQL.js` | CRUD + estado de cuenta (verificación, intentos, bloqueo) | `usuario`/`correo` UNIQUE, nunca expone el hash |
| `src/repositories/HistorialPartidaRepositorySQL.js` | Insert/select de historial | FK a `usuarios(id)` |
| `src/repositories/CodigoVerificacionRepositorySQL.js` | Códigos de verificación/recuperación | `fn_confirmar_codigo` compara hashes sha256 |
| `src/repositories/SesionRepositorySQL.js` | Sesiones de la cookie httpOnly | se revocan al cambiar la contraseña |
| `src/repositories/VistaRepositorySQL.js` / `ProcedimientoRepositorySQL.js` | Consultas a vistas / `CALL sp_registrar_partida(...)` | SQL avanzado |
| `src/repositories/PartidaRepositoryMemoria.js` | Implementación en memoria (tests) | misma interfaz → **LSP** |
| `src/repositories/PartidaRepositoryArchivo.js` | Implementación en archivos JSON en disco (`{id}.json`) | misma interfaz → **LSP**; `obtener()` **vuelve al disco** si el cache en memoria está vacío (sobrevive reinicios) |
| `src/infraestructura/PasswordHasher.js` | Cifra contraseñas con scrypt | `sal:hash`, nunca texto plano |

**El corazón del "SQL + JSON": `PartidaRepositorySQL.guardar()`**
```js
const estado = {
  jugadores: /* {id: {nombre, chakra, vida}} */,
  tablero:   { /* fila y columnas con ids de cartas */ },
  eventos:   partida.eventos,
  poderesActivos: partida.poderesActivos,
};
db.prepare("INSERT INTO partidas (id, estado_json, creada_en, actualizada_en) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET estado_json = excluded.estado_json, actualizada_en = excluded.actualizada_en")
  .run(partida.id, JSON.stringify(estado), ahora, ahora);
```
Y `obtener()` hace el proceso inverso: `JSON.parse(estado_json)` → reconstruye `Jugador`/`Tablero` reales.

> El mismo repositorio funciona con ambos motores: `DatabasePostgres` traduce los placeholders `?` a `$n` y `rowid` a `ctid`, y sus métodos de escritura hacen `await` del `.run()`. Por eso el repositorio es agnóstico — con SQLite (tests) es síncrono y con PostgreSQL (app) es asíncrono.

> **`PartidaRepositoryArchivo` (JSON en disco) — misma fidelidad, sin cache perdido.** El fix que igualó a SQL: `guardar()` serializa toda la partida a `{carpeta}/{id}.json` y `obtener()` consulta primero el **cache en memoria** y, si falla (p. ej. tras un reinicio del servidor), **vuelve al disco** y **materializa la ENTIDAD** real con sus métodos encapsulados:
>
> ```js
> obtener(idPartida) {
>   this.cacheEnMemoria ??= new Map();
>   if (this.cacheEnMemoria.has(idPartida)) {
>     return this.cacheEnMemoria.get(idPartida);   // cache hit → retorno directo
>   }
>   const ruta = this.#rutaDe(idPartida);
>   if (!fs.existsSync(ruta)) return null;         // misses → null (contrato)
>   const foto = JSON.parse(fs.readFileSync(ruta, "utf8")); // deserialización
>   const partida = this.#reconstruirPartida(foto);         // hidratación
>   this.cacheEnMemoria.set(idPartida, partida);            // repoblar cache
>   return partida;
> }
> ```
>
> `#reconstruirPartida()` es el mismo corazón que `PartidaRepositorySQL.#reconstruirPartida()`: crea `Jugador` con `ganarChakra()`/`recibirDanio()` (multiplicación solo vía la API encapsulada, nunca `jugador.chakra = x`) y recompone `Partida` con sus `eventos`, `poderesActivos` (por id) y un `Tablero` nuevo. Antes este repositorio **escribía el JSON pero leía solo del cache** → al reiniciar devolvía `null`; ahora la partida sobrevive, igual que en SQLite.

> **Prueba LSP**: la misma batería de tests de contrato (`tests/contratoPartidaRepository.js`) corre contra las 3 implementaciones y las 3 pasan. Cambiar de una a otra no toca el Service.

### 1.3 Servicios y endpoints

**Poderes / partidas / cuentas**

| Endpoint | Método | Servicio | Qué hace |
|---|---|---|---|
| `/api/partida` | POST | `PartidaService.crearPartida` | Valida jugadores/chakra, crea `Partida(UUID)` y la persiste |
| `/api/poder/activar` | POST | `PoderService.activarPoder` | Valida chakra/contraataques, cambia el estado y lo vuelve a persistir |
| `/api/usuarios` | GET | `UsuarioService.obtenerTodos` | Lista usuarios sin hashes |
| `/api/usuarios/por-correo/:correo` | GET | `UsuarioService.buscarPorCorreo` | Busca por correo (validar duplicados) |
| `/api/usuarios/:id/historial` | GET/POST | `UsuarioService.obtenerHistorial` / `guardarResultadoPartida` | Historial por usuario |
| `/api/usuarios/:id/perfil` | GET/POST | `UsuarioService.obtenerPerfil` / `registrarFinPartidaPerfil` | XP y estadísticas |

**Autenticación (`AuthService`, `VerificacionService`, `RecuperacionService`)**

| Endpoint | Método | Qué hace |
|---|---|---|
| `/api/auth/registro` | POST | Crea la cuenta (nace sin verificar) |
| `/api/auth/login` | POST | Verifica credenciales; fija cookie httpOnly. 403 si no está verificada |
| `/api/auth/logout` | POST | Cierra sesión y borra la cookie |
| `/api/auth/me` | GET | Sesión activa (401 sin cookie válida) |
| `/api/auth/verificacion/enviar` \| `/confirmar` | POST | Reenvía / confirma el código de correo |
| `/api/auth/recuperacion/solicitar` \| `/verificar` \| `/restablecer` | POST | Recuperación de contraseña en 3 pasos |

**SQL avanzado**

| Endpoint | Método | Qué hace |
|---|---|---|
| `/api/vistas/*` | GET | `vw_partidas_recientes`, `vw_historial_detallado`, `vw_ranking_mejor_puntaje`, `vw_usuarios_resumen` |
| `/api/procedimientos/registrar-partida` | POST | `CALL sp_registrar_partida(...)` |
| `/api/estado` | GET | Healthcheck |

> **Composition Root**: en `server.js` es el ÚNICO lugar donde se hace `new` de las implementaciones. Todo lo demás recibe sus dependencias por constructor. Eso es DIP en vivo.

---

## 2. JSON en el intercambio HTTP (frontend ↔ backend)

### 2.1 Repositorios HTTP del frontend (`js/infraestructura/repositorios/`)

| Archivo | Rol |
|---|---|
| `HttpUsuarioRepositorio.js` | Cliente HTTP de usuarios (base `/api`, `credentials:"include"`): `obtenerTodos`, `buscarPorCorreo`, `buscarPorCredenciales` (POST `/auth/login`), `guardar` (POST `/auth/registro`). Lanza `ErrorDeConexion` tipado cuando el backend no responde. |
| `HttpAuthRepositorio.js` | Cliente del módulo de autenticación: `enviarCodigoVerificacion`, `confirmarCodigoVerificacion`, `solicitarRecuperacion`, `verificarCodigoRecuperacion`, `restablecerPassword`. |
| `HttpHistorialRepositorio.js` | `historialApi.obtener(idUsuario)` / `guardar({zona, puntaje, modo, ganador})`. Best-effort. |

```js
// HttpUsuarioRepositorio — login real contra /api/auth (cookie httpOnly)
async buscarPorCredenciales(usuario, password) {
  const cuerpo = await this.#peticion("/auth/login", {
    method: "POST",
    body: JSON.stringify({ usuario, password })
  });
  return this.#aEntidad(cuerpo.usuario);   // mapea el JSON del servidor a la entidad
}
```

### 2.2 Composición en cada página

| Archivo | Qué instancia ahora |
|---|---|
| `js/login.js` | `HttpUsuarioRepositorio` directo → `POST /api/auth/login` (la sesión real vive en la cookie httpOnly, no en `localStorage`). |
| `js/registro.js` | `HttpUsuarioRepositorio` directo → `POST /api/auth/registro`; al terminar redirige a `verificacion.html`. |
| `js/verificacion.js` / `js/recuperar.js` | `HttpAuthRepositorio` (server-driven: los códigos los emite y valida el servidor). |
| `js/menu.js` | `actualizarHistorial()`: lee del backend si hay sesión con `id`; si no, cae a `localStorage`. |

### 2.3 Costo real del desacople

`HttpUsuarioRepositorio` usa `fetch` (asíncrono), así que la cadena pasó a `async`:

`AutenticacionService.iniciarSesion` → `LoginController.manejarEnvio` → `login()` de `js/login.js`

Ese "efecto colateral" es la prueba de que el cambio es real: el dato ya no vive en el documento.

---

## 3. El motor en vivo habla con el backend

### 3.1 Proveedor de datos (`js/nucleo-GAME ONLI/datos/`)

- `ProveedorDatos.js` — interfaz: `obtenerDatos()` (y `notificarPoder()` opcional, no-op por defecto → **ISP**).
- `ProveedorDatosSimulado.js` — envuelve el `MockServer` (fallback).
- **`ProveedorDatosServidor.js` (nuevo)** — impl. real:

```js
// Crear la partida real en el backend y devolver el MISMO formato que el MockServer
const respuesta = await fetch(`${URL_BASE}/partida`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ idJugador1: "sasuke", nombre1, idJugador2: "naruto", nombre2,
                         chakraInicial1, chakraInicial2 }),
});
// ... mapea a { room, players } y guarda this.idPartida
```

Si el servidor no responde → `catch` → devuelve `respaldo.obtenerDatos()` (el MockServer).

### 3.2 Poderes que se sincronizan (`poderes/Poder.js` + `GestorPartida.js`)

Al final de `Poder.activar()` (Template Method) se avisa al servidor por un hook OPCIONAL:

```js
// En Poder.activar(), tras aplicar el efecto local:
const notificar = contexto.notificarPoderAlServidor;
if (typeof notificar === "function") {
  const promesa = notificar(this.id, esSasuke);  // → POST /api/poder/activar
  if (promesa?.catch) promesa.catch(() => {});
}
```

`GestorPartida.js` provee el hook en el `contexto`, delegando en `ProveedorDatosServidor.notificarPoder()`. El backend valida el chakra, registra el evento y **persiste el nuevo estado en `estado_json`**.

> Flujo completo verificado: `POST /api/partida` → genjutsu (chakra 70→35) → **reinicio del servidor** → byakugan sobre la misma partida (35→15). La partida sobrevivió al reinicio.

---

## 4. Qué tocó cada commit

| Commit | Qué contiene |
|---|---|
| `9c55c68` | Persistencia SQL inicial (esquema, repos, usuarios/historial, scrypt), endpoints de usuarios, frontend HTTP de login/registro/historial, juegos con POST best-effort. |
| `206714b` | `POST /api/partida` real, `ProveedorDatosServidor`, hook de poderes → servidor, fix de rutas en `ByakuganPoder`, AGENTS.md corregido. |
| `c718dae` | `ErrorDeConexion` + `RepositorioUsuariosConRespaldo`: datos a prueba de daños sin backend. |
| (posterior) | Módulo de autenticación real (registro→verificación→login con cookie httpOnly→recuperación), migración a **PostgreSQL** como motor único, vistas y procedimientos, y `sql/esquema.sql` como fuente de verdad. |

---

## 5. Tests (166/166 verdes — 25 suites)

| Archivo | Qué cubre |
|---|---|
| `tests/contratoPartidaRepository.js` | La MISMA batería contra Memoria, Archivo y SQL (**LSP**) |
| `tests/partidaRepositorySQL.test.js` | Round-trip SQL + JSON, sobrescritura, ids aislados, **persistencia tras reinicio** |
| `tests/partidaRepositoryArchivo.test.js` | Round-trip JSON en disco, **persistencia tras reinicio (instancia nueva, cache vacío)**, restauración fiel de chakra/vida, `null` si no existe el `.json` |
| `tests/partidaService.test.js` | Crear+persistir, chakra personalizado, ids distintos, validación 0-100 |
| `tests/usuarioService.test.js` | Registro→login→historial→`obtenerTodos`→`buscarPorCorreo` (PostgreSQL) |
| `tests/usuarioPerfil.test.js` | XP/estadísticas + migración de perfil SQLite |
| `tests/procedimientoService.test.js` | `sp_registrar_partida` + vista `vw_historial_detallado` (PostgreSQL) |
| `tests/poderService.test.js` | Activación, contraataques, chakra insuficiente |
| `tests/gestorSalas.test.js` | Salas 1v1/2v2, turnos, vida/chakra/tiempos, 6 poderes y contrarrestos (Socket.io) |
| `tests/authE2e.test.js` | e2e real: levanta `server.js` y recorre registro→verificación→login/cookie→logout→recuperación por HTTP |

```bash
cd backend-poderes
npm test     # 166 passing, 0 failing (el pretest aplica el esquema a memoria_ninja_test)
```

---

## 6. Cómo levantarlo

```bash
# 1) Configurar por máquina (cada PC tiene su .env, gitignored)
cd backend-poderes
cp .env.example .env          # Windows: Copy-Item .env.example .env
#   completar PGPASSWORD (y PGPORT/PGDATABASE si difieren)

# 2) Aplicar el esquema canónico (idempotente)
npm run db:setup              # base de producción
npm run db:test-setup         # base de pruebas

# 3) Arrancar
npm install
npm start                     # http://localhost:3000 (sirve el frontend en el mismo origen)

# Frontend: abrir http://localhost:3000/login.html (mismo origen → cookies httpOnly OK)
```