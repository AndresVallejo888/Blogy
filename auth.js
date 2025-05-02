const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Configuración de la conexión a la base de datos
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Ruta para servir el formulario de login
router.get('/login.html', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

// Ruta para servir el formulario de registro
router.get('/registro.html', (req, res) => {
  res.sendFile(__dirname + '/registro.html');
});

// Procesar registro
router.post('/registro', async (req, res) => {
  const { nombre, apellido, email, password } = req.body;

  try {
    // Verificar si el usuario ya existe
    const [rows] = await pool.query('SELECT * FROM Usuarios WHERE Correo_Usuario = ?', [email]);
    
    if (rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'El correo electrónico ya está registrado' 
      });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar nuevo usuario
    await pool.query(
      'INSERT INTO Usuarios (Nombre_Usuario, Apellido_Usuario, Correo_Usuario, Password_Usuario) VALUES (?, ?, ?, ?)',
      [nombre, apellido, email, hashedPassword]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor' 
    });
  }
});

// Procesar login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar usuario
    const [rows] = await pool.query('SELECT * FROM Usuarios WHERE Correo_Usuario = ?', [email]);
    
    if (rows.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }

    const user = rows[0];

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.Password_Usuario);
    
    if (!isMatch) {
      return res.status(400).json({ 
        success: false, 
        message: 'Credenciales incorrectas' 
      });
    }

    // Crear sesión
    req.session.user = {
      id: user.ID_Usuario,
      nombre: user.Nombre_Usuario,
      apellido: user.Apellido_Usuario,
      email: user.Correo_Usuario,
      isAdmin: user.Es_Admin
    };

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ 
      success: false, 
      message: 'Error en el servidor' 
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login.html');
});

module.exports = router;