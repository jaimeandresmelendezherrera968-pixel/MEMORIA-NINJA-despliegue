// === ELEMENTOS DEL DOM ===
const tablero = document.getElementById('board');
const mostrarTiempo = document.getElementById('timer');
const mostrarMovimientos = document.getElementById('moves');
const mostrarPuntaje = document.getElementById('score');
const turnoInfo = document.getElementById('turnInfo');
const modal = document.getElementById('modal');
const estadisticasFinales = document.getElementById('finalStats');
const botonGuardar = document.getElementById('saveRecord');
const botonCerrar = document.getElementById('closeModal');

// === VARIABLES ===
let cartasVolteadas = [];
let movimientos = 0;
let segundos = 0;
let temporizador;

// === RUTAS DE IMÁGENES ===
const RUTA_BACK = "assets/img/back.png";
const RUTA_ALDEAS = "assets/img/cards/aldeas/";

// === ALDEAS ===
const aldeas = {
  konoha: ["1","2","3","4","5","6","7","8"],
  arena:  ["1","2","3","4","5","6","7","8"],
  roca:   ["1","2","3","4","5","6","7","8"],
  niebla: ["1","2","3","4","5","6","7","8"],
  nube:   ["1","2","3","4","5","6","7","8"]
};

// === NIVELES PROGRESIVOS ===
const niveles = [
  {
    cartas: ["1","2","3","4","5","6"],
    aldea: "konoha",
    clan: "uzumaki"
  },
  {
    cartas: ["1","2","3","4","5","6"],
    aldea: "konoha",
    clan: "hyuga"
  },
  {
    cartas: ["1","2","3","4","5","6"],
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
    cartas: ["1","2","3","4","5","6","7","8"],
    aldea: "nube"
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
  segundos = 0;
  puntajeJugador1 = 0;
  puntajeJugador2 = 0;
  jugadorActual = 1;

  actualizarEstadisticas();
  if (modo2Jugadores) actualizarTurno();

  clearInterval(temporizador);
  temporizador = setInterval(actualizarTiempo, 1000);
}

// === TIEMPO ===
function actualizarTiempo() {
  segundos++;
  const min = String(Math.floor(segundos / 60)).padStart(2,'0');
  const seg = String(segundos % 60).padStart(2,'0');
  mostrarTiempo.textContent = `${min}:${seg}`;
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
  tablero.innerHTML = '';

  const nivel = niveles[nivelActual - 1];
  const valores = [...nivel.cartas, ...nivel.cartas];
  valores.sort(() => Math.random() - 0.5);

  valores.forEach(valor => {
    const carta = document.createElement('div');
    carta.className = 'card';
    carta.dataset.valor = valor;

    let aldeaCarta = nivel.aldea;

    if (nivel.aldea === 'mixto') {
      if (aldeas.konoha.includes(valor)) aldeaCarta = 'konoha';
      else if (aldeas.arena.includes(valor)) aldeaCarta = 'arena';
      else if (aldeas.roca.includes(valor)) aldeaCarta = 'roca';
      else if (aldeas.niebla.includes(valor)) aldeaCarta = 'niebla';
      else if (aldeas.nube.includes(valor)) aldeaCarta = 'nube';
    }

    carta.dataset.aldea = aldeaCarta;

    if (nivel.clan) {
  carta.dataset.clan = nivel.clan;
}

    const img = document.createElement('img');
    img.src = RUTA_BACK;
    img.className = 'img-card';

    carta.appendChild(img);
    carta.addEventListener('click', () => voltearCarta(carta));
    tablero.appendChild(carta);
  });

  tablero.style.gridTemplateColumns =
    `repeat(${Math.min(nivel.cartas.length,4)}, 80px)`;
}

// === VOLTEAR CARTA ===
function voltearCarta(carta) {
  if (carta.classList.contains('volteada') || cartasVolteadas.length === 2) return;

  carta.classList.add('volteada');

  let rutaImagen;

if (carta.dataset.clan) {
  rutaImagen =
    `${RUTA_ALDEAS}${carta.dataset.aldea}/${carta.dataset.clan}/${carta.dataset.valor}.png`;
} else {
  rutaImagen =
    `${RUTA_ALDEAS}${carta.dataset.aldea}/${carta.dataset.valor}.png`;
}

  carta.querySelector('img').src = rutaImagen;

  cartasVolteadas.push(carta);

  if (cartasVolteadas.length === 2) {
    movimientos++;
    verificarCoincidencia();
  }

  actualizarEstadisticas();
}

// === VERIFICAR ===
function verificarCoincidencia() {
  const [c1, c2] = cartasVolteadas;

  if (c1.dataset.valor === c2.dataset.valor) {
    if (modo2Jugadores) {
      jugadorActual === 1 ? puntajeJugador1 += 10 : puntajeJugador2 += 10;
    } else {
      puntajeJugador1 += 10;
    }

    c1.classList.add('emparejada');
    c2.classList.add('emparejada');
    cartasVolteadas = [];
    actualizarEstadisticas();

    if (document.querySelectorAll('.card:not(.emparejada)').length === 0) {
      clearInterval(temporizador);
      mostrarModal();
    }

  } else {
    if (modo2Jugadores) {
      jugadorActual = jugadorActual === 1 ? 2 : 1;
      actualizarTurno();
    }

    setTimeout(() => {
      c1.classList.remove('volteada');
      c2.classList.remove('volteada');
      c1.querySelector('img').src = RUTA_BACK;
      c2.querySelector('img').src = RUTA_BACK;
      cartasVolteadas = [];
    }, 800);
  }
}

// === MODAL FINAL ===
function mostrarModal() {
  estadisticasFinales.innerHTML = modo2Jugadores
    ? `Movimientos: ${movimientos}<br>Tiempo: ${mostrarTiempo.textContent}<br>${nombreJugador1}: ${puntajeJugador1} | ${nombreJugador2}: ${puntajeJugador2}`
    : `Movimientos: ${movimientos}<br>Tiempo: ${mostrarTiempo.textContent}<br>Puntaje: ${puntajeJugador1}`;

  modal.classList.remove('hidden');
}

// === GUARDAR HISTORIAL ===
botonGuardar.addEventListener('click', () => {
  const registro = modo2Jugadores
    ? { nombre: `${nombreJugador1} & ${nombreJugador2}`, tiempo: mostrarTiempo.textContent, movimientos, puntajeJugador1, puntajeJugador2 }
    : { nombre: nombreJugador1, tiempo: mostrarTiempo.textContent, movimientos, puntaje: puntajeJugador1 };

  const historial = JSON.parse(localStorage.getItem('registros')) || [];
  historial.push(registro);
  localStorage.setItem('registros', JSON.stringify(historial));

  // Envío BEST-EFFORT al backend (SQLite): el registro local ya quedó.
  (async () => {
    try {
      const { historialApi } = await import(
        "./js/infraestructura/repositorios/HttpHistorialRepositorio.js"
      );
      await historialApi.guardar({
        zona: "uzumaki",
        puntaje: puntajeJugador1,
        modo: modo2Jugadores ? "2" : "1",
        ganador: registro.nombre,
        idPartida: `uzumaki-${Date.now()}`
      });
    } catch {
      // Backend no disponible: sin problema, sigue el juego.
    }
  })();

  modal.classList.add('hidden');
});

// === CERRAR MODAL ===
botonCerrar.addEventListener('click', () => modal.classList.add('hidden'));

// === INICIAR ===
iniciarJuego();


// === Música ===
window.addEventListener("load", function() {
  const musica = document.getElementById("gameMusic");
  if (musica){
    musica.play().catch(()=>{
      document.addEventListener("click", function(){ musica.play(); }, {once:true});
    });
  }
});