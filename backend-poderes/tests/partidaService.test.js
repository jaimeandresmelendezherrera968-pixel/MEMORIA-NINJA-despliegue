const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const DatabaseSqlite = require("../src/infraestructura/DatabaseSqlite");
const PartidaRepositorySQL = require("../src/repositories/PartidaRepositorySQL");
const PartidaService = require("../src/services/PartidaService");

/**
 * >>> DIP + SQL en acción <<<
 * PartidaService se arma con un PartidaRepositorySQL real (SQLite en
 * memoria) y se prueba el ciclo completo: crear partida -> persistir ->
 * leerla de vuelta con el repositorio.
 */
function crearServicio() {
  const database = new DatabaseSqlite(":memory:");
  const partidaRepository = new PartidaRepositorySQL(database);
  const servicio = new PartidaService(partidaRepository);
  return { servicio, partidaRepository };
}

describe("PartidaService con repositorio SQL", () => {
  it("crea y persiste una partida con chakra inicial por defecto (50)", async () => {
    const { servicio, partidaRepository } = crearServicio();

    const creada = await servicio.crearPartida({
      idJugador1: "sasuke",
      nombre1: "Sasuke",
      idJugador2: "naruto",
      nombre2: "Naruto",
    });

    assert.ok(creada.idPartida);
    assert.equal(creada.jugadores.length, 2);
    assert.equal(creada.jugadores[0].nombre, "Sasuke");
    assert.equal(creada.jugadores[0].chakra, 50);
    assert.equal(creada.jugadores[1].nombre, "Naruto");
    assert.equal(creada.jugadores[1].chakra, 50);

    // Sigue viva en SQLite: la leemos del repo tal cual.
    const partidaGuardada = await partidaRepository.obtener(creada.idPartida);
    assert.notEqual(partidaGuardada, null);
    assert.equal(partidaGuardada.obtenerJugador("sasuke").nombre, "Sasuke");
    assert.equal(partidaGuardada.obtenerJugador("sasuke").chakra, 50);
  });

  it("respeta el chakra inicial pasado por cada jugador", async () => {
    const { servicio } = crearServicio();

    const creada = await servicio.crearPartida({
      idJugador1: "sasuke",
      nombre1: "Sasuke",
      idJugador2: "naruto",
      nombre2: "Naruto",
      chakraInicial1: 70,
      chakraInicial2: 35,
    });

    assert.equal(creada.jugadores[0].chakra, 70);
    assert.equal(creada.jugadores[1].chakra, 35);
  });

  it("genera partidas con id distinto cada vez (no pisa la anterior)", async () => {
    const { servicio, partidaRepository } = crearServicio();

    const primera = await servicio.crearPartida({ idJugador1: "p1", nombre1: "Uno", idJugador2: "p2", nombre2: "Dos" });
    const segunda = await servicio.crearPartida({ idJugador1: "p1", nombre1: "Uno", idJugador2: "p2", nombre2: "Dos" });

    assert.notEqual(primera.idPartida, segunda.idPartida);
    assert.notEqual(await partidaRepository.obtener(primera.idPartida), null);
    assert.notEqual(await partidaRepository.obtener(segunda.idPartida), null);
  });

  it("valida que los identificadores de los jugadores existan y sean distintos", async () => {
    const { servicio } = crearServicio();

    await assert.rejects(
      () => servicio.crearPartida({ idJugador1: "solo", nombre1: "Solo", nombre2: "Nadie" }),
      /identificadores/
    );
    await assert.rejects(
      () => servicio.crearPartida({ idJugador1: "mismo", nombre1: "A", idJugador2: "mismo", nombre2: "B" }),
      /distintos/
    );
  });

  it("valida el rango del chakra inicial (0-100)", async () => {
    const { servicio } = crearServicio();

    await assert.rejects(
      () => servicio.crearPartida({ idJugador1: "a", nombre1: "A", idJugador2: "b", nombre2: "B", chakraInicial1: 150 }),
      /entre 0 y 100/
    );
  });
});