require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const path = require("path");

const Jugador = require("./src/entities/Jugador");
const Partida = require("./src/entities/Partida");
const PoderFactory = require("./src/factories/PoderFactory");
const PoderService = require("./src/services/PoderService");
const PoderController = require("./src/controllers/PoderController");
const crearRutasPoderes = require("./src/routes/poderRoutes");

const DatabasePostgres = require("./src/infraestructura/DatabasePostgres");
const PasswordHasher = require("./src/infraestructura/PasswordHasher");
const CodigoHasher = require("./src/infraestructura/CodigoHasher");
const CodigoNumericGenerator = require("./src/infraestructura/CodigoNumericGenerator");
const ConsolaNotificadorCorreo = require("./src/infraestructura/ConsolaNotificadorCorreo");
const EtherealNotificadorCorreo = require("./src/infraestructura/EtherealNotificadorCorreo");
const SmtpNotificadorCorreo = require("./src/infraestructura/SmtpNotificadorCorreo");
const PartidaRepositorySQL = require("./src/repositories/PartidaRepositorySQL");
const UsuarioRepositorySQL = require("./src/repositories/UsuarioRepositorySQL");
const HistorialPartidaRepositorySQL = require("./src/repositories/HistorialPartidaRepositorySQL");
const CodigoVerificacionRepositorySQL = require("./src/repositories/CodigoVerificacionRepositorySQL");
const SesionRepositorySQL = require("./src/repositories/SesionRepositorySQL");
const UsuarioService = require("./src/services/UsuarioService");
const AuthService = require("./src/services/AuthService");
const VerificacionService = require("./src/services/VerificacionService");
const RecuperacionService = require("./src/services/RecuperacionService");
const UsuarioController = require("./src/controllers/UsuarioController");
const AuthController = require("./src/controllers/AuthController");
const VerificacionController = require("./src/controllers/VerificacionController");
const RecuperacionController = require("./src/controllers/RecuperacionController");
const crearRutasUsuarios = require("./src/routes/usuarioRoutes");
const crearRutasAuth = require("./src/routes/authRoutes");
const PartidaService = require("./src/services/PartidaService");
const PartidaController = require("./src/controllers/PartidaController");
const crearRutasPartidas = require("./src/routes/partidaRoutes");
const VistaRepositorySQL = require("./src/repositories/VistaRepositorySQL");
const VistaService = require("./src/services/VistaService");
const VistaController = require("./src/controllers/VistaController");
const crearRutasVistas = require("./src/routes/vistaRoutes");
const ProcedimientoRepositorySQL = require("./src/repositories/ProcedimientoRepositorySQL");
const ProcedimientoService = require("./src/services/ProcedimientoService");
const ProcedimientoController = require("./src/controllers/ProcedimientoController");
const crearRutasProcedimientos = require("./src/routes/procedimientoRoutes");
const crearMiddlewaresDeAutorizacion = require("./src/middlewares/AutorizacionMiddleware");
const EstadoController = require("./src/controllers/EstadoController");
const crearRutasEstado = require("./src/routes/estadoRoutes");
const crearRutasSalas = require("./src/routes/salasRoutes");

/**
 * RAÍZ DE COMPOSICIÓN (Composition Root)
 *
 * ÚNICO lugar donde se arma el grafo de dependencias con `new`.
 *
 * AHORA SOLO PostgreSQL: el esquema canónico es sql/esquema.sql (raíz),
 * que cada PC aplica con `npm run db:setup` usando SU .env. Si faltan las
 * credenciales, el backend NO arranca (fail fast) — nunca cae a SQLite.
 */
if ((process.env.DB_TYPE || "postgres").toLowerCase() !== "postgres") {
  throw new Error("Este backend usa SOLO PostgreSQL. Configura DB_TYPE=postgres en .env");
}
if (
  !process.env.DATABASE_URL &&
  (!process.env.PGPASSWORD || !process.env.PGDATABASE)
) {
  throw new Error(
    "Faltan credenciales de PostgreSQL. Copia .env.example a .env y completa PGPASSWORD/PGDATABASE (o define DATABASE_URL)."
  );
}

const database = new DatabasePostgres();
const passwordHasher = new PasswordHasher();
const codigoHasher = new CodigoHasher();
const codigoGenerador = new CodigoNumericGenerator();
// Selección del notificador de correo según MAILER (fail-fast si es smtp).
//   MAILER=consola  -> imprime el código en la consola del servidor (default)
//   MAILER=ethereal -> Ethereal (demo, URL de vista previa; nunca llega)
//   MAILER=smtp     -> SMTP real (Gmail/Resend/Brevo...) usando las SMTP_*
function crearNotificadorCorreo() {
  const mailer = (process.env.MAILER || "consola").toLowerCase();

  if (mailer === "smtp") {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error(
        "MAILER=smtp requiere SMTP_HOST, SMTP_USER y SMTP_PASS en el .env (en Gmail, una contraseña de aplicación)."
      );
    }
    return new SmtpNotificadorCorreo();
  }
  if (mailer === "ethereal") {
    return new EtherealNotificadorCorreo();
  }
  return new ConsolaNotificadorCorreo();
}

const notificador = crearNotificadorCorreo();

const duracionSesionMin = Number(process.env.COOKIE_TTL_MIN || 1440);

const partidaRepository = new PartidaRepositorySQL(database);
const poderFactory = new PoderFactory();
const poderService = new PoderService(partidaRepository, poderFactory);
const poderController = new PoderController(poderService);

const usuarioRepository = new UsuarioRepositorySQL(database);
const historialRepository = new HistorialPartidaRepositorySQL(database);
const codigoVerificacionRepository = new CodigoVerificacionRepositorySQL(database);
const sesionRepository = new SesionRepositorySQL(database);

const usuarioService = new UsuarioService(usuarioRepository, historialRepository, passwordHasher, database);
const authService = new AuthService(
  usuarioRepository,
  codigoVerificacionRepository,
  sesionRepository,
  passwordHasher,
  codigoGenerador,
  codigoHasher,
  notificador,
  duracionSesionMin
);
// Parte 4: middlewares de autorización con el authService real; se inyectan
// a los routers igual que cualquier otra dependencia.
const autorizacion = crearMiddlewaresDeAutorizacion(authService);
const verificacionService = new VerificacionService(
  usuarioRepository,
  codigoVerificacionRepository,
  codigoHasher,
  codigoGenerador,
  notificador,
  database
);
const recuperacionService = new RecuperacionService(
  usuarioRepository,
  codigoVerificacionRepository,
  codigoHasher,
  passwordHasher,
  codigoGenerador,
  notificador,
  database
);

const usuarioController = new UsuarioController(usuarioService);
const authController = new AuthController(authService, duracionSesionMin);
const verificacionController = new VerificacionController(verificacionService);
const recuperacionController = new RecuperacionController(recuperacionService);

const partidaService = new PartidaService(partidaRepository);
const partidaController = new PartidaController(partidaService);

const vistaRepository = new VistaRepositorySQL(database);
const vistaService = new VistaService(vistaRepository);
const vistaController = new VistaController(vistaService);

const procedimientoRepository = new ProcedimientoRepositorySQL(database);
const procedimientoService = new ProcedimientoService(procedimientoRepository);
const procedimientoController = new ProcedimientoController(procedimientoService);
const estadoController = new EstadoController();

// ---------- Middlewares de seguridad ----------
// En tests e2e (que ejercitan /api/auth muchas veces) se puede desactivar
// con RATE_LIMIT_DESACTIVADO=1 para no toparse con el 429 al repetir la suite.
const saltarRateLimit = () => process.env.RATE_LIMIT_DESACTIVADO === "1";
const limitadorGeneral = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => saltarRateLimit() || req.originalUrl.split("?")[0] === "/api/estado",
});
const limitadorAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_MAX || 40),
  standardHeaders: true,
  legacyHeaders: false,
  skip: saltarRateLimit,
  message: { exito: false, error: "Demasiadas peticiones. Intenta en unos minutos." },
});

const app = express();
// Detrás de Vercel/Render hay proxies: sin esto req.ip es el del proxy y los
// rate-limiters comparten un solo contador entre todos los usuarios.
app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "connect-src": ["'self'", "ws:", "wss:"],
    },
  },
}));
// Parte 4: CORS con ALLOWLIST en vez de reflejar cualquier origen.
// El frontend servido por este mismo backend va SIEMPRE en mismo origen
// (páginas y API en el mismo puerto -> sin CORS); la lista es solo para
// desarrollo externo (Live Server, etc.). Un origen no listado no recibe
// cabeceras CORS -> el navegador lo bloquea -> el frontend cae en su
// fallback local (ya existe para powers/partida/mock).
// En LAN (celulares/tablets abriendo http://IP:3000) tampoco aplica: es
// mismo origen. configurable con CORS_ORIGINS en .env (coma-separado).
const origenesPermitidos = (
  [process.env.CORS_ORIGINS, process.env.PUBLIC_FRONTEND_URL]
    .filter(Boolean)
    .join(",") || "http://localhost:3000,http://127.0.0.1:3000"
)
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origen, callback) {
      callback(null, !origen || origenesPermitidos.includes(origen));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/api", limitadorGeneral);
app.use("/api/auth", limitadorAuth);

app.use("/api", crearRutasEstado(estadoController));
app.use("/api", crearRutasPoderes(poderController, autorizacion));
app.use("/api", crearRutasUsuarios(usuarioController, autorizacion));
app.use("/api", crearRutasAuth(authController, verificacionController, recuperacionController));
app.use("/api", crearRutasPartidas(partidaController, autorizacion));
app.use("/api", crearRutasVistas(vistaController, autorizacion));
app.use("/api", crearRutasProcedimientos(procedimientoController, autorizacion));
app.use("/api", crearRutasSalas());

// El backend también sirve el frontend (mismo origen -> cookies httpOnly OK).
// En producción (Render) el frontend vive en Vercel: SERVIR_FRONTEND=0 evita
// exponer el código del backend y el esquema SQL.
if (process.env.SERVIR_FRONTEND !== "0") {
  app.use(express.static(path.join(__dirname, "..")));
}

// Ruta de prueba: crea una partida de ejemplo con 2 jugadores y 50 de chakra
// cada uno, para poder probar /api/poder/activar sin armar todo el flujo.
// Parte 4: escribe en la BD -> exige sesión.
app.post("/api/partida/prueba", autorizacion.requiereSesion, async (req, res) => {
  const jugador1 = new Jugador("naruto", "Naruto");
  const jugador2 = new Jugador("sasuke", "Sasuke");
  jugador1.ganarChakra(50);
  jugador2.ganarChakra(50);

  const partida = new Partida("partida-1", jugador1, jugador2);
  await partidaRepository.guardar(partida.id, partida);

  res.json({ idPartida: partida.id, jugadores: ["naruto", "sasuke"] });
});

const PUERTO = Number(process.env.PORT || process.env.SERVER_PORT || 3000);
const http = require("http");
const GestorSalas = require("./src/servicios/online/GestorSalas");

async function iniciar() {
  // PostgreSQL: aplica sql/esquema.sql (idempotente) si hace falta.
  if (typeof database.init === "function") {
    await database.init();
  }

  const servidorHttp = http.createServer(app);
  const gestorSalas = new GestorSalas(servidorHttp);
  
  servidorHttp.listen(PUERTO, "0.0.0.0", () => {
    console.log(`Backend de poderes escuchando en el puerto ${PUERTO}`);
    console.log(
      process.env.DATABASE_URL
        ? "Motor de base de datos: postgres (DATABASE_URL)"
        : `Motor de base de datos: postgres (${process.env.PGPORT || 5432}/${process.env.PGDATABASE})`
    );
    console.log(
      process.env.SERVIR_FRONTEND !== "0"
        ? "Frontend servido en el mismo puerto (mismo origen)"
        : "Frontend NO servido aquí (SERVIR_FRONTEND=0): vive en Vercel"
    );
    console.log(`WebSocket activo para multijugador online`);
  });
}

iniciar().catch((error) => {
  console.error("No se pudo iniciar el backend:", error.message);
  process.exit(1);
});