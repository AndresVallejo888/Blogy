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
    CONSTRAINT fk_comentarios_blog FOREIGN KEY (ID_Blog) REFERENCES Blog(ID_Blog),
    CONSTRAINT fk_comentarios_usuario FOREIGN KEY (ID_Usuario) REFERENCES Usuarios(ID_Usuario)
);

CREATE TABLE Actividades (
    ID_Actividad INT AUTO_INCREMENT,
    ID_Usuario INT NOT NULL,
    Tipo_Accion VARCHAR(50) NOT NULL,       -- 'CREAR', 'EDITAR', 'ELIMINAR'
    Entidad_Afectada VARCHAR(50) NOT NULL,  -- 'BLOG', 'COMENTARIO'
    Fecha_Actividad DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ID_Actividad),
    FOREIGN KEY (ID_Usuario) REFERENCES Usuarios(ID_Usuario)
);

-- TRIGGER CREAR BLOG
DELIMITER //
CREATE TRIGGER after_insert_blog
AFTER INSERT ON Blog
FOR EACH ROW
BEGIN
    INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada)
    VALUES (NEW.ID_Usuario, 'CREAR', 'BLOG');
END;
//
DELIMITER ;

-- TRIGGER EDITAR BLOG
DELIMITER //
CREATE TRIGGER after_update_blog
AFTER UPDATE ON Blog
FOR EACH ROW
BEGIN
    INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada)
    VALUES (NEW.ID_Usuario, 'EDITAR', 'BLOG');
END;
//
DELIMITER ;

-- TRIGGER ELIMINAR BLOG
DELIMITER //
CREATE TRIGGER after_delete_blog
AFTER DELETE ON Blog
FOR EACH ROW
BEGIN
    INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada)
    VALUES (OLD.ID_Usuario, 'ELIMINAR', 'BLOG');
END;
//
DELIMITER ;

-- TRIGGER AGREGAR COMENTARIO
DELIMITER //
CREATE TRIGGER after_insert_comentario
AFTER INSERT ON Comentarios
FOR EACH ROW
BEGIN
    INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada)
    VALUES (NEW.ID_Usuario, 'CREAR', 'COMENTARIO');
END;
//
DELIMITER ;

-- TRIGGER ELIMINAR COMENTARIO
DELIMITER //
CREATE TRIGGER after_delete_comentario
AFTER DELETE ON Comentarios
FOR EACH ROW
BEGIN
    INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada)
    VALUES (OLD.ID_Usuario, 'ELIMINAR', 'COMENTARIO');
END;
//
DELIMITER ;

-- TRIGGER AGREGAR USUARIO
DELIMITER //
CREATE TRIGGER after_insert_usuario
AFTER INSERT ON Usuarios
FOR EACH ROW
BEGIN
    INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada)
    VALUES (NEW.ID_Usuario, 'REGISTRO', 'USUARIO');
END;
//
DELIMITER ;

-- TRIGGER PROMOVER USUARIO
DELIMITER //
CREATE TRIGGER after_promote_usuario
AFTER UPDATE ON Usuarios
FOR EACH ROW
BEGIN
    IF OLD.Es_Admin = FALSE AND NEW.Es_Admin = TRUE THEN
        INSERT INTO Actividades (ID_Usuario, Tipo_Accion, Entidad_Afectada)
        VALUES (NEW.ID_Usuario, 'PROMOVER', 'USUARIO');
    END IF;
END;
//
DELIMITER ;

-- PROCEDURE CREAR USUARIO
DELIMITER //
CREATE PROCEDURE RegistrarUsuario(
    IN p_nombre_usuario VARCHAR(100),
    IN p_apellido_usuario VARCHAR(100),
    IN p_correo_usuario VARCHAR(100),
    IN p_password_usuario VARCHAR(100)
)
BEGIN
    INSERT INTO Usuarios (Nombre_Usuario, Apellido_Usuario, Correo_Usuario, Password_Usuario)
    VALUES (p_nombre_usuario, p_apellido_usuario, p_correo_usuario, p_password_usuario);
END;
//
DELIMITER ;

-- PROCEDURE PROMOVER USUARIO
DELIMITER //
CREATE PROCEDURE PromoverUsuarioAAdmin(
    IN p_usuario_id INT
)
BEGIN
    UPDATE Usuarios
    SET Es_Admin = TRUE
    WHERE ID_Usuario = p_usuario_id;
END;
//
DELIMITER ;

-- PROCEDURE CREAR BLOG
DELIMITER //
CREATE PROCEDURE CrearBlog(
    IN p_id_tipo_blog INT,
    IN p_id_usuario INT,
    IN p_contenido_blog TEXT
)
BEGIN
    INSERT INTO Blog (ID_TipoBlog, ID_Usuario, Fecha_Creacion, Contenido_Blog)
    VALUES (p_id_tipo_blog, p_id_usuario, NOW(), p_contenido_blog);
END;
//
DELIMITER ;

-- PROCEDURE EDITAR BLOG
DELIMITER //
CREATE PROCEDURE ActualizarBlog(
    IN p_id_blog INT,
    IN p_contenido_blog TEXT
)
BEGIN
    UPDATE Blog
    SET Contenido_Blog = p_contenido_blog, Fecha_Update = NOW()
    WHERE ID_Blog = p_id_blog;
END;
//
DELIMITER ;

-- PROCEDURE ELIMINAR BLOG
DELIMITER //
CREATE PROCEDURE EliminarBlog(
    IN p_id_blog INT
)
BEGIN
    DELETE FROM Blog WHERE ID_Blog = p_id_blog;
END;
//
DELIMITER ;

-- PROCEDURE AGREGAR COMENTARIO
DELIMITER //
CREATE PROCEDURE CrearComentario(
    IN p_id_blog INT,
    IN p_id_usuario INT,
    IN p_contenido_comentario TEXT
)
BEGIN
    INSERT INTO Comentarios (ID_Blog, ID_Usuario, Fecha_Comentario, Contenido_Comentario)
    VALUES (p_id_blog, p_id_usuario, NOW(), p_contenido_comentario);
END;
//
DELIMITER ;

-- PROCEDURE ELIMINAR COMENTARIO
DELIMITER //
CREATE PROCEDURE EliminarComentario(
    IN p_id_comentario INT
)
BEGIN
    DELETE FROM Comentarios WHERE ID_Comentario = p_id_comentario;
END;
//
DELIMITER ;

