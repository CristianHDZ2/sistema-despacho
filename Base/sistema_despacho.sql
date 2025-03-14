CREATE DATABASE sistema_despacho;
USE sistema_despacho;

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    medida VARCHAR(50) NOT NULL,
    categoria_id INT NOT NULL,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

CREATE TABLE rutas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL
);

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    dui VARCHAR(10) NOT NULL UNIQUE,
    telefono VARCHAR(15),
    correo VARCHAR(100),
    direccion TEXT,
    foto VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL
);

CREATE TABLE despachos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATE NOT NULL,
    ruta_id INT NOT NULL,
    usuario_id INT NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente',
    FOREIGN KEY (ruta_id) REFERENCES rutas(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE detalles_despacho (
    id INT AUTO_INCREMENT PRIMARY KEY,
    despacho_id INT NOT NULL,
    producto_id INT NOT NULL,
    salida_manana INT NOT NULL DEFAULT 0,
    recarga_mediodia INT NOT NULL DEFAULT 0,
    retorno_tarde INT NOT NULL DEFAULT 0,
    total_vendido INT GENERATED ALWAYS AS ((salida_manana + recarga_mediodia) - retorno_tarde) STORED,
    valor_venta DECIMAL(10,2) GENERATED ALWAYS AS (total_vendido * (SELECT precio FROM productos WHERE id = producto_id)) STORED,
    FOREIGN KEY (despacho_id) REFERENCES despachos(id),
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Insertar categorías predeterminadas
INSERT INTO categorias (nombre) VALUES 
('PRODUCTOS GRUPO AJE'), 
('PRODUCTOS LA CONSTANCIA'), 
('PRODUCTOS VARIOS');

-- Insertar usuario administrador
INSERT INTO usuarios (nombre, dui, telefono, correo, direccion, password, rol) 
VALUES ('Administrador', '00000000-0', '00000000', 'admin@sistema.com', 'Dirección admin', '$2y$10$uIZ0sZG.jnbKk.WIwHsN3eWoH9r15x/CsEQx97uFooe9Et8Y3tJE.', 'admin');