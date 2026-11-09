const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

class DatabasePostgres {
  constructor(config = {}) {
    const poolConfig = {
      host: config.host || process.env.PGHOST || "localhost",
      port: config.port || process.env.PGPORT || 5432,
      database: config.database || process.env.PGDATABASE,
      user: config.user || process.env.PGUSER,
      password: config.password || process.env.PGPASSWORD,
    };

    const databaseUrl = config.databaseUrl || process.env.DATABASE_URL;
    if (databaseUrl) {
      this.pool = new Pool({ connectionString: databaseUrl, ssl: config.ssl });
    } else {
      this.pool = new Pool(poolConfig);
    }

    this.ubicacion = "postgres";
    this.motor = "postgres";
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    // FUENTE ÚNICA DEL ESQUEMA: sql/esquema.sql en la raíz del repo.
    // (Ya no existe schema-postgres.sql duplicado dentro de src/infraestructura.)
    const schemaPath = path.resolve(__dirname, "..", "..", "..", "sql", "esquema.sql");
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, "utf8");
      await this.pool.query(schema);
    } else {
      throw new Error(`Esquema no encontrado: ${schemaPath} (corre npm run db:setup)`);
    }
    this._initialized = true;
  }

  get db() {
    return this;
  }

  query(text, params) {
    return this.pool.query(text, params);
  }

  #prepararCon(ejecutar, sql) {
    // Los repositorios usan "?" y "rowid" (estilo SQLite).
    // PostgreSQL exige $1,$2,... y su columna equivalente es "ctid"
    // La traducción ocurre en UN solo lugar: esta capa de infraestructura.
    let indice = 0;
    const sqlPostgres = sql
      .replace(/\?/g, () => `$${++indice}`)
      .replace(/\browid\b/gi, "ctid");





      

    return {
      run: async (...args) => {
        const res = await ejecutar(sqlPostgres, args);
        return { changes: res.rowCount, lastInsertRowid: res.rows?.[0]?.id };
      },
      get: async (...args) => {
        const res = await ejecutar(sqlPostgres, args);
        return res.rows[0] || undefined;
      },
      all: async (...args) => {
        const res = await ejecutar(sqlPostgres, args);
        return res.rows;
      },
    };
  }

  prepare(sql) {
    return this.#prepararCon(
      (texto, params) => this.pool.query(texto, params),
      sql
    );
  }

  /**
   * TRANSACCIÓN con AISLAMIENTO real.
   *
   * Un pool reparte cada pool.query() en una conexión DISTINTA, así que un
   * BEGIN + INSERT no comparten transacción. Para que sí la compartan se
   * toma UNA conexión dedicada (client) y todas las sentencias del callback
   * se ejecutan sobre ella: BEGIN -> ... -> COMMIT/ROLLBACK.
   *
   * El callback recibe un `db` con prepare()/query() ligados al client, de
   * modo que un repositorio puede hacer SELECT ... FOR UPDATE y luego el
   * UPDATE dentro del MISMO aislamiento (ACID -> Isolation).
   */
  async transaccion(fn) {
    const client = await this.pool.connect();
    const dbCliente = {
      query: (texto, params) => client.query(texto, params),
      prepare: (sql) =>
        this.#prepararCon((texto, params) => client.query(texto, params), sql),
    };

    try {
      await client.query("BEGIN");
      const resultado = await fn(dbCliente);
      await client.query("COMMIT");
      return resultado;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  close() {
    return this.pool.end();
  }
}

module.exports = DatabasePostgres;
