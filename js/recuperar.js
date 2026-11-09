/*=========================================================
  MEMORIA NINJA
  MODULO: RECUPERACION DE CONTRASEÑA
  COMPOSITION ROOT: recuperar.js

  IMPORTANTE: type="module" en el <script> de recuperar.html.
=========================================================*/

import { HttpAuthRepositorio } from "./infraestructura/repositorios/HttpAuthRepositorio.js";
import { MensajeDomNotificador } from "./infraestructura/notificadores/MensajeDomNotificador.js";
import { RecuperacionService } from "./servicios/RecuperacionService.js";
import { RecuperacionController } from "./controladores/RecuperacionController.js";

if (window.location.protocol === "file:") {
  const archivo = window.location.pathname.split("/").pop() || "recuperar.html";
  window.location.replace(
    "http://localhost:3000/" + archivo + window.location.search + window.location.hash
  );
}

// --- Composición ---
// Recuperación REAL vía /api/auth: el backend envía un código al correo
// (MAILER=consola lo imprime en la consola del servidor) y restablece la
// contraseña de forma atómica. Sin almacenamiento local de por medio.
const repositorioAuth = new HttpAuthRepositorio();
const notificador = new MensajeDomNotificador("msg");
const recuperacionService = new RecuperacionService(repositorioAuth);
const recuperacionController = new RecuperacionController(
  recuperacionService,
  notificador
);

// --- Conexión con el DOM ---
async function buscarCorreo() {
  const correo = document.getElementById("correo").value.trim();
  const exito = await recuperacionController.manejarEnvio({ paso: "correo", correo });

  if (exito) {
    document.getElementById("paso1").style.display = "none";
    document.getElementById("paso2").style.display = "block";
  }
}

async function verificarCodigo() {
  const codigo = document.getElementById("codigo").value.trim();
  const exito = await recuperacionController.manejarEnvio({ paso: "codigo", codigo });

  if (exito) {
    document.getElementById("paso2").style.display = "none";
    document.getElementById("paso3").style.display = "block";
  }
}

async function guardarPassword() {
  const nuevaPassword = document.getElementById("nuevaPass").value.trim();
  const confirmarPassword = document.getElementById("confirmarPass").value.trim();
  await recuperacionController.manejarEnvio({ paso: "password", nuevaPassword, confirmarPassword });
}

window.buscarCorreo = buscarCorreo;
window.verificarCodigo = verificarCodigo;
window.guardarPassword = guardarPassword;

// --- Conexión real con el DOM (sin onclick inline: el CSP lo bloquea) ---
document.getElementById("btnBuscarCorreo")?.addEventListener("click", buscarCorreo);
document.getElementById("btnVerificarCodigo")?.addEventListener("click", verificarCodigo);
document.getElementById("btnGuardarPassword")?.addEventListener("click", guardarPassword);

document.addEventListener("DOMContentLoaded", () =>
  recuperacionController.marcarPaso(1)
);