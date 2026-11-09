import { Carta } from "../entities/carta.js";
import { Jugador } from "../entities/jugador.js";
import { Partida } from "../entities/partida.js";

import { SecuenciaService } from "../services/SecuenciaService.js";
import { JuegoService } from "../services/JuegoService.js";
import { PuntajeService } from "../services/PuntajeService.js";
import { TiempoService } from "../services/TiempoService.js";
import { progresoService } from "../../services/progresoService.js";
import { conectarPausa } from "../../ui/PauseModal.js";


export class OrdenController {


    constructor() {

        // =========================
        // ELEMENTOS DEL DOM
        // =========================

        this.victoriaTexto =
            document.getElementById(
                "victoriaTexto"
            );

        this.contador =
            document.getElementById(
                "contador"
            );

        this.cartasDOM =
            document.querySelectorAll(
                ".carta"
            );

        this.mensaje =
            document.getElementById(
                "mensajeJuego"
            );

        this.puntajeDOM =
            document.getElementById(
                "puntaje"
            );

        this.tiempoDOM =
            document.getElementById(
                "tiempo"
            );

        this.modalPerder =
            document.getElementById(
                "modalPerder"
            );

        this.modalGanar =
            document.getElementById(
                "modalGanar"
            );


        // =========================
        // AJUSTES
        // =========================

        this.btnAjustes =
            document.getElementById(
                "btnAjustes"
            );

        this.modalAjustes =
            document.getElementById(
                "modalAjustes"
            );

        this.btnCerrarAjustes =
            document.getElementById(
                "btnCerrarAjustes"
            );

        this.btnMusica =
            document.getElementById(
                "btnMusica"
            );

        this.btnPausa =
            document.getElementById(
                "btnPausa"
            );

        this.btnMenuAjustes =
            document.getElementById(
                "btnMenuAjustes"
            );


        // =========================
        // MÚSICA
        // =========================

        this.musica =
            document.getElementById(
                "gameMusic"
            );

        this.musicaActiva = true;


        if (this.musica) {

            this.musica.volume = 0.5;

        }


        // =========================
        // ENTIDADES
        // =========================

        this.jugador =
            new Jugador("Jugador");

        this.partida =
            new Partida(
                this.jugador
            );


        // =========================
        // SERVICES
        // =========================

        this.secuenciaService =
            new SecuenciaService();

        this.puntajeService =
            new PuntajeService();

        this.juegoService =
            new JuegoService(
                this.partida,
                this.secuenciaService,
                this.puntajeService
            );

        this.tiempoService =
            new TiempoService(
                this.partida
            );


        // =========================
        // VARIABLES
        // =========================

        this.juegoPausado = false;

        this.bloqueado = true;

        this.cartas = [];


        // =========================
        // INICIAR
        // =========================

        this.iniciar();

    }


    iniciar() {

        this.crearCartas();

        this.configurarBotones();

        this.configurarMusica();

        this.iniciarTiempo();

        conectarPausa(this.tiempoService);

        this.iniciarJuego();

    }


    crearCartas() {

        this.cartasDOM.forEach(
            elemento => {

                const id =
                    Number(
                        elemento.dataset.id
                    );


                const carta =
                    new Carta(id);


                this.cartas.push({

                    entidad: carta,

                    elemento: elemento

                });

            }
        );

    }


    obtenerIds() {

        return this.cartas.map(
            carta =>
                carta.entidad.getId()
        );

    }


    iniciarJuego() {

        const secuencia =
            this.juegoService
                .iniciar(
                    this.obtenerIds()
                );


        this.mostrarSecuencia();

    }


    esperar(ms) {

        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    ms
                )
        );

    }


    async cuentaRegresiva() {

        if (!this.contador) {

            return;

        }


        this.contador.style.display =
            "block";


        this.contador.textContent =
            "3";

        await this.esperar(1000);


        this.contador.textContent =
            "2";

        await this.esperar(1000);


        this.contador.textContent =
            "1";

        await this.esperar(1000);


        this.contador.textContent =
            "¡Memoriza!";

        await this.esperar(1000);


        this.contador.style.display =
            "none";

    }


    limpiarCartas() {

        this.cartas.forEach(
            carta => {

                carta.entidad
                    .desactivar();


                carta.entidad
                    .desmarcarCorrecta();


                carta.elemento
                    .classList
                    .remove(
                        "activa"
                    );


                carta.elemento
                    .classList
                    .remove(
                        "correcta"
                    );


                carta.elemento
                    .style
                    .pointerEvents =
                    "auto";

            }
        );

    }


    async mostrarSecuencia() {

        this.bloqueado = true;


        this.partida
            .limpiarRespuesta();


        this.limpiarCartas();


        await this.cuentaRegresiva();


        if (this.mensaje) {

            this.mensaje.textContent =
                "Memoriza la secuencia";

        }


        await this.esperar(1000);


        const secuencia =
            this.juegoService
                .obtenerSecuencia();


        const ronda =
            this.juegoService
                .obtenerRonda();


        for (
            let i = 0;
            i < ronda;
            i++
        ) {

            const id =
                secuencia[i];


            const carta =
                this.cartas.find(
                    item =>
                        item.entidad
                            .getId() === id
                );


            if (!carta) {

                continue;

            }


            carta.entidad.activar();


            carta.elemento
                .classList
                .add("activa");


            await this.esperar(700);


            carta.entidad
                .desactivar();


            carta.elemento
                .classList
                .remove("activa");


            await this.esperar(250);

        }


        if (this.mensaje) {

            this.mensaje.textContent =
                "¡Sigue el orden!";

        }


        this.bloqueado = false;

    }


    configurarEventosCartas() {

        this.cartas.forEach(
            carta => {

                carta.elemento
                    .addEventListener(
                        "click",
                        () =>
                            this.seleccionarCarta(
                                carta
                            )
                    );

            }
        );

    }


    async seleccionarCarta(carta) {

        if (this.bloqueado) {

            return;

        }


        if (
            carta.entidad
                .esCorrecta()
        ) {

            return;

        }


        const resultado =
            this.juegoService
                .registrarRespuesta(
                    carta.entidad
                        .getId()
                );


        if (resultado.correcto) {

            carta.entidad
                .marcarCorrecta();


            carta.elemento
                .classList
                .add("correcta");


            carta.elemento
                .style
                .pointerEvents =
                "none";


            if (resultado.terminado) {

                await this.completarRonda();

            }

        } else {

            await this.perder();

        }

    }


    async completarRonda() {

        this.bloqueado = true;


        this.juegoService
            .sumarPuntos();


        this.actualizarPuntaje();


        if (this.mensaje) {

            this.mensaje.textContent =
                "¡Correcto!";

        }


        await this.esperar(1200);


        if (
            this.juegoService
                .esVictoria()
        ) {

            await this.mostrarVictoria();

            return;

        }


        this.juegoService
            .siguienteRonda();


        await this.mostrarSecuencia();

    }


    async perder() {

        progresoService.registrarFinPartida({
            victoria: false,
            puntaje: this.juegoService.obtenerPuntaje(),
        });

        this.bloqueado = true;


        if (this.mensaje) {

            this.mensaje.textContent =
                "¡Has perdido!";

        }


        await this.esperar(500);


        if (this.modalPerder) {

            this.modalPerder.style.display =
                "flex";

        }

    }


    actualizarPuntaje() {

        if (this.puntajeDOM) {

            this.puntajeDOM.textContent =
                this.juegoService
                    .obtenerPuntaje();

        }

    }


    iniciarTiempo() {

        this.tiempoService
            .iniciar(
                (minutos, segundos) => {

                    if (!this.tiempoDOM) {

                        return;

                    }


                    this.tiempoDOM.textContent =

                        String(minutos)
                            .padStart(2, "0")

                        + ":" +

                        String(segundos)
                            .padStart(2, "0");

                }
            );

    }


    configurarBotones() {

        const btnReiniciar =
            document.getElementById(
                "reiniciar"
            );

        const btnMenu =
            document.getElementById(
                "menu"
            );

        const btnVolverJugar =
            document.getElementById(
                "volverJugar"
            );

        const btnVolverMenu =
            document.getElementById(
                "volverMenu"
            );


        if (btnReiniciar) {

            btnReiniciar
                .addEventListener(
                    "click",
                    () => {

                        location.reload();

                    }
                );

        }


        if (btnMenu) {

            btnMenu
                .addEventListener(
                    "click",
                    () => {

                        window.location.href =
                            "menu.html";

                    }
                );

        }


        if (btnVolverJugar) {

            btnVolverJugar
                .addEventListener(
                    "click",
                    () => {

                        location.reload();

                    }
                );

        }


        if (btnVolverMenu) {

            btnVolverMenu
                .addEventListener(
                    "click",
                    () => {

                        window.location.href =
                            "menu.html";

                    }
                );

        }


        this.configurarEventosCartas();


        // =========================
        // AJUSTES
        // =========================

        if (this.btnAjustes) {

            this.btnAjustes
                .addEventListener(
                    "click",
                    () => {

                        if (this.modalAjustes) {

                            this.modalAjustes
                                .style.display =
                                "flex";

                        }

                    }
                );

        }


        if (this.btnCerrarAjustes) {

            this.btnCerrarAjustes
                .addEventListener(
                    "click",
                    () => {

                        if (this.modalAjustes) {

                            this.modalAjustes
                                .style.display =
                                "none";

                        }

                    }
                );

        }


        if (this.btnPausa) {

            this.btnPausa
                .addEventListener(
                    "click",
                    () => {

                        this.juegoPausado =
                            !this.juegoPausado;


                        this.bloqueado =
                            this.juegoPausado;


                        if (
                            this.juegoPausado
                        ) {

                            this.tiempoService
                                .pausar();


                            this.btnPausa
                                .textContent =
                                "Reanudar partida";

                        } else {

                            this.tiempoService
                                .reanudar();


                            this.btnPausa
                                .textContent =
                                "Pausar partida";

                        }

                    }
                );

        }


        if (this.btnMenuAjustes) {

            this.btnMenuAjustes
                .addEventListener(
                    "click",
                    () => {

                        window.location.href =
                            "menu.html";

                    }
                );

        }

    }


    configurarMusica() {

        if (!this.musica) {

            return;

        }


        const iniciarMusica =
            sessionStorage.getItem(
                "iniciarMusica"
            );


        if (
            iniciarMusica === "si"
        ) {

            this.musica
                .play()
                .catch(
                    () => {}
                );


            sessionStorage
                .removeItem(
                    "iniciarMusica"
                );

        }


        if (this.btnMusica) {

            this.btnMusica
                .addEventListener(
                    "click",
                    async () => {

                        if (
                            this.musica.paused
                        ) {

                            this.musicaActiva =
                                true;


                            await this.musica
                                .play();


                            this.btnMusica
                                .textContent =
                                "🎵 Música: ON";

                        } else {

                            this.musicaActiva =
                                false;


                            this.musica.pause();


                            this.btnMusica
                                .textContent =
                                "🔇 Música: OFF";

                        }

                    }
                );

        }

    }


    async mostrarVictoria() {

        progresoService.registrarFinPartida({
            victoria: true,
            puntaje: this.juegoService.obtenerPuntaje(),
        });

        this.lanzarConfeti();


        if (this.modalGanar) {

            this.modalGanar
                .style.display =
                "flex";

        }


        if (this.victoriaTexto) {

            this.victoriaTexto
                .style.display =
                "block";


            await this.esperar(1500);


            this.victoriaTexto
                .style.display =
                "none";

        }

    }


    lanzarConfeti() {

        if (
            typeof confetti !==
            "function"
        ) {

            return;

        }


        const duracion = 3000;

        const fin =
            Date.now() +
            duracion;


        const intervalo =
            setInterval(
                () => {

                    if (
                        Date.now() >
                        fin
                    ) {

                        clearInterval(
                            intervalo
                        );

                        return;

                    }


                    confetti({

                        particleCount: 8,

                        angle: 60,

                        spread: 60,

                        origin: {
                            x: 0
                        }

                    });


                    confetti({

                        particleCount: 8,

                        angle: 120,

                        spread: 60,

                        origin: {
                            x: 1
                        }

                    });

                },
                200
            );

    }

}