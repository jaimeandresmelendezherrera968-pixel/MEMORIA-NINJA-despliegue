/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Notificadores
  ARCHIVO: infraestructura/notificadores/AlertaNotificador.js

  Implementación de INotificador que usa el alert() nativo del
  navegador (comportamiento original de verificacion.js y
  recuperar.js).
=========================================================*/

import { INotificador } from "../../core/interfaces/INotificador.js";

export class AlertaNotificador extends INotificador {
  mostrar(mensaje) {
    alert(mensaje);
  }
}
