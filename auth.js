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

// Obtener usuario actual
router.get('/api/usuario-actual', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  res.json(req.session.user);
});

// Obtener blogs por tipo
router.get('/api/blogs', async (req, res) => {
    const { tipo, search } = req.query;
    
    try {
      let query = `
        SELECT b.*, u.Nombre_Usuario, u.Apellido_Usuario 
        FROM Blog b
        JOIN Usuarios u ON b.ID_Usuario = u.ID_Usuario
        WHERE 1=1
      `;
      
      const params = [];
      
      if (tipo) {
        query += ' AND b.ID_TipoBlog = ?';
        params.push(tipo);
      }
      
      if (search) {
        query += ' AND (b.Titulo LIKE ? OR b.Contenido_Blog LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      query += ' ORDER BY b.Fecha_Creacion DESC';
      
      const [blogs] = await pool.query(query, params);
      res.json(blogs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener blogs' });
    }
  });


// Crear nuevo blog
router.post('/api/blogs', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  const { titulo, contenido, tipoBlog } = req.body;

  if (!titulo || !contenido || !tipoBlog) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await pool.query(
      'INSERT INTO Blog (ID_TipoBlog, ID_Usuario, Titulo, Fecha_Creacion, Contenido_Blog) VALUES (?, ?, ?, NOW(), ?)',
      [tipoBlog, req.session.user.id, titulo, contenido]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear blog' });
  }
});

module.exports = router;

// Obtener comentarios de un blog
router.get('/api/comentarios', async (req, res) => {
  const { blog } = req.query;
  
  if (!blog) {
    return res.status(400).json({ message: 'ID de blog requerido' });
  }

  try {
    const [comentarios] = await pool.query(`
      SELECT c.*, u.Nombre_Usuario, u.Apellido_Usuario 
      FROM Comentarios c
      JOIN Usuarios u ON c.ID_Usuario = u.ID_Usuario
      WHERE c.ID_Blog = ?
      ORDER BY c.Fecha_Comentario DESC
    `, [blog]);
    
    res.json(comentarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener comentarios' });
  }
});

// Crear nuevo comentario
router.post('/api/comentarios', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  const { blogId, contenido } = req.body;

  if (!blogId || !contenido) {
    return res.status(400).json({ message: 'Datos incompletos' });
  }

  try {
    await pool.query(
      'INSERT INTO Comentarios (ID_Blog, ID_Usuario, Fecha_Comentario, Contenido_Comentario) VALUES (?, ?, NOW(), ?)',
      [blogId, req.session.user.id, contenido]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al crear comentario' });
  }
});