# Cómo ver TODO con contenido en pgAdmin

Esta guía te lleva paso a paso para que veas **tablas, vistas, funciones,
procedimientos y triggers** con datos, y cómo **ejecutarlos**.

> Resumen: 1) conectás pgAdmin, 2) corrés el seed, 3) pegás `sql/consultas-demo.sql`
> en la Query Tool. Listo: todo tiene filas.

---

## 1) Conectar pgAdmin a esta base

Creá un servidor en pgAdmin con los datos del `.env` (`backend-poderes/.env`):

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Port | **`6767`** (no el 5432 por defecto) |
| Maintenance database | `postgres` |
| Username | `postgres` |
| Password | `123456` |

Luego expandí en el árbol de la izquierda:

```
Servers -> (tu servidor) -> Databases -> memoria_ninja -> Schemas -> public
```

Dentro de `public` vas a ver las carpetas: **Tables**, **Views**, **Functions**,
**Procedures** y (anidados) los **Triggers**.

---

## 2) Cargar los datos simulados (una sola vez)

En una terminal, dentro de `backend-poderes/`:

```bash
npm run seed:demo
```

Eso llena `memoria_ninja` con 7 cuentas demo (clave **`clave123`**), 6 partidas,
9 resultados, 3 jugadores legacy, códigos, sesiones y auditoría. Es re-ejecutable:
borra solo lo demo (`@demo.ninja`) y lo vuelve a crear.

> Alternativa sin Node: pegá **`sql/datos-simulados.sql`** en la Query Tool y F5.

---

## 3) Dónde está el CÓDIGO de cada objeto

| Objeto | Dónde en pgAdmin | Ver su código |
|---|---|---|
| **Tablas** | `public -> Tables -> <tabla>` | Click derecho -> *Properties*; o *View/Edit Data -> All Rows* |
| **Vistas** | `public -> Views -> <vista>` | Click derecho -> *Properties -> Definition*, o *View/Edit Data -> All Rows* |
| **Funciones** | `public -> Functions -> <fn>` | Click derecho -> *Properties -> Definition* (o *Scripts -> CREATE Script*) |
| **Procedimientos** | `public -> Procedures -> <sp>` | Igual que las funciones |
| **Triggers** | `public -> Tables -> <tabla> -> Triggers` | Click derecho -> *Properties -> Definition* (muestra la función que ejecuta) |

También, sin salir de la Query Tool (ver sección 7 de `consultas-demo.sql`):

```sql
-- Definición de una vista
SELECT pg_get_viewdef('vw_ranking_mejor_puntaje', true);

-- Código de funciones y procedimientos
SELECT proname, prosrc FROM pg_proc
 WHERE proname IN ('fn_confirmar_codigo','sp_registrar_partida',
                   'sp_crear_partida_completa','sp_restablecer_password',
                   'fn_auditar_usuario','fn_invalidar_codigo_previo');

-- Lista de triggers
SELECT event_object_table AS tabla, trigger_name, action_timing, event_manipulation
  FROM information_schema.triggers ORDER BY tabla;
```

**Fuente única de verdad:** todo el esquema (tablas, vistas, triggers, funciones)
está en `sql/esquema.sql`.

---

## 4) Ejecutarlos y ver qué "botan"

Abrí **Tools -> Query Tool** sobre `memoria_ninja`. Ahí ejecutás:

- **Tablas / vistas** -> `SELECT * FROM ...;` (verás filas).
- **Procedimientos** -> `CALL sp_...;` (verás "Success" y el efecto en las tablas).
- **Funciones** -> `SELECT fn_...;` (devuelven un valor, ej. `OK`).

Todo esto ya está escrito y listo para pegar en **`sql/consultas-demo.sql`**.

Reglas rápidas:

- Para `CALL` con un id que sale de otra consulta: PostgreSQL **no permite
  subconsultas dentro de `CALL`**, por eso `consultas-demo.sql` usa bloques `DO`
  (resuelven el id y llaman al procedimiento).
- Los **triggers** no se ejecutan a mano: se disparan solos al `INSERT`/`UPDATE`.
  Para verlos actuar, ejecutá un `UPDATE` y consultá la tabla afectada (ej.
  `auditoria_cuentas`).
- `fn_confirmar_codigo` está pensada para llamarse **dentro de una transacción**
  (el backend lo hace desde `DatabasePostgres.transaccion`). En la Query Tool
  funciona igual si envolvés la llamada en `BEGIN; ... COMMIT;`.

---

## 5) Orden recomendado

1. `npm run seed:demo` (llena todo).
2. Pegar `sql/consultas-demo.sql` en la Query Tool y ejecutar por secciones.
3. Explorar los objetos en el árbol de pgAdmin (sección 3) para ver su código.
