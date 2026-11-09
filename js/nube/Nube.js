import { NubeController } from "./controllers/NubeController.js";

document.addEventListener("DOMContentLoaded", () => {

    const nubeController =
        new NubeController();

    nubeController.iniciarJuego();

});