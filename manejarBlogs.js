let adminUser = null;
    let tiposDeBlog = [];
    let blogSeleccionadoId = null; // Para saber qué blog se está viendo/eliminando en el modal

    // ----- FUNCIONES DEL HEADER Y SESIÓN -----
    function toggleUserMenuAdmin() {
        const menu = document.getElementById("userDropdownMenuAdmin");
        if(menu) menu.classList.toggle("show");
    }

    async function cargarAdminUserActual() {
        try {
            const response = await fetch('/api/usuario-actual');
            if (!response.ok) { window.location.href = '/login-admin.html'; return; }
            adminUser = await response.json();
            if (!adminUser || !adminUser.isAdmin) { window.location.href = '/login-admin.html'; return; }
            
            const userNameEl = document.getElementById('adminUserNameDisplay');
            const userEmailEl = document.getElementById('adminUserEmailDisplay');
            if(userNameEl) userNameEl.textContent = `${adminUser.nombre} ${adminUser.apellido}`;
            if(userEmailEl) userEmailEl.textContent = adminUser.email;

        } catch (e) { console.error("Error cargando admin:", e); window.location.href = '/login-admin.html'; }
    }

    async function cerrarSesionAdminPage() {
        try { 
            await fetch('/logout'); 
            window.location.href = '/login-admin.html'; 
        } catch (e) { 
            console.error("Error cerrando sesión:", e); 
            mostrarCustomPopupManejar('Error al cerrar sesión', 'error'); 
        }
    }
    
    // ----- POPULADO DE FILTROS -----
    async function popularFiltrosManejarBlogs() {
        const selectTipo = document.getElementById('selectTipoBlogFiltro');
        if (!selectTipo) return;

        try {
            const resTipos = await fetch('/api/tiposblog'); 
            if (!resTipos.ok) throw new Error('Error cargando tipos de blog');
            tiposDeBlog = await resTipos.json();
            tiposDeBlog.forEach(tipo => {
                selectTipo.appendChild(new Option(tipo.Tipo_Blog, tipo.ID_TipoBlog));
            });
        } catch (e) { console.error(e); selectTipo.appendChild(new Option('Error al cargar secciones', ''));}
    }

    // ----- CARGA Y RENDERIZADO DE BLOGS -----
    async function cargarBlogsAdmin() {
        const container = document.getElementById('listaBlogsAdminContainer');
        const loadingMsg = document.getElementById('loadingBlogsAdminMessage');
        
        if (!container) { console.error("Contenedor de lista de blogs no encontrado"); return; }

        const tipoBlog = document.getElementById('selectTipoBlogFiltro')?.value || 'todos';
        const searchTerm = document.getElementById('searchBlogTituloInput')?.value.trim() || '';

        container.innerHTML = ''; 
        if(loadingMsg) loadingMsg.style.display = 'block';

        const params = new URLSearchParams();
        if (tipoBlog !== 'todos') params.append('idTipoBlog', tipoBlog);
        if (searchTerm) params.append('searchTerm', searchTerm);

        console.log("Enviando params para /api/admin/blogs:", params.toString());

        try {
            const response = await fetch(`/api/admin/blogs?${params.toString()}`);
            if (!response.ok) {
                const errData = await response.json().catch(()=>({message: "Error al obtener la lista de blogs."}));
                throw new Error(errData.message);
            }
            const blogs = await response.json();
            if(loadingMsg) loadingMsg.style.display = 'none';

            if (blogs.length === 0) {
                container.innerHTML = '<p class="status-message">No se encontraron blogs con los filtros aplicados.</p>';
                return;
            }
            const ul = document.createElement('ul');
            ul.className = 'lista-blogs-admin'; 
            blogs.forEach(blog => {
                const li = document.createElement('li');
                li.dataset.idBlog = blog.ID_Blog; // Para referencia futura si es necesario
                li.innerHTML = `
                    <div class="blog-info-admin">
                        <h3>${blog.Titulo}</h3>
                        <p>Autor: ${blog.Nombre_Usuario} ${blog.Apellido_Usuario} | Sección: ${blog.Tipo_Blog}</p>
                        <small>Publicado: ${new Date(blog.Fecha_Creacion).toLocaleDateString('es-ES', {day: '2-digit', month: 'long', year: 'numeric'})}</small>
                    </div>
                    <div class="blog-acciones-admin">
                        <button class="btn-ver-detalle" onclick="verDetalleBlog(${blog.ID_Blog})">Ver/Moderar</button>
                        <button class="btn-peligro" onclick="confirmarEliminarBlog(${blog.ID_Blog}, '${blog.Titulo.replace(/'/g, "\\'")}')">Eliminar Blog</button>
                    </div>
                `;
                ul.appendChild(li);
            });
            container.appendChild(ul);
        } catch (e) {
            console.error("Error en cargarBlogsAdmin:", e);
            if(loadingMsg) loadingMsg.style.display = 'none';
            container.innerHTML = `<p class="status-message error">Error al cargar blogs: ${e.message}</p>`;
        }
    }

    // ----- DETALLE DEL BLOG Y MANEJO DE COMENTARIOS -----
    async function verDetalleBlog(idBlog) {
        blogSeleccionadoId = idBlog;
        const modal = document.getElementById('blogDetalleModal');
        const tituloEl = document.getElementById('modalBlogTitulo');
        const autorEl = document.getElementById('modalBlogAutor');
        const seccionEl = document.getElementById('modalBlogSeccion');
        const contenidoEl = document.getElementById('modalBlogContenido');
        const comentariosListaEl = document.getElementById('modalBlogComentariosLista');
        const btnEliminarBlogModal = document.getElementById('btnEliminarBlogSeleccionado');

        if(!modal || !tituloEl || !autorEl || !seccionEl || !contenidoEl || !comentariosListaEl || !btnEliminarBlogModal) {
            console.error("Elementos del modal no encontrados."); return;
        }

        tituloEl.textContent = 'Cargando...';
        autorEl.textContent = '';
        seccionEl.textContent = '';
        contenidoEl.innerHTML = '<p class="status-message">Cargando contenido...</p>';
        comentariosListaEl.innerHTML = '<p class="status-message">Cargando comentarios...</p>';
        modal.style.display = 'flex';

        try {
            const response = await fetch(`/api/admin/blog/${idBlog}`);
            if (!response.ok) {
                 const errData = await response.json().catch(()=>({message: "Error desconocido del servidor"}));
                 throw new Error(errData.message || 'Error al cargar detalle del blog');
            }
            const blogData = await response.json();

            tituloEl.textContent = blogData.Titulo;
            autorEl.textContent = `${blogData.Nombre_Usuario} ${blogData.Apellido_Usuario}`;
            seccionEl.textContent = blogData.Tipo_Blog;
            contenidoEl.innerHTML = blogData.Contenido_Blog.replace(/\n/g, '<br>');

            btnEliminarBlogModal.onclick = () => confirmarEliminarBlog(blogData.ID_Blog, blogData.Titulo.replace(/'/g, "\\'"));

            if (blogData.comentarios && blogData.comentarios.length > 0) {
                comentariosListaEl.innerHTML = '';
                const ulComentarios = document.createElement('ul');
                ulComentarios.className = 'lista-comentarios-modal';
                blogData.comentarios.forEach(com => {
                    const liCom = document.createElement('li');
                    liCom.className = 'comentario-item-admin';
                    liCom.dataset.idComentario = com.ID_Comentario;
                    liCom.innerHTML = `
                        <div class="comentario-autor"><strong>${com.Nombre_Usuario} ${com.Apellido_Usuario}</strong> <small>(${new Date(com.Fecha_Comentario).toLocaleString('es-ES')})</small>:</div>
                        <p class="comentario-contenido">${com.Contenido_Comentario}</p>
                        <button class="btn-peligro-pequeno" onclick="confirmarEliminarComentario(${com.ID_Comentario}, ${idBlog})">Eliminar Comentario</button>
                    `;
                    ulComentarios.appendChild(liCom);
                });
                comentariosListaEl.appendChild(ulComentarios);
            } else {
                comentariosListaEl.innerHTML = '<p class="status-message">Este blog no tiene comentarios.</p>';
            }
        } catch (e) {
            console.error("Error en verDetalleBlog:", e);
            contenidoEl.innerHTML = `<p class="status-message error">Error al cargar el blog: ${e.message}</p>`;
            comentariosListaEl.innerHTML = '';
        }
    }

    function cerrarModalDetalleBlog() {
        const modal = document.getElementById('blogDetalleModal');
        if (modal) modal.style.display = 'none';
        blogSeleccionadoId = null;
    }

    // ----- ACCIONES DE ELIMINACIÓN -----
    function confirmarEliminarBlog(idBlog, tituloBlog) {
        if (confirm(`¿Estás SEGURO de que deseas eliminar el blog "${tituloBlog}" y todos sus comentarios?\n¡Esta acción no se puede deshacer!`)) {
            procesarEliminarBlog(idBlog);
        }
    }
    async function procesarEliminarBlog(idBlog) {
        try {
            const response = await fetch(`/api/admin/blogs/${idBlog}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Error eliminando blog');
            mostrarCustomPopupManejar(result.message, 'success');
            cerrarModalDetalleBlog();
            cargarBlogsAdmin(); // Recargar la lista principal de blogs
        } catch (e) {
            console.error("Error al procesar eliminar blog:", e);
            mostrarCustomPopupManejar(e.message, 'error');
        }
    }

    function confirmarEliminarComentario(idComentario, idBlogDelComentario) {
        if (confirm(`¿Estás seguro de que deseas eliminar este comentario?`)) {
            procesarEliminarComentario(idComentario, idBlogDelComentario);
        }
    }
    async function procesarEliminarComentario(idComentario, idBlogDelComentario) {
        try {
            const response = await fetch(`/api/admin/comentarios/${idComentario}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Error eliminando comentario');
            mostrarCustomPopupManejar(result.message, 'success');
            
            // Recargar los detalles del blog para actualizar la lista de comentarios
            if (document.getElementById('blogDetalleModal').style.display === 'flex' && blogSeleccionadoId === idBlogDelComentario) {
                 verDetalleBlog(idBlogDelComentario); // Recarga los detalles del blog actual en el modal
            }
        } catch (e) {
            console.error("Error al procesar eliminar comentario:", e);
            mostrarCustomPopupManejar(e.message, 'error');
        }
    }

    // ----- POPUP PERSONALIZADO -----
    function mostrarCustomPopupManejar(mensaje, tipo = 'info') {
        const popupOverlay = document.getElementById('customPopup');
        const popupMessage = document.getElementById('customPopupMessage');
        const popupContent = popupOverlay.querySelector('.custom-popup-content');
        const okButton = document.getElementById('customPopupOkButton');

        if (!popupOverlay || !popupMessage || !popupContent || !okButton) {
            console.error("Elementos del popup no encontrados en el DOM."); 
            alert(mensaje); // Fallback
            return;
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
            document.removeEventListener('keydown', escapeHandler);
        };
        
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closePopupHandler();
            }
        };

        newOkButton.onclick = closePopupHandler;
        document.addEventListener('keydown', escapeHandler);
        newOkButton.focus();
    }

    // ----- INICIALIZACIÓN -----
    document.addEventListener('DOMContentLoaded', async () => {
      await cargarAdminUserActual();
      if (adminUser && adminUser.isAdmin) {
          await popularFiltrosManejarBlogs();
          await cargarBlogsAdmin(); // Carga inicial
          
          const btnAplicarFiltros = document.getElementById('btnAplicarFiltrosBlogs');
          if(btnAplicarFiltros) btnAplicarFiltros.addEventListener('click', cargarBlogsAdmin);
          
          const searchInput = document.getElementById('searchBlogTituloInput');
          if (searchInput) {
            searchInput.addEventListener('input', () => { 
                // Considera añadir un debounce si la lista es muy grande y la API es lenta
                cargarBlogsAdmin();
            });
          }
          const selectTipo = document.getElementById('selectTipoBlogFiltro');
          if (selectTipo) {
              selectTipo.addEventListener('change', cargarBlogsAdmin);
          }
      }
    });