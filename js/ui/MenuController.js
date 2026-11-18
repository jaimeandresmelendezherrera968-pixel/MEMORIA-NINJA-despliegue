export class MenuController {
  constructor(modales) {
    this.modales = modales;
    this.registroElementos = new Map();
    this.registrarElementosModal();
  }

  // El controlador no toca el DOM de los modales (SRP):
  // solo conoce la abstracción abrir()/cerrar() (DIP/LSP).
  registrarElementosModal() {
    Object.values(this.modales).forEach(modal => {
      if (modal?.modalElement) {
        this.registroElementos.set(modal.modalElement, modal);
        modal.modalElement.setAttribute('aria-hidden', 'true');
      }
    });
  }

  abrirModal(modal) {
    modal?.abrir();
  }

  // Funciones que requieren sesión (perfil/ranking/historial).
  // En modo invitado u offline se cancela la acción y se avisa al usuario.
  // Devuelve true si la acción debe cancelarse.
  estaBloqueado(motivo) {
    const sesion = window.SesionNinja;
    const estado = sesion?.estadoActual?.() || 'desconocido';
    if (estado === 'activa' || estado === 'desconocido') return false;
    sesion?.avisarInvitado?.(motivo);
    return true;
  }

  // Aplica estado visual a elementos bloqueados para invitados
  aplicarEstadosInvitado() {
    const sesion = window.SesionNinja;
    const estado = sesion?.estadoActual?.() || 'desconocido';
    const bloquear = estado !== 'activa' && estado !== 'desconocido';

    const aplicar = (elemento, mensaje) => {
      if (!elemento) return;
      elemento.classList.toggle('bloqueado-invitado', bloquear);
      if (bloquear) {
        elemento.setAttribute('title', mensaje);
        elemento.setAttribute('aria-disabled', 'true');
      } else {
        elemento.removeAttribute('title');
        elemento.removeAttribute('aria-disabled');
      }
    };

    aplicar(document.querySelector('.perfil-panel'), 'Inicia sesión para ver tu perfil');
    aplicar(document.querySelector('.ranking-panel'), 'Inicia sesión para ver el ranking');
    document.querySelectorAll('.contenedor-inferior .item').forEach(item => {
      if (item.innerText.toLowerCase().includes('historial')) {
        aplicar(item, 'Inicia sesión para ver tu historial');
      }
    });
    aplicar(document.getElementById('btnAmigos'), 'Inicia sesión para gestionar tus amigos');
  }

  cerrarModalDesdeElemento(elemento) {
    const contenedor = elemento.closest('.modal-overlay, .modal-historial');
    const modal = contenedor ? this.registroElementos.get(contenedor) : null;
    modal?.cerrar();
  }

  inicializarEventos() {
    this.aplicarEstadosInvitado();
    window.addEventListener('sesion:cambiada', () => this.aplicarEstadosInvitado());

    // 1. Perfil (Arriba Izquierda)
    document.querySelector('.perfil-panel')?.addEventListener('click', () => {
      if (document.querySelector('.perfil-panel')?.classList.contains('bloqueado-invitado')) {
        this.estaBloqueado('ver tu perfil');
        return;
      }
      if (this.estaBloqueado('ver tu perfil')) return;
      this.abrirModal(this.modales.profileModal);
    });

    // 2. Un Jugador (Tarjeta Azul)
    document.querySelector('.panel.azul')?.addEventListener('click', () => {
      this.abrirModal(this.modales.gameModeModal);
    });

    // 3. Dos Jugadores (Tarjeta Morada) - solo unirse a salas
    document.querySelector('.panel.morado')?.addEventListener('click', async () => {
      const modal = this.modales.dosJugadoresModal;
      if (modal?.abrirUnirseDirecto) {
        await modal.abrirUnirseDirecto();
        return;
      }
      this.abrirModal(modal);
    });

    // 4. Multijugador (Tarjeta Verde) — lobby online real (Socket.io)
    document.querySelector('.panel.verde')?.addEventListener('click', async () => {
      const modal = this.modales.multijugadorModal;
      if (modal?.abrir) {
        await modal.abrir();
        return;
      }
      this.abrirModal(modal);
    });

    // 5. Ranking (Boton Arriba Derecha)
    document.querySelector('.ranking-panel')?.addEventListener('click', () => {
      if (document.querySelector('.ranking-panel')?.classList.contains('bloqueado-invitado')) {
        this.estaBloqueado('ver el ranking');
        return;
      }
      if (this.estaBloqueado('ver el ranking')) return;
      this.abrirModal(this.modales.rankingModal);
    });

    // 5b. Configuracion (Boton Arriba Derecha)
    document.querySelector('.menu-superior')?.addEventListener('click', () => {
      this.abrirModal(this.modales.configModal);
    });

    // 6. Botones de la Barra Inferior (Historial, Puntaje, etc.)
    document.querySelectorAll('.contenedor-inferior .item').forEach(item => {
      item.addEventListener('click', () => {
        const texto = item.innerText.toLowerCase();
        if (texto.includes('historial')) {
          if (item.classList.contains('bloqueado-invitado')) {
            this.estaBloqueado('ver tu historial');
            return;
          }
          if (this.estaBloqueado('ver tu historial')) return;
          this.abrirModal(this.modales.historyModal);
        } else if (texto.includes('puntaje')) {
          this.abrirModal(this.modales.puntajeModal);
        }
      });
    });

    const btnAmigos = document.getElementById('btnAmigos');
    const abrirAmigos = () => {
      const estado = window.SesionNinja?.estadoActual?.() || 'desconocido';
      if (estado === 'desconocido') {
        window.SesionNinja?.avisarInvitado?.('gestionar tus amigos');
        return;
      }
      if (this.estaBloqueado('gestionar tus amigos')) return;
      this.abrirModal(this.modales.amigosModal);
    };
    btnAmigos?.addEventListener('click', abrirAmigos);
    btnAmigos?.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Enter' && evento.key !== ' ') return;
      evento.preventDefault();
      abrirAmigos();
    });

    // 7. Cierre global delegado: cada boton invoca cerrar() del modal correspondiente
    document.addEventListener('click', (e) => {
      const esBotonCerrar =
        e.target.classList.contains('cerrar-modal') ||
        e.target.classList.contains('btn-volver-modal') ||
        e.target.classList.contains('historial-cerrar') ||
        e.target.classList.contains('btn-volver-info');

      if (esBotonCerrar) {
        this.cerrarModalDesdeElemento(e.target);
      }
    });
  }
}