# POWERS ONLINE CHECKLIST

Fecha: 2026-10-29

## Servidor (GestorSalas.js)
- [x] A�adir estado: `sala.chakra`, `sala.defensas.sustitucion`, `sala.poderEnProceso`
- [x] Inicializar en `inicializarEstadoSala()`
- [x] Reescribir evento `activar-poder` con validaciones (turno/equipo, usos, chakra)
- [x] A�adir `poder-rechazado`
- [x] A�adir `poder-activado` con info para UI
- [x] A�adir `poder-efecto` con resultado
- [~] `estado-poderes` para rejoin (el estado completo viaja en `vistaEstado`; el evento existe en cliente)
- [x] Bloquear `voltear-carta` si `poderEnProceso` o carta sellada
- [x] L�gica de los 6 poderes + vida/combo/tiempos/contrarrestos
- [x] Incluir poderes/estado en `vistaEstado`

## Cliente
- [x] `ClienteMultijugador.activarPoder(poderId)`
- [x] `GestorSalaCliente` escucha `poder-activado`/`poder-rechazado`/`poder-efecto`/`estado-poderes`
- [x] `GestorPartida` contexto `activarPoderOnline`
- [x] `Poder.js` usa flujo socket online
- [x] `GestorPoderes` pasa el contexto correcto
- [x] `GestorPartida`/`GestorSalaCliente` aplican efectos al tablero (revelar, mezclar, sellar)

## UI
- [x] Resaltar bot�n al usar poder
- [x] Actualizar contadores desde servidor
- [x] Mostrar aviso de quién usó poder (`poder-activado-online` banner + `poder-efecto-online` aviso)
- [x] Estilos CSS para efectos (revelado/sello/ilusión, banner de poder e impacto de Bomba)

## Tests/Pruebas
- [x] `npm test` backend: 166/166, 25 suites
- [x] 1v1 online con poderes (integraci�n Socket.io)
- [ ] 1v1 online con poderes (manual, 2 navegadores)
- [ ] 2v2 online con poderes por equipo
- [x] Sustituci�n + Bomba (10) consume
- [x] Sustituci�n + Robo evade consume
- [x] Usos se agotan
- [x] Byakugan/Sello/Genjutsu/contrarrestos (tests de integraci�n)
