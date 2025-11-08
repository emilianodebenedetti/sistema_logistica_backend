import express from "express";
import {
  obtenerViajes,
  filtrarPorChofer,
  filtrarPorCliente,
  exportarExcel,
  exportarExcelGeneral,
  exportarViajesExcel
} from "../controllers/reportes.controller.js";
/* import { verifyToken } from "../middleware/auth.middleware.js"; */

const router = express.Router();

router.get("/viajes", exportarViajesExcel);
router.get("/general", exportarExcelGeneral);

export default router;
