// === ELEMENTOS DEL DOM ===
const tablero = document.getElementById('board');
const mostrarTiempo = document.getElementById('timer');
const mostrarMovimientos = document.getElementById('moves');
const mostrarPuntaje = document.getElementById('score');
const turnoInfo = document.getElementById('turnInfo');
const modal = document.getElementById('modal');
const estadisticasFinales = document.getElementById('finalStats');
const botonGuardar = document.getElementById('restartGame');
const botonCerrar = document.getElementById('closeModal');

const victoryModal = document.getElementById('victoryModal');
const victoryRestart = document.getElementById('victoryRestart');
const victoryClose = document.getElementById('victoryClose');
const victoryStats = document.getElementById('victoryStats');

// === VARIABLES ===
let cartasVolteadas = [];
let movimientos = 0;
let segundos = 60; // 1 minuto
let temporizador;

// === RUTAS DE IMÁGENES ===
const RUTA_BACK = "assets/img/respaldomuerte.png";
const RUTA_ALDEAS = "assets/img/cards/aldeas/";

// === ALDEAS ===
const aldeas = {
    konoha: {
        uzumaki: ["1","2","3","4","5","6","7","8"],
        hyuga: ["1","2","3","4","5","6"],
        uchiha: ["1","2","3","4","5","6","7","8"],
        sarutobi: ["1","2","3","4","5","6"]
    },

    arena: ["1","2","3","4","5","6","7","8"],
    roca: ["1","2","3","4","5","6","7","8"],
    niebla: ["1","2","3","4","5","6","7","8"],
    nube: ["1","2","3","4","5","6","7","8"],
    akatsuki: ["1","2","3","4","5","6","7"]
};

// === NIVELES PROGRESIVOS ===
const niveles = [
  {
    cartas: ["1","2","3","4","5","6","7","8"],
    aldea: "konoha",
    clan: "uzumaki"
  },
  {
    cartas: ["1","2","3","4","5","6","7","8"],
    aldea: "konoha",
    clan: "hyuga"
  },
  {
    cartas: ["1","2","3","4","5","6","7"],
    aldea: "konoha",
    clan: "uchiha"
  },
  {
    cartas: ["1","2","3","4","5","6"],
    aldea: "konoha",
    clan: "sarutobi"
  },
  {
    cartas: ["1","2","3","4","5","6","7","8"],
    aldea: "arena"
  },
  {
    cartas: ["1","2","3","4","5","6","7","8"],
    aldea: "roca"
  },
  {
    cartas: ["1","2","3","4","5","6","7","8"],
    aldea: "niebla"
  },
  {
    cartas: ["1","2","3","4","5","6","7"],
    aldea: "nube"
  },
  {
    cartas: ["1","2","3","4","5","6","7"],
    aldea: "akatsuki"
  }
];

// === DATOS DEL MENÚ ===
const nombreJugador1 = localStorage.getItem('playerName1') || 'Jugador 1';
const nombreJugador2 = localStorage.getItem('playerName2') || 'Jugador 2';
const nivelActual = parseInt(localStorage.getItem('nivelActual')) || 1;
const modo2Jugadores = localStorage.getItem('modo2Jugadores') === 'true';

// === PUNTAJES ===
let puntajeJugador1 = 0;
let puntajeJugador2 = 0;
let jugadorActual = 1;

// === INICIAR JUEGO ===
function iniciarJuego() {
  generarTablero();

  movimientos = 0;
  segundos = 60;
  puntajeJugador1 = 0;
  puntajeJugador2 = 0;
  jugadorActual = 1;

  actualizarEstadisticas();

  if (modo2Jugadores) {
    actualizarTurno();
  }

  clearInterval(temporizador);

  actualizarTiempo();
  temporizador = setInterval(actualizarTiempo, 1000);
}

// === TIEMPO (CUENTA REGRESIVA) ===
function actualizarTiempo() {

  const min = String(Math.floor(segundos / 60)).padStart(2, '0');
  const seg = String(segundos % 60).padStart(2, '0');

  mostrarTiempo.textContent = `${min}:${seg}`;

  if (segundos <= 0) {

    clearInterval(temporizador);

    document.querySelectorAll('.card').forEach(carta => {
      carta.style.pointerEvents = "none";
    });

    estadisticasFinales.innerHTML = `
      <h2>⏰ ¡Tiempo agotado!</h2>
      <br>
      Movimientos: ${movimientos}<br>
      ${
        modo2Jugadores
          ? `${nombreJugador1}: ${puntajeJugador1}<br>${nombreJugador2}: ${puntajeJugador2}`
          : `Puntaje: ${puntajeJugador1}`
      }
    `;

    modal.classList.remove('hidden');
    return;
  }

  segundos--;
}

// === ESTADÍSTICAS ===
function actualizarEstadisticas() {
  mostrarMovimientos.textContent = movimientos;

  if (modo2Jugadores) {
    mostrarPuntaje.textContent =
      `${nombreJugador1}: ${puntajeJugador1} | ${nombreJugador2}: ${puntajeJugador2}`;
  } else {
    mostrarPuntaje.textContent = `${puntajeJugador1} pts`;
  }
}

// === TURNO ===
function actualizarTurno() {
  if (turnoInfo) {
    turnoInfo.textContent =
      `Turno: ${jugadorActual === 1 ? nombreJugador1 : nombreJugador2}`;
  }
}

// === GENERAR TABLERO ===
function generarTablero() {

    tablero.innerHTML = "";

    const nivel = niveles[nivelActual - 1];

    // Comprobar que el nivel exista
    if (!nivel) {
        console.error("No existe el nivel:", nivelActual);
        return;
    }

    // Cantidad de parejas del nivel
    const cantidadParejas = nivel.cartas.length;

    // ========================================
    // TODAS LAS CARTAS DISPONIBLES
    // ========================================

    const cartasDisponibles = [

        // KONOHA - UZUMAKI
        ...["1","2","3","4","5","6","7","8"].map(numero => ({
            aldea: "konoha",
            clan: "uzumaki",
            valor: numero
        })),

        // KONOHA - HYUGA
        ...["1","2","3","4","5","6","7","8"].map(numero => ({
            aldea: "konoha",
            clan: "hyuga",
            valor: numero
        })),

        // KONOHA - UCHIHA
        ...["1","2","3","4","5","6","7"].map(numero => ({
            aldea: "konoha",
            clan: "uchiha",
            valor: numero
        })),

        // KONOHA - SARUTOBI
        ...["1","2","3","4","5","6"].map(numero => ({
            aldea: "konoha",
            clan: "sarutobi",
            valor: numero
        })),

        // ARENA
        ...["1","2","3","4","5","6","7","8"].map(numero => ({
            aldea: "arena",
            valor: numero
        })),

        // ROCA
        ...["1","2","3","4","5","6","7","8"].map(numero => ({
            aldea: "roca",
            valor: numero
        })),

        // NIEBLA
        ...["1","2","3","4","5","6","7","8"].map(numero => ({
            aldea: "niebla",
            valor: numero
        })),

        // NUBE
        ...["1","2","3","4","5","6","7","8"].map(numero => ({
            aldea: "nube",
            valor: numero
        })),

        // AKATSUKI
        ...["1","2","3","4","5","6","7"].map(numero => ({
            aldea: "akatsuki",
            valor: numero
        }))
    ];

    // ========================================
    // MEZCLAR
    // ========================================

    cartasDisponibles.sort(() => Math.random() - 0.5);

    // ========================================
    // SELECCIONAR PAREJAS
    // ========================================

    const seleccionadas = cartasDisponibles.slice(0, cantidadParejas);

    // ========================================
    // CREAR PAREJAS
    // ========================================

    const cartasJuego = [];

    seleccionadas.forEach((carta, indice) => {

        cartasJuego.push({
            ...carta,
            idPareja: indice
        });

        cartasJuego.push({
            ...carta,
            idPareja: indice
        });

    });

    // ========================================
    // MEZCLAR TABLERO
    // ========================================

    cartasJuego.sort(() => Math.random() - 0.5);

    // ========================================
    // CREAR LAS CARTAS
    // ========================================

    cartasJuego.forEach(cartaDatos => {

        const carta = document.createElement("div");

        carta.className = "card";

        carta.dataset.pareja = cartaDatos.idPareja;
        carta.dataset.valor = cartaDatos.valor;
        carta.dataset.aldea = cartaDatos.aldea;

        if (cartaDatos.clan) {
            carta.dataset.clan = cartaDatos.clan;
        }

        // IMAGEN DE RESPALDO
        const back = document.createElement("img");

        back.src = RUTA_BACK;
        back.className = "back";

        // IMAGEN FRONTAL
        const front = document.createElement("img");

        if (cartaDatos.aldea === "konoha") {

            front.src =
                `${RUTA_ALDEAS}konoha/${cartaDatos.clan}/${cartaDatos.valor}.png`;

        } else {

            front.src =
                `${RUTA_ALDEAS}${cartaDatos.aldea}/${cartaDatos.valor}.png`;

        }

        front.className = "front";

        carta.appendChild(back);
        carta.appendChild(front);

        // CLICK
        carta.addEventListener("click", function () {
            voltearCarta(carta);
        });

        tablero.appendChild(carta);

    });

    // ========================================
    // COLUMNAS
    // ========================================

    tablero.style.gridTemplateColumns =
        `repeat(${Math.min(cantidadParejas, 4)}, 100px)`;

    console.log("Tablero creado:", cartasJuego);
}





// === VOLTEAR CARTA ===
function voltearCarta(carta) {

    if (
        carta.classList.contains('flip') ||
        carta.classList.contains('emparejada') ||
        cartasVolteadas.length === 2
    ) return;

    carta.classList.add('flip');

    cartasVolteadas.push(carta);

    if (cartasVolteadas.length === 2) {

        movimientos++;

        actualizarEstadisticas();

        verificarCoincidencia();
    }
}

// === VERIFICAR COINCIDENCIA ===
function verificarCoincidencia() {

  const [c1, c2] = cartasVolteadas;

  if (c1.dataset.pareja === c2.dataset.pareja) {

    if (modo2Jugadores) {
      if (jugadorActual === 1) {
        puntajeJugador1 += 10;
      } else {
        puntajeJugador2 += 10;
      }
    } else {
      puntajeJugador1 += 10;
    }

    c1.classList.add('emparejada');
    c2.classList.add('emparejada');

    cartasVolteadas = [];

    actualizarEstadisticas();

    // ¿Ganó?
    if (document.querySelectorAll('.card:not(.emparejada)').length === 0) {

    clearInterval(temporizador);

    mostrarVictoria();

}

  } else {

    if (modo2Jugadores) {
      jugadorActual = jugadorActual === 1 ? 2 : 1;
      actualizarTurno();
    }

    setTimeout(() => {

    c1.classList.remove('flip');
    c2.classList.remove('flip');

    cartasVolteadas = [];

}, 800);

  }

}

// === MODAL FINAL ===
function mostrarModal() {

  estadisticasFinales.innerHTML = modo2Jugadores
    ? `
      <h2>🎉 ¡Juego terminado!</h2>
      <br>
      Tiempo: ${mostrarTiempo.textContent}<br>
      Movimientos: ${movimientos}<br><br>

      ${nombreJugador1}: ${puntajeJugador1} pts<br>
      ${nombreJugador2}: ${puntajeJugador2} pts
    `
    : `
      <h2>🎉 ¡Juego terminado!</h2>
      <br>
      Tiempo: ${mostrarTiempo.textContent}<br>
      Movimientos: ${movimientos}<br>
      Puntaje: ${puntajeJugador1}
    `;

  modal.classList.remove('hidden');
}

// === GUARDAR HISTORIAL ===
botonGuardar.addEventListener('click', () => {

  const registro = modo2Jugadores
    ? {
        nombre: `${nombreJugador1} & ${nombreJugador2}`,
        tiempo: mostrarTiempo.textContent,
        movimientos,
        puntajeJugador1,
        puntajeJugador2
      }
    : {
        nombre: nombreJugador1,
        tiempo: mostrarTiempo.textContent,
        movimientos,
        puntaje: puntajeJugador1
      };

  const historial =
    JSON.parse(localStorage.getItem('registros')) || [];

  historial.push(registro);

  localStorage.setItem(
    'registros',
    JSON.stringify(historial)
  );

  // Envío BEST-EFFORT al backend (SQLite): el registro local ya quedó.
  (async () => {
    try {
      const { historialApi } = await import(
        "./js/infraestructura/repositorios/HttpHistorialRepositorio.js"
      );
      await historialApi.guardar({
        zona: "muerte",
        puntaje: registro.puntajeJugador1 !== undefined
          ? registro.puntajeJugador1
          : registro.puntaje,
        modo: registro.puntajeJugador1 !== undefined ? "2" : "1",
        ganador: registro.nombre,
        idPartida: `muerte-${Date.now()}`
      });
    } catch {
      // Backend no disponible: sin problema, sigue el juego.
    }
  })();

  modal.classList.add('hidden');

});

// === CERRAR MODAL ===
botonCerrar.addEventListener('click', () => {
  modal.classList.add('hidden');
});

// === INICIAR JUEGO ===
iniciarJuego();

// === MÚSICA ===
window.addEventListener("load", function () {

  const musica = document.getElementById("gameMusic");

  if (musica) {

    musica.play().catch(() => {

      document.addEventListener(
        "click",
        function () {
          musica.play();
        },
        { once: true }
      );

    });

  }

});


// ========================================
// BOTÓN REINICIAR
// ========================================

document.getElementById('restartGame').addEventListener('click', function () {
    location.reload();
});


// ========================================
// BOTÓN VOLVER AL MENÚ
// ========================================

document.getElementById('closeModal').addEventListener('click', function () {
    window.location.href = 'menu.html';
});

// ========================================
// MODAL DE VICTORIA
// ========================================

function mostrarVictoria() {

    victoryStats.innerHTML = modo2Jugadores
        ? `
            Tiempo: ${mostrarTiempo.textContent}<br>
            Movimientos: ${movimientos}<br><br>
            ${nombreJugador1}: ${puntajeJugador1} pts<br>
            ${nombreJugador2}: ${puntajeJugador2} pts
          `
        : `
            Tiempo: ${mostrarTiempo.textContent}<br>
            Movimientos: ${movimientos}<br>
            Puntaje: ${puntajeJugador1} pts
          `;

    victoryModal.classList.remove('hidden');
}


// REINICIAR
document.getElementById('victoryRestart').addEventListener('click', function () {
    location.reload();
});


// VOLVER AL MENÚ
document.getElementById('victoryClose').addEventListener('click', function () {
    window.location.href = 'muerte.html';
});