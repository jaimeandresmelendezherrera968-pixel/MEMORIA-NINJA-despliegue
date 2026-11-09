/*=========================================================
  MEMORIA NINJA
  CAPA: CONTROLADORES (presentación)
  ARCHIVO: controladores/VerificacionController.js

  Orquesta el flujo de verificación de correo: usa VerificacionService
  para la lógica (que a su vez habla con /api/auth). Aquí solo viven el
  temporizador en pantalla, el enmascarado de correo y la navegación.

  POLIMORFISMO / LSP: manejarEnvio(datos) — misma firma que el resto
  de controladores.
=========================================================*/

import { FormularioControllerBase } from "./FormularioControllerBase.js";

const DURACION_CODIGO = 60; // segundos

export class VerificacionController extends FormularioControllerBase {
  #intervaloId = null;
  #segundosRestantes = DURACION_CODIGO;

  /**
   * @param {import("../servicios/VerificacionService.js").VerificacionService} verificacionService
   * @param {import("../core/interfaces/INotificador.js").INotificador} notificador
   * @param {object} elementos referencias a nodos del DOM (composition root)
   */
  constructor(verificacionService, notificador, elementos) {
    super(notificador);
    this.verificacionService = verificacionService;
    this.elementos = elementos;
  }

  enmascararCorreo(correo) {
    const [usuario, dominio] = correo.split("@");
    if (!dominio) return correo;
    const visible = usuario.slice(0, 2);
    return `${visible}${"•".repeat(Math.max(usuario.length - 2, 2))}@${dominio}`;
  }

  /**
   * Pide el código al backend y, si el envío es exitoso, pone en marcha
   * el temporizador de expiración.
   * @returns {Promise<boolean>}
   */
  async enviarCodigo(correo) {
    try {
      await this.verificacionService.enviarCodigo(correo);
      this.elementos.textoEnviado.textContent = `Enviamos un código a ${this.enmascararCorreo(correo)}`;
      this.#iniciarTemporizador();
      return true;
    } catch (error) {
      this.notificador.mostrar(error.message, "error");
      return false;
    }
  }

  #iniciarTemporizador() {
    clearInterval(this.#intervaloId);
    this.#segundosRestantes = DURACION_CODIGO;
    this.elementos.reenviarBox.style.display = "none";
    this.#actualizarTemporizadorTexto();

    this.#intervaloId = setInterval(() => {
      this.#segundosRestantes--;
      this.#actualizarTemporizadorTexto();

      if (this.#segundosRestantes <= 0) {
        clearInterval(this.#intervaloId);
        this.elementos.temporizador.textContent = "Tu código expiró.";
        this.elementos.reenviarBox.style.display = "block";
      }
    }, 1000);
  }

  #actualizarTemporizadorTexto() {
    this.elementos.temporizador.textContent = `El código expira en ${this.#segundosRestantes}s`;
  }

  /**
   * @param {{ codigo: string }} datos
   */
  async manejarEnvio(datos) {
    const { codigo } = datos;

    try {
      await this.verificacionService.confirmarCodigo(codigo);
      clearInterval(this.#intervaloId);

      this.elementos.btnComprobarCodigo.style.display = "none";
      this.elementos.inputCodigo.disabled = true;
      this.elementos.contenedorCarga.style.display = "block";

      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } catch (error) {
      this.notificador.mostrar(error.message, "error");
      this.elementos.inputCodigo.value = "";
      this.elementos.inputCodigo.focus();
    }
  }
}