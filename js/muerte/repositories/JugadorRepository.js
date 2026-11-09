import {
    IJugadorRepository
} from "../interfaces/IJugadorRepository.js";


export class JugadorRepository
    extends IJugadorRepository {


    constructor() {

        super();

        this.clave =
            "jugadoresMuerte";

    }


    guardar(jugador) {

        localStorage.setItem(

            this.clave,

            JSON.stringify({

                nombre:
                    jugador.getNombre(),

                puntaje:
                    jugador.getPuntaje()

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