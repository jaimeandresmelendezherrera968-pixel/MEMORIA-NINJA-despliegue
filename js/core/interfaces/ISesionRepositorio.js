/*=========================================================
  MEMORIA NINJA
  CAPA: NÚCLEO (Core) -> Interfaz / Contrato
  ARCHIVO: core/interfaces/ISesionRepositorio.js

  DIP: SesionService (capa de negocio) ya no llama a
  localStorage directamente. Depende de este contrato, y quien
  lo implementa vive en infraestructura/.
=========================================================*/

export class ISesionRepositorio {
  constructor() {
    if (new.target === ISesionRepositorio) {
      throw new Error(
        "ISesionRepositorio es una interfaz y no se puede instanciar directamente."
      );
    }
  }

  guardar(_datosSesion) {
    throw new Error("guardar() debe ser implementado por la subclase.");
  }

  obtener() {
    throw new Error("obtener() debe ser implementado por la subclase.");
  }

  eliminar() {
    throw new Error("eliminar() debe ser implementado por la subclase.");
  }
}
