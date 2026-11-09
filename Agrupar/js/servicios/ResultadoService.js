export class ResultadoService {
    evaluarObjetos(elementosObjetos) {
        let errores = 0;

        elementosObjetos.forEach(elementoObjeto => {
            const carpetaActual = elementoObjeto.parentElement.id;
            const carpetaCorrecta = elementoObjeto.dataset.correct;

            if (carpetaActual !== carpetaCorrecta) {
                errores++;
            }
        });

        return errores === 0;
    }
}
