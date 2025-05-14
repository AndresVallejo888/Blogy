// home.js
document.addEventListener('DOMContentLoaded', async () => {
  await cargarNombreUsuario();
  verificarEstadoSolicitudAdmin();

  // Enlace a "Mis Blogs"
  const misBlogsBtn = document.querySelector('.blog-button');
  if (misBlogsBtn) {
    misBlogsBtn.addEventListener('click', () => {
      window.location.href = '/front/misblogs.html';  // Nueva ruta
    });
  }

  // Enviar solicitud de administrador
  const btnSolicitud = document.getElementById('enviarSolicitudBtn');
  if (btnSolicitud) {
    btnSolicitud.addEventListener('click', async () => {
      const telefono = document.getElementById('telefonoAdmin').value;
      const politicas = document.getElementById('politicasCheck').checked;
      const integridad = document.getElementById('integridadCheck').checked;

      const response = await fetch('/api/solicitar-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telefono, aceptoPoliticas: politicas, aceptoIntegridad: integridad })
      });

      const result = await response.json();
      if (result.success) {
        alert('¡Solicitud enviada con éxito!');
        cerrarPopup();
      } else {
        alert(result.message || 'Error al enviar solicitud');
      }
    });
  }
});

// Mostrar nombre en popup usuario
async function cargarNombreUsuario() {
  try {
    const res = await fetch('/api/usuario-actual');
    if (!res.ok) throw new Error('No autenticado');
    const user = await res.json();
    document.getElementById('nombreUsuario').textContent = user.nombre;
  } catch (error) {
    console.warn('No se pudo cargar nombre de usuario:', error);
  }
}

// Verificar si el usuario ya solicitó ser admin
async function verificarEstadoSolicitudAdmin() {
  try {
    const res = await fetch('/api/admin-request-status');
    if (!res.ok) return;
    const result = await res.json();
    if (result.hasRequested) {
      const mensaje = document.getElementById('adminStatusMessage');
      mensaje.textContent = result.isAdmin
        ? '¡Ya eres administrador!'
        : 'Ya enviaste tu solicitud. Estamos revisando.';
      mensaje.style.display = 'block';
    }
  } catch (error) {
    console.warn('Error verificando solicitud de admin:', error);
  }
}

// Funciones para popup de usuario y admin
function mostrarUserPopup() {
  document.getElementById('popupUser').style.display = 'block';
}
function mostrarAdminPopup() {
  document.getElementById('popupAdmin').style.display = 'block';
}
function cerrarPopup() {
  document.getElementById('popupUser').style.display = 'none';
  document.getElementById('popupAdmin').style.display = 'none';
}

// Cerrar sesión
function cerrarSesion() {
  fetch('/logout')
    .then(res => res.json())
    .then(() => {
      window.location.href = '/front/login.html';  // Redirección segura
    })
    .catch(err => console.error('Error cerrando sesión:', err));
}