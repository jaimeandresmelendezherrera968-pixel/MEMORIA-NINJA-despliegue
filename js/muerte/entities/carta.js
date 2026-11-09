export class Carta {

    constructor(aldea, clan, valor, idPareja) {

        this.aldea = aldea;

        this.clan = clan;

        this.valor = valor;

        this.idPareja = idPareja;

        this.volteada = false;

        this.emparejada = false;

    }


    voltear() {

        this.volteada = true;

    }


    ocultar() {

        this.volteada = false;

    }


    marcarEmparejada() {

        this.emparejada = true;

    }


    estaVolteada() {

        return this.volteada;

    }


    estaEmparejada() {

        return this.emparejada;

    }


    getAldea() {

        return this.aldea;

    }


    getClan() {

        return this.clan;

    }


    getValor() {

        return this.valor;

    }


    getIdPareja() {

        return this.idPareja;

    }

}