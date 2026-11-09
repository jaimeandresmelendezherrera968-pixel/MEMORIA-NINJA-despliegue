import { IGameSessionService } from '../domain/IGameSessionService.js';

export class GameSessionService extends IGameSessionService {
  constructor(storageRepository) {
    super();
    this.storage = storageRepository;
  }

  iniciarPartida(jugador1, jugador2, modo) {
    this.storage.setItem('playerName1', jugador1 || 'Jugador 1');
    this.storage.setItem('playerName2', jugador2 || 'Jugador 2');
    this.storage.setItem('modo2Jugadores', modo === '2');
  }

  cerrarSesion() {
    if (window.SesionNinja && window.SesionNinja.cerrarSesion) {
      window.SesionNinja.cerrarSesion();
      return;
    }
    this.storage.removeItem('usuarioActivo');
    window.location.href = "login.html";
  }
}