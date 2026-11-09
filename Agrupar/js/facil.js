/* =========================================================
   JUEGO: AGRUPA LOS OBJETOS SEGÚN CORRESPONDA
   (Agrupar/facil.html)

   Cada objeto pertenece a una de las dos carpetas:
   - #mitologia  -> cartas de la Aldea de la Roca
   - #scifi      -> cartas Akatsuki

   Mecánica (dos formas de jugar):
   A) ARRASTRAR: se toma la carta y se suelta sobre la carpeta.
      Funciona con ratón (HTML5 drag & drop) y con dedo/lápiz
      (arrastre propio con eventos pointer).
   B) TOCAR: se toca la carta (queda resaltada) y luego se toca
      la carpeta. Sirve como respaldo en cualquier dispositivo.

   Las cartas se pueden colocar en cualquiera de las carpetas.
   Ganas si todas quedaron bien clasificadas; si alguna quedó
   mal o se acaba el tiempo, pierdes.
   ========================================================= */

(function () {
  "use strict";

  const TIEMPO_INICIAL = 40;

  const CLASIFICACION = {
    roca: [1, 2, 3, 4],
    akatsuki: [1, 2, 3, 4]
  };

  const RUTA_IMAGEN = (aldea, n) =>
    `../assets/img/cards/aldeas/${aldea}/${n}.png`;

  const ETIQUETA_CARPETA = {
    mitologia: "Aldea de la Roca",
    scifi: "Akatsuki"
  };

  // ================== ELEMENTOS DEL DOM ==================
  const objetosContainer = document.getElementById("objetosContainer");
  const timerEl = document.getElementById("timer");
  const btnPause = document.getElementById("btnPause");
  const pauseMenu = document.getElementById("pauseMenu");
  const btnResume = document.getElementById("btnResume");
  const finalScreen = document.getElementById("finalScreen");
  const finalMessage = document.getElementById("finalMessage");

  const carpetas = {
    mitologia: document.getElementById("mitologia"),
    scifi: document.getElementById("scifi")
  };

  // ================== ESTADO ==================
  let segundos = TIEMPO_INICIAL;
  let pausado = false;
  let terminado = false;
  let seleccionado = null; // objeto actualmente resaltado
  let colocados = 0;
  let correctos = 0;
  let arrastreTactil = null;
  let suprimirClickHasta = 0;

  const totalObjetos =
    Object.values(CLASIFICACION).reduce((acc, lista) => acc + lista.length, 0);

  const todasLasCartas = () =>
    Array.from(document.querySelectorAll(".objeto"));

  // ================== OBJETOS ==================
  function construirObjetos() {
    const objetos = [];

    CLASIFICACION.roca.forEach((n) =>
      objetos.push({ aldea: "roca", carpeta: "mitologia", src: RUTA_IMAGEN("roca", n) })
    );
    CLASIFICACION.akatsuki.forEach((n) =>
      objetos.push({ aldea: "akatsuki", carpeta: "scifi", src: RUTA_IMAGEN("akatsuki", n) })
    );

    // Mezclar para que el orden no revele la clasificación
    for (let i = objetos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [objetos[i], objetos[j]] = [objetos[j], objetos[i]];
    }

    objetos.forEach((datos, indice) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "objeto";
      boton.dataset.carpeta = datos.carpeta;
      boton.dataset.id = "objeto-" + indice;
      boton.draggable = true;
      boton.setAttribute(
        "aria-label",
        `Carta de ${ETIQUETA_CARPETA[datos.carpeta]}: arrastrala hasta su carpeta o tocala y después tocá la carpeta`
      );

      const img = document.createElement("img");
      img.src = datos.src;
      img.alt = "";
      img.draggable = false;
      boton.appendChild(img);

      boton.addEventListener("click", () => seleccionar(boton));
      boton.addEventListener("dragstart", alEmpezarArrastreNativo);
      boton.addEventListener("dragend", alTerminarArrastreNativo);
      boton.addEventListener("pointerdown", (evento) => {
        if (evento.pointerType === "mouse") return;
        iniciarArrastreTactil(boton, evento);
      });

      objetosContainer.appendChild(boton);
    });
  }

  // ================== SELECCIÓN (modo tocar) ==================
  function seleccionar(boton) {
    if (terminado || pausado) return;
    if (Date.now() < suprimirClickHasta) return;
    if (estaColocada(boton)) return;

    if (seleccionado === boton) {
      marcarSeleccion(boton, false);
      seleccionado = null;
      return;
    }

    if (seleccionado) marcarSeleccion(seleccionado, false);

    seleccionado = boton;
    marcarSeleccion(boton, true);
  }

  function marcarSeleccion(boton, activo) {
    boton.classList.toggle("seleccionado", activo);
  }

  function estaColocada(boton) {
    return boton.dataset.estado === "colocado";
  }

  // ================== ARRASTRE NATIVO (ratón) ==================
  function alEmpezarArrastreNativo(evento) {
    const boton = evento.currentTarget;

    if (terminado || pausado || estaColocada(boton)) {
      evento.preventDefault();
      return;
    }

    if (seleccionado) {
      marcarSeleccion(seleccionado, false);
      seleccionado = null;
    }

    evento.dataTransfer.setData("text/plain", boton.dataset.id);
    evento.dataTransfer.effectAllowed = "move";
    boton.classList.add("arrastrando");
  }

  function alTerminarArrastreNativo(evento) {
    evento.currentTarget.classList.remove("arrastrando");
  }

  // ================== ARRASTRE TÁCTIL (dedo / lápiz) ==================
  function iniciarArrastreTactil(boton, evento) {
    if (terminado || pausado || estaColocada(boton)) return;

    evento.preventDefault();

    if (seleccionado) {
      marcarSeleccion(seleccionado, false);
      seleccionado = null;
    }

    const rect = boton.getBoundingClientRect();
    const clon = boton.cloneNode(true);
    clon.classList.add("fantasma-objeto");
    clon.removeAttribute("id");
    clon.style.width = rect.width + "px";
    clon.style.height = rect.height + "px";
    document.body.appendChild(clon);

    arrastreTactil = {
      boton,
      clon,
      offsetX: evento.clientX - rect.left,
      offsetY: evento.clientY - rect.top
    };

    boton.classList.add("arrastrando");
    moverFantasma(evento.clientX, evento.clientY);
    resaltarCarpetaBajo(evento.clientX, evento.clientY);

    document.addEventListener("pointermove", moverArrastreTactil, { passive: false });
    document.addEventListener("pointerup", soltarArrastreTactil);
    document.addEventListener("pointercancel", soltarArrastreTactil);
  }

  function moverArrastreTactil(evento) {
    if (!arrastreTactil) return;
    evento.preventDefault();
    moverFantasma(evento.clientX, evento.clientY);
    resaltarCarpetaBajo(evento.clientX, evento.clientY);
  }

  function moverFantasma(x, y) {
    const { clon, offsetX, offsetY } = arrastreTactil;
    clon.style.left = (x - offsetX) + "px";
    clon.style.top = (y - offsetY) + "px";
  }

  function soltarArrastreTactil(evento) {
    if (!arrastreTactil) return;

    const { boton, clon } = arrastreTactil;
    const carpetaEl = carpetaBajo(evento.clientX, evento.clientY);

    limpiarArrastreTactil();
    boton.classList.remove("arrastrando");
    suprimirClickHasta = Date.now() + 400;

    if (carpetaEl) {
      intentarColocar(boton, carpetaEl.id, carpetaEl);
    }
  }

  function limpiarArrastreTactil() {
    if (!arrastreTactil) return;

    arrastreTactil.clon.remove();
    arrastreTactil = null;

    document.removeEventListener("pointermove", moverArrastreTactil);
    document.removeEventListener("pointerup", soltarArrastreTactil);
    document.removeEventListener("pointercancel", soltarArrastreTactil);
    resaltarCarpeta(null);
  }

  function carpetaBajo(x, y) {
    const elemento = document.elementFromPoint(x, y);
    const carpetaEl = elemento ? elemento.closest(".carpeta") : null;

    if (
      carpetaEl &&
      (carpetaEl.id === "mitologia" || carpetaEl.id === "scifi")
    ) {
      return carpetaEl;
    }

    return null;
  }

  function resaltarCarpetaBajo(x, y) {
    resaltarCarpeta(carpetaBajo(x, y));
  }

  function resaltarCarpeta(carpetaEl) {
    Object.values(carpetas).forEach((el) => {
      if (el) el.classList.toggle("zona-activa", el === carpetaEl);
    });
  }

  // ================== COLOCAR EN CARPETA ==================
  function intentarColocar(boton, carpetaId, carpetaEl) {
    if (terminado || pausado) return;
    if (!boton || estaColocada(boton)) return;
    if (carpetaId !== "mitologia" && carpetaId !== "scifi") return;

    if (seleccionado) {
      marcarSeleccion(seleccionado, false);
      seleccionado = null;
    }

    boton.dataset.estado = "colocado";
    boton.draggable = false;
    boton.classList.remove("arrastrando", "seleccionado");
    boton.classList.add("colocado");

    const destino = carpetaEl.querySelector(".carpeta-objetos");
    (destino || carpetaEl).appendChild(boton);

    colocados += 1;
    if (boton.dataset.carpeta === carpetaId) {
      correctos += 1;
    } else {
      sacudir(carpetaEl);
    }

    if (colocados === totalObjetos) {
      terminar(correctos === totalObjetos, "clasificacion");
    }
  }

  function alSoltarEnCarpeta(carpetaEl, evento) {
    evento.preventDefault();
    carpetaEl.classList.remove("zona-activa");

    const id = evento.dataTransfer.getData("text/plain");
    if (!id) return;

    const boton = todasLasCartas().find((c) => c.dataset.id === id);
    intentarColocar(boton, carpetaEl.id, carpetaEl);
  }

  function sacudir(elemento) {
    if (!elemento) return;

    elemento.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(6px)" },
        { transform: "translateX(0)" }
      ],
      { duration: 250 }
    );
  }

  // ================== TEMPORIZADOR ==================
  function iniciarTemporizador() {
    timerEl.textContent = segundos;

    setInterval(() => {
      if (terminado || pausado) return;

      segundos -= 1;
      timerEl.textContent = segundos;

      if (segundos <= 10) {
        timerEl.style.color = "#ff5544";
        timerEl.style.textShadow = "0 0 10px #ff5544";
      }

      if (segundos <= 0) {
        segundos = 0;
        terminar(false, "tiempo");
      }
    }, 1000);
  }

  // ================== FINAL ==================
  function terminar(victoria, motivo) {
    if (terminado) return;
    terminado = true;

    limpiarArrastreTactil();

    if (seleccionado) {
      marcarSeleccion(seleccionado, false);
      seleccionado = null;
    }

    finalMessage.textContent = victoria
      ? "¡Perfecto, ninja! Agrupaste todos los objetos."
      : motivo === "clasificacion"
        ? "Hay objetos en carpetas incorrectas. ¡Inténtalo de nuevo!"
        : "¡Tiempo agotado! Inténtalo de nuevo.";

    finalScreen.classList.remove("hidden");
  }

  // ================== PAUSA ==================
  btnPause.addEventListener("click", () => {
    if (terminado) return;
    pausado = true;
    pauseMenu.classList.remove("hidden");
  });

  btnResume.addEventListener("click", () => {
    pausado = false;
    pauseMenu.classList.add("hidden");
  });

  // ================== CARPETAS ==================
  Object.keys(carpetas).forEach((id) => {
    const carpetaEl = carpetas[id];
    if (!carpetaEl) return;

    carpetaEl.setAttribute("role", "button");
    carpetaEl.setAttribute("tabindex", "0");
    carpetaEl.setAttribute("aria-label", `Guardar carta en ${ETIQUETA_CARPETA[id]}`);

    carpetaEl.addEventListener("click", () => {
      if (!seleccionado) {
        sacudir(carpetaEl);
        return;
      }
      intentarColocar(seleccionado, id, carpetaEl);
    });

    carpetaEl.addEventListener("keydown", (evento) => {
      if (evento.key !== "Enter" && evento.key !== " ") return;
      evento.preventDefault();
      carpetaEl.click();
    });

    carpetaEl.addEventListener("dragover", (evento) => {
      if (terminado || pausado) return;
      evento.preventDefault();
      evento.dataTransfer.dropEffect = "move";
      resaltarCarpeta(carpetaEl);
    });

    carpetaEl.addEventListener("dragleave", () => {
      resaltarCarpeta(null);
    });

    carpetaEl.addEventListener("drop", (evento) => {
      alSoltarEnCarpeta(carpetaEl, evento);
    });
  });

  // ================== BOTONES DE LOS MENÚS ==================
  document.querySelectorAll("[data-accion]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const accion = boton.dataset.accion;

      if (accion === "reintentar") {
        window.location.reload();
        return;
      }

      window.location.href = "../menu.html";
    });
  });

  // ================== ARRANQUE ==================
  construirObjetos();
  iniciarTemporizador();
})();
