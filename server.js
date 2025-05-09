// Configuración inicial - Requerimientos
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const authRoutes = require('./auth');

// Inicialización de la aplicación
const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// Configuración de Middlewares
// =============================================

// 1. Configuración CORS (Seguridad/Comunicación)
app.use(cors({
  origin: `http://localhost:${PORT}`,
  credentials: true
}));

// 2. Middlewares de análisis de solicitudes
app.use(express.json()); // Para parsear application/json
app.use(express.urlencoded({ extended: true })); // Para parsear application/x-www-form-urlencoded

// 3. Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // En producción debería ser true con HTTPS
}));

// 4. Middleware para API (headers específicos)
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// =============================================
// Configuración de Rutas
// =============================================

// 1. Rutas de autenticación
app.use('/', authRoutes);

// 2. Ruta específica para home.html con protección de sesión
app.get('/home.html', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'home.html'));
});

// =============================================
// Middlewares de Archivos Estáticos
// =============================================

// Servir archivos estáticos (CSS, JS, imágenes)
app.use(express.static(path.join(__dirname)));

// =============================================
// Manejo de Errores
// =============================================

// 1. Manejo de errores para API
app.use('/api', (err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

// =============================================
// Ruta Catch-All para Frontend (SPA)
// =============================================

// Esta debe ser la última ruta definida
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// =============================================
// Inicialización del Servidor
// =============================================

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});