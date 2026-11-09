import { AkatsukiController } from "./controllers/AkatsukiController.js";

document.addEventListener("DOMContentLoaded", () => {

    const akatsukiController =
        new AkatsukiController();

    akatsukiController.iniciarJuego();

});