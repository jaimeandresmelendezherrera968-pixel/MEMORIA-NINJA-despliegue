import { BaseModal } from './BaseModal.js';

/*
 * MODAL DE RANKING (Parte 3 — datos reales)
 *
 * Antes este modal era un stub: `cargarRanking()` solo abría la ventana y las
 * filas estaban HARDCODEADAS en menu.html (Itachi 3250, Naruto 3100…).
 * Ahora lee la vista real de PostgreSQL `vw_ranking_mejor_puntaje` mediante
 * `GET /api/vistas/ranking` y pinta el resultado en #rankingBody.
 *
 * Columnas del ranking real (la vista NO trae xp/nivel):
 *   #            -> posición
 *   JUGADOR      -> usuario
 *   PARTIDAS     -> total_partidas
 *   MEJOR PUNTAJE-> mejor_puntaje
 */
export class RankingModal extends BaseModal {
  constructor(modalId) {
    super(modalId);
    this.cuerpo = document.getElementById('rankingBody');
  }

  abrir() {
    super.abrir();
    this.cargarRanking();
  }

  async cargarRanking() {
    if (!this.cuerpo) return;
    this.cuerpo.innerHTML = this.#filaMensaje('Cargando ranking…');

    try {
      const respuesta = await fetch('/api/vistas/ranking', { cache: 'no-store' });
      const cuerpo = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok || !cuerpo.exito) {
        throw new Error(cuerpo.error || 'No se pudo cargar el ranking.');
      }
      this.render(cuerpo.ranking || []);
    } catch {
      this.cuerpo.innerHTML = this.#filaMensaje(
        'No se pudo cargar el ranking (servidor no disponible).'
      );
    }
  }

  render(ranking) {
    if (!this.cuerpo) return;
    if (!ranking.length) {
      this.cuerpo.innerHTML = this.#filaMensaje('Todavía no hay partidas registradas.');
      return;
    }
    this.cuerpo.innerHTML = ranking.map((jugador, i) => this.#fila(jugador, i + 1)).join('');
  }

  #fila(jugador, posicion) {
    return `
      <div class="ranking-row">
        <div class="col-pos">${this.#insignia(posicion)}</div>
        <div class="col-jugador">
          <div class="avatar-table">🥷</div>
          <span class="nombre-jugador">${this.#escapar(jugador.usuario)}</span>
        </div>
        <div class="col-nivel">${this.#numero(jugador.total_partidas)}</div>
        <div class="col-xp${posicion === 1 ? ' txt-oro' : ''}">${this.#numero(jugador.mejor_puntaje)}</div>
      </div>`;
  }

  #insignia(posicion) {
    if (posicion === 1) return '<span class="badge-rank oro">1</span>';
    if (posicion === 2) return '<span class="badge-rank plata">2</span>';
    if (posicion === 3) return '<span class="badge-rank bronce">3</span>';
    return `<span class="num-rank">${posicion}</span>`;
  }

  #filaMensaje(texto) {
    return `
      <div class="ranking-row">
        <div class="col-pos"><span class="num-rank">…</span></div>
        <div class="col-jugador"><span class="nombre-jugador">${this.#escapar(texto)}</span></div>
        <div class="col-nivel">—</div>
        <div class="col-xp">—</div>
      </div>`;
  }

  #numero(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero.toLocaleString('es-ES') : '0';
  }

  #escapar(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (caracter) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[caracter]));
  }
}
