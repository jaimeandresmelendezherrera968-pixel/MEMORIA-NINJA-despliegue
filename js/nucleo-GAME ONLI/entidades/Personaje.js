/**
 * ENTIDAD: Personaje
 *
 * Reemplaza los dos objetos planos "jugador" y "rival" que había
 * sueltos en game-online.js. Antes cualquier parte del código podía
 * hacer "jugador.chakra -= loQueSea" directo — ahora todo pasa por
 * métodos que validan (no bajar de 0, no pasar el máximo).
 *
 * >>> ENCAPSULAMIENTO <<<
 * #chakra, #vida y #combo son campos privados reales de JavaScript.
 */
export class Personaje {
    #chakra;
    #vida;
    #combo = 0;
    #aciertos = 0;
    #errores = 0;

    static CHAKRA_MAXIMO = 100;
    static VIDA_MAXIMA = 100;

    constructor({ nombre, nivel, chakraInicial, vidaInicial = Personaje.VIDA_MAXIMA }) {
        this.nombre = nombre;
        this.nivel = nivel;
        this.#chakra = chakraInicial;
        this.#vida = vidaInicial;
    }

    get chakra() { return this.#chakra; }
    get vida() { return this.#vida; }
    get combo() { return this.#combo; }
    get aciertos() { return this.#aciertos; }
    get errores() { return this.#errores; }

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
        this.#chakra = Math.min(Personaje.CHAKRA_MAXIMO, this.#chakra + cantidad);
    }

    recibirDanio(cantidad) {
        this.#vida = Math.max(0, this.#vida - cantidad);
    }

    registrarAcierto() {
        this.#aciertos++;
        this.#combo++;
    }

    registrarError() {
        this.#errores++;
        const teniaCombo = this.#combo > 0;
        this.#combo = 0;
        return teniaCombo;
    }

    estaDerrotado() {
        return this.#vida <= 0;
    }
}
