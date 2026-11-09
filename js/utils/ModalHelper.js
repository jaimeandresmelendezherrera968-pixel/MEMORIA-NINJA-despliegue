/*=========================================================
  MEMORIA NINJA
  CAPA: UTILIDADES (helpers de presentación, sin lógica de negocio)
  ARCHIVO: utils/ModalHelper.js
=========================================================*/

const ELEMENTOS_FOCUSABLES = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input[type="text"]:not([disabled])',
  'input[type="radio"]:not([disabled])',
  'input[type="checkbox"]:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

export function abrirModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.style.display = "flex";
  modal.setAttribute('aria-hidden', 'false');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const focoAnterior = document.activeElement;
  modal.dataset.focoAnterior = focoAnterior ? focoAnterior.id || '' : '';

  const elementos = modal.querySelectorAll(ELEMENTOS_FOCUSABLES);
  if (elementos.length > 0) {
    setTimeout(() => elementos[0].focus(), 0);
  } else {
    modal.setAttribute('tabindex', '-1');
    setTimeout(() => modal.focus(), 0);
  }

  modal.addEventListener('keydown', manejarTeclaModal);
}

export function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.style.display = "none";
  modal.setAttribute('aria-hidden', 'true');
  modal.removeAttribute('role');
  modal.removeAttribute('aria-modal');

  modal.removeEventListener('keydown', manejarTeclaModal);

  const focoAnteriorId = modal.dataset.focoAnterior;
  if (focoAnteriorId) {
    const focoAnterior = document.getElementById(focoAnteriorId);
    if (focoAnterior) {
      focoAnterior.focus();
      return;
    }
  }
  const elementosCerrables = document.querySelectorAll(ELEMENTOS_FOCUSABLES);
  if (elementosCerrables.length > 0) {
    elementosCerrables[0].focus();
  }
}

function manejarTeclaModal(event) {
  const modal = event.currentTarget;

  if (event.key === 'Escape') {
    event.preventDefault();
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    modal.removeEventListener('keydown', manejarTeclaModal);

    const focoAnteriorId = modal.dataset.focoAnterior;
    if (focoAnteriorId) {
      const focoAnterior = document.getElementById(focoAnteriorId);
      if (focoAnterior) {
        focoAnterior.focus();
      }
    }
    return;
  }

  if (event.key === 'Tab') {
    const elementos = modal.querySelectorAll(ELEMENTOS_FOCUSABLES);
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

export function inicializarCierreClicFuera(idsModales) {
  window.addEventListener("click", (event) => {
    idsModales.forEach((id) => {
      const modal = document.getElementById(id);
      if (modal && event.target === modal) {
        cerrarModal(id);
      }
    });
  });
}
