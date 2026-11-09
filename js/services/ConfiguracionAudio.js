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
