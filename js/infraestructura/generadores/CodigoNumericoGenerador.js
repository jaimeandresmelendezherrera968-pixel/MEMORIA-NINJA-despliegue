/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Generadores (Estrategias)
  ARCHIVO: infraestructura/generadores/CodigoNumericoGenerador.js

  Implementación de ICodigoGenerador usada para la
  recuperación de contraseña (código numérico de 6 dígitos).

  POLIMORFISMO: esta clase y CodigoAlfanumericoGenerador
  comparten el mismo método generar() (misma firma) pero cada
  una ejecuta un comportamiento distinto. Cualquier servicio
  que reciba un ICodigoGenerador puede trabajar con cualquiera
  de las dos sin saber cuál es, ni necesitar un if/switch.
=========================================================*/

import { ICodigoGenerador } from "../../core/interfaces/ICodigoGenerador.js";

export class CodigoNumericoGenerador extends ICodigoGenerador {
  generar() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
