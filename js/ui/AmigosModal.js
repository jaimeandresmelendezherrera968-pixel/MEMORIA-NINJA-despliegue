import { BaseModal } from './BaseModal.js';
import { clienteMultijugador } from '../multijugador/ClienteMultijugador.js';
import { socialService } from '../services/SocialService.js';

export class AmigosModal extends BaseModal {
  constructor(modalId, amistadService, clienteSocket = null) {
    super(modalId);
    this.amistadService = amistadService;
    this.clienteSocket = clienteSocket;
    this.resumen = null;
    this.codigoInvitacion = null;
    this.elementos = {
      badge: document.getElementById('amigosBadge'),
      nombre: document.getElementById('amigosMiNombre'),
      codigo: document.getElementById('amigosMiCodigo'),
      copiar: document.getElementById('amigosCopiarCodigo'),
      buscarInput: document.getElementById('amigosBuscarInput'),
      buscarBtn: document.getElementById('amigosBuscarBtn'),
      resultados: document.getElementById('amigosResultados'),
      solicitudes: document.getElementById('amigosSolicitudes'),
      solicitudesVacio: document.getElementById('amigosSolicitudesVacio'),
      enviadas: document.getElementById('amigosEnviadas'),
      enviadasVacio: document.getElementById('amigosEnviadasVacio'),
      lista: document.getElementById('amigosLista'),
      listaVacio: document.getElementById('amigosListaVacio'),
      bloqueados: document.getElementById('amigosBloqueados'),
      bloqueadosVacio: document.getElementById('amigosBloqueadosVacio'),
      aviso: document.getElementById('amigosAviso'),
      cerrar: document.getElementById('closeAmigosBtn'),
    };

    this.#prepararEventos();
    this.#prepararEventosGlobales();
  }

  async abrir() {
    super.abrir();
    try {
      await this.recargar();
    } catch (error) {
      this.#mostrarAviso(error?.message || 'No se pudo cargar tu lista de amigos.', true);
    }
  }

  abrirConCodigo(codigo) {
    this.codigoInvitacion = codigo ? String(codigo) : null;
    this.abrir();
    if (codigo) this.#mostrarAviso(`Compartí el código ${codigo} con tus amigos.`);
  }

  async recargar() {
    const datos = await this.amistadService.obtenerResumen();
    this.#pintarResumen(datos);
    return datos;
  }

  cerrar() {
    super.cerrar();
  }

  #prepararEventos() {
    this.elementos.copiar?.addEventListener('click', () => this.#copiarCodigo());

    this.elementos.buscarBtn?.addEventListener('click', () => this.#buscar());
    this.elementos.buscarInput?.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Enter') return;
      evento.preventDefault();
      this.#buscar();
    });

    this.elementos.resultados?.addEventListener('click', (evento) => {
      const boton = evento.target?.closest?.('button[data-accion="enviar"]');
      if (!boton || boton.disabled) return;
      this.#enviarSolicitud(boton.dataset.termino, boton);
    });

    this.elementos.solicitudes?.addEventListener('click', (evento) => {
      const boton = evento.target?.closest?.('button[data-accion]');
      if (!boton || boton.disabled) return;
      if (boton.dataset.accion === 'aceptar') this.#responderSolicitud(boton.dataset.id, 'aceptar', boton);
      if (boton.dataset.accion === 'rechazar') this.#responderSolicitud(boton.dataset.id, 'rechazar', boton);
    });

    this.elementos.enviadas?.addEventListener('click', (evento) => {
      const boton = evento.target?.closest?.('button[data-accion="cancelar"]');
      if (!boton || boton.disabled) return;
      this.#cancelarSolicitud(boton.dataset.id, boton);
    });

    this.elementos.lista?.addEventListener('click', (evento) => {
      const boton = evento.target?.closest?.('button[data-accion]');
      if (!boton || boton.disabled) return;
      if (boton.dataset.accion === 'eliminar') this.#eliminarAmistad(boton.dataset.id, boton);
      if (boton.dataset.accion === 'invitar') this.#invitarAmigo(boton.dataset.id, boton);
      if (boton.dataset.accion === 'bloquear') this.#bloquearAmigo(boton.dataset.id, boton);
    });

    this.elementos.bloqueados?.addEventListener('click', (evento) => {
      const boton = evento.target?.closest?.('button[data-accion="desbloquear"]');
      if (!boton || boton.disabled) return;
      this.#desbloquearAmigo(boton.dataset.id, boton);
    });
  }

  #prepararEventosGlobales() {
    window.addEventListener('sesion:cambiada', (evento) => {
      this.#alCambiarSesion(evento?.detail?.estado);
    });
    window.addEventListener('amigos:cambios', () => this.#alCambiarListaAmigos());
    window.addEventListener('amigos:presencia-actualizada', () => this.#repintarPresencia());
    this.#alCambiarSesion(window.SesionNinja?.estadoActual?.() || 'desconocido');
  }

  #alCambiarSesion(estado) {
    if (estado === 'activa') {
      this.recargar().catch(() => {});
      socialService.conectar().catch(() => {});
      return;
    }
    if (estado === 'invitado' || estado === 'offline') {
      this.resumen = null;
      this.#actualizarBadge(0);
      this.#mostrarAviso('');
    }
  }

  #alCambiarListaAmigos() {
    this.recargar().catch((error) =>
      this.#mostrarAviso(error?.message || 'No se pudo actualizar la lista de amigos.', true)
    );
  }

  #estaActivo() {
    return Boolean(this.modalElement?.classList.contains('activo'));
  }

  #pintarResumen(datos) {
    this.resumen = datos;
    const perfil = datos.perfil || {};
    const recibidas = datos.solicitudesRecibidas || [];
    const enviadas = datos.solicitudesEnviadas || [];
    const amigos = datos.amigos || [];
    const bloqueados = datos.bloqueados || [];

    if (this.elementos.nombre) this.elementos.nombre.textContent = perfil.usuario || '';
    if (this.elementos.codigo) this.elementos.codigo.textContent = perfil.codigoAmigo || '';
    this.#actualizarUsuarioActivo(perfil);
    this.#actualizarBadge(recibidas.length);

    if (this.elementos.solicitudes) {
      this.elementos.solicitudes.replaceChildren(
        ...recibidas.map((solicitud) => this.#crearFilaSolicitud(solicitud))
      );
    }
    if (this.elementos.solicitudesVacio) this.elementos.solicitudesVacio.hidden = recibidas.length > 0;

    if (this.elementos.enviadas) {
      this.elementos.enviadas.replaceChildren(
        ...enviadas.map((solicitud) => this.#crearFilaEnviada(solicitud))
      );
    }
    if (this.elementos.enviadasVacio) this.elementos.enviadasVacio.hidden = enviadas.length > 0;

    if (this.elementos.lista) {
      this.elementos.lista.replaceChildren(...amigos.map((amigo) => this.#crearFilaAmigo(amigo)));
    }
    if (this.elementos.listaVacio) this.elementos.listaVacio.hidden = amigos.length > 0;

    if (this.elementos.bloqueados) {
      this.elementos.bloqueados.replaceChildren(
        ...bloqueados.map((usuario) => this.#crearFilaBloqueado(usuario))
      );
    }
    if (this.elementos.bloqueadosVacio) this.elementos.bloqueadosVacio.hidden = bloqueados.length > 0;
  }

  #crearFilaSolicitud(solicitud) {
    const emisor = this.#perfilDeSolicitud(solicitud);
    const fila = document.createElement('li');
    fila.className = 'amigos-fila';

    const info = document.createElement('div');
    info.className = 'amigos-fila-info';
    info.append(
      this.#crearTexto('span', 'amigos-fila-nombre', emisor.usuario || 'Shinobi'),
      this.#crearTexto('span', 'amigos-fila-codigo', emisor.codigoAmigo || '')
    );
    const fecha = this.#formatearFecha(solicitud.creadoEn);
    if (fecha) info.append(this.#crearTexto('span', 'amigos-fila-meta', `Enviada: ${fecha}`));

    const acciones = document.createElement('div');
    acciones.className = 'amigos-acciones';
    acciones.append(
      this.#crearBoton('ACEPTAR', 'amigos-btn-aceptar', 'aceptar', solicitud.id),
      this.#crearBoton('RECHAZAR', 'amigos-btn-rechazar', 'rechazar', solicitud.id)
    );

    fila.append(info, acciones);
    return fila;
  }

  #crearFilaEnviada(solicitud) {
    const receptor = this.#perfilDeSolicitud(solicitud);
    const fila = document.createElement('li');
    fila.className = 'amigos-fila';

    const info = document.createElement('div');
    info.className = 'amigos-fila-info';
    info.append(
      this.#crearTexto('span', 'amigos-fila-nombre', receptor.usuario || 'Shinobi'),
      this.#crearTexto('span', 'amigos-fila-codigo', receptor.codigoAmigo || '')
    );
    const fecha = this.#formatearFecha(solicitud.creadoEn);
    if (fecha) info.append(this.#crearTexto('span', 'amigos-fila-meta', `Enviada: ${fecha}`));

    fila.append(info, this.#crearBoton('CANCELAR', 'amigos-btn-cancelar', 'cancelar', solicitud.id));
    return fila;
  }

  #crearFilaAmigo(amigo) {
    const fila = document.createElement('li');
    fila.className = 'amigos-fila';
    fila.dataset.idAmigo = String(amigo.id || '');

    const info = document.createElement('div');
    info.className = 'amigos-fila-info';
    const nombreFila = document.createElement('span');
    nombreFila.className = 'amigos-fila-nombre';
    const punto = document.createElement('span');
    punto.className = `amigos-presencia amigos-presencia--${socialService.estadoPresencia(amigo.id)}`;
    punto.setAttribute('aria-label', socialService.estadoPresencia(amigo.id) === 'online' ? 'En línea' : 'Desconectado');
    nombreFila.append(punto, document.createTextNode(` ${amigo.usuario || 'Shinobi'}`));
    info.append(
      nombreFila,
      this.#crearTexto('span', 'amigos-fila-codigo', amigo.codigoAmigo || '')
    );
    const fecha = this.#formatearFecha(amigo.desde);
    if (fecha) info.append(this.#crearTexto('span', 'amigos-fila-meta', `Amigos desde: ${fecha}`));

    const acciones = document.createElement('div');
    acciones.className = 'amigos-acciones';
    acciones.append(
      this.#crearBoton('INVITAR', 'amigos-btn-invitar', 'invitar', amigo.id),
      this.#crearBoton('ELIMINAR', 'amigos-btn-eliminar', 'eliminar', amigo.id),
      this.#crearBoton('BLOQUEAR', 'amigos-btn-bloquear', 'bloquear', amigo.id)
    );

    fila.append(info, acciones);
    return fila;
  }

  #crearFilaBloqueado(usuario) {
    const fila = document.createElement('li');
    fila.className = 'amigos-fila';

    const info = document.createElement('div');
    info.className = 'amigos-fila-info';
    info.append(
      this.#crearTexto('span', 'amigos-fila-nombre', usuario.usuario || 'Shinobi'),
      this.#crearTexto('span', 'amigos-fila-codigo', usuario.codigoAmigo || '')
    );

    fila.append(info, this.#crearBoton('DESBLOQUEAR', 'amigos-btn-desbloquear', 'desbloquear', usuario.id));
    return fila;
  }

  #crearFilaResultado(resultado) {
    const fila = document.createElement('li');
    fila.className = 'amigos-fila';

    const info = document.createElement('div');
    info.className = 'amigos-fila-info';
    info.append(
      this.#crearTexto('span', 'amigos-fila-nombre', resultado.usuario || 'Shinobi'),
      this.#crearTexto('span', 'amigos-fila-codigo', resultado.codigoAmigo || '')
    );

    const propio = this.#mismoUsuario(resultado, this.resumen?.perfil || {});
    const yaEsAmigo = (this.resumen?.amigos || []).some((amigo) =>
      this.#mismoUsuario(resultado, amigo)
    );
    const pendiente = this.#estaPendiente(resultado);

    const boton = this.#crearBoton(
      propio ? 'TÚ' : yaEsAmigo ? 'YA ES AMIGO' : pendiente ? 'PENDIENTE' : 'ENVIAR SOLICITUD',
      'amigos-btn-enviar',
      'enviar',
      resultado.usuario || ''
    );
    boton.dataset.termino = resultado.codigoAmigo || resultado.usuario || '';
    boton.disabled = propio || yaEsAmigo || pendiente;

    fila.append(info, boton);
    return fila;
  }

  #repintarPresencia() {
    if (!this.elementos.lista || !this.resumen) return;
    for (const fila of this.elementos.lista.querySelectorAll('.amigos-fila[data-id-amigo]')) {
      const id = fila.dataset.idAmigo;
      const punto = fila.querySelector('.amigos-presencia');
      if (!punto) continue;
      const estado = socialService.estadoPresencia(id);
      punto.className = `amigos-presencia amigos-presencia--${estado}`;
      punto.setAttribute('aria-label', estado === 'online' ? 'En línea' : 'Desconectado');
    }
  }

  #crearTexto(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    elemento.className = clase;
    elemento.textContent = String(texto ?? '');
    return elemento;
  }

  #crearBoton(texto, clase, accion, id) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = `amigos-btn ${clase}`;
    boton.textContent = texto;
    boton.dataset.accion = accion;
    boton.dataset.id = String(id ?? '');
    return boton;
  }

  #mismoUsuario(uno, otro) {
    if (!uno || !otro) return false;
    if (uno.id != null && otro.id != null && String(uno.id) === String(otro.id)) return true;
    const codigoUno = uno.codigoAmigo || uno.codigo;
    const codigoOtro = otro.codigoAmigo || otro.codigo;
    return Boolean(codigoUno && codigoOtro && codigoUno === codigoOtro);
  }

  #perfilDeSolicitud(solicitud) {
    if (solicitud?.emisor) return solicitud.emisor;
    if (solicitud?.receptor) return solicitud.receptor;
    return {
      id: solicitud?.usuarioId ?? solicitud?.desde,
      usuario: solicitud?.usuario,
      codigoAmigo: solicitud?.codigoAmigo,
    };
  }

  #otroDeSolicitud(solicitud) {
    return this.#perfilDeSolicitud(solicitud);
  }

  #estaPendiente(usuario) {
    const recibidas = this.resumen?.solicitudesRecibidas || [];
    const enviadas = this.resumen?.solicitudesEnviadas || [];
    return (
      recibidas.some((solicitud) =>
        this.#mismoUsuario(usuario, this.#otroDeSolicitud(solicitud))
      ) ||
      enviadas.some((solicitud) =>
        this.#mismoUsuario(usuario, this.#otroDeSolicitud(solicitud))
      )
    );
  }

  #formatearFecha(valor) {
    if (!valor) return '';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return String(valor);
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  #mostrarAviso(texto, esError = false) {
    if (!this.elementos.aviso) return;
    const mensaje = String(texto || '');
    this.elementos.aviso.textContent = mensaje;
    this.elementos.aviso.hidden = !mensaje;
    this.elementos.aviso.setAttribute('role', mensaje && esError ? 'alert' : 'status');
  }

  #actualizarBadge(cantidad) {
    if (!this.elementos.badge) return;
    const total = Math.max(0, Number(cantidad) || 0);
    this.elementos.badge.textContent = String(total);
    this.elementos.badge.hidden = total === 0;
    const boton = document.getElementById('btnAmigos');
    if (boton) {
      boton.setAttribute(
        'aria-label',
        total === 0
          ? 'Amigos - Invitar jugadores'
          : `Amigos - ${total} solicitudes nuevas`
      );
    }
  }

  async #copiarCodigo() {
    const codigo =
      this.resumen?.perfil?.codigoAmigo || this.elementos.codigo?.textContent?.trim() || '';
    if (!codigo) {
      this.#mostrarAviso('Todavía no tenés un ID público.');
      return;
    }

    try {
      await navigator.clipboard.writeText(codigo);
      this.#mostrarAviso('ID público copiado.');
      return;
    } catch (error) {}

    const temporal = document.createElement('textarea');
    temporal.value = codigo;
    temporal.setAttribute('readonly', '');
    temporal.className = 'amigos-copiar-temporal';
    document.body.append(temporal);
    temporal.select();
    try {
      document.execCommand('copy');
      this.#mostrarAviso('ID público copiado.');
    } catch (error) {
      this.#mostrarAviso('No se pudo copiar el ID público.', true);
    }
    temporal.remove();
  }

  async #buscar() {
    const termino = this.elementos.buscarInput?.value.trim() || '';
    if (!termino) {
      this.#pintarResultados([]);
      this.#mostrarAviso('Escribí un nombre o un ID tipo NJ-XXXXXXXX.');
      return;
    }

    this.#mostrarAviso('Buscando shinobis...');
    try {
      const datos = await this.amistadService.buscar(termino);
      this.#pintarResultados(datos.resultados || []);
      this.#mostrarAviso('');
    } catch (error) {
      this.#pintarResultados([]);
      this.#mostrarAviso(error?.message || 'No se pudo realizar la búsqueda.', true);
    }
  }

  #pintarResultados(resultados) {
    if (!this.elementos.resultados) return;
    if (!resultados.length) {
      const vacio = this.#crearTexto('li', 'amigos-vacio', 'No se encontraron jugadores.');
      this.elementos.resultados.replaceChildren(vacio);
      return;
    }
    this.elementos.resultados.replaceChildren(
      ...resultados.map((resultado) => this.#crearFilaResultado(resultado))
    );
  }

  async #enviarSolicitud(termino, boton) {
    if (!termino) return;
    boton.disabled = true;
    try {
      await this.amistadService.enviarSolicitud(termino);
      this.#mostrarAviso('Solicitud enviada.');
      await this.recargar();
    } catch (error) {
      this.#mostrarAviso(error?.message || 'No se pudo enviar la solicitud.', true);
      boton.disabled = false;
    }
  }

  async #responderSolicitud(id, accion, boton) {
    if (!id) return;
    boton.disabled = true;
    try {
      if (accion === 'aceptar') await this.amistadService.aceptarSolicitud(id);
      else await this.amistadService.rechazarSolicitud(id);
      this.#mostrarAviso(accion === 'aceptar' ? 'Solicitud aceptada.' : 'Solicitud rechazada.');
      await this.recargar();
    } catch (error) {
      this.#mostrarAviso(error?.message || 'No se pudo responder la solicitud.', true);
      boton.disabled = false;
    }
  }

  async #cancelarSolicitud(id, boton) {
    if (!id) return;
    boton.disabled = true;
    try {
      await this.amistadService.cancelarSolicitud(id);
      this.#mostrarAviso('Solicitud cancelada.');
      await this.recargar();
    } catch (error) {
      this.#mostrarAviso(error?.message || 'No se pudo cancelar la solicitud.', true);
      boton.disabled = false;
    }
  }

  async #eliminarAmistad(id, boton) {
    if (!id) return;
    boton.disabled = true;
    try {
      await this.amistadService.eliminarAmistad(id);
      this.#mostrarAviso('Amistad eliminada.');
      await this.recargar();
    } catch (error) {
      this.#mostrarAviso(error?.message || 'No se pudo eliminar la amistad.', true);
      boton.disabled = false;
    }
  }

  async #invitarAmigo(id, boton) {
    if (!id) return;
    boton.disabled = true;
    try {
      let codigo = this.codigoInvitacion || clienteMultijugador.codigoSala;
      if (!codigo) {
        const sala = await clienteMultijugador.crearSala({ config: { modo: '1v1' } });
        if (!sala?.exito) throw new Error(sala?.error || 'No se pudo crear la sala.');
        codigo = sala.codigo;
      }
      const respuesta = await clienteMultijugador.invitarAmigo(id, codigo);
      if (!respuesta?.exito) throw new Error(respuesta?.error || 'No se pudo enviar la invitación.');
      this.#mostrarAviso(`Invitación enviada a la sala ${codigo}.`);
    } catch (error) {
      this.#mostrarAviso(error?.message || 'No se pudo invitar a tu amigo.', true);
    } finally {
      boton.disabled = false;
    }
  }

  async #bloquearAmigo(id, boton) {
    if (!id) return;
    boton.disabled = true;
    try {
      await this.amistadService.bloquear(id);
      this.#mostrarAviso('Usuario bloqueado.');
      await this.recargar();
    } catch (error) {
      this.#mostrarAviso(error?.message || 'No se pudo bloquear al usuario.', true);
      boton.disabled = false;
    }
  }

  async #desbloquearAmigo(id, boton) {
    if (!id) return;
    boton.disabled = true;
    try {
      await this.amistadService.desbloquear(id);
      this.#mostrarAviso('Usuario desbloqueado.');
      await this.recargar();
    } catch (error) {
      this.#mostrarAviso(error?.message || 'No se pudo desbloquear al usuario.', true);
      boton.disabled = false;
    }
  }

  #actualizarUsuarioActivo(perfil, idPropio = null) {
    if (!perfil?.id) return;
    let actual;
    try {
      actual = JSON.parse(localStorage.getItem('usuarioActivo') || 'null');
    } catch (error) {
      return;
    }
    const idConocido = idPropio ?? actual?.id ?? this.resumen?.perfil?.id;
    if (!actual || idConocido == null || String(idConocido) !== String(perfil.id)) return;
    localStorage.setItem(
      'usuarioActivo',
      JSON.stringify({
        ...actual,
        id: perfil.id,
        usuario: perfil.usuario,
        nombre: perfil.usuario,
        codigoAmigo: perfil.codigoAmigo,
      })
    );
  }
}
