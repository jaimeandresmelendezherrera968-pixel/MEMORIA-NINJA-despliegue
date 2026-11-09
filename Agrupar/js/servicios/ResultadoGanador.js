import { ResultadoJuego } from "./ResultadoJuego.js";

export class ResultadoGanador extends ResultadoJuego {
    #sonido;
    #servicioUsuarios;

    constructor(sonido, servicioUsuarios) {
        super();
        this.#sonido = sonido;
        this.#servicioUsuarios = servicioUsuarios;
    }

    ejecutar(mensaje) {
        mensaje.textContent = "¡GANASTE!";
        this.#sonido.play();
        this.#servicioUsuarios.registrarVictoriaFacil();
    }
}
