import pool from '../config/db.js';

// helper: buscar o crear cliente por nombre
async function getOrCreateClienteId(nombre) {
  if (!nombre) return null;
  const trimmed = String(nombre).trim();
  if (!trimmed) return null;

  const q = await pool.query('SELECT id FROM clientes WHERE nombre = $1', [trimmed]);
  if (q.rows.length) return q.rows[0].id;

  const ins = await pool.query('INSERT INTO clientes (nombre) VALUES ($1) RETURNING id', [trimmed]);
  return ins.rows[0].id;
}

export const crearViaje = async (req, res) => {
  const {
    cliente_id,
    cliente_nombre,
    matricula,
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

  let clienteId = null;
  try {
    if (cliente_nombre) {
      clienteId = await getOrCreateClienteId(cliente_nombre);
    } else if (cliente_id !== undefined && cliente_id !== "" && cliente_id !== null) {
      const parsed = Number(cliente_id);
      if (Number.isNaN(parsed)) return res.status(400).json({ message: "cliente_id inválido" });
      clienteId = parsed;
    } else {
      clienteId = null;
    }

    const cont = contenedor === "" || contenedor == null ? null : String(contenedor).trim();
    const cargadoBool = cargado === true || cargado === "true" || cargado === 1 || cargado === "1";

    // insertar y luego devolver fila con joins para nombres
    const insert = await pool.query(
      `INSERT INTO viajes 
      (usuario_id, matricula, cliente_id, n_orden, origen, destino, contenedor, tipo_cont, cargado, observaciones) 
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) 
      RETURNING id`,
      [
        usuario_id,
        matricula || null,
        clienteId,
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
    if (err && (err.constraint === "viajes_contenedor_check" || (err.message && err.message.includes("viajes_contenedor_check")))) {
      return res.status(400).json({ message: "Contenedor inválido: formato/valor no permitido" });
    }
    console.error("crearViaje error:", err && err.stack ? err.stack : err);
    res.status(500).json({ message: "Error al crear viaje", error: err.message });
  }
};

export const editarViaje = async (req, res) => {
  const { id } = req.params;
  const {
    cliente_id,
    cliente_nombre,
    matricula,
    n_orden,
    origen,
    destino,
    contenedor,
    tipo_cont,
    cargado,
    observaciones,
  } = req.body;

  try {
    let clienteId = null;
    if (cliente_nombre) {
      clienteId = await getOrCreateClienteId(cliente_nombre);
    } else if (cliente_id !== undefined && cliente_id !== "" && cliente_id !== null) {
      const parsed = Number(cliente_id);
      if (Number.isNaN(parsed)) return res.status(400).json({ message: "cliente_id inválido" });
      clienteId = parsed;
    } else {
      clienteId = null;
    }

    const cont = contenedor === "" || contenedor == null ? null : String(contenedor).trim();
    const cargadoBool = cargado === true || cargado === "true" || cargado === 1 || cargado === "1";

    const upd = await pool.query(
      `UPDATE viajes 
       SET matricula=$1, cliente_id=$2, n_orden=$3, origen=$4, destino=$5, contenedor=$6, tipo_cont=$7, cargado=$8, observaciones=$9
       WHERE id=$10 RETURNING id`,
      [
        matricula || null,
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

    if (upd.rows.length === 0) return res.status(404).json({ error: "Viaje no encontrado" });

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
    console.error("editarViaje error:", err && err.stack ? err.stack : err);
    res.status(500).json({ error: "Error al actualizar viaje", details: err.message });
  }
};

export const listarViajesChofer = async (req, res) => {
  const usuario_id = req.user.id;
  const { fecha } = req.query;

  try {
    const result = await pool.query(
      `SELECT v.*, u.nombre AS usuario_nombre, c.nombre AS cliente_nombre
       FROM viajes v
       LEFT JOIN usuarios u ON v.usuario_id = u.id
       LEFT JOIN clientes c ON v.cliente_id = c.id
       WHERE v.usuario_id = $1 AND DATE(v.fecha) = $2
       ORDER BY v.fecha DESC`,
      [usuario_id, fecha]
    );

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
    const { fecha, usuario_id, cliente_id } = req.query;

    if (rol !== "admin") {
      return res.status(403).json({ message: "Acceso denegado: solo administradores" });
    }

    const fechaFiltro = fecha || new Date().toISOString().split("T")[0];

    // construir query dinámico
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
      SELECT v.*, u.nombre AS usuario_nombre, c.nombre AS cliente_nombre
      FROM viajes v
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      LEFT JOIN clientes c ON v.cliente_id = c.id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
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