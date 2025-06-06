const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const path = require('path');

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

// Ruta para servir el formulario de login de usuario normal
router.get('/login.html', (req, res) => {
  // Asumiendo que login.html está en el mismo directorio que auth.js (raíz del proyecto)
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Ruta para servir el formulario de registro
router.get('/registro.html', (req, res) => {
  // Asumiendo que registro.html está en el mismo directorio que auth.js (raíz del proyecto)
  res.sendFile(path.join(__dirname, 'registro.html'));
});

// Procesar registro
router.post('/registro', async (req, res) => {
  console.log('LOG: Accediendo a /registro');
  const { nombre, apellido, email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM Usuarios WHERE Correo_Usuario = ?', [email]);
    if (rows.length > 0) {
      console.log('LOG: /registro - Correo ya registrado:', email);
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO Usuarios (Nombre_Usuario, Apellido_Usuario, Correo_Usuario, Password_Usuario) VALUES (?, ?, ?, ?)',
      [nombre, apellido, email, hashedPassword]
    );
    console.log('LOG: /registro - Usuario registrado exitosamente:', email);
    res.json({ success: true });
  } catch (error) {
    console.error('Error en /registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
});

// Procesar login de usuario normal
router.post('/login', async (req, res) => {
  console.log('LOG: Accediendo a /login');
  const { email, password } = req.body;
  try {
    // Importante seleccionar Es_Owner
    const [rows] = await pool.query('SELECT ID_Usuario, Nombre_Usuario, Apellido_Usuario, Correo_Usuario, Password_Usuario, Es_Admin, Es_Owner FROM Usuarios WHERE Correo_Usuario = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Credenciales incorrectas' });
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.Password_Usuario);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Credenciales incorrectas' });
    }
    req.session.user = {
      id: user.ID_Usuario,
      nombre: user.Nombre_Usuario,
      apellido: user.Apellido_Usuario,
      email: user.Correo_Usuario,
      isAdmin: user.Es_Admin === 1, // Convertir a booleano si es necesario
      isOwner: user.Es_Owner === 1   // AÑADIDO: Cargar Es_Owner a la sesión
    };
    console.log('LOG: /login - Login de usuario exitoso:', email, 'isAdmin:', req.session.user.isAdmin, 'isOwner:', req.session.user.isOwner);
    res.json({ success: true, isAdmin: req.session.user.isAdmin, isOwner: req.session.user.isOwner });
  } catch (error) {
    console.error('Error en /login:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});


// Logout
router.get('/logout', (req, res) => {
  console.log('LOG: Accediendo a /logout');
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al destruir la sesión:', err);
      return res.status(500).send('Error al cerrar sesión');
    }
    // Redirige a la página de login que corresponda o simplemente envía éxito
    // Para el admin, el frontend redirige a /login-admin.html
    // Para usuarios normales, podrías redirigir a /login.html
    // O simplemente no redirigir desde el backend y dejar que el cliente decida.
    res.clearCookie('connect.sid'); // Nombre de cookie por defecto de express-session
    console.log('LOG: /logout - Sesión destruida');
    res.json({ success: true, message: 'Logout exitoso' }); // Enviar JSON para que el cliente maneje la redirección
  });
});


// Obtener usuario actual
router.get('/api/usuario-actual', (req, res) => {
  console.log('LOG: Accediendo a /api/usuario-actual');
  if (!req.session.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  // req.session.user ya debería tener isAdmin e isOwner cargados desde el login
  console.log('LOG: /api/usuario-actual - Usuario en sesión:', req.session.user);
  res.json(req.session.user);
});

// --- RUTAS DE BLOGS Y COMENTARIOS (sin cambios mayores, solo logs de ejemplo) ---
router.get('/api/blogs', async (req, res) => {
  console.log('LOG: Accediendo a /api/blogs', req.query);
  // ... tu código existente ...
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
    console.error('Error en /api/blogs:', error);
    res.status(500).json({ message: 'Error al obtener blogs' });
  }
});

router.post('/api/blogs', async (req, res) => {
  console.log('LOG: Accediendo a POST /api/blogs');
  // ... tu código existente ...
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
    console.error('Error en POST /api/blogs:', error);
    res.status(500).json({ message: 'Error al crear blog' });
  }
});

router.get('/api/comentarios', async (req, res) => {
  console.log('LOG: Accediendo a /api/comentarios', req.query);
  // ... tu código existente ...
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
    console.error('Error en /api/comentarios:', error);
    res.status(500).json({ message: 'Error al obtener comentarios' });
  }
});

router.post('/api/comentarios', async (req, res) => {
  console.log('LOG: Accediendo a POST /api/comentarios');
  // ... tu código existente ...
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
    console.error('Error en POST /api/comentarios:', error);
    res.status(500).json({ message: 'Error al crear comentario' });
  }
});

// --- RUTAS DE SOLICITUD DE ADMIN ---
router.post('/api/solicitar-admin', async (req, res) => {
  console.log('LOG: Accediendo a /api/solicitar-admin');
  // ... tu código existente ...
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'No autenticado' });
  }
  const { telefono, aceptoPoliticas, aceptoIntegridad } = req.body;
  if (typeof aceptoPoliticas !== 'boolean' || !aceptoPoliticas ||
    typeof aceptoIntegridad !== 'boolean' || !aceptoIntegridad) {
    return res.status(400).json({
      success: false,
      message: 'Debes aceptar todos los términos'
    });
  }
  if (!telefono || !/^[\d\s+-]{8,15}$/.test(telefono)) {
    return res.status(400).json({
      success: false,
      message: 'Por favor ingresa un número de teléfono válido'
    });
  }
  try {
    const [result] = await pool.query(
      'UPDATE Usuarios SET telefono = ?, Admin_Request = TRUE WHERE ID_Usuario = ?',
      [telefono, req.session.user.id]
    );
    if (result.affectedRows === 0) {
      throw new Error('No se pudo actualizar el usuario');
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error en /api/solicitar-admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar solicitud: ' + error.message
    });
  }
});

router.get('/api/admin-request-status', async (req, res) => {
  console.log('LOG: Accediendo a /api/admin-request-status');
  // ... tu código existente ...
  if (!req.session.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT Admin_Request, Es_Admin FROM Usuarios WHERE ID_Usuario = ?',
      [req.session.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({
      hasRequested: rows[0].Admin_Request,
      isAdmin: rows[0].Es_Admin
    });
  } catch (error) {
    console.error('Error en /api/admin-request-status:', error);
    res.status(500).json({ message: 'Error al verificar estado' });
  }
});


//-----------------------------------------------------------------------------------------------
// ------ SECCIÓN DE ADMINISTRADOR ------
//-----------------------------------------------------------------------------------------------

// Ruta para servir el formulario de login de admin (HTML)
router.get('/login-admin.html', (req, res) => {
  console.log('LOG: Sirviendo /login-admin.html');
  // Asumiendo que login-admin.html está en el mismo directorio que auth.js (raíz del proyecto)
  res.sendFile(path.join(__dirname, 'login-admin.html'));
});

// Procesar login de admin (JSON)
// ESTA ES LA RUTA CRÍTICA QUE ESTÁ DANDO 404
router.post('/api/admin-login', async (req, res) => {
  console.log('LOG: INTENTO DE ACCESO A RUTA: POST /api/admin-login RECIBIDO'); // LOG PRINCIPAL PARA VERIFICAR SI ENTRA AQUÍ
  const { email, password } = req.body;
  console.log('LOG: /api/admin-login - Payload:', req.body);


  if (!email || !password) {
    console.log('LOG: /api/admin-login - Correo o contraseña faltantes.');
    return res.status(400).json({
      success: false,
      message: 'Correo y contraseña son requeridos'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT ID_Usuario, Nombre_Usuario, Apellido_Usuario, Correo_Usuario, Password_Usuario, Es_Admin, Es_Owner FROM Usuarios WHERE Correo_Usuario = ? AND Es_Admin = TRUE',
      [email]
    );

    if (rows.length === 0) {
      console.log('LOG: /api/admin-login - Acceso denegado (no admin o no existe):', email);
      return res.status(403).json({ // 403: Prohibido (mejor que 401 si el usuario no es admin)
        success: false,
        message: 'Acceso denegado: No eres administrador o el usuario no existe'
      });
    }

    const user = rows[0];

    if (!user.Password_Usuario || typeof user.Password_Usuario !== 'string') {
      console.error('LOG: /api/admin-login - Contraseña no es string o no existe en BD para el usuario:', email);
      return res.status(500).json({
        success: false,
        message: 'Error en la configuración del usuario (contraseña)'
      });
    }

    const isMatch = await bcrypt.compare(password, user.Password_Usuario);

    if (!isMatch) {
      console.log('LOG: /api/admin-login - Credenciales incorrectas (password no coincide) para:', email);
      return res.status(401).json({ // 401: No autorizado (credenciales incorrectas)
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    // Crear sesión de administrador
    req.session.user = {
      id: user.ID_Usuario,
      nombre: user.Nombre_Usuario,
      apellido: user.Apellido_Usuario,
      email: user.Correo_Usuario,
      isAdmin: true, // ¡IMPORTANTE: Establecer isAdmin a true explícitamente!
      isOwner: user.Es_Owner === 1 // AÑADIDO: Cargar Es_Owner a la sesión
    };
    console.log('LOG: /api/admin-login - Login de ADMIN exitoso:', email, 'isOwner:', req.session.user.isOwner);
    res.json({
      success: true,
      user: { // Puedes enviar la info del usuario si la necesitas en el frontend después del login
        nombre: user.Nombre_Usuario,
        apellido: user.Apellido_Usuario,
        email: user.Correo_Usuario
      }
    });

  } catch (error) {
    console.error('Error CRÍTICO en /api/admin-login:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al intentar login de admin',
      error: error.message // Incluye el mensaje de error para depuración
    });
  }
});

// Middleware para verificar si el usuario es admin
const isAdmin = (req, res, next) => {
  console.log('LOG: Middleware isAdmin - Verificando sesión:', req.session.user);
  if (req.session.user && req.session.user.isAdmin === true) {
    console.log('LOG: Middleware isAdmin - Acceso permitido');
    return next();
  }
  console.log('LOG: Middleware isAdmin - Acceso DENEGADO. Redirigiendo a /login-admin.html');
  res.redirect('/login-admin.html');
};

const isOwner = (req, res, next) => {
  console.log('LOG: Middleware isOwner - Verificando sesión:', req.session.user);
  // Un Owner debe ser también Admin
  if (req.session.user && req.session.user.isAdmin === true && req.session.user.isOwner === true) {
      console.log('LOG: Middleware isOwner - Acceso permitido');
      return next();
  }
  console.log('LOG: Middleware isOwner - Acceso DENEGADO.');
  // Si intentan acceder a una página HTML protegida por Owner, redirigir al dashboard de admin.
  // Si es una API, enviar un error 403.
  if (req.accepts('html')) {
      // Podrías añadir un query param para mostrar un mensaje en el dashboard
      return res.redirect('/dashboard-admin.html?error=no_owner_permission');
  }
  res.status(403).json({ success: false, message: 'Acceso denegado. Permisos de Owner requeridos.' });
};



// Ruta protegida para dashboard de admin (HTML)
router.get('/dashboard-admin.html', isAdmin, (req, res) => {
  console.log('LOG: Sirviendo /dashboard-admin.html (protegido por isAdmin)');
  // Asumiendo que dashboard-admin.html está en el mismo directorio que auth.js (raíz del proyecto)
  res.sendFile(path.join(__dirname, 'dashboard-admin.html'));
});

// RUTA PARA OBTENER SOLICITUDES DE ADMIN PENDIENTES
router.get('/api/admin/solicitudes-pendientes', isAdmin, isOwner, async (req, res) => {
  console.log('LOG: Accediendo a /api/admin/solicitudes-pendientes');
  try {
    const [solicitudes] = await pool.query(
      'SELECT ID_Usuario, Nombre_Usuario, Apellido_Usuario, telefono FROM Usuarios WHERE Admin_Request = TRUE AND Es_Admin = FALSE'
    );
    res.json(solicitudes);
  } catch (error) {
    console.error('Error en /api/admin/solicitudes-pendientes:', error);
    res.status(500).json({ success: false, message: 'Error al obtener solicitudes pendientes.' });
  }
});

// RUTA PARA ACEPTAR UNA SOLICITUD DE ADMIN
router.post('/api/admin/aceptar-solicitud', isAdmin, isOwner, async (req, res) => {
  const { idUsuario } = req.body; // Esperamos que el frontend envíe el ID del usuario
  console.log(`LOG: Accediendo a /api/admin/aceptar-solicitud para ID_Usuario: ${idUsuario}`);

  if (!idUsuario) {
    return res.status(400).json({ success: false, message: 'ID de usuario requerido.' });
  }

  try {
    // Actualizar el usuario a admin y resetear la solicitud
    const [result] = await pool.query(
      'UPDATE Usuarios SET Es_Admin = TRUE, Admin_Request = FALSE WHERE ID_Usuario = ?',
      [idUsuario]
    );

    if (result.affectedRows === 0) {
      console.log(`LOG: /api/admin/aceptar-solicitud - Usuario no encontrado o no se pudo actualizar: ${idUsuario}`);
      return res.status(404).json({ success: false, message: 'Usuario no encontrado o no se pudo actualizar.' });
    }

    console.log(`LOG: /api/admin/aceptar-solicitud - Solicitud aceptada para ID_Usuario: ${idUsuario}`);
    res.json({ success: true, message: 'Solicitud aceptada con éxito.' });
  } catch (error) {
    console.error('Error en /api/admin/aceptar-solicitud:', error);
    res.status(500).json({ success: false, message: 'Error al aceptar la solicitud.' });
  }
});

// RUTA PARA DENEGAR UNA SOLICITUD DE ADMIN
router.post('/api/admin/denegar-solicitud', isAdmin, isOwner, async (req, res) => {
  const { idUsuario } = req.body; // Esperamos que el frontend envíe el ID del usuario
  console.log(`LOG: Accediendo a /api/admin/denegar-solicitud para ID_Usuario: ${idUsuario}`);

  if (!idUsuario) {
    return res.status(400).json({ success: false, message: 'ID de usuario requerido.' });
  }

  try {
    // Resetear la solicitud y borrar el teléfono
    const [result] = await pool.query(
      'UPDATE Usuarios SET Admin_Request = FALSE, telefono = NULL WHERE ID_Usuario = ?',
      [idUsuario]
    );

    if (result.affectedRows === 0) {
      console.log(`LOG: /api/admin/denegar-solicitud - Usuario no encontrado o no se pudo actualizar: ${idUsuario}`);
      return res.status(404).json({ success: false, message: 'Usuario no encontrado o no se pudo actualizar.' });
    }
    
    console.log(`LOG: /api/admin/denegar-solicitud - Solicitud denegada para ID_Usuario: ${idUsuario}`);
    res.json({ success: true, message: 'Solicitud denegada con éxito.' });
  } catch (error) {
    console.error('Error en /api/admin/denegar-solicitud:', error);
    res.status(500).json({ success: false, message: 'Error al denegar la solicitud.' });
  }
});

// También necesitarás una ruta para servir solicitudes.html, protegida por isAdmin
router.get('/solicitudes.html', isAdmin, isOwner, (req, res) => {
    console.log('LOG: Sirviendo /solicitudes.html (protegido por isAdmin)');
    res.sendFile(path.join(__dirname, 'solicitudes.html'));
});


// REPORTES-------------------------------------------------------------------------------
router.get('/api/admin/reportes/actividades', isAdmin, async (req, res) => {
  console.log('LOG: Accediendo a /api/admin/reportes/actividades con query:', req.query);
  try {
      let querySQL = `
          SELECT 
              A.ID_Actividad, 
              A.Fecha_Actividad, 
              A.Tipo_Accion, 
              A.Entidad_Afectada,
              A.ID_Entidad_Afectada,
              A.Detalles,
              U.Nombre_Usuario, 
              U.Apellido_Usuario,
              TB.Tipo_Blog AS Nombre_TipoBlog 
          FROM Actividades A
          JOIN Usuarios U ON A.ID_Usuario = U.ID_Usuario
          LEFT JOIN TipoBlog TB ON A.ID_TipoBlog_Afectado = TB.ID_TipoBlog
      `;
      const params = [];
      const conditions = [];

      const { idTipoBlog, tipoReporte, searchTerm } = req.query;

      if (tipoReporte === 'usuarios') {
          conditions.push(`(A.Tipo_Accion = 'REGISTRO_USUARIO' OR A.Tipo_Accion = 'PROMOVER_A_ADMIN' OR A.Tipo_Accion = 'SOLICITUD_ADMIN' OR A.Tipo_Accion = 'DENEGAR_SOLICITUD_ADMIN')`);
      } else if (idTipoBlog && idTipoBlog !== 'todos' && idTipoBlog !== 'usuarios_general') { // 'usuarios_general' para todos los tipos de acciones de usuario
          conditions.push(`A.ID_TipoBlog_Afectado = ?`);
          params.push(idTipoBlog);
      }
      // No se filtra por ID_TipoBlog si es 'todos' o 'usuarios_general' para actividades de blog/comentario

      if (searchTerm) {
          conditions.push(`(U.Nombre_Usuario LIKE ? OR U.Apellido_Usuario LIKE ? OR A.Detalles LIKE ?)`);
          params.push(`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`);
      }

      if (conditions.length > 0) {
          querySQL += ' WHERE ' + conditions.join(' AND ');
      }

      querySQL += ' ORDER BY A.Fecha_Actividad DESC LIMIT 100'; // Limitar resultados por defecto

      const [actividades] = await pool.query(querySQL, params);
      res.json(actividades);

  } catch (error) {
      console.error('Error en /api/admin/reportes/actividades:', error);
      res.status(500).json({ success: false, message: 'Error al obtener actividades.' });
  }
});

// Ruta para obtener los tipos de blog para el dropdown
router.get('/api/tiposblog', async (req, res) => { // No necesita isAdmin si solo es para leer nombres
  try {
      const [tipos] = await pool.query('SELECT ID_TipoBlog, Tipo_Blog FROM TipoBlog ORDER BY Tipo_Blog');
      res.json(tipos);
  } catch (error) {
      console.error('Error al obtener tipos de blog:', error);
      res.status(500).json({ message: 'Error al obtener tipos de blog' });
  }
});

// Ruta para servir reportes.html (ya deberías tener una similar o crearla)
router.get('/reportes.html', isAdmin, (req, res) => {
  console.log('LOG: Sirviendo /reportes.html (protegido por isAdmin)');
  res.sendFile(path.join(__dirname, 'reportes.html')); // Ajusta la ruta si es necesario
});

// RUTA PARA QUE ADMIN OBTENGA BLOGS (con filtros por tipo y término de búsqueda)
router.get('/api/admin/blogs', isAdmin, async (req, res) => {
  console.log('LOG AUTH.JS: Accediendo a /api/admin/blogs con query:', req.query);
  try {
      let querySQL = `
          SELECT 
              B.ID_Blog, B.Titulo, B.Fecha_Creacion, B.Contenido_Blog,
              U.ID_Usuario, U.Nombre_Usuario, U.Apellido_Usuario,
              TB.ID_TipoBlog, TB.Tipo_Blog
          FROM Blog B
          JOIN Usuarios U ON B.ID_Usuario = U.ID_Usuario
          JOIN TipoBlog TB ON B.ID_TipoBlog = TB.ID_TipoBlog
      `;
      const params = [];
      const conditions = [];

      const { idTipoBlog, searchTerm } = req.query;

      if (idTipoBlog && idTipoBlog !== 'todos' && idTipoBlog.trim() !== '') {
          conditions.push(`B.ID_TipoBlog = ?`);
          params.push(idTipoBlog);
      }
      if (searchTerm && searchTerm.trim() !== '') {
          const searchTermLike = `%${searchTerm.trim()}%`;
          conditions.push(`(B.Titulo LIKE ? OR B.Contenido_Blog LIKE ? OR U.Nombre_Usuario LIKE ? OR U.Apellido_Usuario LIKE ?)`);
          params.push(searchTermLike, searchTermLike, searchTermLike, searchTermLike);
      }

      if (conditions.length > 0) {
          querySQL += ' WHERE ' + conditions.join(' AND ');
      }
      querySQL += ' ORDER BY B.Fecha_Creacion DESC LIMIT 200';

      console.log('SQL para Admin Blogs:', querySQL, params);
      const [blogs] = await pool.query(querySQL, params);
      res.json(blogs);

  } catch (error) {
      console.error('Error en /api/admin/blogs:', error);
      res.status(500).json({ success: false, message: 'Error al obtener blogs para admin.' });
  }
});

// RUTA PARA QUE ADMIN OBTENGA UN BLOG ESPECÍFICO Y SUS COMENTARIOS
router.get('/api/admin/blog/:idBlogConComentarios', isAdmin, async (req, res) => {
  const { idBlogConComentarios } = req.params;
  console.log(`LOG AUTH.JS: Admin obteniendo blog ${idBlogConComentarios} con comentarios`);
  if (isNaN(parseInt(idBlogConComentarios))) {
      return res.status(400).json({ success: false, message: 'ID de Blog inválido.' });
  }
  try {
      const [blogRows] = await pool.query(
          `SELECT B.ID_Blog, B.Titulo, B.Fecha_Creacion, B.Contenido_Blog, 
                  U.Nombre_Usuario, U.Apellido_Usuario, TB.Tipo_Blog 
           FROM Blog B 
           JOIN Usuarios U ON B.ID_Usuario = U.ID_Usuario
           JOIN TipoBlog TB ON B.ID_TipoBlog = TB.ID_TipoBlog
           WHERE B.ID_Blog = ?`, [idBlogConComentarios]
      );

      if (blogRows.length === 0) {
          return res.status(404).json({ success: false, message: 'Blog no encontrado.' });
      }
      const blog = blogRows[0];

      const [comentarios] = await pool.query(
          `SELECT C.ID_Comentario, C.Fecha_Comentario, C.Contenido_Comentario, 
                  U.Nombre_Usuario, U.Apellido_Usuario 
           FROM Comentarios C 
           JOIN Usuarios U ON C.ID_Usuario = U.ID_Usuario 
           WHERE C.ID_Blog = ? 
           ORDER BY C.Fecha_Comentario DESC`,
          [idBlogConComentarios]
      );

      blog.comentarios = comentarios;
      res.json(blog);

  } catch (error) {
      console.error(`Error obteniendo blog ${idBlogConComentarios} para admin:`, error);
      res.status(500).json({ success: false, message: 'Error al obtener el blog y sus comentarios.' });
  }
});

// RUTA PARA QUE ADMIN ELIMINE UN BLOG
router.delete('/api/admin/blogs/:idBlog', isAdmin, async (req, res) => {
  const { idBlog } = req.params;
  console.log(`LOG AUTH.JS: Admin eliminando blog ${idBlog}`);
  if (isNaN(parseInt(idBlog))) {
      return res.status(400).json({ success: false, message: 'ID de Blog inválido.' });
  }
  try {
      const [deleteBlogResult] = await pool.query('DELETE FROM Blog WHERE ID_Blog = ?', [idBlog]);

      if (deleteBlogResult.affectedRows === 0) {
          return res.status(404).json({ success: false, message: 'Blog no encontrado o ya eliminado.' });
      }

      res.json({ success: true, message: `Blog ID: ${idBlog} y todos sus comentarios asociados fueron eliminados por la base de datos.` });

  } catch (error) {
      console.error(`Error eliminando blog ${idBlog} para admin:`, error);
      res.status(500).json({ success: false, message: 'Error al eliminar el blog.' });
  }
});


// RUTA PARA QUE ADMIN ELIMINE UN COMENTARIO
router.delete('/api/admin/comentarios/:idComentario', isAdmin, async (req, res) => {
  const { idComentario } = req.params;
  console.log(`LOG AUTH.JS: Admin eliminando comentario ${idComentario}`);
  if (isNaN(parseInt(idComentario))) {
      return res.status(400).json({ success: false, message: 'ID de Comentario inválido.' });
  }
  try {
      const [result] = await pool.query('DELETE FROM Comentarios WHERE ID_Comentario = ?', [idComentario]);

      if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: 'Comentario no encontrado o ya eliminado.' });
      }
      res.json({ success: true, message: `Comentario ID: ${idComentario} eliminado.` });
  } catch (error) {
      console.error(`Error eliminando comentario ${idComentario} para admin:`, error);
      res.status(500).json({ success: false, message: 'Error al eliminar el comentario.' });
  }
});

// RUTA PARA SERVIR EL HTML DE MANEJO DE BLOGS (protegida por isAdmin)
router.get('/manejarBlogs.html', isAdmin, (req, res) => {
  console.log('LOG AUTH.JS: Sirviendo /manejarBlogs.html (protegido por isAdmin)');
  res.sendFile(path.join(__dirname, 'manejarBlogs.html'));
});

// RUTA PARA OBTENER ESTADÍSTICAS DE USUARIOS Y LISTA DE ADMINS
router.get('/api/admin/estadisticas-usuarios', isAdmin, async (req, res) => {
  console.log('LOG AUTH.JS: Accediendo a /api/admin/estadisticas-usuarios');
  try {
      const [totalUsuariosResult] = await pool.query('SELECT COUNT(*) as total FROM Usuarios');
      const totalUsuarios = totalUsuariosResult[0].total;

      const [totalAdminsResult] = await pool.query('SELECT COUNT(*) as total FROM Usuarios WHERE Es_Admin = TRUE');
      const totalAdmins = totalAdminsResult[0].total;

      const [listaAdmins] = await pool.query(
          'SELECT ID_Usuario, Nombre_Usuario, Apellido_Usuario, Correo_Usuario FROM Usuarios WHERE Es_Admin = TRUE ORDER BY Nombre_Usuario, Apellido_Usuario'
      );

      res.json({
          success: true,
          totalUsuarios,
          totalAdmins,
          listaAdmins
      });

  } catch (error) {
      console.error('Error en /api/admin/estadisticas-usuarios:', error);
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas de usuarios.' });
  }
});

//------------MIS BLOGS---------------------------------------------------------------------------------------
const isUserAuthenticated = (req, res, next) => {
    if (req.session.user && req.session.user.id) {
        return next();
    }
    // Si no está autenticado, podría redirigir a login.html o enviar un error
    if (req.accepts('html')) {
        return res.redirect('/login.html?mensaje=requiere_sesion');
    }
    res.status(401).json({ success: false, message: 'Acceso no autorizado. Por favor, inicia sesión.' });
};

// RUTA PARA OBTENER LOS BLOGS DEL USUARIO ACTUAL (con filtro por título)
router.get('/api/mis-blogs', isUserAuthenticated, async (req, res) => {
    const idUsuarioActual = req.session.user.id;
    const { searchTerm } = req.query;
    console.log(`LOG AUTH.JS: Accediendo a /api/mis-blogs para usuario ${idUsuarioActual} con searchTerm: ${searchTerm}`);

    try {
        let querySQL = `
            SELECT 
                B.ID_Blog, B.Titulo, B.Fecha_Creacion, B.Fecha_Update, TB.Tipo_Blog
            FROM Blog B
            JOIN TipoBlog TB ON B.ID_TipoBlog = TB.ID_TipoBlog
            WHERE B.ID_Usuario = ?
        `;
        const params = [idUsuarioActual];

        if (searchTerm && searchTerm.trim() !== '') {
            querySQL += ' AND B.Titulo LIKE ?';
            params.push(`%${searchTerm.trim()}%`);
        }
        querySQL += ' ORDER BY B.Fecha_Creacion DESC';

        const [blogs] = await pool.query(querySQL, params);
        res.json(blogs);
    } catch (error) {
        console.error('Error en /api/mis-blogs:', error);
        res.status(500).json({ success: false, message: 'Error al obtener tus blogs.' });
    }
});

// RUTA PARA OBTENER UN BLOG ESPECÍFICO DEL USUARIO PARA EDICIÓN
router.get('/api/mi-blog/:idBlog', isUserAuthenticated, async (req, res) => {
    const { idBlog } = req.params;
    const idUsuarioActual = req.session.user.id;
    console.log(`LOG AUTH.JS: Usuario ${idUsuarioActual} obteniendo su blog ${idBlog} para editar`);

    if (isNaN(parseInt(idBlog))) {
        return res.status(400).json({ success: false, message: 'ID de Blog inválido.' });
    }

    try {
        const [blogRows] = await pool.query(
            `SELECT ID_Blog, Titulo, Contenido_Blog, ID_TipoBlog 
             FROM Blog 
             WHERE ID_Blog = ? AND ID_Usuario = ?`, // Asegura que el blog pertenezca al usuario
            [idBlog, idUsuarioActual]
        );

        if (blogRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Blog no encontrado o no tienes permiso para editarlo.' });
        }
        res.json(blogRows[0]);
    } catch (error) {
        console.error(`Error obteniendo blog ${idBlog} para usuario ${idUsuarioActual}:`, error);
        res.status(500).json({ success: false, message: 'Error al obtener los datos del blog.' });
    }
});
// RUTA PARA ACTUALIZAR UN BLOG DEL USUARIO ACTUAL
router.put('/api/mi-blog/:idBlog', isUserAuthenticated, async (req, res) => {
    const { idBlog } = req.params;
    const idUsuarioActual = req.session.user.id;
    const { titulo, contenido, tipoBlog } = req.body; // ID_TipoBlog se envía como tipoBlog
    console.log(`LOG AUTH.JS: Usuario ${idUsuarioActual} actualizando su blog ${idBlog}`);

    if (isNaN(parseInt(idBlog))) {
        return res.status(400).json({ success: false, message: 'ID de Blog inválido.' });
    }
    if (!titulo || !contenido || !tipoBlog) {
        return res.status(400).json({ success: false, message: 'Título, contenido y tipo de blog son requeridos.' });
    }

    try {
        // Primero, verificar que el blog pertenece al usuario actual
        const [blogOwnerRows] = await pool.query('SELECT ID_Usuario FROM Blog WHERE ID_Blog = ?', [idBlog]);
        if (blogOwnerRows.length === 0 || blogOwnerRows[0].ID_Usuario !== idUsuarioActual) {
            return res.status(403).json({ success: false, message: 'No tienes permiso para editar este blog.' });
        }

        // Actualizar el blog
        const [result] = await pool.query(
            'UPDATE Blog SET Titulo = ?, Contenido_Blog = ?, ID_TipoBlog = ?, Fecha_Update = NOW() WHERE ID_Blog = ? AND ID_Usuario = ?',
            [titulo, contenido, tipoBlog, idBlog, idUsuarioActual]
        );

        if (result.affectedRows === 0) {
            // Esto no debería pasar si la verificación anterior fue exitosa, pero es una salvaguarda
            return res.status(404).json({ success: false, message: 'Blog no encontrado o no se pudo actualizar.' });
        }
        // El trigger `after_update_blog` registrará la actividad.
        res.json({ success: true, message: 'Blog actualizado con éxito.' });
    } catch (error) {
        console.error(`Error actualizando blog ${idBlog} para usuario ${idUsuarioActual}:`, error);
        res.status(500).json({ success: false, message: 'Error al actualizar el blog.' });
    }
});

// RUTA PARA ELIMINAR UN BLOG DEL USUARIO ACTUAL (O ADMIN)
router.delete('/api/mi-blog/:idBlog', isUserAuthenticated, async (req, res) => {
    const { idBlog } = req.params;
    const idUsuarioActual = req.session.user.id;
    const esAdmin = req.session.user.isAdmin; // Verificar si el que elimina es admin

    console.log(`LOG AUTH.JS: Usuario ${idUsuarioActual} (admin: ${esAdmin}) intentando eliminar blog ${idBlog}`);

    if (isNaN(parseInt(idBlog))) {
        return res.status(400).json({ success: false, message: 'ID de Blog inválido.' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Verificar propiedad si no es admin
        if (!esAdmin) {
            const [blogOwnerRows] = await connection.query('SELECT ID_Usuario FROM Blog WHERE ID_Blog = ?', [idBlog]);
            if (blogOwnerRows.length === 0 || blogOwnerRows[0].ID_Usuario !== idUsuarioActual) {
                await connection.rollback();
                return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este blog.' });
            }
        }
        
        // Asumimos ON DELETE CASCADE para los comentarios en la BD.
        const [deleteBlogResult] = await connection.query('DELETE FROM Blog WHERE ID_Blog = ?', [idBlog]);

        if (deleteBlogResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Blog no encontrado o ya eliminado.' });
        }
        
        await connection.commit();
        res.json({ success: true, message: `Blog ID: ${idBlog} y sus comentarios asociados fueron eliminados.` });

    } catch (error) {
        await connection.rollback();
        console.error(`Error eliminando blog ${idBlog}:`, error);
        res.status(500).json({ success: false, message: 'Error al eliminar el blog.' });
    } finally {
        if (connection) connection.release();
    }
});

// Ruta para servir el HTML de misBlogs.html (protegida para usuarios logueados)
router.get('/misBlogs.html', isUserAuthenticated, (req, res) => {
    console.log('LOG AUTH.JS: Sirviendo /misBlogs.html');
    res.sendFile(path.join(__dirname, 'misBlogs.html'));
});

module.exports = router;