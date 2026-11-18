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

const CLAVE_PENDIENTE = "memoriaNinjaVerificacionPendiente";

function leerPendiente() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_PENDIENTE) || "null");
  } catch {
    return null;
  }
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
  const btnMostrarCorregir = document.getElementById("btn-mostrar-corregir");
  const formularioCorregir = document.getElementById("formulario-corregir");
  const inputUsuarioCorregir = document.getElementById("input-usuario-corregir");
  const inputPasswordCorregir = document.getElementById("input-password-corregir");
  const inputCorreoNuevo = document.getElementById("input-correo-nuevo");
  const btnCorregirCorreo = document.getElementById("btn-corregir-correo");

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
      contenedorCarga,
      limpiarPendiente: () => sessionStorage.removeItem(CLAVE_PENDIENTE)
    }
  );

  let correoActual = "";
  let enviando = false;
  let reenviando = false;
  let comprobando = false;
  let corrigiendo = false;

  const pendiente = leerPendiente();
  if (pendiente?.correo) {
    correoActual = pendiente.correo;
    inputCorreo.value = pendiente.correo;
    verificacionService.establecerCorreo(pendiente.correo);
    verificacionController.prepararCorreo(
      pendiente.correo,
      pendiente.correoEnviado !== false,
      pendiente.enviadoEn || Date.now()
    );
    inputUsuarioCorregir.value = pendiente.usuario || "";
    inputCorreoNuevo.value = pendiente.correo || "";
    paso1.classList.remove("activa");
    paso2.classList.add("activa");
  }

  btnEnviarCorreo.addEventListener("click", async () => {
    if (enviando) return;
    const correo = inputCorreo.value.trim();

    if (correo === "") {
      notificador.mostrar("Escribe tu correo primero.", "error");
      return;
    }

    enviando = true;
    btnEnviarCorreo.disabled = true;
    try {
      const exito = await verificacionController.enviarCodigo(correo);
      if (!exito) return;

      correoActual = correo;
      paso1.classList.remove("activa");
      setTimeout(() => paso2.classList.add("activa"), 150);
    } finally {
      enviando = false;
      btnEnviarCorreo.disabled = false;
    }
  });

  btnReenviar.addEventListener("click", async () => {
    if (reenviando || !correoActual) return;
    reenviando = true;
    btnReenviar.setAttribute("aria-disabled", "true");
    btnReenviar.style.pointerEvents = "none";
    try {
      const exito = await verificacionController.enviarCodigo(correoActual);
      if (!exito) return;

      inputCodigo.value = "";
      inputCodigo.focus();
    } finally {
      reenviando = false;
      btnReenviar.removeAttribute("aria-disabled");
      btnReenviar.style.pointerEvents = "";
    }
  });

  btnMostrarCorregir.addEventListener("click", () => {
    const visible = formularioCorregir.style.display !== "none";
    formularioCorregir.style.display = visible ? "none" : "block";
    if (!visible) inputUsuarioCorregir.focus();
  });

  btnCorregirCorreo.addEventListener("click", async () => {
    if (corrigiendo) return;
    const usuario = inputUsuarioCorregir.value.trim();
    const password = inputPasswordCorregir.value;
    const correoNuevo = inputCorreoNuevo.value.trim();

    if (!usuario || !password || !correoNuevo) {
      notificador.mostrar("Completa usuario, contraseña y correo correcto.", "error");
      return;
    }

    corrigiendo = true;
    btnCorregirCorreo.disabled = true;
    try {
      const resultado = await verificacionService.cambiarCorreo({
        usuario,
        password,
        correoNuevo
      });
      const correoCorregido = resultado.correo || correoNuevo;
      correoActual = correoCorregido;
      inputCorreo.value = correoCorregido;
      verificacionService.establecerCorreo(correoCorregido);
      inputCodigo.value = "";
      inputPasswordCorregir.value = "";
      sessionStorage.setItem(CLAVE_PENDIENTE, JSON.stringify({
        usuario,
        correo: correoCorregido,
        correoEnviado: resultado.correoEnviado !== false,
        enviadoEn: Date.now()
      }));
      verificacionController.prepararCorreo(
        correoCorregido,
        resultado.correoEnviado !== false,
        Date.now()
      );
      formularioCorregir.style.display = "none";
      notificador.mostrar(
        resultado.aviso || "Correo corregido.",
        resultado.correoEnviado === false ? "error" : "exito"
      );
      inputCodigo.focus();
    } catch (error) {
      notificador.mostrar(error.message, "error");
    } finally {
      corrigiendo = false;
      btnCorregirCorreo.disabled = false;
    }
  });

  btnComprobarCodigo.addEventListener("click", async () => {
    if (comprobando) return;
    const codigo = inputCodigo.value.trim();

    if (codigo === "") {
      notificador.mostrar("Por favor, ingresa el código.", "error");
      return;
    }

    comprobando = true;
    btnComprobarCodigo.disabled = true;
    try {
      await verificacionController.manejarEnvio({ codigo });
    } finally {
      comprobando = false;
      btnComprobarCodigo.disabled = false;
    }
  });
});