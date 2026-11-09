/*=========================================================
  MEMORIA NINJA
  CAPA: UTILIDADES (helpers de presentación, sin lógica de negocio)
  ARCHIVO: utils/TogglePasswordHelper.js

  Antes estaba duplicado en login.js y registro.js. Ahora es
  una única función reutilizada por ambos composition roots.
=========================================================*/

export function alternarVisibilidadPassword(idInput, icono) {
  const input = document.getElementById(idInput);

  if (input.type === "password") {
    input.type = "text";
    icono.classList.add("activo");
  } else {
    input.type = "password";
    icono.classList.remove("activo");
  }
}
