const ByakuganPoder = require("../entities/poderes/ByakuganPoder");
const SustitucionPoder = require("../entities/poderes/SustitucionPoder");
const RoboChakraPoder = require("../entities/poderes/RoboChakraPoder");
const GenjutsuPoder = require("../entities/poderes/GenjutsuPoder");
const SelloPoder = require("../entities/poderes/SelloPoder");
const BombaPoder = require("../entities/poderes/BombaPoder");

/**
 * FÁBRICA DE PODERES (patrón Factory Method)
 *
 * >>> OCP (Abierto/Cerrado), versión fuerte <<<
 * No es un mapa fijo armado una sola vez: es una fábrica que sabe
 * CONSTRUIR poderes por id, y que además se le pueden registrar
 * constructores nuevos en tiempo de ejecución con registrar(). Para
 * sumar un poder nuevo mañana, ni siquiera hay que tocar este archivo:
 * alcanza con hacer `fabrica.registrar("kagebunshin", KagebunshinPoder)`
 * desde donde sea, y el resto del sistema (PoderService, Controller)
 * sigue funcionando exactamente igual.
 *
 * >>> DIP <<<
 * PoderService depende de "una fábrica que me da poderes", no de las
 * clases concretas de cada poder.
 */
class PoderFactory {
  constructor() {
    this.constructoresPorId = new Map();
    this.#registrarPoderesBase();
  }

  #registrarPoderesBase() {
    this.registrar("byakugan", ByakuganPoder);
    this.registrar("sustitucion", SustitucionPoder);
    this.registrar("robo", RoboChakraPoder);
    this.registrar("genjutsu", GenjutsuPoder);
    this.registrar("sello", SelloPoder);
    this.registrar("bomba", BombaPoder);
  }

  /**
   * Registra un constructor de poder nuevo. Esto es lo que hace posible
   * sumar poderes sin modificar el código existente (OCP real).
   */
  registrar(idPoder, ClaseConstructora) {
    this.constructoresPorId.set(idPoder, ClaseConstructora);
  }

  /**
   * Crea una instancia NUEVA del poder pedido. Se crea nueva cada vez
   * (en vez de reusar una sola instancia compartida) para que ningún
   * poder pueda arrastrar estado de una activación anterior a la
   * siguiente — cada activación empieza "limpia".
   */
  crear(idPoder) {
    const ClaseConstructora = this.constructoresPorId.get(idPoder);
    if (!ClaseConstructora) {
      throw new Error(`No existe un poder con id "${idPoder}"`);
    }
    return new ClaseConstructora();
  }

  idsDisponibles() {
    return Array.from(this.constructoresPorId.keys());
  }
}

module.exports = PoderFactory;
