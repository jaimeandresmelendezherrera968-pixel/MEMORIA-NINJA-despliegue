/*==================================================
  BOOTSTRAP DEL JUEGO ONLINE / LOCAL
==================================================*/

import { GestorPartida } from "./nucleo-GAME ONLI/GestorPartida.js";

window.addEventListener("load", () => {
    const partida = new GestorPartida();
    partida.iniciar();
});
