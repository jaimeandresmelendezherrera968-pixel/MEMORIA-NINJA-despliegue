const avisoOrientacion = document.createElement("div");
avisoOrientacion.className = "aviso-orientacion";
avisoOrientacion.setAttribute("role", "status");
avisoOrientacion.setAttribute("aria-live", "polite");

const tarjeta = document.createElement("div");
tarjeta.className = "aviso-orientacion-tarjeta";

const telefono = document.createElement("span");
telefono.className = "icono-telefono";
telefono.setAttribute("aria-hidden", "true");
telefono.appendChild(document.createElement("span"));

const kicker = document.createElement("p");
kicker.className = "aviso-kicker";
kicker.textContent = "MODO NINJA";

const titulo = document.createElement("h1");
titulo.textContent = "Gira tu teléfono";

const mensaje = document.createElement("p");
mensaje.textContent = "Juega en horizontal para ver el juego completo.";

tarjeta.append(telefono, kicker, titulo, mensaje);
avisoOrientacion.appendChild(tarjeta);
document.body.appendChild(avisoOrientacion);
