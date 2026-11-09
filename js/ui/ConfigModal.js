import { BaseModal } from './BaseModal.js';

/*
 * ConfigModal (OCP): hereda el contrato abrir()/cerrar() de BaseModal
 * y añade la gestión de la configuración sin modificar la base.
 */
export class ConfigModal extends BaseModal {
  constructor(modalId) {
    super(modalId);
    this.cargar();
    this.inicializarControles();
    this.inicializarCierreConEscape();
  }

  inicializarControles() {
    const musica = document.getElementById('cfgMusica');
    const efectos = document.getElementById('cfgEfectos');
    const volumen = document.getElementById('cfgVolumen');
    const valor = document.getElementById('cfgVolumenValor');

    const guardar = () => {
      const config = {
        musica: musica?.checked ?? true,
        efectos: efectos?.checked ?? true,
        volumen: Number(volumen?.value ?? 80)
      };
      this.guardar(config);
      this.aplicar(config);
    };

    musica?.addEventListener('change', guardar);
    efectos?.addEventListener('change', guardar);
    volumen?.addEventListener('input', () => {
      if (valor) valor.textContent = `${volumen.value}%`;
      guardar();
    });
  }

  cargar() {
    const config = this.leerConfiguracion();
    const musica = document.getElementById('cfgMusica');
    const efectos = document.getElementById('cfgEfectos');
    const volumen = document.getElementById('cfgVolumen');
    const valor = document.getElementById('cfgVolumenValor');

    if (musica) musica.checked = config.musica;
    if (efectos) efectos.checked = config.efectos;
    if (volumen) volumen.value = config.volumen;
    if (valor) valor.textContent = `${config.volumen}%`;
    this.aplicar(config);
  }

  leerConfiguracion() {
    const guardado = JSON.parse(localStorage.getItem('configuracion')) || {};
    return {
      musica: guardado.musica ?? true,
      efectos: guardado.efectos ?? true,
      volumen: guardado.volumen ?? 80
    };
  }

  guardar(config) {
    localStorage.setItem('configuracion', JSON.stringify(config));
  }

  aplicar(config) {
    document.querySelectorAll('audio').forEach(a => {
      a.volume = config.volumen / 100;
      a.muted = !config.musica;
    });
  }

  inicializarCierreConEscape() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modalElement?.classList.contains('activo')) {
        this.cerrar();
      }
    });
  }
}