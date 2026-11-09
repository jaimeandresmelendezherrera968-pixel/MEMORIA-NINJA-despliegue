export class TiempoService {

    constructor(partida) {

        this.partida = partida;

        this.temporizador = null;

        this.pausado = false;

    }


    iniciar(callback) {

        this.detener();

        this.temporizador = setInterval(() => {

            if (this.pausado) {

                return;

            }


            this.partida.sumarTiempo();


            if (callback) {

                callback(
                    this.partida.minutos,
                    this.partida.segundos
                );

            }

        }, 1000);

    }


    pausar() {

        this.pausado = true;

    }


    reanudar() {

        this.pausado = false;

    }


    detener() {

        if (this.temporizador) {

            clearInterval(
                this.temporizador
            );

            this.temporizador = null;

        }

    }


    reiniciar() {

        this.detener();

        this.partida.segundos = 0;

        this.partida.minutos = 0;

        this.pausado = false;

    }

}