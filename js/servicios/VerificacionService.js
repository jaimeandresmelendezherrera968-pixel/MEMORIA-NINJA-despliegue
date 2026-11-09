/*=========================================================
  MEMORIA NINJA
  CAPA: SERVICIOS (lógica de negocio)
  ARCHIVO: servicios/VerificacionService.js

  SRP: media entre la página de verificación y el módulo /api/auth
  REAL del backend. El código de verificación ya NO se genera en el
  navegador: lo genera y "envía" el servidor (MAILER=consola lo
  imprime en la consola del backend; MAILER=ethereal sí lo manda por
  correo). Esta clase solo orquesta las dos llamadas HTTP.

  DIP: recibe un repositorio de autenticación inyectado (cliente
  HttpAuthRepositorio). No sabe nada de fetch, ni de DOM, ni de cómo
  se entrega el código.
=========================================================*/

export class VerificacionService {
  #correoActual = "";

  /**
   * @param {import("../infraestructura/repositorios/HttpAuthRepositorio.js").HttpAuthRepositorio} repositorioAuth
   */
  constructor(repositorioAuth) {
    this.repositorioAuth = repositorioAuth;
  }

  /**
   * Pide al backend que cree (o reutilice) un código de verificación para
   * el correo y lo "envíe". El código es inválido para el navegador: es
   * solo para el correo de la persona.
   * @returns {Promise<string>} el correo al que se reenvió el código.
   */
  async enviarCodigo(correo) {
    await this.repositorioAuth.enviarCodigoVerificacion({ correo });
    this.#correoActual = correo;
    return this.#correoActual;
  }

  /**
   * Confirma el código contra el backend (fn_confirmar_codigo ACID: consume
   * el código y activa el correo del usuario, todo o nada).
   * @throws {Error} mensaje del servidor si el código no es válido.
   */
  async confirmarCodigo(codigo) {
    if (this.#correoActual === "") {
      throw new Error(
        'Tu código expiró. Pide uno nuevo con "Reenviar código".'
      );
    }

    await this.repositorioAuth.confirmarCodigoVerificacion({
      correo: this.#correoActual,
      codigo
    });
  }

  get correoActual() {
    return this.#correoActual;
  }
}