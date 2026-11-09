import { LocalStorageRepository } from './infrastructure/LocalStorageRepository.js';
import { progresoService } from './services/progresoService.js';
import { SalaService } from './services/SalaService.js';
import { ProfileModal } from './ui/ProfileModal.js';
import { GameModeModal } from './ui/Gamemodemodal.js';
import { RankingModal } from './ui/RankingModal.js';
import { HistoryModal } from './ui/HistoryModal.js';
import { TwoPlayersModal } from './ui/TwoPlayersModal.js';
import { MultijugadorModal } from './ui/MultijugadorModal.js';
import { ConfigModal } from './ui/ConfigModal.js';
import { BaseModal } from './ui/BaseModal.js';
import { MenuController } from './ui/MenuController.js';

/*
 * app.js es el composition root (SRP): no contiene lógica de negocio,
 * únicamente ensambla e inyecta dependencias entre las capas.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DIP: el repositorio (infraestructura) se inyecta al servicio por constructor,
  // nunca se instancia dentro de él.
  const storageRepository = new LocalStorageRepository();
  // El progreso del perfil (XP/nivel/estadísticas) ya viene compuesto desde
  // services/progresoService.js, que es el mismo singleton que usan las
  // páginas de juego al cerrar una partida.
  const profileService = progresoService;
  const salaService = new SalaService(storageRepository);

  // OCP/DRY: agregar un modal = agregar una entrada al mapa.
  // La fábrica decide si el contenedor existe en el DOM antes de instanciarlo (SRP).
  const crearModalSiExiste = (modalId, factoria) =>
    document.getElementById(modalId) ? factoria() : null;

  // LSP: el controlador solo conoce objetos que responden a abrir()/cerrar().
  // Cada subclase concreta añade su comportamiento específico sin romper el contrato.
  const modales = {
    profileModal: crearModalSiExiste('profileModal', () =>
      new ProfileModal('profileModal', profileService)
    ),
    gameModeModal: crearModalSiExiste('gameModeModal', () =>
      new GameModeModal('gameModeModal')
    ),
    dosJugadoresModal: crearModalSiExiste('twoPlayersModal', () =>
      new TwoPlayersModal('twoPlayersModal', salaService)
    ),
    multijugadorModal: crearModalSiExiste('multijugadorModal', () =>
      new MultijugadorModal('multijugadorModal')
    ),
    rankingModal: crearModalSiExiste('rankingModal', () =>
      new RankingModal('rankingModal')
    ),
    historyModal: crearModalSiExiste('modalHistorial', () =>
      new HistoryModal('modalHistorial')
    ),
    puntajeModal: crearModalSiExiste('puntajeInfoModal', () =>
      new BaseModal('puntajeInfoModal')
    ),
    configModal: crearModalSiExiste('configModal', () =>
      new ConfigModal('configModal')
    )
  };

  // El modal de modos de juego inicializa sus tarjetas de opción (composición)
  modales.gameModeModal?.inicializarOpciones();

  const menuController = new MenuController(modales);
  menuController.inicializarEventos();

  const url = new URL(window.location.href);
  const codigoInvitacion = url.searchParams.get('codigo');
  if (codigoInvitacion) {
    url.searchParams.delete('codigo');
    window.history.replaceState({}, '', url);
    modales.dosJugadoresModal?.abrirConCodigo(codigoInvitacion);
  }
});