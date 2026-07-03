import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import viajesRoutes from './routes/viajes.routes.js';
import pool from "./config/db.js";
import reportesRoutes from './routes/reportes.routes.js';


const app = express();

app.use((req, res, next) => {
  console.log('➡️', req.method, req.path);
  next();
});

// Whitelist fija: no depende de NODE_ENV (en Plesk/Passenger esa variable
// puede no propagarse o quedar pisada por el .env del deploy).
const allowedOrigins = [
  "https://mglogistica.com.uy",
  "https://www.mglogistica.com.uy",
  "http://localhost:5173",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origen no permitido por CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));


app.use(express.json()); 

// Rutas
app.use('/api/auth', authRoutes); //endpoint testeado y funcionandos
app.use('/api/usuarios', usuariosRoutes); //endpoint testeado y funcionando
app.use('/api/clientes', clientesRoutes);//endpoint testeado y funcionando
app.use('/api/viajes', viajesRoutes);//--endpoint testeado y funcionando
app.use('/api/reportes', reportesRoutes);//endpoint en desarrollo


//iniciar el servidor 
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

pool.query("SELECT NOW()")
  .then(res => console.log("✅ BASE DE DATOS conectada:", res.rows[0]))
  .catch(err => console.error("❌ Error en conexion a BASE DE DATOS:", err.message));

