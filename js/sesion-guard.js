/*=========================================================
  MEMORIA NINJA
  SESIÓN — GUARD DEL CLIENTE (script clásico, sin imports)

  Qué hace:
   - consulta GET /api/auth/me (cookie httpOnly, mismo origen),
   - refresca la copia local del usuario (localStorage "usuarioActivo")
     con los datos REALES del servidor,
   - marca el estado de sesión en localStorage "estadoSesion":
       "activa"   -> sesión válida (200)
       "invitado" -> online pero sin sesión (401)
       "offline"  -> el servidor no respondió (red caída/apagado)
   - NO redirige nunca: el juego es jugable como invitado/offline.

  El menú usa window.SesionNinja para limitar perfil/ranking/historial
  en modo invitado y para el logout REAL (POST /api/auth/logout).
=========================================================*/
(function () {
  "use strict";

  // Si la página se abrió como archivo local (file://), las llamadas a /api
  // no pueden funcionar. Redirigimos al mismo archivo servido por el backend.
  if (window.location.protocol === "file:") {
    var archivo = window.location.pathname.split("/").pop() || "login.html";
    window.location.replace(
      "http://localhost:3000/" + archivo + window.location.search + window.location.hash
    );
    return;
  }

  var CLAVE_SESION = "usuarioActivo";
  var CLAVE_ESTADO = "estadoSesion";
  var DURACION_AVISO_MS = 10000;
  var temporizadorAviso = null;

  function leerEstado() {
    try {
      return localStorage.getItem(CLAVE_ESTADO) || "desconocido";
    } catch (e) {
      return "desconocido";
    }
  }

  function cancelarTemporizadorAviso() {
    if (temporizadorAviso !== null) {
      window.clearTimeout(temporizadorAviso);
      temporizadorAviso = null;
    }
  }

  function programarOcultarAviso(aviso) {
    cancelarTemporizadorAviso();
    temporizadorAviso = window.setTimeout(function () {
      aviso.hidden = true;
      temporizadorAviso = null;
    }, DURACION_AVISO_MS);
  }

  function actualizarAviso() {
    var aviso = document.getElementById("avisoInvitado");
    if (!aviso) return;
    if (leerEstado() === "activa") {
      aviso.hidden = true;
      cancelarTemporizadorAviso();
      return;
    }
    aviso.hidden = false;
    programarOcultarAviso(aviso);
  }

  function marcar(estado) {
    try {
      localStorage.setItem(CLAVE_ESTADO, estado);
    } catch (e) {}
    document.documentElement.setAttribute("data-sesion", estado);
    window.dispatchEvent(new CustomEvent("sesion:cambiada", { detail: { estado: estado } }));
    actualizarAviso();
  }

  async function comprobar() {
    try {
      var respuesta = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (respuesta.ok) {
        var cuerpo = await respuesta.json().catch(function () {
          return {};
        });
        if (cuerpo && cuerpo.usuario) {
          try {
            localStorage.setItem(CLAVE_SESION, JSON.stringify(cuerpo.usuario));
          } catch (e) {}
        }
        marcar("activa");
        return;
      }

      if (respuesta.status === 401) {
        marcar("invitado");
        return;
      }
      marcar("offline");
    } catch (e) {
      marcar("offline");
    }
  }

  window.SesionNinja = {
    CLAVE_SESION: CLAVE_SESION,
    CLAVE_ESTADO: CLAVE_ESTADO,
    estadoActual: leerEstado,
    esActiva: function () {
      return leerEstado() === "activa";
    },
    /** Muestra/realza el cartel de invitado con un motivo concreto. */
    avisarInvitado: function (motivo) {
      var aviso = document.getElementById("avisoInvitado");
      var texto = document.getElementById("avisoInvitadoTexto");
      if (texto && motivo) texto.textContent = "Inicia sesión para " + motivo + ".";
      if (!aviso) {
        window.location.href = "login.html";
        return;
      }
      aviso.hidden = false;
      programarOcultarAviso(aviso);
      aviso.classList.remove("aviso-pulso");
      void aviso.offsetWidth;
      aviso.classList.add("aviso-pulso");
      aviso.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    /** Logout REAL: revoca la cookie en el servidor y limpia la copia local. */
    cerrarSesion: async function () {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch (e) {}
      try {
        localStorage.removeItem(CLAVE_SESION);
        localStorage.removeItem(CLAVE_ESTADO);
      } catch (e) {}
      window.location.href = "login.html";
    },
  };

  document.addEventListener("DOMContentLoaded", actualizarAviso);
  comprobar();
})();
