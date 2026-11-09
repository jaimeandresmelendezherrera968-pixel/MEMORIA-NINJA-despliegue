/* Controlador genérico de nivel 1J (SRP/OCP/DIP). Base visual/lógica = patrón uchiha; el contenido
   (colores, cartas, reverso/respaldo, textos) viene de ConfigNivel + TemaAldea (por aldea).
   Conserva progresoService+historialApi, IDs/modales, pausa, reglas. No toca online/poderes. */
import { obtenerConfigNivel } from "./configNivel.js";
import { conectarPausa } from "../ui/PauseModal.js";
import { historialApi } from "../infraestructura/repositorios/HttpHistorialRepositorio.js";
import { progresoService } from "../services/progresoService.js";
import { aplicarTemaAldea, prepararImagenCarta, precargarImagenes } from "../core-navegacion/TemaAldea.js";

export class ControladorNivel {
    constructor(idNivel) {
        this.cfg = obtenerConfigNivel(idNivel);
        this.#aplicarVarsTema();
        aplicarTemaAldea(this.cfg.aldea);
        this.#init().catch((e) => console.error(`[${idNivel}]`, e));
    }

    #aplicarVarsTema() {
        const root = document.documentElement;
        for (const [k, v] of Object.entries(this.cfg.vars || {})) root.style.setProperty(k, v);
    }

    async #init() {
        const a = this.cfg.aldea;
        const [{ JuegoService }, { CartaService }, { PuntajeService }, { TiempoService }, { Jugador }, { Partida }] =
            await Promise.all([
                import(`../${a}/services/JuegoService.js`),
                import(`../${a}/services/CartaService.js`),
                import(`../${a}/services/PuntajeService.js`),
                import(`../${a}/services/TiempoService.js`),
                import(`../${a}/entities/jugador.js`),
                import(`../${a}/entities/partida.js`),
            ]);
        const nombre = localStorage.getItem("playerName1") || "Ninja";
        this.jugador = new Jugador(nombre);
        this.partida = new Partida(this.jugador);
        this.cartaService = new CartaService(this.cfg.reverso, this.cfg.cartas);
        this.puntajeService = new PuntajeService();
        this.tiempoService = new TiempoService(this.cfg.tiempo);
        this.juegoService = new JuegoService(this.partida, this.cartaService, this.puntajeService);
        conectarPausa(this.tiempoService);
        this.#bindDOM();
        this.juegoBloqueado = false;
        this.cartasDOM = [];
        this.iniciarJuego();
    }

    #bindDOM() {
        const $ = (id) => document.getElementById(id);
        this.tablero = $("board"); this.mostrarTiempo = $("timer"); this.mostrarMovimientos = $("moves");
        this.mostrarPuntaje = $("score"); this.modal = $("modal"); this.victoryModal = $("victoryModal");
        this.finalStats = $("finalStats"); this.victoryStats = $("victoryStats");
        const on = (id, fn) => { const el = $(id); if (el) el.addEventListener("click", fn); };
        on("restartGame", () => this.iniciarJuego()); on("closeModal", () => this.irAlMenu());
        on("victoryRestart", () => this.iniciarJuego()); on("victoryClose", () => this.irAlMenu());
        const setText = (id, t) => { const el = $(id); if (el && t) el.textContent = t; };
        setText("victoryMsg1", this.cfg.textos?.victoriaMsg1);
        setText("victoryMsg2", this.cfg.textos?.victoriaMsg2);
        setText("defeatMsg", this.cfg.textos?.derrotaMsg);
        const vTitle = document.querySelector("#victoryModal h2"); if (vTitle && this.cfg.textos?.victoriaTitulo) vTitle.textContent = this.cfg.textos.victoriaTitulo;
        const dTitle = document.querySelector("#modal h2"); if (dTitle && this.cfg.textos?.derrotaTitulo) dTitle.textContent = this.cfg.textos.derrotaTitulo;
    }

    iniciarJuego() {
        this.tiempoService.detener(); this.ocultarModales(); this.juegoBloqueado = false;
        const cartas = this.juegoService.iniciar();
        precargarImagenes([this.cfg.reverso, ...cartas.map((c) => c.getImagen())]);
        this.generarTablero(cartas); this.actualizarInterfaz();
        this.tiempoService.reiniciar(this.cfg.tiempo); this.actualizarTiempo();
        this.tiempoService.iniciar((segundos) => { this.actualizarTiempo(); if (segundos <= 0) this.mostrarDerrota(); });
    }

    generarTablero(cartas) {
        this.tablero.innerHTML = ""; this.cartasDOM = [];
        cartas.forEach((carta, indice) => {
            const cartaDOM = document.createElement("div"); cartaDOM.classList.add("card");
            const imgBack = document.createElement("img"); imgBack.src = this.cfg.reverso; imgBack.classList.add("back"); prepararImagenCarta(imgBack);
            const imgFront = document.createElement("img"); imgFront.src = carta.getImagen(); imgFront.classList.add("front"); prepararImagenCarta(imgFront);
            cartaDOM.dataset.indice = indice; cartaDOM.carta = carta;
            cartaDOM.append(imgBack, imgFront);
            cartaDOM.addEventListener("click", () => this.seleccionarCarta(cartaDOM));
            this.tablero.appendChild(cartaDOM); this.cartasDOM.push(cartaDOM);
        });
    }

    seleccionarCarta(cartaDOM) {
        if (this.juegoBloqueado) return;
        const carta = cartaDOM.carta;
        if (carta.estaEncontrada() || carta.estaVolteada()) return;
        if (!this.juegoService.voltearCarta(carta)) return;
        cartaDOM.classList.add("flipped");
        this.juegoService.aumentarMovimiento(); this.actualizarInterfaz();
        if (this.partida.cartasVolteadas.length === 2) { this.juegoBloqueado = true; setTimeout(() => this.comprobarPareja(), 800); }
    }

    comprobarPareja() {
        const [carta1, carta2] = [...this.partida.cartasVolteadas];
        if (!carta1 || !carta2) { this.juegoBloqueado = false; return; }
        const dom1 = this.cartasDOM.find((e) => e.carta === carta1);
        const dom2 = this.cartasDOM.find((e) => e.carta === carta2);
        if (this.juegoService.verificarPareja()) {
            dom1?.classList.add("flipped", "found"); dom2?.classList.add("flipped", "found");
            if (dom1) dom1.style.pointerEvents = "none"; if (dom2) dom2.style.pointerEvents = "none";
            this.juegoService.finalizarIntento(); this.actualizarInterfaz();
            setTimeout(() => { if (dom1) dom1.style.visibility = "hidden"; if (dom2) dom2.style.visibility = "hidden"; }, 700);
            if (this.juegoService.verificarVictoria(this.cfg.totalCartas)) {
                this.tiempoService.detener(); setTimeout(() => this.mostrarVictoria(), 800); return;
            }
            setTimeout(() => { this.juegoBloqueado = false; }, 700); return;
        }
        setTimeout(() => {
            dom1?.classList.remove("flipped"); dom2?.classList.remove("flipped");
            carta1.ocultar(); carta2.ocultar(); this.juegoService.finalizarIntento();
            this.actualizarInterfaz(); this.juegoBloqueado = false;
        }, 300);
    }

    actualizarInterfaz() {
        if (this.mostrarMovimientos) this.mostrarMovimientos.textContent = this.partida.movimientos;
        if (this.mostrarPuntaje) this.mostrarPuntaje.textContent = this.partida.obtenerJugador().getPuntaje();
    }
    actualizarTiempo() {
        if (!this.mostrarTiempo) return;
        const s = this.tiempoService.obtenerTiempo();
        this.mostrarTiempo.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    }
    guardarResultadoServidor(victoria) {
        const puntaje = this.partida.obtenerJugador().getPuntaje();
        progresoService.registrarFinPartida({ victoria, puntaje });
        historialApi.guardar({ zona: this.cfg.aldea, puntaje, modo: "1", ganador: victoria ? this.jugador.nombre : "ninguno", idPartida: `${this.cfg.aldea}-${Date.now()}` });
    }
    mostrarDerrota() { if (this.juegoBloqueado) return; this.juegoBloqueado = true; this.tiempoService.detener(); if (this.finalStats) this.finalStats.textContent = `Movimientos: ${this.partida.movimientos} | Puntaje: ${this.partida.obtenerJugador().getPuntaje()}`; this.modal?.classList.remove("hidden"); this.guardarResultadoServidor(false); }
    mostrarVictoria() { this.juegoBloqueado = true; this.tiempoService.detener(); if (this.victoryStats) this.victoryStats.textContent = `Movimientos: ${this.partida.movimientos} | Puntaje: ${this.partida.obtenerJugador().getPuntaje()}`; this.victoryModal?.classList.remove("hidden"); this.guardarResultadoServidor(true); }
    ocultarModales() { this.modal?.classList.add("hidden"); this.victoryModal?.classList.add("hidden"); }
    irAlMenu() { this.tiempoService?.detener(); window.location.href = "menu.html"; }
}
