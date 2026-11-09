import { ISalaService } from '../domain/ISalaService.js';

export class SalaService extends ISalaService {
  static CLAVE = 'salaCreada';
  static TIEMPO_VIDA_MS = 30 * 60 * 1000;

  constructor(storageRepository) {
    super();
    this.storage = storageRepository;
  }

  #leerSala() {
    const sala = this.storage.getItem(SalaService.CLAVE);
    if (!sala || typeof sala !== 'object' || typeof sala.codigo !== 'string') return null;
    if (Date.now() - sala.creado > SalaService.TIEMPO_VIDA_MS) return null;
    return sala;
  }

  #generarCodigo() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  // Devuelve el código de la sala propia (se reutiliza mientras siga vigente)
  // para que abrir y cerrar el modal no invalide el código ya compartido.
  obtenerCodigoSala() {
    const sala = this.#leerSala();
    if (sala) return sala.codigo;

    const nueva = { codigo: this.#generarCodigo(), creado: Date.now() };
    this.storage.setItem(SalaService.CLAVE, nueva);
    return nueva.codigo;
  }

  // Solo es válido el código de 6 dígitos que coincida con la sala vigente.
  esCodigoValido(codigo) {
    if (!/^\d{6}$/.test(codigo)) return false;

    const sala = this.#leerSala();
    if (!sala) {
      this.storage.removeItem(SalaService.CLAVE);
      return false;
    }
    return sala.codigo === codigo;
  }
}
