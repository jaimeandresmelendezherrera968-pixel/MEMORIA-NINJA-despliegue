import { BaseModal } from './BaseModal.js';
import { perfilPorDefecto } from '../domain/ProgresoReglas.js';

export class ProfileModal extends BaseModal {
  constructor(modalId, profileService) {
    super(modalId);
    this.profileService = profileService;
  }

  /**
   * Abre el modal de inmediato y rellena los datos en cuanto el servicio
   * responde (obtenerPerfil() es async: el progreso viene de HTTP con
   * respaldo local).
   */
  abrir() {
    super.abrir();

    Promise.resolve(this.profileService.obtenerPerfil())
      .then((datos) => this.#pintar(datos))
      .catch((error) => {
        console.warn('[perfil] no se pudieron cargar los datos:', error);
        this.#pintar({
          nombre: 'Invitado',
          ...perfilPorDefecto(),
          nivel: 1,
          expEnNivel: 500,
          meta: 1000,
          porcentajeNivel: 50,
        });
      });
  }

  #pintar(datos) {
    const modalName = document.getElementById('modalName');
    const modalLevel = document.getElementById('modalLevel');
    const modalExpBar = document.getElementById('modalExpBar');
    const modalExpText = document.getElementById('modalExpText');
    const statWins = document.getElementById('statWins');
    const statLosses = document.getElementById('statLosses');
    const statStreak = document.getElementById('statStreak');
    const statHighScore = document.getElementById('statHighScore');

    if (modalName) modalName.textContent = datos.nombre;
    if (modalLevel) modalLevel.textContent = datos.nivel;
    if (modalExpBar) modalExpBar.style.width = `${datos.porcentajeNivel}%`;
    if (modalExpText) {
      modalExpText.textContent = `${datos.expEnNivel} / ${datos.meta}`;
    }
    if (statWins) statWins.textContent = datos.victorias;
    if (statLosses) statLosses.textContent = datos.derrotas;
    if (statStreak) statStreak.textContent = `${datos.racha} \u{1F525}`;
    if (statHighScore) statHighScore.textContent = `${datos.puntajeMax} XP`;
  }
}
