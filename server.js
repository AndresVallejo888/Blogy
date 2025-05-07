require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors'); // Añade esto
const authRoutes = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Configura CORS
app.use(cors({
  origin: 'http://localhost:' + PORT,
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Middleware para API
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Rutas
app.use('/', authRoutes);

// Middleware estático (DEBE ir después de las rutas API)
app.use(express.static(path.join(__dirname)));

// Ruta para home.html
app.get('/home.html', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(__dirname, 'home.html'));
});

// Manejo de errores para API
app.use('/api', (err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
});

// Ruta catch-all para frontend (DEBE ir al final)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});