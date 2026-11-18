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

const DURACION_CODIGO = 600; // segundos

export class VerificacionController extends FormularioControllerBase {
  #intervaloId = null;
  #segundosRestantes = DURACION_CODIGO;
  #ocupado = false;

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

  prepararCorreo(correo, correoEnviado = true, enviadoEn = Date.now()) {
    this.elementos.textoEnviado.textContent = `Enviamos un código a ${this.enmascararCorreo(correo)}`;

    if (!correoEnviado) {
      clearInterval(this.#intervaloId);
      this.elementos.temporizador.textContent = "No pudimos enviarte el correo. Usa Reenviar código.";
      this.elementos.reenviarBox.style.display = "block";
      return;
    }

    const restante = Math.max(
      1,
      DURACION_CODIGO - Math.floor((Date.now() - enviadoEn) / 1000)
    );
    this.#iniciarTemporizador(restante);
  }

  /**
   * Pide el código al backend y, si el envío es exitoso, pone en marcha
   * el temporizador de expiración.
   * @returns {Promise<boolean>}
   */
  async enviarCodigo(correo) {
    if (this.#ocupado) return false;
    this.#ocupado = true;
    try {
      await this.verificacionService.enviarCodigo(correo);
      this.elementos.textoEnviado.textContent = `Enviamos un código a ${this.enmascararCorreo(correo)}`;
      this.#iniciarTemporizador();
      return true;
    } catch (error) {
      this.notificador.mostrar(error.message, "error");
      return false;
    } finally {
      this.#ocupado = false;
    }
  }

  #iniciarTemporizador(segundos = DURACION_CODIGO) {
    clearInterval(this.#intervaloId);
    this.#segundosRestantes = segundos;
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
    if (this.#ocupado) return;
    const { codigo } = datos;

    this.#ocupado = true;
    try {
      await this.verificacionService.confirmarCodigo(codigo);
      clearInterval(this.#intervaloId);
      this.elementos.limpiarPendiente?.();

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
    } finally {
      this.#ocupado = false;
    }
  }
}