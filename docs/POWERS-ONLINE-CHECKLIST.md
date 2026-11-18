# POWERS ONLINE CHECKLIST

Fecha: 2026-11-17

## Servidor (`backend-poderes/src/servicios/online/GestorSalas.js`)

- [x] Estado autoritativo: `chakra`, `vida`, `combo`, `aciertos`, `errores`, `tiempos`, `poderEnProceso`, `defensas.sustitucion`, `efectos` y `usos`.
- [x] `activar-poder` con validaciones de turno/equipo, usos, chakra, cartas y ventana de reacción.
- [x] `poder-rechazado` con `motivo` para el cliente.
- [x] `poder-activado` con usos restantes y chakra del actor.
- [x] `poder-efecto` con el resultado de cada poder y de cada contrarresto.
- [x] `estado-poderes` y snapshot `estado-completo` con `version`/`hash` para reincorporación.
- [x] Bloqueo de `voltear-carta` con `poderEnProceso` o carta sellada.
- [x] Los 6 poderes con lógica real en 1v1 y 2v2.
- [x] Ventana de contrarresto de **3s**, con detección unificada vía `puedeReaccionar()` + `CONTRARRESTOS`.
- [x] Byakugan reactivo anula Genjutsu aunque queden menos de dos cartas.
- [x] Sello reactivo funciona aunque no queden cartas disponibles.
- [x] Contrarresto permitido al objetivo **o a cualquier compañero de equipo** en 2v2.
- [x] `contrapoderId` y `contrarrestadoPor` en todos los eventos de `contrarresto`.
- [x] `contrapoderId` en `ventana-contrarresto` y `indices` en `byakugan-revelado` (solo posiciones, nunca valores).
- [x] Rollback de chakra/usos si `crearAccion()` rechaza una acción válida.
- [x] Timers de poderes registrados en `sala.timersPoderes` y limpiados en revancha/fin de partida.
- [x] Daño de Bomba recalculado al resolver: Sustitución activa en ese momento mitiga a 10 y se consume.
- [x] Cancelación de daño/efectos por abandono, desconexión o expiración de gracia.

## Cliente

- [x] `ClienteMultijugador.activarPoder(poderId)`.
- [x] `GestorSalaCliente` escucha `poder-activado`, `poder-rechazado`, `poder-efecto`, `estado-poderes`, `estado-completo`.
- [x] Rehidratación de sello, Genjutsu y Byakugan tras reconexión.
- [x] `byakugan` privado revela valores solo al actor.
- [x] `byakugan-revelado` público marca solo las posiciones (`byakugan-rastro`) al rival, sin filtrar valores.
- [x] Banner de ventana dinámico: poder, segundos y contrapoder correctos; texto distinto para quien puede reaccionar y para quien debe esperar.
- [x] Aviso de contrarresto dinámico: `SELLO DE BLOQUEO: BOMBA EXPLOSIVA anulado`, etc.

## UI

- [x] Contadores de usos desde el servidor.
- [x] Botón resaltado al usar poder.
- [x] Banner de poder con autor/aliado/rival en 2v2.
- [x] Efectos visuales: revelado, rastro de Byakugan, sello, ilusión de Genjutsu, impacto de Bomba.

## Tests / verificación

- [x] `npm run check:js` → `Sintaxis OK: 334 archivos JS verificados.`
- [x] `npm test` → **239/239**, **32 suites** (2026-11-17).
- [x] `gestorSalas.test.js` → **83 tests** (1v1/2v2, poderes, contrarrestos, vistas, rejoin, abandono y revancha).
- [x] Casos nuevos: Sello vs Byakugan, Sello sin cartas, doble respuesta, Sustitución durante la ventana, Sustitución caída, Byakugan con <2 cartas, reacción 2v2, rejoin/abandono/revancha con ventana activa.
- [ ] Prueba manual E2E con dos navegadores reales (sigue pendiente).

## Despliegue (pendiente de confirmar en Render/Vercel)

Verificar en Render:

```text
NODE_ENV=production
RENDER=true
DATABASE_URL=<PostgreSQL>
MAILER=brevo
BREVO_API_KEY=<clave>
BREVO_SENDER_EMAIL=<correo verificado>
PUBLIC_FRONTEND_URL=https://<dominio>.vercel.app
CORS_ORIGINS=https://<dominio>.vercel.app
COOKIE_SECURE=1
COOKIE_TTL_MIN=1440
COOKIE_TTL_RECORDAR_MIN=43200
SERVIR_FRONTEND=0
PORT=10000
```

- `vercel.json` redirige `/api` a Render, pero `js/config.js` conecta Socket.IO directo a Render; revisar `wss://`, CORS y cookies `Secure`/`SameSite` ante dominios cruzados.
- Confirmar en los logs de Render que el esquema PostgreSQL está aplicado y que `MAILER=consola` no queda activo en producción.
