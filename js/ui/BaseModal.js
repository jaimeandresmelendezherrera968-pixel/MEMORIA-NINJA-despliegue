const ELEMENTOS_FOCUSABLES = [
  'a[href]',
  'button:not([disabled])',
  'summary',
  'textarea:not([disabled])',
  'input[type="text"]:not([disabled])',
  'input[type="radio"]:not([disabled])',
  'input[type="checkbox"]:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])'
].join(', ');

export class BaseModal {
  constructor(modalId) {
    this.modalElement = document.getElementById(modalId);
    this._manejarTecla = this._manejarTecla.bind(this);
    this.initBaseEvents();
  }

  abrir() {
    if (!this.modalElement) return;

    const focoAnterior = document.activeElement;
    this._focoAnterior = focoAnterior;

    this.modalElement.classList.add('activo');
    this.modalElement.setAttribute('aria-hidden', 'false');
    this.modalElement.setAttribute('role', 'dialog');
    this.modalElement.setAttribute('aria-modal', 'true');
    this.modalElement.addEventListener('keydown', this._manejarTecla);

    const elementos = this.modalElement.querySelectorAll(ELEMENTOS_FOCUSABLES);
    if (elementos.length > 0) {
      setTimeout(() => elementos[0].focus(), 0);
    } else {
      this.modalElement.setAttribute('tabindex', '-1');
      setTimeout(() => this.modalElement.focus(), 0);
    }
  }

  cerrar() {
    if (!this.modalElement) return;

    this.modalElement.classList.remove('activo');
    this.modalElement.setAttribute('aria-hidden', 'true');
    this.modalElement.removeAttribute('role');
    this.modalElement.removeAttribute('aria-modal');
    this.modalElement.removeEventListener('keydown', this._manejarTecla);

    if (this._focoAnterior && typeof this._focoAnterior.focus === 'function') {
      this._focoAnterior.focus();
    }
  }

  _manejarTecla(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cerrar();
      return;
    }

    if (event.key === 'Tab') {
      const elementos = this.modalElement.querySelectorAll(ELEMENTOS_FOCUSABLES);
      if (elementos.length === 0) return;

      const primerElemento = elementos[0];
      const ultimoElemento = elementos[elementos.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === primerElemento) {
          event.preventDefault();
          ultimoElemento.focus();
        }
      } else {
        if (document.activeElement === ultimoElemento) {
          event.preventDefault();
          primerElemento.focus();
        }
      }
    }
  }

  initBaseEvents() {
    if (!this.modalElement) return;

    this.modalElement.setAttribute('aria-hidden', 'true');

    window.addEventListener('click', (e) => {
      if (e.target === this.modalElement) {
        this.cerrar();
      }
    });
  }
}