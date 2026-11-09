/*=========================================================
  MEMORIA NINJA
  CAPA: NÚCLEO (Core) -> Interfaz / Contrato
  ARCHIVO: core/interfaces/IUsuarioLector.js

  ISP (corrección): antes existía una única IUsuarioRepositorio
  que mezclaba lectura y escritura. Un servicio de solo lectura
  (AutenticacionService) estaba obligado a depender de un
  contrato con métodos que nunca usa (guardar, actualizar).

  Ahora el contrato de LECTURA vive separado del de ESCRITURA
  (ver IUsuarioEscritor.js). Cada servicio depende solo de lo
  que realmente necesita.
=========================================================*/

export class IUsuarioLector {
  constructor() {
    if (new.target === IUsuarioLector) {
      throw new Error(
        "IUsuarioLector es una interfaz y no se puede instanciar directamente."
      );
    }
  }

  obtenerTodos() {
    throw new Error("obtenerTodos() debe ser implementado por la subclase.");
  }

  buscarPorCorreo(_correo) {
    throw new Error("buscarPorCorreo() debe ser implementado por la subclase.");
  }

  buscarPorCredenciales(_usuario, _password) {
    throw new Error(
      "buscarPorCredenciales() debe ser implementado por la subclase."
    );
  }
}
