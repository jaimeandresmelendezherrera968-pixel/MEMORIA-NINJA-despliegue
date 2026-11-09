/**
 * CONFIGURACIÓN DE ZONAS DEL MAPA
 *
 * >>> OCP <<< En el niveles.js original había 3 objetos separados
 * (BOTON_SIZE, posiciones, destinos) que había que tocar los 3 cada
 * vez que se agregaba una zona nueva. Acá es uno solo por zona — para
 * sumar una zona nueva, se agrega UN objeto a este array, nada más.
 */
export const ZONAS = [
    { id: "sarutobi", tamano: 80, x: 396, y: 474 },
    { id: "hyuga", tamano: 80, x: 520, y: 478 },
    { id: "uzumaki", tamano: 80, x: 644, y: 474 },
    { id: "uchiha", tamano: 90, x: 776, y: 449 },
    { id: "arena", tamano: 75, x: 1021, y: 344 },
    { id: "roca", tamano: 75, x: 1339, y: 364 },
    { id: "niebla", tamano: 95, x: 680, y: 829 },
    { id: "nube", tamano: 95, x: 1124, y: 814 },
    { id: "akatsuki", tamano: 125, x: 1430, y: 785 },
];

// Todas las zonas van primero a pre-partida.html (tal como en el original)
export const DESTINO_COMUN = "pre-partida.html";
