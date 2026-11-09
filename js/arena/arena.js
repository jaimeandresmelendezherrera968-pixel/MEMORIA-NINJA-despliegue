import { ArenaController } from "./controllers/ArenaController.js";

document.addEventListener("DOMContentLoaded", () => {

    const arenaController =
        new ArenaController();

    arenaController.iniciarJuego();

});