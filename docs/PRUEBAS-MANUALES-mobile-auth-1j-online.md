# Pruebas manuales — Mobile/Auth, refactor 1J (base Uchiha), Muerte/Orden y verificación Online

> Rama de trabajo de referencia: `fix/menu-modales-separados-sin-error` (commits locales `a2bcbfd` → `f522d09`, sin merge ciego con `origin/main`).
> Objetivo: validar que la vista mobile (como PC, vertical/horizontal, **sin scroll de página**) y la funcionalidad **no se rompieron** tras los cambios de UI y la refactorización SOLID/POO de los modos 1 jugador.
> **No tocar / no modificar durante estas pruebas:** `backend-poderes/src/servicios/online/*`, `js/multijugador/*`, `js/nucleo-GAME ONLI/*` (poderes, turnos, vida/chakra, contrarrestos), `js/sesion-guard.js`, `js/login.js|registro.js|recuperar.js|verificacion.js` (flujo/auth/sesión), ni la lógica/IDs de los modales **morado `#twoPlayersModal`** y **verde `#multijugadorModal`**.

## Cómo reportar un fallo
Para cada fallo, anota: **pantalla/ruta + orientación (V/H) + dispositivo o tamaño viewport + pasos + resultado esperado vs obtenido**. Si es visual, captura. Si es recurso roto, pega el **404 de Network** (URL). Si es JS, pega el error de consola.

Formato sugerido:
- `[PANTALLA][V/H][viewport] Paso → esperado / obtenido (evidencia: 404|consola|captura)`

---

## 1) Autenticación (mobile V/H, sin scroll, textos legibles)
Cambios: `viewport-fit=cover` en las 4 páginas; `css/style.css`/`Pasos.css`/`verificacion.css` con `100dvh/svh`, safe-areas, encaje sin scroll y texto resaltado (sin oscurecer fondos). **Verificación usa opción A** (panel 2 columnas escalado completo al viewport, idéntico a PC). Lógica JS/auth **sin cambios**.

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| A1 | `login.html` V/H | Abrir, revisar campos, links, “Jugar como invitado”, `#msg` al fallar | Sin scroll de página; se ve como PC; textos/placeholders/links legibles sobre el video |
| A2 | `registro.html` V/H (form largo) | Completar visualmente todos los campos, checks términos/política, abrir/cerrar modales legales | Todo cabe sin scroll de página; modales legales con scroll interno si aplica y `max-height` al viewport; textos legibles |
| A3 | `recuperar.html` pasos 1→2→3 V/H | Navegar por los 3 pasos (indicador/numeritos) | Sin scroll; **los 3 numeritos/pasos visibles** (no transparentes), paso activo distinguible; textos legibles |
| A4 | `verificacion.html` (correo/código) V/H | Ver paso correo y paso código/temporizador/reenviar | **Panel escalado completo** (como PC, 2 columnas) sin recorte ni scroll en V y H; textos/inputs legibles |
| A5 | Teclado virtual (mobile real) | Enfocar inputs en registro/login/verificación | Minimizar desplazamiento/zoom raro (inputs 16px; `svh` usado). Si algún modelo empuja, reportar pantalla+orientación |

---

## 2) Modo 1 Jugador — clanes migrados a base `uchiha` (refactor SOLID/POO)
Cambios: shells finos por clan + `css/nivel-base.css` + `css/tema-aldea.css` + `js/niveles/{ControladorNivel.js,configNivel.js}` (import dinámico por clan, `TemaAldea`, `progresoService`+`historialApi`, `conectarPausa`). Estructura/posiciones/tamaños = uchiha; contenido propio por aldea (colores, cartas, textos, **reverso**). Reglas/tiempos configurados por clan.

Clanes: `akatsuki, sarutobi, hyuga, uzumaki, uchiha, arena, niebla, nube, roca`.

| # | Caso | Pasos | Esperado |
|---|---|---|---|
| J1 | Navegación | `menu → mapa → clan → pre-partida (info correcta) → <clan>.html → volver` | Ruteo correcto; info del clan en pre-partida OK (tú ya lo viste; revalidar rápido) |
| J2 | **Reverso/caras (RIESGO R1 — probable)** | Al cargar, ver cartas boca abajo y voltear | Reverso visible (**sin 404**) y caras correctas por aldea. **Reportar 404 de Network** si falta asset (rutas sospechosas: `respaldouzumaki/hyuga/uchiha/sarutobi.png`, `cartaarena/niebla/nube/roca.png` — confirmar contra `assets/img/` real) |
| J3 | Mecánica | Voltear 2 cartas: pareja/no pareja | Pareja se queda; no pareja se oculta; `Movimientos` incrementa; tablero no se bloquea incorrectamente |
| J4 | Tiempo/derrota | Dejar correr hasta 0 (o forzar tiempo bajo) | Timer corre; al llegar a 0 abre modal derrota con stats; botones funcionan |
| J5 | Victoria | Completar todas las parejas | Modal victoria con stats (`Movimientos`/`Puntaje`); `Jugar de nuevo` reinicia; `Volver al menú` navega |
| J6 | **Pausa (RIESGO R3)** | Botón pausa y tecla `Esc` durante partida | Pausa/reanuda el **timer real** y el juego (no sigue corriendo oculto). Ver que reanudar restaura estado |
| J7 | **Progreso/historial 1J (R4)** | Tras victoria y tras derrota, revisar perfil/historial | `progresoService` y `historialApi` registran resultado (zona/puntaje/ganador coherentes) |
| J8 | Mobile V/H sin scroll | Rotar y revisar stats + tablero + botón + modales | Se ve como PC, sin scroll de página, sin recorte; reverso/flip OK |
| J9 | Reversos `arena/niebla/nube/roca` (cambio) | Comparar con comportamiento previo | Ahora usan reverso propio vía `TemaAldea` (antes `assets/img/back.png`) — confirmar que es el deseado y sin 404 |
| J10 | `sarutobi/hyuga/uzumaki` fit (R5) | Probar en landscape bajo | Perdieron overrides fit/zona previos; confirmar que no descuadran |

---

## 3) Modo a muerte (1J, variante) — **EN PRUEBA**
Cambios: layout base `uchiha`/`nivel-base`+`tema-aldea` sin scroll (PC+mobile) con reglas/JS/IDs intactos; `MuerteController` sigue con guard `!modo2Jugadores` para progreso/historial. Mazo **mixto aleatorio de todas las aldeas/clanes** (konoha uzumaki/hyuga/uchiha/sarutobi + arena/roca/niebla/nube + akatsuki 1-8, `assets/img/cards/aldeas/akatsuki/8.png` existe), reverso `assets/img/respaldomuerte.png`. Dificultad por `localStorage["nivelActual"]` (default 1): **niv1=6,2=8,3=10,4=12,5=14,6+=16 pares** (tope). **No avanza `nivelActual` al ganar, sin selector/reset, no muestra nivel** (suele quedar en el valor guardado). Flujo: botón Muerte → `muerte.html` directo (sin mapa/pre-partida).

| # | Caso | Esperado |
|---|---|---|
| M1 | Entrada y mazo | Entra directo; cartas mezcladas de varias aldeas/clanes; reverso muerte visible |
| M2 | Cantidad de pares según `nivelActual` | Respeta 6/8/10/12/14/16 (tope). Verificar valor actual en `localStorage` si “siempre salen pocas” |
| M3 | Reglas/modales | `#statsModal` y comportamiento original intactos; progreso/historial **solo** si `!modo2Jugadores` |
| M4 | Mobile V/H sin scroll | Grid responsive (neutraliza inline 100px), se ve como base, sin scroll |
| M5 | Decisión producto (pendiente) | ¿Subir `nivelActual` al ganar (tope 16) y mostrar nivel? ¿Reset a 1 al entrar o continuar último? |

---

## 4) Modo Orden (variante)
Cambios: `viewport-fit=cover` + encaje viewport sin scroll en viewports acotados (preserva PC). Reglas/estructura/IDs intactos.

| # | Caso | Esperado |
|---|---|---|
| O1 | Flujo secuencia | Regla de orden intacta, stats/modales OK |
| O2 | Mobile V/H (especial landscape bajo) | Grid 3 columnas cabe sin scroll/recorte; si se corta, reportar viewport exacto |

---

## 5) Menú — guía y modales (sensible)
Cambios: `#puntajeInfoModal` convertido a **acordeón** `<details>/<summary>` (bonito/claro, `dvh`, focus en `summary`) con ítem **Modo a muerte (1J) — EN PRUEBA**. **No se tocaron** modales morado `#twoPlayersModal` ni verde `#multijugadorModal` (IDs/handlers/flujo).

| # | Caso | Esperado |
|---|---|---|
| G1 | Guía/puntaje | Abre/cierra, acordeones despliegan, texto legible, cabe en `100dvh`, incluye Muerte “EN PRUEBA” con reglas reales |
| G2 | **Modal morado** (unirse/salas/rápida 1v1/2v2) | Funciona igual que antes (sin crear/invitar) — **regresión crítica si falla** |
| G3 | **Modal verde** (crear+invitar, QR/código/enlace, sin “Partida rápida”, `aldeasSeleccionadas`) | Funciona igual que antes — **regresión crítica si falla** |

---

## 6) Niveles / pre-partida (revalidar)
Tú reportaste que botones del mapa, info de pre-partida y vistas mobile funcionaban bien; revalidar tras los shells 1J nuevos.
- Mapa: `contain` sin recorte, interacción/selección OK, ruteo correcto.
- Pre-partida: info correcta por clan, entra al nivel correcto, sin scroll V/H.

---

## 7) Online 1v1/2v2 — verificación (NO mezclar lógica de `main`; sensible)
**Evidencia (git):** los commits de esta sesión (auth/1J/menú/muerte/orden) **no modifican** `backend-poderes/src/servicios/online/GestorSalas.js`, `js/multijugador/*`, `js/nucleo-GAME ONLI/{GestorPartida,GestorTurno,GestorPoderes,GestorTiempo,poderes/*,entidades/*}`, `js/game-online.js`, `js/sesion-guard.js`, `backend-poderes/src/routes/salasRoutes.js`. `origin/main..HEAD` difiere en `game-online.html`/`css/game-online.css`/`TemaAldea` por integraciones **selectivas** previas (C3a/C1/C2), **no** por bajar lógica de `main` ahora. **Conclusión:** lógica online sensible intacta respecto a estos cambios; confirmar con prueba real de 2 clientes.

**Conservado en código (revisado estáticamente):** contrarrestos/validaciones server en `GestorSalas.js` (emite `contrarresto`, efectos byakugan/sello/genjutsu, 6 poderes `sustitucion,byakugan,robo,genjutsu,sello,bomba`); cliente `GestorPartida` escucha `poder-efecto-online` y maneja `contrarresto`; `Poder` delega `activarPoderOnline` en partidas online. `game-online.css` conserva animaciones (byakugan/sustitución explícitas + pulso/bonificación/fuego/carta-fade; confirmar visualmente que **los 6 poderes y el contrarresto** animan como antes).

### Guion de prueba 1v1 (2 clientes: 2 navegadores/pestañas o 2 dispositivos)
1. **Sala:** crear (verde) / unirse por código o matchmaking (morado) → ambos entran, `partida-iniciada`, mazo visible (sin filtrar ocultas).
2. **Turno/volteo:** solo el jugador del turno voltea; acierto conserva turno y suma; fallo espera ~800 ms y cambia turno; marcador/estado coherente.
3. **6 poderes + contrarresto:** activar cada uno (`sustitucion, byakugan, robo, genjutsu, sello, bomba`) verificando costo/efecto real en chakra/vida/combo/tiempo/cartas según aplique; provocar y confirmar **contrarresto** (animación + efecto bloqueado/esperado). *Vida/chakra máx 100, autoritativo server.*
4. **Animaciones:** cada poder y el contrarresto muestran su FX (sin quedarse pegados/romper el tablero).
5. **Fin:** victoria/derrota/**empate** posibles; abandono → rival gana; **revancha** (solo anfitrión, todos conectados) reinicia; reconexión dentro de 15 s reincorpora.
6. **2v2 (pendiente de paridad, AGENTS 5.3):** 4 jugadores, asientos 0-1 A / 2-3 B, turno compartido, poderes/contrarrestos por equipo — verificar paridad con 1v1.

---

## 8) Riesgos documentados (resumen)
- **R1 (alto, probable):** reversos/caras 404 en clanes migrados por rutas/nombres de asset (`TemaAldea`/`configNivel`) — validar J2/J9 con Network.
- **R2 (medio):** pérdida de UI/UX específica del `UIService`/controller viejo por clan al usar `ControladorNivel` genérico.
- **R3 (medio):** pausa no detiene timer real (contrato `PauseModal`/`conectarPausa` vs `tiempoService`).
- **R4 (bajo):** payload de progreso/historial 1J (zona/nombre/puntaje) distinto al esperado.
- **R5 (bajo):** `sarutobi/hyuga/uzumaki` pierden overrides fit/zona en landscape bajo.
- **R6 (producto):** Muerte EN PRUEBA — no avanza `nivelActual` al ganar, sin mostrar/selector/reset.

## 9) Fuera de alcance / no tocar
- Legado `Agrupar/` y `Agrupar/facil.html` (scripts inline/CSP) salvo decisión explícita.
- `-files` (volcado git).
- Online sensible y auth/sesión (listado al inicio). No push/merge a `prueba|main|origin` sin confirmación explícita.
