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
    const [rows] = await pool.query('SELECT * FROM Usuarios WHERE Correo_Usuario = ?', [email]);
    if (rows.length === 0) {
      console.log('LOG: /login - Usuario no encontrado:', email);
      return res.status(400).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.Password_Usuario);
    if (!isMatch) {
      console.log('LOG: /login - Contraseña incorrecta para:', email);
      return res.status(400).json({
        success: false,
        message: 'Credenciales incorrectas'
      });
    }

    req.session.user = {
      id: user.ID_Usuario,
      nombre: user.Nombre_Usuario,
      apellido: user.Apellido_Usuario,
      email: user.Correo_Usuario,
      isAdmin: user.Es_Admin // Asegúrate que Es_Admin (0 o 1) se cargue aquí
    };
    console.log('LOG: /login - Login de usuario exitoso:', email, 'isAdmin:', user.Es_Admin);
    res.json({ success: true, isAdmin: user.Es_Admin === 1 }); // Puedes enviar isAdmin al frontend si lo necesitas
  } catch (error) {
    console.error('Error en /login:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
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
    console.log('LOG: /api/usuario-actual - No autenticado (sin sesión)');
    return res.status(401).json({ message: 'No autenticado' });
  }
  console.log('LOG: /api/usuario-actual - Usuario en sesión:', req.session.user);
  res.json(req.session.user); // Esto enviará el objeto de usuario, incluyendo isAdmin
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
      'SELECT * FROM Usuarios WHERE Correo_Usuario = ? AND Es_Admin = 1', // Asegúrate que Es_Admin sea 1 para los admins
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
      isAdmin: true // ¡IMPORTANTE: Establecer isAdmin a true explícitamente!
    };
    console.log('LOG: /api/admin-login - Login de ADMIN exitoso para:', email);
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
  // Si no es admin o no hay sesión, podría redirigir o enviar error.
  // Para proteger una página HTML, la redirección es común.
  // Para una API, un 403 es más apropiado.
  // Como esto protege '/dashboard-admin.html', redirigir está bien.
  // Si fuera una API protegida, sería: res.status(403).json({ message: 'Acceso no autorizado' });
  res.redirect('/login-admin.html');
};

// Ruta protegida para dashboard de admin (HTML)
router.get('/dashboard-admin.html', isAdmin, (req, res) => {
  console.log('LOG: Sirviendo /dashboard-admin.html (protegido por isAdmin)');
  // Asumiendo que dashboard-admin.html está en el mismo directorio que auth.js (raíz del proyecto)
  res.sendFile(path.join(__dirname, 'dashboard-admin.html'));
});

// RUTA PARA OBTENER SOLICITUDES DE ADMIN PENDIENTES
router.get('/api/admin/solicitudes-pendientes', isAdmin, async (req, res) => {
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
router.post('/api/admin/aceptar-solicitud', isAdmin, async (req, res) => {
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
router.post('/api/admin/denegar-solicitud', isAdmin, async (req, res) => {
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
router.get('/solicitudes.html', isAdmin, (req, res) => {
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

module.exports = router;