import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export const inicioSesion = async (req, res) => {
  const { email, password } = req.body;
  try {
    const resultado = await pool.query('SELECT u.id, u.password, r.nombre as rol FROM usuarios u JOIN roles r ON u.rol_id = r.id WHERE email = $1', [email]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const usuario = resultado.rows[0];
    const match = await bcrypt.compare(password, usuario.password);

    if (!match) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    console.log("Usuario autenticado:", { id: usuario.id, rol: usuario.rol });
    res.json({ token, rol: usuario.rol });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error en login' });
  }
};

export const registro = async (req, res) => {
  const { nombre, email, password, rol_id } = req.body;
  //console.log("Datos recibidos: ", req.body);

  try {
    // Verificar que el email no exista
    const existe = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const resultado = await pool.query(
      "INSERT INTO usuarios (nombre, email, password, rol_id) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol_id",
      [nombre, email, hashedPassword, rol_id || 2]
    );

    res.status(201).json(resultado.rows[0]);
    console.log("Usuario registrado:", resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
};

