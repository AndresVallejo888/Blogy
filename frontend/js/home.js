// Mostrar el popup de usuario
function mostrarUserPopup() {
    document.getElementById("popupUser").style.display = "block";
  }
  
  // Mostrar el popup de administrador
  function mostrarAdminPopup() {
    document.getElementById("popupAdmin").style.display = "block";
  }
  
  // Cerrar cualquier popup abierto
  function cerrarPopup() {
    document.getElementById("popupUser").style.display = "none";
    document.getElementById("popupAdmin").style.display = "none";
  }
  
  // Cerrar sesión
  async function cerrarSesion() {
    try {
      const res = await fetch('/logout', {
        method: 'GET',
        credentials: 'include'
      });
      const result = await res.json();
      if (result.success) {
        window.location.href = 'login.html';
      } else {
        alert('No se pudo cerrar sesión.');
      }
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      alert('Error al cerrar sesión.');
    }
  }
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const res = await fetch('/api/usuario-actual', { credentials: 'include' });
      if (res.ok) {
        const user = await res.json();
        const span = document.getElementById('nombreUsuario');
        if (span) {
          span.textContent = `${user.nombre}`;
        }
      }
    } catch (err) {
      console.error('No se pudo obtener el usuario:', err);
    }
  });