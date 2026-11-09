import { Carta } from "../entities/carta.js";


export class CartaService {

    constructor(rutaBack, rutaUzumaki) {

        this.rutaBack = rutaBack;

        this.rutaUzumaki = rutaUzumaki;


        this.cartasUzumaki = [
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


        this.cartasUzumaki.forEach(id => {

            const imagen =
                `${this.rutaUzumaki}${id}.png`;


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