"use strict";

/**
 * db-setup.js — Crea la base de datos (si falta) y le aplica el esquema.
 *
 * Uso:
 *   npm run db:setup          # aplica en PGDATABASE
 *   npm run db:test-setup     # crea y aplica en PGDATABASE_TEST
 *   node scripts/db-setup.js --database otra_base
 *
 * Lee la configuración del archivo .env (dotenv) o de variables de entorno.
 * Mismo comportamiento en CUALQUIER PC: solo cambia el .env de cada máquina.
 */
require("dotenv").config();
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const RUTA_ESQUEMA = path.join(__dirname, "..", "..", "sql", "esquema.sql");

const objetivo = argumento("--database")
  || (usaTest() ? process.env.PGDATABASE_TEST
                : process.env.PGDATABASE) || "memoria_ninja";

const config = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
};

function argumento(nombre) {
  const indice = process.argv.indexOf(nombre);
  return indice >= 0 ? process.argv[indice + 1] : undefined;
}

function usaTest() {
  return process.argv.includes("--test");
}

async function main() {
  if (!config.password) {
    console.error(
      "Falta PGPASSWORD. Copia .env.example a .env y completa tus credenciales de PostgreSQL."
    );
    process.exit(1);
  }
  if (!/^[a-zA-Z0-9_]+$/.test(objetivo)) {
    console.error(`Nombre de base inválido: '${objetivo}'`);
    process.exit(1);
  }

  // 1) Conexión administrativa para crear la base si no existe.
  const admin = new Client({ ...config, database: "postgres" });
  await admin.connect();
  const existe = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [objetivo]
  );
  if (existe.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${objetivo}"`);
    console.log(`Base de datos '${objetivo}' creada.`);
  } else {
    console.log(`Base de datos '${objetivo}' ya existía.`);
  }
  await admin.end();

  // 2) Aplicar el esquema idempotente sobre la base objetivo.
  if (!fs.existsSync(RUTA_ESQUEMA)) {
    console.error(`No se encontró el esquema en: ${RUTA_ESQUEMA}`);
    process.exit(1);
  }
  const cliente = new Client({ ...config, database: objetivo });
  await cliente.connect();
  const sql = fs.readFileSync(RUTA_ESQUEMA, "utf8");
  await cliente.query(sql);
  console.log(`Esquema aplicado en '${objetivo}'.`);

  // 3) Resumen de objetos creados.
  const resumen = await cliente.query(
    `SELECT
       (SELECT count(*) FROM pg_tables  WHERE schemaname = 'public') AS tablas,
       (SELECT count(*) FROM pg_views   WHERE schemaname = 'public') AS vistas,
       (SELECT count(*) FROM pg_trigger t
         JOIN pg_class c ON c.oid = t.tgrelid
        WHERE NOT t.tgisinternal
          AND c.relnamespace = 'public'::regnamespace) AS triggers,
       (SELECT count(*) FROM pg_proc
         WHERE pronamespace = 'public'::regnamespace
           AND prokind IN ('f','p')) AS funciones_procs`
  );
  console.log("Resumen:", resumen.rows[0]);
  await cliente.end();
}

main().catch((error) => {
  console.error("Error en db:setup:", error.message);
  process.exit(1);
});