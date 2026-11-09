import { JuegoService } from "../services/JuegoService.js";
import { CartaService } from "../services/CartaService.js";
import { PuntajeService } from "../services/PuntajeService.js";
import { TiempoService } from "../services/TiempoService.js";

import { Jugador } from "../entities/jugador.js";
import { Partida } from "../entities/partida.js";

import { historialApi } from "../../infraestructura/repositorios/HttpHistorialRepositorio.js";
import { progresoService } from "../../services/progresoService.js";
import {
    aplicarTemaAldea,
    prepararImagenCarta,
    precargarImagenes
} from "../../core-navegacion/TemaAldea.js";
import { conectarPausa } from "../../ui/PauseModal.js";


export class UchihaController {

    constructor() {

        // ==========================================
        // RUTAS DE uchiha
        // ==========================================

        this.rutaBack =
            "assets/cartas niveles/carta uchiha.png";
        aplicarTemaAldea("uchiha");


        this.rutaUchiha =
            "assets/img/cards/aldeas/konoha/uchiha/";


        // ==========================================
        // JUGADOR
        // ==========================================

        const nombreJugador =
            localStorage.getItem("playerName1") ||
            "Ninja";


        this.jugador =
            new Jugador(nombreJugador);


        // ==========================================
        // PARTIDA
        // ==========================================

        this.partida =
            new Partida(this.jugador);


        // ==========================================
        // SERVICIOS
        // ==========================================

        this.cartaService =
            new CartaService(
                this.rutaBack,
                this.rutaUchiha
            );


        this.puntajeService =
            new PuntajeService();


        this.tiempoService =
            new TiempoService(300);


        this.juegoService =
            new JuegoService(
                this.partida,
                this.cartaService,
                this.puntajeService
            );


        conectarPausa(this.tiempoService);


        // ==========================================
        // ELEMENTOS HTML
        // ==========================================

        this.tablero =
            document.getElementById("board");


        this.mostrarTiempo =
            document.getElementById("timer");


        this.mostrarMovimientos =
            document.getElementById("moves");


        this.mostrarPuntaje =
            document.getElementById("score");


        this.modal =
            document.getElementById("modal");


        this.victoryModal =
            document.getElementById("victoryModal");


        this.finalStats =
            document.getElementById("finalStats");


        this.victoryStats =
            document.getElementById("victoryStats");


        // ==========================================
        // CONTROL DEL JUEGO
        // ==========================================

        this.juegoBloqueado = false;

        this.cartasDOM = [];


        // ==========================================
        // BOTONES
        // ==========================================

        const botonReiniciar =
            document.getElementById("restartGame");


        const botonCerrar =
            document.getElementById("closeModal");


        const botonVictoriaReiniciar =
            document.getElementById("victoryRestart");


        const botonVictoriaCerrar =
            document.getElementById("victoryClose");


        if (botonReiniciar) {

            botonReiniciar.addEventListener(
                "click",
                () => this.iniciarJuego()
            );
        }


        if (botonCerrar) {

            botonCerrar.addEventListener(
                "click",
                () => this.irAlMenu()
            );
        }


        if (botonVictoriaReiniciar) {

            botonVictoriaReiniciar.addEventListener(
                "click",
                () => this.iniciarJuego()
            );
        }


        if (botonVictoriaCerrar) {

            botonVictoriaCerrar.addEventListener(
                "click",
                () => this.irAlMenu()
            );
        }


        // ==========================================
        // INICIAR JUEGO
        // ==========================================

        this.iniciarJuego();
    }


    // =================================================
    // INICIAR
    // =================================================

    iniciarJuego() {

        this.tiempoService.detener();

        this.ocultarModales();

        this.juegoBloqueado = false;


        const cartas =
            this.juegoService.iniciar();


        precargarImagenes([
            this.rutaBack,
            ...cartas.map((carta) => carta.getImagen())
        ]);


        this.generarTablero(cartas);


        this.actualizarInterfaz();


        this.tiempoService.reiniciar(300);

        this.actualizarTiempo();


        this.tiempoService.iniciar(
            (segundos) => {

                this.actualizarTiempo();


                if (segundos <= 0) {

                    this.mostrarDerrota();
                }
            }
        );
    }


    // =================================================
    // GENERAR TABLERO
    // =================================================

    generarTablero(cartas) {

        this.tablero.innerHTML = "";

        this.cartasDOM = [];


        cartas.forEach((carta, indice) => {

            const cartaDOM =
                document.createElement("div");


            cartaDOM.classList.add("card");


            // =========================================
            // PARTE TRASERA
            // =========================================

            const imagenBack =
                document.createElement("img");


            imagenBack.src =
                this.rutaBack;


            imagenBack.classList.add("back");

            prepararImagenCarta(imagenBack);


            // =========================================
            // PARTE FRONTAL
            // =========================================

            const imagenFront =
                document.createElement("img");


            imagenFront.src =
                carta.getImagen();


            imagenFront.classList.add("front");

            prepararImagenCarta(imagenFront);


            // =========================================
            // DATOS
            // =========================================

            cartaDOM.dataset.indice =
                indice;


            cartaDOM.carta =
                carta;


            // =========================================
            // AGREGAR IMÁGENES
            // =========================================

            cartaDOM.appendChild(
                imagenBack
            );


            cartaDOM.appendChild(
                imagenFront
            );


            // =========================================
            // CLIC
            // =========================================

            cartaDOM.addEventListener(
                "click",
                () =>
                    this.seleccionarCarta(cartaDOM)
            );


            // =========================================
            // TABLERO
            // =========================================

            this.tablero.appendChild(
                cartaDOM
            );


            this.cartasDOM.push(
                cartaDOM
            );
        });
    }


    // =================================================
    // SELECCIONAR CARTA
    // =================================================

    seleccionarCarta(cartaDOM) {

        if (this.juegoBloqueado) {
            return;
        }


        const carta =
            cartaDOM.carta;


        if (carta.estaEncontrada()) {
            return;
        }


        if (carta.estaVolteada()) {
            return;
        }


        const volteada =
            this.juegoService.voltearCarta(
                carta
            );


        if (!volteada) {
            return;
        }


        // Mostrar frente
        cartaDOM.classList.add(
            "flipped"
        );


        // Movimiento
        this.juegoService.aumentarMovimiento();


        this.actualizarInterfaz();


        // =========================================
        // DOS CARTAS
        // =========================================

        if (
            this.partida.cartasVolteadas.length === 2
        ) {

            this.juegoBloqueado = true;


            setTimeout(
                () => this.comprobarPareja(),
                800
            );
        }
    }


    // =================================================
    // COMPROBAR PAREJA
    // =================================================

    comprobarPareja() {

        const cartas =
            [
                ...this.partida.cartasVolteadas
            ];


        if (cartas.length !== 2) {

            this.juegoBloqueado = false;

            return;
        }


        const carta1 =
            cartas[0];


        const carta2 =
            cartas[1];


        const dom1 =
            this.cartasDOM.find(
                elemento =>
                    elemento.carta === carta1
            );


        const dom2 =
            this.cartasDOM.find(
                elemento =>
                    elemento.carta === carta2
            );


        const esPareja =
            this.juegoService.verificarPareja();


        // =========================================
        // PAREJA CORRECTA
        // =========================================

        if (esPareja) {

            // Mantener frente visible
            dom1.classList.add(
                "flipped"
            );


            dom2.classList.add(
                "flipped"
            );


            // Activar animación
            dom1.classList.add(
                "found"
            );


            dom2.classList.add(
                "found"
            );


            // Bloquear
            dom1.style.pointerEvents =
                "none";


            dom2.style.pointerEvents =
                "none";


            // Limpiar intento
            this.juegoService.finalizarIntento();


            this.actualizarInterfaz();


            // =====================================
            // DESAPARECER
            // =====================================

            setTimeout(() => {

                dom1.style.visibility =
                    "hidden";


                dom2.style.visibility =
                    "hidden";

            }, 700);


            // =====================================
            // VICTORIA
            // =====================================

            if (
                this.juegoService.verificarVictoria(16)
            ) {

                this.tiempoService.detener();


                setTimeout(() => {

                    this.mostrarVictoria();

                }, 800);


                return;
            }


            // Desbloquear
            setTimeout(() => {

                this.juegoBloqueado = false;

            }, 700);


            return;
        }


        // =========================================
        // PAREJA INCORRECTA
        // =========================================

        setTimeout(() => {

            dom1.classList.remove(
                "flipped"
            );


            dom2.classList.remove(
                "flipped"
            );


            carta1.ocultar();

            carta2.ocultar();


            this.juegoService.finalizarIntento();


            this.actualizarInterfaz();


            this.juegoBloqueado = false;

        }, 300);
    }


    // =================================================
    // ACTUALIZAR INTERFAZ
    // =================================================

    actualizarInterfaz() {

        if (this.mostrarMovimientos) {

            this.mostrarMovimientos.textContent =
                this.partida.movimientos;
        }


        if (this.mostrarPuntaje) {

            this.mostrarPuntaje.textContent =
                this.partida
                    .obtenerJugador()
                    .getPuntaje();
        }
    }


    // =================================================
    // TIEMPO
    // =================================================

    actualizarTiempo() {

        if (!this.mostrarTiempo) {
            return;
        }


        const segundos =
            this.tiempoService.obtenerTiempo();


        const minutos =
            Math.floor(
                segundos / 60
            );


        const segundosRestantes =
            segundos % 60;


        this.mostrarTiempo.textContent =
            `${String(minutos).padStart(2, "0")}:${String(segundosRestantes).padStart(2, "0")}`;
    }


    // =================================================
    // GUARDAR RESULTADO (SQL best-effort)
    // =================================================

    guardarResultadoServidor(victoria) {

        progresoService.registrarFinPartida({
            victoria,
            puntaje:
                this.partida.obtenerJugador()
                    .getPuntaje(),
        });

        historialApi.guardar({

            zona: "uchiha",

            puntaje:
                this.partida.obtenerJugador()
                    .getPuntaje(),

            modo: "1",

            ganador:
                victoria
                    ? this.jugador.nombre
                    : "ninguno",

            idPartida:
                `uchiha-${Date.now()}`
        });
    }


    // =================================================
    // DERROTA
    // =================================================

    mostrarDerrota() {

        if (this.juegoBloqueado) {
            return;
        }


        this.juegoBloqueado = true;


        this.tiempoService.detener();


        if (this.finalStats) {

            this.finalStats.textContent =
                `Movimientos: ${this.partida.movimientos} | Puntaje: ${this.partida.obtenerJugador().getPuntaje()}`;
        }


        if (this.modal) {

            this.modal.classList.remove(
                "hidden"
            );
        }

        this.guardarResultadoServidor(false);
    }


    // =================================================
    // VICTORIA
    // =================================================

    mostrarVictoria() {

        this.juegoBloqueado = true;


        this.tiempoService.detener();


        if (this.victoryStats) {

            this.victoryStats.textContent =
                `Movimientos: ${this.partida.movimientos} | Puntaje: ${this.partida.obtenerJugador().getPuntaje()}`;
        }


        if (this.victoryModal) {

            this.victoryModal.classList.remove(
                "hidden"
            );
        }

        this.guardarResultadoServidor(true);
    }


    // =================================================
    // OCULTAR MODALES
    // =================================================

    ocultarModales() {

        if (this.modal) {

            this.modal.classList.add(
                "hidden"
            );
        }


        if (this.victoryModal) {

            this.victoryModal.classList.add(
                "hidden"
            );
        }
    }


    // =================================================
    // VOLVER AL MENÚ
    // =================================================

    irAlMenu() {

        this.tiempoService.detener();


        window.location.href =
            "menu.html";
    }
}
