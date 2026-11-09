//polimorfismo CANVA 
//El polimorfismo lo utilicé en las interfaces IJugadorRepository e IPartidaRepository. 
//Ambas tienen los métodos guardar() y obtener(),
//  pero cada una los implementa de manera diferente según el tipo de datos que manejan (jugadores o partidas).

//En mi proyecto tengo la estructura para utilizar polimorfismo mediante las interfaces y las clases que las implementan.
//  Por ejemplo, JugadorRepository y PartidaRepository heredan de diferentes interfaces y cada repositorio implementa su propio 
// comportamiento para guardar() y obtener()
export class IJugadorRepository {
    guardar(jugador) {
        throw new Error(
            "El método guardar debe ser implementado"
        );
    }

    obtener() {
        throw new Error(
            "El método obtener debe ser implementado"
        );
    }
}

//Aquí aplico el principio de sustitución de Liskov 
// porque JugadorRepository hereda de IJugadorRepository y mantiene las operaciones que espera la clase base, 
// como guardar y obtener un jugador.
//La clase hija puede utilizarse como una implementación del repositorio que espera el programa