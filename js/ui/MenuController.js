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
    if (estado === 'activa' || estado === 'desconocido') return;

    // Bloquear perfil, ranking, historial
    const perfilPanel = document.querySelector('.perfil-panel');
    if (perfilPanel) {
      perfilPanel.classList.add('bloqueado-invitado');
      perfilPanel.setAttribute('title', 'Inicia sesión para ver tu perfil');
      perfilPanel.setAttribute('aria-disabled', 'true');
    }

    const rankingPanel = document.querySelector('.ranking-panel');
    if (rankingPanel) {
      rankingPanel.classList.add('bloqueado-invitado');
      rankingPanel.setAttribute('title', 'Inicia sesión para ver el ranking');
      rankingPanel.setAttribute('aria-disabled', 'true');
    }

    document.querySelectorAll('.contenedor-inferior .item').forEach(item => {
      const texto = item.innerText.toLowerCase();
      if (texto.includes('historial')) {
        item.classList.add('bloqueado-invitado');
        item.setAttribute('title', 'Inicia sesión para ver tu historial');
        item.setAttribute('aria-disabled', 'true');
      }
    });
  }

  cerrarModalDesdeElemento(elemento) {
    const contenedor = elemento.closest('.modal-overlay, .modal-historial');
    const modal = contenedor ? this.registroElementos.get(contenedor) : null;
    modal?.cerrar();
  }

  inicializarEventos() {
    this.aplicarEstadosInvitado();

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