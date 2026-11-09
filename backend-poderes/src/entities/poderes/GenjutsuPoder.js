const Poder = require("./Poder");

/**
 * Genjutsu: desorienta visualmente el tablero rival ~5s
 * (sin cambiar las posiciones reales). Se contrarresta con Byakugan.
 */
class GenjutsuPoder extends Poder {
  constructor() {
    super({ id: "genjutsu", nombre: "Genjutsu", costoChakra: 35, usosPermitidos: 1 });
  }

  activar({ jugador, rival, tablero, registrarEvento }) {
    jugador.gastarChakra(this.costoChakra);
    tablero.desorientarVisualmente(rival.id, { segundos: 5 });
    registrarEvento(`${jugador.nombre} activó Genjutsu sobre ${rival.nombre}`);
    return { tipo: "desorientacion", duracionSegundos: 5 };
  }

  puedeSerContrarrestadoPor(poderRival) {
    return poderRival.id === "byakugan";
  }
}

module.exports = GenjutsuPoder;
