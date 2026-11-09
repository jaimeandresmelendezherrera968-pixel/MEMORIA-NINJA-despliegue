/**
 * CLASE ABSTRACTA: Poder
 *
 * >>> ABSTRACCIÓN <<<
 * Esta clase define el CONTRATO que todo poder tiene que cumplir:
 * un nombre, un costo de chakra, y un método activar(). Nadie debería
 * poder instanciar "new Poder()" directamente, solo sus hijos concretos
 * (ByakuganPoder, SustitucionPoder, etc.).
 *
 * >>> HERENCIA <<<
 * ByakuganPoder, SustitucionPoder, RoboChakraPoder, GenjutsuPoder,
 * SelloPoder y BombaPoder heredan de esta clase (relación "es-un poder").
 * Todos comparten id, nombre, costoChakra y usosPermitidos sin duplicar
 * ese código en cada uno.
 *
 * >>> POLIMORFISMO <<<
 * El PoderService llama SIEMPRE a poder.activar(contexto) sin importar
 * qué poder concreto sea. Cada clase hija responde distinto a ese mismo
 * llamado: Byakugan revela cartas, Sustitución arma una defensa, Bomba
 * resta vida, etc. Es el mismo método, comportamientos distintos.
 */
class Poder {
  constructor({ id, nombre, costoChakra, usosPermitidos = 1 }) {
    if (new.target === Poder) {
      throw new Error("Poder es abstracta: no se puede instanciar directamente, solo sus hijos concretos");
    }
    this.id = id;
    this.nombre = nombre;
    this.costoChakra = costoChakra;
    this.usosPermitidos = usosPermitidos;
  }

  /**
   * Contrato que cada poder concreto debe implementar.
   * @param {object} contexto - { jugador, rival, tablero, registrarEvento }
   * @returns {object} resultado del efecto aplicado
   */
  activar(contexto) {
    throw new Error(`El poder "${this.nombre}" no implementó activar()`);
  }

  /**
   * Contrato opcional: cómo puede ser contrarrestado.
   * Se puede sobreescribir en el hijo si aplica (ISP: el que no lo
   * necesita, simplemente no lo sobreescribe, no está obligado a
   * implementar lógica que no le sirve).
   */
  puedeSerContrarrestadoPor(poderRival) {
    return false;
  }
}

module.exports = Poder;
