/*=========================================================
  MEMORIA NINJA
  CAPA: SERVICIOS -> Composición del progreso
  ARCHIVO: services/progresoService.js

  Ensambla el ProfileService que usan el menú (modal de perfil)
  y todas las páginas de 1 jugador al cerrar una partida.

  Se exporta como singleton por el MISMO motivo que historialApi:
  las páginas de juego no son un composition root y necesitan
  llamar al progreso sin instanciar cadenas de repositorios a
  mano. La composición ocurre UNA sola vez, aquí.

  HTTP con respaldo local: el progreso sube al backend si está
  arriba y si no vive en localStorage sin perderse.
=========================================================*/

import { ProfileService } from './ProfileService.js';
import { HttpPerfilRepositorio } from '../infraestructura/repositorios/HttpPerfilRepositorio.js';
import { LocalStoragePerfilRepositorio } from '../infraestructura/repositorios/LocalStoragePerfilRepositorio.js';
import { PerfilRepositorioConRespaldo } from '../infraestructura/repositorios/PerfilRepositorioConRespaldo.js';
import { LocalStorageSesionRepositorio } from '../infraestructura/repositorios/LocalStorageSesionRepositorio.js';
import { LocalStorageRepository } from '../infrastructure/LocalStorageRepository.js';

export const progresoService = new ProfileService(
  new PerfilRepositorioConRespaldo({
    principal: new HttpPerfilRepositorio(),
    respaldo: new LocalStoragePerfilRepositorio(),
  }),
  new LocalStorageSesionRepositorio(),
  new LocalStorageRepository()
);
