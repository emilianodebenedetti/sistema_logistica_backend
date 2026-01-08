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

// Allowed origins (add any other frontends you use)
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://mglogistica.com.uy']
  : ['http://localhost:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS policy: origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};


app.use(cors(corsOptions));
app.options('/.*/', cors(corsOptions)); 

/* const corsOptions = {
  origin: [
    "https://mglogistica.com.uy",
    "http://localhost:5173",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions)); */
//app.options('/.*/', cors(corsOptions)); 

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

