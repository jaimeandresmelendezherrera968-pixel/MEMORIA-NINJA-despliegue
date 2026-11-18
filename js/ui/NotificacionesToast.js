export class NotificacionesToast {
  constructor() {
    this.contenedor = null;
  }

  #asegurarContenedor() {
    if (this.contenedor?.isConnected) return this.contenedor;
    let contenedor = document.getElementById("toastsSociales");
    if (!contenedor) {
      contenedor = document.createElement("div");
      contenedor.id = "toastsSociales";
      contenedor.className = "social-toasts";
      contenedor.setAttribute("aria-live", "polite");
      contenedor.setAttribute("aria-relevant", "additions");
      document.body.appendChild(contenedor);
    }
    this.contenedor = contenedor;
    return contenedor;
  }

  mostrar({ titulo = "Notificación", mensaje = "", tipo = "info", acciones = [] }) {
    const contenedor = this.#asegurarContenedor();
    const toast = document.createElement("article");
    toast.className = `social-toast social-toast--${tipo}`;
    toast.setAttribute("role", tipo === "error" ? "alert" : "status");

    const contenido = document.createElement("div");
    contenido.className = "social-toast__contenido";

    const encabezado = document.createElement("strong");
    encabezado.className = "social-toast__titulo";
    encabezado.textContent = titulo;

    const texto = document.createElement("p");
    texto.className = "social-toast__mensaje";
    texto.textContent = mensaje;

    contenido.append(encabezado, texto);

    const fila = document.createElement("div");
    fila.className = "social-toast__acciones";

    const cerrar = () => {
      toast.classList.add("is-saliendo");
      window.setTimeout(() => toast.remove(), 220);
    };

    for (const accion of acciones) {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = `social-toast__boton social-toast__boton--${accion.estilo || "secundario"}`;
      boton.textContent = accion.etiqueta;
      boton.addEventListener("click", async () => {
        boton.disabled = true;
        try {
          await accion.accion();
          cerrar();
        } catch (error) {
          boton.disabled = false;
          texto.textContent = error?.message || "No se pudo completar la acción.";
        }
      });
      fila.appendChild(boton);
    }

    const botonCerrar = document.createElement("button");
    botonCerrar.type = "button";
    botonCerrar.className = "social-toast__cerrar";
    botonCerrar.setAttribute("aria-label", "Cerrar notificación");
    botonCerrar.textContent = "×";
    botonCerrar.addEventListener("click", cerrar);
    fila.appendChild(botonCerrar);

    toast.append(contenido, fila);
    contenedor.appendChild(toast);
    if (!acciones.length) window.setTimeout(cerrar, 6000);
    return toast;
  }
}

export const notificacionesToast = new NotificacionesToast();
