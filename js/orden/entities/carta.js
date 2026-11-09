export class Carta {

    constructor(id) {

        this.id = id;

        this.activa = false;

        this.correcta = false;

    }


    activar() {

        this.activa = true;

    }


    desactivar() {

        this.activa = false;

    }


    marcarCorrecta() {

        this.correcta = true;

    }


    desmarcarCorrecta() {

        this.correcta = false;

    }


    estaActiva() {

        return this.activa;

    }


    esCorrecta() {

        return this.correcta;

    }


    getId() {

        return this.id;

    }

}