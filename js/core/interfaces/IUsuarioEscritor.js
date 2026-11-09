/*=========================================================
  MEMORIA NINJA
  CAPA: NÚCLEO (Core) -> Interfaz / Contrato
  ARCHIVO: core/interfaces/IUsuarioEscritor.js

  ISP (corrección): contrato de ESCRITURA, separado de la
  lectura. RegistroService y RecuperacionService dependen de
  este (además de IUsuarioLector cuando también necesitan
  leer), pero AutenticacionService — que solo lee — jamás ve
  estos métodos en su contrato.
=========================================================*/

export class IUsuarioEscritor {
  constructor() {
    if (new.target === IUsuarioEscritor) {
      throw new Error(
        "IUsuarioEscritor es una interfaz y no se puede instanciar directamente."
      );
    }
  }

  guardar(_usuario) {
    throw new Error("guardar() debe ser implementado por la subclase.");
  }

  actualizar(_usuario) {
    throw new Error("actualizar() debe ser implementado por la subclase.");
  }
}
