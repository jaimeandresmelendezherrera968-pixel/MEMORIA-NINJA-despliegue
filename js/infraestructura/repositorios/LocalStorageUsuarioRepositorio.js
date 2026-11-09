/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Repositorio
  ARCHIVO: infraestructura/repositorios/LocalStorageUsuarioRepositorio.js

  Implementa AMBOS contratos segregados (IUsuarioLector +
  IUsuarioEscritor). JavaScript no permite herencia múltiple de
  clases, así que hereda formalmente de IUsuarioLector (para
  conservar la validación new.target de la interfaz principal
  de lectura) y cumple IUsuarioEscritor "por forma" (duck
  typing), documentado con @implements. Esto es una limitación
  real de JavaScript, no una excusa: por eso cada servicio
  sigue tipando contra la interfaz segregada que corresponde
  (ver AutenticacionService vs RegistroService).
=========================================================*/

import { IUsuarioLector } from "../../core/interfaces/IUsuarioLector.js";
import { Usuario } from "../../core/entities/Usuario.js";

const CLAVE_STORAGE = "usuariosRegistrados";

/** @implements {import("../../core/interfaces/IUsuarioEscritor.js").IUsuarioEscritor} */
export class LocalStorageUsuarioRepositorio extends IUsuarioLector {
  obtenerTodos() {
    const datos = JSON.parse(localStorage.getItem(CLAVE_STORAGE)) || [];
    return datos.map(Usuario.desdeJSON);
  }

  #guardarTodos(usuarios) {
    localStorage.setItem(
      CLAVE_STORAGE,
      JSON.stringify(usuarios.map((usuario) => usuario.toJSON()))
    );
  }

  buscarPorCorreo(correo) {
    return this.obtenerTodos().find((u) => u.correo === correo) || null;
  }

  buscarPorCredenciales(usuario, password) {
    return (
      this.obtenerTodos().find(
        (u) => u.usuario === usuario && u.verificarPassword(password)
      ) || null
    );
  }

  guardar(usuario) {
    const usuarios = this.obtenerTodos();
    usuarios.push(usuario);
    this.#guardarTodos(usuarios);
  }

  actualizar(usuarioActualizado) {
    const usuarios = this.obtenerTodos();
    const indice = usuarios.findIndex(
      (u) => u.correo === usuarioActualizado.correo
    );
    if (indice === -1) return false;
    usuarios[indice] = usuarioActualizado;
    this.#guardarTodos(usuarios);
    return true;
  }
}
