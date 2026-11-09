/*=========================================================
  MEMORIA NINJA — PRUEBAS
  ARCHIVO: tests/helpers/baseDatosPrueba.js

  Helper compartido para que los tests de integración corran
  contra POSTGRESQL (memoria_ninja_test) en vez de un SQLite en
  memoria. Así se prueba el MISMO motor que usa la app.

  - crearDatabasePrueba(): conexión a PGDATABASE_TEST (.env).
  - limpiarDatabase(): deja las 7 tablas vacías entre tests para
    que cada uno arranque aislado (mismo efecto que una base
    recién creada).
=========================================================*/

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const DatabasePostgres = require("../../src/infraestructura/DatabasePostgres");

const TABLAS = [
  "auditoria_cuentas",
  "codigos_verificacion",
  "sesiones",
  "historial_partidas",
  "jugadores",
  "partidas",
  "usuarios",
];

function crearDatabasePrueba() {
  return new DatabasePostgres({
    database: process.env.PGDATABASE_TEST || "memoria_ninja_test",
  });
}

async function limpiarDatabase(database) {
  // CASCADE limpia también las tablas con FK hacia las listadas.
  await database.query(`TRUNCATE ${TABLAS.join(", ")} RESTART IDENTITY CASCADE`);
}

module.exports = { crearDatabasePrueba, limpiarDatabase, TABLAS };
