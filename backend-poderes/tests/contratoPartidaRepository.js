const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Jugador = require("../src/entities/Jugador");
const Partida = require("../src/entities/Partida");

/**
 * >>> LSP (Sustitución de Liskov) — VERIFICADO, no solo documentado <<<
 *
 * Esta es la idea central de este archivo: en vez de solo ESCRIBIR en un
 * comentario que "cualquier PartidaRepository es sustituible por otro",
 * se ejecuta LA MISMA batería de pruebas contra cada implementación
 * concreta. Si mañana alguien agrega una implementación nueva
 * (PartidaRepositoryMongo, PartidaRepositoryRedis, lo que sea) y no pasa
 * estos mismos tests, esa implementación ESTÁ ROTA — viola el contrato
 * y no puede reemplazar a las demás sin peligro. Eso es exactamente lo
 * que Liskov exige, verificado con código y no solo con buena fe.
 *
 * obtener() se llama con await: en SQLite resuelve síncrono y en
 * PostgreSQL devuelve una promesa — el contrato es el mismo para ambos
 * motores (await funciona con los dos).
 *
 * Se usa así (ver partidaRepositoryMemoria.test.js y
 * partidaRepositoryArchivo.test.js): cada archivo de test solo dice
 * "corré esta batería contra ESTA implementación puntual".
 */
function verificarContratoDePartidaRepository(nombreImplementacion, crearRepositorioVacio) {
  describe(`Contrato de PartidaRepository — ${nombreImplementacion}`, () => {
    it("devuelve null si la partida no existe todavía", async () => {
      const repo = crearRepositorioVacio();
      assert.equal(await repo.obtener("no-existe"), null);
    });

    it("devuelve exactamente la partida que se guardó, con el mismo id", async () => {
      const repo = crearRepositorioVacio();
      const partida = new Partida("p1", new Jugador("j1", "Naruto"), new Jugador("j2", "Sasuke"));

      repo.guardar("p1", partida);
      const recuperada = await repo.obtener("p1");

      assert.notEqual(recuperada, null);
      assert.equal(recuperada.id, "p1");
    });

    it("guardar dos veces la misma partida no rompe nada (sobrescribe)", async () => {
      const repo = crearRepositorioVacio();
      const partida = new Partida("p1", new Jugador("j1", "Naruto"), new Jugador("j2", "Sasuke"));

      repo.guardar("p1", partida);
      partida.registrarEvento("un evento cualquiera");
      repo.guardar("p1", partida);

      const recuperada = await repo.obtener("p1");
      assert.equal(recuperada.eventos.length, 1);
    });

    it("dos partidas distintas no se pisan entre sí", async () => {
      const repo = crearRepositorioVacio();
      const partidaA = new Partida("pA", new Jugador("j1", "Naruto"), new Jugador("j2", "Sasuke"));
      const partidaB = new Partida("pB", new Jugador("j3", "Hinata"), new Jugador("j4", "Kiba"));

      repo.guardar("pA", partidaA);
      repo.guardar("pB", partidaB);

      assert.equal((await repo.obtener("pA")).id, "pA");
      assert.equal((await repo.obtener("pB")).id, "pB");
    });

    it("actualizar() lanza si la partida no existe (contrato uniforme)", async () => {
      const repo = crearRepositorioVacio();
      await assert.rejects(
        () => repo.actualizar("no-existe", () => null),
        /No existe la partida/
      );
    });

    it("actualizar() lee, aplica el mutador y persiste en una sola operación", async () => {
      const repo = crearRepositorioVacio();
      const partida = new Partida("p1", new Jugador("j1", "Naruto"), new Jugador("j2", "Sasuke"));
      repo.guardar("p1", partida);

      const resultado = await repo.actualizar("p1", (p) => {
        p.registrarEvento("mutado en transacción");
        return "valor-de-retorno";
      });

      assert.equal(resultado, "valor-de-retorno");
      const recuperada = await repo.obtener("p1");
      assert.equal(recuperada.eventos.length, 1);
      assert.equal(recuperada.eventos[0].mensaje, "mutado en transacción");
    });
  });
}

module.exports = verificarContratoDePartidaRepository;
