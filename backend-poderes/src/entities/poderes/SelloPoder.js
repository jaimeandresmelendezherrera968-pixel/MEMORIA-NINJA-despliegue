const Poder = require("./Poder");

/**
 * Sello de Bloqueo: bloquea una carta del rival por 5s.
 * Se evade con Sustitución.
 */
class SelloPoder extends Poder {
  constructor() {
    super({ id: "sello", nombre: "Sello de Bloqueo", costoChakra: 30, usosPermitidos: 2 });
  }

  activar({ jugador, rival, tablero, registrarEvento }) {
    jugador.gastarChakra(this.costoChakra);
    if (rival?.tieneSustitucionActiva) {
      rival.consumirSustitucion();
      registrarEvento(`${rival.nombre} evadió el Sello de Bloqueo con Sustitución`);
      return { tipo: "evadido", carta: null };
    }
    const cartaBloqueada = tablero.bloquearCartaAleatoria({ segundos: 5 });
    registrarEvento(`${jugador.nombre} activó Sello de Bloqueo`);
    return { tipo: "bloqueo", duracionSegundos: 5, carta: cartaBloqueada };
  }

  puedeSerContrarrestadoPor(poderRival) {
    return poderRival.id === "sustitucion";
  }
}

module.exports = SelloPoder;
