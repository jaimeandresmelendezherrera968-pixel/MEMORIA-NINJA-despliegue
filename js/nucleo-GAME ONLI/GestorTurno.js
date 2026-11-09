/**
 * GESTOR DE TURNO
 *
 * >>> SRP <<< Esta clase hace UNA sola cosa: saber de quién es el
 * turno y avisar cuando cambia. Antes esto era una variable suelta
 * (let turnoJugador) leída y escrita desde cualquier parte del archivo.
 */
export class GestorTurno {
    #esTurnoDeSasuke = true;
    #modoPruebaLocal;
    #miPersonajeEsSasuke;
    #oyentesDeCambio = [];

    constructor({ modoPruebaLocal, miPersonajeEsSasuke }) {
        this.#modoPruebaLocal = modoPruebaLocal;
        this.#miPersonajeEsSasuke = miPersonajeEsSasuke;
    }

    esTurnoDeSasuke() {
        return this.#esTurnoDeSasuke;
    }

    esMiTurno() {
        if (this.#modoPruebaLocal) return true;
        return this.#miPersonajeEsSasuke ? this.#esTurnoDeSasuke : !this.#esTurnoDeSasuke;
    }

    /** Se suscribe una función que se llama cada vez que cambia el turno (Observer). */
    alCambiarTurno(callback) {
        this.#oyentesDeCambio.push(callback);
    }

    cambiar() {
        this.#esTurnoDeSasuke = !this.#esTurnoDeSasuke;
        this.#oyentesDeCambio.forEach((callback) => callback(this.#esTurnoDeSasuke));
    }
}
