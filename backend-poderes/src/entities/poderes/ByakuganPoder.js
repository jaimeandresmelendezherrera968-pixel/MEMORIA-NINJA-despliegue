const Poder = require("./Poder");

/**
 * Byakugan: revela 2 cartas ocultas del rival por 3 segundos.
 * Puede ser contrarrestado por Sello.
 */
class ByakuganPoder extends Poder {
  constructor() {
    super({ id: "byakugan", nombre: "Byakugan", costoChakra: 20, usosPermitidos: 1 });
  }

  activar({ jugador, rival, tablero, registrarEvento }) {
    jugador.gastarChakra(this.costoChakra);
    const cartasReveladas = tablero.revelarCartasOcultas(2, { segundos: 3 });
    registrarEvento(`${jugador.nombre} activó Byakugan y reveló ${cartasReveladas.length} cartas`);
    return { tipo: "revelacion", duracionSegundos: 3, cartas: cartasReveladas };
  }

  puedeSerContrarrestadoPor(poderRival) {
    return poderRival.id === "sello";
  }
}

module.exports = ByakuganPoder;
