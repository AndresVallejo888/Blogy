document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch('/mis-blogs', { credentials: 'include' });
      const data = await response.json();
  
      if (data.success && data.blogs.length > 0) {
        const container = document.querySelector('.no-posts');
        container.remove(); // Quitar el mensaje "Aún no has publicado nada"
  
        const section = document.createElement('section');
        section.classList.add('blogs-list');
  
        data.blogs.forEach(blog => {
          const div = document.createElement('div');
          div.classList.add('blog-item');
          div.innerHTML = `
            <h3>${blog.Titulo}</h3>
            <p>${new Date(blog.Fecha_Creacion).toLocaleString()}</p>
            <button class="edit-btn" onclick="editarBlog(${blog.ID_Blog})">✏️ Editar</button>
            <button class="delete-btn" onclick="eliminarBlog(${blog.ID_Blog})">🗑️ Eliminar</button>
          `;
          section.appendChild(div);
        });

        window.eliminarBlog = async function(id) {
          if (!confirm("¿Estás seguro de que deseas eliminar este blog?")) return;
        
          try {
            const res = await fetch(`/api/blogs/${id}`, {
              method: 'DELETE',
              credentials: 'include'
            });
            const result = await res.json();
            if (result.success) {
              alert("Blog eliminado correctamente.");
              location.reload();
            } else {
              alert("No se pudo eliminar el blog.");
            }
          } catch (err) {
            console.error("Error al eliminar blog:", err);
          }
        };
        
        window.editarBlog = function(id) {
          // Redirige a una página de edición (por ejemplo: editar.html?id=3)
          window.location.href = `editarBlogs.html?id=${id}`;
        };
  
        document.body.appendChild(section);
      }
    } catch (error) {
      console.error('Error al cargar los blogs del usuario:', error);
    }
  });