# SEGUIMIENTO PODERES ONLINE + CUBRIR PLAN

�ltima actualizaci�n: 2026-10-29

## Estado global
- Partes 1-5: COMPLETAS (166/166 tests backend, 25 suites).
- Parte 5.1 (poderes online): CÓDIGO COMPLETO en 1v1; pendiente E2E manual. Banner de poderes, avisos y efectos de Bomba implementados.
- Parte 5.2 (social): EN PROGRESO (salas/QR/listas hechas; chat y persistencia online pendientes).
- Parte 5.3 (2v2/espectadores): EN PROGRESO (2v2 y revancha hechos; espectadores pendientes).
- Parte 6 (despliegue/pulido): EN PROGRESO.
- Parte 7 (offline): EN PROGRESO (cola/dedup/merge hechos; reintento autom�tico solo desde login).

## Estado real de poderes online
- Servidor 1v1 autoritativo: `chakra`, `vida`, `combo`, `aciertos`, `errores`, `tiempos`, `poderEnProceso`, `defensas.sustitucion` y `efectos`.
- Los 6 poderes tienen l�gica real: Byakugan revela 2 cartas, Sello bloquea una carta, Genjutsu mezcla 3 cartas ocultas, Sustituci�n defiende, Robo quita chakra y Bomba resta vida.
- Contrarrestos autom�ticos: Byakugan?Genjutsu, Sello?Sustituci�n y Bomba mitigada por Sustituci�n.
- Temporizador por jugador solo en 1v1; derrota por tiempo o por vida a 0.
- Cliente: `activarPoderOnline()`, listeners de estado/efectos, contadores de usos y aplicaci�n al tablero (`revelarTemporal`, `sellarCarta`, `aplicarMezcla`).
- Tests: 35 en `gestorSalas.test.js`, incluidos 9 nuevos de poderes/efectos.
- Pendiente: prueba manual con 2 navegadores y paridad de poderes/chakra en 2v2 (5.3).

## Objetivo actual
Cerrar la paridad de poderes online (1v1/2v2) por Socket.io, con servidor autoritativo, UI sincronizada y tests.

## Archivos clave
### Servidor
- `backend-poderes/src/servicios/online/GestorSalas.js`
- `backend-poderes/tests/gestorSalas.test.js`

### Cliente
- `js/multijugador/ClienteMultijugador.js`
- `js/multijugador/GestorSalaCliente.js`
- `js/nucleo-GAME ONLI/poderes/Poder.js`
- `js/nucleo-GAME ONLI/poderes/GestorPoderes.js`
- `js/nucleo-GAME ONLI/GestorPartida.js`

### UI/otros
- `game-online.html`
- `js/board-manager.js`
- `css/game-online.css`

## Checklist de seguimiento
- [x] Crear `docs/PLAN-LINEA-A-LINEA-MAPEO.md`
- [x] Crear `docs/POWERS-ONLINE-CHECKLIST.md`
- [x] Fase 1: estado base en servidor (chakra/defensas/poderEnProceso)
- [x] Fase 2: servidor poderes (los 6 poderes + vida/combo/tiempos/contrarrestos)
- [x] Fase 3: cliente poderes (activaci�n, contadores y efectos en tablero)
- [x] Fase 4: UI panel poderes (contadores/botones, banner de activación, avisos y efectos de impacto)
- [x] Fase 5: pruebas de poderes online (unitarias/integraci�n con Socket.io)
- [ ] Fase 6: E2E manual con 2 navegadores reales

## Siguiente paso exacto
Abrir dos navegadores/perfiles, jugar un 1v1 completo y verificar visualmente el banner de poder, los avisos, el impacto de Bomba y los 6 poderes con sus contrarrestos; después documentar el cierre.
