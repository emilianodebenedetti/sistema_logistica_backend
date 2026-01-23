import pool from '../config/db.js';

// helper: buscar o crear cliente por nombre (con manejo de race condition)
async function getOrCreateClienteId(nombre) {
  if (!nombre) return null;
  const trimmed = String(nombre).trim();
  if (!trimmed) return null;

  const client = await pool.connect();
  try {
    // Usar transacción para evitar race condition
    await client.query('BEGIN');
    
    // Buscar con lock (SELECT FOR UPDATE) para evitar duplicados
    const q = await client.query('SELECT id FROM clientes WHERE nombre = $1 FOR UPDATE', [trimmed]);
    if (q.rows.length) {
      await client.query('COMMIT');
      return q.rows[0].id;
    }

    // Si no existe, insertar
    const ins = await client.query('INSERT INTO clientes (nombre) VALUES ($1) RETURNING id', [trimmed]);
    await client.query('COMMIT');
    return ins.rows[0].id;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export const crearViaje = async (req, res) => {
  const {
    cliente_id,
    cliente_nombre,
    matricula,
    fecha,
    n_orden,
    origen,
    destino,
    contenedor,
    tipo_cont,
    cargado,
    observaciones,
  } = req.body;

  const usuario_id = req.user.id;

  if (!n_orden || !origen || !destino) {
    return res.status(400).json({ message: "Faltan campos requeridos: n_orden/origen/destino" });
  }

  const client = await pool.connect();
  try {
    // Usar transacción para garantizar atomicidad
    await client.query('BEGIN');

    let clienteId = null;
    if (cliente_nombre) {
      clienteId = await getOrCreateClienteId(cliente_nombre);
    } else if (cliente_id !== undefined && cliente_id !== "" && cliente_id !== null) {
      const parsed = Number(cliente_id);
      if (Number.isNaN(parsed)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: "cliente_id inválido" });
      }
      clienteId = parsed;
    } else {
      clienteId = null;
    }

    const cont = contenedor === "" || contenedor == null ? null : String(contenedor).trim();
    const cargadoBool = cargado === true || cargado === "true" || cargado === 1 || cargado === "1";

    // Validación: evitar duplicados de n_orden para el mismo usuario en la misma fecha
    const duplicateCheck = await client.query(
      `SELECT id FROM viajes 
       WHERE usuario_id = $1 AND n_orden = $2 AND DATE(fecha) = DATE($3)`,
      [usuario_id, n_orden, fecha]
    );
    
    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        message: "Ya existe un viaje con este número de orden en esta fecha para este usuario" 
      });
    }

    // insertar viaje dentro de la transacción
    const insert = await client.query(
      `INSERT INTO viajes 
      (usuario_id, matricula, cliente_id, fecha, n_orden, origen, destino, contenedor, tipo_cont, cargado, observaciones) 
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, $11) 
      RETURNING id`,
      [
        usuario_id,
        matricula || null,
        clienteId,
        fecha,
        n_orden,
        origen,
        destino,
        cont,
        tipo_cont || null,
        cargadoBool,
        observaciones || null,
      ]
    );

    const newId = insert.rows[0].id;
    await client.query('COMMIT');

    // Consulta final fuera de la transacción
    const q = await pool.query(
      `SELECT v.*, u.nombre AS usuario_nombre, c.nombre AS cliente_nombre
       FROM viajes v
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       LEFT JOIN clientes c ON v.cliente_id = c.id
       WHERE v.id = $1`,
      [newId]
    );

    res.status(201).json(q.rows[0]);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error("Error en ROLLBACK:", rollbackErr);
    }
    
    if (err && (err.constraint === "viajes_contenedor_check" || (err.message && err.message.includes("viajes_contenedor_check")))) {
      return res.status(400).json({ message: "Contenedor inválido: formato/valor no permitido" });
    }
    if (err.constraint === "viajes_pkey" || err.message.includes("duplicate key")) {
      return res.status(409).json({ message: "El viaje ya existe o hay un conflicto de sincronización" });
    }
    console.error("crearViaje error:", err && err.stack ? err.stack : err);
    res.status(500).json({ message: "Error al crear viaje", error: err.message });
  } finally {
    client.release();
  }
};

export const editarViaje = async (req, res) => {
  const { id } = req.params;
  const {
    cliente_id,
    cliente_nombre,
    matricula,
    fecha,
    n_orden,
    origen,
    destino,
    contenedor,
    tipo_cont,
    cargado,
    observaciones,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let clienteId = null;
    if (cliente_nombre) {
      clienteId = await getOrCreateClienteId(cliente_nombre);
    } else if (cliente_id !== undefined && cliente_id !== "" && cliente_id !== null) {
      const parsed = Number(cliente_id);
      if (Number.isNaN(parsed)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: "cliente_id inválido" });
      }
      clienteId = parsed;
    } else {
      clienteId = null;
    }

    const cont = contenedor === "" || contenedor == null ? null : String(contenedor).trim();
    const cargadoBool = cargado === true || cargado === "true" || cargado === 1 || cargado === "1";

    // Validación: evitar duplicados con otro viaje (exceptuando el actual)
    const duplicateCheck = await client.query(
      `SELECT id FROM viajes 
       WHERE n_orden = $1 AND DATE(fecha) = DATE($2) AND id != $3`,
      [n_orden, fecha, id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        message: "Ya existe otro viaje con este número de orden en esta fecha" 
      });
    }

    const upd = await client.query(
      `UPDATE viajes 
       SET matricula=$1, fecha=$2, cliente_id=$3, n_orden=$4, origen=$5, destino=$6, contenedor=$7, tipo_cont=$8, cargado=$9, observaciones=$10
       WHERE id=$11 RETURNING id`,
      [
        matricula || null,
        fecha,
        clienteId,
        n_orden,
        origen,
        destino,
        cont,
        tipo_cont || null,
        cargadoBool,
        observaciones || null,
        id,
      ]
    );

    if (upd.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Viaje no encontrado" });
    }

    await client.query('COMMIT');

    const q = await pool.query(
      `SELECT v.*, u.nombre AS usuario_nombre, c.nombre AS cliente_nombre
       FROM viajes v
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       LEFT JOIN clientes c ON v.cliente_id = c.id
       WHERE v.id = $1`,
      [id]
    );

    res.json(q.rows[0]);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error("Error en ROLLBACK:", rollbackErr);
    }
    console.error("editarViaje error:", err && err.stack ? err.stack : err);
    res.status(500).json({ error: "Error al actualizar viaje", details: err.message });
  } finally {
    client.release();
  }
};

export const listarViajesChofer = async (req, res) => {
  const usuario_id = req.user.id;
  const { fecha } = req.query;
  
  try {
    let where = [`v.usuario_id = $1`];
    const params = [usuario_id];
    let idx = 2;

    // ✅ Solo filtrar por fecha si se envía y NO está vacía
    if (fecha && fecha.trim() !== "") {
      where.push(`DATE(v.fecha) = $${idx++}`);
      params.push(fecha);
    }

    const query = `
      SELECT v.*, u.nombre AS usuario_nombre, c.nombre AS cliente_nombre
       FROM viajes v
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       LEFT JOIN clientes c ON v.cliente_id = c.id
       WHERE ${where.join(" AND ")}
       ORDER BY v.fecha DESC
      `;
 /*     [usuario_id, fecha] */
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener viajes del chofer" });
  }
};

// Obtener un viaje por id (devuelve nombres)
export const obtenerViaje = async (req, res) => {
  const { id } = req.params;
  try {
    const q = await pool.query(
      `SELECT v.*, u.nombre AS usuario_nombre, c.nombre AS cliente_nombre
       FROM viajes v
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       LEFT JOIN clientes c ON v.cliente_id = c.id
       WHERE v.id = $1`,
      [id]
    );
    if (q.rows.length === 0) return res.status(404).json({ message: "Viaje no encontrado" });
    res.json(q.rows[0]);
  } catch (err) {
    console.error("obtenerViaje error:", err);
    res.status(500).json({ message: "Error al obtener viaje" });
  }
};

export const listarViajes = async (req, res) => {
  try {
    const { rol } = req.user;
    // parámetros opcionales de filtro
    const { fecha, fechaDesde, fechaHasta, usuario_id, cliente_id } = req.query;

    if (rol !== "admin") {
      return res.status(403).json({ message: "Acceso denegado: solo administradores" });
    }

    // construir query dinámico
    let where = [];
    const params = [];
    let idx = 1;
    
    // Lógica de fechas: si hay fechaDesde Y fechaHasta, usa rango
    // Si hay solo una o ninguna, usa fecha simple (por defecto hoy)
    if (fechaDesde && fechaHasta) {
      where.push(`DATE(v.fecha) >= $${idx++}`);
      params.push(fechaDesde);
      where.push(`DATE(v.fecha) <= $${idx++}`);
      params.push(fechaHasta);
    } else if (fecha && fecha.trim() !== "") {
      where.push(`DATE(v.fecha) = $${idx++}`);
      params.push(fecha);
    } else {
      // Si no hay filtro de fecha, mostrar solo hoy
      const today = new Date().toISOString().split("T")[0];
      where.push(`DATE(v.fecha) = $${idx++}`);
      params.push(today);
    }

    if (usuario_id) {
      where.push(`v.usuario_id = $${idx++}`);
      params.push(Number(usuario_id));
    }
    if (cliente_id) {
      where.push(`v.cliente_id = $${idx++}`);
      params.push(Number(cliente_id));
    }

    const query = `
      SELECT v.*, u.nombre AS usuario_nombre, c.nombre AS cliente_nombre
      FROM viajes v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ${where.length > 0 ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY v.fecha DESC
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error al listar viajes:", err);
    res.status(500).json({ message: "Error al obtener los viajes" });
  }
};

export const eliminarViaje = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM viajes WHERE id = $1 RETURNING *', [id]);
        if(result.rows.length === 0) {
            console.log("Viaje con ID:", id, "no existe.");
            return res.status(404).json({ message: 'Viaje no encontrado' });
        }
        
        res.json({ message: 'Viaje eliminado' });
    } catch (err) {    
        console.error(err);
        res.status(500).json({ message: 'Error al eliminar viaje' });   
    }
};