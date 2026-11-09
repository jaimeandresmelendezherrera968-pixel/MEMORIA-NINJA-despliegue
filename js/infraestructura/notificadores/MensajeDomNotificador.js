/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Notificadores
  ARCHIVO: infraestructura/notificadores/MensajeDomNotificador.js

  Implementación de INotificador que escribe el mensaje dentro
  de un elemento del DOM (por ejemplo <p id="msg">), coloreando
  el texto según el tipo. Reemplaza el patrón repetido en
  login.js, registro.js y recuperar.js:
      mensaje.textContent = "..."; mensaje.style.color = "...";

  LSP: se puede usar exactamente donde se usaba
  AlertaNotificador, sin que el controlador que lo consume note
  la diferencia.
=========================================================*/

import { INotificador } from "../../core/interfaces/INotificador.js";

const COLORES = {
  info: "white",
  exito: "lightgreen",
  error: "red"
};

export class MensajeDomNotificador extends INotificador {
  #idElemento;

  constructor(idElemento) {
    super();
    this.#idElemento = idElemento;
  }

  mostrar(mensaje, tipo = "info") {
    const elemento = document.getElementById(this.#idElemento);
    if (!elemento) return;
    elemento.textContent = mensaje;
    elemento.style.color = COLORES[tipo] || COLORES.info;
  }
}
