/*=========================================================
  MEMORIA NINJA
  CAPA: SERVICIOS
  ARCHIVO: services/SincronizacionInvitadoService.js

  SUB-PARTE 3.5 — Merge invitado→cuenta.

  Cuando alguien jugó como invitado/offline, los resultados quedaron
  en la cola local `historialPendiente` (HttpHistorialRepositorio) y
  el XP en `perfil:invitado`. Al iniciar sesión, ESTE servicio sube
  ambas cosas a la cuenta real vía POST /api/usuarios/:id/importar
  y limpia las claves locales SOLO si el servidor confirmó.

  >>> BEST-EFFORT <<<
  Nunca lanza ni bloquea el login: si la red o el servidor fallan,
  la cola queda intacta y se reintenta en el próximo inicio de sesión.
=========================================================*/

import { CLAVE_COLA_PENDIENTE } from "../infraestructura/repositorios/HttpHistorialRepositorio.js";

const URL_BASE = "/api";
const CLAVE_PERFIL_INVITADO = "perfil:invitado";

export class SincronizacionInvitadoService {
  constructor() {
    this.sincronizando = false;
    this.registrarEventosOnline();
    if (typeof navigator === "undefined" || navigator.onLine !== false) {
      this.sincronizarAutomatico();
    }
  }

  notificar(detalle) {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(new CustomEvent("sincronizacion-invitado", { detail }));
  }

  registrarEventosOnline() {
    if (typeof window === 'undefined') return;
    window.addEventListener('online', () => {
      this.sincronizarAutomatico();
    });
  }

  async sincronizarAutomatico() {
    if (this.sincronizando) return;
    const sesion = window.SesionNinja;
    const estado = sesion?.estadoActual?.();
    if (estado !== 'activa') return;
    
    const usuarioActivo = localStorage.getItem('usuarioActivo');
    if (!usuarioActivo) return;
    
    try {
      const usuario = JSON.parse(usuarioActivo);
      if (usuario?.id) {
        await this.sincronizar(usuario.id);
      }
    } catch {}
  }

  /**
   * @param {string} idUsuario cuenta recién iniciada (el backend valida
   *        que la cookie de sesión le pertenezca).
   * @returns {Promise<object>} nunca lanza.
   */
  async sincronizar(idUsuario) {
    if (this.sincronizando) return { sincronizado: false, motivo: "ya_sincronizando" };
    if (!idUsuario) return { sincronizado: false, motivo: "sin_usuario" };

    this.sincronizando = true;
    this.notificar({ estado: "sincronizando" });
    let cola = [];
    let perfil = null;
    try {
      cola = JSON.parse(localStorage.getItem(CLAVE_COLA_PENDIENTE)) || [];
      perfil = JSON.parse(localStorage.getItem(CLAVE_PERFIL_INVITADO));
    } catch {
      this.sincronizando = false;
      this.notificar({ estado: "error", motivo: "datos_locales_corruptos" });
      return { sincronizado: false, motivo: "datos_locales_corruptos" };
    }
    if (!Array.isArray(cola)) cola = [];
 
    if (cola.length === 0 && !perfil) {
      this.sincronizando = false;
      this.notificar({ estado: "nada" });
      return { sincronizado: true, nada_que_importar: true };
    }

    try {
      const respuesta = await fetch(
        `${URL_BASE}/usuarios/${encodeURIComponent(idUsuario)}/importar`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ historial: cola, perfil })
        }
      );
      if (!respuesta.ok) {
        this.sincronizando = false;
        this.notificar({ estado: "error", motivo: "servidor_rechazo" });
        return { sincronizado: false, motivo: "servidor_rechazo" };
      }

      const cuerpo = await respuesta.json().catch(() => ({}));
      localStorage.removeItem(CLAVE_COLA_PENDIENTE);
      localStorage.removeItem(CLAVE_PERFIL_INVITADO);
      this.sincronizando = false;
      this.notificar({
        estado: "ok",
        importados: cuerpo.importados ?? 0,
        omitidos: cuerpo.omitidos ?? 0
      });
      return {
        sincronizado: true,
        importados: cuerpo.importados ?? 0,
        omitidos: cuerpo.omitidos ?? 0
      };
    } catch {
      this.sincronizando = false;
      this.notificar({ estado: "error", motivo: "sin_conexion" });
      return { sincronizado: false, motivo: "sin_conexion" };
    }
  }
}

export function instalarAvisoSincronizacion() {
  if (typeof window === "undefined" || window.__avisoSincronizacionInstalado) return;
  window.__avisoSincronizacionInstalado = true;

  window.addEventListener("sincronizacion-invitado", (evento) => {
    const detalle = evento.detail || {};
    if (detalle.estado === "nada") return;

    let aviso = document.getElementById("avisoSincronizacion");
    if (!aviso) {
      aviso = document.createElement("div");
      aviso.id = "avisoSincronizacion";
      aviso.setAttribute("role", "status");
      aviso.setAttribute("aria-live", "polite");
      Object.assign(aviso.style, {
        position: "fixed",
        right: "18px",
        bottom: "18px",
        zIndex: "9999",
        maxWidth: "min(360px, calc(100vw - 36px))",
        padding: "12px 16px",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.25)",
        background: "rgba(18,18,28,0.94)",
        color: "#fff",
        font: "600 14px/1.4 system-ui, sans-serif",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        opacity: "0",
        transform: "translateY(10px)",
        transition: "opacity .2s ease, transform .2s ease",
        pointerEvents: "none"
      });
      document.body.appendChild(aviso);
    }

    const textos = {
      sincronizando: "Sincronizando partidas guardadas…",
      ok: detalle.importados > 0
        ? `Partidas recuperadas: ${detalle.importados}${detalle.omitidos ? ` (${detalle.omitidos} ya estaban)` : ""}`
        : "Progreso sincronizado.",
      error: "No se pudo sincronizar ahora. Se reintentará al volver a entrar."
    };
    aviso.textContent = textos[detalle.estado] || "Estado de sincronización actualizado.";
    aviso.dataset.estado = detalle.estado;
    if (detalle.estado === "error") aviso.style.background = "rgba(96,20,28,0.96)";
    else if (detalle.estado === "ok") aviso.style.background = "rgba(18,72,48,0.96)";
    else aviso.style.background = "rgba(18,18,28,0.94)";

    requestAnimationFrame(() => {
      aviso.style.opacity = "1";
      aviso.style.transform = "translateY(0)";
    });
    clearTimeout(window.__timerAvisoSincronizacion);
    window.__timerAvisoSincronizacion = setTimeout(() => {
      aviso.style.opacity = "0";
      aviso.style.transform = "translateY(10px)";
    }, 4500);
  });
}

/** Instancia compartida: el login y el guard usan la misma. */
export const sincronizacionInvitado = new SincronizacionInvitadoService();
