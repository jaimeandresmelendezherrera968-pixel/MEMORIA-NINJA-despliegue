/*=========================================================
  MEMORIA NINJA
  RESALTADO DE SINTAXIS de la página objetos-postgresql-final.html

  Antes vivía como <script> inline dentro del HTML; se movió a este
  archivo porque el CSP del backend (helmet) bloquea el script inline.
========================================================*/

(function () {
  // Palabras clave de SQL y de JavaScript
  const sqlKw = "CREATE OR REPLACE FUNCTION VIEW PROCEDURE TABLE TRIGGER RETURNS AS BEGIN END LANGUAGE SELECT FROM WHERE JOIN LEFT INNER RIGHT ON GROUP BY ORDER DESC ASC INSERT INTO VALUES CONSTRAINT FOREIGN KEY REFERENCES PRIMARY DEFAULT NOT NULL IF EXISTS DROP EXECUTE FOR EACH ROW BEFORE AFTER UPDATE DELETE AND IS FILTER NULLS LAST FIRST CALL NEW RETURN TRUE FALSE".split(" ");
  const jsKw = "const let async await return if else try catch throw new class this true false null of for while function".split(" ");
  const kws = Array.from(new Set(sqlKw.concat(jsKw)));
  const typeAlt = "TEXT|INTEGER|TIMESTAMP|JSON";

  const re = new RegExp(
    "(--[^\\n]*|\\/\\/[^\\n]*)" +                                   // comentarios -- o //
    "|(\"(?:[^\"\\\\]|\\\\.)*\"|'(?:[^'\\\\]|\\\\.)*')" +           // cadenas de texto
    "|\\b(\\d+)\\b" +                                               // números
    "|\\b(" + typeAlt + ")\\b" +                                    // tipos de datos
    "|\\b(" + kws.join("|") + ")\\b",                               // palabras clave
    "g"
  );

  document.querySelectorAll("td.cod").forEach(function (cell) {
    let html = cell.textContent
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(re, function (m, com, str, num, typ, kw) {
      if (com) return '<span class="com">' + com + '</span>';
      if (str) return '<span class="str">' + str + '</span>';
      if (num) return '<span class="num">' + num + '</span>';
      if (typ) return '<span class="typ">' + typ + '</span>';
      if (kw)  return '<span class="kw">'  + kw  + '</span>';
      return m;
    });
    cell.innerHTML = html;
  });
})();
