const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Jugador = require("../src/entities/Jugador");
const Tablero = require("../src/entities/Tablero");
const PoderFactory = require("../src/factories/PoderFactory");

/**
 * >>> LSP aplicado a la jerarquía de Poder <<<
 *
 * El PoderService (services/PoderService.js) llama SIEMPRE:
 *   poder.activar({ jugador, rival, tablero, registrarEvento })
 * sin preguntar antes qué poder concreto es. Para que eso sea seguro,
 * los 6 hijos de Poder tienen que cumplir el MISMO contrato: mismos
 * parámetros de entrada, y una salida con la misma "forma" mínima
 * (nunca un método vacío, nunca una firma distinta, nunca lanzar algo
 * que el padre no prometía). Esta batería corre contra los 6 al mismo
 * tiempo y prueba justamente eso.
 */
const fabrica = new PoderFactory();

for (const idPoder of fabrica.idsDisponibles()) {
  describe(`Contrato de Poder — ${idPoder}`, () => {
    it("se puede crear desde la fábrica y tiene costoChakra y nombre", () => {
      const poder = fabrica.crear(idPoder);
      assert.equal(typeof poder.nombre, "string");
      assert.equal(typeof poder.costoChakra, "number");
      assert.ok(poder.costoChakra > 0);
    });

    it("activar() existe, es una función, y se puede llamar con la firma estándar", () => {
      const jugador = new Jugador("j1", "Jugador 1");
      const rival = new Jugador("j2", "Jugador 2");
      jugador.ganarChakra(100);
      const tablero = new Tablero();
      const eventos = [];

      const poder = fabrica.crear(idPoder);
      assert.equal(typeof poder.activar, "function");

      const resultado = poder.activar({
        jugador,
        rival,
        tablero,
        registrarEvento: (m) => eventos.push(m),
      });

      // Contrato mínimo de salida: SIEMPRE un objeto con "tipo".
      // Ningún poder puede devolver undefined ni una forma distinta.
      assert.equal(typeof resultado, "object");
      assert.equal(typeof resultado.tipo, "string");
    });

    it("activar() efectivamente gasta el chakra prometido (costoChakra)", () => {
      const jugador = new Jugador("j1", "Jugador 1");
      const rival = new Jugador("j2", "Jugador 2");
      jugador.ganarChakra(100);
      const tablero = new Tablero();

      const poder = fabrica.crear(idPoder);
      const chakraAntes = jugador.chakra;
      poder.activar({ jugador, rival, tablero, registrarEvento: () => {} });

      assert.equal(jugador.chakra, chakraAntes - poder.costoChakra);
    });

    it("puedeSerContrarrestadoPor() nunca explota, sin importar qué poder rival se le pase", () => {
      const poder = fabrica.crear(idPoder);
      for (const otroId of fabrica.idsDisponibles()) {
        const otroPoder = fabrica.crear(otroId);
        assert.doesNotThrow(() => poder.puedeSerContrarrestadoPor(otroPoder));
      }
    });
  });
}

/**
 * Prueba de sustitución "en vivo": un mismo bucle genérico recorre los
 * 6 poderes y los activa uno por uno sin ningún "if" ni caso especial
 * por poder. Si esto corre sin errores, los 6 son intercambiables tal
 * como exige LSP.
 */
describe("Sustitución en vivo de los 6 poderes en un mismo bucle genérico", () => {
  it("activa los 6 poderes uno por uno sin distinguir casos", () => {
    for (const idPoder of fabrica.idsDisponibles()) {
      const jugador = new Jugador("j1", "Jugador 1");
      const rival = new Jugador("j2", "Jugador 2");
      jugador.ganarChakra(100);
      const tablero = new Tablero();

      const poder = fabrica.crear(idPoder);
      assert.doesNotThrow(() =>
        poder.activar({ jugador, rival, tablero, registrarEvento: () => {} })
      );
    }
  });
});
