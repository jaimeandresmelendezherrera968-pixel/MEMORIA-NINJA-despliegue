import {
    IPartidaRepository
} from "../interfaces/IPartidaRepository.js";


export class PartidaRepository
    extends IPartidaRepository {


    constructor() {

        super();

        this.clave =
            "partidaMuerte";

    }


    guardar(partida) {

        localStorage.setItem(

            this.clave,

            JSON.stringify({

                movimientos:
                    partida.movimientos,

                cartasEncontradas:
                    partida.cartasEncontradas,

                jugadorActual:
                    partida.jugadorActual,

                segundos:
                    partida.segundos

            })

        );

    }


    obtener() {

        const datos =
            localStorage.getItem(
                this.clave
            );


        if (!datos) {

            return null;

        }


        return JSON.parse(datos);

    }

}