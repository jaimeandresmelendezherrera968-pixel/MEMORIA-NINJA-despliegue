const PartidaRepository = require("./PartidaRepository");

/**
 * IMPLEMENTACIÓN CONCRETA: guarda las partidas en un Map en memoria.
 *
 * >>> LSP (Sustitución de Liskov) <<<
 * Esta clase puede usarse en cualquier lugar donde se espere un
 * PartidaRepository, sin romper nada — cumple exactamente el mismo
 * contrato (obtener/guardar), solo cambia CÓMO lo hace por dentro.
 */
class PartidaRepositoryMemoria extends PartidaRepository {
  constructor() {
    super();
    this.partidas = new Map();
  }

  obtener(idPartida) {
    return this.partidas.get(idPartida) || null;
  }

  guardar(idPartida, partida) {
    this.partidas.set(idPartida, partida);
  }
}

module.exports = PartidaRepositoryMemoria;
