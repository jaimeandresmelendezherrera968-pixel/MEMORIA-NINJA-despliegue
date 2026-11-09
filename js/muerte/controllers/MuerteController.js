import { Jugador } from "../entities/jugador.js";
import { Partida } from "../entities/partida.js";

import { CartaService } from "../services/CartaService.js";
import { JuegoService } from "../services/JuegoService.js";
import { PuntajeService } from "../services/PuntajeService.js";
import { TiempoService } from "../services/TiempoService.js";

import { historialApi } from "../../infraestructura/repositorios/HttpHistorialRepositorio.js";
import { progresoService } from "../../services/progresoService.js";
import { conectarPausa } from "../../ui/PauseModal.js";


export class MuerteController {


    constructor() {

        // =========================
        // DOM
        // =========================

        this.tablero =
            document.getElementById(
                "board"
            );

        this.mostrarTiempo =
            document.getElementById(
                "timer"
            );

        this.mostrarMovimientos =
            document.getElementById(
                "moves"
            );

        this.mostrarPuntaje =
            document.getElementById(
                "score"
            );

        this.turnoInfo =
            document.getElementById(
                "turnInfo"
            );

        this.modal =
            document.getElementById(
                "modal"
            );

        this.estadisticasFinales =
            document.getElementById(
                "finalStats"
            );

        this.botonGuardar =
            document.getElementById(
                "restartGame"
            );

        this.botonCerrar =
            document.getElementById(
                "closeModal"
            );


        // =========================
        // VICTORIA
        // =========================

        this.victoryModal =
            document.getElementById(
                "victoryModal"
            );

        this.victoryRestart =
            document.getElementById(
                "victoryRestart"
            );

        this.victoryClose =
            document.getElementById(
                "victoryClose"
            );

        this.victoryStats =
            document.getElementById(
                "victoryStats"
            );


        // =========================
        // MÚSICA
        // =========================

        this.musica =
            document.getElementById(
                "gameMusic"
            );


        // =========================
        // DATOS DEL MENÚ
        // =========================

        this.nombreJugador1 =
            localStorage.getItem(
                "playerName1"
            ) ||
            "Jugador 1";


        this.nombreJugador2 =
            localStorage.getItem(
                "playerName2"
            ) ||
            "Jugador 2";


        this.nivelActual =
            parseInt(
                localStorage.getItem(
                    "nivelActual"
                )
            ) || 1;


        this.modo2Jugadores =
            localStorage.getItem(
                "modo2Jugadores"
            ) === "true";


        // =========================
        // ENTIDADES
        // =========================

        this.jugador1 =
            new Jugador(
                this.nombreJugador1
            );


        this.jugador2 =
            this.modo2Jugadores
                ? new Jugador(
                    this.nombreJugador2
                )
                : null;


        this.partida =
            new Partida(
                this.jugador1,
                this.jugador2
            );


        // =========================
        // SERVICES
        // =========================

        this.cartaService =
            new CartaService();


        this.puntajeService =
            new PuntajeService();


        this.juegoService =
            new JuegoService(
                this.partida,
                this.puntajeService
            );


        this.tiempoService =
            new TiempoService(60);

        conectarPausa(this.tiempoService);


        // =========================
        // VARIABLES
        // =========================

        this.cartasDOM = [];


        // =========================
        // INICIAR
        // =========================

        this.iniciar();

    }


    iniciar() {

        this.generarTablero();

        this.configurarBotones();

        this.configurarMusica();

        this.iniciarTiempo();

        this.actualizarEstadisticas();

        if (
            this.modo2Jugadores
        ) {

            this.actualizarTurno();

        }

    }


    generarTablero() {

        this.tablero.innerHTML = "";


        const cartas =
            this.cartaService
                .generarTablero(
                    this.nivelActual
                );


        this.juegoService
            .iniciar(
                cartas.length
            );


        cartas.forEach(
            cartaEntidad => {

                const carta =
                    document.createElement(
                        "div"
                    );


                carta.className =
                    "card";


                carta.dataset.pareja =
                    cartaEntidad
                        .getIdPareja();


                carta.dataset.valor =
                    cartaEntidad
                        .getValor();


                carta.dataset.aldea =
                    cartaEntidad
                        .getAldea();


                if (
                    cartaEntidad.getClan()
                ) {

                    carta.dataset.clan =
                        cartaEntidad
                            .getClan();

                }


                // =========================
                // BACK
                // =========================

                const back =
                    document.createElement(
                        "img"
                    );


                back.src =
                    this.cartaService
                        .obtenerImagenBack();


                back.className =
                    "back";


                // =========================
                // FRONT
                // =========================

                const front =
                    document.createElement(
                        "img"
                    );


                front.src =
                    this.cartaService
                        .obtenerImagenFrontal(
                            cartaEntidad
                        );


                front.className =
                    "front";


                carta.appendChild(back);

                carta.appendChild(front);


                // =========================
                // CLICK
                // =========================

                carta.addEventListener(
                    "click",
                    () => {

                        this.voltearCarta(
                            carta,
                            cartaEntidad
                        );

                    }
                );


                this.tablero
                    .appendChild(carta);


                this.cartasDOM.push({

                    elemento: carta,

                    entidad: cartaEntidad

                });

            }
        );


        const nivel =
            this.cartaService
                .obtenerNiveles()
                [this.nivelActual - 1];


        this.tablero.style
            .gridTemplateColumns =
            `repeat(${Math.min(
                nivel.cartas,
                4
            )}, 100px)`;

    }


    voltearCarta(
        elemento,
        cartaEntidad
    ) {

        if (
            !this.juegoService
                .voltearCarta(
                    cartaEntidad
                )
        ) {

            return;

        }


        elemento.classList.add(
            "flip"
        );


        if (
            this.partida
                .cartasVolteadas
                .length === 2
        ) {

            this.partida
                .aumentarMovimientos();


            this.actualizarEstadisticas();


            this.verificarCoincidencia();

        }

    }


    verificarCoincidencia() {

        const cartas =
            this.partida
                .cartasVolteadas;


        const elementos =
            this.cartasDOM.filter(
                item =>
                    cartas.includes(
                        item.entidad
                    )
            );


        const correcta =
            this.juegoService
                .verificarPareja();


        if (correcta) {

            this.juegoService
                .parejaCorrecta();


            elementos.forEach(
                item => {

                    item.elemento
                        .classList
                        .add(
                            "emparejada"
                        );

                }
            );


            this.actualizarEstadisticas();


            if (
                this.juegoService
                    .hayVictoria()
            ) {

                this.tiempoService
                    .detener();


                this.mostrarVictoria();

            }


        } else {

            if (
                this.modo2Jugadores
            ) {

                this.juegoService
                    .partida
                    .cambiarTurno();


                this.actualizarTurno();

            }


            setTimeout(
                () => {

                    elementos.forEach(
                        item => {

                            item.elemento
                                .classList
                                .remove(
                                    "flip"
                                );

                        }
                    );


                    this.juegoService
                        .parejaIncorrecta();

                },
                800
            );

        }

    }


    iniciarTiempo() {

        this.tiempoService
            .iniciar(
                segundos => {

                    if (
                        this.mostrarTiempo
                    ) {

                        const min =
                            String(
                                Math.floor(
                                    segundos /
                                    60
                                )
                            )
                            .padStart(
                                2,
                                "0"
                            );


                        const seg =
                            String(
                                segundos %
                                60
                            )
                            .padStart(
                                2,
                                "0"
                            );


                        this.mostrarTiempo
                            .textContent =
                            `${min}:${seg}`;

                    }


                    if (
                        segundos <= 0
                    ) {

                        this.tiempoAgotado();

                    }

                }
            );

    }


    tiempoAgotado() {

        if (!this.modo2Jugadores) {
            progresoService.registrarFinPartida({
                victoria: false,
                puntaje: this.jugador1.getPuntaje(),
            });
        }

        this.tiempoService
            .detener();


        this.cartasDOM.forEach(
            item => {

                item.elemento
                    .style
                    .pointerEvents =
                    "none";

            }
        );


        if (
            this.estadisticasFinales
        ) {

            this.estadisticasFinales
                .innerHTML =
                this.crearEstadisticasDerrota();

        }


        if (this.modal) {

            this.modal.classList
                .remove(
                    "hidden"
                );

        }

    }


    crearEstadisticasDerrota() {

        if (
            this.modo2Jugadores
        ) {

            return `

                <h2>
                    ⏰ ¡Tiempo agotado!
                </h2>

                <br>

                Movimientos:
                ${this.partida.movimientos}

                <br><br>

                ${this.nombreJugador1}:
                ${this.jugador1.getPuntaje()}
                pts

                <br>

                ${this.nombreJugador2}:
                ${this.jugador2.getPuntaje()}
                pts

            `;

        }


        return `

            <h2>
                ⏰ ¡Tiempo agotado!
            </h2>

            <br>

            Movimientos:
            ${this.partida.movimientos}

            <br>

            Puntaje:
            ${this.jugador1.getPuntaje()}

        `;

    }


    actualizarEstadisticas() {

        if (
            this.mostrarMovimientos
        ) {

            this.mostrarMovimientos
                .textContent =
                this.partida
                    .movimientos;

        }


        if (
            this.mostrarPuntaje
        ) {

            if (
                this.modo2Jugadores
            ) {

                this.mostrarPuntaje
                    .textContent =

                    `${this.nombreJugador1}: ` +
                    `${this.jugador1.getPuntaje()} | ` +

                    `${this.nombreJugador2}: ` +
                    `${this.jugador2.getPuntaje()}`;

            } else {

                this.mostrarPuntaje
                    .textContent =
                    `${this.jugador1.getPuntaje()} pts`;

            }

        }

    }


    actualizarTurno() {

        if (
            this.turnoInfo
        ) {

            this.turnoInfo
                .textContent =

                `Turno: ${
                    this.partida
                        .jugadorActual === 1
                        ? this.nombreJugador1
                        : this.nombreJugador2
                }`;

        }

    }


    mostrarVictoria() {

        if (!this.modo2Jugadores) {
            progresoService.registrarFinPartida({
                victoria: true,
                puntaje: this.jugador1.getPuntaje(),
            });
        }

        if (
            this.victoryStats
        ) {

            this.victoryStats
                .innerHTML =
                this.crearEstadisticasVictoria();

        }


        if (
            this.victoryModal
        ) {

            this.victoryModal
                .classList
                .remove(
                    "hidden"
                );

        }

    }


    crearEstadisticasVictoria() {

        if (
            this.modo2Jugadores
        ) {

            return `

                Tiempo:
                ${this.mostrarTiempo.textContent}

                <br>

                Movimientos:
                ${this.partida.movimientos}

                <br><br>

                ${this.nombreJugador1}:
                ${this.jugador1.getPuntaje()}
                pts

                <br>

                ${this.nombreJugador2}:
                ${this.jugador2.getPuntaje()}
                pts

            `;

        }


        return `

            Tiempo:
            ${this.mostrarTiempo.textContent}

            <br>

            Movimientos:
            ${this.partida.movimientos}

            <br>

            Puntaje:
            ${this.jugador1.getPuntaje()}
            pts

        `;

    }


    configurarBotones() {

        if (
            this.botonGuardar
        ) {

            this.botonGuardar
                .addEventListener(
                    "click",
                    () => {

                        this.guardarHistorial();

                        location.reload();

                    }
                );

        }


        if (
            this.botonCerrar
        ) {

            this.botonCerrar
                .addEventListener(
                    "click",
                    () => {

                        window.location.href =
                            "menu.html";

                    }
                );

        }


        if (
            this.victoryRestart
        ) {

            this.victoryRestart
                .addEventListener(
                    "click",
                    () => {

                        location.reload();

                    }
                );

        }


        if (
            this.victoryClose
        ) {

            this.victoryClose
                .addEventListener(
                    "click",
                    () => {

                        window.location.href =
                            "muerte.html";

                    }
                );

        }

    }


    guardarHistorial() {

        const historial =
            JSON.parse(
                localStorage.getItem(
                    "registros"
                )
            ) || [];


        let registro;


        if (
            this.modo2Jugadores
        ) {

            registro = {

                nombre:
                    `${this.nombreJugador1} & ` +
                    `${this.nombreJugador2}`,

                tiempo:
                    this.mostrarTiempo
                        .textContent,

                movimientos:
                    this.partida
                        .movimientos,

                puntajeJugador1:
                    this.jugador1
                        .getPuntaje(),

                puntajeJugador2:
                    this.jugador2
                        .getPuntaje()

            };

        } else {

            registro = {

                nombre:
                    this.nombreJugador1,

                tiempo:
                    this.mostrarTiempo
                        .textContent,

                movimientos:
                    this.partida
                        .movimientos,

                puntaje:
                    this.jugador1
                        .getPuntaje()

            };

        }


        historial.push(
            registro
        );


        localStorage.setItem(

            "registros",

            JSON.stringify(
                historial
            )

        );


        // Envío BEST-EFFORT al backend (SQLite): el registro local
        // ya quedó; si no hay sesión o el servidor no responde,
        // esto simplemente no se envía (historialApi captura errores).
        historialApi.guardar({

            zona: "muerte",

            puntaje:
                registro.puntajeJugador1 !== undefined
                    ? registro.puntajeJugador1
                    : registro.puntaje,

            modo:
                registro.puntajeJugador1 !== undefined
                    ? "2"
                    : "1",

            ganador:
                registro.nombre

        });

    }


    configurarMusica() {

        if (
            !this.musica
        ) {

            return;

        }


        this.musica.volume =
            0.5;


        this.musica
            .play()
            .catch(
                () => {

                    document
                        .addEventListener(
                            "click",
                            () => {

                                this.musica
                                    .play();

                            },
                            {
                                once: true
                            }
                        );

                }
            );

    }

}