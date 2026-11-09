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
}

module.exports = Jugador;
