# SEGUIMIENTO PODERES ONLINE + CUBRIR PLAN

Última actualización: 2026-11-17

## Estado global

- Partes 1-5: COMPLETAS. Suite backend: **239/239 tests, 32 suites**.
- Parte 5.1 (poderes online): **código y tests completos** en 1v1 y 2v2. Falta únicamente la prueba E2E manual con dos navegadores.
- Parte 5.2 (social): EN PROGRESO (salas/QR/listas y chat de sala hechos; invitaciones y persistencia online pendientes).
- Parte 5.3 (2v2/espectadores): EN PROGRESO (2v2 y revancha con poderes hechos; espectadores pendientes).
- Parte 6 (despliegue/pulido): EN PROGRESO. Auditoría de variables Render/Vercel documentada; pendiente validar logs y dominios reales.
- Parte 7 (offline): EN PROGRESO (cola/dedup/merge y reintento automático al reconectar en todas las páginas; falta feedback visible).

## Estado real de poderes online

- Servidor autoritativo en 1v1 y 2v2: `chakra`, `vida`, `combo`, `aciertos`, `errores`, `tiempos`, `poderEnProceso`, `defensas.sustitucion`, `efectos` y usos.
- Los 6 poderes tienen lógica real: Byakugan revela 2 cartas, Sello bloquea una carta, Genjutsu mezcla 3 cartas ocultas, Sustitución defiende, Robo quita chakra y Bomba resta vida.
- Ventana de reacción unificada de **3s**:
  - Genjutsu → Byakugan (aunque queden <2 cartas).
  - Bomba → Sello.
  - Byakugan → Sello.
- Sello como reacción no exige cartas disponibles; Sello normal sí.
- En 2v2 puede contrarrestar el objetivo o cualquier compañero de su equipo.
- Bomba calcula el daño al resolver: 20, o 10 si Sustitución sigue activa en ese instante (y se consume).
- Vistas por usuario:
  - `byakugan`: valores y posiciones solo para quien lo activa.
  - `byakugan-revelado`: solo posiciones para el resto; nunca `valor`/`aldea`.
  - `estado-poderes`/`vistaEstado`: estado compartido sin cartas ocultas.
- Lifecycle: versiones monotónicas, timers registrados y limpiados en fin de partida/revancha/abandono; rejoin conserva la acción pendiente sanitizada.
- Cliente: banners dinámicos con `contrapoderId`, avisos de contrarresto, rastro visual de Byakugan, sello, ilusión de Genjutsu e impacto de Bomba.
- Tests: **81 en `gestorSalas.test.js`**; suite completa **239/239**.

## Objetivo actual

Cerrar la paridad de poderes online (1v1/2v2) con servidor autoritativo, UI sincronizada y tests; después pasar a 5.2 (chat/persistencia) y Parte 6 (despliegue/seguridad).

## Archivos clave

### Servidor

- `backend-poderes/src/servicios/online/GestorSalas.js`
- `backend-poderes/tests/gestorSalas.test.js`
- `backend-poderes/server.js`
- `backend-poderes/.env.example`

### Cliente

- `js/multijugador/ClienteMultijugador.js`
- `js/multijugador/GestorSalaCliente.js`
- `js/nucleo-GAME ONLI/poderes/Poder.js`
- `js/nucleo-GAME ONLI/poderes/GestorPoderes.js`
- `js/nucleo-GAME ONLI/GestorPartida.js`
- `js/board-manager.js`
- `js/config.js`

### UI / docs

- `game-online.html`
- `css/game-online.css`
- `docs/POWERS-ONLINE-CHECKLIST.md`
- `vercel.json`

## Checklist de seguimiento

- [x] Fase 1: estado base en servidor.
- [x] Fase 2: servidor poderes (los 6 poderes + vida/combo/tiempos/contrarrestos).
- [x] Fase 3: cliente poderes (activación, contadores y efectos en tablero).
- [x] Fase 4: UI panel poderes, banners y avisos dinámicos.
- [x] Fase 5: pruebas de poderes online (83 tests Socket.io).
- [x] Fase 5b: auditoría de despliegue (variables, cookies, CORS, Socket.IO) documentada en el checklist.
- [ ] Fase 6: E2E manual con 2 navegadores reales.
- [ ] Fase 6b: confirmar logs/variables en Render y dominio en Vercel.

## Siguiente paso exacto

Abrir dos navegadores/perfiles, jugar un 1v1 y un 2v2 completos y verificar visualmente los 6 poderes, las tres ventanas de 3s, el rastro de Byakugan sin valores y el banner correcto de cada contrarresto; después revisar los logs de Render con las variables del checklist.
