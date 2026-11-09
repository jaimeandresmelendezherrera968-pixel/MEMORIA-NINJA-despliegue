export class SecuenciaService {

    constructor() {

    }


    generarSecuencia(ids) {

        let secuencia = [...ids];


        for (
            let i = secuencia.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(
                    Math.random() * (i + 1)
                );

            [
                secuencia[i],
                secuencia[j]
            ] = [
                secuencia[j],
                secuencia[i]
            ];

        }


        return secuencia;

    }

}