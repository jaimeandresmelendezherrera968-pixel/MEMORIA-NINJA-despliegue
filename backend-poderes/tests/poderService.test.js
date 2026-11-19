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

  it("Bomba mitiga a 10 y consume la Sustitución pasiva del rival", async () => {
    const repositorio = new RepositorioDeJuguete();
    const poderService = new PoderService(repositorio, new PoderFactory());

    const naruto = new Jugador("naruto", "Naruto");
    const sasuke = new Jugador("sasuke", "Sasuke");
    naruto.ganarChakra(100);
    // Defensa armada sin marcar el poder activo: puede haber otro poder
    // activo del rival y la Sustitución debe seguir mitigando igual.
    sasuke.activarSustitucion(8);
    repositorio.guardar("p1", new Partida("p1", naruto, sasuke));

    const resultado = await poderService.activarPoder({
      idPartida: "p1",
      idJugador: "naruto",
      idPoder: "bomba",
    });

    assert.equal(resultado.exito, true);
    assert.equal(resultado.resultado.vidaRestada, 10);
    assert.equal(sasuke.vida, 90);
    assert.equal(sasuke.tieneSustitucionActiva, false);
    assert.equal(naruto.chakra, 50);
  });

  it("Robo se evada con Sustitución activa y no transfiere chakra", async () => {
    const repositorio = new RepositorioDeJuguete();
    const poderService = new PoderService(repositorio, new PoderFactory());

    const naruto = new Jugador("naruto", "Naruto");
    const sasuke = new Jugador("sasuke", "Sasuke");
    naruto.ganarChakra(100);
    sasuke.ganarChakra(50);
    sasuke.activarSustitucion(8);
    repositorio.guardar("p1", new Partida("p1", naruto, sasuke));

    const resultado = await poderService.activarPoder({
      idPartida: "p1",
      idJugador: "naruto",
      idPoder: "robo",
    });

    assert.equal(resultado.exito, true);
    assert.equal(resultado.resultado.tipo, "evadido");
    assert.equal(naruto.chakra, 70); // paga el costo, no roba nada
    assert.equal(sasuke.chakra, 50);
    assert.equal(sasuke.tieneSustitucionActiva, false);
  });

  it("respeta los usos permitidos de cada poder y se agota al tercer intento", async () => {
    const repositorio = new RepositorioDeJuguete();
    const poderService = new PoderService(repositorio, new PoderFactory());

    const naruto = new Jugador("naruto", "Naruto");
    const sasuke = new Jugador("sasuke", "Sasuke");
    naruto.ganarChakra(100); // tope de chakra; 20 por Byakugan alcanza para 2 usos
    repositorio.guardar("p1", new Partida("p1", naruto, sasuke));

    const activar = () =>
      poderService.activarPoder({ idPartida: "p1", idJugador: "naruto", idPoder: "byakugan" });

    assert.equal((await activar()).exito, true);
    assert.equal((await activar()).exito, true);
    const tercero = await activar();

    assert.equal(tercero.exito, false);
    assert.equal(tercero.motivo, "sin_usos");
    assert.equal(naruto.chakra, 60); // el intento fallido no cobra chakra
  });

  it("la cuenta de usos es independiente por jugador", async () => {
    const repositorio = new RepositorioDeJuguete();
    const poderService = new PoderService(repositorio, new PoderFactory());

    const naruto = new Jugador("naruto", "Naruto");
    const sasuke = new Jugador("sasuke", "Sasuke");
    naruto.ganarChakra(100);
    sasuke.ganarChakra(100);
    repositorio.guardar("p1", new Partida("p1", naruto, sasuke));

    const datos = { idPartida: "p1", idPoder: "sello" };
    assert.equal((await poderService.activarPoder({ ...datos, idJugador: "naruto" })).exito, true);
    assert.equal((await poderService.activarPoder({ ...datos, idJugador: "sasuke" })).exito, true);
  });

  it("la Sustitución expira al cumplirse su duración", async () => {
    const jugador = new Jugador("j1", "Jugador 1");
    jugador.activarSustitucion(8);
    assert.equal(jugador.tieneSustitucionActiva, true);

    jugador.activarSustitucion(0);
    assert.equal(jugador.tieneSustitucionActiva, false);
  });
});
