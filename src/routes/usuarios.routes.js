import { Router } from 'express';
import { crearUsuario, listarUsuarios, eliminarUsuario } from '../controllers/usuarios.controller.js';      
import { verificarToken, esAdmin } from '../middleware/auth.middleware.js';


const router = Router();

//solo para el admin
router.post('/', verificarToken, esAdmin, crearUsuario);//testeado admin y chofer (no puede)
router.get('/', verificarToken, esAdmin, listarUsuarios);//testeado admin y chofer (no puede)
router.delete('/:id', verificarToken, esAdmin, eliminarUsuario);//testeado admin y chofer (no puede)

export default router;