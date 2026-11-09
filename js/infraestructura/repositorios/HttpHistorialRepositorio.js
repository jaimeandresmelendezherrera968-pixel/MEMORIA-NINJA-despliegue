/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Repositorio
  ARCHIVO: infraestructura/repositorios/HttpHistorialRepositorio.js

  Historial de partidas contra el backend (tabla SQLite
  `historial_partidas`, 100% relacional).

  Los juegos (pares, uzumaki, muerte...) siguen guardando su copia
  local en localStorage (offline), pero ADEMÁS envían el resultado
  al servidor cuando hay una sesión activa. El menú lee PRIMERO del
  backend y solo cae a localStorage si no hay sesión o el servidor
  no responde.

  USO EN SCRIPTS CLÁSICOS (no-module):
  const { historialApi } = await import(
    "./js/infraestructura/repositorios/HttpHistorialRepositorio.js"
  );
=========================================================*/

// Ruta RELATIVA (mismo origen): funciona servido desde cualquier host/puerto,
// no solo desde localhost:3000. El backend sirve el frontend en el mismo origen.
const URL_BASE = "/api";

/** Cola local de resultados pendientes (sub-parte 3.5: merge invitado→cuenta). */
export const CLAVE_COLA_PENDIENTE = "historialPendiente";
const TOPE_COLA = 200;

export class HttpHistorialRepositorio {
  /**
   * Lee la sesión activa y devuelve el id del usuario (el que asigna
   * el backend en SQLite). Usuarios viejos de localStorage no tienen id.
   */
  #idDeSesionActiva() {
    try {
      const sesion = JSON.parse(localStorage.getItem("usuarioActivo"));
      return sesion && sesion.id ? sesion.id : null;
    } catch {
      return null;
    }
  }

  /**
   * Guarda el resultado en la cola local para subirlo después (al iniciar
   * sesión). Dedup por idPartida y tope de la cola; nunca lanza.
   */
  #encolarPendiente(registro) {
    try {
      const cola = JSON.parse(localStorage.getItem(CLAVE_COLA_PENDIENTE)) || [];
      if (!Array.isArray(cola)) return;
      if (
        registro.idPartida &&
        cola.some((item) => item.idPartida === registro.idPartida)
      ) {
        return;
      }
      cola.push({ ...registro, guardadoEn: new Date().toISOString() });
      localStorage.setItem(
        CLAVE_COLA_PENDIENTE,
        JSON.stringify(cola.slice(-TOPE_COLA))
      );
    } catch {
      // storage lleno/bloqueado: el resultado se descarta, el juego sigue.
    }
  }

  async obtener(idUsuario) {
    const respuesta = await fetch(
      `${URL_BASE}/usuarios/${encodeURIComponent(idUsuario)}/historial`
    );
    const cuerpo = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      throw new Error(cuerpo.error || "No se pudo leer el historial.");
    }
    return cuerpo.historial || [];
  }

  /**
   * Envía el resultado de una partida al servidor. Es BEST-EFFORT para
   * nunca bloquear el juego: si no hay sesión activa o el backend no
   * responde, el resultado queda en la cola local `historialPendiente`
   * y se sube al iniciar sesión (sub-parte 3.5 — merge invitado→cuenta).
   */
  async guardar({ zona, puntaje, modo, ganador, idPartida }) {
    const registro = { zona, puntaje, modo, ganador, idPartida };
    const idUsuario = this.#idDeSesionActiva();
    if (!idUsuario) {
      this.#encolarPendiente(registro);
      return { enviado: false, encolado: true };
    }

    try {
      const respuesta = await fetch(
        `${URL_BASE}/usuarios/${encodeURIComponent(idUsuario)}/historial`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(registro)
        }
      );
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        this.#encolarPendiente(registro);
      }
      return { enviado: respuesta.ok, error: cuerpo.error };
    } catch {
      this.#encolarPendiente(registro);
      return { enviado: false, error: "servidor no disponible", encolado: true };
    }
  }
}

/** Instancia compartida (evita crear una conexión por juego). */
export const historialApi = new HttpHistorialRepositorio();