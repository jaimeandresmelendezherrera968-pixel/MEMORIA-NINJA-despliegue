/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Repositorio
  ARCHIVO: infraestructura/repositorios/HttpAuthRepositorio.js

  Cliente HTTP del módulo de autenticación REAL del backend
  (/api/auth). Es el reemplazo del modo de prueba local:

    verificacion.js   -> /auth/verificacion/enviar|confirmar
    recuperar.js      -> /auth/recuperacion/solicitar|verificar|restablecer

  La sesión NO vive aquí: el servidor la guarda en una cookie
  httpOnly (memoria_ninja_sesion), por eso TODAS las peticiones
  viajan con credentials: "include" (mismo origen). Si el backend
  no está alcanzable se lanza ErrorDeConexion (igual que en
  HttpUsuarioRepositorio); cualquier otra respuesta no-2xx se
  traduce al error de NEGOCIO que el servidor mandó en body.error.
=========================================================*/

const URL_BASE = "/api";

/** Error TIPADO para distinguir "el backend no está arriba" de un error de negocio. */
export class ErrorDeConexion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ErrorDeConexion";
  }
}

export class HttpAuthRepositorio {
  /**
   * Centraliza el fetch + manejo de errores. Misma cookie de sesión
   * en cada llamada (credentials: "include").
   * @throws {ErrorDeConexion} si el servidor no responde.
   */
  async #peticion(ruta, opciones = {}) {
    let respuesta;
    try {
      respuesta = await fetch(`${URL_BASE}${ruta}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...opciones,
        headers: {
          "Content-Type": "application/json",
          ...(opciones.headers || {})
        }
      });
    } catch {
      throw new ErrorDeConexion(
        "No se pudo conectar con el servidor. Verifica que el backend esté corriendo."
      );
    }

    const cuerpo = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(cuerpo.error || "Error del servidor.");
    }
    return cuerpo;
  }

  async enviarCodigoVerificacion({ correo }) {
    return this.#peticion("/auth/verificacion/enviar", {
      body: JSON.stringify({ correo })
    });
  }

  async confirmarCodigoVerificacion({ correo, codigo }) {
    return this.#peticion("/auth/verificacion/confirmar", {
      body: JSON.stringify({ correo, codigo })
    });
  }

  async solicitarRecuperacion({ correo }) {
    return this.#peticion("/auth/recuperacion/solicitar", {
      body: JSON.stringify({ correo })
    });
  }

  async verificarCodigoRecuperacion({ correo, codigo }) {
    return this.#peticion("/auth/recuperacion/verificar", {
      body: JSON.stringify({ correo, codigo })
    });
  }

  async restablecerPassword({ correo, codigo, nuevaPassword }) {
    return this.#peticion("/auth/recuperacion/restablecer", {
      body: JSON.stringify({ correo, codigo, nuevaPassword })
    });
  }
}