let adminActualReportes = null;

    document.addEventListener('DOMContentLoaded', async () => {
      await cargarAdminActualReportes();
      await popularSelectTiposBlog(); // Poblar el dropdown
      await cargarReportes(); // Cargar reportes iniciales (todos)

      document.getElementById('selectSeccionReporte').addEventListener('change', cargarReportes);
      document.getElementById('btnBuscarReporte').addEventListener('click', cargarReportes);
      document.getElementById('searchReporteInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            cargarReportes();
        }
      });
    });

    function toggleMenu() {
      document.getElementById("userMenu").classList.toggle("show");
    }

    async function cargarAdminActualReportes() {
      try {
        const response = await fetch('/api/usuario-actual');
        if (!response.ok) { window.location.href = '/login-admin.html'; return; }
        adminActualReportes = await response.json();
        if (!adminActualReportes.isAdmin) { window.location.href = '/login-admin.html'; return; }
        document.getElementById('adminUserName').textContent = `${adminActualReportes.nombre} ${adminActualReportes.apellido}`;
        document.getElementById('adminUserEmail').textContent = adminActualReportes.email;
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
        // Considera usar un popup personalizado para errores
      }
    }

    async function popularSelectTiposBlog() {
        const select = document.getElementById('selectSeccionReporte');
        try {
            const response = await fetch('/api/tiposblog');
            if (!response.ok) throw new Error('No se pudieron cargar los tipos de blog');
            const tiposBlog = await response.json();

            tiposBlog.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo.ID_TipoBlog;
                option.textContent = tipo.Tipo_Blog;
                select.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            // Podrías mostrar un mensaje de error al usuario
        }
    }

    async function cargarReportes() {
      const listaUL = document.getElementById('listaReportes');
      const loadingMessage = document.getElementById('loadingReportesMessage');
      const selectedValue = document.getElementById('selectSeccionReporte').value;
      const searchTerm = document.getElementById('searchReporteInput').value;

      listaUL.innerHTML = '';
      if(loadingMessage) loadingMessage.style.display = 'block';

      let queryParams = new URLSearchParams();
      if (selectedValue === 'usuarios_general') {
        queryParams.append('tipoReporte', 'usuarios');
      } else if (selectedValue !== 'todos') {
        queryParams.append('idTipoBlog', selectedValue);
      }
      if (searchTerm.trim() !== '') {
        queryParams.append('searchTerm', searchTerm.trim());
      }

      try {
        const response = await fetch(`/api/admin/reportes/actividades?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Error del servidor al obtener reportes.');

        const actividades = await response.json();
        if(loadingMessage) loadingMessage.style.display = 'none';

        if (actividades.length === 0) {
          listaUL.innerHTML = '<p class="status-message">No hay actividades que coincidan con los filtros.</p>';
          return;
        }

        actividades.forEach(act => {
          const li = document.createElement('li');
          const inicial = (act.Nombre_Usuario ? act.Nombre_Usuario[0] : '?').toUpperCase();
          const fecha = new Date(act.Fecha_Actividad).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
          let accionTexto = '';
          let entidadTexto = '';

          // Mapeo de Tipo_Accion a texto legible
          switch(act.Tipo_Accion) {
              case 'CREAR_BLOG': accionTexto = 'creó'; entidadTexto = 'un blog'; break;
              case 'EDITAR_BLOG': accionTexto = 'editó'; entidadTexto = 'un blog'; break;
              case 'ELIMINAR_BLOG': accionTexto = 'eliminó'; entidadTexto = 'un blog'; break;
              case 'CREAR_COMENTARIO': accionTexto = 'comentó en'; entidadTexto = 'un blog'; break; // El detalle dirá en cuál
              case 'ELIMINAR_COMENTARIO': accionTexto = 'eliminó un comentario de'; entidadTexto = 'un blog'; break;
              case 'REGISTRO_USUARIO': accionTexto = 'se registró como'; entidadTexto = 'nuevo usuario'; break;
              case 'PROMOVER_A_ADMIN': accionTexto = 'fue promovido a'; entidadTexto = 'administrador'; break;
              case 'SOLICITUD_ADMIN': accionTexto = 'solicitó ser'; entidadTexto = 'administrador'; break;
              case 'DENEGAR_SOLICITUD_ADMIN': accionTexto = 'se le denegó la solicitud para ser'; entidadTexto = 'administrador'; break;
              default: accionTexto = act.Tipo_Accion; entidadTexto = act.Entidad_Afectada.toLowerCase();
          }

          let detallePrincipal = act.Detalles || '';
          if (act.Entidad_Afectada === 'BLOG' && act.Detalles) {
              detallePrincipal = `: "${act.Detalles.replace('Título: ', '')}"`;
          } else if (act.Entidad_Afectada === 'COMENTARIO' && act.Detalles) {
              detallePrincipal = ` (${act.Detalles})`;
          } else if (act.Entidad_Afectada === 'USUARIO' && (act.Tipo_Accion === 'REGISTRO_USUARIO' || act.Tipo_Accion === 'PROMOVER_A_ADMIN' || act.Tipo_Accion === 'SOLICITUD_ADMIN' || act.Tipo_Accion === 'DENEGAR_SOLICITUD_ADMIN')) {
              detallePrincipal = ''; // El nombre ya está en la oración
          }


          li.innerHTML = `
              <span class="inicial" title="${act.Nombre_Usuario} ${act.Apellido_Usuario}">${inicial}</span>
              <div class="reporte-info">
                  ${act.Nombre_Usuario} ${act.Apellido_Usuario} <strong>${accionTexto}</strong> ${entidadTexto}${detallePrincipal}<br />
                  <small><strong>${fecha}</strong></small>
                  ${act.Nombre_TipoBlog ? `<small class="tipo-blog-tag">Sección: ${act.Nombre_TipoBlog}</small>` : ''}
              </div>
          `;
          listaUL.appendChild(li);
        });

      } catch (error) {
        console.error('Error al cargar reportes:', error);
        if(loadingMessage) loadingMessage.style.display = 'none';
        listaUL.innerHTML = `<p class="status-message error">Error al cargar reportes: ${error.message}</p>`;
      }
    }