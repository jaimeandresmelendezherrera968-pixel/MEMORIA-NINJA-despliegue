import { BaseModal } from './BaseModal.js';
import { clienteMultijugador } from '../multijugador/ClienteMultijugador.js';

export class MultijugadorModal extends BaseModal {
  constructor(modalId) {
    super(modalId);
    this.ultimoCodigoQr = null;
    this.urlSalaActual = null;
    this.redirectEnCurso = false;
    this.configurarSocket();
    this.inicializarEventos();
    this.inicializarCrearSala();
  }

  configurarSocket() {
    clienteMultijugador.on('sala-actualizada', (sala) => {
      if (sala?.codigo) this.actualizarPanelEspera(sala);
    });
    clienteMultijugador.on('partida-iniciada', (datos) => {
      if (this.redirectEnCurso) return;
      this.redirectEnCurso = true;
      document.getElementById('panelEsperandoRivalVerde')?.setAttribute('hidden', 'true');
      const codigo = datos?.codigo || clienteMultijugador.codigoSala || '';
      window.location.href = `game-online.html?codigo=${encodeURIComponent(codigo)}`;
    });
  }

  ocultarTodo() {
    document.getElementById('panelCrearSalaVerde')?.setAttribute('hidden', 'true');
    document.getElementById('panelEsperandoRivalVerde')?.setAttribute('hidden', 'true');
  }

  marcarActivo(id) {
    ['btnCrearSalaVerdeModal', 'btnInvitarAmigosVerdeModal'].forEach(btnId => {
      document.getElementById(btnId)?.classList.remove('btn-lobby-activo');
    });
    if (id) document.getElementById(id)?.classList.add('btn-lobby-activo');
  }

  async abrir() {
    super.abrir();
    this.redirectEnCurso = false;
    this.ultimoCodigoQr = null;
    this.urlSalaActual = null;
    try {
      await clienteMultijugador.conectar();
    } catch (error) {
      alert('El multijugador requiere el backend corriendo (npm start).');
      this.cerrar();
      return;
    }
    this.ocultarTodo();
    this.marcarActivo('btnCrearSalaVerdeModal');
    document.getElementById('panelCrearSalaVerde')?.removeAttribute('hidden');
    const errorCrear = document.getElementById('errorCrearSalaVerde');
    if (errorCrear) { errorCrear.hidden = true; errorCrear.textContent = ''; }
  }

  inicializarCrearSala() {
    document.querySelectorAll('input[name="tipoMazoVerde"]').forEach(r => {
      r.addEventListener('change', () => {
        const esAldea = document.querySelector('input[name="tipoMazoVerde"]:checked')?.value === 'aldea';
        document.getElementById('filaAldeaVerde')?.toggleAttribute('hidden', !esAldea);
        document.getElementById('filaAldeasMezclaVerde')?.toggleAttribute('hidden', esAldea);
        const selectPares = document.getElementById('selectParesVerde');
        if (esAldea) {
          selectPares.innerHTML = '<option value="8">8 PAREJAS (16 CARTAS)</option>';
          selectPares.value = '8';
        } else {
          selectPares.innerHTML = `
            <option value="8">8 PAREJAS (16 CARTAS)</option>
            <option value="10">10 PAREJAS (20 CARTAS)</option>
            <option value="12">12 PAREJAS (24 CARTAS)</option>
            <option value="14">14 PAREJAS (28 CARTAS)</option>
            <option value="16">16 PAREJAS (32 CARTAS)</option>
          `;
        }
      });
    });
    document.getElementById('chkContrasenaVerde')?.addEventListener('change', (e) => {
      document.getElementById('inputContrasenaSalaVerde')?.toggleAttribute('hidden', !e.target.checked);
    });

    document.getElementById('btnCrearSalaVerdeModal')?.addEventListener('click', () => {
      this.ocultarTodo();
      this.marcarActivo('btnCrearSalaVerdeModal');
      document.getElementById('panelCrearSalaVerde')?.removeAttribute('hidden');
      const errorCrear = document.getElementById('errorCrearSalaVerde');
      if (errorCrear) { errorCrear.hidden = true; errorCrear.textContent = ''; }
    });

    document.getElementById('btnConfirmarCrearSalaVerde')?.addEventListener('click', async () => {
      const errorCrear = document.getElementById('errorCrearSalaVerde');
      if (errorCrear) { errorCrear.hidden = true; errorCrear.textContent = ''; }
      try {
        await clienteMultijugador.conectar();
      } catch (error) {
        if (errorCrear) { errorCrear.textContent = 'No se pudo conectar con el servidor de salas.'; errorCrear.hidden = false; }
        return;
      }
      const mezclarAldeas = document.querySelector('input[name="tipoMazoVerde"]:checked')?.value === 'mezclar';
      const aldea = document.getElementById('selectAldeaVerde')?.value;
      const modo = document.querySelector('input[name="modoPartidaVerde"]:checked')?.value || '1v1';
      if (!modo) {
        if (errorCrear) { errorCrear.textContent = 'Selecciona el modo de partida (1 VS 1 o 2 VS 2)'; errorCrear.hidden = false; }
        return;
      }
      let pares = parseInt(document.getElementById('selectParesVerde')?.value || '8');
      if (!mezclarAldeas) pares = 8;
      const publica = document.querySelector('input[name="tipoSalaVerde"]:checked')?.value === 'publica';
      const conPass = document.getElementById('chkContrasenaVerde')?.checked;
      const contrasena = conPass ? document.getElementById('inputContrasenaSalaVerde')?.value || '' : null;
      if (conPass && !String(contrasena).trim()) {
        if (errorCrear) { errorCrear.textContent = 'Introduce una contraseña para la sala privada.'; errorCrear.hidden = false; }
        return;
      }
      let aldeasSeleccionadas = [];
      if (mezclarAldeas) {
        document.querySelectorAll('.chk-aldea-verde:checked').forEach(chk => {
          if (chk.value) aldeasSeleccionadas.push(chk.value);
        });
        if (aldeasSeleccionadas.length === 0) {
          if (errorCrear) { errorCrear.textContent = 'Selecciona al menos una aldea o clan para mezclar.'; errorCrear.hidden = false; }
          return;
        }
      }
      let res;
      try {
        res = await clienteMultijugador.crearSala({ publica, contrasena: conPass ? contrasena : null, config: { modo, mezclarAldeas, aldea, pares, aldeasSeleccionadas } });
      } catch {
        if (errorCrear) { errorCrear.textContent = 'No se pudo crear la sala. Verifica que el backend esté corriendo.'; errorCrear.hidden = false; }
        return;
      }
      if (res.exito) {
        document.getElementById('panelCrearSalaVerde')?.setAttribute('hidden', 'true');
        this.mostrarPanelEspera(res.codigo, res.sala || { modo, capacidad: modo === '2v2' ? 4 : 2, jugadores: 1 });
      } else {
        if (errorCrear) { errorCrear.textContent = res.error || 'No se pudo crear la sala.'; errorCrear.hidden = false; }
      }
    });



    document.getElementById('btnInvitarAmigosVerdeModal')?.addEventListener('click', () => {
      const panelEspera = document.getElementById('panelEsperandoRivalVerde');
      const codigo = document.getElementById('codigoSalaEsperaVerde')?.textContent;
      if (panelEspera && !panelEspera.hidden && codigo && codigo !== '----') {
        this.ocultarTodo();
        this.marcarActivo('btnInvitarAmigosVerdeModal');
        panelEspera.removeAttribute('hidden');
        return;
      }
      alert('Crea una sala primero para poder invitar amigos.');
    });

    document.getElementById('btnSalirEsperandoVerde')?.addEventListener('click', () => {
      clienteMultijugador.abandonarSala();
      document.getElementById('panelEsperandoRivalVerde')?.setAttribute('hidden', 'true');
      this.ocultarTodo();
      this.marcarActivo('btnCrearSalaVerdeModal');
      document.getElementById('panelCrearSalaVerde')?.removeAttribute('hidden');
    });

    document.getElementById('btnCopiarCodigoSalaVerde')?.addEventListener('click', async (evento) => {
      const boton = evento.currentTarget;
      const codigo = document.getElementById('codigoSalaEsperaVerde')?.textContent;
      if (!codigo || codigo === '----') return;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(codigo);
        } else {
          const area = document.createElement('textarea');
          area.value = codigo;
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
        }
        const textoOriginal = boton.textContent;
        boton.textContent = '¡COPIADO!';
        setTimeout(() => { boton.textContent = textoOriginal; }, 1600);
      } catch {
        boton.textContent = 'NO SE PUDO COPIAR';
        setTimeout(() => { boton.textContent = 'COPIAR CÓDIGO'; }, 1600);
      }
    });

    document.getElementById('btnCopiarEnlaceSalaVerde')?.addEventListener('click', async (evento) => {
      const boton = evento.currentTarget;
      if (!this.urlSalaActual) return;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(this.urlSalaActual);
        } else {
          const area = document.createElement('textarea');
          area.value = this.urlSalaActual;
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          document.execCommand('copy');
          area.remove();
        }
        const textoOriginal = boton.textContent;
        boton.textContent = '¡COPIADO!';
        setTimeout(() => { boton.textContent = textoOriginal; }, 1600);
      } catch {
        boton.textContent = 'NO SE PUDO COPIAR';
        setTimeout(() => { boton.textContent = 'COPIAR ENLACE'; }, 1600);
      }
    });
  }

  mostrarPanelEspera(codigo, sala = {}) {
    this.ultimoCodigoQr = null;
    this.ocultarTodo();
    this.marcarActivo('btnInvitarAmigosVerdeModal');
    document.getElementById('panelEsperandoRivalVerde')?.removeAttribute('hidden');
    this.actualizarPanelEspera({ ...sala, codigo: codigo || sala.codigo });
  }

  actualizarPanelEspera(sala) {
    const codigo = String(sala?.codigo || '').toUpperCase();
    const panel = document.getElementById('panelEsperandoRivalVerde');
    if (!codigo) return;

    const capacidad = Number(sala.capacidad) || (sala.modo === '2v2' ? 4 : 2);
    const ocupados = Number(sala.jugadores) || 0;
    const faltan = Math.max(0, capacidad - ocupados);
    const es2v2 = sala.modo === '2v2' || capacidad === 4;
    const codigoEl = document.getElementById('codigoSalaEsperaVerde');
    if (codigoEl) codigoEl.textContent = codigo;

    const titulo = document.getElementById('esperandoTituloVerde');
    if (titulo) {
      titulo.textContent = faltan === 0
        ? 'SALA COMPLETA · INICIANDO...'
        : es2v2
          ? `ESPERANDO JUGADORES (${ocupados}/${capacidad})...`
          : 'ESPERANDO RIVAL...';
    }

    const info = document.getElementById('esperandoInfoVerde');
    if (info) {
      info.textContent = faltan === 0
        ? 'LA PARTIDA ESTÁ POR COMENZAR'
        : es2v2
          ? 'SE NECESITAN 4 JUGADORES EN TOTAL - PUEDES INVITAR AMIGOS'
          : 'COMPARTE EL CÓDIGO O EL ENLACE PARA INVITAR A TU AMIGO';
    }

    const equipos = document.getElementById('esperandoEquiposVerde');
    if (equipos) {
      if (es2v2 && sala.equipos) {
        const nombres = (equipo) => (sala.equipos[equipo] || []).map((j) => j.nombre).join(' + ') || '—';
        equipos.textContent = `EQUIPO A: ${nombres('A')}  ·  EQUIPO B: ${nombres('B')}`;
        equipos.hidden = false;
      } else {
        equipos.hidden = true;
      }
    }

    this.cargarQrSala(codigo);
  }

  async cargarQrSala(codigo) {
    if (this.ultimoCodigoQr === codigo) return;
    this.ultimoCodigoQr = codigo;

    const img = document.getElementById('qrSalaVerde');
    const urlEl = document.getElementById('urlSalaEsperaVerde');
    if (img) img.hidden = true;
    if (urlEl) urlEl.textContent = '';

    try {
      const respuesta = await fetch(`/api/salas/${encodeURIComponent(codigo)}/compartir`);
      if (!respuesta.ok) return;
      const datos = await respuesta.json();
      if (!datos.exito) return;
      this.urlSalaActual = datos.url;
      if (urlEl) urlEl.textContent = datos.url;
      if (img) {
        img.src = datos.qrDataUrl;
        img.hidden = false;
      }
    } catch {
      // Sin backend no hay QR
    }
  }

  inicializarEventos() {
    document.getElementById('closeMultijugadorModalBtn')?.addEventListener('click', () => {
      try { clienteMultijugador.cancelarBusqueda(); } catch (e) {}
      this.cerrar();
    });
  }
}
