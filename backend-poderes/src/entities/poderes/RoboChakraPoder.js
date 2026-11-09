const Poder = require("./Poder");

/**
 * Robo de Chakra: le roba ~20 de chakra al rival.
 * Puede ser evadido por Sustitución.
 */
class RoboChakraPoder extends Poder {
  constructor() {
    super({ id: "robo", nombre: "Robo de Chakra", costoChakra: 30, usosPermitidos: 1 });
  }

  activar({ jugador, rival, registrarEvento }) {
    jugador.gastarChakra(this.costoChakra);
    const robado = Math.min(20, rival.chakra);
    rival.gastarChakra(robado);
    jugador.ganarChakra(robado);
    registrarEvento(`${jugador.nombre} le robó ${robado} de chakra a ${rival.nombre}`);
    return { tipo: "robo", chakraRobado: robado };
  }

  puedeSerContrarrestadoPor(poderRival) {
    return poderRival.id === "sustitucion";
  }
}

module.exports = RoboChakraPoder;
