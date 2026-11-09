import { Carta } from "../entities/carta.js";

export class CartaService {
    constructor() {
        this.rutaBack = "assets/img/respaldomuerte.png";
        this.rutaAldeas = "assets/img/cards/aldeas/";
        this.cartasDisponibles = [
            // KONOHA
            ...["1","2","3","4","5","6","7","8"].map((valor) => ({ aldea: "konoha", clan: "uzumaki", valor })),
            ...["1","2","3","4","5","6"].map((valor) => ({ aldea: "konoha", clan: "hyuga", valor })),
            ...["1","2","3","4","5","6","7","8"].map((valor) => ({ aldea: "konoha", clan: "uchiha", valor })),
            ...["1","2","3","4","5","6"].map((valor) => ({ aldea: "konoha", clan: "sarutobi", valor })),
            // OTRAS ALDEAS
            ...["1","2","3","4","5","6","7","8"].map((valor) => ({ aldea: "arena", valor })),
            ...["1","2","3","4","5","6","7","8"].map((valor) => ({ aldea: "roca", valor })),
            ...["1","2","3","4","5","6","7","8"].map((valor) => ({ aldea: "niebla", valor })),
            ...["1","2","3","4","5","6","7","8"].map((valor) => ({ aldea: "nube", valor })),
            // AKATSUKI
            ...["1","2","3","4","5","6","7","8"].map((valor) => ({ aldea: "akatsuki", valor })),
        ];
    }

    // Modo a muerte: progresión mixta por nivel (dificultad = nº de pares).
    // Las cartas se toman al azar de TODAS las aldeas/clanes (sin filtrar por clan).
    obtenerNiveles() {
        return [{ cartas: 6 }, { cartas: 8 }, { cartas: 10 }, { cartas: 12 }, { cartas: 14 }, { cartas: 16 }];
    }

    generarTablero(nivelActual) {
        const niveles = this.obtenerNiveles();
        const nivel = niveles[Math.max(0, Math.min(nivelActual - 1, niveles.length - 1))];
        const cantidad = Math.min(nivel.cartas, this.cartasDisponibles.length);

        const disponibles = [...this.cartasDisponibles].sort(() => Math.random() - 0.5);
        const seleccionadas = disponibles.slice(0, cantidad);

        const cartasJuego = [];
        seleccionadas.forEach((datos, indice) => {
            cartasJuego.push(new Carta(datos.aldea, datos.clan || null, datos.valor, indice));
            cartasJuego.push(new Carta(datos.aldea, datos.clan || null, datos.valor, indice));
        });
        cartasJuego.sort(() => Math.random() - 0.5);
        return cartasJuego;
    }

    obtenerImagenFrontal(carta) {
        if (carta.getAldea() === "konoha") {
            return this.rutaAldeas + "konoha/" + carta.getClan() + "/" + carta.getValor() + ".png";
        }
        return this.rutaAldeas + carta.getAldea() + "/" + carta.getValor() + ".png";
    }

    obtenerImagenBack() {
        return this.rutaBack;
    }
}
