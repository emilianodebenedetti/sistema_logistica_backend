import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import usuariosRoutes from './routes/usuarios.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import viajesRoutes from './routes/viajes.routes.js';
import pool from "./config/db.js";
import reportesRoutes from './routes/reportes.routes.js';

dotenv.config();
const app = express();

app.use((req, res, next) => {
  console.log('➡️', req.method, req.path);
  next();
});

const corsOptions = {
  origin: [
    "https://mglogistica.com.uy",
    "http://mglogistica.com.uy"
  ] ,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

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

