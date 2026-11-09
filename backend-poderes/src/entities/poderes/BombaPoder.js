const Poder = require("./Poder");

/**
 * Bomba Explosiva: resta 20 de vida al rival (10 si tiene
 * Sustitución avanzada activa). Mitigada por Sustitución.
 */
class BombaPoder extends Poder {
  constructor() {
    super({ id: "bomba", nombre: "Bomba Explosiva", costoChakra: 50, usosPermitidos: 1 });
  }

  activar({ jugador, rival, registrarEvento }) {
    jugador.gastarChakra(this.costoChakra);
    const rivalMitigaConSustitucion = rival.tieneSustitucionActiva === true;
    const danio = rivalMitigaConSustitucion ? 10 : 20;
    rival.recibirDanio(danio);
    registrarEvento(`${jugador.nombre} activó Bomba Explosiva (-${danio} vida a ${rival.nombre})`);
    return { tipo: "danio", vidaRestada: danio };
  }

  puedeSerContrarrestadoPor(poderRival) {
    return poderRival.id === "sustitucion";
  }
}

module.exports = BombaPoder;
