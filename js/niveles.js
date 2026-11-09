import { ZONAS, DESTINO_COMUN } from "./core-navegacion/ConfiguracionZonas.js";
import { MapaInteractivo } from "./core-navegacion/MapaInteractivo.js";
import { ModoCoordenadas } from "./core-navegacion/ModoCoordenadas.js";

/**
 * NavegadorNiveles
 *
 * >>> SRP <<< Lo ├║nico que decide es "a d├│nde vamos cuando se
 * selecciona una zona" ÔÇö guarda el nivel elegido y redirige. La
 * l├│gica de C├ôMO se ve y se escala el mapa es de MapaInteractivo.
 */
class NavegadorNiveles {
    irA(idZona) {
        localStorage.setItem("nivelActual", idZona);
        window.location.href = DESTINO_COMUN;
    }
}

// ================== RA├ìZ DE COMPOSICI├ôN ==================
const navegadorNiveles = new NavegadorNiveles();

const mapaInteractivo = new MapaInteractivo({
    idOverlay: "overlay",
    idVideo: "mapaVideo",
    zonas: ZONAS,
    alSeleccionarZona: (idZona) => navegadorNiveles.irA(idZona),
});

// Herramienta de desarrollo (tecla "C"), separada de la navegaci├│n real.
new ModoCoordenadas({ idOverlay: "overlay", mapaInteractivo });
