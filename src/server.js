import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import viajesRoutes from './routes/viajes.routes.js';
import pool from "./config/db.js";
import reportesRoutes from './routes/reportes.routes.js';

/* import dotenv from 'dotenv'; */
/* 
dotenv.config(); */

/* dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env"
}); */

const app = express();

app.use((req, res, next) => {
  console.log('➡️', req.method, req.path);
  next();
});

const corsOptions = {
  origin: process.env.NODE_ENV === "production"
    ? ["https://mglogistica.com.uy"]
    : ["http://localhost:5173"],
 /*  credentials: true, */
  methods: ["GET", "POST", "PUT", "DELETE", ],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
/* app.options('*', cors(corsOptions)); */

//app.options('*', cors(corsOptions)); //prodcuccion
//app.options("", cors(corsOptions)); //desarrollo


/* const corsOptions = {
  origin: [
    "https://mglogistica.com.uy",
    "http://localhost:4000",
    "http://localhost:5173",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions)); */
//app.options('/.*/', cors(corsOptions)); 



/* app.options('*', cors(corsOptions)); */

// Fallback/manual CORS headers to ensure preflight responses in production
/* app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && corsOptions.origin.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', corsOptions.methods.join(','));
    res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
  }
  // respond to preflight requests quickly
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
}); */


app.use(express.json()); 

// Rutas
app.use('/api/auth', authRoutes); //endpoint testeado y funcionando
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

