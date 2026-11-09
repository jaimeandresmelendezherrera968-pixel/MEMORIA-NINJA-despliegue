/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Generadores (Estrategias)
  ARCHIVO: infraestructura/generadores/CodigoAlfanumericoGenerador.js

  Implementación de ICodigoGenerador usada para la
  verificación de correo (código de 6 caracteres, sin O/0/I/1
  para evitar confusiones visuales). Misma lógica que tenía el
  verificacion.js original, ahora aislada y reutilizable.
=========================================================*/

import { ICodigoGenerador } from "../../core/interfaces/ICodigoGenerador.js";

export class CodigoAlfanumericoGenerador extends ICodigoGenerador {
  #caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  #longitud;

  constructor(longitud = 6) {
    super();
    this.#longitud = longitud;
  }

  generar() {
    let codigo = "";
    for (let i = 0; i < this.#longitud; i++) {
      codigo += this.#caracteres[Math.floor(Math.random() * this.#caracteres.length)];
    }
    return codigo;
  }
}
