    let adminActual = null;
    let todasLasSolicitudes = []; // Guardaremos aquí todas las solicitudes para filtrar

    document.addEventListener('DOMContentLoaded', async () => {
      await cargarAdminActual();
      await cargarSolicitudesPendientes();
      document.getElementById('searchInput').addEventListener('input', filtrarSolicitudes);
    });

    function toggleMenu() {
      const menu = document.getElementById("userMenu");
      menu.classList.toggle("show");
    }

    async function cargarAdminActual() {
      try {
        const response = await fetch('/api/usuario-actual');
        if (!response.ok) {
          window.location.href = '/login-admin.html';
          return;
        }
        adminActual = await response.json();
        if (!adminActual.isAdmin) {
          window.location.href = '/login-admin.html';
          return;
        }
        document.getElementById('adminUserName').textContent = `${adminActual.nombre} ${adminActual.apellido}`;
        document.getElementById('adminUserEmail').textContent = adminActual.email;
      } catch (error) {
        console.error('Error al cargar datos del admin:', error);
        window.location.href = '/login-admin.html';
      }
    }

    async function cerrarSesionAdmin() {
      try {
        await fetch('/logout', { method: 'GET' });
        window.location.href = "/login-admin.html";
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        mostrarCustomPopup('Error al cerrar sesión.', 'error');
      }
    }

    async function cargarSolicitudesPendientes() {
      const listaUL = document.getElementById('listaSolicitudes');
      const loadingMessage = document.getElementById('loadingMessage');
      
      listaUL.innerHTML = ''; 
      if (loadingMessage) loadingMessage.style.display = 'block';

      try {
        const response = await fetch('/api/admin/solicitudes-pendientes');
        if (!response.ok) {
          throw new Error('Error del servidor al obtener solicitudes.');
        }
        todasLasSolicitudes = await response.json();
        if (loadingMessage) loadingMessage.style.display = 'none';

        renderizarSolicitudes(todasLasSolicitudes);

      } catch (error) {
        console.error('Error al cargar solicitudes pendientes:', error);
        if (loadingMessage) loadingMessage.style.display = 'none';
        listaUL.innerHTML = `<p class="status-message error">Error al cargar solicitudes: ${error.message}</p>`;
      }
    }

    function renderizarSolicitudes(solicitudes) {
        const listaUL = document.getElementById('listaSolicitudes');
        listaUL.innerHTML = ''; 

        if (solicitudes.length === 0) {
          listaUL.innerHTML = '<p class="status-message">No hay solicitudes que coincidan o no hay pendientes.</p>';
          return;
        }

        solicitudes.forEach(solicitud => {
          const li = document.createElement('li');
          li.dataset.idUsuario = solicitud.ID_Usuario;

          li.innerHTML = `
            <div class="info">
              <strong>${solicitud.Nombre_Usuario} ${solicitud.Apellido_Usuario}</strong><br />
              <span>Tel: ${solicitud.telefono || 'No proporcionado'}</span>
            </div>
            <div class="acciones">
              <button class="aceptar" onclick="confirmarAccion('aceptar', ${solicitud.ID_Usuario})">Aceptar</button>
              <button class="denegar" onclick="confirmarAccion('denegar', ${solicitud.ID_Usuario})">Denegar</button>
            </div>
          `;
          listaUL.appendChild(li);
        });
    }
    
    function confirmarAccion(accion, idUsuario) {
        let mensajeConfirmacion = "";
        if (accion === 'aceptar') {
            mensajeConfirmacion = '¿Estás seguro de que deseas ACEPTAR esta solicitud?';
        } else if (accion === 'denegar') {
            mensajeConfirmacion = '¿Estás seguro de que deseas DENEGAR esta solicitud? Esto borrará el teléfono del usuario.';
        } else {
            return; // Acción no reconocida
        }

        // Usaremos un popup de confirmación personalizado en el futuro si quieres.
        // Por ahora, mantenemos el confirm() nativo para la decisión.
        if (confirm(mensajeConfirmacion)) {
            if (accion === 'aceptar') {
                procesarAceptarSolicitud(idUsuario);
            } else if (accion === 'denegar') {
                procesarDenegarSolicitud(idUsuario);
            }
        }
    }

    async function procesarAceptarSolicitud(idUsuario) {
      try {
        const response = await fetch('/api/admin/aceptar-solicitud', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idUsuario })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'No se pudo aceptar la solicitud.');
        }
        mostrarCustomPopup(result.message || 'Solicitud aceptada.', 'success');
        await cargarSolicitudesPendientes();
      } catch (error) {
        console.error('Error al aceptar solicitud:', error);
        mostrarCustomPopup(`Error: ${error.message}`, 'error');
      }
    }

    async function procesarDenegarSolicitud(idUsuario) {
      try {
        const response = await fetch('/api/admin/denegar-solicitud', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idUsuario })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'No se pudo denegar la solicitud.');
        }
        mostrarCustomPopup(result.message || 'Solicitud denegada.', 'success');
        await cargarSolicitudesPendientes();
      } catch (error) {
        console.error('Error al denegar solicitud:', error);
        mostrarCustomPopup(`Error: ${error.message}`, 'error');
      }
    }

    function filtrarSolicitudes() {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
      const solicitudesFiltradas = todasLasSolicitudes.filter(solicitud => {
        const nombreCompleto = `${solicitud.Nombre_Usuario} ${solicitud.Apellido_Usuario}`.toLowerCase();
        const telefono = (solicitud.telefono || "").toLowerCase();
        return nombreCompleto.includes(searchTerm) || telefono.includes(searchTerm);
      });
      renderizarSolicitudes(solicitudesFiltradas);
    }

    // Función para mostrar el pop-up personalizado
    function mostrarCustomPopup(mensaje, tipo = 'info') {
        const popupOverlay = document.getElementById('customPopup');
        const popupMessage = document.getElementById('customPopupMessage');
        const popupContent = popupOverlay.querySelector('.custom-popup-content');
        const okButton = document.getElementById('customPopupOkButton');

        popupMessage.textContent = mensaje;
        popupContent.className = 'custom-popup-content'; // Reset classes

        if (tipo === 'success') {
            popupContent.classList.add('success');
        } else if (tipo === 'error') {
            popupContent.classList.add('error');
        }

        popupOverlay.style.display = 'flex';

        okButton.onclick = () => { // Asignar el evento aquí para asegurar que es el más reciente
            popupOverlay.style.display = 'none';
        };
        // También puedes añadir un listener para la tecla Escape
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                popupOverlay.style.display = 'none';
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);
        okButton.focus(); // Poner foco en el botón OK
    }