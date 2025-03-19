-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS `sistema_despacho_distribuidora_morales` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `sistema_despacho`;

-- Tabla de categorías (dinámicas, gestionadas por el administrador)
CREATE TABLE IF NOT EXISTS `categorias` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insertar algunas categorías de ejemplo
INSERT INTO `categorias` (`nombre`) VALUES 
('Bebidas Carbonatadas'),
('Aguas'),
('Jugos'),
('Energizantes'),
('Cervezas');

-- Tabla de motoristas
CREATE TABLE IF NOT EXISTS `motoristas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `dui` VARCHAR(10) NOT NULL,
  `numero_licencia` VARCHAR(20) NOT NULL,
  `tipo_licencia` ENUM('liviana','pesada','particular') NOT NULL,
  `fecha_registro` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dui` (`dui`),
  UNIQUE KEY `numero_licencia` (`numero_licencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insertar motoristas iniciales
INSERT INTO `motoristas` (`nombre`, `dui`, `numero_licencia`, `tipo_licencia`) VALUES 
('Juan Carlos Pérez', '01234567-8', 'L123456', 'liviana'),
('Roberto Antonio Díaz', '87654321-0', 'L789123', 'pesada'),
('María Elena González', '45678912-3', 'L456789', 'particular');

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `dui` VARCHAR(10) NOT NULL,
  `telefono` VARCHAR(15) DEFAULT NULL,
  `correo` VARCHAR(100) DEFAULT NULL,
  `direccion` TEXT,
  `foto` LONGTEXT,
  `password` VARCHAR(255) NOT NULL,
  `rol` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dui` (`dui`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insertar usuario administrador
INSERT INTO `usuarios` (`nombre`, `dui`, `telefono`, `correo`, `direccion`, `password`, `rol`) 
VALUES ('Administrador', '00000000-0', '00000000', 'admin@sistema.com', 'Dirección admin', '$2y$10$uIZ0sZG.jnbKk.WIwHsN3eWoH9r15x/CsEQx97uFooe9Et8Y3tJE.', 'admin');

-- Tabla de rutas (incluye placa y motorista)
CREATE TABLE IF NOT EXISTS `rutas` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(100) NOT NULL,
  `tipo` VARCHAR(50) NOT NULL, -- Esto almacena: 'GRUPO AJE', 'LA CONSTANCIA', 'PRODUCTOS VARIOS'
  `placa_vehiculo` VARCHAR(10) NOT NULL,
  `motorista_id` INT DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `motorista_id` (`motorista_id`),
  CONSTRAINT `rutas_ibfk_1` FOREIGN KEY (`motorista_id`) REFERENCES `motoristas` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla de productos (incluye tanto categoría como grupo)
CREATE TABLE IF NOT EXISTS `productos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(200) NOT NULL,
  `precio` DECIMAL(10,2) NOT NULL,
  `medida` VARCHAR(50) NOT NULL,
  `categoria_id` INT NOT NULL,
  `grupo` VARCHAR(20) NOT NULL DEFAULT 'OTROS', -- Esto almacena: 'GRUPO AJE', 'LA CONSTANCIA', 'PRODUCTOS VARIOS'
  `unidades_paquete` INT NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `categoria_id` (`categoria_id`),
  CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla de despachos
CREATE TABLE IF NOT EXISTS `despachos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `fecha` DATE NOT NULL,
  `ruta_id` INT NOT NULL,
  `usuario_id` INT NOT NULL,
  `estado` VARCHAR(50) DEFAULT 'pendiente',
  PRIMARY KEY (`id`),
  KEY `ruta_id` (`ruta_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `despachos_ibfk_1` FOREIGN KEY (`ruta_id`) REFERENCES `rutas` (`id`),
  CONSTRAINT `despachos_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabla de detalles de despacho
CREATE TABLE IF NOT EXISTS `detalles_despacho` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `despacho_id` INT NOT NULL,
  `producto_id` INT NOT NULL,
  `salida_manana` INT NOT NULL DEFAULT '0',
  `recarga_mediodia` INT NOT NULL DEFAULT '0',
  `retorno_tarde` INT NOT NULL DEFAULT '0',
  `precio_unitario` DECIMAL(10,2) NOT NULL,
  `total_vendido` INT GENERATED ALWAYS AS (((`salida_manana` + `recarga_mediodia`) - `retorno_tarde`)) STORED,
  `valor_venta` DECIMAL(10,2) GENERATED ALWAYS AS ((`total_vendido` * `precio_unitario`)) STORED,
  PRIMARY KEY (`id`),
  KEY `despacho_id` (`despacho_id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `detalles_despacho_ibfk_1` FOREIGN KEY (`despacho_id`) REFERENCES `despachos` (`id`),
  CONSTRAINT `detalles_despacho_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;