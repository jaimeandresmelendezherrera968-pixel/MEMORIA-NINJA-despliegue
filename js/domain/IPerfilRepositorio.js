/*=========================================================
  MEMORIA NINJA
  CAPA: NÚCLEO (Dominio) -> Interfaz / Contrato
  ARCHIVO: domain/IPerfilRepositorio.js

  DIP: el servicio del perfil depende de este contrato y no de
  cómo se persiste el progreso. Hay dos implementaciones
  reales (HTTP con SQLite y localStorage) y un compuesto que
  intenta la primera y cae en la segunda si no hay backend.

  El perfil de una cuenta se identifica por su id de usuario;
  el id de invitado (ID_INVITADO) nunca llega al backend.
=========================================================*/

export class IPerfilRepositorio {
  constructor() {
    if (new.target === IPerfilRepositorio) {
      throw new Error(
        "IPerfilRepositorio es una interfaz y no se puede instanciar directamente."
      );
    }
  }

  /** @returns {Promise<object|null>} perfil o null si aún no existe */
  obtener(_idUsuario) {
    throw new Error("obtener() debe ser implementado por la subclase.");
  }

  /** @returns {Promise<object>} el perfil ya actualizado */
  registrarFinPartida(_idUsuario, _resultado) {
    throw new Error(
      "registrarFinPartida() debe ser implementado por la subclase."
    );
  }
}
