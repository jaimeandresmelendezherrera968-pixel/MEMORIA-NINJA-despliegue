const tablero = document.getElementById('board');

const mostrarTiempo = document.getElementById('timer');
const mostrarMovimientos = document.getElementById('moves');
const mostrarPuntaje = document.getElementById('score');
const turnoInfo = document.getElementById('turnInfo');


// ======================================================
// MODAL DE DERROTA
// ======================================================

const modal = document.getElementById('modal');
const estadisticasFinales = document.getElementById('finalStats');

const botonReiniciar =
    document.getElementById('restartGame');

const botonCerrar =
    document.getElementById('closeModal');


// ======================================================
// MODAL DE VICTORIA
// ======================================================

const victoryModal =
    document.getElementById('victoryModal');

const victoryRestart =
    document.getElementById('victoryRestart');

const victoryClose =
    document.getElementById('victoryClose');

const victoryStats =
    document.getElementById('victoryStats');


// ======================================================
// VARIABLES
// ======================================================

let cartasVolteadas = [];

let movimientos = 0;

let segundos = 0;

let temporizador;


// ======================================================
// RUTAS
// ======================================================

const RUTA_BACK =
    "assets/img/back.png";

const RUTA_ROCA =
    "assets/img/cards/aldeas/roca/";


// ======================================================
// CARTAS DE LA ROCA
// ======================================================

const cartasRoca = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8"
];


// ======================================================
// DATOS DE JUGADORES
// ======================================================

const nombreJugador1 =
    localStorage.getItem('playerName1') || 'Jugador 1';

const nombreJugador2 =
    localStorage.getItem('playerName2') || 'Jugador 2';

const modo2Jugadores =
    localStorage.getItem('modo2Jugadores') === 'true';


// ======================================================
// PUNTAJES
// ======================================================

let puntajeJugador1 = 0;

let puntajeJugador2 = 0;

let jugadorActual = 1;


// ======================================================
// INICIAR JUEGO
// ======================================================

function iniciarJuego() {

    cartasVolteadas = [];

    movimientos = 0;

    segundos = 0;

    puntajeJugador1 = 0;

    puntajeJugador2 = 0;

    jugadorActual = 1;

    clearInterval(temporizador);

    generarTablero();

    actualizarEstadisticas();

    if (modo2Jugadores) {
        actualizarTurno();
    }

    temporizador =
        setInterval(actualizarTiempo, 1000);
}


// ======================================================
// TIEMPO
// ======================================================

function actualizarTiempo() {

    segundos++;

    const min =
        String(
            Math.floor(segundos / 60)
        ).padStart(2, '0');

    const seg =
        String(
            segundos % 60
        ).padStart(2, '0');

    mostrarTiempo.textContent =
        `${min}:${seg}`;
}


// ======================================================
// ESTADÍSTICAS
// ======================================================

function actualizarEstadisticas() {

    mostrarMovimientos.textContent =
        movimientos;

    if (modo2Jugadores) {

        mostrarPuntaje.textContent =
            `${nombreJugador1}: ${puntajeJugador1} | ` +
            `${nombreJugador2}: ${puntajeJugador2}`;

    } else {

        mostrarPuntaje.textContent =
            `${puntajeJugador1} pts`;
    }
}


// ======================================================
// TURNO
// ======================================================

function actualizarTurno() {

    if (turnoInfo) {

        turnoInfo.textContent =
            `Turno: ${
                jugadorActual === 1
                    ? nombreJugador1
                    : nombreJugador2
            }`;
    }
}


// ======================================================
// GENERAR TABLERO
// ======================================================

function generarTablero() {

    tablero.innerHTML = '';

    const valores = [
        ...cartasRoca,
        ...cartasRoca
    ];

    valores.sort(
        () => Math.random() - 0.5
    );


    valores.forEach(valor => {

        const carta =
            document.createElement('div');

        carta.className = 'card';

        carta.dataset.valor = valor;


        // ==================================================
        // PARTE TRASERA
        // ==================================================

        const back =
            document.createElement('img');

        back.src = RUTA_BACK;

        back.className = 'back';


        // ==================================================
        // PARTE FRONTAL
        // ==================================================

        const front =
            document.createElement('img');

        front.src =
            `${RUTA_ROCA}${valor}.png`;

        front.className = 'front';


        // ==================================================
        // AGREGAR CARAS
        // ==================================================

        carta.appendChild(back);

        carta.appendChild(front);


        // ==================================================
        // CLICK
        // ==================================================

        carta.addEventListener(
            'click',
            () => voltearCarta(carta)
        );


        tablero.appendChild(carta);

    });


    // ==================================================
    // DISTRIBUCIÓN
    // ==================================================

    tablero.style.gridTemplateColumns =
        `repeat(4, 100px)`;
}


// ======================================================
// VOLTEAR CARTA
// ======================================================

function voltearCarta(carta) {

    if (

        carta.classList.contains('flip') ||

        carta.classList.contains('emparejada') ||

        cartasVolteadas.length === 2

    ) {

        return;
    }


    carta.classList.add('flip');

    cartasVolteadas.push(carta);


    if (
        cartasVolteadas.length === 2
    ) {

        movimientos++;

        actualizarEstadisticas();

        verificarCoincidencia();
    }
}


// ======================================================
// VERIFICAR PAREJA
// ======================================================

function verificarCoincidencia() {

    const [c1, c2] =
        cartasVolteadas;


    // ==================================================
    // PAREJA CORRECTA
    // ==================================================

    if (
        c1.dataset.valor ===
        c2.dataset.valor
    ) {

        if (modo2Jugadores) {

            if (jugadorActual === 1) {

                puntajeJugador1 += 10;

            } else {

                puntajeJugador2 += 10;
            }

        } else {

            puntajeJugador1 += 10;
        }


        // ==============================================
        // MARCAR PAREJA
        // ==============================================

        c1.classList.add(
            'emparejada'
        );

        c2.classList.add(
            'emparejada'
        );


        cartasVolteadas = [];


        actualizarEstadisticas();


        // ==============================================
        // COMPROBAR VICTORIA
        // ==============================================

        if (
            document.querySelectorAll(
                '.card:not(.emparejada)'
            ).length === 0
        ) {

            clearInterval(
                temporizador
            );


            setTimeout(
                mostrarVictoria,
                800
            );
        }

    }


    // ==================================================
    // PAREJA INCORRECTA
    // ==================================================

    else {

        if (modo2Jugadores) {

            jugadorActual =
                jugadorActual === 1
                    ? 2
                    : 1;

            actualizarTurno();
        }


        setTimeout(() => {

            c1.classList.remove(
                'flip'
            );

            c2.classList.remove(
                'flip'
            );

            cartasVolteadas = [];

        }, 800);
    }
}


// ======================================================
// MODAL DE VICTORIA
// ======================================================

function mostrarVictoria() {

    if (modo2Jugadores) {

        victoryStats.innerHTML = `

            Tiempo:
            ${mostrarTiempo.textContent}

            <br>

            Movimientos:
            ${movimientos}

            <br><br>

            ${nombreJugador1}:
            ${puntajeJugador1} pts

            <br>

            ${nombreJugador2}:
            ${puntajeJugador2} pts

        `;

    } else {

        victoryStats.innerHTML = `

            Tiempo:
            ${mostrarTiempo.textContent}

            <br>

            Movimientos:
            ${movimientos}

            <br>

            Puntaje:
            ${puntajeJugador1} pts

        `;
    }


    victoryModal.classList.remove(
        'hidden'
    );
}


// ======================================================
// MODAL DE DERROTA
// ======================================================

function mostrarDerrota() {

    if (modo2Jugadores) {

        estadisticasFinales.innerHTML = `

            Tiempo:
            ${mostrarTiempo.textContent}

            <br>

            Movimientos:
            ${movimientos}

            <br><br>

            ${nombreJugador1}:
            ${puntajeJugador1} pts

            <br>

            ${nombreJugador2}:
            ${puntajeJugador2} pts

        `;

    } else {

        estadisticasFinales.innerHTML = `

            Tiempo:
            ${mostrarTiempo.textContent}

            <br>

            Movimientos:
            ${movimientos}

            <br>

            Puntaje:
            ${puntajeJugador1} pts

        `;
    }


    modal.classList.remove(
        'hidden'
    );
}


// ======================================================
// BOTÓN REINICIAR — DERROTA
// ======================================================

if (botonReiniciar) {

    botonReiniciar.addEventListener(
        'click',
        function () {

            location.reload();

        }
    );
}


// ======================================================
// BOTÓN VOLVER — DERROTA
// ======================================================

if (botonCerrar) {

    botonCerrar.addEventListener(
        'click',
        function () {

            window.location.href =
                'menu.html';

        }
    );
}


// ======================================================
// BOTÓN REINICIAR — VICTORIA
// ======================================================

if (victoryRestart) {

    victoryRestart.addEventListener(
        'click',
        function () {

            location.reload();

        }
    );
}


// ======================================================
// BOTÓN VOLVER — VICTORIA
// ======================================================

if (victoryClose) {

    victoryClose.addEventListener(
        'click',
        function () {

            window.location.href =
                'menu.html';

        }
    );
}


// ======================================================
// INICIAR
// ======================================================

iniciarJuego();


// ======================================================
// MÚSICA
// ======================================================

window.addEventListener(
    "load",
    function () {

        const musica =
            document.getElementById(
                "gameMusic"
            );


        if (musica) {

            musica.play().catch(() => {

                document.addEventListener(
                    "click",
                    function () {

                        musica.play();

                    },
                    {
                        once: true
                    }
                );

            });
        }
    }
);