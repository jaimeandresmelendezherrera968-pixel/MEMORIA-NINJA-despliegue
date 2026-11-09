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
            "partidaUzumaki",
            JSON.stringify(datos)
        );
    }


    obtener() {

        const datos =
            localStorage.getItem(
                "partidaUzumaki"
            );


        if (!datos) {
            return null;
        }


        return JSON.parse(datos);
    }
}