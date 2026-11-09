import {
    aplicarTemaAldea,
    obtenerTemaAldea,
    obtenerTemaSeleccionado,
    prepararImagenCarta,
    precargarImagenes
} from "./core-navegacion/TemaAldea.js";

const RUTA_BACK_FALLBACK = "assets/img/back.png";
const IDS = ["1","2","3","4","5","6","7","8"];
const TOTAL_PAREJAS = 8;
const PUNTOS_POR_PAREJA = 10;

let cartasVolteadas = [];
let movimientos = 0;
let parejasEncontradas = 0;
let puntajeActual = 0;

let onResultado = null;
let onPartidaCompletada = null;
let onEsMiTurno = null;

let modoOnline = false;
let alVoltearOnline = null;
let temaActual = obtenerTemaAldea("arena");

function obtenerCartasOcultas() {
    const tablero = document.getElementById("board");

    if (!tablero) return [];

    return [...tablero.querySelectorAll(".card")]
        .filter(carta =>
            !carta.classList.contains("volteada") &&
            !carta.classList.contains("emparejada") &&
            !carta.classList.contains("matched")
        );
}

function actualizarMovimientos() {
    const el = document.getElementById("moves");
    if (el) el.textContent = movimientos;
}

function cartaPorIndice(index) {
    const tablero = document.getElementById("board");
    if (!tablero) return null;
    return tablero.querySelector(`.card[data-index="${Number(index)}"]`);
}

function aldeaDeCarta(carta, aldea) {
    return aldea || (carta && carta.dataset && carta.dataset.aldea) || "arena";
}

function setImagenesCarta(carta, valor, aldea) {
    if (!carta || !valor) return;
    const aldeaFinal = aldeaDeCarta(carta, aldea);
    carta.dataset.valor = String(valor);
    carta.dataset.aldea = aldeaFinal;
    const back = carta.querySelector("img.back, img.img-card.back");
    const front = carta.querySelector("img.front, img.img-card.front");
    const reverso = BoardManager.obtenerReverso();
    const ruta = BoardManager.obtenerRutaCarta(valor, aldeaFinal);
    if (back) back.src = reverso;
    if (front) front.src = ruta;
    // compat: cartas con una sola imagen
    if (!back && !front) {
        const img = carta.querySelector("img");
        if (img) img.src = carta.classList.contains("volteada") ? ruta : reverso;
    }
}

function mostrarFrente(carta, valor, aldea) {
    if (!carta || !valor) return;
    setImagenesCarta(carta, valor, aldea);
    carta.classList.add("volteada", "flip");
}

export const BoardManager = {
    obtenerCartasParaByakugan() {
        const cartas = obtenerCartasOcultas();

        if (cartas.length < 2) {
            return [];
        }

        const mezcladas = [...cartas]
            .sort(() => Math.random() - 0.5);

        return mezcladas.slice(0, 2);
    },

    obtenerCartaParaSello() {
        const cartas = obtenerCartasOcultas()
            .filter(carta => !carta.classList.contains("carta-sellada"));

        if (cartas.length === 0) {
            return null;
        }

        const indice = Math.floor(Math.random() * cartas.length);
        return cartas[indice];
    },

    habilitarModoOnline(opciones = {}) {
        modoOnline = true;
        alVoltearOnline = typeof opciones.alVoltear === "function" ? opciones.alVoltear : null;
    },

    deshabilitarModoOnline() {
        modoOnline = false;
        alVoltearOnline = null;
    },

    bloquearTablero(bloqueado) {
        const tablero = document.getElementById("board");
        if (tablero) tablero.classList.toggle("bloqueado-turno", !!bloqueado);
    },

    revelarCartaRemota(index, valor, aldea, emparejada = false) {
        const carta = cartaPorIndice(index);
        if (!carta) return;
        mostrarFrente(carta, valor, aldea);
        if (emparejada) carta.classList.add("emparejada");
    },

    marcarEmparejadas(index1, index2) {
        for (const index of [index1, index2]) {
            const carta = cartaPorIndice(index);
            if (carta) carta.classList.add("emparejada");
        }
    },

    ocultarCartasRemotas(index1, index2, espera = 800) {
        setTimeout(() => {
            for (const index of [index1, index2]) {
                const carta = cartaPorIndice(index);
                if (!carta || carta.classList.contains("emparejada")) continue;
                carta.classList.remove("volteada", "flip");
                setImagenesCarta(carta, carta.dataset.valor, carta.dataset.aldea);
            }
        }, espera);
    },

    revelarTemporal(index, valor, aldea, duracion = 3000) {
        const carta = cartaPorIndice(index);
        if (!carta || !valor || carta.classList.contains("emparejada")) return;
        mostrarFrente(carta, valor, aldea);
        carta.classList.add("byakugan-revelada");
        setTimeout(() => {
            if (carta.classList.contains("emparejada")) return;
            if (!carta.classList.contains("volteada") || carta.classList.contains("byakugan-revelada")) {
                // si solo estaba revelada temporalmente, ocultar
                if (!carta.dataset._volteadaPorJuego) carta.classList.remove("volteada", "flip");
            }
            carta.classList.remove("byakugan-revelada");
            setImagenesCarta(carta, carta.dataset.valor, carta.dataset.aldea);
        }, duracion);
    },

    sellarCarta(index, duracion = 5000) {
        const carta = cartaPorIndice(index);
        if (!carta || carta.classList.contains("emparejada")) return;
        carta.classList.add("carta-sellada");
        if (!carta.querySelector(".sello-icono-carta")) {
            const icono = document.createElement("div");
            icono.className = "sello-icono-carta";
            icono.textContent = "封";
            carta.appendChild(icono);
        }
        clearTimeout(carta._selloTimeout);
        carta._selloTimeout = setTimeout(() => this.quitarSello(index), Math.max(0, duracion));
    },

    quitarSello(index) {
        const carta = cartaPorIndice(index);
        if (!carta) return;
        carta.classList.remove("carta-sellada");
        carta.querySelector(".sello-icono-carta")?.remove();
        clearTimeout(carta._selloTimeout);
        carta._selloTimeout = null;
    },

    aplicarMezcla(cartas) {
        for (const datos of cartas || []) {
            const carta = cartaPorIndice(datos.index);
            if (!carta || !datos.valor) continue;
            setImagenesCarta(carta, datos.valor, datos.aldea || carta.dataset.aldea);
        }
    },

    aplicarEstadoSello(sello) {
        for (const carta of document.querySelectorAll(".card.carta-sellada")) {
            this.quitarSello(Number(carta.dataset.index));
        }
        if (sello && Number.isInteger(sello.index)) {
            this.sellarCarta(sello.index, Math.max(0, (sello.hasta || 0) - Date.now()));
        }
    },

    renderBoard(callbackResultado, callbackFinal, callbackEsMiTurno, mazoExterno = null) {
        onResultado = callbackResultado || null;
        onPartidaCompletada = callbackFinal || null;
        onEsMiTurno = callbackEsMiTurno || null;

        modoOnline = false;
        alVoltearOnline = null;

        try {
            temaActual = obtenerTemaSeleccionado() || obtenerTemaAldea("arena");
            aplicarTemaAldea(localStorage.getItem("nivelActual"));
        } catch (e) {
            temaActual = obtenerTemaAldea("arena");
        }

        const tablero = document.getElementById('board');
        if (!tablero) return;
        tablero.innerHTML = '';

        cartasVolteadas = [];
        movimientos = 0;
        parejasEncontradas = 0;
        puntajeActual = 0;
        actualizarMovimientos();

        const usaMazo = Array.isArray(mazoExterno) && mazoExterno.length > 0;
        const valores = usaMazo
            ? mazoExterno
            : [...IDS, ...IDS].sort(() => Math.random() - 0.5);

        try {
            precargarImagenes([
                ...IDS.map(valor => this.obtenerRutaCarta(valor, "arena")),
                this.obtenerReverso()
            ]);
        } catch (e) {}

        valores.forEach((entrada, idx) => {
            const valor = usaMazo && typeof entrada === "object" ? entrada.valor : entrada;
            const aldea = usaMazo && typeof entrada === "object" ? (entrada.aldea || "arena") : "arena";

            const carta = document.createElement('div');
            carta.className = 'card';
            carta.dataset.index = idx;
            if (valor != null) {
                carta.dataset.valor = String(valor);
                carta.dataset.aldea = aldea || "arena";
            }

            const reverso = document.createElement('img');
            reverso.src = this.obtenerReverso();
            reverso.className = 'img-card back';
            reverso.alt = "";
            try { prepararImagenCarta(reverso); } catch (e) {}

            const frente = document.createElement('img');
            frente.src = valor != null ? this.obtenerRutaCarta(valor, aldea) : this.obtenerReverso();
            frente.className = 'img-card front';
            frente.alt = "";
            try { prepararImagenCarta(frente); } catch (e) {}

            carta.appendChild(reverso);
            carta.appendChild(frente);
            carta.addEventListener('click', () => this.voltearCarta(carta));
            tablero.appendChild(carta);

            if (usaMazo && entrada && entrada.emparejada && valor != null) {
                mostrarFrente(carta, valor, aldea);
                carta.classList.add("emparejada");
            }
        });
    },

    voltearCarta(carta) {
        if (onEsMiTurno && !onEsMiTurno()) return;
        if (!carta || carta.classList.contains("carta-sellada")) return;
        if (carta.classList.contains("volteada") || carta.classList.contains("emparejada") || carta.classList.contains("matched")) return;

        if (modoOnline) {
            if (!alVoltearOnline) return;
            alVoltearOnline(parseInt(carta.dataset.index, 10));
            return;
        }

        if (cartasVolteadas.length === 2) return;

        carta.dataset._volteadaPorJuego = "1";
        setImagenesCarta(carta, carta.dataset.valor, carta.dataset.aldea);
        carta.classList.add('volteada', 'flip');

        cartasVolteadas.push(carta);

        if (cartasVolteadas.length === 2) {
            movimientos++;
            actualizarMovimientos();
            this.verificarCoincidencia();
        }
    },

    verificarCoincidencia() {
        const [c1, c2] = cartasVolteadas;
        if (!c1 || !c2) { cartasVolteadas = []; return; }
        const esAcierto = c1.dataset.valor === c2.dataset.valor;

        if (esAcierto) {
            c1.classList.add('emparejada');
            c2.classList.add('emparejada');
            cartasVolteadas = [];
            parejasEncontradas++;

            puntajeActual += PUNTOS_POR_PAREJA;

            if (onResultado) onResultado(true, puntajeActual);

            if (parejasEncontradas === TOTAL_PAREJAS) {
                if (onPartidaCompletada) onPartidaCompletada(movimientos, puntajeActual);
            }
        } else {
            if (onResultado) onResultado(false, puntajeActual);

            setTimeout(() => {
                try {
                    c1.classList.remove('volteada', 'flip');
                    c2.classList.remove('volteada', 'flip');
                    delete c1.dataset._volteadaPorJuego;
                    delete c2.dataset._volteadaPorJuego;
                    setImagenesCarta(c1, c1.dataset.valor, c1.dataset.aldea);
                    setImagenesCarta(c2, c2.dataset.valor, c2.dataset.aldea);
                } catch (e) {}
                cartasVolteadas = [];
            }, 800);
        }
    },

    obtenerRutaCarta(valor, aldea) {
        if (!valor) return this.obtenerReverso();
        const aldeaFinal = aldea || "arena";
        try {
            if (temaActual && typeof temaActual.cartas === "string" && aldeaFinal === "arena") {
                return `${temaActual.cartas}${valor}.png`;
            }
        } catch (e) {}
        return `assets/img/cards/aldeas/${aldeaFinal}/${valor}.png`;
    },

    obtenerReverso() {
        try {
            return (temaActual && temaActual.reverso) ? temaActual.reverso : RUTA_BACK_FALLBACK;
        } catch (e) {
            return RUTA_BACK_FALLBACK;
        }
    }
};
