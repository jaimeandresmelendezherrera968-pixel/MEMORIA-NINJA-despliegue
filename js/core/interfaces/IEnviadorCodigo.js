/*=========================================================
  MEMORIA NINJA
  CAPA: NÚCLEO (Core) -> Interfaz / Contrato
  ARCHIVO: core/interfaces/IEnviadorCodigo.js

  OCP: abstrae "cómo se entrega un código al usuario". Hoy la
  única implementación es EnvioCodigoModoPrueba (lo muestra en
  pantalla porque no hay backend de correo). El día que exista
  un backend real, se crea EnvioCodigoPorCorreo implementando
  este mismo contrato y se cambia UNA línea en el composition
  root — ningún controlador se modifica.
=========================================================*/

export class IEnviadorCodigo {
  constructor() {
    if (new.target === IEnviadorCodigo) {
      throw new Error(
        "IEnviadorCodigo es una interfaz y no se puede instanciar directamente."
      );
    }
  }

  /**
   * @param {string} correo
   * @param {string} codigo
   */
  enviar(_correo, _codigo) {
    throw new Error("enviar() debe ser implementado por la subclase.");
  }
}
