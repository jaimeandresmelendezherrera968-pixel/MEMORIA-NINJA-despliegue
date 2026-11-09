const RUTA_REVERSOS = "assets/cartas niveles/";
const RUTA_CARTAS = "assets/img/cards/aldeas/";

export const TEMAS_ALDEA = {
    sarutobi: {
        cartas: `${RUTA_CARTAS}konoha/sarutobi/`,
        reverso: `${RUTA_REVERSOS}carta sarutobi.png`,
        colorPrincipal: "#b8611f",
        colorBrillo: "#ffb347",
        colorFondo: "#2a1408",
    },
    hyuga: {
        cartas: `${RUTA_CARTAS}konoha/hyuga/`,
        reverso: `${RUTA_REVERSOS}carta hyuga.png`,
        colorPrincipal: "#7fa7d9",
        colorBrillo: "#d9f0ff",
        colorFondo: "#111a2a",
    },
    uzumaki: {
        cartas: `${RUTA_CARTAS}konoha/uzumaki/`,
        reverso: `${RUTA_REVERSOS}carta uzumaki.png`,
        colorPrincipal: "#e95b18",
        colorBrillo: "#ffb342",
        colorFondo: "#30100a",
    },
    uchiha: {
        cartas: `${RUTA_CARTAS}konoha/uchiha/`,
        reverso: `${RUTA_REVERSOS}carta uchiha.png`,
        colorPrincipal: "#ad1731",
        colorBrillo: "#ff3d54",
        colorFondo: "#22050b",
    },
    arena: {
        cartas: `${RUTA_CARTAS}arena/`,
        reverso: `${RUTA_REVERSOS}carta arena.png`,
        colorPrincipal: "#bb7621",
        colorBrillo: "#ffd35b",
        colorFondo: "#33200d",
    },
    roca: {
        cartas: `${RUTA_CARTAS}roca/`,
        reverso: `${RUTA_REVERSOS}carta roca.png`,
        colorPrincipal: "#8c6140",
        colorBrillo: "#e5b273",
        colorFondo: "#21150d",
    },
    niebla: {
        cartas: `${RUTA_CARTAS}niebla/`,
        reverso: `${RUTA_REVERSOS}carta niebla.png`,
        colorPrincipal: "#3f7c86",
        colorBrillo: "#9fe8f0",
        colorFondo: "#0a1519",
    },
    nube: {
        cartas: `${RUTA_CARTAS}nube/`,
        reverso: `${RUTA_REVERSOS}carta nube.png`,
        colorPrincipal: "#3d78b8",
        colorBrillo: "#8fd4ff",
        colorFondo: "#0a0f18",
    },
    akatsuki: {
        cartas: `${RUTA_CARTAS}akatsuki/`,
        reverso: `${RUTA_REVERSOS}carta akatsuki.png`,
        colorPrincipal: "#8d1225",
        colorBrillo: "#f02b3e",
        colorFondo: "#15080b",
    },
};

export function obtenerTemaAldea(idAldea) {
    return TEMAS_ALDEA[idAldea] || null;
}

export function obtenerTemaSeleccionado() {
    return obtenerTemaAldea(localStorage.getItem("nivelActual"));
}

export function prepararImagenCarta(imagen) {
    if (!imagen) return imagen;

    imagen.loading = "eager";
    imagen.decoding = "async";
    imagen.fetchPriority = "high";
    imagen.draggable = false;

    if (typeof imagen.decode === "function") {
        imagen.decode().catch(() => {});
    }

    return imagen;
}

export function precargarImagenes(rutas = []) {
    const unicas = [...new Set(rutas.filter(Boolean))];

    return Promise.all(unicas.map((ruta) => new Promise((resolver) => {
        const imagen = new Image();

        imagen.decoding = "async";
        imagen.fetchPriority = "high";
        imagen.onload = () => {
            if (typeof imagen.decode === "function") {
                imagen.decode().then(resolver, resolver);
            } else {
                resolver();
            }
        };
        imagen.onerror = resolver;
        imagen.src = ruta;
    })));
}

export function aplicarTemaAldea(idAldea) {
    const tema = obtenerTemaAldea(idAldea);
    if (!tema?.colorPrincipal) return tema;

    document.body.dataset.temaAldea = idAldea;
    document.documentElement.style.setProperty("--tema-principal", tema.colorPrincipal);
    document.documentElement.style.setProperty("--tema-brillo", tema.colorBrillo);
    document.documentElement.style.setProperty("--tema-fondo", tema.colorFondo);
    document.documentElement.style.setProperty("--tema-reverso", `url("${tema.reverso}")`);
    return tema;
}
