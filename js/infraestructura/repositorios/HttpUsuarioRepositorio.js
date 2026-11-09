/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Repositorio
  ARCHIVO: infraestructura/repositorios/HttpUsuarioRepositorio.js

  Implementa AMBAS interfaces (IUsuarioLector + IUsuarioEscritor)
  pero con el backend REAL detrás: cada método es un fetch a la
  API Node/Express que a su vez habla con PostgreSQL. El LOGIN y el
  REGISTRO pasan por el módulo /api/auth (cookie de sesión httpOnly).

  Este es el reemplazo moderno de LocalStorageUsuarioRepositorio:
  los usuarios ya no viven en el navegador, viven en la base de
  datos del servidor. En el diagrama de la sustentación esto es la
  prueba de que el patrón de repositorios de la Fase 1 servía para
  esto: el Service (AutenticacionService/RegistroService) recibe la
  MISMA abstracción de siempre y no se entera del cambio.

  NOTA SOBRE ASINCRONÍA:
  fetch es asíncrono, así que estos métodos devuelven Promesas.
  Por eso AutenticacionService/RegistroService y los controladores
  de login/registro pasaron a ser async. Es el costo real de
  desacoplar los datos del documento.
=========================================================*/

import { IUsuarioLector } from "../../core/interfaces/IUsuarioLector.js";
import { Usuario } from "../../core/entities/Usuario.js";

const URL_BASE = "/api";

/**
 * Error TIPADO para distinguir "el backend no está alcanzable" (caída de
 * red / servidor apagado) de los errores de NEGOCIO que el servidor sí
 * devolvió (usuario duplicado, contraseña incorrecta, etc.). Es lo que
 * usa RepositorioUsuariosConRespaldo para decidir cuándo caer al
 * localStorage sin falsear un error real del servidor.
 */
export class ErrorDeConexion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ErrorDeConexion";
  }
}

/** @implements {import("../../core/interfaces/IUsuarioEscritor.js").IUsuarioEscritor} */
export class HttpUsuarioRepositorio extends IUsuarioLector {
  /**
   * Centraliza el fetch + manejo de errores.
   * @returns {Promise<object>} el body JSON de respuesta.
   * @throws {ErrorDeConexion} cuando el backend no responde (no es un
   *         error de negocio: el servidor simplemente no estaba arriba).
   */
  async #peticion(ruta, opciones = {}) {
    let respuesta;
    try {
      respuesta = await fetch(`${URL_BASE}${ruta}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...opciones
      });
    } catch {
      throw new ErrorDeConexion(
        "No se pudo conectar con el servidor de datos. Verifica que el backend esté corriendo."
      );
    }

    const cuerpo = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(cuerpo.error || "Error del servidor.");
    }
    return cuerpo;
  }

  #aEntidad(props) {
    if (!props) return null;
    return new Usuario({
      id: props.id,
      usuario: props.usuario,
      nacimiento: props.nacimiento,
      correo: props.correo,
      pass: null // la verificación de contraseña ya la hizo el backend
    });
  }

  async obtenerTodos() {
    const { usuarios } = await this.#peticion("/usuarios");
    return usuarios.map((props) => this.#aEntidad(props)).filter(Boolean);
  }

  async buscarPorCorreo(correo) {
    const { usuario } = await this.#peticion(
      `/usuarios/por-correo/${encodeURIComponent(correo)}`
    );
    return this.#aEntidad(usuario);
  }

  async buscarPorCredenciales(usuario, password) {
    // Login REAL: valida credenciales en el backend, y si son válidas el
    // servidor responde la entidad pública del usuario además de fijar la
    // cookie httpOnly de sesión. Cualquier fallo (401 credenciales, 403
    // correo sin verificar, 423 cuenta bloqueada) se propaga con el mensaje
    // que el servidor envió en body.error.
    const cuerpo = await this.#peticion("/auth/login", {
      method: "POST",
      body: JSON.stringify({ usuario, password })
    });
    return this.#aEntidad(cuerpo.usuario);
  }

  async guardar(usuario) {
    // Registro REAL vía /api/auth: el backend crea la cuenta DESACTIVADA
    // y le envía un código de verificación al correo (MAILER=consola lo
    // imprime en la consola del servidor). La cuenta solo podrá iniciar
    // sesión después de confirmar ese código en verificacion.html.
    const datos = usuario.toJSON();
    await this.#peticion("/auth/registro", {
      method: "POST",
      body: JSON.stringify({
        usuario: datos.usuario,
        correo: datos.correo,
        nacimiento: datos.nacimiento,
        password: datos.pass
      })
    });
  }

  async actualizar(usuarioActualizado) {
    throw new Error(
      "actualizar() no está disponible por HTTP todavía. Usa la API de registro o el backend directamente."
    );
  }
}