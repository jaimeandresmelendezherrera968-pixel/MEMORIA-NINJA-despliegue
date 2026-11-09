export class TemporizadorService {
    #tiempoActual;
    #intervalo;
    #pausado;
    #elementoVisual;
    #alFinalizar;

    constructor(tiempoInicial, elementoVisual, alFinalizar) {
        this.#tiempoActual = tiempoInicial;
        this.#intervalo = null;
        this.#pausado = false;
        this.#elementoVisual = elementoVisual;
        this.#alFinalizar = alFinal;
    }

    iniciar() {
        this.#actualizarVisual();

        this.#intervalo = setInterval(() => {
            if (this.#pausado) {
                return;
            }

            this.#tiempoActual--;
            this.#actualizarVisual();

            if (this.#tiempoActual <= 0) {
                this.detener();
                this.#alFinalizar();
            }
        }, 1000);
    }

    pausar() {
        this.#pausado = true;
    }

    continuar() {
        this.#pausado = false;
    }

    detener() {
        if (this.#intervalo !== null) {
            clearInterval(this.#intervalo);
            this.#intervalo = null;
        }
    }

    #actualizarVisual() {
        if (this.#elementoVisual) {
            this.#elementoVisual.textContent = this.#tiempoActual;
        }
    }

    get pausado() {
        return this.#pausado;
    }

    get tiempoActual() {
        return this.#tiempoActual;
    }
}
