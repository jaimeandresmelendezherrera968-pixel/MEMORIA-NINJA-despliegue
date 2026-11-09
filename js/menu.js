// === ELEMENTOS DEL MENÚ ===
const inputJugador1 = document.getElementById('playerName1');
const inputJugador2 = document.getElementById('playerName2');
const gameModeSelect = document.getElementById('gameMode');
const levelSelect = document.getElementById('difficulty');
const botonIniciar = document.getElementById('startBtn');
const botonNivel = document.getElementById('levelBtn');

// === HISTORIAL ===
// (Parte 3: se eliminó el mecanismo muerto del historial lateral `#recordsList`
//  + `actualizarHistorial()` + `renderHistorial()`: ese contenedor NO existe en
//  menu.html, así que el código retornaba temprano siempre. El historial REAL
//  vive en js/ui/HistoryModal.js y lee del backend /api/usuarios/:id/historial.)

// === INICIAR JUEGO ===
if (botonIniciar) {
  botonIniciar.addEventListener('click', function() {
    const nombre1 = inputJugador1?.value || 'Jugador 1';
    const nombre2 = inputJugador2?.value || 'Jugador 2';
    const nivelSeleccionado = localStorage.getItem('nivelActual') || 1;
    const modoJuego = gameModeSelect?.value || '1';

    // GUARDAR DATOS PARA EL JUEGO
    localStorage.setItem('playerName1', nombre1);
    localStorage.setItem('playerName2', nombre2);
    localStorage.setItem('nivelActual', nivelSeleccionado);
    localStorage.setItem('modo2Jugadores', modoJuego === '2');

    // IR AL JUEGO
    window.location.href = 'niveles.html';
  });
}

if (botonNivel) {
  botonNivel.addEventListener('click', () => {
    window.location.href = "niveles.html";
  });
}

// === MÚSICA MENÚ ===
const musicaMenu = document.getElementById("musicaMenu");

function iniciarMusica() {
  if (musicaMenu) {
    musicaMenu.volume = 0.5;
    musicaMenu.play().catch(err => console.log("Interacción requerida para audio"));
  }
  document.removeEventListener("click", iniciarMusica);
}

// La música inicia en el primer click
document.addEventListener("click", iniciarMusica);

// (Parte 3: se eliminaron las salas FALSAS del multijugador — "Itachi969",
//  "Sasukexd", etc. — y la redirección hardcodeada a game-online.html.
//  El multijugador online REAL llega en la Parte 5; por eso el modal ahora
//  muestra un estado vacío honesto en lugar de salas inventadas.)

/*=========================================================
    MEMORIA NINJA
    CERRAR SESIÓN

    Elimina la sesión activa y vuelve al Login.
=========================================================*/

function cerrarSesion() {
  if (window.SesionNinja && window.SesionNinja.cerrarSesion) {
    window.SesionNinja.cerrarSesion();
    return;
  }
  localStorage.removeItem("usuarioActivo");
  window.location.href = "login.html";
}

// --- Conexión real con el DOM (sin onclick/onerror inline: el CSP los bloquea) ---
document.getElementById("btnCerrarSesion")?.addEventListener("click", cerrarSesion);

// Respaldo visual cuando falta la imagen del avatar (p. ej. itachi-avatar.png
// no existe): se reemplaza el <img> roto por un emoji ninja. Un <img> no
// puede mostrar texto, por eso se sustituye el elemento.
function mostrarNinjaDeRespaldo(imagen) {
  const marca = document.createElement("span");
  marca.textContent = "🥷";
  marca.className = imagen.className;
  marca.style.fontSize = "30px";
  marca.style.display = "flex";
  marca.style.alignItems = "center";
  marca.style.justifyContent = "center";
  imagen.replaceWith(marca);
}

document.querySelectorAll("img.avatar-img").forEach((imagen) => {
  imagen.addEventListener("error", () => mostrarNinjaDeRespaldo(imagen));
  if (imagen.complete && imagen.naturalWidth === 0) {
    mostrarNinjaDeRespaldo(imagen);
  }
});

// === PING EN TIEMPO REAL EN LA BARRA DE ESTADO ===
// Sin mocks: si el servidor no responde se muestra "--" (no un número falso).
const pingValor = document.getElementById('pingValor');
const estadoConexion = document.getElementById('estadoConexion');
const estadoServidor = document.getElementById('estadoServidor');

async function medirPingReal() {
  const inicio = performance.now();
  try {
    await fetch(`/api/estado?t=${Date.now()}`, { cache: 'no-store' });
    return Math.max(1, Math.round(performance.now() - inicio));
  } catch {
    return null; // Servidor no disponible
  }
}

function pintarEstado(ms) {
  if (!pingValor) return;
  if (ms === null) {
    pingValor.textContent = '--';
    if (estadoConexion) estadoConexion.textContent = '🔴 Sin conexión';
    if (estadoServidor) estadoServidor.textContent = 'Servidor offline';
    return;
  }
  pingValor.textContent = `${ms}ms`;
  if (estadoConexion) estadoConexion.textContent = '🟢 Conectado';
  if (estadoServidor) estadoServidor.textContent = 'Servidor Online';
}

async function actualizarPing() {
  if (!pingValor) return;
  pintarEstado(await medirPingReal());
}

setInterval(actualizarPing, 2000);
actualizarPing();