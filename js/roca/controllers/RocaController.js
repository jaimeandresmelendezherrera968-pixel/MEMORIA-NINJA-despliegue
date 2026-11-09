
import { JuegoService } from "../services/JuegoService.js";
import { CartaService } from "../services/CartaService.js";
import { PuntajeService } from "../services/PuntajeService.js";
import { TiempoService } from "../services/TiempoService.js";

import { Jugador } from "../entities/jugador.js";
import { Partida } from "../entities/partida.js";

import { historialApi } from "../../infraestructura/repositorios/HttpHistorialRepositorio.js";
import { progresoService } from "../../services/progresoService.js";


export class RocaController {

    constructor() {

        // ==========================================
        // RUTAS
        // ==========================================

        this.rutaBack = "assets/img/back.png";
        this.rutaRoca = "assets/img/cards/aldeas/roca/";


        // ==========================================
        // JUGADOR
        // ==========================================

        const nombreJugador =
            localStorage.getItem("playerName1") || "Ninja";

        this.jugador = new Jugador(nombreJugador);


        // ==========================================
        // PARTIDA
        // ==========================================

        this.partida = new Partida(this.jugador);


        // ==========================================
        // SERVICIOS
        // ==========================================

        this.cartaService =
            new CartaService(
                this.rutaBack,
                this.rutaRoca
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
        // INICIAR
        // ==========================================

        this.iniciarJuego();
    }


    // ==================================================
    // INICIAR JUEGO
    // ==================================================

    iniciarJuego() {

        // Detener temporizador anterior
        this.tiempoService.detener();

        // Ocultar modales
        this.ocultarModales();

        // Desbloquear juego
        this.juegoBloqueado = false;

        // Obtener cartas nuevas
        const cartas =
            this.juegoService.iniciar();

        // Generar tablero
        this.generarTablero(cartas);

        // Actualizar pantalla
        this.actualizarInterfaz();

        // Reiniciar tiempo
        this.tiempoService.reiniciar(60);

        this.actualizarTiempo();

        // Iniciar temporizador
        this.tiempoService.iniciar(
            (segundos) => {

                this.actualizarTiempo();

                if (segundos <= 0) {
                    this.mostrarDerrota();
                }
            }
        );
    }


    // ==================================================
    // GENERAR TABLERO
    // ==================================================

    generarTablero(cartas) {

        this.tablero.innerHTML = "";

        this.cartasDOM = [];


        cartas.forEach((carta, indice) => {

            // ------------------------------------------
            // CONTENEDOR DE LA CARTA
            // ------------------------------------------

            const cartaDOM =
                document.createElement("div");

            cartaDOM.classList.add("card");


            // ------------------------------------------
            // PARTE TRASERA
            // ------------------------------------------

            const imagenBack =
                document.createElement("img");

            imagenBack.src =
                this.rutaBack;

            imagenBack.classList.add("back");


            // ------------------------------------------
            // PARTE FRONTAL
            // ------------------------------------------

            const imagenFront =
                document.createElement("img");

            imagenFront.src =
                carta.getImagen();

            imagenFront.classList.add("front");


            // ------------------------------------------
            // GUARDAR REFERENCIA
            // ------------------------------------------

            cartaDOM.dataset.indice = indice;

            cartaDOM.carta = carta;


            // ------------------------------------------
            // AGREGAR IMÁGENES
            // ------------------------------------------

            cartaDOM.appendChild(imagenBack);
            cartaDOM.appendChild(imagenFront);


            // ------------------------------------------
            // CLIC
            // ------------------------------------------

            cartaDOM.addEventListener(
                "click",
                () => this.seleccionarCarta(cartaDOM)
            );


            // ------------------------------------------
            // TABLERO
            // ------------------------------------------

            this.tablero.appendChild(cartaDOM);

            this.cartasDOM.push(cartaDOM);
        });
    }


    // ==================================================
    // SELECCIONAR CARTA
    // ==================================================

    seleccionarCarta(cartaDOM) {

        // Si el juego está bloqueado no hacer nada
        if (this.juegoBloqueado) {
            return;
        }


        // Obtener objeto Carta
        const carta =
            cartaDOM.carta;


        // Si ya fue encontrada
        if (carta.estaEncontrada()) {
            return;
        }


        // Si ya está volteada
        if (carta.estaVolteada()) {
            return;
        }


        // Intentar voltear
        const volteada =
            this.juegoService.voltearCarta(carta);


        if (!volteada) {
            return;
        }


        // Mostrar carta
        cartaDOM.classList.add("flipped");


        // Aumentar movimiento
        this.juegoService.aumentarMovimiento();

        this.actualizarInterfaz();


        // Si ya tenemos dos cartas
        if (this.partida.cartasVolteadas.length === 2) {

            this.juegoBloqueado = true;

            setTimeout(
                () => this.comprobarPareja(),
                800
            );
        }
    }


    // ==================================================
    // COMPROBAR PAREJA
    // ==================================================

    comprobarPareja() {

        const cartas =
            [...this.partida.cartasVolteadas];


        if (cartas.length !== 2) {

            this.juegoBloqueado = false;

            return;
        }


        const carta1 = cartas[0];
        const carta2 = cartas[1];


        // ------------------------------------------
        // BUSCAR ELEMENTOS HTML
        // ------------------------------------------

        const dom1 =
            this.cartasDOM.find(
                elemento => elemento.carta === carta1
            );

        const dom2 =
            this.cartasDOM.find(
                elemento => elemento.carta === carta2
            );


        // ------------------------------------------
        // VERIFICAR PAREJA
        // ------------------------------------------

        const esPareja =
            this.juegoService.verificarPareja();


        // ==========================================
        // SI ES PAREJA
        // ==========================================

        if (esPareja) {

            // Mantenerlas volteadas
            dom1.classList.add("flipped");
            dom2.classList.add("flipped");


            // Marcar visualmente como encontradas
            dom1.classList.add("found");
            dom2.classList.add("found");


            // Las cartas dejan de responder
            dom1.style.pointerEvents = "none";
            dom2.style.pointerEvents = "none";


            // Esperar un poco y hacerlas desaparecer
            setTimeout(
                () => {

                    dom1.style.visibility = "hidden";
                    dom2.style.visibility = "hidden";

                },
                600
            );


            // Limpiar intento
            this.juegoService.finalizarIntento();


            // Actualizar pantalla
            this.actualizarInterfaz();


            // Verificar victoria
            if (
                this.juegoService.verificarVictoria(16)
            ) {

                this.tiempoService.detener();

                setTimeout(
                    () => this.mostrarVictoria(),
                    700
                );

                return;
            }


            // Desbloquear
            setTimeout(
                () => {
                    this.juegoBloqueado = false;
                },
                700
            );

            return;
        }


        // ==========================================
        // SI NO ES PAREJA
        // ==========================================

        setTimeout(
            () => {

                // Quitar clase visual
                dom1.classList.remove("flipped");
                dom2.classList.remove("flipped");


                // Ocultar cartas internamente
                carta1.ocultar();
                carta2.ocultar();


                // Limpiar intento
                this.juegoService.finalizarIntento();


                // Actualizar
                this.actualizarInterfaz();


                // Desbloquear
                this.juegoBloqueado = false;

            },
            300
        );
    }


    // ==================================================
    // ACTUALIZAR INTERFAZ
    // ==================================================

    actualizarInterfaz() {

        if (this.mostrarMovimientos) {

            this.mostrarMovimientos.textContent =
                this.partida.movimientos;
        }


        if (this.mostrarPuntaje) {

            this.mostrarPuntaje.textContent =
                this.partida.obtenerJugador().getPuntaje();
        }
    }


    // ==================================================
    // ACTUALIZAR TIEMPO
    // ==================================================

    actualizarTiempo() {

        if (!this.mostrarTiempo) {
            return;
        }


        const segundos =
            this.tiempoService.obtenerTiempo();


        const minutos =
            Math.floor(segundos / 60);


        const segundosRestantes =
            segundos % 60;


        this.mostrarTiempo.textContent =
            `${String(minutos).padStart(2, "0")}:${String(segundosRestantes).padStart(2, "0")}`;
    }


    // ==================================================
    // GUARDAR RESULTADO (SQL best-effort)
    // ==================================================

    guardarResultadoServidor(victoria) {

        progresoService.registrarFinPartida({
            victoria,
            puntaje:
                this.partida.obtenerJugador()
                    .getPuntaje(),
        });

        historialApi.guardar({

            zona: "roca",

            puntaje:
                this.partida.obtenerJugador()
                    .getPuntaje(),

            modo: "1",

            ganador:
                victoria
                    ? this.jugador.nombre
                    : "ninguno",

            idPartida:
                `roca-${Date.now()}`
        });
    }


    // ==================================================
    // DERROTA
    // ==================================================

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
            this.modal.classList.remove("hidden");
        }

        this.guardarResultadoServidor(false);
    }


    // ==================================================
    // VICTORIA
    // ==================================================

    mostrarVictoria() {

        this.juegoBloqueado = true;

        this.tiempoService.detener();


        if (this.victoryStats) {

            this.victoryStats.textContent =
                `Movimientos: ${this.partida.movimientos} | Puntaje: ${this.partida.obtenerJugador().getPuntaje()}`;
        }


        if (this.victoryModal) {

            this.victoryModal.classList.remove("hidden");
        }

        this.guardarResultadoServidor(true);
    }


    // ==================================================
    // OCULTAR MODALES
    // ==================================================

    ocultarModales() {

        if (this.modal) {
            this.modal.classList.add("hidden");
        }


        if (this.victoryModal) {
            this.victoryModal.classList.add("hidden");
        }
    }


    // ==================================================
    // VOLVER AL MENÚ
    // ==================================================

    irAlMenu() {

        this.tiempoService.detener();

        window.location.href =
            "menu.html";
    }
}

