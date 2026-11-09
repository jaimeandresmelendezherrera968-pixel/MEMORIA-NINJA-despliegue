const { randomUUID } = require("node:crypto");
const Jugador = require("../entities/Jugador");
const Partida = require("../entities/Partida");

/**
 * SERVICIO: PartidaService
 *
 * >>> SRP <<<
 * Reglas de negocio de ARRANCAR una partida: validar los jugadores,
 * asignarles el chakra inicial y persistirla a través del repositorio.
 * No sabe nada de HTTP (eso es del Controller) ni de SQL/SQLite (eso es
 * del repositorio).
 *
 * >>> DIP <<<
 * Recibe el repositorio por constructor. La misma parida se puede
 * persistir en memoria, en archivos o en SQLite sin que este servicio
 * cambie una línea (ver PartidaRepositoryMemoria/Archivo/SQL en los tests).
 */
class PartidaService {
  constructor(partidaRepository) {
    this.partidaRepository = partidaRepository;
  }

  /**
   * Crea y persiste una partida nueva de dos jugadores.
   *
   * @param {Object} datos
   * @param {string} datos.idJugador1 Identificador único del jugador 1.
   * @param {string} datos.nombre1    Nombre visible del jugador 1.
   * @param {string} datos.idJugador2 Identificador único del jugador 2.
   * @param {string} datos.nombre2    Nombre visible del jugador 2.
   * @param {number} [datos.chakraInicial1=50] Chakra inicial del jugador 1 (0-100).
   * @param {number} [datos.chakraInicial2=50] Chakra inicial del jugador 2 (0-100).
   *
   * @returns {{ idPartida: string, jugadores: Array<{id,nombre,chakra,vida}> }}
   */
  async crearPartida({ idJugador1, nombre1, idJugador2, nombre2, chakraInicial1, chakraInicial2 } = {}) {
    if (!idJugador1 || !idJugador2) {
      throw new Error("Se requieren los identificadores de ambos jugadores");
    }
    if (!nombre1 || !nombre2) {
      throw new Error("Se requieren los nombres de ambos jugadores");
    }
    if (idJugador1 === idJugador2) {
      throw new Error("Los dos jugadores deben tener identificadores distintos");
    }

    const chakra1 = validarChakra(chakraInicial1, "chakra inicial del jugador 1");
    const chakra2 = validarChakra(chakraInicial2, "chakra inicial del jugador 2");

    const jugador1 = new Jugador(idJugador1, nombre1);
    const jugador2 = new Jugador(idJugador2, nombre2);
    jugador1.ganarChakra(chakra1);
    jugador2.ganarChakra(chakra2);

    const partida = new Partida(randomUUID(), jugador1, jugador2);
    await this.partidaRepository.guardar(partida.id, partida);

    return {
      idPartida: partida.id,
      jugadores: [resumenJugador(jugador1), resumenJugador(jugador2)],
    };
  }
}

function validarChakra(valor, nombre) {
  const numero = valor === undefined ? 50 : Number(valor);
  if (Number.isNaN(numero) || numero < 0 || numero > 100) {
    throw new Error(`El ${nombre} debe ser un número entre 0 y 100`);
  }
  return Math.floor(numero);
}

function resumenJugador(jugador) {
  return { id: jugador.id, nombre: jugador.nombre, chakra: jugador.chakra, vida: jugador.vida };
}

module.exports = PartidaService;