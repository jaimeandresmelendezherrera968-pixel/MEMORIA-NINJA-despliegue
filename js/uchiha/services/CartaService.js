import { Carta } from "../entities/carta.js";


export class CartaService {

    constructor(rutaBack, rutaUchiha) {

        this.rutaBack = rutaBack;

        this.rutaUchiha = rutaUchiha;


        this.cartasUchiha = [
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8"
        ];
    }


    obtenerCartas() {

        let cartas = [];


        this.cartasUchiha.forEach(id => {

            const imagen =
                `${this.rutaUchiha}${id}.png`;


            cartas.push(
                new Carta(id, imagen)
            );


            cartas.push(
                new Carta(id, imagen)
            );
        });


        return this.mezclar(cartas);
    }


    mezclar(cartas) {

        return cartas.sort(
            () => Math.random() - 0.5
        );
    }
}