# MAPEO PLAN-DESARROLLO.md

Fecha: 2026-11-17
Objetivo: CUMPLE / PARCIAL / FALTA / DESVIACIÓN con evidencia.

> El plan cambió de numeración al aplicar los ajustes del 2026-10-29. Por eso este mapeo usa secciones, no líneas fijas.

## Reglas, protocolo y estado base
- Reglas y protocolo: CUMPLE.
- `sql/esquema.sql`, auth real, seed demo: CUMPLE.
- Tests actuales: CUMPLE → 268 tests, 34 suites (16 de amistades).

## Parte 1 — SMTP
- CUMPLE. `SmtpNotificadorCorreo`, `MAILER=smtp|ethereal|consola`, tests y correo real verificado.
- Pendiente de seguridad: rotar la App Password expuesta.

## Parte 2 — Sesión real
- CUMPLE. `sesion-guard.js`, logout real, invitado/offline, CSP sin inline.
- Pendiente menor: prueba visual final de invitado/offline.

## Parte 3 — Datos reales + 3.5
- CUMPLE. Ranking/historial reales, URLs relativas, merge invitado→cuenta, cola, dedup y aviso visible de sincronización.

## Parte 4 — Endurecer backend
- CUMPLE en HTTP: auth/owner, CORS, cookies y rate limit.
- Seguridad de Socket.io resuelta en Parte 6.

## Parte 5 — Online base
- CUMPLE. Socket.io 1v1, salas, turnos, reconexión, abandono y anti-trampa.
- Además ya existen 2v2, QR/LAN, lista de salas y viewport.

## Parte 5.1 — Poderes online
- IMPLEMENTADA en código 1v1 y 2v2. Estado/chakra/vida/combo/tiempos/defensas, 6 poderes y contrarrestos.
- Efectos en tablero, banners, avisos dinámicos y vistas por jugador conectados.
- FALTA: E2E manual con 2 navegadores.
- `Poder.activar()` ya delega en `activarPoderOnline()`; no está deshabilitado.

## Parte 5.2 — Social
- CUMPLE EN CÓDIGO. Lista de salas, QR/LAN y `menu.html?codigo=`.
- Chat con rate limit, filtros por modo/contraseña, invitaciones con copia de enlace y persistencia online para cuentas con sesión.

## Parte 5.3 — 2v2 y espectadores
- CUMPLE EN CÓDIGO. 2v2, equipos, turno compartido, abandono, revancha, poderes/contrarrestos por equipo y espectadores solo lectura sin cartas ocultas.

## Parte 6 — Pulido/despliegue
- PARCIAL. Navegación, páginas huérfanas, viewport, mojibake, carga, Service Worker y audio en segundo plano resueltos.
- HECHOS: seguridad Socket.io (origen permitido y límites de eventos) y accesibilidad de loader/chat/lobby.
- FALTAN: validar despliegue HTTPS/wss real, logs/variables de Render y prueba en móvil real.

## Parte 7 — Offline
- CUMPLE EN CÓDIGO. Cola, dedup, merge, reintento automático en todas las páginas y aviso visible del resultado.

## Registro de avance
- El plan ya fue actualizado: Parte 5 completa; 5.1/5.2/5.3 y Parte 7 cerradas en código; Parte 6 pendiente de validación real.
