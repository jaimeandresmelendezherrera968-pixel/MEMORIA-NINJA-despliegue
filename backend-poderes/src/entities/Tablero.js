/**
 * ENTIDAD: Tablero (versión simplificada para el backend de poderes)
 *
 * En tu frontend (board-manager.js) ya tenés la lógica real y visual del
 * tablero. Esta clase es una versión mínima para que el backend pueda
 * probar y validar la lógica de los poderes de forma aislada, sin
 * depender del DOM ni del navegador.
 */
class Tablero {
  constructor(totalCartas = 16) {
    this.cartasOcultas = Array.from({ length: totalCartas }, (_, i) => ({ id: i, revelada: false }));
  }

  revelarCartasOcultas(cantidad, { segundos }) {
    const ocultas = this.cartasOcultas.filter((c) => !c.revelada);
    const elegidas = ocultas.slice(0, cantidad);
    return elegidas.map((c) => c.id);
  }

  desorientarVisualmente(idJugadorAfectado, { segundos }) {
    return { idJugadorAfectado, segundos };
  }

  bloquearCartaAleatoria({ segundos }) {
    const ocultas = this.cartasOcultas.filter((c) => !c.revelada);
    if (ocultas.length === 0) return null;
    const elegida = ocultas[Math.floor(Math.random() * ocultas.length)];
    return elegida.id;
  }
}

module.exports = Tablero;
