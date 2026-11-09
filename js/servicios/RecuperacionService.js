/*=========================================================
  MEMORIA NINJA
  CAPA: SERVICIOS (lógica de negocio)
  ARCHIVO: servicios/RecuperacionService.js

  SRP: coordina las reglas de negocio del flujo de recuperación de
  contraseña contra el módulo /api/auth REAL del backend: solicitar
  código, verificar código (sin consumirlo) y restablecer contraseña
  con el código como prueba de identidad.

  DIP: recibe un repositorio de autenticación inyectado (cliente
  HttpAuthRepositorio). No sabe nada de fetch ni de DOM.
=========================================================*/

export class RecuperacionService {
  #correoActual = "";
  #codigoActual = null;

  /**
   * @param {import("../infraestructura/repositorios/HttpAuthRepositorio.js").HttpAuthRepositorio} repositorioAuth
   */
  constructor(repositorioAuth) {
    this.repositorioAuth = repositorioAuth;
  }

  /** Pide al backend un código RECUPERACION para el correo. */
  async solicitarRecuperacion(correo) {
    await this.repositorioAuth.solicitarRecuperacion({ correo });
    this.#correoActual = correo;
  }

  /**
   * Valida el código contra el backend (código correcto y vigente).
   * No lo consume: el consumo real ocurre en restablecerPassword().
   */
  async verificarCodigo(codigo) {
    await this.repositorioAuth.verificarCodigoRecuperacion({
      correo: this.#correoActual,
      codigo
    });
    this.#codigoActual = codigo;
  }

  /**
   * Cambia la contraseña usando el código ya verificado. El backend lo
   * consume de forma atómica, revoca todas las sesiones e invalida los
   * códigos pendientes (sp_restablecer_password).
   */
  async cambiarPassword(nuevaPassword, confirmarPassword) {
    if (nuevaPassword !== confirmarPassword) {
      throw new Error("Las contraseñas no coinciden.");
    }

    await this.repositorioAuth.restablecerPassword({
      correo: this.#correoActual,
      codigo: this.#codigoActual,
      nuevaPassword
    });
  }
}