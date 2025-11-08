import { Router } from 'express';
import { inicioSesion, registro } from '../controllers/auth.controller.js';

const router = Router();
router.post('/inicio-sesion', inicioSesion);
router.post('/registro', registro);

// Solo admins pueden crear usuarios
//router.post("/register", verifyToken(["admin"]), register);

export default router;
