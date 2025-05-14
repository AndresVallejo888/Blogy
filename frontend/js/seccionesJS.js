// Constantes
let usuarioActual = null;
let blogSeleccionado = null;

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', async () => {
  await cargarUsuario();
  await cargarBlogs();
});

// Función para cargar los datos del usuario
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

// Función para cargar los blogs desde la BD
async function cargarBlogs() {
    try {
      const response = await fetch(`/api/blogs?tipo=${TIPO_BLOG}`);
      if (response.ok) {
        const blogs = await response.json();
        mostrarBlogs(blogs);
      }
    } catch (error) {
      console.error('Error al cargar blogs:', error);
    }
  }
  

// Función para mostrar los blogs en la página
  function mostrarBlogs(blogs) {
    const blogList = document.getElementById('blogList');
    blogList.innerHTML = '';

    if (blogs.length === 0) {
      blogList.innerHTML = '<p>No hay blogs aún. ¡Sé el primero en publicar!</p>';
      return;
    }

    blogs.forEach(blog => {
      const post = document.createElement('div');
      post.className = 'blog-post';
      post.dataset.blogId = blog.ID_Blog;
      
      // Formatear fecha
      const fechaCreacion = new Date(blog.Fecha_Creacion);
      const fechaFormateada = fechaCreacion.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      post.innerHTML = `
        <h2>${blog.Titulo || 'Blog sin título'}</h2>
        <div class="blog-meta">
          Publicado por <span class="blog-author">${blog.Nombre_Usuario} ${blog.Apellido_Usuario}</span>
          el <span class="blog-date">${fechaFormateada}</span>
        </div>
        <div class="blog-content">
          <p>${blog.Contenido_Blog}</p>
          <div class="comments-section">
            <h3>Comentarios</h3>
            <div class="comments-list" id="comments-${blog.ID_Blog}">
              <!-- Comentarios se cargan aquí -->
            </div>
            ${usuarioActual ? `
            <div class="comment-form">
              <input type="text" class="comment-input" id="comment-input-${blog.ID_Blog}" placeholder="Escribe un comentario...">
              <button class="comment-submit" onclick="event.stopPropagation(); prepararComentario(${blog.ID_Blog})">Enviar</button>
            </div>
            ` : '<p>Inicia sesión para comentar</p>'}
          </div>
        </div>
      `;
      
      blogList.appendChild(post);
      
      // Cargar comentarios para este blog
      cargarComentarios(blog.ID_Blog);
      
      // Agregar evento de clic para expandir/contraer
      post.addEventListener('click', function(e) {
        // Verificar si el clic fue en un elemento que debería ignorar el toggle
        const ignoreElements = ['INPUT', 'BUTTON', 'TEXTAREA'];
        let target = e.target;
        
        // Subir en el árbol DOM para verificar los padres
        while (target !== this) {
          if (ignoreElements.includes(target.tagName)) {
            return; // Salir si el clic fue en un elemento que debe ignorar el toggle
          }
          target = target.parentNode;
        }
        
        // Toggle de la clase expanded
        this.classList.toggle('expanded');
        
        // Si se está expandiendo, asegurarse de que los comentarios están cargados
        if (this.classList.contains('expanded')) {
          cargarComentarios(blog.ID_Blog);
        }
      });
      
      // Agregar evento específico al input de comentarios para prevenir el cierre
      const commentInput = post.querySelector('.comment-input');
      if (commentInput) {
        commentInput.addEventListener('click', function(e) {
          e.stopPropagation(); // Detener la propagación del evento
        });
      }
    });
  }

  // Función para enviar un comentario
  async function enviarComentario(blogId, contenido) {
    try {
      const response = await fetch('/api/comentarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blogId,
          contenido
        })
      });

      if (response.ok) {
        // Limpiar el input
        const commentInput = document.getElementById(`comment-input-${blogId}`);
        if (commentInput) commentInput.value = '';
        
        // Recargar comentarios
        await cargarComentarios(blogId);
      } else {
        const result = await response.json();
        alert(result.message || 'Error al publicar el comentario');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al conectar con el servidor');
    }
  }
    async function cargarComentarios(blogId) {
    try {
        const response = await fetch(`/api/comentarios?blog=${blogId}`);
        if (response.ok) {
        const comentarios = await response.json();
        mostrarComentarios(blogId, comentarios);
        }
    } catch (error) {
        console.error('Error al cargar comentarios:', error);
    }
    }

// Función para mostrar comentarios
function mostrarComentarios(blogId, comentarios) {
  const commentsContainer = document.getElementById(`comments-${blogId}`);
  if (!commentsContainer) return;
  
  commentsContainer.innerHTML = '';
  
  if (comentarios.length === 0) {
    commentsContainer.innerHTML = '<p>No hay comentarios aún. ¡Sé el primero en comentar!</p>';
    return;
  }
  
  comentarios.forEach(comentario => {
    const fechaComentario = new Date(comentario.Fecha_Comentario);
    const fechaFormateada = fechaComentario.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.innerHTML = `
      <div>
        <span class="comment-author">${comentario.Nombre_Usuario} ${comentario.Apellido_Usuario}</span>
        <span class="comment-date">${fechaFormateada}</span>
      </div>
      <div class="comment-content">${comentario.Contenido_Comentario}</div>
    `;
    
    commentsContainer.appendChild(commentDiv);
  });
}


// Preparar para enviar un comentario
function prepararComentario(blogId) {
  const commentInput = document.getElementById(`comment-input-${blogId}`);
  const contenido = commentInput.value.trim();
  
  if (!contenido) {
    alert('Por favor escribe un comentario');
    return;
  }
  
  enviarComentario(blogId, contenido);
}



async function filtrarBlogs() {
  const searchText = document.getElementById('searchInput').value.trim();
  
  if (!searchText) {
    await cargarBlogs();
    return;
  }

  try {
    const response = await fetch(`/api/blogs?tipo=${TIPO_BLOG}&search=${encodeURIComponent(searchText)}`);
    if (response.ok) {
      const blogs = await response.json();
      mostrarBlogs(blogs);
    }
  } catch (error) {
    console.error('Error al buscar blogs:', error);
  }
}

// Función para limpiar la búsqueda
async function limpiarBusqueda() {
  document.getElementById('searchInput').value = '';
  await cargarBlogs();
}

// Función para crear un nuevo blog
async function crearBlog() {
  const titulo = document.getElementById('blogTitulo').value.trim();
  const contenido = document.getElementById('blogContenido').value.trim();

  if (!titulo || !contenido) {
    alert('Por favor completa todos los campos');
    return;
  }

  try {
    const response = await fetch('/api/blogs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        titulo,
        contenido,
        tipoBlog: TIPO_BLOG
      })
    });

    const result = await response.json();

    if (response.ok) {
      cerrarPopup();
      document.getElementById('blogTitulo').value = '';
      document.getElementById('blogContenido').value = '';
      await cargarBlogs(); // Recargar la lista de blogs
    } else {
      alert(result.message || 'Error al crear el blog');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error al conectar con el servidor');
  }
}

// Funciones para mostrar/cerrar popups
function mostrarUserPopup() {
    document.getElementById('popupUser').style.display = 'flex';
  }
  
  function mostrarBlogPopup() {
    document.getElementById('popupBlog').style.display = 'flex';
  }
  
  function cerrarPopup() {
    document.querySelectorAll('.popup').forEach(p => p.style.display = 'none');
  }
