import ExcelJS from "exceljs";
import pool from "../config/db.js";

export const obtenerViajes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, c.nombre AS cliente_nombre, u.nombre AS chofer_nombre
      FROM viajes v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN usuarios u ON v.usuario_id = u.id
      ORDER BY v.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener los viajes" });
  }
};

export const filtrarPorChofer = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT v.*, c.nombre AS cliente_nombre, u.nombre AS chofer_nombre
      FROM viajes v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.usuario_id = $1
      ORDER BY v.fecha DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al filtrar por chofer" });
  }
};

export const filtrarPorCliente = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT v.*, c.nombre AS cliente_nombre, u.nombre AS chofer_nombre
      FROM viajes v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.cliente_id = $1
      ORDER BY v.fecha DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al filtrar por cliente" });
  }
};

// 📦 Exportar Excel
export const exportarExcel = async (req, res) => {
  const { tipo, id } = req.query; // tipo puede ser 'chofer' o 'cliente'
  let query, params;

  if (tipo === "chofer") {
    query = `
      SELECT v.*, c.nombre AS cliente_nombre, u.nombre AS chofer_nombre
      FROM viajes v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.usuario_id = $1
      ORDER BY v.fecha DESC`;
    params = [id];
  } else if (tipo === "cliente") {
    query = `
      SELECT v.*, c.nombre AS cliente_nombre, u.nombre AS chofer_nombre
      FROM viajes v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.cliente_id = $1
      ORDER BY v.fecha DESC`;
    params = [id];
  } else {
    return res.status(400).json({ error: "Tipo de filtro inválido" });
  }

  try {
    const result = await pool.query(query, params);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Viajes");

    sheet.columns = [
      { header: "Fecha", key: "fecha", width: 20 },
      { header: "Chofer", key: "chofer_nombre", width: 25 },
      { header: "Cliente", key: "cliente_nombre", width: 25 },
      { header: "Matrícula", key: "matricula", width: 15 },
      { header: "Origen", key: "origen", width: 25 },
      { header: "Destino", key: "destino", width: 25 },
      { header: "Contenedor", key: "contenedor", width: 20 },
      { header: "Cargado", key: "cargado", width: 10 },
      { header: "Observaciones", key: "observaciones", width: 40 },
    ];

    if (result.rows.length === 0) {
    return res.status(404).json({
      error: "No hay viajes registrados con los filtros aplicados"
    });
  }
    result.rows.forEach(row => sheet.addRow(row));
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=reporte_${tipo}_${id}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al generar el Excel" });
  }
};

export const exportarExcelGeneral = async (req, res) => {
  try {
    const result = await pool.query(`
     SELECT v.*, 
             c.nombre AS cliente_nombre, 
             u.nombre AS chofer_nombre
      FROM viajes v
      LEFT JOIN clientes c ON v.cliente_id = c.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      ORDER BY v.fecha DESC
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No hay viajes registrados" });
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Viajes");

    sheet.columns = [
      { header: "Fecha", key: "fecha", width: 20 },
      { header: "Chofer", key: "chofer_nombre", width: 25 },
      { header: "Cliente", key: "cliente_nombre", width: 25 },
      { header: "Matrícula", key: "matricula", width: 15 },
      { header: "Origen", key: "origen", width: 25 },
      { header: "Destino", key: "destino", width: 25 },
      { header: "Contenedor", key: "contenedor", width: 20 },
      { header: "Cargado", key: "cargado", width: 10 },
      { header: "Observaciones", key: "observaciones", width: 40 },
    ];
    
    
    result.rows.forEach(row => sheet.addRow(row));
    
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=reporte_general.xlsx");

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("❌ Error al generar Excel general:", err);
    res.status(500).json({ error: "Error al generar el Excel general" });
  }
};

export const exportarViajesExcel = async (req, res) => {
  try {
    const { fecha, usuario_id, cliente_id } = req.query;

    const fechaFiltro = fecha || new Date().toISOString().split("T")[0];

    let where = [`DATE(v.fecha) = $1`];
    const params = [fechaFiltro];
    let idx = 2;

    if (usuario_id) {
      where.push(`v.usuario_id = $${idx++}`);
      params.push(Number(usuario_id));
    }
    if (cliente_id) {
      where.push(`v.cliente_id = $${idx++}`);
      params.push(Number(cliente_id));
    }

    const query = `
      SELECT v.id, v.fecha, v.n_orden, v.origen, v.destino, v.contenedor, v.tipo_cont, v.cargado,
             v.matricula, v.observaciones,
             u.nombre AS usuario_nombre, c.nombre AS cliente_nombre
      FROM viajes v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY v.fecha DESC
    `;

    const result = await pool.query(query, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Viajes");

    sheet.columns = [
      { header: "ID", key: "id", width: 8 },
      { header: "Fecha", key: "fecha", width: 20 },
      { header: "N° Orden", key: "n_orden", width: 20 },
      { header: "Origen", key: "origen", width: 20 },
      { header: "Destino", key: "destino", width: 20 },
      { header: "Contenedor", key: "contenedor", width: 18 },
      { header: "Tipo Cont.", key: "tipo_cont", width: 12 },
      { header: "Cargado", key: "cargado", width: 8 },
      { header: "Matrícula", key: "matricula", width: 12 },
      { header: "Cliente", key: "cliente_nombre", width: 20 },
      { header: "Chofer", key: "usuario_nombre", width: 20 },
      { header: "Observaciones", key: "observaciones", width: 30 },
    ];

    result.rows.forEach((r) => {
      sheet.addRow({
        ...r,
        fecha: r.fecha ? new Date(r.fecha).toISOString() : "",
        cargado: r.cargado ? "Sí" : "No",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader("Content-Disposition", `attachment; filename="viajes_${fechaFiltro}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("Error exportando viajes:", err);
    res.status(500).json({ message: "Error al exportar viajes" });
  }
};
