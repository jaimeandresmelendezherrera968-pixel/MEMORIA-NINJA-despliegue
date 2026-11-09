/*=========================================================
  MEMORIA NINJA
  CAPA: NÚCLEO (Core) -> Interfaz / Contrato
  ARCHIVO: core/interfaces/ICodigoGenerador.js

  Contrato para cualquier estrategia de generación de códigos
  (de verificación de correo, de recuperación de contraseña,
  de un futuro código por SMS, etc).

  OCP: para soportar un nuevo tipo de código NO se modifica
  código existente, solo se agrega una nueva clase que
  implemente este contrato.

  LSP: cualquier implementación puede sustituir a otra en
  cualquier lugar donde se espere un ICodigoGenerador, sin
  romper nada (misma firma, mismo tipo de retorno).

  Polimorfismo: distintas clases implementan generar() con
  comportamientos distintos (alfanumérico vs. numérico).
=========================================================*/

export class ICodigoGenerador {
  constructor() {
    if (new.target === ICodigoGenerador) {
      throw new Error(
        "ICodigoGenerador es una interfaz y no se puede instanciar directamente."
      );
    }
  }

  /** @returns {string} */
  generar() {
    throw new Error("generar() debe ser implementado por la subclase.");
  }
}
