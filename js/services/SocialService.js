import { clienteMultijugador } from "../multijugador/ClienteMultijugador.js";
import { AmistadService } from "./AmistadService.js";
import { notificacionesToast } from "../ui/NotificacionesToast.js";

class SocialService {
  constructor() {
    this.iniciado = false;
    this.conectando = null;
    this.oyentesRegistrados = false;
    this.presencia = new Map();
    this.amistadService = new AmistadService();
  }

  iniciar() {
    if (this.iniciado) return;
    this.iniciado = true;
    this.#inyectarEstilos();
    window.addEventListener("sesion:cambiada", (evento) => {
      if (evento.detail?.estado === "activa") this.conectar();
    });
    if (window.SesionNinja?.esActiva?.()) this.conectar();
  }

  #inyectarEstilos() {
    if (document.getElementById("estilosSociales")) return;
    const enlace = document.createElement("link");
    enlace.id = "estilosSociales";
    enlace.rel = "stylesheet";
    enlace.href = new URL("./css/social.css", document.baseURI).href;
    document.head.appendChild(enlace);
  }

  conectar() {
    if (!window.SesionNinja?.esActiva?.()) return Promise.resolve(false);
    if (this.conectando) return this.conectando;
    this.conectando = clienteMultijugador.conectar()
      .then(() => {
        if (!this.oyentesRegistrados) {
          this.#registrarOyentes();
          this.oyentesRegistrados = true;
        }
        return true;
      })
      .catch(() => false)
      .finally(() => {
        this.conectando = null;
      });
    return this.conectando;
  }

  #avisarCambios() {
    window.dispatchEvent(new CustomEvent("amigos:cambios"));
  }

  #registrarOyentes() {
    clienteMultijugador.on("amigos:solicitud-recibida", (datos) => {
      const nombre = datos?.emisor?.usuario || "Un ninja";
      notificacionesToast.mostrar({
        titulo: "Solicitud de amistad",
        mensaje: `${nombre} quiere ser tu amigo.`,
        tipo: "verde",
        acciones: [
          {
            etiqueta: "Aceptar",
            estilo: "primario",
            accion: async () => {
              await this.amistadService.aceptarSolicitud(datos?.id);
              this.#avisarCambios();
            },
          },
          {
            etiqueta: "Rechazar",
            estilo: "secundario",
            accion: async () => {
              await this.amistadService.rechazarSolicitud(datos?.id);
              this.#avisarCambios();
            },
          },
        ],
      });
      this.#avisarCambios();
    });

    clienteMultijugador.on("amigos:invitacion-recibida", (datos) => {
      const nombre = datos?.emisor?.usuario || "Un amigo";
      notificacionesToast.mostrar({
        titulo: "Invitación a una partida",
        mensaje: `${nombre} te invitó a jugar.`,
        tipo: "morado",
        acciones: [
          {
            etiqueta: "Unirme",
            estilo: "primario",
            accion: async () => {
              const respuesta = await clienteMultijugador.responderInvitacion(datos?.id, true);
              if (!respuesta?.exito) throw new Error(respuesta?.error || "No se pudo unir a la sala.");
              const url = new URL("./game-online.html", document.baseURI);
              url.searchParams.set("codigo", String(respuesta.codigoSala || datos?.codigoSala || ""));
              window.location.href = url.href;
            },
          },
          {
            etiqueta: "Rechazar",
            estilo: "secundario",
            accion: async () => {
              const respuesta = await clienteMultijugador.responderInvitacion(datos?.id, false);
              if (!respuesta?.exito) throw new Error(respuesta?.error || "No se pudo rechazar la invitación.");
            },
          },
        ],
      });
    });

    clienteMultijugador.on("amigos:presencia", (datos) => {
      if (!datos?.idUsuario) return;
      this.presencia.set(String(datos.idUsuario), datos.estado === "online" ? "online" : "offline");
      window.dispatchEvent(new CustomEvent("amigos:presencia-actualizada", { detail: datos }));
    });

    clienteMultijugador.on("amigos:presencia-snapshot", (datos) => {
      for (const [id, estado] of Object.entries(datos || {})) {
        this.presencia.set(String(id), estado === "online" ? "online" : "offline");
      }
      window.dispatchEvent(new CustomEvent("amigos:presencia-actualizada", { detail: datos }));
    });

    for (const evento of [
      "amigos:solicitud-respondida",
      "amigos:solicitud-cancelada",
      "amigos:amistad-eliminada",
      "amigos:perfil-actualizado",
      "amigos:invitacion-aceptada",
      "amigos:invitacion-rechazada",
      "amigos:invitacion-cancelada",
      "amigos:invitacion-expirada",
    ]) {
      clienteMultijugador.on(evento, () => this.#avisarCambios());
    }
  }

  estadoPresencia(idUsuario) {
    return this.presencia.get(String(idUsuario)) || "offline";
  }
}

export const socialService = new SocialService();
