export class TiempoService {

    constructor(segundosIniciales = 60) {
        this.segundos = segundosIniciales;
        this.temporizador = null;
    }

    iniciar(callback) {

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

    reiniciar(segundos = 60) {
        this.detener();
        this.segundos = segundos;
    }

    obtenerTiempo() {
        return this.segundos;
    }
}