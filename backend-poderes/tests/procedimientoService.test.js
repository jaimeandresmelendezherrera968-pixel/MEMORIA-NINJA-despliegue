const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const PasswordHasher = require("../src/infraestructura/PasswordHasher");
const UsuarioRepositorySQL = require("../src/repositories/UsuarioRepositorySQL");
const HistorialPartidaRepositorySQL = require("../src/repositories/HistorialPartidaRepositorySQL");
const ProcedimientoRepositorySQL = require("../src/repositories/ProcedimientoRepositorySQL");
const VistaRepositorySQL = require("../src/repositories/VistaRepositorySQL");
const UsuarioService = require("../src/services/UsuarioService");
const ProcedimientoService = require("../src/services/ProcedimientoService");
const { crearDatabasePrueba, limpiarDatabase } = require("./helpers/baseDatosPrueba");

/**
 * >>> Procedimiento almacenado en PostgreSQL <<<
 *
 * El repositorio hace `CALL sp_registrar_partida(...)` y este test
 * verifica el resultado real: el historial queda registrado y la fila se
 * ve en la vista vw_historial_detallado con el nombre del usuario.
 * Corre contra memoria_ninja_test (el MISMO motor que usa la app).
 */
let database;

before(async () => {
  database = crearDatabasePrueba();
  await database.init();
});

after(async () => {
  await database.close();
});

async function montar() {
  await limpiarDatabase(database);
  const usuarioRepository = new UsuarioRepositorySQL(database);
  const historialRepository = new HistorialPartidaRepositorySQL(database);
  const usuarioService = new UsuarioService(usuarioRepository, historialRepository, new PasswordHasher());
  const procedimientoService = new ProcedimientoService(new ProcedimientoRepositorySQL(database));
  const vistaRepository = new VistaRepositorySQL(database);
  return { database, usuarioService, procedimientoService, vistaRepository };
}

describe("Procedimiento almacenado sp_registrar_partida", () => {
  it("registra un resultado y la vista vw_historial_detallado lo refleja con el nombre de usuario", async () => {
    const { usuarioService, procedimientoService, vistaRepository } = await montar();

    const { id } = await usuarioService.registrar({
      usuario: "shikamaru",
      correo: "shikamaru@konoha.ni",
      password: "perezoso1",
    });

    await procedimientoService.registrarResultado({
      idUsuario: id,
      zona: "niebla",
      puntaje: 210,
      modo: "2",
      ganador: "shikamaru",
    });

    const historial = await usuarioService.obtenerHistorial(id);
    assert.equal(historial.length, 1);
    assert.equal(historial[0].puntaje, 210);

    const detallado = await vistaRepository.historialDetallado();
    const fila = detallado.find((f) => f.id_usuario === id);
    assert.equal(fila.usuario, "shikamaru");
    assert.equal(fila.puntaje, 210);
  });

  it("valida los parámetros antes de llegar a la BD", async () => {
    const { procedimientoService } = await montar();

    await assert.rejects(
      () => procedimientoService.registrarResultado({ puntaje: 10 }),
      /identificador del usuario/
    );
    await assert.rejects(
      () => procedimientoService.registrarResultado({ idUsuario: "u1", puntaje: "no-numero" }),
      /puntaje debe ser un número/
    );
  });

  it("rechaza registrar un usuario que no existe (FK de historial_partidas)", async () => {
    const { procedimientoService } = await montar();

    await assert.rejects(
      () =>
        procedimientoService.registrarResultado({
          idUsuario: "no-existe",
          zona: "roca",
          puntaje: 50,
        }),
      // SQLSTATE 23503 = foreign_key_violation (independiente del idioma
      // del servidor, que aquí responde en español: "llave foránea").
      (error) =>
        error.code === "23503" ||
        /foreign key|llave for[aá]nea|insert or update|inserci[oó]n o actualizaci[oó]n/i.test(error.message)
    );
  });
});
