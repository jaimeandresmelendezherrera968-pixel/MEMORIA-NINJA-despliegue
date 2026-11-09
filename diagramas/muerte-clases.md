# Diagrama de clases — `js/muerte/` (Modo Muerte)

Modo de juego "Muerte" reestructurado en capas con POO y SOLID.

```mermaid
classDiagram

    class Muerte {
        <<punto de entrada>>
        +window load listener
        +new MuerteController() void
    }

    class MuerteController {
        <<raiz de composicion>>
        +HTMLElement tablero
        +HTMLElement mostrarTiempo
        +HTMLElement mostrarMovimientos
        +HTMLElement mostrarPuntaje
        +HTMLElement turnoInfo
        +HTMLElement modal
        +HTMLElement estadisticasFinales
        +HTMLElement botonGuardar
        +HTMLElement botonCerrar
        +HTMLElement victoryModal
        +HTMLElement victoryRestart
        +HTMLElement victoryClose
        +HTMLElement victoryStats
        +HTMLElement musica
        +string nombreJugador1
        +string nombreJugador2
        +number nivelActual
        +boolean modo2Jugadores
        +Jugador jugador1
        +Jugador jugador2
        +Partida partida
        +CartaService cartaService
        +PuntajeService puntajeService
        +JuegoService juegoService
        +TiempoService tiempoService
        +array cartasDOM
        +iniciar() void
        +generarTablero() void
        +voltearCarta(elemento, cartaEntidad) void
        +verificarCoincidencia() void
        +iniciarTiempo() void
        +tiempoAgotado() void
        +crearEstadisticasDerrota() string
        +actualizarEstadisticas() void
        +actualizarTurno() void
        +mostrarVictoria() void
        +crearEstadisticasVictoria() string
        +configurarBotones() void
        +guardarHistorial() void
        +configurarMusica() void
    }

    class Carta {
        +string aldea
        +string clan
        +string valor
        +number idPareja
        +boolean volteada
        +boolean emparejada
        +voltear() void
        +ocultar() void
        +marcarEmparejada() void
        +estaVolteada() boolean
        +estaEmparejada() boolean
        +getAldea() string
        +getClan() string
        +getValor() string
        +getIdPareja() number
    }

    class Jugador {
        +string nombre
        +number puntaje
        +sumarPuntos(puntos) void
        +reiniciarPuntaje() void
        +getNombre() string
        +getPuntaje() number
    }

    class Partida {
        +Jugador jugador1
        +Jugador jugador2
        +number jugadorActual
        +number movimientos
        +number segundos
        +array cartasVolteadas
        +number cartasEncontradas
        +number totalCartas
        +boolean finalizada
        +aumentarMovimientos() void
        +agregarCartaVolteada(carta) void
        +limpiarCartasVolteadas() void
        +cambiarTurno() void
        +obtenerJugadorActual() Jugador
        +aumentarCartasEncontradas() void
        +establecerTotalCartas(total) void
        +hayVictoria() boolean
        +reiniciar() void
    }

    class IJugadorRepository {
        <<interface>>
        +guardar(jugador) void
        +obtener() object
    }

    class IPartidaRepository {
        <<interface>>
        +guardar(partida) void
        +obtener() object
    }

    class JugadorRepository {
        -string clave
        +guardar(jugador) void
        +obtener() object
    }

    class PartidaRepository {
        -string clave
        +guardar(partida) void
        +obtener() object
    }

    class CartaService {
        -string rutaBack
        -string rutaAldeas
        +array cartasDisponibles
        +obtenerNiveles() array
        +generarTablero(nivelActual) array
        +obtenerImagenFrontal(carta) string
        +obtenerImagenBack() string
    }

    class JuegoService {
        -Partida partida
        -PuntajeService puntajeService
        +iniciar(totalCartas) void
        +puedeVoltear(carta) boolean
        +voltearCarta(carta) boolean
        +verificarPareja() boolean
        +parejaCorrecta() void
        +parejaIncorrecta() void
        +aumentarMovimiento() void
        +hayVictoria() boolean
        +obtenerJugador1() Jugador
        +obtenerJugador2() Jugador
        +obtenerJugadorActual() Jugador
    }

    class PuntajeService {
        -number puntosPorPareja
        +calcularPuntos() number
        +agregarPuntos(jugador) void
    }

    class TiempoService {
        -number segundos
        -number temporizador
        +iniciar(callback) void
        +detener() void
        +reiniciar(segundos) void
        +obtenerTiempo() number
    }

    Muerte --> MuerteController : crea (bootstrap)

    MuerteController *-- Jugador : jugador1
    MuerteController *-- Jugador : jugador2
    MuerteController *-- Partida
    MuerteController *-- CartaService
    MuerteController *-- PuntajeService
    MuerteController *-- JuegoService
    MuerteController *-- TiempoService

    Partida *-- Jugador : 1..2

    JuegoService --> Partida : usa (inyectada)
    JuegoService --> PuntajeService : usa (inyectada)

    CartaService --> Carta : crea

    IJugadorRepository <|.. JugadorRepository : LSP
    IPartidaRepository <|.. PartidaRepository : LSP
```

## Leyenda SOLID

| Principio | Dónde se aplica en `js/muerte/` |
|---|---|
| **S** — Responsabilidad Única | `CartaService` (genera cartas/imágenes), `JuegoService` (reglas de juego), `PuntajeService` (cálculo de puntos), `TiempoService` (temporizador): cada uno hace UNA cosa. El `MuerteController` solo orquesta y maneja DOM. |
| **O** — Abierto/Cerrado | Se agrega una implementación nueva de repositorio (ej. `PartidaRepositoryAPI`) sin tocar `IPartidaRepository` ni las ya existentes. |
| **L** — Sustitución | `JugadorRepository` y `PartidaRepository` se pueden intercambiar por cualquier otra clase que cumpla su contrato (`guardar()` / `obtener()`) sin romper al consumidor. |
| **I** — Segregación de Interfaces | `IJugadorRepository` tiene solo `guardar`/`obtener`; `IPartidaRepository` igual. Cada interfaz expone exactamente lo que su implementación ofrece. |
| **D** — Inversión de Dependencias | `MuerteController` es la única raíz de composición (único lugar donde se hace `new` de servicios/entidades). `JuegoService` recibe `partida` y `puntajeService` por constructor, no los crea. |

## Pilar POO

| Pilar | Dónde se aplica |
|---|---|
| Encapsulamiento | Entidades (`Carta`, `Jugador`, `Partida`) exponen su estado interno solo a través de métodos/getters (`getAldea()`, `getPuntaje()`, `estaVolteada()`). |
| Abstracción | `IJugadorRepository` / `IPartidaRepository` definen el contrato y lanzan "método debe ser implementado" si se usan directo. |
| Herencia | `JugadorRepository extends IJugadorRepository`, `PartidaRepository extends IPartidaRepository`. |
| Polimorfismo | Cualquier implementación de repositorio (localStorage hoy, servidor mañana) se usa igual por su interfaz. |

## Nota

Los repositorios (`JugadorRepository`, `PartidaRepository`) están definidos pero **aún no conectados** al `MuerteController`: hoy la persistencia del historial se hace directo al `localStorage` dentro del controller (`guardarHistorial()`).