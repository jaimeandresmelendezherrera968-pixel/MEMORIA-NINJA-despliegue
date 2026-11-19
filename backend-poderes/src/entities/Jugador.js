/**
 * ENTIDAD: Jugador
 *
 * >>> ENCAPSULAMIENTO <<<
 * El chakra y la vida son campos privados (#chakra, #vida). Nadie desde
 * afuera puede hacer "jugador.chakra = 9999" para hacer trampa: solo se
 * puede leer con los getters, y solo se puede modificar a través de los
 * métodos de la clase (gastarChakra, recibirDanio, etc.), que además
 * validan que los valores tengan sentido (no bajar de 0, no pasar el máximo).
 */
class Jugador {
  #chakra;
  #vida;
  #chakraMaximo = 100;
  #vidaMaxima = 100;
  #sustitucionActivaHasta = 0;

  constructor(id, nombre) {
    this.id = id;
    this.nombre = nombre;
    this.#chakra = 0;
    this.#vida = this.#vidaMaxima;
  }

  get chakra() {
    return this.#chakra;
  }

  get vida() {
    return this.#vida;
  }

  tieneChakraPara(costo) {
    return this.#chakra >= costo;
  }

  gastarChakra(cantidad) {
    if (!this.tieneChakraPara(cantidad)) {
      throw new Error(`${this.nombre} no tiene suficiente chakra`);
    }
    this.#chakra -= cantidad;
  }

  ganarChakra(cantidad) {
    this.#chakra = Math.min(this.#chakraMaximo, this.#chakra + cantidad);
  }

  recibirDanio(cantidad) {
    this.#vida = Math.max(0, this.#vida - cantidad);
  }

  estaDerrotado() {
    return this.#vida <= 0;
  }

  /**
   * La Sustitución es una defensa pasiva con vencimiento por tiempo.
   * Se guarda el instante exacto en que expira (en vez de un setTimeout)
   * para no dejar timers colgando y para que la lectura sea determinista.
   */
  activarSustitucion(duracionSegundos = 8) {
    this.#sustitucionActivaHasta = Date.now() + Math.max(0, duracionSegundos) * 1000;
  }

  get tieneSustitucionActiva() {
    return Date.now() < this.#sustitucionActivaHasta;
  }

  consumirSustitucion() {
    this.#sustitucionActivaHasta = 0;
  }
}

module.exports = Jugador;
