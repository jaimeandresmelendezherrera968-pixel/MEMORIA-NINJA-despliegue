import { ResultadoJuego } from "./ResultadoJuego.js";

export class ResultadoPerdedor extends ResultadoJuego {
    #sonido;

    constructor(sonido) {
        super();
        this.#sonido = sonido;
    }

    ejecutar(mensaje) {
        mensaje.textContent = "¡PERDISTE!";
        this.#sonido.play();
    }
}
