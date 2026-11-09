export class TiempoService {


    constructor(segundosIniciales = 60) {

        this.segundos =
            segundosIniciales;

        this.temporizador = null;

        this.callback = null;

    }


    iniciar(callback) {

        this.callback =
            typeof callback === "function"
                ? callback
                : null;

        this.detener();

        this.crearIntervalo();

    }


    crearIntervalo() {

        if (this.temporizador) {

            return;

        }


        this.temporizador =
            setInterval(() => {

                this.segundos--;

                if (this.callback) {

                    this.callback(
                        this.segundos
                    );

                }


                if (
                    this.segundos <= 0
                ) {

                    this.detener();

                }

            }, 1000);

    }


    pausar() {

        this.detener();

    }


    reanudar() {

        if (this.segundos <= 0) {

            return;

        }

        this.crearIntervalo();

    }


    detener() {

        if (this.temporizador) {

            clearInterval(
                this.temporizador
            );

            this.temporizador = null;

        }

    }


    reiniciar(
        segundos = 60
    ) {

        this.detener();

        this.segundos =
            segundos;

    }


    obtenerTiempo() {

        return this.segundos;

    }

}