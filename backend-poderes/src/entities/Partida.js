const Tablero = require("./Tablero");

/**
 * ENTIDAD: Partida
 * Agrupa a los dos jugadores, el tablero y el historial de eventos.
 * Es una entidad "pura": solo datos y reglas propias, sin saber nada
 * de HTTP ni de dónde se guarda.
 */
class Partida {
  constructor(id, jugador1, jugador2) {
    this.id = id;
    this.jugadores = { [jugador1.id]: jugador1, [jugador2.id]: jugador2 };
    this.tablero = new Tablero();
    this.eventos = [];
    this.poderesActivos = {}; // idJugador -> Poder activo (para detectar contraataques)
    this.usosPoderes = {}; // idJugador -> { idPoder -> usos restantes }
  }

  /** Usos disponibles de un poder. Inicializa el contador la primera vez. */
  usosDisponibles(idJugador, idPoder, usosIniciales = 2) {
    if (!this.usosPoderes[idJugador]) this.usosPoderes[idJugador] = {};
    const usos = this.usosPoderes[idJugador];
    if (usos[idPoder] === undefined) usos[idPoder] = usosIniciales;
    return usos[idPoder];
  }

  /** Descuenta un uso. Devuelve false si ya no quedaban. */
  consumirUso(idJugador, idPoder, usosIniciales = 2) {
    const restantes = this.usosDisponibles(idJugador, idPoder, usosIniciales);
    if (restantes <= 0) return false;
    this.usosPoderes[idJugador][idPoder] = restantes - 1;
    return true;
  }

  obtenerJugador(idJugador) {
    const jugador = this.jugadores[idJugador];
    if (!jugador) throw new Error(`Jugador ${idJugador} no pertenece a esta partida`);
    return jugador;
  }

  obtenerRival(idJugador) {
    const idRival = Object.keys(this.jugadores).find((id) => id !== idJugador);
    return this.jugadores[idRival];
  }

  registrarEvento(mensaje) {
    this.eventos.push({ mensaje, fecha: new Date().toISOString() });
  }

  marcarPoderActivo(idJugador, poder) {
    this.poderesActivos[idJugador] = poder;
  }

  poderActivoDe(idJugador) {
    return this.poderesActivos[idJugador] || null;
  }
}

module.exports = Partida;
