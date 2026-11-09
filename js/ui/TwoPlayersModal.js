import { BaseModal } from './BaseModal.js';
import { clienteMultijugador } from '../multijugador/ClienteMultijugador.js';

const TEXTO_SALAS_VACIO = 'No hay salas disponibles. ¡Usa partida rápida o espera una sala!';

export class TwoPlayersModal extends BaseModal {
  constructor(modalId, salaService) {
    super(modalId);
    this.salaService = salaService;
    this.salaPendienteContrasena = null;
    this.ultimoCodigoQr = null;
    this.urlSalaActual = null;
    this.redirectEnCurso = false;
    this.configurarSocket();
    this.inicializarEventos();
  }

  configurarSocket() {
    clienteMultijugador.on('sala-actualizada', (sala) => {
      if (sala?.codigo) this.actualizarPanelEspera(sala);
    });
    clienteMultijugador.on('lista-salas-actualizada', (salas) => {
      this.pintarListaSalas(salas || []);
    });
    clienteMultijugador.on('partida-iniciada', (datos) => {
      if (this.redirectEnCurso) return;
      this.redirectEnCurso = true;
      document.getElementById('panelEsperandoRival')?.setAttribute('hidden', 'true');
      document.getElementById('panelPartidaRapida')?.setAttribute('hidden', 'true');
      const codigo = datos?.codigo || clienteMultijugador.codigoSala || '';
      window.location.href = `game-online.html?codigo=${encodeURIComponent(codigo)}`;
    });
  }

  async abrir() { return this.abrirUnirseDirecto(); }
  async abrirParaUnirse() { return this.abrirUnirseDirecto(); }
  async abrirMultijugador() { return this.abrirUnirseDirecto(); }

  async abrirConCodigo(codigo) {
    await this.abrirUnirseDirecto();
    const normalizado = String(codigo || '').trim().toUpperCase();
    if (!normalizado) return;
    try {
      const res = await clienteMultijugador.buscarSalaPorCodigo(normalizado);
      if (!res.exito) { this.mostrarErrorUnirse(res.error || 'No se encontró la sala.'); return; }
      if (res.sala?.conContrasena) {
        this.salaPendienteContrasena = { codigo: normalizado };
        document.getElementById('modalContrasenaSala')?.classList.add('activo');
        const inp = document.getElementById('inputContrasenaUnirse'); if (inp) inp.value = '';
        const err = document.getElementById('errorContrasenaSala'); if (err) err.hidden = true;
        return;
      }
      await this.unirseASalaDirecto(normalizado);
    } catch { this.mostrarErrorUnirse('No se pudo conectar con el servidor de salas.'); }
  }

  async abrirUnirseDirecto() {
    super.abrir();
    this.redirectEnCurso = false;
    this.ultimoCodigoQr = null;
    this.urlSalaActual = null;
    try {
      await clienteMultijugador.conectar();
    } catch {
      this.mostrarMensajeVacio('El multijugador requiere el backend corriendo (npm start).', 'error');
      this.ocultarPaneles();
      document.getElementById('listaSalasContainer')?.removeAttribute('hidden');
      return;
    }
    this.ocultarPaneles();
    document.getElementById('modalContrasenaSala')?.classList.remove('activo');
    document.getElementById('panelBuscarCodigo')?.removeAttribute('hidden');
    document.getElementById('listaSalasContainer')?.removeAttribute('hidden');
    this.marcarActivo('btnUnirsePorCodigo');
    const inp = document.getElementById('inputBuscarCodigo'); if (inp) inp.value = '';
    const errorLobby = document.getElementById('errorLobbyCodigo'); if (errorLobby) errorLobby.hidden = true;
    this.mostrarMensajeVacio(TEXTO_SALAS_VACIO);
    this.actualizarListaSalas();
  }

  ocultarPaneles() {
    ['panelEsperandoRival', 'panelBuscarCodigo', 'panelPartidaRapida'].forEach(id => {
      document.getElementById(id)?.setAttribute('hidden', 'true');
    });
  }

  marcarActivo(id) {
    ['btnUnirsePorCodigo', 'btnPartidaRapida'].forEach(btnId => {
      document.getElementById(btnId)?.classList.toggle('btn-lobby-activo', btnId === id);
    });
  }

  mostrarMensajeVacio(mensaje, tipo = 'info') {
    const vacio = document.getElementById('salasVacio');
    if (!vacio) return;
    vacio.hidden = false;
    vacio.classList.toggle('salas-vacio-error', tipo === 'error');
    vacio.textContent = mensaje;
  }

  async actualizarListaSalas() {
    try {
      const res = await clienteMultijugador.listarSalas();
      this.pintarListaSalas(res?.exito ? (res.salas || []) : []);
    } catch { this.pintarListaSalas([]); }
  }

  pintarListaSalas(salas) {
    const contenedor = document.getElementById('listaSalas');
    const vacio = document.getElementById('salasVacio');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    if (!salas || salas.length === 0) { if (vacio) { vacio.hidden = false; vacio.textContent = TEXTO_SALAS_VACIO; } return; }
    if (vacio) vacio.hidden = true;
    salas.forEach(sala => {
      const card = document.createElement('div');
      card.className = 'sala-card';
      const pares = sala.config?.pares || 8;
      const capacidad = Number(sala.capacidad) || (sala.modo === '2v2' ? 4 : 2);
      const ocupados = Number(sala.jugadores) || 0;
      const llena = ocupados >= capacidad;
      const modoTxt = sala.modo === '2v2' ? '2 VS 2' : '1 VS 1';
      const mezclar = sala.config?.mezclarAldeas ? 'MEZCLADO' : `ALDEA: ${(sala.config?.aldea || 'KONOHA').toUpperCase()}`;
      const codigo = String(sala.codigo || '').toUpperCase();

      const info = document.createElement('div');
      info.className = 'sala-card-info';
      const filaSuperior = document.createElement('div');
      filaSuperior.className = 'sala-card-fila';
      const idSala = document.createElement('span');
      idSala.className = 'sala-card-id';
      idSala.textContent = codigo ? `ID: ${codigo}` : 'ID: ----';
      const anfitrion = document.createElement('span');
      anfitrion.className = 'sala-card-anfitrion';
      anfitrion.textContent = sala.anfitrion ? `ANFITRIÓN: ${sala.anfitrion}` : '';
      filaSuperior.appendChild(idSala);
      if (anfitrion.textContent) filaSuperior.appendChild(anfitrion);
      const filaInferior = document.createElement('div');
      filaInferior.className = 'sala-card-fila sala-card-fila-secundaria';
      const detalles = document.createElement('span');
      detalles.className = 'sala-card-detalles';
      detalles.textContent = `${modoTxt} · ${ocupados}/${capacidad} JUGADORES · ${pares} PAREJAS · ${mezclar}${sala.conContrasena ? ' · CON CONTRASEÑA' : ''}`;
      const estado = document.createElement('span');
      estado.className = llena ? 'sala-card-estado sala-card-estado-llena' : 'sala-card-estado sala-card-estado-esperando';
      estado.textContent = llena ? 'LLENA' : 'ESPERANDO';
      filaInferior.appendChild(detalles);
      filaInferior.appendChild(estado);
      info.appendChild(filaSuperior);
      info.appendChild(filaInferior);

      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = llena ? 'btn-unirse-sala-pequeno btn-unirse-sala-pequeno-deshabilitado' : 'btn-unirse-sala-pequeno';
      boton.textContent = llena ? 'LLENA' : 'UNIRSE';
      boton.disabled = llena;
      boton.addEventListener('click', () => this.solicitarUnirse(sala));
      card.appendChild(info);
      card.appendChild(boton);
      contenedor.appendChild(card);
    });
  }

  solicitarUnirse(sala) {
    if (sala.conContrasena) {
      this.salaPendienteContrasena = sala;
      document.getElementById('modalContrasenaSala')?.classList.add('activo');
      const inp = document.getElementById('inputContrasenaUnirse'); if (inp) inp.value = '';
      const err = document.getElementById('errorContrasenaSala'); if (err) err.hidden = true;
      return;
    }
    this.unirseASalaDirecto(sala.codigo);
  }

  async unirseASalaDirecto(codigo, contrasena = null) {
    let nombre = 'Jugador';
    try { nombre = JSON.parse(localStorage.getItem('usuarioActivo') || '{}').nombre || 'Jugador'; } catch {}
    try {
      const res = await clienteMultijugador.unirseSala(codigo, nombre, contrasena);
      if (res.exito) {
        document.getElementById('modalContrasenaSala')?.classList.remove('activo');
        this.mostrarPanelEspera(String(codigo).toUpperCase(), res.sala);
      } else { this.mostrarErrorUnirse(res.error || 'No se pudo unir a la sala.'); }
    } catch { this.mostrarErrorUnirse('Error al conectar con el servidor.'); }
  }

  mostrarErrorUnirse(mensaje) {
    const modalContrasena = document.getElementById('modalContrasenaSala');
    if (modalContrasena?.classList.contains('activo')) {
      const errorContrasena = document.getElementById('errorContrasenaSala');
      if (errorContrasena) { errorContrasena.textContent = mensaje; errorContrasena.hidden = false; }
      return;
    }
    const errorCodigo = document.getElementById('errorLobbyCodigo');
    if (errorCodigo && !document.getElementById('panelBuscarCodigo')?.hidden) {
      errorCodigo.textContent = mensaje; errorCodigo.hidden = false; return;
    }
    this.mostrarMensajeVacio(mensaje);
  }

  mostrarPanelEspera(codigo, sala = {}) {
    this.ultimoCodigoQr = null;
    this.ocultarPaneles();
    document.getElementById('panelEsperandoRival')?.removeAttribute('hidden');
    document.getElementById('listaSalasContainer')?.setAttribute('hidden', 'true');
    this.actualizarPanelEspera({ ...sala, codigo: codigo || sala.codigo });
  }

  actualizarPanelEspera(sala) {
    const codigo = String(sala?.codigo || '').toUpperCase();
    const panel = document.getElementById('panelEsperandoRival');
    if (!codigo || panel?.hidden) return;
    const capacidad = Number(sala.capacidad) || (sala.modo === '2v2' ? 4 : 2);
    const ocupados = Number(sala.jugadores) || 0;
    const faltan = Math.max(0, capacidad - ocupados);
    const es2v2 = sala.modo === '2v2' || capacidad === 4;
    const codigoEl = document.getElementById('codigoSalaEspera'); if (codigoEl) codigoEl.textContent = codigo;
    const titulo = document.getElementById('esperandoTitulo');
    if (titulo) titulo.textContent = faltan === 0 ? 'SALA COMPLETA · INICIANDO...' : (es2v2 ? `ESPERANDO JUGADORES (${ocupados}/${capacidad})...` : 'ESPERANDO RIVAL...');
    const info = document.getElementById('esperandoInfo');
    if (info) info.textContent = faltan === 0 ? 'LA PARTIDA ESTÁ POR COMENZAR' : (es2v2 ? 'SE NECESITAN 4 JUGADORES EN TOTAL' : 'COMPARTE EL CÓDIGO O EL ENLACE CON TU RIVAL');
    const equipos = document.getElementById('esperandoEquipos');
    if (equipos) {
      if (es2v2 && sala.equipos) {
        const nombres = (equipo) => (sala.equipos[equipo] || []).map((j) => j.nombre).join(' + ') || '—';
        equipos.textContent = `EQUIPO A: ${nombres('A')}  ·  EQUIPO B: ${nombres('B')}`; equipos.hidden = false;
      } else { equipos.hidden = true; }
    }
    this.cargarQrSala(codigo);
  }

  async cargarQrSala(codigo) {
    if (this.ultimoCodigoQr === codigo) return;
    this.ultimoCodigoQr = codigo;
    const img = document.getElementById('qrSala');
    const urlEl = document.getElementById('urlSalaEspera');
    if (img) img.hidden = true;
    if (urlEl) urlEl.textContent = '';
    try {
      const respuesta = await fetch(`/api/salas/${encodeURIComponent(codigo)}/compartir`);
      if (!respuesta.ok) return;
      const datos = await respuesta.json();
      if (!datos.exito) return;
      this.urlSalaActual = datos.url;
      if (urlEl) urlEl.textContent = datos.url;
      if (img) { img.src = datos.qrDataUrl; img.hidden = false; }
    } catch {}
  }

  inicializarEventos() {
    document.getElementById('btnUnirsePorCodigo')?.addEventListener('click', () => {
      document.getElementById('modalContrasenaSala')?.classList.remove('activo');
      this.salaPendienteContrasena = null;
      this.ocultarPaneles();
      document.getElementById('panelBuscarCodigo')?.removeAttribute('hidden');
      document.getElementById('listaSalasContainer')?.removeAttribute('hidden');
      this.marcarActivo('btnUnirsePorCodigo');
      const inp = document.getElementById('inputBuscarCodigo'); if (inp) inp.value = '';
      const errorLobby = document.getElementById('errorLobbyCodigo'); if (errorLobby) errorLobby.hidden = true;
      this.actualizarListaSalas();
    });

    document.getElementById('btnBuscarUnirse')?.addEventListener('click', async () => {
      const codigo = (document.getElementById('inputBuscarCodigo')?.value || '').trim().toUpperCase();
      const errorLobby = document.getElementById('errorLobbyCodigo');
      if (!codigo) { if (errorLobby) { errorLobby.textContent = 'Introduce el ID de la sala.'; errorLobby.hidden = false; } return; }
      if (errorLobby) errorLobby.hidden = true;
      try {
        const res = await clienteMultijugador.buscarSalaPorCodigo(codigo);
        if (res.exito) {
          if (res.sala.conContrasena) {
            this.salaPendienteContrasena = { codigo };
            document.getElementById('modalContrasenaSala')?.classList.add('activo');
            return;
          }
          this.unirseASalaDirecto(codigo);
        } else if (errorLobby) { errorLobby.textContent = res.error || 'No se encontró esa sala'; errorLobby.hidden = false; }
      } catch { if (errorLobby) { errorLobby.textContent = 'Error al conectar con el servidor.'; errorLobby.hidden = false; } }
    });

    document.getElementById('inputBuscarCodigo')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btnBuscarUnirse')?.click(); }
    });

    document.getElementById('btnPartidaRapida')?.addEventListener('click', async () => {
      document.getElementById('modalContrasenaSala')?.classList.remove('activo');
      this.salaPendienteContrasena = null;
      this.ocultarPaneles();
      document.getElementById('listaSalasContainer')?.setAttribute('hidden', 'true');
      document.getElementById('panelPartidaRapida')?.removeAttribute('hidden');
      this.marcarActivo('btnPartidaRapida');
      const modo = document.querySelector('input[name="modoRapida"]:checked')?.value || '1v1';
      const texto = document.getElementById('textoBusquedaRapida');
      if (texto) texto.textContent = modo === '2v2' ? 'BUSCANDO EQUIPO (2 VS 2)...' : 'BUSCANDO OPONENTE ALEATORIO...';
      try {
        const res = await clienteMultijugador.buscarPartidaRapida(modo);
        if (res.exito && res.emparejado && res.codigo) {
          if (this.redirectEnCurso) return;
          this.redirectEnCurso = true;
          window.location.href = `game-online.html?codigo=${encodeURIComponent(res.codigo)}`;
        } else if (!res.exito) {
          document.getElementById('panelPartidaRapida')?.setAttribute('hidden', 'true');
          this.mostrarMensajeVacio(res.error || 'No se pudo buscar partida.');
          document.getElementById('listaSalasContainer')?.removeAttribute('hidden');
        }
      } catch {
        document.getElementById('panelPartidaRapida')?.setAttribute('hidden', 'true');
        this.mostrarMensajeVacio('No se pudo buscar partida. Verifica que el backend esté corriendo.');
        document.getElementById('listaSalasContainer')?.removeAttribute('hidden');
      }
    });

    document.querySelectorAll('input[name="modoRapida"]').forEach((r) => {
      r.addEventListener('change', () => {
        if (this.redirectEnCurso) return;
        const panel = document.getElementById('panelPartidaRapida');
        if (!panel || panel.hidden) return;
        document.getElementById('btnPartidaRapida')?.click();
      });
    });

    document.getElementById('btnCancelarBusqueda')?.addEventListener('click', () => {
      clienteMultijugador.cancelarBusqueda();
      document.getElementById('panelPartidaRapida')?.setAttribute('hidden', 'true');
      document.getElementById('listaSalasContainer')?.removeAttribute('hidden');
      this.marcarActivo('btnUnirsePorCodigo');
      this.actualizarListaSalas();
    });

    document.getElementById('btnSalirEsperando')?.addEventListener('click', () => {
      clienteMultijugador.abandonarSala();
      document.getElementById('panelEsperandoRival')?.setAttribute('hidden', 'true');
      document.getElementById('listaSalasContainer')?.removeAttribute('hidden');
      this.marcarActivo('btnUnirsePorCodigo');
      this.actualizarListaSalas();
    });

    document.getElementById('btnCopiarEnlaceSala')?.addEventListener('click', async (e) => {
      const boton = e.currentTarget; if (!this.urlSalaActual) return;
      try {
        if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(this.urlSalaActual);
        else { const a=document.createElement('textarea'); a.value=this.urlSalaActual; a.style.position='fixed'; a.style.opacity='0'; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
        const t=boton.textContent; boton.textContent='¡COPIADO!'; setTimeout(()=>{boton.textContent=t||'COPIAR ENLACE';},1600);
      } catch { boton.textContent='NO SE PUDO COPIAR'; }
    });

    document.getElementById('btnConfirmarContrasena')?.addEventListener('click', () => {
      const pass = document.getElementById('inputContrasenaUnirse')?.value;
      const sala = this.salaPendienteContrasena;
      if (sala?.codigo) this.unirseASalaDirecto(sala.codigo, pass);
    });
    document.getElementById('btnCancelarContrasena')?.addEventListener('click', () => {
      document.getElementById('modalContrasenaSala')?.classList.remove('activo');
      this.salaPendienteContrasena = null;
    });
  }
}
