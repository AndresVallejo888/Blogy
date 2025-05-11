require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const authRoutes = require('./auth'); // Asumiendo que auth.js está en el mismo directorio

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// Configuración de Middlewares
// =============================================

// 1. Configuración CORS
app.use(cors({
  origin: `http://localhost:${PORT}`, // Sé específico con el origen en producción
  credentials: true
}));

// 2. Middlewares de análisis de solicitudes
app.use(express.json()); // Para parsear application/json
app.use(express.urlencoded({ extended: true })); // Para parsear application/x-www-form-urlencoded

// 3. Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET, // ¡ASEGÚRATE QUE ESTÉ EN .env Y SEA UNA CADENA SEGURA!
  resave: false,
  saveUninitialized: false, // Cambiado a false: solo guarda la sesión si se modifica. Ayuda a evitar cookies innecesarias.
  cookie: {
    secure: false, // En producción con HTTPS, esto DEBE ser true
    httpOnly: true, // Ayuda a prevenir ataques XSS
    maxAge: 24 * 60 * 60 * 1000 // Ejemplo: cookie de 1 día de duración
  }
}));

// (Opcional) Middleware para loggear todas las solicitudes (ayuda a depurar)
app.use((req, res, next) => {
  console.log(`REQ LOG: ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});


// =============================================
// Configuración de Rutas
// =============================================

// 1. Rutas de autenticación y otras APIs de auth.js
app.use('/', authRoutes); // Todas las rutas definidas en auth.js (incluyendo /api/admin-login) estarán disponibles aquí

// 2. Ruta específica para home.html (ejemplo de página protegida para usuarios normales)
app.get('/home.html', (req, res) => {
  // Primero, siempre verifica si hay un usuario en sesión.
  if (!req.session.user) {
    console.log('LOG: /home.html - Usuario no autenticado, redirigiendo a /login.html');
    return res.redirect('/login.html');
  }

  // Ya no redirigimos a los administradores desde aquí.
  // Si un admin inicia sesión por login.html, se le permitirá ver home.html.
  // El log ahora reflejará que cualquier usuario autenticado (admin o no) llegará aquí.
  console.log(`LOG: /home.html - Sirviendo página para usuario autenticado: ${req.session.user.email}, isAdmin: ${req.session.user.isAdmin}`);
  res.sendFile(path.join(__dirname, 'home.html'));
});

// Las rutas para servir /login-admin.html y /dashboard-admin.html ya están en auth.js
// por lo que NO necesitas las siguientes rutas aquí si las definiste en auth.js:
/*
app.get('/dashboard-admin', (req, res) => { ... }); // Esta lógica ya está en auth.js con .html y middleware isAdmin
app.get('/login-admin', (req, res) => { ... });    // Esta lógica ya está en auth.js con .html
*/

// =============================================
// Middlewares de Archivos Estáticos
// =============================================
// Sirve archivos estáticos (CSS, JS del cliente, imágenes) desde el directorio raíz del proyecto
// ASEGÚRATE DE QUE ESTO ESTÉ DESPUÉS DE TUS RUTAS DE API ESPECÍFICAS
app.use(express.static(path.join(__dirname)));
// Si tienes tus archivos estáticos en una carpeta 'public':
// app.use(express.static(path.join(__dirname, 'public')));

// =============================================
// Manejo de Errores (específico para API y general)
// =============================================

// 1. Manejo de errores para rutas bajo /api (debe ir después de definir authRoutes)
// Este middleware solo se activará si una ruta /api llama a next(error)
app.use('/api', (err, req, res, next) => {
  console.error(`API Error en ${req.method} ${req.originalUrl}:`, err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor en API',
    // En desarrollo, podrías querer enviar el stack:
    // ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 2. Manejo de rutas no encontradas (404) - Debe ser uno de los últimos middlewares
app.use((req, res, next) => {
  console.log(`LOG: Ruta no encontrada (404) - ${req.method} ${req.originalUrl}`);
  // Si la solicitud acepta HTML, envía tu página 404.html o index.html como fallback
  if (req.accepts('html')) {
    // Puedes tener un 404.html específico o usar index.html como fallback para SPAs
    res.status(404).sendFile(path.join(__dirname, 'index.html')); // o 404.html
    return;
  }
  // Para solicitudes API no encontradas que no fueron manejadas antes
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({ success: false, message: 'Endpoint API no encontrado' });
    return;
  }
  // Para otros tipos de contenido
  res.status(404).send('Recurso no encontrado');
});


// 3. Manejador de errores general (último middleware)
app.use((err, req, res, next) => {
  console.error("Error GENERAL no manejado:", err.stack);
  res.status(err.status || 500).send(err.message || 'Algo salió muy mal!');
});


// =============================================
// Inicialización del Servidor
// =============================================
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  if (!process.env.SESSION_SECRET) {
    console.warn('ADVERTENCIA: SESSION_SECRET no está configurada en el archivo .env. ¡Esto es inseguro!');
  }
});