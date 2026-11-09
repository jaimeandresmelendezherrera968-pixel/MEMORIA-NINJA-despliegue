import { BaseModal } from './BaseModal.js';
import { historialApi } from '../infraestructura/repositorios/HttpHistorialRepositorio.js';

/*
 * MODAL DE HISTORIAL (Parte 3 — datos reales)
 *
 * Lee el historial REAL de PostgreSQL mediante
 * `GET /api/usuarios/:id/historial` (a través de historialApi) y lo pinta en
 * #historialBody.
 *
 * Convención de `ganador`:
 *   - el NOMBRE del ganador si la partida se ganó,
 *   - "ninguno" si se perdió,
 *   - "empate" si terminó igualada.
 *
 * Modos:
 *   - "1" / "2": partidas locales de 1 o 2 jugadores,
 *   - "online-1v1": multijugador online de a dos,
 *   - "online-2v2": salas online por equipos.
 */
const CATEGORIAS = {
  normales: /^1$|^2$/,
  online: /^online-1v1$/,
  sala: /^online-2v2$/,
};

export class HistoryModal extends BaseModal {
  constructor(modalId) {
    super(modalId);
    this.cuerpoTabla = document.getElementById('historialBody');
    this.tabs = document.querySelectorAll('.tab-historial');
    this.partidas = [];
    this.inicializarTabs();
    this.inicializarCierreConEscape();
  }

  abrir() {
    if (this.modalElement) this.modalElement.classList.remove('hidden');
    this.cargar();
  }

  cerrar() {
    if (this.modalElement) this.modalElement.classList.add('hidden');
  }

  async cargar() {
    const idUsuario = this.#idUsuario();
    if (!idUsuario) {
      this.partidas = [];
      this.mensaje('Inicia sesión para ver tu historial.');
      return;
    }

    this.mensaje('Cargando historial…');
    try {
      const filas = await historialApi.obtener(idUsuario);
      this.partidas = filas.map((fila) => this.#mapear(fila));
      this.renderTabla(this.#tabActivo());
    } catch {
      this.partidas = [];
      this.mensaje('No se pudo cargar el historial (servidor no disponible).');
    }
  }

  #idUsuario() {
    try {
      const sesion = JSON.parse(localStorage.getItem('usuarioActivo'));
      return sesion && sesion.id ? sesion.id : null;
    } catch {
      return null;
    }
  }

  #mapear(fila) {
    const { fecha, hora } = this.#fechaHora(fila.jugada_en);
    const modo = String(fila.modo ?? '1');
    const ganador = String(fila.ganador ?? '');
    const empate = ganador.toLowerCase() === 'empate';
    const gano = !empate && Boolean(ganador) && ganador !== 'ninguno';

    return {
      categoria: modo.startsWith('online-2v2') ? 'sala' : modo.startsWith('online-1v1') ? 'online' : 'normales',
      resultado: empate ? 'empate' : gano ? 'victoria' : 'derrota',
      modo: this.#etiquetaModo(modo),
      sub: this.#subModo(modo),
      puntaje: this.#formato(fila.puntaje),
      fecha,
      hora
    };
  }

  #etiquetaModo(modo) {
    if (modo === 'online-2v2') return 'Sala 2 vs 2';
    if (modo === 'online-1v1') return 'Online 1 vs 1';
    if (modo === '2') return 'Partida 2 jugadores';
    return 'Partida Normal';
  }

  #subModo(modo) {
    if (modo === 'online-2v2') return 'online · equipos';
    if (modo === 'online-1v1') return 'online · 1 vs 1';
    if (modo === '2') return '2 jugadores';
    return '1 jugador';
  }

  #fechaHora(valor) {
    if (!valor) return { fecha: '', hora: '' };
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return { fecha: String(valor), hora: '' };

    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    const hora = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');

    return { fecha: `${dia}/${mes}/${anio}`, hora: `${hora}:${minutos}` };
  }

  #formato(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero.toLocaleString('es-ES') : '—';
  }

  #tabActivo() {
    const activo = document.querySelector('.tab-historial.activo');
    return activo?.dataset.tab || 'normales';
  }

  mensaje(texto) {
    if (!this.cuerpoTabla) return;
    this.cuerpoTabla.replaceChildren();
    const fila = document.createElement('tr');
    const celda = document.createElement('td');
    celda.colSpan = 4;
    const vacio = document.createElement('div');
    vacio.className = 'historial-vacio';
    vacio.textContent = texto;
    celda.appendChild(vacio);
    fila.appendChild(celda);
    this.cuerpoTabla.appendChild(fila);
  }

  renderTabla(tabKey) {
    if (!this.cuerpoTabla) return;

    const patron = CATEGORIAS[tabKey] || CATEGORIAS.normales;
    const filas = (this.partidas || []).filter((partida) => patron.test(partida.categoria));

    if (filas.length === 0) {
      this.mensaje('Todavía no hay partidas registradas en esta categoría.');
      return;
    }

    this.cuerpoTabla.replaceChildren(...filas.map((partida) => this.#fila(partida)));
  }

  #fila(partida) {
    const fila = document.createElement('tr');

    const resultado = document.createElement('td');
    resultado.className = `resultado-${partida.resultado}`;
    resultado.textContent = partida.resultado.toUpperCase();

    const modo = document.createElement('td');
    const principal = document.createElement('span');
    principal.className = 'modo-principal';
    principal.textContent = partida.modo;
    const sub = document.createElement('span');
    sub.className = 'modo-sub';
    sub.textContent = partida.sub;
    modo.append(principal, sub);

    const puntaje = document.createElement('td');
    puntaje.textContent = partida.puntaje;

    const fecha = document.createElement('td');
    fecha.className = 'fecha-hora';
    fecha.innerHTML = this.renderFecha(partida.fecha, partida.hora);

    fila.append(resultado, modo, puntaje, fecha);
    return fila;
  }

  renderFecha(fecha, hora) {
    const { dia, mes, anio } = this.descomponerFecha(fecha);

    const chip = anio
      ? `<span class="fecha-chip">
            <span class="fecha-dia">${dia}</span>
            <span class="fecha-texto">
              <span class="fecha-mes">${mes}</span>
              <span class="fecha-anio">${anio}</span>
            </span>
          </span>`
      : `<span class="fecha-chip fecha-chip-simple">
            <span class="fecha-dia fecha-dia-solo">${dia}</span>
          </span>`;

    const pill = hora ? `<span class="hora-pill">${hora}</span>` : '';

    return `${chip}${pill}`;
  }

  descomponerFecha(fecha) {
    const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
                   'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

    if (!fecha) return { dia: '--', mes: '', anio: '' };

    const partes = String(fecha).trim().split('/');

    if (partes.length === 3) {
      const [d, m, a] = partes;
      const indice = parseInt(m, 10) - 1;
      return {
        dia: d.padStart(2, '0'),
        mes: MESES[indice] || m,
        anio: a
      };
    }

    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) return { dia: String(fecha), mes: '', anio: '' };

    return {
      dia: String(fechaObj.getDate()).padStart(2, '0'),
      mes: MESES[fechaObj.getMonth()],
      anio: String(fechaObj.getFullYear())
    };
  }

  inicializarTabs() {
    this.tabs?.forEach(tab => {
      tab.addEventListener('click', () => {
        this.tabs.forEach(t => t.classList.remove('activo'));
        tab.classList.add('activo');
        this.renderTabla(tab.dataset.tab);
      });
    });
  }

  inicializarCierreConEscape() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalElement && !this.modalElement.classList.contains('hidden')) {
        this.cerrar();
      }
    });
  }
}
