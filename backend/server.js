require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const authRoutes = require('./auth'); // auth.js debe estar en backend/

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// Middlewares globales
// =============================================

app.use(cors({
  origin: `http://localhost:${PORT}`,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 día
  }
}));

app.use((req, res, next) => {
  console.log(`REQ LOG: ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// =============================================
// Rutas API y de autenticación
// =============================================

app.use('/', authRoutes);

// =============================================
// Archivos estáticos (HTML, CSS, JS, imágenes)
// =============================================

app.use(express.static(path.join(__dirname, '../frontend')));

// =============================================
// Manejo de errores
// =============================================

// Errores de rutas API
app.use('/api', (err, req, res, next) => {
  console.error(`API Error en ${req.method} ${req.originalUrl}:`, err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor en API',
  });
});

// 404 - Página no encontrada
app.use((req, res, next) => {
  console.log(`LOG: Ruta no encontrada (404) - ${req.method} ${req.originalUrl}`);
  if (req.accepts('html')) {
    res.status(404).sendFile(path.join(__dirname, '../frontend/index.html'));
    return;
  }
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({ success: false, message: 'Endpoint API no encontrado' });
    return;
  }
  res.status(404).send('Recurso no encontrado');
});

// Error general
app.use((err, req, res, next) => {
  console.error("Error GENERAL no manejado:", err.stack);
  res.status(err.status || 500).send(err.message || 'Algo salió muy mal!');
});

// =============================================
// Iniciar servidor
// =============================================

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠️ ADVERTENCIA: SESSION_SECRET no está configurada en .env');
  }
});