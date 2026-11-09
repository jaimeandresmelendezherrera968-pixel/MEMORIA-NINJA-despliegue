const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Jugador = require("../src/entities/Jugador");
const Partida = require("../src/entities/Partida");
const PartidaRepository = require("../src/repositories/PartidaRepository");
const PoderFactory = require("../src/factories/PoderFactory");
const PoderService = require("../src/services/PoderService");

/**
 * Repositorio FALSO, escrito a mano para el test, que NO se parece por
 * dentro a ninguna de las dos implementaciones reales (no usa Map, no
 * usa archivos — guarda todo en un array plano, distinto adrede).
 * Cumple el mismo contrato (PartidaRepository) igual.
 */
class RepositorioDeJuguete extends PartidaRepository {
  constructor() {
    super();
    this.partidasGuardadas = [];
  }

  guardar(idPartida, partida) {
    this.partidasGuardadas = this.partidasGuardadas.filter((p) => p.id !== idPartida);
    this.partidasGuardadas.push(partida);
  }

  obtener(idPartida) {
    return this.partidasGuardadas.find((p) => p.id === idPartida) || null;
  }
}

describe("PoderService con un repositorio inventado para el test (DIP en acción)", () => {
  it("activa un poder correctamente sin que el Service sepa que el repositorio es de juguete", async () => {
    const repositorioDeJuguete = new RepositorioDeJuguete();
    const poderFactory = new PoderFactory();
    const poderService = new PoderService(repositorioDeJuguete, poderFactory);

    const jugador1 = new Jugador("naruto", "Naruto");
    const jugador2 = new Jugador("sasuke", "Sasuke");
    jugador1.ganarChakra(50);
    jugador2.ganarChakra(50);
    const partida = new Partida("p1", jugador1, jugador2);
    repositorioDeJuguete.guardar("p1", partida);

    const resultado = await poderService.activarPoder({
      idPartida: "p1",
      idJugador: "naruto",
      idPoder: "byakugan",
    });

    assert.equal(resultado.exito, true);
    assert.equal(resultado.chakraRestante, 30); // 50 - 20 de costo de Byakugan
  });

  it("responde con exito:false si el jugador no tiene chakra suficiente, sin importar el repositorio", async () => {
    const repositorioDeJuguete = new RepositorioDeJuguete();
    const poderFactory = new PoderFactory();
    const poderService = new PoderService(repositorioDeJuguete, poderFactory);

    const jugador1 = new Jugador("naruto", "Naruto"); // se queda con 0 de chakra
    const jugador2 = new Jugador("sasuke", "Sasuke");
    const partida = new Partida("p1", jugador1, jugador2);
    repositorioDeJuguete.guardar("p1", partida);

    const resultado = await poderService.activarPoder({
      idPartida: "p1",
      idJugador: "naruto",
      idPoder: "bomba",
    });

    assert.equal(resultado.exito, false);
    assert.equal(resultado.motivo, "chakra_insuficiente");
  });
});
