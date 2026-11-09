const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DatabaseSqlite = require("../src/infraestructura/DatabaseSqlite");
const PasswordHasher = require("../src/infraestructura/PasswordHasher");
const UsuarioRepositorySQL = require("../src/repositories/UsuarioRepositorySQL");
const HistorialPartidaRepositorySQL = require("../src/repositories/HistorialPartidaRepositorySQL");
const UsuarioService = require("../src/services/UsuarioService");
const { crearDatabasePrueba, limpiarDatabase } = require("./helpers/baseDatosPrueba");

/**
 * Perfil de juego: toda cuenta nace con 500 XP y el resto en 0, y cada
 * partida de 1 jugador actualiza XP/victorias/derrotas/racha/puntaje máx.
 *
 * Estos tests corren contra PostgreSQL (memoria_ninja_test). El bloque de
 * "Migración del esquema de perfil" es intencionalmente de DatabaseSqlite:
 * prueba una función SQLite (agregar columnas a bases viejas), no la app.
 */
let database;

async function crearServicio() {
  await limpiarDatabase(database);
  const usuarioRepository = new UsuarioRepositorySQL(database);
  const historialRepository = new HistorialPartidaRepositorySQL(database);
  const passwordHasher = new PasswordHasher();
  const servicio = new UsuarioService(usuarioRepository, historialRepository, passwordHasher);
  return { servicio, usuarioRepository };
}

async function registrarCuenta(servicio, usuario = "naruto") {
  return servicio.registrar({
    usuario,
    correo: `${usuario}@konoha.ni`,
    nacimiento: "1990-10-10",
    password: "secreto123",
  });
}

describe("Perfil de cuenta (XP y estadísticas)", () => {
  before(async () => {
    database = crearDatabasePrueba();
    await database.init();
  });

  after(async () => {
    await database.close();
  });

  it("toda cuenta nueva nace con 500 XP y el resto de las estadísticas en 0", async () => {
    const { servicio } = await crearServicio();
    const creado = await registrarCuenta(servicio);

    assert.equal(creado.xp, 500);
    assert.equal(creado.victorias, 0);
    assert.equal(creado.derrotas, 0);
    assert.equal(creado.racha, 0);
    assert.equal(creado.puntajeMax, 0);

    const perfil = await servicio.obtenerPerfil(creado.id);
    assert.equal(perfil.nombre, "naruto");
    assert.equal(perfil.xp, 500);
  });

  it("obtenerPerfil devuelve null si el usuario no existe (el HTTP responde 404)", async () => {
    const { servicio } = await crearServicio();
    assert.equal(await servicio.obtenerPerfil("uuid-inexistente"), null);
  });

  it("una victoria suma 100 XP, una victoria más y una de racha", async () => {
    const { servicio } = await crearServicio();
    const { id } = await registrarCuenta(servicio);

    const perfil = await servicio.registrarFinPartidaPerfil({
      idUsuario: id,
      victoria: true,
      puntaje: 80,
    });

    assert.equal(perfil.xp, 600);
    assert.equal(perfil.victorias, 1);
    assert.equal(perfil.derrotas, 0);
    assert.equal(perfil.racha, 1);
    assert.equal(perfil.puntajeMax, 80);

    // Segunda victoria: la racha sigue creciendo.
    const segunda = await servicio.registrarFinPartidaPerfil({
      idUsuario: id,
      victoria: true,
      puntaje: 40,
    });
    assert.equal(segunda.xp, 700);
    assert.equal(segunda.victorias, 2);
    assert.equal(segunda.racha, 2);
    // El puntaje más bajo NO baja el máximo.
    assert.equal(segunda.puntajeMax, 80);
  });

  it("una derrota suma derrota, deja la racha en 0 y no da XP", async () => {
    const { servicio } = await crearServicio();
    const { id } = await registrarCuenta(servicio, "sasuke");

    await servicio.registrarFinPartidaPerfil({ idUsuario: id, victoria: true, puntaje: 30 });

    const perfil = await servicio.registrarFinPartidaPerfil({
      idUsuario: id,
      victoria: false,
      puntaje: 10,
    });

    assert.equal(perfil.xp, 600);
    assert.equal(perfil.victorias, 1);
    assert.equal(perfil.derrotas, 1);
    assert.equal(perfil.racha, 0);
    assert.equal(perfil.puntajeMax, 30);
  });

  it("el progreso queda persistido en la base (no vive solo en memoria)", async () => {
    const { servicio, usuarioRepository } = await crearServicio();
    const { id } = await registrarCuenta(servicio, "sakura");

    await servicio.registrarFinPartidaPerfil({ idUsuario: id, victoria: true, puntaje: 100 });

    const recargado = await usuarioRepository.buscarPorId(id);
    assert.equal(recargado.xp, 600);
    assert.equal(recargado.victorias, 1);
    assert.equal(recargado.racha, 1);
  });

  it("no da XP a usuarios inexistentes", async () => {
    const { servicio } = await crearServicio();
    await assert.rejects(
      () => servicio.registrarFinPartidaPerfil({ idUsuario: "no-existe", victoria: true, puntaje: 10 }),
      /no existe/
    );
  });

  it("una victoria que no llega como booleano no suma XP (el cliente debe enviar true/false)", async () => {
    const { servicio } = await crearServicio();
    const { id } = await registrarCuenta(servicio, "kiba");

    const perfil = await servicio.registrarFinPartidaPerfil({
      idUsuario: id,
      victoria: "true",
      puntaje: 10,
    });

    assert.equal(perfil.xp, 500);
    assert.equal(perfil.victorias, 0);
    assert.equal(perfil.derrotas, 1);
  });
});

describe("Migración del esquema de perfil", () => {
  it("una base vieja sin columnas de perfil queda con 500 XP y el resto en 0", () => {
    const ruta = path.join(os.tmpdir(), `memorice-perfil-${Date.now()}.sqlite`);

    // Base creada ANTES del sistema de experiencia (sin columnas de perfil).
    const vieja = new DatabaseSync(ruta);
    vieja.exec(`
      CREATE TABLE usuarios (
        id            TEXT PRIMARY KEY,
        usuario       TEXT NOT NULL UNIQUE,
        correo        TEXT NOT NULL UNIQUE,
        nacimiento    TEXT,
        password_hash TEXT NOT NULL,
        creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO usuarios (id, usuario, correo, password_hash)
      VALUES ('id-viejo', 'kakashi', 'kakashi@konoha.ni', 'hash:123');
    `);
    vieja.close();

    // Al abrirla con DatabaseSqlite, las columnas se agregan con defaults.
    const migrada = new DatabaseSqlite(ruta);
    const columnas = migrada.db
      .prepare("PRAGMA table_info(usuarios)")
      .all()
      .map((columna) => columna.name);

    for (const esperada of ["xp", "victorias", "derrotas", "racha", "puntaje_max"]) {
      assert.ok(columnas.includes(esperada), `falta la columna ${esperada}`);
    }

    const fila = migrada.db
      .prepare("SELECT xp, victorias, derrotas, racha, puntaje_max FROM usuarios WHERE id = ?")
      .get("id-viejo");
    assert.equal(fila.xp, 500);
    assert.equal(fila.victorias, 0);
    assert.equal(fila.derrotas, 0);
    assert.equal(fila.racha, 0);
    assert.equal(fila.puntaje_max, 0);

    migrada.cerrar();
    fs.rmSync(ruta, { force: true });
  });
});
