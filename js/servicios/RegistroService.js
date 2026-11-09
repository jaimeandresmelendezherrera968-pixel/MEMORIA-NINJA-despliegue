/*=========================================================
  MEMORIA NINJA
  CAPA: SERVICIOS (lógica de negocio)
  ARCHIVO: servicios/RegistroService.js

  SRP: valida y crea usuarios nuevos. No sabe nada de
  checkboxes de términos/política ni de animaciones de mensaje;
  eso es responsabilidad del controlador (capa de presentación).

  OCP: si mañana se agrega una nueva regla de negocio (p. ej.
  "el usuario debe tener mínimo 8 caracteres en la contraseña"),
  se agrega dentro de este método sin tocar el controlador ni
  el repositorio.
=========================================================*/

import { Usuario } from "../core/entities/Usuario.js";

export class RegistroService {
  /**
   * Necesita leer (verificar correo duplicado) Y escribir
   * (guardar el nuevo usuario), por eso depende de las dos
   * interfaces segregadas — a diferencia de AutenticacionService,
   * que solo depende de IUsuarioLector.
   * @param {import("../core/interfaces/IUsuarioLector.js").IUsuarioLector & import("../core/interfaces/IUsuarioEscritor.js").IUsuarioEscritor} repositorioUsuarios
   */
  constructor(repositorioUsuarios) {
    this.repositorioUsuarios = repositorioUsuarios;
  }

  async registrar({ usuario, nacimiento, correo, pass, confirmarPass }) {
    if (!usuario || !nacimiento || !correo || !pass || !confirmarPass) {
      throw new Error("Por favor, completa todos los campos.");
    }

    if (pass !== confirmarPass) {
      throw new Error("Las contraseñas no coinciden.");
    }

    if (await this.repositorioUsuarios.buscarPorCorreo(correo)) {
      throw new Error("Este correo ya está registrado.");
    }

    const nuevoUsuario = new Usuario({ usuario, nacimiento, correo, pass });
    await this.repositorioUsuarios.guardar(nuevoUsuario);
    return nuevoUsuario;
  }
}
