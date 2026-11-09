import { CLANES, DESTINOS_JUEGO } from "./ConfiguracionClanes.js";

/**
 * >>> SRP <<< Encapsula el acceso a los datos de clanes — quien lo usa
 * no sabe (ni le importa) que por dentro son 2 objetos planos.
 */
export class RepositorioClanes {
    obtener(idClan) {
        return CLANES[idClan] || null;
    }

    obtenerDestinoJuego(idClan) {
        return DESTINOS_JUEGO[idClan] || null;
    }

    existe(idClan) {
        return Boolean(CLANES[idClan]);
    }
}
