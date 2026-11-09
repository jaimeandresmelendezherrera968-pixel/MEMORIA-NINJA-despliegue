const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const PasswordHasher = require("../src/infraestructura/PasswordHasher");
const UsuarioRepositorySQL = require("../src/repositories/UsuarioRepositorySQL");
const HistorialPartidaRepositorySQL = require("../src/repositories/HistorialPartidaRepositorySQL");
const UsuarioService = require("../src/services/UsuarioService");
const { crearDatabasePrueba, limpiarDatabase } = require("./helpers/baseDatosPrueba");

/**
 * SUB-PARTE 3.5 — Merge invitado→cuenta.
 *
 * importarProgresoInvitado() corre contra PostgreSQL real (memoria_ninja_test)
 * con database inyectada → la importación entera usa la transacción ACID de
 * DatabasePostgres.transaccion(). Cada test limpia las tablas para arrancar
 * aislado, igual que el resto de la batería.
 */
let database;

before(async () => {
  database = crearDatabasePrueba();
  await database.init();
});

after(async () => {
  await database.close();
});

async function crearServicio() {
  await limpiarDatabase(database);
  const usuarioRepository = new UsuarioRepositorySQL(database);
  const historialRepository = new HistorialPartidaRepositorySQL(database);
  const passwordHasher = new PasswordHasher();
  const servicio = new UsuarioService(
    usuarioRepository,
    historialRepository,
    passwordHasher,
    database
  );
  return { servicio, historialRepository };
}

async function registrarCuenta(servicio, usuario = "kakashi", correo = "kakashi@demo.ninja") {
  return servicio.registrar({ usuario, correo, password: "clave123" });
}

describe("UsuarioService.importarProgresoInvitado (merge invitado→cuenta)", () => {
  it("importa el historial del invitado y fusiona el perfil en la cuenta", async () => {
    const { servicio } = await crearServicio();
    const { id } = await registrarCuenta(servicio);

    const resultado = await servicio.importarProgresoInvitado({
      idUsuario: id,
      historial: [
        { idPartida: "uzumaki-1", zona: "uzumaki", puntaje: 300, modo: "1", ganador: "kakashi" },
        { idPartida: "pares-2", zona: "pares", puntaje: 120, modo: "1", ganador: "ninguno" },
      ],
      perfil: { xp: 700, victorias: 2, derrotas: 1, racha: 2, puntajeMax: 300 },
    });

    assert.equal(resultado.importados, 2);
    assert.equal(resultado.omitidos, 0);

    const historial = await servicio.obtenerHistorial(id);
    assert.equal(historial.length, 2);

    // La cuenta nació con 500 XP; el invitado trae 700 (500 base + 200
    // ganados) → solo se suma lo ganado por encima de la base: 700 total.
    assert.equal(resultado.perfil.xp, 700);
    assert.equal(resultado.perfil.victorias, 2);
    assert.equal(resultado.perfil.derrotas, 1);
    assert.equal(resultado.perfil.racha, 2);
    assert.equal(resultado.perfil.puntajeMax, 300);
  });

  it("la re-importación es inocua: deduplica por idPartida", async () => {
    const { servicio } = await crearServicio();
    const { id } = await registrarCuenta(servicio);

    const cola = [
      { idPartida: "uzumaki-1", zona: "uzumaki", puntaje: 300, modo: "1", ganador: "kakashi" },
      { idPartida: "arena-1", zona: "arena", puntaje: 150, modo: "1", ganador: "kakashi" },
    ];
    const perfilInvitado = { xp: 800, victorias: 1, derrotas: 0, racha: 1, puntajeMax: 300 };

    const primera = await servicio.importarProgresoInvitado({
      idUsuario: id,
      historial: cola,
      perfil: perfilInvitado,
    });
    assert.equal(primera.importados, 2);
    assert.equal(primera.perfil.xp, 800); // 500 + 300 ganados por el invitado

    // Mismo cliente reintenta (por ejemplo, se perdió la respuesta del
    // servidor): no duplica filas ni vuelve a sumar el XP — como la
    // importación es transaccional, si el historial ya está todo importado
    // el perfil también lo estaba.
    const segunda = await servicio.importarProgresoInvitado({
      idUsuario: id,
      historial: cola,
      perfil: perfilInvitado,
    });
    assert.equal(segunda.importados, 0);
    assert.equal(segunda.omitidos, 2);

    const historial = await servicio.obtenerHistorial(id);
    assert.equal(historial.length, 2);
    assert.equal(segunda.perfil.xp, 800);
    assert.equal(segunda.perfil.victorias, 1);
  });

  it("racha y puntajeMax quedan con el MÁXIMO entre cuenta e invitado", async () => {
    const { servicio } = await crearServicio();
    const { id } = await registrarCuenta(servicio);

    // La cuenta ya jugó una partida ganada: racha 1, puntajeMax 500.
    await servicio.registrarFinPartidaPerfil({ idUsuario: id, victoria: true, puntaje: 500 });

    const resultado = await servicio.importarProgresoInvitado({
      idUsuario: id,
      historial: [],
      // El invitado tiene racha menor y puntajeMax mayor.
      perfil: { xp: 0, victorias: 0, derrotas: 0, racha: 0, puntajeMax: 900 },
    });

    assert.equal(resultado.perfil.racha, 1); // max(1, 0)
    assert.equal(resultado.perfil.puntajeMax, 900); // max(500, 900)
  });

  it("omite los resultados sin idPartida (no hay forma de deduplicarlos)", async () => {
    const { servicio } = await crearServicio();
    const { id } = await registrarCuenta(servicio);

    const resultado = await servicio.importarProgresoInvitado({
      idUsuario: id,
      historial: [
        { zona: "uzumaki", puntaje: 300, modo: "1", ganador: "kakashi" },
        { idPartida: "pares-9", zona: "pares", puntaje: 80, modo: "1", ganador: "ninguno" },
      ],
      perfil: null,
    });

    assert.equal(resultado.importados, 1);
    assert.equal(resultado.omitidos, 1);
    const historial = await servicio.obtenerHistorial(id);
    assert.equal(historial.length, 1);
    assert.equal(historial[0].id_partida, "pares-9");
  });

  it("rechaza importar a un usuario inexistente", async () => {
    const { servicio } = await crearServicio();
    await assert.rejects(
      () =>
        servicio.importarProgresoInvitado({
          idUsuario: "uuid-fantasma",
          historial: [{ idPartida: "uzumaki-1", zona: "uzumaki", puntaje: 1 }],
          perfil: null,
        }),
      /no existe/
    );
  });

  it("acepta historial no array / perfil vacío sin lanzar (body malformado)", async () => {
    const { servicio } = await crearServicio();
    const { id } = await registrarCuenta(servicio);

    const resultado = await servicio.importarProgresoInvitado({
      idUsuario: id,
      historial: "esto-no-es-un-array",
      perfil: { xp: "basura", victorias: -5 },
    });

    assert.equal(resultado.importados, 0);
    assert.equal(resultado.perfil.xp, 500); // nada se sumó
  });
});
