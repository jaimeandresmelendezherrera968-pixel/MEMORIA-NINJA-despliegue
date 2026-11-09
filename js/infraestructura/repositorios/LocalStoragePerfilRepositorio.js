/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Repositorio
  ARCHIVO: infraestructura/repositorios/LocalStoragePerfilRepositorio.js

  Respaldo local del progreso de cuenta: XP y estadísticas viven
  en localStorage bajo la clave "perfil:<id>". Es lo que hace que
  el perfil siga funcionando con el backend apagado, y también el
  único hogar del progreso del invitado (que jamás viaja por HTTP).

  Crea el perfil por defecto en el primer acceso, así que nunca
  devuelve null.
=========================================================*/

import { IPerfilRepositorio } from "../../domain/IPerfilRepositorio.js";
import {
  perfilPorDefecto,
  aplicarFinPartida,
} from "../../domain/ProgresoReglas.js";

const CLAVE = "perfil:";

export class LocalStoragePerfilRepositorio extends IPerfilRepositorio {
  #clave(idUsuario) {
    return `${CLAVE}${idUsuario}`;
  }

  #leer(idUsuario) {
    try {
      const crudo = localStorage.getItem(this.#clave(idUsuario));
      return crudo ? JSON.parse(crudo) : null;
    } catch {
      return null;
    }
  }

  #guardar(idUsuario, perfil) {
    localStorage.setItem(this.#clave(idUsuario), JSON.stringify(perfil));
    return perfil;
  }

  async obtener(idUsuario) {
    return this.#leer(idUsuario) || this.#guardar(idUsuario, perfilPorDefecto());
  }

  async registrarFinPartida(idUsuario, resultado) {
    const actual = (await this.obtener(idUsuario)) || perfilPorDefecto();
    const actualizado = aplicarFinPartida(actual, resultado);
    return this.#guardar(idUsuario, actualizado);
  }
}
