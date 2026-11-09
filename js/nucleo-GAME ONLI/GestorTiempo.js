/**
 * GESTOR DE TIEMPO
 *
 * >>> SRP <<< Solo sabe de cronómetros: arrancarlos, contar para atrás,
 * pararlos, y formatear "mm:ss". No sabe nada de turnos, poderes, ni DOM.
 */
export class GestorTiempo {
    #tiempoSasuke;
    #tiempoNaruto;
    #intervalo = null;
    #tiempoInicial;

    constructor(tiempoInicialEnSegundos) {
        this.#tiempoInicial = tiempoInicialEnSegundos;
        this.#tiempoSasuke = tiempoInicialEnSegundos;
        this.#tiempoNaruto = tiempoInicialEnSegundos;
    }

    get tiempoSasuke() { return this.#tiempoSasuke; }
    get tiempoNaruto() { return this.#tiempoNaruto; }

    /** onTick(tiempoSasuke, tiempoNaruto) se llama cada segundo. */
    iniciar(onTick) {
        this.#tiempoSasuke = this.#tiempoInicial;
        this.#tiempoNaruto = this.#tiempoInicial;

        if (this.#intervalo) clearInterval(this.#intervalo);

        this.#intervalo = setInterval(() => {
            onTick(this.#tiempoSasuke, this.#tiempoNaruto);
        }, 1000);
    }

    /** Le resta 1 segundo al jugador que tiene el turno ahora. */
    descontarSegundo(esTurnoDeSasuke) {
        if (esTurnoDeSasuke) {
            this.#tiempoSasuke--;
        } else {
            this.#tiempoNaruto--;
        }
        return this.#tiempoSasuke <= 0 || this.#tiempoNaruto <= 0;
    }

    detener() {
        if (this.#intervalo) {
            clearInterval(this.#intervalo);
            this.#intervalo = null;
        }
    }

    static formatear(segundos) {
        const s = Math.max(0, segundos);
        const min = String(Math.floor(s / 60)).padStart(2, "0");
        const seg = String(s % 60).padStart(2, "0");
        return `${min}:${seg}`;
    }
}
