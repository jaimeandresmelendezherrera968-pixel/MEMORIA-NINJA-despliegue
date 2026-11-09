/*=========================================================
  MEMORIA NINJA
  CAPA: SERVICIOS (lógica de negocio)
  ARCHIVO: servicios/AutenticacionService.js

  SRP: esta clase tiene UNA sola responsabilidad, validar
  credenciales de inicio de sesión. No sabe nada de DOM,
  localStorage directamente, ni de cómo se muestran mensajes.

  DIP: recibe un IUsuarioLector por constructor (inyección de
  dependencias). No hace "new LocalStorageUsuarioRepositorio()"
  internamente, así que no depende de una implementación
  concreta, sino de la abstracción.

  ISP: nótese que depende de IUsuarioLector (solo lectura) y NO
  de un repositorio "gordo" con guardar()/actualizar() — este
  servicio jamás escribe usuarios, así que no tiene por qué ver
  esos métodos en su contrato.
=========================================================*/

export class AutenticacionService {
  /** @param {import("../core/interfaces/IUsuarioLector.js").IUsuarioLector} repositorioUsuarios */
  constructor(repositorioUsuarios) {
    this.repositorioUsuarios = repositorioUsuarios;
  }

  /**
   * @returns {Promise<import("../core/entities/Usuario.js").Usuario>}
   * @throws {Error} si las credenciales no son válidas
   */
  async iniciarSesion(usuario, password) {
    const usuarioValido = await this.repositorioUsuarios.buscarPorCredenciales(
      usuario,
      password
    );

    if (!usuarioValido) {
      throw new Error("Datos incorrectos");
    }

    return usuarioValido;
  }
}
