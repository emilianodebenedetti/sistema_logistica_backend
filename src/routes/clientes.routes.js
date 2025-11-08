import { Router } from 'express';
import { crearCliente, listarClientes, eliminarCliente } from '../controllers/clientes.controller.js';
import { verificarToken, esAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// Solo admin puede manejar clientes
router.post('/', verificarToken, esAdmin, crearCliente); //testeado admin y chofer (no puede)
router.get('/', verificarToken, esAdmin, listarClientes); //testeado admin y chofer (no puede)
router.delete('/:id', verificarToken, esAdmin, eliminarCliente); //testeado admin y chofer (no puede)

export default router;
