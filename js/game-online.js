/*==================================================
  BOOTSTRAP DEL JUEGO ONLINE / LOCAL
==================================================*/

import { GestorPartida } from "./nucleo-GAME ONLI/GestorPartida.js";
import { iniciarAudioNivel } from "./services/ConfiguracionAudio.js";

window.addEventListener("load", () => {
    iniciarAudioNivel();
    const partida = new GestorPartida();
    partida.iniciar();
});
