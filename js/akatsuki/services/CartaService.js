import { Carta } from "../entities/carta.js";

export class CartaService {

    constructor(rutaBack, rutaAkatsuki) {
        this.rutaBack = rutaBack;
        this.rutaAkatsuki = rutaAkatsuki;

        this.cartasAkatsuki = [
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

        this.cartasAkatsuki.forEach(id => {

            const imagen = `${this.rutaAkatsuki}${id}.png`;

            cartas.push(new Carta(id, imagen));
            cartas.push(new Carta(id, imagen));

        });

        return this.mezclar(cartas);
    }

    mezclar(cartas) {

        return cartas.sort(() => Math.random() - 0.5);

    }
}