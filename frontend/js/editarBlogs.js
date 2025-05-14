// Verifica si el usuario está autenticado antes de continuar
const checkAuth = async () => {
    try {
      const res = await fetch('/api/usuario-actual', { credentials: 'include' });
      if (!res.ok) {
        window.location.href = '/login.html';
      }
    } catch (err) {
      console.error('Error de autenticación:', err);
      window.location.href = '/login.html';
    }
  };
  
  document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth(); // ⬅️ Asegura que haya sesión activa
  
    const params = new URLSearchParams(window.location.search);
    const blogId = params.get('id');
    if (!blogId) return alert('ID de blog no proporcionado');
  
    const tituloInput = document.getElementById('titulo');
    const contenidoTextarea = document.getElementById('contenido');
    const form = document.getElementById('editarForm');
  
    // Cargar datos del blog
    try {
      const response = await fetch(`/api/blogs/${blogId}`, { credentials: 'include' });
      const blog = await response.json();
  
      if (blog && blog.Titulo && blog.Contenido_Blog) {
        tituloInput.value = blog.Titulo;
        contenidoTextarea.value = blog.Contenido_Blog;
      } else {
        alert('No se pudo cargar el blog.');
      }
    } catch (error) {
      console.error('Error al cargar blog:', error);
      alert('Error al cargar el blog.');
    }
  
    // Guardar cambios
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const titulo = tituloInput.value.trim();
      const contenido = contenidoTextarea.value.trim();
  
      if (!titulo || !contenido) {
        return alert('Todos los campos son obligatorios');
      }
  
      try {
        const response = await fetch(`/api/blogs/${blogId}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ titulo, contenido })
        });
  
        const result = await response.json();
        if (result.success) {
          alert('Blog actualizado correctamente');
          window.location.href = 'misblogs.html';
        } else {
          alert('No se pudo actualizar el blog');
        }
      } catch (err) {
        console.error('Error al actualizar blog:', err);
        alert('Error de conexión');
      }
    });
  });