const Poder = require("./Poder");

/**
 * Jutsu de Sustitución: arma una ventana de defensa de 8 segundos.
 * Es defensivo por naturaleza, no ataca directamente al rival.
 */
class SustitucionPoder extends Poder {
  constructor() {
    super({ id: "sustitucion", nombre: "Jutsu de Sustitución", costoChakra: 25, usosPermitidos: 1 });
  }

  activar({ jugador, registrarEvento }) {
    jugador.gastarChakra(this.costoChakra);
    registrarEvento(`${jugador.nombre} activó Sustitución (defensa armada por 8s)`);
    return { tipo: "defensa", duracionSegundos: 8 };
  }
}

module.exports = SustitucionPoder;
