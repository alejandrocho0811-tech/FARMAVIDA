from flask import Flask, render_template, request, redirect, session, url_for
from database import conectar

app = Flask(__name__)
app.secret_key = "farmavida123"

def inicializar_bd():
    try:
        conexion = conectar()
        cursor = conexion.cursor()
        
        comandos = [
            """CREATE TABLE IF NOT EXISTS roles (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(50) NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS usuarios (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(100) NOT NULL,
                usuario VARCHAR(50) UNIQUE NOT NULL,
                contraseña VARCHAR(255) NOT NULL,
                id_rol INT,
                activo BOOLEAN DEFAULT 1,
                FOREIGN KEY (id_rol) REFERENCES roles(id)
            )""",
            """CREATE TABLE IF NOT EXISTS categorias (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(100) NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS proveedores (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(100) NOT NULL,
                telefono VARCHAR(20),
                direccion VARCHAR(150),
                activo BOOLEAN DEFAULT 1
            )""",
            """CREATE TABLE IF NOT EXISTS productos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(150) NOT NULL,
                id_categoria INT,
                precio_venta DECIMAL(10,2) NOT NULL,
                stock_minimo INT DEFAULT 5,
                activo BOOLEAN DEFAULT 1,
                FOREIGN KEY (id_categoria) REFERENCES categorias(id)
            )""",
            """CREATE TABLE IF NOT EXISTS clientes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(100) NOT NULL,
                cedula VARCHAR(20) UNIQUE NOT NULL,
                contacto VARCHAR(20),
                puntos INT DEFAULT 0,
                activo BOOLEAN DEFAULT 1
            )""",
            """CREATE TABLE IF NOT EXISTS lotes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                id_producto INT,
                cantidad INT NOT NULL,
                precio_compra DECIMAL(10,2) NOT NULL,
                fecha_entrada DATE NOT NULL,
                fecha_vencimiento DATE NOT NULL,
                FOREIGN KEY (id_producto) REFERENCES productos(id)
            )""",
            """CREATE TABLE IF NOT EXISTS consecutivos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                tipo VARCHAR(50) NOT NULL,
                ultimo_numero INT DEFAULT 0
            )""",
            """CREATE TABLE IF NOT EXISTS proveedor_productos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                id_proveedor INT,
                id_producto INT,
                FOREIGN KEY (id_proveedor) REFERENCES proveedores(id),
                FOREIGN KEY (id_producto) REFERENCES productos(id)
            )""",
            """CREATE TABLE IF NOT EXISTS compras (
                id INT PRIMARY KEY AUTO_INCREMENT,
                id_usuario INT,
                id_proveedor INT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
                total DECIMAL(10,2) NOT NULL,
                numero_orden INT,
                FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
                FOREIGN KEY (id_proveedor) REFERENCES proveedores(id)
            )""",
            """CREATE TABLE IF NOT EXISTS detalle_compras (
                id INT PRIMARY KEY AUTO_INCREMENT,
                id_compra INT,
                id_lote INT,
                cantidad INT NOT NULL,
                precio_unitario DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (id_compra) REFERENCES compras(id),
                FOREIGN KEY (id_lote) REFERENCES lotes(id)
            )""",
            """CREATE TABLE IF NOT EXISTS ventas (
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
            )""",
            """CREATE TABLE IF NOT EXISTS detalle_ventas (
                id INT PRIMARY KEY AUTO_INCREMENT,
                id_venta INT,
                id_lote INT,
                cantidad INT NOT NULL,
                precio_unitario DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (id_venta) REFERENCES ventas(id),
                FOREIGN KEY (id_lote) REFERENCES lotes(id)
            )"""
]    

        for comando in comandos:
            cursor.execute(comando)

        cursor.execute("INSERT IGNORE INTO roles (id, nombre) VALUES (1, 'Administrador'), (2, 'Empleado')")
        cursor.execute("INSERT IGNORE INTO consecutivos (tipo, ultimo_numero) VALUES ('ventas', 0), ('compras', 0)")
        cursor.execute("""
            INSERT IGNORE INTO usuarios (nombre, usuario, contraseña, id_rol, activo)
            VALUES ('Admin Principal', 'admin', '1234', 1, 1)
        """)

        conexion.commit()
        conexion.close()
        print("Base de datos inicializada correctamente")
    except Exception as e:
        print(f"Error al inicializar la base de datos: {e}")

inicializar_bd()

def _filtros_fecha():
    fecha_desde = request.args.get("fecha_desde", "")
    fecha_hasta = request.args.get("fecha_hasta", "")
    return fecha_desde, fecha_hasta

@app.route("/")
def index():
    if "usuario" not in session:
        return redirect(url_for("login"))
    return render_template("index.html", id_usuario=session.get("id_usuario"))

@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        usuario = request.form["usuario"]
        contraseña = request.form["contraseña"]
        
        conexion = conectar()
        cursor = conexion.cursor(dictionary=True, buffered =True)
        cursor.execute("""
        SELECT usuarios.*, roles.nombre AS nombre_rol 
        FROM usuarios 
        JOIN roles ON usuarios.id_rol = roles.id 
        WHERE usuarios.usuario = %s AND usuarios.contraseña = %s AND usuarios.activo = 1
        """, (usuario, contraseña))
        user = cursor.fetchone()
        conexion.close()
        
        if user:
            session["usuario"] = user["usuario"]
            session["rol"] = user["id_rol"]
            session["nombre_rol"] = user["nombre_rol"]
            session["id_usuario"] = user["id"]
            session["nombre"] = user["nombre"]
            return redirect(url_for("index"))
        else:
            error = "Usuario o contraseña incorrectos"
    
    return render_template("login.html", error=error)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

    # -------- PRODUCTOS --------

@app.route("/productos/listar")
def listar_productos():
    if "usuario" not in session:
        return redirect(url_for("login"))
    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("""
        SELECT productos.*, categorias.nombre AS categoria 
        FROM productos 
        LEFT JOIN categorias ON productos.id_categoria = categorias.id
        WHERE productos.activo = 1
    """)
    productos = cursor.fetchall()
    conexion.close()
    return {"productos": productos}

@app.route("/productos/agregar", methods=["POST"])
def agregar_producto():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("""
    INSERT INTO productos (nombre, id_categoria, precio_venta, stock_minimo)
    VALUES (%s, %s, %s, %s)
""", (data["nombre"], data["id_categoria"], data["precio_venta"], data["stock_minimo"]))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Producto agregado correctamente"}

@app.route("/productos/editar", methods=["POST"])
def editar_producto():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("""
    UPDATE productos SET nombre=%s, id_categoria=%s, 
    precio_venta=%s, stock_minimo=%s WHERE id=%s
""", (data["nombre"], data["id_categoria"], data["precio_venta"], data["stock_minimo"], data["id"]))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Producto actualizado correctamente"}

@app.route("/productos/desactivar", methods=["POST"])
def desactivar_producto():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("UPDATE productos SET activo=0 WHERE id=%s", (data["id"],))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Producto desactivado correctamente"}

@app.route("/categorias/listar")
def listar_categorias():
    if "usuario" not in session:
        return redirect(url_for("login"))
    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("SELECT * FROM categorias")
    categorias = cursor.fetchall()
    conexion.close()
    return {"categorias": categorias}

@app.route("/categorias/agregar", methods=["POST"])
def agregar_categoria():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("INSERT INTO categorias (nombre) VALUES (%s)", (data["nombre"],))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Categoria agregada correctamente"}

@app.route("/proveedores/listar")
def listar_proveedores():
    if "usuario" not in session:
        return redirect(url_for("login"))
    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("SELECT * FROM proveedores WHERE activo=1")
    proveedores = cursor.fetchall()
    conexion.close()
    return {"proveedores": proveedores}

    # -------- CLIENTES --------

@app.route("/clientes/listar")
def listar_clientes():
    if "usuario" not in session:
        return redirect(url_for("login"))
    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("SELECT * FROM clientes WHERE activo = 1")
    clientes = cursor.fetchall()
    conexion.close()
    return {"clientes": clientes}

@app.route("/clientes/agregar", methods=["POST"])
def agregar_cliente():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    try:
        cursor.execute("""
            INSERT INTO clientes (nombre, cedula, contacto, puntos)
            VALUES (%s, %s, %s, 0)
        """, (data["nombre"], data["cedula"], data["contacto"]))
        conexion.commit()
        conexion.close()
        return {"mensaje": "Cliente agregado correctamente", "ok": True}
    except:
        conexion.close()
        return {"mensaje": "La cédula ya está registrada", "ok": False}

@app.route("/clientes/editar", methods=["POST"])
def editar_cliente():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("""
        UPDATE clientes SET nombre=%s, contacto=%s WHERE id=%s
    """, (data["nombre"], data["contacto"], data["id"]))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Cliente actualizado correctamente"}

@app.route("/clientes/desactivar", methods=["POST"])
def desactivar_cliente():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("UPDATE clientes SET activo=0 WHERE id=%s", (data["id"],))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Cliente desactivado correctamente"}

@app.route("/clientes/buscar/<cedula>")
def buscar_cliente(cedula):
    if "usuario" not in session:
        return redirect(url_for("login"))
    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("SELECT * FROM clientes WHERE cedula = %s AND activo = 1", (cedula,))
    cliente = cursor.fetchone()
    conexion.close()
    if cliente:
        return {"cliente": cliente, "ok": True}
    return {"ok": False}

    # -------- PROVEEDORES --------

@app.route("/proveedores/agregar", methods=["POST"])
def agregar_proveedor():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("""
        INSERT INTO proveedores (nombre, telefono, direccion)
        VALUES (%s, %s, %s)
    """, (data["nombre"], data["telefono"], data["direccion"]))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Proveedor agregado correctamente", "ok": True}

@app.route("/proveedores/editar", methods=["POST"])
def editar_proveedor():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("""
        UPDATE proveedores SET nombre=%s, telefono=%s, direccion=%s WHERE id=%s
    """, (data["nombre"], data["telefono"], data["direccion"], data["id"]))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Proveedor actualizado correctamente"}

@app.route("/proveedores/desactivar", methods=["POST"])
def desactivar_proveedor():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("UPDATE proveedores SET activo=0 WHERE id=%s", (data["id"],))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Proveedor desactivado correctamente"}

# -------- COMPRAS --------

@app.route("/compras/listar")
def listar_compras():
    if "usuario" not in session:
        return redirect(url_for("login"))

    fecha_desde = request.args.get("fecha_desde", "")
    fecha_hasta = request.args.get("fecha_hasta", "")
    id_proveedor = request.args.get("id_proveedor", "")
    id_producto = request.args.get("id_producto", "")

    query = """
        SELECT DISTINCT compras.*, 
               proveedores.nombre AS proveedor,
               proveedores.telefono AS proveedor_telefono,
               proveedores.direccion AS proveedor_direccion,
               usuarios.nombre AS usuario
        FROM compras
        JOIN proveedores ON compras.id_proveedor = proveedores.id
        JOIN usuarios ON compras.id_usuario = usuarios.id
        LEFT JOIN detalle_compras ON detalle_compras.id_compra = compras.id
        LEFT JOIN lotes ON detalle_compras.id_lote = lotes.id
        WHERE 1=1
    """
    params = []

    if fecha_desde:
        query += " AND DATE(compras.fecha) >= %s"
        params.append(fecha_desde)
    if fecha_hasta:
        query += " AND DATE(compras.fecha) <= %s"
        params.append(fecha_hasta)
    if id_proveedor:
        query += " AND compras.id_proveedor = %s"
        params.append(id_proveedor)
    if id_producto:
        query += " AND lotes.id_producto = %s"
        params.append(id_producto)

    query += " ORDER BY compras.fecha DESC"

    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute(query, params)
    compras = cursor.fetchall()
    for c in compras:
        c["fecha"] = str(c["fecha"])
        cursor.execute("""
            SELECT productos.nombre, detalle_compras.cantidad, 
                   detalle_compras.precio_unitario, lotes.fecha_vencimiento,
                   lotes.id AS id_lote
            FROM detalle_compras
            JOIN lotes ON detalle_compras.id_lote = lotes.id
            JOIN productos ON lotes.id_producto = productos.id
            WHERE detalle_compras.id_compra = %s
        """, (c["id"],))
        items = cursor.fetchall()
        for item in items:
            item["fecha_vencimiento"] = str(item["fecha_vencimiento"])
        c["items"] = items
    conexion.close()
    return {"compras": compras}

@app.route("/compras/agregar", methods=["POST"])
def agregar_compra():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    try:
        cursor = conexion.cursor(dictionary=True, buffered=True)
        cursor.execute("UPDATE consecutivos SET ultimo_numero = ultimo_numero + 1 WHERE tipo = 'compras'")
        cursor.execute("SELECT ultimo_numero FROM consecutivos WHERE tipo = 'compras'")
        numero_orden = cursor.fetchone()["ultimo_numero"]

        cursor.execute("""
            INSERT INTO compras (id_usuario, id_proveedor, total, numero_orden)
            VALUES (%s, %s, %s, %s)
        """, (data["id_usuario"], data["id_proveedor"], data["total"], numero_orden))
        id_compra = cursor.lastrowid

        lotes_info = []
        for item in data["items"]:
            cursor.execute("""
                INSERT INTO lotes (id_producto, cantidad, precio_compra, fecha_entrada, fecha_vencimiento)
                VALUES (%s, %s, %s, CURDATE(), %s)
            """, (item["id_producto"], item["cantidad"], item["precio_compra"], item["fecha_vencimiento"]))
            id_lote = cursor.lastrowid
            cursor.execute("""
                INSERT INTO detalle_compras (id_compra, id_lote, cantidad, precio_unitario)
                VALUES (%s, %s, %s, %s)
            """, (id_compra, id_lote, item["cantidad"], item["precio_compra"]))
            lotes_info.append({
                "nombre": item["nombre_producto"],
                "cantidad": item["cantidad"],
                "precio_compra": item["precio_compra"],
                "fecha_vencimiento": item["fecha_vencimiento"],
                "subtotal": item["cantidad"] * item["precio_compra"]
            })

        cursor2 = conexion.cursor(dictionary=True, buffered=True)
        cursor2.execute("SELECT * FROM proveedores WHERE id = %s", (data["id_proveedor"],))
        proveedor = cursor2.fetchone()
        cursor2.close()
        cursor.close()

        conexion.commit()
        conexion.close()
        return {
            "ok": True,
            "numero_orden": numero_orden,
            "proveedor": proveedor,
            "items": lotes_info,
            "total": data["total"],
            "usuario": session["usuario"]
        }
    except Exception as e:
        conexion.close()
        return {"mensaje": str(e), "ok": False}

    # -------- PROVEEDOR PRODUCTOS --------

@app.route("/proveedor_productos/listar/<int:id_proveedor>")
def listar_proveedor_productos(id_proveedor):
    if "usuario" not in session:
        return redirect(url_for("login"))
    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("""
        SELECT productos.id, productos.nombre
        FROM proveedor_productos
        JOIN productos ON proveedor_productos.id_producto = productos.id
        WHERE proveedor_productos.id_proveedor = %s AND productos.activo = 1
    """, (id_proveedor,))
    productos = cursor.fetchall()
    conexion.close()
    return {"productos": productos}

@app.route("/proveedor_productos/agregar", methods=["POST"])
def agregar_proveedor_producto():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("""
        SELECT id FROM proveedor_productos 
        WHERE id_proveedor = %s AND id_producto = %s
    """, (data["id_proveedor"], data["id_producto"]))
    existe = cursor.fetchone()
    if existe:
        conexion.close()
        return {"mensaje": "Ese producto ya está asignado a este proveedor", "ok": False}
    cursor.execute("""
        INSERT INTO proveedor_productos (id_proveedor, id_producto)
        VALUES (%s, %s)
    """, (data["id_proveedor"], data["id_producto"]))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Producto asignado correctamente", "ok": True}

@app.route("/proveedor_productos/eliminar", methods=["POST"])
def eliminar_proveedor_producto():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("""
        DELETE FROM proveedor_productos 
        WHERE id_proveedor = %s AND id_producto = %s
    """, (data["id_proveedor"], data["id_producto"]))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Producto eliminado del proveedor correctamente"}
    # -------- INVENTARIO --------

@app.route("/inventario/listar")
def listar_inventario():
    if "usuario" not in session:
        return redirect(url_for("login"))
    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            productos.id,
            productos.nombre,
            categorias.nombre AS categoria,
            productos.stock_minimo,
            productos.precio_venta,
            COALESCE(SUM(lotes.cantidad), 0) - 
            COALESCE((
                SELECT SUM(detalle_ventas.cantidad) 
                FROM detalle_ventas 
                JOIN lotes l2 ON detalle_ventas.id_lote = l2.id 
                WHERE l2.id_producto = productos.id
            ), 0) AS stock_actual
        FROM productos
        LEFT JOIN categorias ON productos.id_categoria = categorias.id
        LEFT JOIN lotes ON lotes.id_producto = productos.id
        WHERE productos.activo = 1
        GROUP BY productos.id
    """)
    inventario = cursor.fetchall()
    conexion.close()
    return {"inventario": inventario}

@app.route("/inventario/lotes/<int:id_producto>")
def listar_lotes(id_producto):
    if "usuario" not in session:
        return redirect(url_for("login"))
    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            lotes.id,
            lotes.cantidad,
            lotes.precio_compra,
            lotes.fecha_entrada,
            lotes.fecha_vencimiento,
            COALESCE(SUM(detalle_ventas.cantidad), 0) AS cantidad_vendida,
            lotes.cantidad - COALESCE(SUM(detalle_ventas.cantidad), 0) AS cantidad_disponible
        FROM lotes
        LEFT JOIN detalle_ventas ON detalle_ventas.id_lote = lotes.id
        WHERE lotes.id_producto = %s
        GROUP BY lotes.id
        ORDER BY lotes.fecha_entrada ASC
    """, (id_producto,))
    lotes = cursor.fetchall()
    for l in lotes:
        l["fecha_entrada"] = str(l["fecha_entrada"])
        l["fecha_vencimiento"] = str(l["fecha_vencimiento"])
    conexion.close()
    return {"lotes": lotes}

@app.route("/inventario/alertas")
def alertas_inventario():
    if "usuario" not in session:
        return redirect(url_for("login"))
    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            productos.id,
            productos.nombre,
            productos.stock_minimo,
            COALESCE(SUM(lotes.cantidad), 0) - 
            COALESCE((
                SELECT SUM(detalle_ventas.cantidad) 
                FROM detalle_ventas 
                JOIN lotes l2 ON detalle_ventas.id_lote = l2.id 
                WHERE l2.id_producto = productos.id
            ), 0) AS stock_actual
        FROM productos
        LEFT JOIN lotes ON lotes.id_producto = productos.id
        WHERE productos.activo = 1
        GROUP BY productos.id
        HAVING stock_actual <= productos.stock_minimo
    """)
    bajo_stock = cursor.fetchall()
    cursor.execute("""
        SELECT 
            productos.nombre AS producto,
            lotes.fecha_vencimiento,
            lotes.cantidad - COALESCE(SUM(detalle_ventas.cantidad), 0) AS cantidad_disponible
        FROM lotes
        JOIN productos ON lotes.id_producto = productos.id
        LEFT JOIN detalle_ventas ON detalle_ventas.id_lote = lotes.id
        WHERE lotes.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND lotes.fecha_vencimiento >= CURDATE()
        AND productos.activo = 1
        GROUP BY lotes.id
        HAVING cantidad_disponible > 0
        ORDER BY lotes.fecha_vencimiento ASC
    """)
    proximos_vencer = cursor.fetchall()
    for p in proximos_vencer:
        p["fecha_vencimiento"] = str(p["fecha_vencimiento"])
    conexion.close()
    return {"bajo_stock": bajo_stock, "proximos_vencer": proximos_vencer}

# -------- VENTAS --------

@app.route("/ventas/listar")
def listar_ventas():
    if "usuario" not in session:
        return redirect(url_for("login"))
    
    fecha_desde = request.args.get("fecha_desde", "")
    fecha_hasta = request.args.get("fecha_hasta", "")
    id_cliente = request.args.get("id_cliente", "")
    id_producto = request.args.get("id_producto", "")

    query = """
        SELECT DISTINCT ventas.*, 
               ventas.puntos_antes,
               ventas.puntos_redimidos,
               ventas.puntos_ganados,
               clientes.nombre AS cliente,
               clientes.cedula AS cliente_cedula,
               clientes.contacto AS cliente_contacto,
               usuarios.nombre AS usuario
        FROM ventas
        JOIN clientes ON ventas.id_cliente = clientes.id
        JOIN usuarios ON ventas.id_usuario = usuarios.id
        LEFT JOIN detalle_ventas ON detalle_ventas.id_venta = ventas.id
        LEFT JOIN lotes ON detalle_ventas.id_lote = lotes.id
        WHERE 1=1
    """
    params = []

    if fecha_desde:
        query += " AND DATE(ventas.fecha) >= %s"
        params.append(fecha_desde)
    if fecha_hasta:
        query += " AND DATE(ventas.fecha) <= %s"
        params.append(fecha_hasta)
    if id_cliente:
        query += " AND ventas.id_cliente = %s"
        params.append(id_cliente)
    if id_producto:
        query += " AND lotes.id_producto = %s"
        params.append(id_producto)

    query += " ORDER BY ventas.fecha DESC"

    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute(query, params)
    ventas = cursor.fetchall()
    for v in ventas:
        v["fecha"] = str(v["fecha"])
        cursor.execute("""
            SELECT productos.nombre, detalle_ventas.cantidad, detalle_ventas.precio_unitario
            FROM detalle_ventas
            JOIN lotes ON detalle_ventas.id_lote = lotes.id
            JOIN productos ON lotes.id_producto = productos.id
            WHERE detalle_ventas.id_venta = %s
        """, (v["id"],))
        v["items"] = cursor.fetchall()
    conexion.close()
    return {"ventas": ventas}

@app.route("/ventas/agregar", methods=["POST"])
def agregar_venta():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    try:
        cursor = conexion.cursor(dictionary=True, buffered=True)
        cursor.execute("UPDATE consecutivos SET ultimo_numero = ultimo_numero + 1 WHERE tipo = 'ventas'")
        cursor.execute("SELECT ultimo_numero FROM consecutivos WHERE tipo = 'ventas'")
        numero_factura = cursor.fetchone()["ultimo_numero"]

        cursor.execute("SELECT puntos FROM clientes WHERE id = %s", (data["id_cliente"],))
        puntos_antes = cursor.fetchone()["puntos"]

        puntos_redimidos = int(data.get("puntos_redimidos", 0))
        if puntos_redimidos < 0:
            cursor.close()
            conexion.close()
            return {"ok": False, "mensaje": "Los puntos a redimir no pueden ser negativos."}

        if puntos_redimidos > puntos_antes:
            cursor.close()
            conexion.close()
            return {"ok": False, "mensaje": f"El cliente no tiene suficientes puntos. Disponibles: {puntos_antes}"}

        # Calcular subtotal para validar que no se rediman más puntos de los necesarios
        subtotal = sum(int(item["cantidad"]) * float(item["precio_unitario"]) for item in data["items"])
        puntos_necesarios = int(subtotal / 100)
        if subtotal % 100 != 0:
            puntos_necesarios += 1

        if puntos_redimidos > puntos_necesarios:
            cursor.close()
            conexion.close()
            return {"ok": False, "mensaje": f"No se pueden redimir más puntos de los necesarios para esta venta ({puntos_necesarios} pts)."}

        descuento = puntos_redimidos * 100
        total_calculado = max(0.0, subtotal - descuento)
        data["total"] = total_calculado
        puntos_ganados = int(total_calculado / 1000)

        for item in data["items"]:
            cursor2 = conexion.cursor(dictionary=True, buffered=True)
            cursor2.execute("""
                SELECT COALESCE(SUM(lotes.cantidad), 0) - 
                     COALESCE((
                        SELECT SUM(dv.cantidad) 
                        FROM detalle_ventas dv
                        JOIN lotes l2 ON dv.id_lote = l2.id 
                        WHERE l2.id_producto = %s
               ), 0) AS stock_actual
                FROM lotes
                WHERE lotes.id_producto = %s
            """, (item["id_producto"], item["id_producto"]))
            stock = cursor2.fetchone()["stock_actual"]
            cursor2.close()
            if stock < item["cantidad"]:
                cursor.close()
                conexion.close()
                return {
                    "ok": False,
                    "mensaje": f"Stock insuficiente para '{item['nombre_producto']}'. Disponible: {int(stock)} unidades."
                }

        cursor.execute("""
            INSERT INTO ventas (id_usuario, id_cliente, total, numero_factura, puntos_antes, puntos_redimidos, puntos_ganados)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (data["id_usuario"], data["id_cliente"], data["total"], numero_factura, puntos_antes, data.get("puntos_redimidos", 0), puntos_ganados))
        id_venta = cursor.lastrowid

        for item in data["items"]:
            cantidad_restante = item["cantidad"]
            cursor3 = conexion.cursor(dictionary=True, buffered=True)
            cursor3.execute("""
                SELECT lotes.id, 
                       lotes.cantidad - COALESCE(SUM(detalle_ventas.cantidad), 0) AS disponible
                FROM lotes
                LEFT JOIN detalle_ventas ON detalle_ventas.id_lote = lotes.id
                WHERE lotes.id_producto = %s
                GROUP BY lotes.id
                HAVING disponible > 0
                ORDER BY lotes.fecha_vencimiento ASC
            """, (item["id_producto"],))
            lotes = cursor3.fetchall()
            cursor3.close()

            for lote in lotes:
                if cantidad_restante <= 0:
                    break
                cantidad_a_tomar = min(cantidad_restante, lote["disponible"])
                cursor.execute("""
                    INSERT INTO detalle_ventas (id_venta, id_lote, cantidad, precio_unitario)
                    VALUES (%s, %s, %s, %s)
                """, (id_venta, lote["id"], cantidad_a_tomar, item["precio_unitario"]))
                cantidad_restante -= cantidad_a_tomar

        cursor.execute("UPDATE clientes SET puntos = puntos + %s WHERE id = %s", (puntos_ganados, data["id_cliente"]))

        if data.get("puntos_redimidos", 0) > 0:
            cursor.execute("UPDATE clientes SET puntos = puntos - %s WHERE id = %s", (data["puntos_redimidos"], data["id_cliente"]))

        cursor4 = conexion.cursor(dictionary=True, buffered=True)
        cursor4.execute("SELECT * FROM clientes WHERE id = %s", (data["id_cliente"],))
        cliente = cursor4.fetchone()
        cursor4.close()
        cursor.close()

        conexion.commit()
        conexion.close()
        return {
            "ok": True,
            "numero_factura": numero_factura,
            "puntos_ganados": puntos_ganados,
            "puntos_antes": puntos_antes,
            "cliente": cliente,
            "items": data["items"],
            "total": data["total"],
            "puntos_redimidos": data.get("puntos_redimidos", 0),
            "descuento": data.get("puntos_redimidos", 0) * 100,
            "usuario": session["usuario"]
        }
    except Exception as e:
        conexion.close()
        return {"mensaje": str(e), "ok": False}

@app.route("/ventas/modificar-cliente", methods=["POST"])
def modificar_cliente_venta():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    id_venta = data.get("id_venta")
    id_cliente_nuevo = data.get("id_cliente")
    
    conexion = conectar()
    try:
        cursor = conexion.cursor(dictionary=True, buffered=True)
        # 1. Obtener la venta actual
        cursor.execute("SELECT id_cliente, puntos_ganados, puntos_redimidos FROM ventas WHERE id = %s", (id_venta,))
        venta = cursor.fetchone()
        
        if not venta:
            cursor.close()
            conexion.close()
            return {"ok": False, "mensaje": "La venta no existe"}
            
        id_cliente_antiguo = venta["id_cliente"]
        puntos_ganados = venta["puntos_ganados"]
        puntos_redimidos = venta["puntos_redimidos"]
        
        if id_cliente_antiguo != id_cliente_nuevo:
            # 2. Revertir puntos del cliente antiguo
            cursor.execute("UPDATE clientes SET puntos = puntos - %s + %s WHERE id = %s", 
                           (puntos_ganados, puntos_redimidos, id_cliente_antiguo))
            
            # 3. Aplicar puntos al nuevo cliente (primero consultar sus puntos actuales)
            cursor.execute("SELECT puntos FROM clientes WHERE id = %s", (id_cliente_nuevo,))
            cliente_nuevo = cursor.fetchone()
            if not cliente_nuevo:
                cursor.close()
                conexion.close()
                return {"ok": False, "mensaje": "El nuevo cliente no existe"}
                
            puntos_antes_nuevo = cliente_nuevo["puntos"]
            
            # Validar si el nuevo cliente tiene suficientes puntos para la redención
            if puntos_antes_nuevo < puntos_redimidos:
                cursor.close()
                conexion.close()
                return {"ok": False, "mensaje": f"El nuevo cliente no tiene suficientes puntos para cubrir la redención de esta factura (Disponibles: {puntos_antes_nuevo})"}
            
            # Actualizar puntos del nuevo cliente
            cursor.execute("UPDATE clientes SET puntos = puntos + %s - %s WHERE id = %s",
                           (puntos_ganados, puntos_redimidos, id_cliente_nuevo))
            
            # 4. Actualizar la venta con el nuevo cliente y sus puntos_antes correspondientes
            cursor.execute("UPDATE ventas SET id_cliente = %s, puntos_antes = %s WHERE id = %s",
                           (id_cliente_nuevo, puntos_antes_nuevo, id_venta))
            
        conexion.commit()
        cursor.close()
        conexion.close()
        return {"ok": True, "mensaje": "Cliente y puntos actualizados correctamente"}
    except Exception as e:
        conexion.rollback()
        conexion.close()
        return {"ok": False, "mensaje": f"Error al modificar cliente: {str(e)}"}

@app.route("/compras/modificar", methods=["POST"])
def modificar_compra():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("UPDATE compras SET id_proveedor=%s WHERE id=%s", (data["id_proveedor"], data["id_compra"]))
    for lote in data["lotes"]:
        cursor.execute("UPDATE lotes SET fecha_vencimiento=%s WHERE id=%s", (lote["fecha_vencimiento"], lote["id_lote"]))
    conexion.commit()
    conexion.close()
    return {"ok": True, "mensaje": "Compra actualizada correctamente"}

    # -------- USUARIOS --------

@app.route("/usuarios/listar")
def listar_usuarios():
    if "usuario" not in session:
        return redirect(url_for("login"))
    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute("""
        SELECT usuarios.id, usuarios.nombre, usuarios.usuario, 
               usuarios.activo, roles.nombre AS rol
        FROM usuarios
        JOIN roles ON usuarios.id_rol = roles.id
    """)
    usuarios = cursor.fetchall()
    conexion.close()
    return {"usuarios": usuarios}

@app.route("/usuarios/agregar", methods=["POST"])
def agregar_usuario():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    try:
        cursor.execute("""
            INSERT INTO usuarios (nombre, usuario, contraseña, id_rol, activo)
            VALUES (%s, %s, %s, 2, 1)
        """, (data["nombre"], data["usuario"], data["contraseña"]))
        conexion.commit()
        conexion.close()
        return {"ok": True, "mensaje": "Usuario creado correctamente"}
    except:
        conexion.close()
        return {"ok": False, "mensaje": "El nombre de usuario ya existe"}

@app.route("/usuarios/editar", methods=["POST"])
def editar_usuario():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    if data.get("contraseña"):
        cursor.execute("""
            UPDATE usuarios SET nombre=%s, contraseña=%s WHERE id=%s
        """, (data["nombre"], data["contraseña"], data["id"]))
    else:
        cursor.execute("""
            UPDATE usuarios SET nombre=%s WHERE id=%s
        """, (data["nombre"], data["id"]))
    conexion.commit()
    conexion.close()
    return {"ok": True, "mensaje": "Usuario actualizado correctamente"}

@app.route("/usuarios/desactivar", methods=["POST"])
def desactivar_usuario():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    cursor.execute("UPDATE usuarios SET activo=0 WHERE id=%s", (data["id"],))
    conexion.commit()
    conexion.close()
    return {"ok": True, "mensaje": "Usuario desactivado correctamente"}

@app.route("/usuarios/perfil", methods=["POST"])
def actualizar_perfil():
    if "usuario" not in session:
        return redirect(url_for("login"))
    data = request.get_json()
    conexion = conectar()
    cursor = conexion.cursor()
    if data.get("contraseña"):
        cursor.execute("""
            UPDATE usuarios SET nombre=%s, usuario=%s, contraseña=%s WHERE id=%s
        """, (data["nombre"], data["usuario"], data["contraseña"], data["id"]))
    else:
        cursor.execute("""
            UPDATE usuarios SET nombre=%s, usuario=%s WHERE id=%s
        """, (data["nombre"], data["usuario"], data["id"]))
    conexion.commit()
    conexion.close()
    session["usuario"] = data["usuario"]
    session["nombre"] = data["nombre"]
    return {"ok": True, "mensaje": "Perfil actualizado correctamente"}

    # -------- INICIO --------

@app.route("/inicio/resumen")
def resumen_inicio():
    if "usuario" not in session:
        return redirect(url_for("login"))
    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)

    cursor.execute("SELECT COUNT(*) AS total FROM productos WHERE activo = 1")
    total_productos = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS monto
        FROM ventas
        WHERE DATE(fecha) = CURDATE()
    """)
    ventas_hoy = cursor.fetchone()

    cursor.execute("""
        SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS monto
        FROM compras
        WHERE DATE(fecha) = CURDATE()
    """)
    compras_hoy = cursor.fetchone()
    cursor.execute("""
    SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS monto
    FROM ventas
    WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
    """)
    ventas_mes = cursor.fetchone()

    cursor.execute("""
    SELECT COUNT(*) AS total, COALESCE(SUM(total), 0) AS monto
    FROM compras
    WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
    """)
    compras_mes = cursor.fetchone()

    cursor.execute("""
    SELECT ventas.id, ventas.total, ventas.fecha,
            ventas.numero_factura, 
            clientes.nombre AS cliente,
            usuarios.nombre AS usuario
    FROM ventas
    JOIN clientes ON ventas.id_cliente = clientes.id
    JOIN usuarios ON ventas.id_usuario = usuarios.id
    ORDER BY ventas.fecha DESC
    LIMIT 5
    """)
    ultimas_ventas = cursor.fetchall()
    for v in ultimas_ventas:
        v["fecha"] = str(v["fecha"])

    cursor.execute("""
    SELECT productos.nombre,
           SUM(detalle_ventas.cantidad) AS total_vendido
    FROM detalle_ventas
    JOIN lotes ON detalle_ventas.id_lote = lotes.id
    JOIN productos ON lotes.id_producto = productos.id
    GROUP BY productos.id
    ORDER BY total_vendido DESC
    LIMIT 5
    """)
    productos_mas_vendidos = cursor.fetchall()    

    cursor.execute("""
    SELECT DATE(fecha) AS dia, 
           COUNT(*) AS total_ventas,
           COALESCE(SUM(total), 0) AS monto
    FROM ventas
    WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    GROUP BY DATE(fecha)
    ORDER BY dia ASC
    """)
    ventas_semana = cursor.fetchall()
    for v in ventas_semana:
        v["dia"] = str(v["dia"])

    cursor.execute("SELECT COUNT(*) AS total FROM clientes WHERE activo = 1")
    total_clientes = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT productos.nombre, productos.stock_minimo,
               COALESCE(SUM(lotes.cantidad), 0) - 
               COALESCE((
                   SELECT SUM(dv.cantidad) 
                   FROM detalle_ventas dv
                   JOIN lotes l2 ON dv.id_lote = l2.id 
                   WHERE l2.id_producto = productos.id
               ), 0) AS stock_actual
        FROM productos
        LEFT JOIN lotes ON lotes.id_producto = productos.id
        WHERE productos.activo = 1
        GROUP BY productos.id
        HAVING stock_actual <= productos.stock_minimo
    """)
    bajo_stock = cursor.fetchall()

    cursor.execute("""
        SELECT productos.nombre AS producto,
               lotes.fecha_vencimiento,
               DATEDIFF(lotes.fecha_vencimiento, CURDATE()) AS dias_restantes,
               lotes.cantidad - COALESCE(SUM(detalle_ventas.cantidad), 0) AS cantidad_disponible
        FROM lotes
        JOIN productos ON lotes.id_producto = productos.id
        LEFT JOIN detalle_ventas ON detalle_ventas.id_lote = lotes.id
        WHERE lotes.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND lotes.fecha_vencimiento >= CURDATE()
        AND productos.activo = 1
        GROUP BY lotes.id
        HAVING cantidad_disponible > 0
        ORDER BY lotes.fecha_vencimiento ASC
    """)
    proximos_vencer = cursor.fetchall()
    for p in proximos_vencer:
        p["fecha_vencimiento"] = str(p["fecha_vencimiento"])

    conexion.close()
    return {
        "total_productos": total_productos,
        "total_clientes": total_clientes,
        "ventas_hoy": ventas_hoy,
        "compras_hoy": compras_hoy,
        "bajo_stock": bajo_stock,
        "proximos_vencer": proximos_vencer,
        "ventas_mes": ventas_mes,
        "compras_mes": compras_mes,
        "ultimas_ventas": ultimas_ventas,
        "productos_mas_vendidos": productos_mas_vendidos,
        "ventas_semana": ventas_semana
    }


# -------- REPORTES --------

@app.route("/reportes/ejecutivo")
def reporte_ejecutivo():
    if "usuario" not in session:
        return redirect(url_for("login"))

    fecha_desde, fecha_hasta = _filtros_fecha()
    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)

    where_ventas = " WHERE 1=1 "
    where_compras = " WHERE 1=1 "
    params_ventas = []
    params_compras = []

    if fecha_desde:
        where_ventas += " AND DATE(fecha) >= %s "
        where_compras += " AND DATE(fecha) >= %s "
        params_ventas.append(fecha_desde)
        params_compras.append(fecha_desde)
    if fecha_hasta:
        where_ventas += " AND DATE(fecha) <= %s "
        where_compras += " AND DATE(fecha) <= %s "
        params_ventas.append(fecha_hasta)
        params_compras.append(fecha_hasta)

    cursor.execute(
        f"SELECT COUNT(*) AS transacciones, COALESCE(SUM(total), 0) AS total_ventas FROM ventas {where_ventas}",
        params_ventas
    )
    ventas = cursor.fetchone()
    cursor.execute(
        f"SELECT COUNT(*) AS ordenes, COALESCE(SUM(total), 0) AS total_compras FROM compras {where_compras}",
        params_compras
    )
    compras = cursor.fetchone()

    ticket_promedio = 0
    if ventas["transacciones"] > 0:
        ticket_promedio = float(ventas["total_ventas"]) / int(ventas["transacciones"])

    cursor.execute("""
        SELECT
            SUM(l.cantidad * l.precio_compra) AS costo_inventario
        FROM lotes l
        LEFT JOIN (
            SELECT dv.id_lote, SUM(dv.cantidad) AS cantidad_vendida
            FROM detalle_ventas dv
            GROUP BY dv.id_lote
        ) v ON v.id_lote = l.id
        WHERE (l.cantidad - COALESCE(v.cantidad_vendida, 0)) > 0
    """)
    inventario = cursor.fetchone()
    costo_inventario = float(inventario["costo_inventario"] or 0)

    utilidad_estimada = float(ventas["total_ventas"] or 0) - float(compras["total_compras"] or 0)

    cursor.execute("""
        SELECT p.nombre, SUM(dv.cantidad) AS unidades
        FROM detalle_ventas dv
        JOIN lotes l ON dv.id_lote = l.id
        JOIN productos p ON l.id_producto = p.id
        JOIN ventas v ON dv.id_venta = v.id
        WHERE p.activo = 1
        GROUP BY p.id, p.nombre
        ORDER BY unidades DESC
        LIMIT 5
    """)
    top_productos = cursor.fetchall()

    cursor.execute("""
        SELECT c.nombre, COUNT(v.id) AS compras, COALESCE(SUM(v.total), 0) AS monto
        FROM ventas v
        JOIN clientes c ON v.id_cliente = c.id
        GROUP BY c.id, c.nombre
        ORDER BY monto DESC
        LIMIT 5
    """)
    top_clientes = cursor.fetchall()

    cursor.execute("""
        SELECT DATE(fecha) AS dia, COALESCE(SUM(total), 0) AS monto
        FROM ventas
        WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(fecha)
        ORDER BY dia ASC
    """)
    ventas_semana = cursor.fetchall()
    for fila in ventas_semana:
        fila["dia"] = str(fila["dia"])

    conexion.close()
    return {
        "filtros": {"fecha_desde": fecha_desde, "fecha_hasta": fecha_hasta},
        "kpis": {
            "ventas_total": float(ventas["total_ventas"] or 0),
            "compras_total": float(compras["total_compras"] or 0),
            "utilidad_estimada": utilidad_estimada,
            "ticket_promedio": ticket_promedio,
            "transacciones": int(ventas["transacciones"] or 0),
            "ordenes_compra": int(compras["ordenes"] or 0),
            "inventario_valorizado_costo": costo_inventario
        },
        "top_productos": top_productos,
        "top_clientes": top_clientes,
        "ventas_ultimos_7_dias": ventas_semana
    }


@app.route("/reportes/ventas")
def reporte_ventas():
    if "usuario" not in session:
        return redirect(url_for("login"))

    fecha_desde, fecha_hasta = _filtros_fecha()
    id_cliente = request.args.get("id_cliente", "")
    id_producto = request.args.get("id_producto", "")
    id_categoria = request.args.get("id_categoria", "")

    where = " WHERE 1=1 "
    params = []

    if fecha_desde:
        where += " AND DATE(v.fecha) >= %s "
        params.append(fecha_desde)
    if fecha_hasta:
        where += " AND DATE(v.fecha) <= %s "
        params.append(fecha_hasta)
    if id_cliente:
        where += " AND v.id_cliente = %s "
        params.append(id_cliente)
    if id_producto:
        where += " AND l.id_producto = %s "
        params.append(id_producto)
    if id_categoria:
        where += " AND p.id_categoria = %s "
        params.append(id_categoria)

    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)

    cursor.execute(f"""
        SELECT
            COUNT(DISTINCT v.id) AS total_facturas,
            COALESCE(SUM(v.total), 0) AS monto_total
        FROM ventas v
        LEFT JOIN detalle_ventas dv ON dv.id_venta = v.id
        LEFT JOIN lotes l ON dv.id_lote = l.id
        LEFT JOIN productos p ON l.id_producto = p.id
        {where}
    """, params)
    resumen = cursor.fetchone()
    total_facturas = int(resumen["total_facturas"] or 0)
    monto_total = float(resumen["monto_total"] or 0)
    ticket_promedio = (monto_total / total_facturas) if total_facturas else 0

    cursor.execute(f"""
        SELECT
            DATE(v.fecha) AS dia,
            COUNT(DISTINCT v.id) AS facturas,
            COALESCE(SUM(v.total), 0) AS monto
        FROM ventas v
        LEFT JOIN detalle_ventas dv ON dv.id_venta = v.id
        LEFT JOIN lotes l ON dv.id_lote = l.id
        LEFT JOIN productos p ON l.id_producto = p.id
        {where}
        GROUP BY DATE(v.fecha)
        ORDER BY dia ASC
    """, params)
    serie = cursor.fetchall()
    for fila in serie:
        fila["dia"] = str(fila["dia"])

    cursor.execute(f"""
        SELECT
            p.id,
            p.nombre,
            SUM(dv.cantidad) AS unidades,
            SUM(dv.cantidad * dv.precio_unitario) AS ingresos
        FROM ventas v
        JOIN detalle_ventas dv ON dv.id_venta = v.id
        JOIN lotes l ON dv.id_lote = l.id
        JOIN productos p ON l.id_producto = p.id
        {where}
        GROUP BY p.id, p.nombre
        ORDER BY ingresos DESC
        LIMIT 10
    """, params)
    top_productos = cursor.fetchall()

    cursor.execute(f"""
        SELECT DISTINCT
            v.id,
            v.numero_factura,
            v.fecha,
            c.nombre AS cliente,
            u.nombre AS vendedor,
            v.total
        FROM ventas v
        JOIN clientes c ON v.id_cliente = c.id
        JOIN usuarios u ON v.id_usuario = u.id
        LEFT JOIN detalle_ventas dv ON dv.id_venta = v.id
        LEFT JOIN lotes l ON dv.id_lote = l.id
        LEFT JOIN productos p ON l.id_producto = p.id
        {where}
        ORDER BY v.fecha DESC
        LIMIT 200
    """, params)
    detalle = cursor.fetchall()
    for fila in detalle:
        fila["fecha"] = str(fila["fecha"])

    conexion.close()
    return {
        "filtros": {
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta,
            "id_cliente": id_cliente,
            "id_producto": id_producto,
            "id_categoria": id_categoria
        },
        "kpis": {
            "total_facturas": total_facturas,
            "monto_total": monto_total,
            "ticket_promedio": ticket_promedio
        },
        "serie_diaria": serie,
        "top_productos": top_productos,
        "detalle_ventas": detalle
    }


@app.route("/reportes/inventario")
def reporte_inventario():
    if "usuario" not in session:
        return redirect(url_for("login"))

    id_categoria = request.args.get("id_categoria", "")
    id_proveedor = request.args.get("id_proveedor", "")
    solo_alertas = request.args.get("solo_alertas", "")

    where = " WHERE p.activo = 1 "
    params = []
    if id_categoria:
        where += " AND p.id_categoria = %s "
        params.append(id_categoria)
    if id_proveedor:
        where += """
            AND EXISTS (
                SELECT 1 FROM proveedor_productos pp
                WHERE pp.id_producto = p.id AND pp.id_proveedor = %s
            )
        """
        params.append(id_proveedor)

    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)

    cursor.execute(f"""
        SELECT
            p.id,
            p.nombre,
            c.nombre AS categoria,
            p.stock_minimo,
            p.precio_venta,
            COALESCE(SUM(l.cantidad), 0) - COALESCE((
                SELECT SUM(dv.cantidad)
                FROM detalle_ventas dv
                JOIN lotes l2 ON dv.id_lote = l2.id
                WHERE l2.id_producto = p.id
            ), 0) AS stock_actual,
            COALESCE((
                SELECT SUM(
                    (l3.cantidad - COALESCE(v3.vendido, 0)) * l3.precio_compra
                )
                FROM lotes l3
                LEFT JOIN (
                    SELECT id_lote, SUM(cantidad) AS vendido
                    FROM detalle_ventas
                    GROUP BY id_lote
                ) v3 ON v3.id_lote = l3.id
                WHERE l3.id_producto = p.id
                AND (l3.cantidad - COALESCE(v3.vendido, 0)) > 0
            ), 0) AS valor_inventario_costo
        FROM productos p
        LEFT JOIN categorias c ON p.id_categoria = c.id
        LEFT JOIN lotes l ON l.id_producto = p.id
        {where}
        GROUP BY p.id, p.nombre, c.nombre, p.stock_minimo, p.precio_venta
        ORDER BY p.nombre ASC
    """, params)
    inventario = cursor.fetchall()

    if solo_alertas == "1":
        inventario = [x for x in inventario if float(x["stock_actual"]) <= float(x["stock_minimo"])]

    cursor.execute("""
        SELECT
            p.id,
            p.nombre AS producto,
            l.fecha_vencimiento,
            DATEDIFF(l.fecha_vencimiento, CURDATE()) AS dias_restantes,
            (l.cantidad - COALESCE(SUM(dv.cantidad), 0)) AS cantidad_disponible
        FROM lotes l
        JOIN productos p ON l.id_producto = p.id
        LEFT JOIN detalle_ventas dv ON dv.id_lote = l.id
        WHERE p.activo = 1
        AND l.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND l.fecha_vencimiento >= CURDATE()
        GROUP BY l.id, p.id, p.nombre, l.fecha_vencimiento, l.cantidad
        HAVING cantidad_disponible > 0
        ORDER BY l.fecha_vencimiento ASC
    """)
    por_vencer = cursor.fetchall()
    for fila in por_vencer:
        fila["fecha_vencimiento"] = str(fila["fecha_vencimiento"])

    conexion.close()

    productos_bajo_minimo = len([x for x in inventario if float(x["stock_actual"]) <= float(x["stock_minimo"])])
    valor_total = sum(float(x["valor_inventario_costo"] or 0) for x in inventario)

    return {
        "filtros": {
            "id_categoria": id_categoria,
            "id_proveedor": id_proveedor,
            "solo_alertas": solo_alertas == "1"
        },
        "kpis": {
            "productos": len(inventario),
            "productos_bajo_minimo": productos_bajo_minimo,
            "valor_inventario_costo": valor_total,
            "productos_por_vencer_30d": len(por_vencer)
        },
        "inventario": inventario,
        "por_vencer": por_vencer
    }


@app.route("/reportes/rentabilidad")
def reporte_rentabilidad():
    if "usuario" not in session:
        return redirect(url_for("login"))

    fecha_desde, fecha_hasta = _filtros_fecha()
    id_categoria = request.args.get("id_categoria", "")
    id_producto = request.args.get("id_producto", "")

    where = " WHERE p.activo = 1 "
    params = []
    if fecha_desde:
        where += " AND DATE(v.fecha) >= %s "
        params.append(fecha_desde)
    if fecha_hasta:
        where += " AND DATE(v.fecha) <= %s "
        params.append(fecha_hasta)
    if id_categoria:
        where += " AND p.id_categoria = %s "
        params.append(id_categoria)
    if id_producto:
        where += " AND p.id = %s "
        params.append(id_producto)

    conexion = conectar()
    cursor = conexion.cursor(dictionary=True)
    cursor.execute(f"""
        SELECT
            p.id,
            p.nombre,
            c.nombre AS categoria,
            SUM(dv.cantidad) AS unidades_vendidas,
            SUM(dv.cantidad * dv.precio_unitario) AS ingresos,
            SUM(dv.cantidad * l.precio_compra) AS costo_estimado,
            SUM((dv.cantidad * dv.precio_unitario) - (dv.cantidad * l.precio_compra)) AS margen
        FROM detalle_ventas dv
        JOIN ventas v ON dv.id_venta = v.id
        JOIN lotes l ON dv.id_lote = l.id
        JOIN productos p ON l.id_producto = p.id
        LEFT JOIN categorias c ON p.id_categoria = c.id
        {where}
        GROUP BY p.id, p.nombre, c.nombre
        ORDER BY margen DESC
    """, params)
    detalle = cursor.fetchall()
    conexion.close()

    for fila in detalle:
        ingresos = float(fila["ingresos"] or 0)
        margen = float(fila["margen"] or 0)
        fila["margen_porcentaje"] = (margen / ingresos * 100) if ingresos else 0

    ingresos_total = sum(float(x["ingresos"] or 0) for x in detalle)
    costo_total = sum(float(x["costo_estimado"] or 0) for x in detalle)
    margen_total = sum(float(x["margen"] or 0) for x in detalle)
    margen_pct_total = (margen_total / ingresos_total * 100) if ingresos_total else 0

    return {
        "filtros": {
            "fecha_desde": fecha_desde,
            "fecha_hasta": fecha_hasta,
            "id_categoria": id_categoria,
            "id_producto": id_producto
        },
        "kpis": {
            "ingresos_total": ingresos_total,
            "costo_total": costo_total,
            "margen_total": margen_total,
            "margen_porcentaje_total": margen_pct_total
        },
        "detalle_productos": detalle,
        "top_margen": detalle[:10],
        "bajo_margen": sorted(detalle, key=lambda x: float(x["margen"]))[:10]
    }

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)