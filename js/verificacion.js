/*=========================================================
  MEMORIA NINJA
  COMPOSITION ROOT: verificacion.js

  IMPORTANTE: type="module" en el <script> de verificacion.html.
=========================================================*/

import { HttpAuthRepositorio } from "./infraestructura/repositorios/HttpAuthRepositorio.js";
import { AlertaNotificador } from "./infraestructura/notificadores/AlertaNotificador.js";
import { VerificacionService } from "./servicios/VerificacionService.js";
import { VerificacionController } from "./controladores/VerificacionController.js";

if (window.location.protocol === "file:") {
  const archivo = window.location.pathname.split("/").pop() || "verificacion.html";
  window.location.replace(
    "http://localhost:3000/" + archivo + window.location.search + window.location.hash
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const inputCorreo = document.getElementById("input-correo");
  const btnEnviarCorreo = document.getElementById("btn-enviar-correo");
  const btnComprobarCodigo = document.getElementById("btn-comprobar-codigo");
  const paso1 = document.getElementById("paso-1");
  const paso2 = document.getElementById("paso-2");
  const contenedorCarga = document.getElementById("contenedor-carga");
  const inputCodigo = document.getElementById("input-codigo");
  const textoEnviado = document.getElementById("texto-enviado");
  const temporizador = document.getElementById("temporizador");
  const reenviarBox = document.getElementById("reenviar");
  const btnReenviar = document.getElementById("btn-reenviar");

  // --- Composición ---
  // Verificación REAL: el código lo genera el backend (/api/auth), no el
  // navegador. Con MAILER=consola aparece impreso en la consola del
  // servidor; con MAILER=ethereal llega al correo de verdad.
  const repositorioAuth = new HttpAuthRepositorio();
  const notificador = new AlertaNotificador();
  const verificacionService = new VerificacionService(repositorioAuth);
  const verificacionController = new VerificacionController(
    verificacionService,
    notificador,
    {
      textoEnviado,
      temporizador,
      reenviarBox,
      btnComprobarCodigo,
      inputCodigo,
      contenedorCarga
    }
  );

  let correoActual = "";

  btnEnviarCorreo.addEventListener("click", async () => {
    const correo = inputCorreo.value.trim();

    if (correo === "") {
      notificador.mostrar("Escribe tu correo primero.", "error");
      return;
    }

    const exito = await verificacionController.enviarCodigo(correo);
    if (!exito) return;

    correoActual = correo;
    paso1.classList.remove("activa");
    setTimeout(() => paso2.classList.add("activa"), 150);
  });

  btnReenviar.addEventListener("click", async () => {
    const exito = await verificacionController.enviarCodigo(correoActual);
    if (!exito) return;

    inputCodigo.value = "";
    inputCodigo.focus();
  });

  btnComprobarCodigo.addEventListener("click", async () => {
    const codigo = inputCodigo.value.trim();

    if (codigo === "") {
      notificador.mostrar("Por favor, ingresa el código.", "error");
      return;
    }

    await verificacionController.manejarEnvio({ codigo });
  });
});