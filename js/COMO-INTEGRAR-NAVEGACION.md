# Navegación refactorizada (niveles.js / pre-partida.js)

## Resultado
De 189 + 81 = 270 líneas mezcladas, a **6 clases/configuraciones**
en `core-navegacion/` + los 2 archivos originales como controladores
delgados.

## Capas — niveles.js (mapa)
- `ConfiguracionZonas.js` — los datos de las 9 zonas (antes eran 3
  objetos sueltos que había que tocar los 3 al agregar una zona)
- `MapaInteractivo.js` — escala y posiciona los botones sobre el video
- `ModoCoordenadas.js` — la herramienta de desarrollo (tecla "C"),
  separada por completo de la navegación real

## Capas — pre-partida.js (selección de clan)
- `ConfiguracionClanes.js` — los datos de los 9 clanes/aldeas
- `RepositorioClanes.js` — acceso a esos datos
- `VistaClan.js` — pintar el panel superior y el footer

## ⚠️ Único cambio obligatorio: `type="module"`

En `niveles.html` y `pre-partida.html`:
```html
<script type="module" src="js/niveles.js"></script>
<script type="module" src="js/pre-partida.js"></script>
```

## ⚠️ Sin `onclick` inline (CSP activo)

El backend sirve con `helmet()` (CSP `script-src-attr 'none'`), así que los
`onclick` inline NO se ejecutan. `pre-partida.html` ya no los usa: los botones
se conectan por `addEventListener` desde `pre-partida.js`.

- `#btn-iniciar` lo maneja `PrePartidaController` (manda al HTML correcto de
  cada aldea: `arena.html`, `sarutobi.html`, etc., según `nivelActual`).
- `#btn-confirmar` (CONFIRMAR) tiene listener en `pre-partida.js` (antes era
  un `onclick="confirmarNivel()"`). `window.confirmarNivel` se mantiene solo
  por compatibilidad.
- `#btnVolverMenu` (← VOLVER AL MENU) usa un listener en vez de
  `onclick="window.location.href='menu.html'"`.
- El simulador (cajas de clan) usa `data-clan` + listener que llama a
  `prePartidaController.seleccionarClan(...)` (antes `actualizarClan(...)`,
  que ni existía).

## Comportamiento verificado igual al original
- El mapa se sigue escalando y reposicionando igual al resizar.
- El modo coordenadas (tecla "C") sigue copiando al portapapeles.
- Clic en una zona guarda `nivelActual` en localStorage y va a
  pre-partida.html, igual que antes.
- pre-partida.html sigue leyendo `nivelActual`, usando "uzumaki" como
  clan por defecto si no hay nada guardado.
- Confirmar nivel sigue mostrando el botón "INICIAR JUEGO" y
  marcándolo como confirmado.
