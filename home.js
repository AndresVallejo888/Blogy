let usuarioActual = null;

    document.addEventListener('DOMContentLoaded', async () => {
      await cargarUsuario();
      await verificarEstadoAdmin();
      
      // Configurar evento del botón de enviar solicitud
      document.getElementById('enviarSolicitudBtn').addEventListener('click', enviarSolicitudAdmin);
    });

    
    async function cargarUsuario() {
      try {
        const response = await fetch('/api/usuario-actual');
        if (response.ok) {
          usuarioActual = await response.json();
          // Actualizar el nombre en el popup
          document.getElementById('nombreUsuario').textContent = 
            `${usuarioActual.nombre} ${usuarioActual.apellido}`;
        } else {
          window.location.href = '/login.html';
        }
      } catch (error) {
        console.error('Error al cargar usuario:', error);
      }
    }

    async function cerrarSesion() {
      try {
        const response = await fetch('/logout');
        if (response.ok) {
          window.location.href = '/login.html';
        }
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
    }

    async function verificarEstadoAdmin() {
      try {
        const response = await fetch('/api/admin-request-status');
        if (response.ok) {
          const data = await response.json();
          const adminBtn = document.querySelector('.admin-btn');
          const statusMessage = document.getElementById('adminStatusMessage');
          
          if (data.isAdmin) {
            adminBtn.textContent = 'Eres administrador';
            adminBtn.style.backgroundColor = '#4CAF50';
            adminBtn.onclick = null;
          } else if (data.hasRequested) {
            adminBtn.textContent = 'Solicitud enviada';
            adminBtn.style.backgroundColor = '#FF9800';
            adminBtn.onclick = null;
            statusMessage.textContent = 'Tu solicitud está en revisión. Te contactaremos pronto.';
            statusMessage.style.display = 'block';
          }
        }
      } catch (error) {
        console.error('Error al verificar estado admin:', error);
      }
    }

    async function enviarSolicitudAdmin() {
      const politicas = document.getElementById('politicasCheck').checked;
      const integridad = document.getElementById('integridadCheck').checked;
      const telefono = document.getElementById('telefonoAdmin').value.trim();
      const statusMessage = document.getElementById('adminStatusMessage');
      
      // Resetear mensaje
      statusMessage.style.display = 'none';
      
      // Validaciones básicas
      if (!telefono) {
        mostrarError('Por favor ingresa tu número de teléfono');
        return;
      }

      if (!politicas || !integridad) {
        mostrarError('Debes aceptar ambas condiciones para continuar');
        return;
      }

      try {
        const response = await fetch('/api/solicitar-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include', // Importante para sesiones
          body: JSON.stringify({
            telefono,
            aceptoPoliticas: politicas,
            aceptoIntegridad: integridad
          })
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Error en la solicitud');
        }
        
        mostrarExito('Solicitud enviada con éxito. Te contactaremos pronto.');
        
        const adminBtn = document.querySelector('.admin-btn');
        adminBtn.textContent = 'Solicitud enviada';
        adminBtn.style.backgroundColor = '#FF9800';
        adminBtn.onclick = null;
        
        setTimeout(cerrarPopup, 2000);
      } catch (error) {
        console.error('Error:', error);
        mostrarError(error.message || 'Error al conectar con el servidor');
      }
    }

    function mostrarError(mensaje) {
      const statusMessage = document.getElementById('adminStatusMessage');
      statusMessage.textContent = mensaje;
      statusMessage.style.color = '#e91e63';
      statusMessage.style.display = 'block';
    }
    function mostrarExito(mensaje) {
      const statusMessage = document.getElementById('adminStatusMessage');
      statusMessage.textContent = mensaje;
      statusMessage.style.color = '#4CAF50';
      statusMessage.style.display = 'block';
    }


    function mostrarPopup(id) {
      document.getElementById(id).style.display = 'flex';
    }

    function cerrarPopup() {
      document.querySelectorAll('.popup').forEach(p => p.style.display = 'none');
    }

    function mostrarUserPopup() {
      mostrarPopup('popupUser');
    }

    function mostrarAdminPopup() {
      mostrarPopup('popupAdmin');
    }