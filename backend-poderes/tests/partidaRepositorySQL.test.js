const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Jugador = require("../src/entities/Jugador");
const Partida = require("../src/entities/Partida");
const PoderFactory = require("../src/factories/PoderFactory");
const PoderService = require("../src/services/PoderService");
const DatabaseSqlite = require("../src/infraestructura/DatabaseSqlite");
const PartidaRepositorySQL = require("../src/repositories/PartidaRepositorySQL");
const verificarContratoDePartidaRepository = require("./contratoPartidaRepository");

/**
 * >>> LSP verificado, ahora con SQLite <<<
 *
 * La MISMA batería de tests de contrato que corren contra Memoria y
 * Archivo corre contra PartidaRepositorySQL. Si esta implementación
 * fallara un test, viola el contrato y no podría sustituir a las demás.
 *
 * ":memory:" crea una base efímera por cada ejecución de la batería.
 */
verificarContratoDePartidaRepository(
  "PartidaRepositorySQL (SQLite + estado JSON)",
  () => new PartidaRepositorySQL(new DatabaseSqlite(":memory:"))
);

describe("PartidaRepositorySQL — persistencia REAL en SQLite", () => {
  it("la partida sobrevive a otra instancia del repositorio (como un reinicio del servidor)", async () => {
    const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), "sqlite-"));
    const rutaBase = path.join(carpetaTemporal, "partidas.sqlite");

    // 1er "proceso": se guarda la partida en SQLite y se cierra la conexión.
    const proceso1 = new PartidaRepositorySQL(new DatabaseSqlite(rutaBase));
    const partida = new Partida("p-persistente", new Jugador("j1", "Naruto"), new Jugador("j2", "Sasuke"));
    proceso1.guardar("p-persistente", partida);
    proceso1.database.cerrar();

    // 2do "proceso": instancia NUEVA (nueva conexión, mismo archivo).
    const proceso2 = new PartidaRepositorySQL(new DatabaseSqlite(rutaBase));
    const recuperada = await proceso2.obtener("p-persistente");

    assert.equal(recuperada.id, "p-persistente");
    assert.equal(recuperada.jugadores.j1.chakra, 0);
  });

  it("restaura chakra y vida fielmente al reconstruir la entidad", async () => {
    const proceso = new PartidaRepositorySQL(new DatabaseSqlite(":memory:"));
    const j1 = new Jugador("naruto", "Naruto");
    const j2 = new Jugador("sasuke", "Sasuke");
    j1.ganarChakra(75);
    j1.recibirDanio(30); // le quedan 70 de vida
    const partida = new Partida("p-chakra", j1, j2);
    partida.registrarEvento("un evento guardado");
    proceso.guardar("p-chakra", partida);

    const recuperada = await proceso.obtener("p-chakra");
    const naruto = recuperada.obtenerJugador("naruto");
    const sasuke = recuperada.obtenerRival("naruto");

    assert.equal(naruto.chakra, 75);
    assert.equal(naruto.vida, 70);
    assert.equal(sasuke.chakra, 0);
    assert.equal(recuperada.eventos.length, 1);
    assert.equal(recuperada.eventos[0].mensaje, "un evento guardado");
  });

  it("el PoderService funciona completo contra el repositorio SQL (DIP + LSP de punta a punta)", async () => {
    const repo = new PartidaRepositorySQL(new DatabaseSqlite(":memory:"));
    const poderService = new PoderService(repo, new PoderFactory());

    const j1 = new Jugador("naruto", "Naruto");
    const j2 = new Jugador("sasuke", "Sasuke");
    j1.ganarChakra(80);
    j2.ganarChakra(80);
    const partida = new Partida("p-poder", j1, j2);
    repo.guardar("p-poder", partida);

    const resultado = await poderService.activarPoder({
      idPartida: "p-poder",
      idJugador: "naruto",
      idPoder: "byakugan",
    });

    assert.equal(resultado.exito, true);
    assert.equal(resultado.chakraRestante, 60); // 80 - 20 de Byakugan

    // La partida modificada quedó persistida en SQLite.
    const persistida = await repo.obtener("p-poder");
    assert.equal(persistida.obtenerJugador("naruto").chakra, 60);
    assert.equal(persistida.eventos[0].mensaje.includes("activó"), true);
  });
});