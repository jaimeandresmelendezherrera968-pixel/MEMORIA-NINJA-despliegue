const PartidaRepositoryMemoria = require("../src/repositories/PartidaRepositoryMemoria");
const verificarContratoDePartidaRepository = require("./contratoPartidaRepository");

verificarContratoDePartidaRepository("PartidaRepositoryMemoria", () => new PartidaRepositoryMemoria());
