import { IPartidaRepository } from "../interfaces/IPartidaRepository.js";


export class PartidaRepository
    extends IPartidaRepository {


    guardar(partida) {

        const datos = {

            movimientos:
                partida.movimientos,

            segundos:
                partida.segundos,

            cartasEncontradas:
                partida.cartasEncontradas,

            puntaje:
                partida.obtenerJugador()
                    .getPuntaje()
        };


        localStorage.setItem(
            "partidaUchiha",
            JSON.stringify(datos)
        );
    }


    obtener() {

        const datos =
            localStorage.getItem(
                "partidaUchiha"
            );


        if (!datos) {
            return null;
        }


        return JSON.parse(datos);
    }
}