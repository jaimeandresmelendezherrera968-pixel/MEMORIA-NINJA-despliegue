# Cómo quedó organizado `game-online.js`

## Estructura nueva

```
js/
  game-online.js          ← ahora son 12 líneas: solo el arranque
  mock-server.js          ← SIN TOCAR (igual que antes)
  ui-manager.js           ← SIN TOCAR (igual que antes)
  board-manager.js        ← SIN TOCAR (igual que antes)
  nucleo/
    GestorPartida.js      ← raíz de composición, arma y conecta todo
    GestorTurno.js        ← de quién es el turno
    GestorTiempo.js       ← los 2 cronómetros
    entidades/
      Personaje.js        ← reemplaza los objetos planos jugador/rival
    poderes/
      Poder.js            ← clase abstracta (Template Method)
      ByakuganPoder.js
      SustitucionPoder.js
      RoboPoder.js
      GenjutsuPoder.js
      SelloPoder.js
      BombaPoder.js
      GestorPoderes.js    ← arma los 6 poderes e inyecta el contexto
    datos/
      ProveedorDatos.js         ← interfaz
      ProveedorDatosSimulado.js ← implementación con tu MockServer actual
    vista/
      VistaPartida.js     ← TODA la manipulación de DOM del panel principal
```

## Mapeo completo: qué variable/función de antes quedó dónde

| Antes (en game-online.js) | Ahora |
|---|---|
| `let cartasVolteadas`, `movimientosActuales`, etc. | Siguen viviendo en `board-manager.js` (no se tocó) |
| `let turnoJugador` | `GestorTurno` (privado, `#esTurnoDeSasuke`) |
| `esMiTurno()` | `gestorTurno.esMiTurno()` |
| `jugadorActivo()` | `contexto.jugadorActivo()` (usa `gestorTurno` por dentro) |
| `const jugador = {...}`, `const rival = {...}` | `new Personaje({...})` — dos instancias en `GestorPartida` |
| `iniciarJuegoOnline()`, `cargarPanelSuperior()`, etc. | `GestorPartida.iniciar()` + métodos de `VistaPartida` |
| `actualizarIndicadorTurno()`, `cambiarTurno()` | `GestorTurno.cambiar()` + `vista.renderTurno()` (conectados por `alCambiarTurno`) |
| `iniciarTemporizadores()`, `tiempoSasukeActual`, etc. | `GestorTiempo` |
| `procesarResultado()` | `GestorPartida.procesarResultado()` |
| `mostrarModalFinal()` | `GestorPartida.mostrarModalFinal()` + `vista.mostrarModalFinal()` |
| `actualizarCombo()`, `mostrarComboRoto()` | `vista.renderCombo()`, `vista.mostrarComboRoto()` |
| `ganarChakra()`, `ganarChakraPorCombo()`, `actualizarChakra()` | `Personaje.ganarChakra()` (entidad) + `vista.renderChakra()` (DOM) |
| `perderVida()`, `actualizarVida()` | `Personaje.recibirDanio()` (entidad) + `vista.renderVida()` (DOM) |
| `mostrarAvisoRapido()` | `vista.mostrarAvisoRapido()` |
| Las 6 secciones de poderes completas (BYAKUGAN...BOMBA) | `poderes/*.js` + `GestorPoderes` |

## Qué se ganó (aplicado a gran escala, como pediste)

- **De ~1560 líneas en un solo archivo procedural**, a **15 clases chicas**, cada una con una sola responsabilidad clara — el archivo más largo (`VistaPartida.js`) tiene ~150 líneas, y son puras asignaciones de texto a elementos del DOM, nada de lógica de negocio mezclada.
- **Cero variables sueltas a nivel de archivo** (`let turnoJugador`, `let byakuganActivo`, etc.) — todo vive encapsulado dentro de la clase que le corresponde.
- **`GestorPartida` es la única raíz de composición** — es el único archivo de todo el motor donde aparece la palabra `new` para las clases concretas (Personaje, GestorTurno, GestorTiempo, VistaPartida, GestorPoderes, ProveedorDatosSimulado). Todo lo demás recibe sus dependencias por constructor o por el objeto `contexto` (DIP).
- **`ProveedorDatosSimulado`** deja preparado el reemplazo futuro por un servidor real: el día que exista, se crea `ProveedorDatosServidor.js` con el mismo método `obtenerDatos()` y se cambia una sola línea en `GestorPartida` — nada más se entera del cambio (LSP + DIP, igual que en el backend de poderes).
- Los 6 poderes siguen funcionando con el mismo patrón *Template Method* que ya habíamos armado: `Poder.activar()` define el esqueleto fijo de validaciones, cada poder solo llena su `efecto()`.

## ⚠️ Importante antes de reemplazar tu archivo real

Este código lo armé leyendo tu `game-online.js`, `board-manager.js`, `mock-server.js` y `ui-manager.js` reales, y **no lo pude correr en un navegador de verdad** desde acá (no tengo forma de abrir tu HTML con el DOM real). Antes de borrar tu `game-online.js` viejo:

1. Copiá la carpeta `js/nucleo/` completa a tu proyecto.
2. Reemplazá el contenido de `js/game-online.js` por el nuevo (12 líneas).
3. Probalo jugando una partida completa vos mismo: usar los 6 poderes, que se acabe el tiempo, ganar por parejas completas, un combo, un error con y sin Sustitución armada.
4. Si algo no anda igual que antes, guardá el error de la consola del navegador (F12) y me lo pasás — lo ajustamos puntual sin tener que rehacer nada de lo demás.
