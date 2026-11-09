/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Repositorio
  ARCHIVO: infraestructura/repositorios/HttpPerfilRepositorio.js

  Implementa IPerfilRepositorio contra el backend REAL:
  GET  /api/usuarios/:id/perfil          -> leer el progreso
  POST /api/usuarios/:id/perfil          -> cerrar una partida y
                                            devolver el perfil ya
                                            actualizado (la regla de
                                            XP vive en el servidor)

  >>> GRACEFUL DEGRADATION <<<
  Si el backend no responde (ErrorDeConexion) el compuesto con
  respaldo cae a localStorage. Si el servidor contesta 404
  ("esa cuenta no existe aquí") devolvemos null: pasa cuando la
  cuenta se creó con el backend apagado, y el respaldo local tiene
  los datos.
=========================================================*/

import { IPerfilRepositorio } from "../../domain/IPerfilRepositorio.js";
import { ErrorDeConexion } from "./HttpUsuarioRepositorio.js";

// Ruta RELATIVA (mismo origen): funciona servido desde cualquier host/puerto,
// no solo desde localhost:3000. El backend sirve el frontend en el mismo origen.
const URL_BASE = "/api";

export class HttpPerfilRepositorio extends IPerfilRepositorio {
  async #peticion(ruta, opciones = {}) {
    let respuesta;
    try {
      respuesta = await fetch(`${URL_BASE}${ruta}`, {
        headers: { "Content-Type": "application/json" },
        ...opciones,
      });
    } catch {
      throw new ErrorDeConexion(
        "No se pudo conectar con el servidor de datos. Verifica que el backend esté corriendo."
      );
    }

    const cuerpo = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      // 404 = la cuenta no está en la base del servidor (todavía).
      if (respuesta.status === 404) return null;
      throw new Error(cuerpo.error || "Error del servidor.");
    }
    return cuerpo;
  }

  async obtener(idUsuario) {
    const cuerpo = await this.#peticion(
      `/usuarios/${encodeURIComponent(idUsuario)}/perfil`
    );
    return cuerpo ? cuerpo.perfil || null : null;
  }

  async registrarFinPartida(idUsuario, { victoria, puntaje }) {
    const cuerpo = await this.#peticion(
      `/usuarios/${encodeURIComponent(idUsuario)}/perfil`,
      {
        method: "POST",
        body: JSON.stringify({ victoria, puntaje }),
      }
    );
    return cuerpo.perfil;
  }
}
