/*=========================================================
  MEMORIA NINJA
  COMPOSITION ROOT: login.js

  IMPORTANTE: el <script> que carga este archivo en login.html
  debe tener type="module".
=========================================================*/

import { HttpUsuarioRepositorio } from "./infraestructura/repositorios/HttpUsuarioRepositorio.js";
import { LocalStorageSesionRepositorio } from "./infraestructura/repositorios/LocalStorageSesionRepositorio.js";
import { MensajeDomNotificador } from "./infraestructura/notificadores/MensajeDomNotificador.js";
import { AutenticacionService } from "./servicios/AutenticacionService.js";
import { SesionService } from "./servicios/SesionService.js";
import { LoginController } from "./controladores/LoginController.js";
import { alternarVisibilidadPassword } from "./utils/TogglePasswordHelper.js";

if (window.location.protocol === "file:") {
  const archivo = window.location.pathname.split("/").pop() || "login.html";
  window.location.replace(
    "http://localhost:3000/" + archivo + window.location.search + window.location.hash
  );
}

// --- Composición (Dependency Injection manual) ---
// Login REAL contra PostgreSQL: buscaPorCredenciales() llama a
// /api/auth/login, que valida la contraseña (hash con escrypt), crea la
// sesión en tabla sesiones y fija la cookie httpOnly. Ya NO hay respaldo
// local: los usuarios viven solo en el servidor.
const repositorioUsuarios = new HttpUsuarioRepositorio();
const sesionRepositorio = new LocalStorageSesionRepositorio();
const notificador = new MensajeDomNotificador("msg");
const autenticacionService = new AutenticacionService(repositorioUsuarios);
const sesionService = new SesionService(sesionRepositorio);
const loginController = new LoginController(
  autenticacionService,
  sesionService,
  notificador
);

// --- Conexión con el DOM (listeners; sin onclick inline, que el CSP bloquea.
// Los nombres en window se mantienen por compatibilidad) ---
async function login() {
  const usuario = document.getElementById("user").value.trim();
  const password = document.getElementById("pass").value.trim();
  const recordar = document.getElementById("recordarme").checked;

  await loginController.manejarEnvio({ usuario, password, recordar });
}

function togglePassword(idInput, icono) {
  alternarVisibilidadPassword(idInput, icono);
}

// --- Entrar como INVITADO (sin cuenta) ---
// El modo invitado ya existía "por dentro": js/sesion-guard.js marca
// estadoSesion="invitado" cuando /api/auth/me responde 401 y el menú limita
// perfil/ranking/historial. Solo faltaba la PUERTA DE ENTRADA.
// Cerramos cualquier sesión previa (best-effort) para que el invitado sea
// real y vamos al menú; si el servidor no responde, igual entramos (el guard
// lo marcará como "offline" y el juego sigue jugable).
async function jugarComoInvitado() {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch (e) {
    // Sin servidor: seguimos igual, el guard marcará "offline".
  }
  try {
    sesionRepositorio.eliminar();
    localStorage.setItem("estadoSesion", "invitado");
  } catch (e) {}
  window.location.href = "menu.html";
}

window.login = login;
window.togglePassword = togglePassword;

// --- Conexión real con el DOM (sin onclick inline: el CSP lo bloquea) ---
document.getElementById("btnLogin")?.addEventListener("click", login);
document.getElementById("ojoPass")?.addEventListener("click", (evento) =>
  togglePassword("pass", evento.currentTarget)
);
document.getElementById("btnInvitado")?.addEventListener("click", jugarComoInvitado);
