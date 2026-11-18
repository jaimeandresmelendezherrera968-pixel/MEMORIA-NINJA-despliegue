import { BaseModal } from './BaseModal.js';
import { perfilPorDefecto } from '../domain/ProgresoReglas.js';

export class ProfileModal extends BaseModal {
  constructor(modalId, profileService, amistadService = null) {
    super(modalId);
    this.profileService = profileService;
    this.amistadService = amistadService;
    this.idUsuarioPerfil = null;
    this.codigoAmigoPerfil = '';
    this.perfilServidorCargado = false;
    this.cambioNombrePreparado = false;
    this.cambiandoNombre = false;
  }

  /**
   * Abre el modal de inmediato y rellena los datos en cuanto el servicio
   * responde (obtenerPerfil() es async: el progreso viene de HTTP con
   * respaldo local).
   */
  abrir() {
    super.abrir();
    this.perfilServidorCargado = false;
    this.#prepararCambioNombre();

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

    if (window.SesionNinja?.esActiva?.()) {
      this.#cargarDatosServidor();
    }
  }

  async #cargarDatosServidor() {
    if (!this.amistadService) return;
    try {
      const datos = await this.amistadService.obtenerResumen();
      this.#aplicarPerfilServidor(datos.perfil);
    } catch (error) {
      console.warn('[perfil] no se pudo cargar la identidad pública:', error);
    }
  }

  #aplicarPerfilServidor(perfil) {
    if (!perfil) return;
    this.perfilServidorCargado = true;
    this.idUsuarioPerfil = perfil.id || this.idUsuarioPerfil;
    this.codigoAmigoPerfil = perfil.codigoAmigo || '';

    const modalName = document.getElementById('modalName');
    if (modalName && perfil.usuario) modalName.textContent = perfil.usuario;

    const codigo = document.getElementById('modalCodigoAmigo');
    if (codigo) {
      codigo.textContent = perfil.codigoAmigo ? `ID público: ${perfil.codigoAmigo}` : '';
      codigo.hidden = !perfil.codigoAmigo;
    }

    const input = document.getElementById('cambiarNombreInput');
    if (input && document.activeElement !== input) input.value = perfil.usuario || '';
    this.#prepararCambioNombre();
  }

  #prepararCambioNombre() {
    const form = document.getElementById('cambiarNombreForm');
    if (!form) return;

    if (!this.cambioNombrePreparado) {
      form.addEventListener('submit', (evento) => {
        evento.preventDefault();
        this.#cambiarNombre();
      });
      this.cambioNombrePreparado = true;
    }

    const activa = Boolean(window.SesionNinja?.esActiva?.());
    form.hidden = !activa;
    if (!activa) {
      const aviso = document.getElementById('cambiarNombreAviso');
      if (aviso) {
        aviso.textContent = '';
        aviso.hidden = true;
      }
    }
  }

  async #cambiarNombre() {
    if (this.cambiandoNombre) return;
    const input = document.getElementById('cambiarNombreInput');
    const boton = document.getElementById('cambiarNombreBtn');
    const aviso = document.getElementById('cambiarNombreAviso');
    const nombre = input?.value.trim() || '';
    const id = this.idUsuarioPerfil || this.#leerIdLocal();

    if (!this.amistadService || !id || !nombre) {
      if (aviso) {
        aviso.textContent = 'Ingresá un nombre válido para guardar.';
        aviso.hidden = false;
      }
      return;
    }

    this.cambiandoNombre = true;
    if (boton) boton.disabled = true;
    if (input) input.disabled = true;
    try {
      const datos = await this.amistadService.cambiarNombre(id, nombre);
      this.#actualizarUsuarioActivo(datos.perfil || { id, usuario: nombre });
      await this.#cargarDatosServidor();
      if (aviso) {
        aviso.textContent = 'Nombre actualizado.';
        aviso.hidden = false;
        aviso.setAttribute('role', 'status');
      }
    } catch (error) {
      if (aviso) {
        aviso.textContent = error?.message || 'No se pudo actualizar el nombre.';
        aviso.hidden = false;
        aviso.setAttribute('role', 'alert');
      }
    } finally {
      this.cambiandoNombre = false;
      if (boton) boton.disabled = false;
      if (input) input.disabled = false;
    }
  }

  #leerIdLocal() {
    try {
      return JSON.parse(localStorage.getItem('usuarioActivo') || 'null')?.id || null;
    } catch (error) {
      return null;
    }
  }

  #actualizarUsuarioActivo(perfil) {
    if (!perfil?.id) return;
    let actual;
    try {
      actual = JSON.parse(localStorage.getItem('usuarioActivo') || 'null');
    } catch (error) {
      return;
    }
    const idPropio = this.idUsuarioPerfil || actual?.id;
    if (!actual || idPropio == null || String(idPropio) !== String(perfil.id)) return;
    localStorage.setItem(
      'usuarioActivo',
      JSON.stringify({
        ...actual,
        id: perfil.id,
        usuario: perfil.usuario,
        nombre: perfil.usuario,
        codigoAmigo: perfil.codigoAmigo || this.codigoAmigoPerfil,
      })
    );
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

    if (modalName && !this.perfilServidorCargado) modalName.textContent = datos.nombre;
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
