import { RocaController } from "./controllers/RocaController.js";

document.addEventListener("DOMContentLoaded", () => {

    const rocaController =
        new RocaController();

    rocaController.iniciarJuego();

});