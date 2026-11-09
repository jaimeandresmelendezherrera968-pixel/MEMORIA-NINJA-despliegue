/**
 * Error con CODIGO de negocio.
 *
 * Permite que el Controller traduzca el error al HTTP status correcto
 * (401 credenciales, 403 sin verificar, 423 bloqueada, 429 intentos...)
 * sin tener que parsear cadenas de texto.
 */
function errorConCodigo(mensaje, codigo) {
  const error = new Error(mensaje);
  error.codigo = codigo;
  return error;
}

module.exports = { errorConCodigo };