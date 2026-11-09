import { BaseModal } from './BaseModal.js';

export class GameModeModal extends BaseModal {
  constructor(modalId) {
    super(modalId);
  }

  inicializarOpciones() {
    const rutas = {
      // ENCONTRAR PARES pasa por el mapa de zonas (niveles.html); al elegir
      // zona, niveles.js guarda nivelActual y va a pre-partida.html, que
      // deriva al juego de esa aldea. (pares.html quedó sin entrada: Parte 6.)
      btnEncontrarPares: { subModoJuego: 'pares', href: 'niveles.html' },
      btnMemoria: { subModoJuego: 'memoria', href: 'orden.html', sesion: { iniciarMusica: 'si' } },
      btnCarpetas: { subModoJuego: 'carpetas', href: 'Agrupar/facil.html' },
      btnMuerte: { subModoJuego: 'muerte', href: 'muerte.html' }
    };

    Object.entries(rutas).forEach(([id, opcion]) => {
      document.getElementById(id)?.addEventListener('click', () => {
        localStorage.setItem('subModoJuego', opcion.subModoJuego);
        Object.entries(opcion.sesion ?? {}).forEach(([clave, valor]) =>
          sessionStorage.setItem(clave, valor)
        );
        window.location.href = opcion.href;
      });
    });
  }
}