        let usuarioLogueado = null;
        let tiposDeBlogCache = []; // Para no recargar los tipos de blog cada vez

        // --- FUNCIONES DEL HEADER Y SESIÓN ---
        function toggleUserPopupMisBlogs() {
            const popup = document.getElementById('popupUserMisBlogs');
            if (popup) popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
        }
        function cerrarUserPopupMisBlogs() {
            const popup = document.getElementById('popupUserMisBlogs');
            if (popup) popup.style.display = 'none';
        }
        async function cargarUsuarioActualMisBlogs() {
            try {
                const response = await fetch('/api/usuario-actual');
                if (!response.ok) { window.location.href = '/login.html'; return null;}
                usuarioLogueado = await response.json();
                if (!usuarioLogueado || !usuarioLogueado.id) { window.location.href = '/login.html'; return null; }

                const nombreEl = document.getElementById('nombreUsuarioMisBlogs');
                if (nombreEl) nombreEl.textContent = `${usuarioLogueado.nombre} ${usuarioLogueado.apellido}`;
                return usuarioLogueado;
            } catch (e) { console.error("Error cargando usuario:", e); window.location.href = '/login.html'; return null;}
        }
        async function cerrarSesionMisBlogs() {
            try { await fetch('/logout'); window.location.href = '/login.html'; }
            catch (e) { console.error("Error cerrando sesión:", e); mostrarCustomPopupGlobal('Error al cerrar sesión.', 'error');}
        }

        // --- CARGA Y RENDERIZADO DE "MIS BLOGS" ---
        async function cargarMisBlogs() {
            const container = document.getElementById('listaMisBlogs');
            const loadingMsg = document.getElementById('loadingMisBlogsMessage');
            const searchTerm = document.getElementById('searchMisBlogsInput')?.value.trim() || '';

            if (!container) { console.error("Contenedor listaMisBlogs no encontrado."); return; }
            container.innerHTML = '';
            if (loadingMsg) loadingMsg.style.display = 'block';

            const params = new URLSearchParams();
            if (searchTerm) params.append('searchTerm', searchTerm);

            try {
                const response = await fetch(`/api/mis-blogs?${params.toString()}`);
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({message: "Error obteniendo tus blogs."}));
                    throw new Error(errData.message);
                }
                const blogs = await response.json();
                if (loadingMsg) loadingMsg.style.display = 'none';

                if (blogs.length === 0) {
                    container.innerHTML = '<p class="status-message">Aún no has creado ningún blog o no hay coincidencias.</p>';
                    return;
                }
                const ul = document.createElement('ul');
                // ul.className = 'clase-para-ul-mis-blogs'; // Si necesitas estilos específicos
                blogs.forEach(blog => {
                    const li = document.createElement('li');
                    li.className = 'mi-blog-item'; // Clase para estilizar cada ítem
                    li.innerHTML = `
                        <div class="mi-blog-info">
                            <h3>${blog.Titulo}</h3>
                            <p>Sección: ${blog.Tipo_Blog}</p>
                            <small>Creado: ${new Date(blog.Fecha_Creacion).toLocaleDateString('es-ES')}
                                ${blog.Fecha_Update ? `| Actualizado: ${new Date(blog.Fecha_Update).toLocaleDateString('es-ES')}` : ''}
                            </small>
                        </div>
                        <div class="mi-blog-acciones">
                            <button class="btn-editar-mi-blog" onclick="abrirModalEditar(${blog.ID_Blog})">Editar</button>
                            <button class="btn-eliminar-mi-blog" onclick="confirmarEliminarMiBlog(${blog.ID_Blog}, '${blog.Titulo.replace(/'/g, "\\'")}')">Eliminar</button>
                        </div>
                    `;
                    ul.appendChild(li);
                });
                container.appendChild(ul);
            } catch (e) {
                console.error("Error cargando mis blogs:", e);
                if (loadingMsg) loadingMsg.style.display = 'none';
                container.innerHTML = `<p class="status-message error">Error al cargar tus blogs: ${e.message}</p>`;
            }
        }
        
        // --- EDICIÓN DE BLOGS ---
        async function popularTiposBlogParaEdicion() {
            const select = document.getElementById('editBlogTipo');
            if (!select) return;
            if (tiposDeBlogCache.length > 0) { // Usar caché si ya se cargaron
                tiposDeBlogCache.forEach(tipo => select.appendChild(new Option(tipo.Tipo_Blog, tipo.ID_TipoBlog)));
                return;
            }
            try {
                const response = await fetch('/api/tiposblog'); // Reutiliza la ruta
                if (!response.ok) throw new Error('No se pudieron cargar los tipos de blog para edición');
                tiposDeBlogCache = await response.json();
                tiposDeBlogCache.forEach(tipo => select.appendChild(new Option(tipo.Tipo_Blog, tipo.ID_TipoBlog)));
            } catch (e) { console.error(e); if(select) select.appendChild(new Option('Error al cargar secciones', ''));}
        }

        async function abrirModalEditar(idBlog) {
            const modal = document.getElementById('editBlogModal');
            if (!modal) return;
            
            await popularTiposBlogParaEdicion(); // Asegurar que el select esté poblado

            try {
                const response = await fetch(`/api/mi-blog/${idBlog}`);
                if(!response.ok) {
                    const errData = await response.json().catch(()=>({message: "Error desconocido"}));
                    throw new Error(errData.message || "No se pudo cargar el blog para editar.");
                }
                const blog = await response.json();

                document.getElementById('editBlogId').value = blog.ID_Blog;
                document.getElementById('editBlogTitulo').value = blog.Titulo;
                document.getElementById('editBlogTipo').value = blog.ID_TipoBlog;
                document.getElementById('editBlogContenido').value = blog.Contenido_Blog;
                
                modal.style.display = 'flex';
            } catch(e) {
                console.error("Error al abrir modal de edición:", e);
                mostrarCustomPopupGlobal(e.message, 'error');
            }
        }

        function cerrarEditModal() {
            const modal = document.getElementById('editBlogModal');
            if (modal) modal.style.display = 'none';
            document.getElementById('editBlogForm').reset(); // Limpiar el formulario
        }

        document.getElementById('editBlogForm')?.addEventListener('submit', async function(event) {
            event.preventDefault();
            const idBlog = document.getElementById('editBlogId').value;
            const titulo = document.getElementById('editBlogTitulo').value;
            const tipoBlog = document.getElementById('editBlogTipo').value;
            const contenido = document.getElementById('editBlogContenido').value;

            try {
                const response = await fetch(`/api/mi-blog/${idBlog}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titulo, contenido, tipoBlog })
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || "Error al guardar cambios.");
                }
                mostrarCustomPopupGlobal(result.message, 'success');
                cerrarEditModal();
                await cargarMisBlogs(); // Recargar la lista de blogs
            } catch (e) {
                console.error("Error guardando cambios del blog:", e);
                mostrarCustomPopupGlobal(e.message, 'error');
            }
        });

        // --- ELIMINACIÓN DE BLOGS ---
        function confirmarEliminarMiBlog(idBlog, tituloBlog) {
            if (confirm(`¿Estás seguro de que deseas eliminar tu blog "${tituloBlog}"?\nEsta acción no se puede deshacer.`)) {
                procesarEliminarMiBlog(idBlog);
            }
        }
        async function procesarEliminarMiBlog(idBlog) {
            try {
                const response = await fetch(`/api/mi-blog/${idBlog}`, { method: 'DELETE' });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.message || "Error al eliminar el blog.");
                mostrarCustomPopupGlobal(result.message, 'success');
                await cargarMisBlogs(); // Recargar la lista
            } catch (e) {
                console.error("Error procesando eliminación de mi blog:", e);
                mostrarCustomPopupGlobal(e.message, 'error');
            }
        }
        
        // --- POPUP PERSONALIZADO GLOBAL (o específico para esta página) ---
        function mostrarCustomPopupGlobal(mensaje, tipo = 'info') { // Renombrado para evitar colisión
            const popupOverlay = document.getElementById('customPopup');
            const popupMessage = document.getElementById('customPopupMessage');
            const popupContent = popupOverlay.querySelector('.custom-popup-content');
            const okButton = document.getElementById('customPopupOkButton');

            if (!popupOverlay || !popupMessage || !popupContent || !okButton) {
                console.warn("Elementos del popup de notificación no encontrados, usando alert."); 
                alert(mensaje); return;
            }
            popupMessage.textContent = mensaje;
            popupContent.className = 'custom-popup-content'; 
            if (tipo === 'success') popupContent.classList.add('success');
            else if (tipo === 'error') popupContent.classList.add('error');
            popupOverlay.style.display = 'flex';
            const newOkButton = okButton.cloneNode(true);
            okButton.parentNode.replaceChild(newOkButton, okButton);
            const closePopupHandler = () => {
                popupOverlay.style.display = 'none';
                document.removeEventListener('keydown', escapeHandlerMisBlogs);
            };
            const escapeHandlerMisBlogs = (e) => { if (e.key === 'Escape') closePopupHandler(); };
            newOkButton.onclick = closePopupHandler;
            document.addEventListener('keydown', escapeHandlerMisBlogs);
            newOkButton.focus();
        }

        // ----- INICIALIZACIÓN -----
        document.addEventListener('DOMContentLoaded', async () => {
          const user = await cargarUsuarioActualMisBlogs();
          if (user) { // Solo proceder si el usuario está cargado y es válido
              await popularTiposBlogParaEdicion(); // Cargar tipos de blog para el modal de edición
              await cargarMisBlogs(); // Carga inicial de los blogs del usuario
              
              const btnBuscar = document.getElementById('btnBuscarMisBlogs');
              if(btnBuscar) btnBuscar.addEventListener('click', cargarMisBlogs);

              const searchInput = document.getElementById('searchMisBlogsInput');
              if(searchInput) {
                  searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') cargarMisBlogs(); });
                  searchInput.addEventListener('input', () => { // Búsqueda dinámica mientras se escribe (opcional, puede ser pesado)
                      // Para búsqueda dinámica real, podrías filtrar el array 'misBlogs' ya cargado
                      // o añadir un debounce a esta llamada a cargarMisBlogs()
                      // Por ahora, cada 'input' podría llamar a la API, considera un botón "Buscar" si es mucho.
                      // O, si prefieres que solo el botón busque:
                      // searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') cargarMisBlogs(); });
                  });
              }
          }
        });