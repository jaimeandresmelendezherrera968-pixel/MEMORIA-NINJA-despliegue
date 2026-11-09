# Backend de Poderes — Memorice Duel

Backend en **Node.js + Express** sobre **PostgreSQL** con arquitectura en
capas, POO y los 5 principios SOLID. Cubre tres cosas:

1. El sistema de los **6 poderes** (Byakugan, Sustitución, Robo de Chakra,
   Genjutsu, Sello, Bomba Explosiva).
2. El **módulo de autenticación** real: registro → verificación por código
   de correo → login con cookie httpOnly → recuperación de contraseña.
3. El **perfil de juego** (XP y estadísticas), el historial de partidas y
   consultas SQL avanzadas (vistas y procedimientos almacenados).

El mismo servidor también sirve el frontend versionado (mismo origen, así
las cookies httpOnly funcionan sin complicaciones de CORS).

## Requisitos

- Node.js 22+ (`node:sqlite` y `fetch` globales).
- PostgreSQL corriendo y accesible.

## Configuración (por máquina)

Las credenciales **no** viven en el repo: cada PC tiene su propio `.env`
(ignorado por git).

```bash
cp .env.example .env      # Windows: Copy-Item .env.example .env
```

Completá al menos `PGPASSWORD` (y `PGPORT`/`PGDATABASE` si difieren). El
backend **no arranca** si faltan `PGPASSWORD`/`PGDATABASE` (fail-fast): no
cae a ningún motor alternativo. Variables disponibles en `.env.example`
(`DB_TYPE`, `PG*`, `MAILER`, `SMTP_*`, `COOKIE_TTL_MIN`, `SERVER_PORT`).

Aplicá el esquema canónico (`sql/esquema.sql`, idempotente: 7 tablas, 6
vistas, 5 triggers, 90 funciones/procedimientos):

```bash
npm run db:setup          # base de producción (.env -> PGDATABASE)
npm run db:test-setup     # base de pruebas  (.env -> PGDATABASE_TEST)
```

## Datos de demostración (para ver todo con contenido)

Para que **ninguna tabla ni vista quede vacía** al abrirla en pgAdmin, y para
poder **probar el login de verdad**:

```bash
npm run seed:demo         # llena PGDATABASE con datos demo (idempotente)
```

Crea 7 cuentas temáticas (`sasuke`, `sakura`, `kakashi`, `hinata`,
`shikamaru`, `rocklee`, `gaara`), todas con correo `@demo.ninja` y clave
`clave123`; más partidas, historial, jugadores legacy, códigos, sesiones y
auditoría generada por los triggers. Ejercita los 3 procedimientos y
`fn_confirmar_codigo`. Es re-ejecutable: borra **solo** lo demo y lo recrea.

- Versión SQL pura: `sql/datos-simulados.sql`.
- Consultas listas para pegar en pgAdmin: `sql/consultas-demo.sql`.
- Guía paso a paso: `sql/COMO-VER-EN-PGADMIN.md`.

## Cómo correrlo

```bash
npm install
npm start                 # http://localhost:3000 (SERVER_PORT)
```

La variable `MAILER` elige cómo se envían los códigos:
- `consola` (por defecto): los imprime en la consola del servidor
  (`... es: 123456`) — ideal para desarrollo y para el test e2e.
- `ethereal`: los manda a Ethereal (demo; da una URL de vista previa, pero
  **nunca llega a un buzón real**).
- `smtp`: **SMTP real** (Gmail, Resend, Brevo…) usando `SMTP_HOST`,
  `SMTP_PORT`, `SMTP_USER` y `SMTP_PASS` (ver `.env.example`). Si faltan
  esas variables, el backend **no arranca** (fail-fast). En Gmail hace falta
  activar la verificación en 2 pasos y usar una **contraseña de aplicación**.

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| GET  | `/api/estado` | Healthcheck |
| POST | `/api/poder/activar` | Activa un poder (`idPartida`, `idJugador`, `idPoder`) |
| POST | `/api/partida` | Crea y persiste una partida |
| POST | `/api/partida/prueba` | Partida demo (Naruto vs Sasuke, 50 de chakra) |
| GET  | `/api/usuarios` | Lista usuarios públicos (sin hash) |
| GET  | `/api/usuarios/por-correo/:correo` | Busca usuario por correo |
| GET  | `/api/usuarios/:id/historial` | Historial de partidas del usuario |
| POST | `/api/usuarios/:id/historial` | Registra un resultado |
| GET  | `/api/usuarios/:id/perfil` | Perfil XP/estadísticas (404 si no existe) |
| POST | `/api/usuarios/:id/perfil` | Actualiza perfil al terminar una partida |
| POST | `/api/auth/registro` | Registro (cuenta nace sin verificar) |
| POST | `/api/auth/login` | Login; fija la cookie `memoria_ninja_sesion` (httpOnly) |
| POST | `/api/auth/logout` | Cierra la sesión y borra la cookie |
| GET  | `/api/auth/me` | Devuelve la sesión activa (401 sin cookie válida) |
| POST | `/api/auth/verificacion/enviar` | Reenvía el código de verificación |
| POST | `/api/auth/verificacion/confirmar` | Confirma el correo con el código |
| POST | `/api/auth/recuperacion/solicitar` | Envía código de recuperación |
| POST | `/api/auth/recuperacion/verificar` | Verifica el código sin consumirlo |
| POST | `/api/auth/recuperacion/restablecer` | Cambia la contraseña con el código |
| GET  | `/api/vistas/*` | Consultas a las vistas (`partidas-recientes`, `historial-detallado`, `ranking`, `usuarios-resumen`) |
| POST | `/api/procedimientos/registrar-partida` | `CALL sp_registrar_partida(...)` |

### Flujo de autenticación

1. `POST /api/auth/registro` → 201, cuenta con `correoVerificado=false`.
2. `POST /api/auth/login` antes de verificar → **403**.
3. `POST /api/auth/verificacion/confirmar` con el código → 200.
4. `POST /api/auth/login` → 200 + cookie httpOnly; `GET /api/auth/me` la usa.
5. `POST /api/auth/logout` revoca la sesión. Cambiar la contraseña revoca
   todas las sesiones anteriores.

Controles: contraseñas con `scrypt` (`PasswordHasher`), códigos hasheados con
sha256 determinista (`CodigoHasher`, para que `fn_confirmar_codigo` los
compare por igualdad), límite de intentos y bloqueo temporal, rate-limit en
`/api` y `/api/auth`, `helmet`, `cors` con credenciales.

## Estructura de carpetas (patrón en capas)

```
server.js                          ← raíz de composición (único lugar con "new")
sql/esquema.sql                    ← esquema canónico de PostgreSQL (fuente de verdad)
sql/datos-simulados.sql            ← seed demo (versión SQL pura, idempotente)
src/
  entities/                        ← Jugador, Partida, Tablero, Usuario (datos + reglas)
    poderes/                       ← Poder (abstracta) + los 6 poderes concretos
  factories/PoderFactory.js        ← Factory Method de poderes
  repositories/                    ← contratos + implementaciones
    PartidaRepository(.js|Memoria|Archivo|SQL)
    UsuarioRepository(.js|SQL)     HistorialPartidaRepositorySQL
    CodigoVerificacionRepository(.js|SQL)   SesionRepository(.js|SQL)
    VistaRepositorySQL   ProcedimientoRepositorySQL
  services/                        ← lógica de negocio (Poder, Partida, Usuario,
                                     Auth, Verificacion, Recuperacion, Vista, Procedimiento)
  controllers/                     ← solo traducen HTTP <-> Service
  routes/                          ← definen las rutas Express por recurso
  infraestructura/                 ← DatabasePostgres, DatabaseSqlite, PasswordHasher,
                                     CodigoHasher/Generador, *NotificadorCorreo
  utils/errores.js
tests/                             ← suite de contratos + integración + e2e
scripts/db-setup.js                ← aplica sql/esquema.sql (--test para la base de pruebas)
scripts/seed-demo.js               ← datos demo (npm run seed:demo)
diagramas/                         ← arquitectura.mermaid, clases.mermaid
```

**Motores:** la app corre **solo PostgreSQL** (`DatabasePostgres`, cliente
asíncrono, aplica `sql/esquema.sql` al iniciar). `DatabaseSqlite` se conserva
únicamente para los tests de persistencia de partidas y la migración de perfil
—los repositorios SQL son agnósticos y funcionan con ambos.

## Correr los tests

```bash
npm test
```

Corre **166 tests en 25 suites**, todos verdes. El `pretest` aplica el esquema
a `memoria_ninja_test`. La mayoría son **tests de contrato**: la misma batería
corre contra varias implementaciones de `PartidaRepository` (memoria, archivo,
SQL) y contra los 6 poderes → **el LSP está verificado con tests, no prometido**.

Para validar sintaxis sin tocar la base:

```bash
npm run check:js
```

Los tests de integración (`usuarioService`, `usuarioPerfil`,
`procedimientoService`) corren contra PostgreSQL. `tests/authE2e.test.js`
levanta el servidor real como proceso hijo y recorre el flujo de
autenticación completo por HTTP.

## Dónde está cada cosa que te va a pedir el instructor

| Concepto | Dónde está |
|---|---|
| **Abstracción** | `Poder.js` (abstracta), `PartidaRepository.js` / `UsuarioRepository.js` (interfaces) |
| **Encapsulamiento** | `Jugador.js` — `#chakra` y `#vida` privados; `Usuario.js` oculta el hash |
| **Herencia** | Los 6 poderes extienden `Poder` |
| **Polimorfismo** | `PoderService.activarPoder()` llama siempre `poder.activar(contexto)`; cada poder responde distinto |
| **SRP** | Controller solo HTTP, Service solo lógica, Repository solo persistencia, Factory solo construcción |
| **OCP** | Poder nuevo = clase que hereda de `Poder` + `fabrica.registrar(id, Clase)`; no se toca el Service |
| **LSP** | 3 implementaciones de `PartidaRepository` y los 6 poderes pasan la misma batería de contratos |
| **ISP** | Contratos mínimos por repositorio (`PartidaRepository`: `obtener`/`guardar`) |
| **DIP** | `server.js` arma todo con `new` y lo inyecta por constructor; los Services nunca instancian dependencias. `tests/poderService.test.js` lo prueba con un repositorio de juguete |
| **Patrones** | `Poder` + hijos = **Strategy**; `PoderFactory` = **Factory Method**; repositorios intercambiables = **Repository** |

## Qué falta si querés seguir de acá

- Multijugador real por internet (salas + WebSockets/Socket.io): proyecto aparte.
- Publicar con HTTPS y `MAILER=smtp` (Gmail: verificación en 2 pasos + contraseña de aplicación).
