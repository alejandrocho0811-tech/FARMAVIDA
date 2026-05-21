-- Crear base de datos (opcional si ya existe)
-- CREATE DATABASE IF NOT EXISTS farmavida;
-- USE farmavida;

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(50) NOT NULL
);

-- 2. Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    id_rol INT,
    activo BOOLEAN DEFAULT 1,
    FOREIGN KEY (id_rol) REFERENCES roles(id)
);

-- 3. Categorías
CREATE TABLE IF NOT EXISTS categorias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL
);

-- 4. Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    direccion VARCHAR(150),
    activo BOOLEAN DEFAULT 1
);

-- 5. Productos
CREATE TABLE IF NOT EXISTS productos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(150) NOT NULL,
    id_categoria INT,
    precio_venta DECIMAL(10,2) NOT NULL,
    stock_minimo INT DEFAULT 5,
    activo BOOLEAN DEFAULT 1,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id)
);

-- 6. Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    cedula VARCHAR(20) UNIQUE NOT NULL,
    contacto VARCHAR(20),
    puntos INT DEFAULT 0,
    activo BOOLEAN DEFAULT 1
);

-- 7. Lotes
CREATE TABLE IF NOT EXISTS lotes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_producto INT,
    cantidad INT NOT NULL,
    precio_compra DECIMAL(10,2) NOT NULL,
    fecha_entrada DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    FOREIGN KEY (id_producto) REFERENCES productos(id)
);

-- 8. Consecutivos
CREATE TABLE IF NOT EXISTS consecutivos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tipo VARCHAR(50) NOT NULL,
    ultimo_numero INT DEFAULT 0
);

-- 9. Proveedor Productos
CREATE TABLE IF NOT EXISTS proveedor_productos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_proveedor INT,
    id_producto INT,
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id),
    FOREIGN KEY (id_producto) REFERENCES productos(id)
);

-- 10. Compras
CREATE TABLE IF NOT EXISTS compras (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT,
    id_proveedor INT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL,
    numero_orden INT,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (id_proveedor) REFERENCES proveedores(id)
);

-- 11. Detalle Compras
CREATE TABLE IF NOT EXISTS detalle_compras (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_compra INT,
    id_lote INT,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_compra) REFERENCES compras(id),
    FOREIGN KEY (id_lote) REFERENCES lotes(id)
);

-- 12. Ventas
CREATE TABLE IF NOT EXISTS ventas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT,
    id_cliente INT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL,
    numero_factura INT,
    puntos_antes INT DEFAULT 0,
    puntos_redimidos INT DEFAULT 0,
    puntos_ganados INT DEFAULT 0,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id)
);

-- 13. Detalle Ventas
CREATE TABLE IF NOT EXISTS detalle_ventas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_venta INT,
    id_lote INT,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_venta) REFERENCES ventas(id),
    FOREIGN KEY (id_lote) REFERENCES lotes(id)
);

-- Datos iniciales obligatorios
INSERT IGNORE INTO roles (id, nombre) VALUES (1, 'Administrador'), (2, 'Empleado');
INSERT IGNORE INTO consecutivos (tipo, ultimo_numero) VALUES ('ventas', 0), ('compras', 0);
INSERT IGNORE INTO usuarios (nombre, usuario, contraseña, id_rol, activo) VALUES ('Admin Principal', 'admin', '1234', 1, 1);
