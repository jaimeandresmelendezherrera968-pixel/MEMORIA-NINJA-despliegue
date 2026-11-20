const CLAVE_CONFIGURACION = "configuracion";

const CONFIGURACION_POR_DEFECTO = {
    musica: true,
    efectos: true,
    volumen: 80
};

let contextoAudio = null;
let audioNivelIniciado = false;
let cartaPendienteDeVolteo = null;

function limitarVolumen(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return CONFIGURACION_POR_DEFECTO.volumen;
    }

    return Math.min(100, Math.max(0, Math.round(numero)));
}

export function leerConfiguracion() {
    let guardada = {};

    try {
        guardada = JSON.parse(localStorage.getItem(CLAVE_CONFIGURACION) || "{}");
    } catch {
        guardada = {};
    }

    return {
        musica: guardada.musica ?? CONFIGURACION_POR_DEFECTO.musica,
        efectos: guardada.efectos ?? CONFIGURACION_POR_DEFECTO.efectos,
        volumen: limitarVolumen(guardada.volumen ?? CONFIGURACION_POR_DEFECTO.volumen)
    };
}

export function aplicarConfiguracionAudio(configuracion = leerConfiguracion()) {
    document.querySelectorAll("audio").forEach((audio) => {
        audio.volume = configuracion.volumen / 100;
        audio.muted = !configuracion.musica;
    });
}

export function guardarConfiguracion(cambios = {}) {
    const configuracion = {
        ...leerConfiguracion(),
        ...cambios
    };

    configuracion.volumen = limitarVolumen(configuracion.volumen);

    localStorage.setItem(CLAVE_CONFIGURACION, JSON.stringify(configuracion));
    aplicarConfiguracionAudio(configuracion);

    return configuracion;
}

function obtenerAudioNivel() {
    return document.getElementById("gameMusic");
}

function reproducirMusicaNivel() {
    const audio = obtenerAudioNivel();
    const configuracion = leerConfiguracion();

    if (!audio || !configuracion.musica) {
        return;
    }

    audio.volume = configuracion.volumen / 100;
    audio.muted = false;
    audio.play().catch(() => {});
}

export function pausarMusicaNivel() {
    const audio = obtenerAudioNivel();

    if (audio) {
        audio.pause();
    }
}

export function reanudarMusicaNivel() {
    reproducirMusicaNivel();
}

export function iniciarAudioNivel() {
    aplicarConfiguracionAudio();

    if (audioNivelIniciado) {
        return;
    }

    audioNivelIniciado = true;

    const desbloquearAudio = () => {
        document.removeEventListener("pointerdown", desbloquearAudio);
        document.removeEventListener("keydown", desbloquearAudio);
        reproducirMusicaNivel();
    };

    document.addEventListener("pointerdown", desbloquearAudio, { passive: true });
    document.addEventListener("keydown", desbloquearAudio);

    reproducirMusicaNivel();

    document.addEventListener("pointerdown", (evento) => {
        if (!(evento.target instanceof Element)) {
            return;
        }

        const carta = evento.target.closest(".card");

        if (!carta) {
            cartaPendienteDeVolteo = null;
            return;
        }

        const yaVolteada =
            carta.classList.contains("flipped") ||
            carta.classList.contains("flip") ||
            carta.classList.contains("volteada");

        cartaPendienteDeVolteo = yaVolteada ? null : carta;
    }, true);

    document.addEventListener("click", (evento) => {
        if (!(evento.target instanceof Element)) {
            return;
        }

        const carta = evento.target.closest(".card");

        if (carta && carta === cartaPendienteDeVolteo) {
            reproducirVolteo();
        }

        cartaPendienteDeVolteo = null;
    });
}

function obtenerContextoAudio() {
    if (contextoAudio) {
        return contextoAudio;
    }

    const Constructor = window.AudioContext || window.webkitAudioContext;

    if (!Constructor) {
        return null;
    }

    contextoAudio = new Constructor();

    return contextoAudio;
}

function crearGanancia(contexto, volumen) {
    const ganancia = contexto.createGain();
    ganancia.gain.value = Math.max(0, Math.min(1, volumen));
    ganancia.connect(contexto.destination);

    return ganancia;
}

function reproducirTono({
    frecuencia,
    frecuenciaFinal = frecuencia,
    tipo = "sine",
    duracion = 0.18,
    volumen = 0.18,
    retardo = 0,
    ataque = 0.008,
}) {
    const configuracion = leerConfiguracion();

    if (!configuracion.efectos || configuracion.volumen <= 0) {
        return;
    }

    const contexto = obtenerContextoAudio();

    if (!contexto) {
        return;
    }

    if (contexto.state === "suspended") {
        contexto.resume().catch(() => {});
    }

    const inicio = contexto.currentTime + retardo;
    const salida = crearGanancia(contexto, (configuracion.volumen / 100) * volumen);
    const oscilador = contexto.createOscillator();
    const envolvente = contexto.createGain();

    oscilador.type = tipo;
    oscilador.frequency.setValueAtTime(frecuencia, inicio);
    if (frecuenciaFinal !== frecuencia) {
        oscilador.frequency.exponentialRampToValueAtTime(Math.max(20, frecuenciaFinal), inicio + duracion);
    }

    envolvente.gain.setValueAtTime(0.0001, inicio);
    envolvente.gain.exponentialRampToValueAtTime(1, inicio + ataque);
    envolvente.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion);

    oscilador.connect(envolvente);
    envolvente.connect(salida);
    oscilador.start(inicio);
    oscilador.stop(inicio + duracion + 0.02);
}

const SONIDOS_PODER = {
    sustitucion: [
        { frecuencia: 320, frecuenciaFinal: 540, tipo: "triangle", duracion: 0.16, volumen: 0.16 },
        { frecuencia: 680, frecuenciaFinal: 820, tipo: "sine", duracion: 0.12, volumen: 0.1, retardo: 0.09 },
    ],
    byakugan: [
        { frecuencia: 760, frecuenciaFinal: 1480, tipo: "sine", duracion: 0.28, volumen: 0.15 },
        { frecuencia: 1180, frecuenciaFinal: 1760, tipo: "triangle", duracion: 0.22, volumen: 0.08, retardo: 0.06 },
    ],
    robo: [
        { frecuencia: 720, frecuenciaFinal: 180, tipo: "sawtooth", duracion: 0.26, volumen: 0.13 },
    ],
    genjutsu: [
        { frecuencia: 420, frecuenciaFinal: 620, tipo: "sine", duracion: 0.34, volumen: 0.14 },
        { frecuencia: 300, frecuenciaFinal: 520, tipo: "triangle", duracion: 0.3, volumen: 0.09, retardo: 0.08 },
    ],
    sello: [
        { frecuencia: 210, frecuenciaFinal: 120, tipo: "square", duracion: 0.22, volumen: 0.1 },
        { frecuencia: 880, tipo: "sine", duracion: 0.08, volumen: 0.12, retardo: 0.02 },
    ],
    bomba: [
        { frecuencia: 140, frecuenciaFinal: 45, tipo: "sawtooth", duracion: 0.42, volumen: 0.2 },
        { frecuencia: 90, frecuenciaFinal: 35, tipo: "square", duracion: 0.32, volumen: 0.12, retardo: 0.04 },
    ],
};

export function reproducirPoder(poderId) {
    const tonos = SONIDOS_PODER[poderId] || SONIDOS_PODER.robo;
    tonos.forEach((tono) => reproducirTono(tono));
}

export function reproducirVentana() {
    reproducirTono({ frecuencia: 740, tipo: "square", duracion: 0.09, volumen: 0.09 });
    reproducirTono({ frecuencia: 740, tipo: "square", duracion: 0.09, volumen: 0.09, retardo: 0.16 });
}

export function reproducirContrarresto() {
    [660, 880, 1175].forEach((frecuencia, indice) => {
        reproducirTono({ frecuencia, tipo: "triangle", duracion: 0.16, volumen: 0.14, retardo: indice * 0.08 });
    });
}

export function reproducirDanio() {
    reproducirTono({ frecuencia: 170, frecuenciaFinal: 60, tipo: "sawtooth", duracion: 0.3, volumen: 0.17 });
}

export function reproducirVolteo() {
    const configuracion = leerConfiguracion();

    if (!configuracion.efectos || configuracion.volumen <= 0) {
        return;
    }

    const contexto = obtenerContextoAudio();

    if (!contexto) {
        return;
    }

    if (contexto.state === "suspended") {
        contexto.resume().catch(() => {});
    }

    const ahora = contexto.currentTime;
    const salida = crearGanancia(contexto, (configuracion.volumen / 100) * 0.22);
    const oscilador = contexto.createOscillator();

    oscilador.type = "triangle";
    oscilador.frequency.setValueAtTime(620, ahora);
    oscilador.frequency.exponentialRampToValueAtTime(220, ahora + 0.09);

    const envolvente = contexto.createGain();
    envolvente.gain.setValueAtTime(0.0001, ahora);
    envolvente.gain.exponentialRampToValueAtTime(1, ahora + 0.006);
    envolvente.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.13);

    oscilador.connect(envolvente);
    envolvente.connect(salida);
    oscilador.start(ahora);
    oscilador.stop(ahora + 0.15);
}

export function reproducirAcierto() {
    const configuracion = leerConfiguracion();

    if (!configuracion.efectos || configuracion.volumen <= 0) {
        return;
    }

    const contexto = obtenerContextoAudio();

    if (!contexto) {
        return;
    }

    if (contexto.state === "suspended") {
        contexto.resume().catch(() => {});
    }

    const ahora = contexto.currentTime;
    const salida = crearGanancia(contexto, (configuracion.volumen / 100) * 0.18);

    [523.25, 783.99].forEach((frecuencia, indice) => {
        const inicio = ahora + indice * 0.09;
        const oscilador = contexto.createOscillator();
        const envolvente = contexto.createGain();

        oscilador.type = "sine";
        oscilador.frequency.setValueAtTime(frecuencia, inicio);
        envolvente.gain.setValueAtTime(0.0001, inicio);
        envolvente.gain.exponentialRampToValueAtTime(1, inicio + 0.01);
        envolvente.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.22);

        oscilador.connect(envolvente);
        envolvente.connect(salida);
        oscilador.start(inicio);
        oscilador.stop(inicio + 0.24);
    });
}

export function reproducirError() {
    const configuracion = leerConfiguracion();

    if (!configuracion.efectos || configuracion.volumen <= 0) {
        return;
    }

    const contexto = obtenerContextoAudio();

    if (!contexto) {
        return;
    }

    if (contexto.state === "suspended") {
        contexto.resume().catch(() => {});
    }

    const ahora = contexto.currentTime;
    const salida = crearGanancia(contexto, (configuracion.volumen / 100) * 0.16);
    const oscilador = contexto.createOscillator();
    const envolvente = contexto.createGain();

    oscilador.type = "sawtooth";
    oscilador.frequency.setValueAtTime(170, ahora);
    oscilador.frequency.exponentialRampToValueAtTime(90, ahora + 0.18);
    envolvente.gain.setValueAtTime(0.0001, ahora);
    envolvente.gain.exponentialRampToValueAtTime(1, ahora + 0.01);
    envolvente.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.2);

    oscilador.connect(envolvente);
    envolvente.connect(salida);
    oscilador.start(ahora);
    oscilador.stop(ahora + 0.22);
}
