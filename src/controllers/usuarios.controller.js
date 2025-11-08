import pool from '../config/db.js';
import bcrypt from 'bcrypt';


export const crearUsuario = async (req, res) => {
  const { nombre, email, password, rol_id } = req.body;

  try {
    // Verificar que el email no exista
    const existe = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Hashear contraseña
    const hashContraseña = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password, rol_id) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol_id',
      [nombre, email, hashContraseña, rol_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear usuario' });
  }
};

export const listarUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT u.id, u.nombre, u.email, r.nombre as rol FROM usuarios u JOIN roles r ON u.rol_id = r.id ORDER BY u.id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
};

export const eliminarUsuario = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
    res.json({ message: 'Usuario eliminado' });
    console.log(`Usuario eliminado: ID ${id}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
};
