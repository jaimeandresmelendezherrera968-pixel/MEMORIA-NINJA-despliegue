/*=========================================================
  MEMORIA NINJA
  CAPA: CONTROLADORES (presentación)
  ARCHIVO: controladores/FormularioControllerBase.js

  HERENCIA: clase abstracta de la que heredan todos los
  controladores de formularios (LoginController,
  RegistroController, etc.) — relación "ES-UN": un
  LoginController ES-UN FormularioControllerBase. Comparten
  comportamiento común (validaciones básicas, notificador) sin
  duplicar código.

  POLIMORFISMO: define un método "plantilla" manejarEnvio()
  que cada subclase implementa con su propio comportamiento.
  Todas responden al mismo mensaje, cada una a su manera.

  No se puede instanciar directamente (es abstracta), igual que
  las interfaces del core.
=========================================================*/

export class FormularioControllerBase {
  constructor(notificador) {
    if (new.target === FormularioControllerBase) {
      throw new Error(
        "FormularioControllerBase es abstracta y no se puede instanciar directamente."
      );
    }
    this.notificador = notificador;
  }

  camposVacios(...valores) {
    return valores.some((valor) => !valor || valor.trim() === "");
  }

  /**
   * Método que cada subclase concreta DEBE sobreescribir
   * (polimorfismo: mismo nombre, comportamiento distinto).
   */
  manejarEnvio() {
    throw new Error("manejarEnvio() debe implementarse en la subclase.");
  }
}
