const fs = require("fs");
const os = require("os");
const path = require("path");
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const PartidaRepositoryArchivo = require("../src/repositories/PartidaRepositoryArchivo");
const verificarContratoDePartidaRepository = require("./contratoPartidaRepository");
const Jugador = require("../src/entities/Jugador");
const Partida = require("../src/entities/Partida");

// Usa una carpeta temporal distinta en cada test para no ensuciar /data
verificarContratoDePartidaRepository(
  "PartidaRepositoryArchivo",
  () => new PartidaRepositoryArchivo(fs.mkdtempSync(path.join(os.tmpdir(), "partidas-")))
);

describe("PartidaRepositoryArchivo — persistencia REAL en disco", () => {
  it("la partida sobrevive a otra instancia del repositorio (como un reinicio del servidor)", () => {
    const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), "partidas-"));

    // 1er "proceso": se guarda la partida en un JSON y se "reinicia".
    const proceso1 = new PartidaRepositoryArchivo(carpetaTemporal);
    const partida = new Partida("p-persistente", new Jugador("j1", "Naruto"), new Jugador("j2", "Sasuke"));
    proceso1.guardar("p-persistente", partida);

    // 2do "proceso": instancia NUEVA (cache vacío, mismo disco).
    const proceso2 = new PartidaRepositoryArchivo(carpetaTemporal);
    const recuperada = proceso2.obtener("p-persistente");

    assert.equal(recuperada.id, "p-persistente");
    assert.equal(recuperada.jugadores.j1.nombre, "Naruto");
  });

  it("restaura chakra y vida fielmente al reconstruir desde el JSON", () => {
    const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), "partidas-"));
    const proceso = new PartidaRepositoryArchivo(carpetaTemporal);
    const j1 = new Jugador("naruto", "Naruto");
    const j2 = new Jugador("sasuke", "Sasuke");
    j1.ganarChakra(75);
    j1.recibirDanio(30);
    const partida = new Partida("p-chakra", j1, j2);
    partida.registrarEvento("un evento guardado");
    proceso.guardar("p-chakra", partida);

    const recuperada = proceso.obtener("p-chakra");
    assert.equal(recuperada.jugadores.naruto.chakra, 75);
    assert.equal(recuperada.jugadores.naruto.vida, 70);
    assert.equal(recuperada.eventos.length, 1);
  });

  it("devuelve null si el archivo no existe en disco", () => {
    const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), "partidas-"));
    const proceso = new PartidaRepositoryArchivo(carpetaTemporal);

    assert.equal(proceso.obtener("no-existe"), null);
  });
});
