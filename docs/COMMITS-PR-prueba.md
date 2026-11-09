# Commits incluidos (rama `docs/pruebas-manuales-mobile-auth-1j-online` vs `origin/prueba`)

> Base: `origin/prueba` (0 detras / 55 delante). PR recomendado: **base = `prueba`** (no toca `main`; no incorpora los 5 commits de `main` ignorados a proposito: `c55e140,c1bbf9a,09252c3,54f5c8a,7d05449`).
> Esta **no es otra rama nueva**: es la misma `docs/pruebas-manuales-mobile-auth-1j-online` ya publicada; mezclar el PR (base=`prueba`) solo actualiza `prueba`. **`main` queda igual.**

## Lista de commits (en orden)

1. `adcda42 Merge pull request #6 from chris-jaimes1192/jaime`
2. `d8a0127 Merge pull request #7 from chris-jaimes1192/prueba`
3. `f7b7230 auto-commit`
4. `3227501 vista para celular`
5. `4471b3b auto-commit`
6. `1367a52 Merge pull request #8 from chris-jaimes1192/movil`
7. `0c3f756 auto-commit`
8. `1f717d8 auto-commit`
9. `628e0b5 auto-commit`
10. `dcc6f1a Merge pull request #9 from chris-jaimes1192/feature/mis-cambios-locales`
11. `1e45954 Merge origin/main en chrispro: vista movil y ajuste de recordar sesion`
12. `e762419 Ajusta barra de estado fija y compacta el aviso de invitado`
13. `550585e wip: respaldo local (multijugador/lobby/poderes) antes de integrar origin/main`
14. `c7020c4 Merge remote-tracking branch 'origin/main' into prueba`
15. `c201a12 Integra menu/main: modales morado y verde separados y gu├¡a de puntaje`
16. `95b60d4 Separa modales: verde crear+invitar sala, morado unirse+lista+rapida`
17. `5bf4965 Corrige HTML duplicado en menu (paneles/IDs morado y verde)`
18. `a2bcbfd C1 menu: integra estilos compatibles de main (salas-vacio-error, wrappers volver, panel inferior) conservando modales separados`
19. `3bc4b72 C2 visual/infra (Aparicio): agrega tema-aldea, TemaAldea/TiempoService, PauseModal, ConfiguracionAudio, assets/logos/cartas y fix carta-fade-3d`
20. `1e6dba5 C3a: integra TemaAldea/rutas dinamicas y 2 caras+flip en tablero online`
21. `d886b7d C4.1: niveles - integra vista de main + corrige mojibake (sin tocar online/poderes)`
22. `52c8e94 C4.1 fix: niveles mobile - mapa contain sin recorte + boton volver tactil`
23. `d96b29f C4.1 fix: niveles glow suave en bordes (movil/tactil), sin negro`
24. `836084e C4.2: pre-partida (individual) - integra main + rutas logos/UTF8 + fit sin scroll H/V`
25. `98bb918 C4.2 fix: pre-partida sin mojibake/BOM + logos assets/logos + fit sin scroll H/V`
26. `927b918 C4.2 fix: pre-partida igual que PC en movil H/V, sin scroll (scale-to-fit lienzo fijo)`
27. `decf2bb C4.3a: uchiha - integra vista/controller main (TemaAldea/pausa/precarga) + UTF8 + viewport mobile`
28. `ac693ad C4.3a: uchiha - integra vista/controller main (TemaAldea/pausa/precarga) + UTF8 + viewport mobile`
29. `8171228 C4.3a fix: uchiha fit sin scroll H/V como PC (lienzo escalado)`
30. `fbd21bd C4.3a fix: uchiha tablero mas grande + fondo video contain sin recorte H/V`
31. `bbdc0a7 C4.3a fix: uchiha fondo sin bordes negros (glow cover detras + video contain sin recorte)`
32. `83efb20 C4.3a fix: uchiha = como PC en movil H/V (fondo cover, lienzo 660px scale-to-fit sin scroll)`
33. `013cffc C4.3a: uchiha PC-first (fondo full, composicion centrada, tama├▒os ajustables comentados)`
34. `5497c64 C4.3b: sarutobi PC-first (fondo full, game-shell, tema-aldea/Fredoka, ids intactos, tamanos ajustables)`
35. `7fd888d C4.3c: hyuga PC-first (fondo full, game-shell, tema-aldea/Fredoka, ids intactos, tamanos ajustables)`
36. `3ee99ae C4.3d: uzumaki PC-first (fondo full, game-shell, tema-aldea/Fredoka, ids intactos, tamanos ajustables)`
37. `2483b08 C4.3b fix: sarutobi = fit 83efb20 (sin scroll H/V) + TemaAldea/respaldo/flip via deltas main, conserva progreso+historial`
38. `079a216 C4.3c fix: hyuga = fit 83efb20 (sin scroll H/V) + TemaAldea/respaldo/flip via deltas main, conserva progreso+historial`
39. `8661347 C4.3d fix: uzumaki = fit 83efb20 (sin scroll H/V) + TemaAldea/respaldo/flip via deltas main, conserva progreso+historial`
40. `1aacea0 C4.3b-d fix: fondo full viewport (video fuera canvas) + tablero similar uchiha (108x151,28, lienzo 660 AJUSTAR); respaldo/contenido por clan intacto`
41. `1ecdd7b C4.3b-d: layout/posiciones/tama├▒os = uchiha 83efb20 (stats/boton volver/board 100x140,30, lienzo 660 fit sin scroll); pausa via PauseModal+tema-aldea; contenido/colores/respaldo por clan intacto`
42. `1204501 C4.3b-d: layout/tama├▒os/posiciones = uchiha actual (108x151,28, fit 660 sin scroll, stats/volver/pausa); solo colores distintos; cartas/respaldo/IDs/l├│gica por clan intactos`
43. `d68482c C4.3b-d: iguala tama├▒o/posici├│n a uchiha (stats margin 0 auto 6px, boardFrame 18px auto + max-width, boton margin-top 4); colores/cartas/respaldo propios; fit sin scroll conservado`
44. `e644511 C4.3b-d: tablero/bot├│n = tama├▒o uchiha fijo 108x151 (override tema-aldea viewport calc, boton en flujo no fixed); pausa compacta sin scroll; colores/cartas/respaldo propios`
45. `fb62d29 fix base akatsuki: estructura = uchiha (game-shell, stats/board/boton como uchiha, boton fixed bottom-left via tema-aldea), tema-aldea controla tama├▒o/posici├│n responsive; solo colores propios por config`
46. `3568124 pausa: compacta sin scroll (override tema-aldea; ajusta tama├▒os/gaps, oculta ayuda/subtextos en pantallas chicas)`
47. `c707d64 refactor(1j): shells uchiha-base + ControladorNivel para clanes normales (sin tocar online/poderes)`
48. `5fabf84 muerte(1j): layout uchiha/base (sin scroll PC+mobile), conserva reglas/modales/IDs+modo2Jugadores+progreso/historial, pausa`
49. `ee77583 orden: fit viewport mobile sin scroll (preserva PC), viewport-fit-cover`
50. `1132262 fix(muerte): activar layout uchiha/tema-aldea (data-tema-aldea, grid responsive) + neutralizar inline 100px`
51. `fad4095 muerte: mazo mixto aleatorio de todas las aldeas/clanes (progresion 6-16 pares) + akatsuki/8 + guia menu`
52. `ed484b4 menu: guia/puntaje como acordeon (bonito, claro) + flujo Modo a muerte marcado EN PRUEBA; focus-trap summary`
53. `5e74172 auth: vista mobile V/H sin scroll (como PC) para login/registro/recuperar/verificacion (solo CSS+viewport)`
54. `f522d09 auth: mejorar legibilidad de textos (sin oscurecer fondos) + pasos recuperar mas visibles`
55. `7e76bd9 docs: guia de pruebas manuales mobile/auth, 1J refactor (base Uchiha), Muerte/Orden y verificacion online`

## Archivos (resumen diff vs origin/prueba)
```
 uzumaki.html                                       |  160 +--
 verificacion.html                                  |    2 +-
 97 files changed, 5740 insertions(+), 6355 deletions(-)
```
