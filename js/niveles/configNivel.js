import { TEMAS_ALDEA } from "../core-navegacion/TemaAldea.js";
/* Config por nivel (OCP/SRP). Colores/cartas+reverso/respaldo PROPIOS por aldea via TemaAldea (no compartidos).
   tiempos = valor efectivo (reiniciar) del controlador original. */
function cfg(aldea, totalCartas, tiempo, textos, vars = {}) {
    const t = TEMAS_ALDEA[aldea] || {};
    return { aldea, totalCartas, tiempo, reverso: t.reverso, cartas: t.cartas, textos, vars };
}
const T = { derrotaTitulo:"💀 ¡DERROTA!", derrotaMsg:"No pudiste completar el desafío" };
export const CONFIG_NIVELES = {
    akatsuki: cfg("akatsuki", 16, 60,
        { victoriaTitulo:"¡VICTORIA!", victoriaMsg1:"¡Has derrotado a la organización Akatsuki! Eres un ninja excepcional y has demostrado tu habilidad y destreza en este desafío. ¡Felicidades por tu victoria!", victoriaMsg2:"tus ojos son casi tan fuertes como el sharingan estoy muy sorprendido de que hayas podido completar este desafío, eres un gran ninja", ...T },
        { "--n-body-bg":"#342141","--n-text":"#f0f6ff","--n-stats":"#e8d6ff","--n-frame-bg":"linear-gradient(180deg,#3b2f20,#2d2418)","--n-frame-border":"#b8843b","--n-board-bg":"#1b1b1b","--n-panel-a":"#2a1733","--n-panel-b":"#160d1c","--n-brillo":"#d4a45a","--n-btn-bg":"linear-gradient(135deg,#3b2f20,#b8843b)","--n-v-glow":"rgba(184,132,59,.45)" }),
    sarutobi: cfg("sarutobi", 16, 300,
        { victoriaTitulo:"¡VICTORIA!", victoriaMsg1:"¡Has completado el desafío del clan Sarutobi!", victoriaMsg2:"llevas el espiritu de fuego de los Sarutobi, buen trabajo ninja", ...T },
        { "--n-body-bg":"#342141","--n-text":"#f0f6ff","--n-stats":"#bcd3ff","--n-frame-bg":"linear-gradient(180deg,#3b2f20,#2d2418)","--n-frame-border":"#b8843b","--n-board-bg":"#1b1b1b","--n-panel-a":"#3b2f20","--n-panel-b":"#2d2418","--n-brillo":"#ffd166","--n-btn-bg":"linear-gradient(135deg,#3b2f20,#b8843b)","--n-v-glow":"rgba(238,172,76,.30)" }),
    hyuga: cfg("hyuga", 16, 300,
        { victoriaTitulo:"¡VICTORIA!", victoriaMsg1:"¡Has completado el desafío del clan Hyuga!", victoriaMsg2:"El Byakugan te ha guiado con gran precisión, tu vista ninja es excepcional.", ...T },
        { "--n-body-bg":"rgb(18,24,35)","--n-text":"#f4f8ff","--n-stats":"#c9d8ff","--n-frame-bg":"linear-gradient(180deg,#1f2538,#141824)","--n-frame-border":"#6b7bff","--n-board-bg":"#10131d","--n-panel-a":"#1f2538","--n-panel-b":"#141824","--n-brillo":"#8aa0ff","--n-btn-bg":"linear-gradient(135deg,#1f2538,#6b7bff)","--n-v-glow":"rgba(122,162,255,.35)" }),
    uzumaki: cfg("uzumaki", 16, 300,
        { victoriaTitulo:"¡VICTORIA!", victoriaMsg1:"¡Has completado el desafío del clan Uzumaki!", victoriaMsg2:"Tu determinación arde como el chakra de un verdadero ninja de Konoha.", ...T },
        { "--n-body-bg":"#2a1212","--n-text":"#fff4f4","--n-stats":"#ffd6a8","--n-frame-bg":"linear-gradient(180deg,#4a1d14,#2f120d)","--n-frame-border":"#ff8c42","--n-board-bg":"#1b0f0c","--n-panel-a":"#4a1d14","--n-panel-b":"#2f120d","--n-brillo":"#ffb347","--n-btn-bg":"linear-gradient(135deg,#4a1d14,#ff8c42)","--n-v-glow":"rgba(255,179,71,.35)" }),
    uchiha: cfg("uchiha", 16, 300,
        { victoriaTitulo:"¡VICTORIA!", victoriaMsg1:"¡Has completado el desafío del clan Uchiha!", victoriaMsg2:"tus ojos son casi tan fuertes como el sharingan estoy muy sorprendido de que hayas podido completar este desafío, eres un gran ninja", ...T },
        { "--n-body-bg":"#0b0808","--n-text":"#f5eeee","--n-stats":"#d9baba","--n-frame-bg":"linear-gradient(180deg,#210909,#0b0505)","--n-frame-border":"#700d0d","--n-board-bg":"#111111","--n-panel-a":"#240909","--n-panel-b":"#100404","--n-brillo":"#b71c1c","--n-btn-bg":"linear-gradient(135deg,#420909,#8b1111)","--n-v-glow":"rgba(255,0,0,.28)" }),
    arena: cfg("arena", 16, 60,
        { victoriaTitulo:"¡VICTORIA!", victoriaMsg1:"¡Has completado el desafío de la Aldea de la Arena!", victoriaMsg2:"¡Increíble, Ninja! Ni el calor del desierto ni las tormentas de arena pudieron detenerte. Has demostrado que tu voluntad es tan firme como el desierto. ¡La Aldea de la Arena se inclina ante tu victoria!", ...T },
        { "--n-body-bg":"rgb(52,33,65)","--n-text":"#f0f6ff","--n-stats":"#bcd3ff","--n-frame-bg":"linear-gradient(180deg,#3b2f20,#2d2418)","--n-frame-border":"#b8843b","--n-board-bg":"#1b1b1b","--n-panel-a":"#2b1609","--n-panel-b":"#704019","--n-brillo":"#e6b85c","--n-btn-bg":"linear-gradient(135deg,#874318,#c87529)","--n-v-glow":"rgba(238,172,76,.25)" }),
    niebla: cfg("niebla", 16, 60,
        { victoriaTitulo:"¡VICTORIA!", victoriaMsg1:"¡Has completado el desafío de la Aldea de la Niebla!", victoriaMsg2:"¡Impresionante! Has demostrado tus habilidades y destrezas en este desafío. ¡Felicidades por tu victoria!", ...T },
        { "--n-body-bg":"#0a1519","--n-text":"#e8f7fa","--n-stats":"#bfe9ef","--n-frame-bg":"linear-gradient(180deg,#17343a,#0f2226)","--n-frame-border":"#3f7c86","--n-board-bg":"#0d1b1f","--n-panel-a":"#17343a","--n-panel-b":"#0a1519","--n-brillo":"#9fe8f0","--n-btn-bg":"linear-gradient(135deg,#17343a,#3f7c86)","--n-v-glow":"rgba(159,232,240,.28)" }),
    nube: cfg("nube", 16, 60,
        { victoriaTitulo:"¡VICTORIA!", victoriaMsg1:"¡Has completado el desafío de la Aldea de la Nube!", victoriaMsg2:"¡VICTORIA DE LA ALDEA DE LA NUBE! La velocidad del rayo ha demostrado su poder. Tu fuerza y rapidez fueron imparables y ningún rival pudo seguir tu ritmo. Rápido como el rayo, poderoso como la tormenta.", ...T },
        { "--n-body-bg":"#0a0f18","--n-text":"#eef6ff","--n-stats":"#c7def8","--n-frame-bg":"linear-gradient(180deg,#17263a,#0f1826)","--n-frame-border":"#3d78b8","--n-board-bg":"#0d1520","--n-panel-a":"#17263a","--n-panel-b":"#0a0f18","--n-brillo":"#8fd4ff","--n-btn-bg":"linear-gradient(135deg,#17263a,#3d78b8)","--n-v-glow":"rgba(143,212,255,.28)" }),
    roca: cfg("roca", 16, 60,
        { victoriaTitulo:"¡VICTORIA!", victoriaMsg1:"¡Has completado el desafío de la Aldea de la Roca!", victoriaMsg2:"¡VICTORIA DE LA ALDEA DE LA ROCA! La fuerza de la roca ha prevalecido. Tu resistencia fue superior y ningún rival pudo detenerte. Firme como la montaña, fuerte como la tierra.", ...T },
        { "--n-body-bg":"#21150d","--n-text":"#f5ece2","--n-stats":"#e0cdb8","--n-frame-bg":"linear-gradient(180deg,#3a2a1d,#24190f)","--n-frame-border":"#8c6140","--n-board-bg":"#1a120c","--n-panel-a":"#3a2a1d","--n-panel-b":"#21150d","--n-brillo":"#e5b273","--n-btn-bg":"linear-gradient(135deg,#3a2a1d,#8c6140)","--n-v-glow":"rgba(229,178,115,.28)" }),
};
export function obtenerConfigNivel(id){ return CONFIG_NIVELES[id] || CONFIG_NIVELES.akatsuki; }
