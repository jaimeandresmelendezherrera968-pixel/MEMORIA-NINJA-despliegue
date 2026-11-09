import { IProfileService } from '../domain/IProfileService.js';
import {
  ID_INVITADO,
  perfilPorDefecto,
  nivelDe,
  XP_POR_NIVEL,
} from '../domain/ProgresoReglas.js';

/**
 * SERVICIO: ProfileService
 *
 * Lee y escribe el progreso de la cuenta (XP, nivel y estadísticas)
 * a través de un IPerfilRepositorio inyectado (HTTP con respaldo local),
 * e identifica a quién pertenece ese progreso con el repositorio de
 * sesión inyectado. Quien no tiene sesión juega como invitado y su
 * avance vive solo en este navegador.
 *
 * registrarFinPartida() es BEST-EFFORT a propósito: el cierre de una
 * partida nunca debe romperse por no poder subir el progreso.
 */
export class ProfileService extends IProfileService {
  /**
   * @param {import('../domain/IPerfilRepositorio.js').IPerfilRepositorio} perfilRepositorio
   * @param {import('../core/interfaces/ISesionRepositorio.js').ISesionRepositorio} sesionRepositorio
   * @param {import('../domain/IStorageRepository.js').IStorageRepository} storageRepository
   */
  constructor(perfilRepositorio, sesionRepositorio, storageRepository) {
    super();
    this.perfilRepositorio = perfilRepositorio;
    this.sesionRepositorio = sesionRepositorio;
    this.storage = storageRepository;
  }

  #identidad() {
    let sesion = null;
    try {
      sesion = this.sesionRepositorio?.obtener?.() || null;
    } catch {
      sesion = null;
    }
    return {
      id: sesion?.id || ID_INVITADO,
      nombre:
        sesion?.usuario ||
        this.storage?.getItem('playerName1') ||
        'Invitado',
    };
  }

  /** Datos listos para pintar el modal de perfil. */
  async obtenerPerfil() {
    const { id, nombre } = this.#identidad();

    let perfil;
    try {
      perfil = (await this.perfilRepositorio.obtener(id)) || perfilPorDefecto();
    } catch (error) {
      console.warn('[perfil] no se pudo leer el progreso:', error);
      perfil = perfilPorDefecto();
    }

    const xp = perfil.xp || 0;
    const expEnNivel = xp % XP_POR_NIVEL;

    return {
      nombre,
      nivel: nivelDe(xp),
      xp,
      expEnNivel,
      meta: XP_POR_NIVEL,
      porcentajeNivel: Math.round((expEnNivel / XP_POR_NIVEL) * 100),
      victorias: perfil.victorias || 0,
      derrotas: perfil.derrotas || 0,
      racha: perfil.racha || 0,
      puntajeMax: perfil.puntajeMax || 0,
    };
  }

  /**
   * Suma el resultado de una partida de 1 jugador al perfil de la cuenta.
   * @param {{ victoria: boolean, puntaje?: number }} resultado
   * @returns {Promise<object|null>} el perfil actualizado, o null si falló
   */
  async registrarFinPartida(resultado) {
    try {
      const { id } = this.#identidad();
      return await this.perfilRepositorio.registrarFinPartida(id, resultado);
    } catch (error) {
      console.warn('[perfil] no se pudo registrar el resultado:', error);
      return null;
    }
  }
}
