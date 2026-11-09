export class TiempoService {

    constructor(segundosIniciales = 60) {
        this.segundos = segundosIniciales;
        this.temporizador = null;
        this.callback = null;
        this.pausado = false;
    }

    iniciar(callback) {
        this.callback = callback;
        this.pausado = false;

        this.detener();

        this.temporizador = setInterval(() => {
            this.segundos--;
            callback(this.segundos);

            if (this.segundos <= 0) {
                this.detener();
            }
        }, 1000);
    }

    detener() {
        if (this.temporizador) {
            clearInterval(this.temporizador);
            this.temporizador = null;
        }
    }

    pausar() {
        if (this.pausado) {
            return;
        }

        this.pausado = true;
        this.detener();
    }

    reanudar() {
        if (!this.pausado || typeof this.callback !== "function") {
            return;
        }

        this.iniciar(this.callback);
    }

    reiniciar(segundos = 60) {
        this.detener();
        this.segundos = segundos;
        this.pausado = false;
    }

    obtenerTiempo() {
        return this.segundos;
    }
}
