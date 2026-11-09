/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Repositorio
  ARCHIVO: infraestructura/repositorios/RepositorioUsuariosConRespaldo.js

  Repositorio COMPUESTO (Decorator): intenta primero con el backend
  real (HTTP + SQLite) y, si el servidor NO está alcanzable
  (ErrorDeConexion), cae silenciosamente al respaldo local
  (localStorage). Así el login y el registro siguen funcionando de
  punta a punta aunque el backend esté apagado.

  >>> GRACEFUL DEGRADATION <<<
  Solo se cae al respaldo cuando el problema es de CONEXIÓN. Si el
  servidor responde que el correo ya está registrado (400) o que las
  credenciales son incorrectas (401), eso es la verdad del servidor y
  se propaga — no se falsea con datos locales.

  >>> LSP/DIP <<<
  Cumple la misma interfaz que HttpUsuarioRepositorio y que
  LocalStorageUsuarioRepositorio (IUsuarioLector + IUsuarioEscritor
  por forma), así que los Services no notan ningún cambio.
=========================================================*/

import { IUsuarioLector } from "../../core/interfaces/IUsuarioLector.js";
import { ErrorDeConexion } from "./HttpUsuarioRepositorio.js";

/** @implements {import("../../core/interfaces/IUsuarioEscritor.js").IUsuarioEscritor} */
export class RepositorioUsuariosConRespaldo extends IUsuarioLector {
  /** @param {{ principal: Object, respaldo: Object }} repos */
  constructor({ principal, respaldo }) {
    super();
    this.principal = principal;
    this.respaldo = respaldo;
  }

  /**
   * Ejecuta el método en el principal; si el fallo es de conexión,
   * lo repite en el respaldo. Cualquier otro error se propaga.
   */
  #conRespaldo(metodo, argumentos) {
    return Promise.resolve(this.principal[metodo](...argumentos)).catch(
      (error) => {
        if (error instanceof ErrorDeConexion) {
          return this.respaldo[metodo](...argumentos);
        }
        throw error;
      }
    );
  }

  obtenerTodos() {
    return this.#conRespaldo("obtenerTodos", []);
  }

  buscarPorCorreo(correo) {
    return this.#conRespaldo("buscarPorCorreo", [correo]);
  }

  buscarPorCredenciales(usuario, password) {
    return this.#conRespaldo("buscarPorCredenciales", [usuario, password]);
  }

  guardar(usuario) {
    return this.#conRespaldo("guardar", [usuario]);
  }

  actualizar(usuarioActualizado) {
    return this.#conRespaldo("actualizar", [usuarioActualizado]);
  }
}