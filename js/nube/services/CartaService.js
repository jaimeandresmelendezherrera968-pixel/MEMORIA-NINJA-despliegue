import { Carta } from "../entities/carta.js";

export class CartaService {

    constructor(rutaBack, rutaNube) {
        this.rutaBack = rutaBack;
        this.rutaNube = rutaNube;

        this.cartasNube = [
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

        this.cartasNube.forEach(id => {

            const imagen = `${this.rutaNube}${id}.png`;

            cartas.push(new Carta(id, imagen));
            cartas.push(new Carta(id, imagen));

        });

        return this.mezclar(cartas);
    }

    mezclar(cartas) {

        return cartas.sort(() => Math.random() - 0.5);

    }
}