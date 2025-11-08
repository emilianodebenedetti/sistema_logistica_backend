import pool from '../config/db.js';

export const crearCliente = async (req, res) => {
    const { nombre, email } = req.body;
    try {
        // Verificar que el email no exista
        const existe = await pool.query('SELECT * FROM clientes WHERE email = $1', [email]);
        if(existe.rows.length > 0) {
            return res.status(400).json({ message: 'El email ya está registrado' });
        }

        const result = await pool.query('INSERT INTO clientes (nombre, email) VALUES ($1, $2) RETURNING id, nombre, email', [nombre, email]);
        console.log(
            `Cliente creado: ID ${result.rows[0].id}, Nombre: ${result.rows[0].nombre}, Email: ${result.rows[0].email}`
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al crear cliente' });
    }
};

export const listarClientes = async (req, res) => {
    try {
        const result = await pool.query ('SELECT * FROM clientes ORDER BY id'); 
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener clientes' });
    }
};

export const eliminarCliente = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
        res.json({ message: 'Cliente eliminado' });
        console.log(`Cliente eliminado: ID ${id}`);
    }catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al eliminar cliente' });
    }
};
