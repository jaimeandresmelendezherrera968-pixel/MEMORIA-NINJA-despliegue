import { Poder } from "./Poder.js";

const CANTIDAD_ROBADA = 20;

export class RoboPoder extends Poder {
    constructor() {
        super({
            id: "robo",
            nombre: "Robo de Chakra",
            costoChakra: 30,
            usosIniciales: 2,
            botonId: "btnRobo",
            contadorId: "usosRobo",
        });
    }

    // El costo ya se descontó en Poder.activar() antes de llamar a efecto();
    // acá solo falta la parte específica de Robo: quitarle chakra al rival.
    efecto(contexto, esSasuke, atacante) {
        const defensor = contexto.obtenerRivalDe(esSasuke);

        const robado = Math.min(CANTIDAD_ROBADA, defensor.chakra);
        defensor.gastarChakra(robado);
        atacante.ganarChakra(robado);

        contexto.actualizarChakra();
        this._activarAnimacion(esSasuke, robado);
    }

    _activarAnimacion(esSasuke, robado) {
        const origenSelector = esSasuke
            ? ".panel-naruto-lateral .chakra-barra"
            : ".panel-personaje-lateral .chakra-barra";
        const destinoSelector = esSasuke
            ? ".panel-personaje-lateral .chakra-barra"
            : ".panel-naruto-lateral .chakra-barra";

        const origen = document.querySelector(origenSelector);
        const destino = document.querySelector(destinoSelector);

        if (origen) {
            origen.classList.add("robo-origen-efecto");
            setTimeout(() => origen.classList.remove("robo-origen-efecto"), 700);
        }
        if (destino) {
            destino.classList.add("robo-destino-efecto");
            setTimeout(() => destino.classList.remove("robo-destino-efecto"), 700);
        }

        if (origen && destino) {
            const rectOrigen = origen.getBoundingClientRect();
            const rectDestino = destino.getBoundingClientRect();
            const rayo = document.createElement("div");
            rayo.className = "robo-rayo";
            rayo.style.left = (rectOrigen.left + rectOrigen.width / 2) + "px";
            rayo.style.top = (rectOrigen.top + rectOrigen.height / 2) + "px";
            rayo.style.setProperty("--dx", (rectDestino.left - rectOrigen.left) + "px");
            rayo.style.setProperty("--dy", (rectDestino.top - rectOrigen.top) + "px");
            document.body.appendChild(rayo);
            setTimeout(() => rayo.remove(), 700);
        }

        const simbolo = document.createElement("div");
        simbolo.className = "robo-simbolo-central";
        simbolo.textContent = "🔵 ROBO DE CHAKRA (-" + robado + ")";
        document.body.appendChild(simbolo);
        setTimeout(() => simbolo.remove(), 900);
    }
}
