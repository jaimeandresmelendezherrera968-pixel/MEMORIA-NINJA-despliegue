import { ControladorNivel } from "./ControladorNivel.js";

function iniciar() {
  const nivel = document.body.dataset.nivel;
  if (nivel) new ControladorNivel(nivel);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
