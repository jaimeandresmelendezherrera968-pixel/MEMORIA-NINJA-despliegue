import { IPartidaRepository } from "../interfaces/IPartidaRepository.js";

export class PartidaRepository
    extends IPartidaRepository {


    constructor() {

        super();

        this.clave =
            "partidaOrden";

    }


    guardar(partida) {

        localStorage.setItem(
            this.clave,
            JSON.stringify({

                ronda:
                    partida.ronda,

                puntaje:
                    partida.jugador
                        .getPuntaje(),

                segundos:
                    partida.segundos,

                minutos:
                    partida.minutos

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