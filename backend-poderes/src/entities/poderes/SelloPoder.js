const Poder = require("./Poder");

/**
 * Sello de Bloqueo: bloquea una carta del rival por 5s.
 * Se evade con Sustitución.
 */
class SelloPoder extends Poder {
  constructor() {
    super({ id: "sello", nombre: "Sello de Bloqueo", costoChakra: 30, usosPermitidos: 1 });
  }

  activar({ jugador, tablero, registrarEvento }) {
    jugador.gastarChakra(this.costoChakra);
    const cartaBloqueada = tablero.bloquearCartaAleatoria({ segundos: 5 });
    registrarEvento(`${jugador.nombre} activó Sello de Bloqueo`);
    return { tipo: "bloqueo", duracionSegundos: 5, carta: cartaBloqueada };
  }

  puedeSerContrarrestadoPor(poderRival) {
    return poderRival.id === "sustitucion";
  }
}

module.exports = SelloPoder;
