create database BLOGY;
USE BLOGY;

create table TipoBlog (
	ID_TipoBlog INT AUTO_INCREMENT,
    Tipo_Blog VARCHAR(100) not null,
    PRIMARY KEY (ID_TipoBlog)
);

INSERT INTO TipoBlog (Tipo_Blog) VALUES
('Lenguajes de Programación'),
('Desarrollo Web y Apps'),
('Ciberseguridad'),
('Desarrollo de Juegos'),
('Ciencia de Datos y Machine Learning'),
('DevOps y Gestión de Infraestructura');

create table Usuarios (
	ID_Usuario int auto_increment,
    Nombre_Usuario varchar (100) not null,
    Apellido_Usuario varchar (100) not null,
    Es_Admin boolean default false,
    Admin_Request boolean default false,
    Correo_Usuario varchar (100) unique not null,
    Password_Usuario varchar(100) not null,
    telefono varchar (50),
    PRIMARY KEY (ID_Usuario)
);

create table Blog (
	ID_Blog int auto_increment,
    ID_TipoBlog int not null,
    ID_Usuario int not null,
    Fecha_Creacion datetime not null,
    Fecha_Update datetime,
    Contenido_Blog text not null,
    PRIMARY KEY (ID_Blog),
    CONSTRAINT fk_blog_tipo FOREIGN KEY (ID_TipoBlog) REFERENCES TipoBlog(ID_TipoBlog),
    CONSTRAINT fk_blog_usuario FOREIGN KEY (ID_Usuario) REFERENCES Usuarios(ID_Usuario)
);

ALTER TABLE Blog ADD COLUMN Titulo VARCHAR(255) AFTER ID_Blog;
select * from blog;

create table Comentarios(
	ID_Comentario int auto_increment,
    ID_Blog int not null,
    ID_Usuario int not null,
    Fecha_Comentario datetime,
    Contenido_Comentario text not null,
    PRIMARY KEY (ID_Comentario),
    CONSTRAINT fk_comentarios_blog FOREIGN KEY (ID_Blog) REFERENCES Blog(ID_Blog) on delete cascade,
    CONSTRAINT fk_comentarios_usuario FOREIGN KEY (ID_Usuario) REFERENCES Usuarios(ID_Usuario)
);

DROP TABLE IF EXISTS Actividades; -- Borrar si ya existe para recrearla con cambios
CREATE TABLE Actividades (
    ID_Actividad INT AUTO_INCREMENT,
    ID_Usuario INT NOT NULL,             -- Quién realizó la acción
    Tipo_Accion VARCHAR(50) NOT NULL,    -- 'CREAR_BLOG', 'EDITAR_BLOG', 'ELIMINAR_BLOG', 'CREAR_COMENTARIO', 'ELIMINAR_COMENTARIO', 'REGISTRO_USUARIO', 'PROMOVER_USUARIO'
    Entidad_Afectada VARCHAR(50) NOT NULL, -- 'BLOG', 'COMENTARIO', 'USUARIO'
    ID_Entidad_Afectada INT NULL,        -- ID del blog, comentario o usuario afectado. Puede ser NULL si no aplica directamente (ej. un login fallido, si lo registraras)
    ID_TipoBlog_Afectado INT NULL,       -- Para acciones sobre BLOGS, registrar a qué TipoBlog pertenecía
    Detalles TEXT NULL,                  -- Campo opcional para detalles adicionales, como el título del blog o un resumen del comentario.
    Fecha_Actividad DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ID_Actividad),
    FOREIGN KEY (ID_Usuario) REFERENCES Usuarios(ID_Usuario),
    FOREIGN KEY (ID_TipoBlog_Afectado) REFERENCES TipoBlog(ID_TipoBlog) 
);

-- trigger crear blog
DELIMITER //
DROP TRIGGER IF EXISTS after_insert_blog; 
CREATE TRIGGER after_insert_blog
AFTER INSERT ON Blog
FOR EACH ROW
BEGIN
    INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada, ID_Entidad_Afectada, ID_TipoBlog_Afectado, Detalles)
    VALUES (NEW.ID_Usuario, 'CREAR_BLOG', 'BLOG', NEW.ID_Blog, NEW.ID_TipoBlog, CONCAT('Título: ', NEW.Titulo));
END;
//
DELIMITER ;

-- trigger actualizar blog
DELIMITER //
DROP TRIGGER IF EXISTS after_update_blog;
CREATE TRIGGER after_update_blog
AFTER UPDATE ON Blog
FOR EACH ROW
BEGIN
    -- Solo registrar si el contenido o el título realmente cambiaron, o el tipo de blog.
    IF OLD.Contenido_Blog <> NEW.Contenido_Blog OR OLD.Titulo <> NEW.Titulo OR OLD.ID_TipoBlog <> NEW.ID_TipoBlog THEN
        INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada, ID_Entidad_Afectada, ID_TipoBlog_Afectado, Detalles)
        VALUES (NEW.ID_Usuario, 'EDITAR_BLOG', 'BLOG', NEW.ID_Blog, NEW.ID_TipoBlog, CONCAT('Blog editado. Título: ', NEW.Titulo));
    END IF;
END;
//
DELIMITER ;


-- TRIGGER ELIMINAR BLOG
DELIMITER //
DROP TRIGGER IF EXISTS after_delete_blog;
CREATE TRIGGER after_delete_blog
AFTER DELETE ON Blog
FOR EACH ROW
BEGIN
    INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada, ID_Entidad_Afectada, ID_TipoBlog_Afectado, Detalles)
    VALUES (OLD.ID_Usuario, 'ELIMINAR_BLOG', 'BLOG', OLD.ID_Blog, OLD.ID_TipoBlog, CONCAT('Blog eliminado. Título: ', OLD.Titulo));
END;
//
DELIMITER ;

-- TRIGGER AGREGAR COMENTARIO
DELIMITER //
DROP TRIGGER IF EXISTS after_insert_comentario;
CREATE TRIGGER after_insert_comentario
AFTER INSERT ON Comentarios
FOR EACH ROW
BEGIN
    DECLARE v_ID_TipoBlog INT;
    DECLARE v_Titulo_Blog VARCHAR(255); -- Variable para guardar el título

    -- Obtener el ID_TipoBlog y el Título del blog al que pertenece el comentario
    SELECT ID_TipoBlog, Titulo INTO v_ID_TipoBlog, v_Titulo_Blog
    FROM Blog
    WHERE ID_Blog = NEW.ID_Blog;

    INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada, ID_Entidad_Afectada, ID_TipoBlog_Afectado, Detalles)
    VALUES (NEW.ID_Usuario, 'CREAR_COMENTARIO', 'COMENTARIO', NEW.ID_Comentario, v_ID_TipoBlog, CONCAT('Comentó en el blog: "', IFNULL(v_Titulo_Blog, 'Título no disponible'), '" (Blog ID: ', NEW.ID_Blog, ')'));
END;
//
DELIMITER ;

-- TRIGGER ELIMINAR COMENTARIO
DELIMITER //
DROP TRIGGER IF EXISTS after_delete_comentario;
CREATE TRIGGER after_delete_comentario
AFTER DELETE ON Comentarios
FOR EACH ROW
BEGIN
    DECLARE v_ID_TipoBlog INT;
    DECLARE v_Titulo_Blog VARCHAR(255);

    SELECT ID_TipoBlog, Titulo INTO v_ID_TipoBlog, v_Titulo_Blog
    FROM Blog
    WHERE ID_Blog = OLD.ID_Blog; -- Usar OLD.ID_Blog para obtener el blog del comentario eliminado

    INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada, ID_Entidad_Afectada, ID_TipoBlog_Afectado, Detalles)
    VALUES (OLD.ID_Usuario, 'ELIMINAR_COMENTARIO', 'COMENTARIO', OLD.ID_Comentario, v_ID_TipoBlog, CONCAT('Comentario eliminado del blog: "', IFNULL(v_Titulo_Blog, 'Título no disponible'), '" (Blog ID: ', OLD.ID_Blog, ')'));
END;
//
DELIMITER ;


-- TRIGGER registrar USUARIO
DELIMITER //
DROP TRIGGER IF EXISTS after_insert_usuario;
CREATE TRIGGER after_insert_usuario
AFTER INSERT ON Usuarios
FOR EACH ROW
BEGIN
    INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada, ID_Entidad_Afectada, Detalles)
    VALUES (NEW.ID_Usuario, 'REGISTRO_USUARIO', 'USUARIO', NEW.ID_Usuario, CONCAT('Nuevo usuario: ', NEW.Nombre_Usuario, ' ', NEW.Apellido_Usuario));
END;
//
DELIMITER ;

-- TRIGGER PROMOVER USUARIO
DELIMITER //
DROP TRIGGER IF EXISTS after_promote_usuario_to_admin; -- Nombre más específico
CREATE TRIGGER after_promote_usuario_to_admin
AFTER UPDATE ON Usuarios
FOR EACH ROW
BEGIN
    -- Se activa si Es_Admin cambia de FALSE a TRUE
    IF OLD.Es_Admin = FALSE AND NEW.Es_Admin = TRUE THEN
        INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada, ID_Entidad_Afectada, Detalles)
        VALUES (NEW.ID_Usuario, 'PROMOVER_A_ADMIN', 'USUARIO', NEW.ID_Usuario, CONCAT(NEW.Nombre_Usuario, ' ', NEW.Apellido_Usuario, ' promovido a admin.'));
    END IF;
END;
//
DELIMITER ;

-- triggrer para quienes solicitaron admin
DELIMITER //
DROP TRIGGER IF EXISTS after_admin_request;
CREATE TRIGGER after_admin_request
AFTER UPDATE ON Usuarios
FOR EACH ROW
BEGIN
    IF OLD.Admin_Request = FALSE AND NEW.Admin_Request = TRUE THEN
        INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada, ID_Entidad_Afectada, Detalles)
        VALUES (NEW.ID_Usuario, 'SOLICITUD_ADMIN', 'USUARIO', NEW.ID_Usuario, CONCAT(NEW.Nombre_Usuario, ' ', NEW.Apellido_Usuario, ' solicitó ser admin. Tel: ', NEW.telefono));
    END IF;
END;
//
DELIMITER ;

-- trigger para denegar solicitud
DELIMITER //
DROP TRIGGER IF EXISTS after_admin_request_denied;
CREATE TRIGGER after_admin_request_denied
AFTER UPDATE ON Usuarios
FOR EACH ROW
BEGIN
    IF OLD.Admin_Request = TRUE AND NEW.Admin_Request = FALSE AND NEW.Es_Admin = FALSE THEN
        INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada, ID_Entidad_Afectada, Detalles)
        -- Aquí ID_Usuario podría ser el admin que denegó, si lo capturas en la app,
        -- o el usuario cuya solicitud fue denegada.
        VALUES (NEW.ID_Usuario, 'DENEGAR_SOLICITUD_ADMIN', 'USUARIO', NEW.ID_Usuario, CONCAT('Solicitud de admin denegada para ', NEW.Nombre_Usuario, ' ', NEW.Apellido_Usuario));
    END IF;
END;
//
DELIMITER ;