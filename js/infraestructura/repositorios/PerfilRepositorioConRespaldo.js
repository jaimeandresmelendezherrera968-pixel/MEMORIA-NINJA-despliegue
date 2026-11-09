/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Repositorio
  ARCHIVO: infraestructura/repositorios/PerfilRepositorioConRespaldo.js

  Repositorio COMPUESTO (Decorator) del progreso: primero intenta
  el backend real (HTTP + SQLite) y, si el servidor no está
  alcanzable (ErrorDeConexion), cae silenciosamente al respaldo
  local (localStorage). Así el perfil y el avance de XP siguen
  funcionando de punta a punta aunque el backend esté apagado.

  >>> CASOS DEL ENRUTADO <<<
  - Invitado: su progreso es local por definición, no se consulta
    HTTP (el servidor no tiene esa cuenta).
  - Cuenta inexistente en el servidor (obtener -> null): la cuenta
    se creó con el backend apagado, se usa el respaldo local.
  - Cualquier otro error de negocio del servidor (400) se propaga:
    no se falsea con datos locales.

  >>> LSP/DIP <<<
  Cumple IPerfilRepositorio igual que Http y LocalStorage, así que
  el servicio del perfil no nota ningún cambio.
=========================================================*/

import { IPerfilRepositorio } from "../../domain/IPerfilRepositorio.js";
import { ID_INVITADO } from "../../domain/ProgresoReglas.js";
import { ErrorDeConexion } from "./HttpUsuarioRepositorio.js";

export class PerfilRepositorioConRespaldo extends IPerfilRepositorio {
  /** @param {{ principal: Object, respaldo: Object }} repos */
  constructor({ principal, respaldo }) {
    super();
    this.principal = principal;
    this.respaldo = respaldo;
  }

  #esInvitado(idUsuario) {
    return !idUsuario || idUsuario === ID_INVITADO;
  }

  /**
   * Ejecuta el método en el principal; cae al respaldo si el fallo es de
   * conexión o si, tratándose de una lectura, el servidor no conoce la
   * cuenta. Cualquier otro error se propaga.
   */
  #conRespaldo(metodo, argumentos, respaldoSiVacio = false) {
    return (async () => {
      try {
        const resultado = await this.principal[metodo](...argumentos);
        if (respaldoSiVacio && resultado == null) {
          return this.respaldo[metodo](...argumentos);
        }
        return resultado;
      } catch (error) {
        if (error instanceof ErrorDeConexion) {
          return this.respaldo[metodo](...argumentos);
        }
        throw error;
      }
    })();
  }

  obtener(idUsuario) {
    if (this.#esInvitado(idUsuario)) return this.respaldo.obtener(idUsuario);
    return this.#conRespaldo("obtener", [idUsuario], true);
  }

  registrarFinPartida(idUsuario, resultado) {
    if (this.#esInvitado(idUsuario)) {
      return this.respaldo.registrarFinPartida(idUsuario, resultado);
    }
    return this.#conRespaldo("registrarFinPartida", [idUsuario, resultado]);
  }
}
