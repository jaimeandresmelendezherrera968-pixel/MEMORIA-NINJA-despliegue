# Memoria Ninja (Memorice Duel)

Juego de memoria temático de Naruto. **Frontend vanilla** (HTML/CSS/JS, sin
bundler) + **backend Node.js + Express sobre PostgreSQL**.

- Interfaz y comentarios en **español**.
- Sin build system, sin linter ni CI: cada página es un HTML + su CSS + su JS.
  Hay un chequeo de sintaxis con `npm run check:js` desde `backend-poderes/`.
- El backend también sirve el frontend (mismo origen), así las cookies
  httpOnly de sesión funcionan sin líos de CORS.

## Estructura

```
.                              ← frontend estático (HTML + js/ + css/ + assets/)
  login.html → menu.html → game-online.html   (flujo de entrada)
  js/                                       (capas SOLID del frontend)
  backend-poderes/                          ← backend Node.js (su propio package.json)
    server.js, src/, sql/esquema.sql, tests/, scripts/db-setup.js
  Agrupar/                                  ← prototipo legado (NO modificar)
  MAPA-ARQUITECTURA.md   SQL-JSON-IMPLEMENTACION.md   AGENTS.md
```

## Cómo correrlo

El servidor de `backend-poderes` sirve TODO (backend + frontend) en el mismo
puerto:

```bash
cd backend-poderes
npm install
cp .env.example .env        # Windows: Copy-Item .env.example .env
#   completar PGPASSWORD (y PGPORT/PGDATABASE si difieren)
npm run db:setup            # aplica sql/esquema.sql (idempotente)
npm run seed:demo           # (opcional) llena la base con datos demo para ver todo con contenido
npm start                   # http://localhost:3000
```

Luego abrí `http://localhost:3000/login.html`.

> Las credenciales viven en `backend-poderes/.env` (ignorado por git): cada PC
> usa el suyo. El backend **no arranca** si faltan `PGPASSWORD`/`PGDATABASE`.
> `MAILER` elige el correo: `consola` (por defecto, imprime el código en la
> consola del servidor), `ethereal` (demo, URL de vista previa) o `smtp`
> (correo real; requiere `SMTP_*` — en Gmail, contraseña de aplicación).

## Tests

```bash
cd backend-poderes
npm test                    # 166 tests / 25 suites (incluye un e2e de auth)
npm run check:js            # sintaxis de todo el JS del repo (frontend + backend)
```

## Documentación

| Documento | Qué contiene |
|---|---|
| `AGENTS.md` | Guía para agentes: estructura, convenciones y gotchas |
| `MAPA-ARQUITECTURA.md` | Qué concepto del temario vive en qué archivo (capas, SOLID, patrones) |
| `SQL-JSON-IMPLEMENTACION.md` | Persistencia (PostgreSQL + JSON), repositorios y endpoints |
| `backend-poderes/README.md` | El backend en detalle: config, endpoints, tests |
| `sql/COMO-VER-EN-PGADMIN.md` | Cómo ver tablas/vistas/funciones/triggers con datos en pgAdmin |
