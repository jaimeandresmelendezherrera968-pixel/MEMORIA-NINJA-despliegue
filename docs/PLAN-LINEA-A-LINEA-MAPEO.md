# MAPEO PLAN-DESARROLLO.md

Fecha: 2026-10-29
Objetivo: CUMPLE / PARCIAL / FALTA / DESVIACI�N con evidencia.

> El plan cambi� de numeraci�n al aplicar los ajustes del 2026-10-29. Por eso este mapeo usa secciones, no l�neas fijas.

## Reglas, protocolo y estado base
- Reglas y protocolo: CUMPLE.
- `sql/esquema.sql`, auth real, seed demo: CUMPLE.
- Tests actuales: CUMPLE � 166/166, 25 suites.

## Parte 1 � SMTP
- CUMPLE. `SmtpNotificadorCorreo`, `MAILER=smtp|ethereal|consola`, tests y correo real verificado.
- Pendiente de seguridad: rotar la App Password expuesta.

## Parte 2 � Sesi�n real
- CUMPLE. `sesion-guard.js`, logout real, invitado/offline, CSP sin inline.
- Pendiente menor: prueba visual final de invitado/offline.

## Parte 3 � Datos reales + 3.5
- CUMPLE. Ranking/historial reales, URLs relativas, merge invitado?cuenta, cola y dedup.

## Parte 4 � Endurecer backend
- CUMPLE en HTTP: auth/owner, CORS, cookies y rate limit.
- La seguridad de Socket.io queda en Parte 6.

## Parte 5 � Online base
- CUMPLE. Socket.io 1v1, salas, turnos, reconexi�n, abandono y anti-trampa.
- Adem�s ya existen 2v2, QR/LAN, lista de salas y viewport.

## Parte 5.1 � Poderes online
- IMPLEMENTADA en c�digo 1v1. Estado/chakra/vida/combo/tiempos/defensas, 6 poderes y contrarrestos.
- Efectos en tablero y avisos conectados; 9 tests nuevos de poderes.
- FALTA: E2E manual con 2 navegadores, pulido de animaciones/banners y paridad 2v2 (5.3).
- `Poder.activar()` ya delega en `activarPoderOnline()`; no est� deshabilitado.

## Parte 5.2 � Social
- PARCIAL. Lista de salas, QR/LAN y `menu.html?codigo=` hechos.
- FALTAN: chat, filtros/invitaciones y persistencia online en servidor.

## Parte 5.3 � 2v2 y espectadores
- PARCIAL. 2v2, equipos, turno compartido, abandono y revancha hechos y testeados.
- FALTAN: espectadores y poderes/chakra de equipo.

## Parte 6 � Pulido/despliegue
- PARCIAL. Navegaci�n, p�ginas hu�rfanas, viewport y bot�n NIVELES resueltos.
- FALTAN: despliegue HTTPS/wss, seguridad Socket.io, m�vil real y accesibilidad completa.

## Parte 7 � Offline
- PARCIAL. Cola, dedup y merge hechos.
- FALTA: activar el reintento autom�tico en p�ginas de juego (hoy solo desde login).

## Registro de avance
- El plan ya fue actualizado: Parte 5 completa; 5.1/5.2/5.3/6/7 en progreso.
