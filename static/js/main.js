// =================== NAVEGACIÓN ===================
function formatearNumero(numero) {
    return parseFloat(numero).toLocaleString('es-CO');
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay-menu');
    sidebar.classList.toggle('abierto');
    overlay.classList.toggle('activo');
}

function mostrarModulo(modulo) {
    const modulos = document.querySelectorAll('.modulo');
    modulos.forEach(m => m.classList.remove('activo'));
    const target = document.getElementById(modulo);
    if (target) {
        target.classList.add('activo');
        if (modulo === 'inicio') cargarInicio();
        if (modulo === 'reportes') cargarReportes();
    }
    // Actualizar título en topbar
    const titulos = {
        inicio: 'Inicio', productos: 'Productos', inventario: 'Inventario',
        ventas: 'Ventas', compras: 'Compras', usuarios: 'Usuarios',
        clientes: 'Clientes', reportes: 'Reportes'
    };
    const topbarTitle = document.getElementById('topbar-title');
    if (topbarTitle) topbarTitle.textContent = titulos[modulo] || modulo;
    // Marcar ítem activo en sidebar
    document.querySelectorAll('#sidebar ul li').forEach(li => li.classList.remove('activo'));
    const liActivo = document.querySelector(`#sidebar ul li[data-modulo="${modulo}"]`);
    if (liActivo) liActivo.classList.add('activo');
    // Cerrar menú móvil si está abierto
    document.getElementById('sidebar')?.classList.remove('abierto');
    document.getElementById('overlay-menu')?.classList.remove('activo');
}

document.addEventListener('DOMContentLoaded', function() {
    inicializarTema();
    // Inicializar fecha en topbar
    const topbarDate = document.getElementById('topbar-date');
    if (topbarDate) {
        const ahora = new Date();
        topbarDate.textContent = ahora.toLocaleDateString('es-CO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
    mostrarModulo('inicio');
    cargarInventario();
    cargarProductosVenta();
    cargarClientes();

    if (document.getElementById('productos')) {
        cargarProductos();
        cargarCategorias();
        cargarProveedores();
        cargarProductosCompra();
    }

    if (document.getElementById('grafico-ventas')) {
        cargarInicio();
    }

    // Eventos de teclado para agilizar el registro
    const inputVentaCant = document.getElementById('venta-cantidad');
    if (inputVentaCant) {
        inputVentaCant.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                agregarItemVenta();
            }
        });
    }

    const inputCompraCant = document.getElementById('compra-cantidad');
    const inputCompraPrecio = document.getElementById('compra-precio');
    
    [inputCompraCant, inputCompraPrecio].forEach(input => {
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    agregarItemCompra();
                }
            });
        }
    });

    const inputVentaCedula = document.getElementById('venta-cedula');
    if (inputVentaCedula) {
        inputVentaCedula.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarClienteVenta();
            }
        });
    }

    const inputModificarCedula = document.getElementById('modificar-cedula-venta');
    if (inputModificarCedula) {
        inputModificarCedula.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarClienteModificar();
            }
        });
    }

    if (document.getElementById('usuarios')) {
        cargarUsuarios();
    }

    const selectProveedor = document.getElementById('compra-proveedor');
    if (selectProveedor) {
        selectProveedor.addEventListener('change', function() {
            const id_proveedor = this.value;
            const selectProducto = document.getElementById('compra-producto');
            selectProducto.innerHTML = '<option value="">Selecciona un producto</option>';
            if (!id_proveedor) return;
            fetch(`/proveedor_productos/listar/${id_proveedor}`)
                .then(res => res.json())
                .then(data => {
                    data.productos.forEach(p => {
                        selectProducto.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                    });
                });
        });
    }
});

function inicializarTema() {
    const temaGuardado = localStorage.getItem('farmavida_tema');
    // Modo oscuro por defecto; light-mode se activa solo si el usuario eligió claro
    if (temaGuardado === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
    document.body.classList.remove('dark-mode');
    actualizarTextoBotonTema();
}

function toggleDarkMode() {
    const esClaro = document.body.classList.toggle('light-mode');
    document.body.classList.remove('dark-mode');
    localStorage.setItem('farmavida_tema', esClaro ? 'light' : 'dark');
    actualizarTextoBotonTema();
}

function actualizarTextoBotonTema() {
    const btn = document.getElementById('btn-dark-mode');
    if (!btn) return;
    const esClaro = document.body.classList.contains('light-mode');
    btn.innerHTML = esClaro ? '<i class="ti ti-moon"></i>' : '<i class="ti ti-sun"></i>';
}

// =================== PRODUCTOS ===================

function cargarProductos() {
    fetch('/productos/listar')
        .then(res => res.json())
        .then(data => {
            const cuerpo = document.getElementById('cuerpo-productos');
            cuerpo.innerHTML = '';
            data.productos.forEach(p => {
                cuerpo.innerHTML += `
                    <tr>
                        <td>${p.nombre}</td>
                        <td>${p.categoria || 'Sin categoría'}</td>
                        <td>$${parseFloat(p.precio_venta).toLocaleString()}</td>
                        <td>${p.stock_minimo}</td>
                        <td>
                            <button class="btn-editar" onclick="editarProducto(${p.id}, '${p.nombre}', ${p.id_categoria}, ${p.id_proveedor}, ${p.precio_venta}, ${p.stock_minimo})">Editar</button>
                            <button class="btn-desactivar" onclick="desactivarProducto(${p.id})">Desactivar</button>
                        </td>
                    </tr>
                `;
            });
        });
}

function cargarCategorias() {
    fetch('/categorias/listar')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('producto-categoria');
            select.innerHTML = '<option value="">Selecciona una categoría</option>';
            data.categorias.forEach(c => {
                select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
            });
        });
}

function cargarProveedores() {
    fetch('/proveedores/listar')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('producto-proveedor');
            if (select) {
                select.innerHTML = '<option value="">Selecciona un proveedor</option>';
                data.proveedores.forEach(p => {
                    select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                });
            }
            const selectCompra = document.getElementById('compra-proveedor');
            if (selectCompra) {
                selectCompra.innerHTML = '<option value="">Selecciona un proveedor</option>';
                data.proveedores.forEach(p => {
                    selectCompra.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                });
            }
            const selectProductoProveedor = document.getElementById('select-producto-proveedor');
            if (selectProductoProveedor) {
                selectProductoProveedor.innerHTML = '<option value="">Selecciona un producto</option>';
                data.proveedores.forEach(p => {
                    selectProductoProveedor.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                });
            }
            const cuerpo = document.getElementById('cuerpo-proveedores');
            if (cuerpo) {
                cuerpo.innerHTML = '';
                data.proveedores.forEach(p => {
                    cuerpo.innerHTML += `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>${p.telefono || '-'}</td>
                            <td>${p.direccion || '-'}</td>
                            <td>
                                <button class="btn-editar" onclick="editarProveedor(${p.id}, '${p.nombre}', '${p.telefono}', '${p.direccion}')">Editar</button>
                                <button class="btn-editar" onclick="verProductosProveedor(${p.id}, '${p.nombre}')">Productos</button>
                                <button class="btn-desactivar" onclick="desactivarProveedor(${p.id})">Desactivar</button>
                            </td>
                        </tr>
                    `;
                });
            }
        });
}

let proveedorSeleccionado = null;

function verProductosProveedor(id, nombre) {
    proveedorSeleccionado = id;
    document.getElementById('titulo-productos-proveedor').textContent = `Productos de ${nombre}`;
    document.getElementById('panel-productos-proveedor').style.display = 'block';

    fetch('/productos/listar')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('select-producto-proveedor');
            select.innerHTML = '<option value="">Selecciona un producto</option>';
            data.productos.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
            });
        });

    cargarProductosDelProveedor(id);
}
function cargarProductosDelProveedor(id_proveedor) {
    fetch(`/proveedor_productos/listar/${id_proveedor}`)
        .then(res => res.json())
        .then(data => {
            const cuerpo = document.getElementById('cuerpo-productos-proveedor');
            cuerpo.innerHTML = '';
            data.productos.forEach(p => {
                cuerpo.innerHTML += `
                    <tr>
                        <td>${p.nombre}</td>
                        <td>
                            <button class="btn-desactivar" onclick="eliminarProductoProveedor(${p.id})">Quitar</button>
                        </td>
                    </tr>
                `;
            });
        });
}

function asignarProductoProveedor() {
    const id_producto = document.getElementById('select-producto-proveedor').value;
    if (!id_producto) {
        alert('Selecciona un producto.');
        return;
    }
    fetch('/proveedor_productos/agregar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_proveedor: proveedorSeleccionado, id_producto })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok === false) {
            alert(data.mensaje);
            return;
        }
        cargarProductosDelProveedor(proveedorSeleccionado);
    });
}

function eliminarProductoProveedor(id_producto) {
    if (!confirm('¿Quitar este producto del proveedor?')) return;
    fetch('/proveedor_productos/eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_proveedor: proveedorSeleccionado, id_producto })
    })
    .then(res => res.json())
    .then(() => cargarProductosDelProveedor(proveedorSeleccionado));
}

function cerrarPanelProductosProveedor() {
    document.getElementById('panel-productos-proveedor').style.display = 'none';
    proveedorSeleccionado = null;
}

function abrirFormProducto() {
    document.getElementById('titulo-form-producto').textContent = 'Agregar producto';
    document.getElementById('producto-id').value = '';
    document.getElementById('producto-nombre').value = '';
    document.getElementById('producto-categoria').value = '';
    document.getElementById('producto-precio').value = '';
    document.getElementById('producto-stock-minimo').value = '';
    document.getElementById('form-producto').style.display = 'block';
    
    // Desplazar suavemente hacia arriba
    const wrapper = document.querySelector('.modulos-wrapper');
    if (wrapper) {
        wrapper.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function cerrarFormProducto() {
    document.getElementById('form-producto').style.display = 'none';
}

function editarProducto(id, nombre, id_categoria, id_proveedor, precio_venta, stock_minimo) {
    document.getElementById('titulo-form-producto').textContent = 'Editar producto';
    document.getElementById('producto-id').value = id;
    document.getElementById('producto-nombre').value = nombre;
    document.getElementById('producto-categoria').value = id_categoria;
    document.getElementById('producto-precio').value = precio_venta;
    document.getElementById('producto-stock-minimo').value = stock_minimo;
    document.getElementById('form-producto').style.display = 'block';
    
    // Desplazar suavemente hacia arriba
    const wrapper = document.querySelector('.modulos-wrapper');
    if (wrapper) {
        wrapper.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function guardarProducto() {
    const id = document.getElementById('producto-id').value;
    const stockMinimoRaw = document.getElementById('producto-stock-minimo').value;
    const stockMinimo = parseInt(stockMinimoRaw, 10);

    const data = {
        id: id,
        nombre: document.getElementById('producto-nombre').value,
        id_categoria: document.getElementById('producto-categoria').value,
        precio_venta: parseFloat(document.getElementById('producto-precio').value),
        stock_minimo: isNaN(stockMinimo) ? 0 : stockMinimo
    };

    if (!data.nombre || !data.precio_venta) {
        alert('El nombre y el precio son obligatorios.');
        return;
    }

    if (data.stock_minimo < 0) {
        alert('El stock mínimo no puede ser negativo.');
        return;
    }

    const url = id ? '/productos/editar' : '/productos/agregar';

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(result => {
        if (result.ok === false) {
            alert(result.mensaje || 'Error al guardar el producto.');
            return;
        }
        cerrarFormProducto();
        cargarProductos();
    })
    .catch(() => {
        alert('Error de conexión al guardar el producto.');
    });
}

function desactivarProducto(id) {
    if (!confirm('¿Estás seguro de que quieres desactivar este producto?')) return;
    fetch('/productos/desactivar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    })
    .then(res => res.json())
    .then(() => cargarProductos());
}

function agregarCategoria() {
    const nombre = document.getElementById('nueva-categoria').value;
    if (!nombre) {
        alert('Escribe el nombre de la categoría.');
        return;
    }
    fetch('/categorias/agregar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre })
    })
    .then(res => res.json())
    .then(() => {
        document.getElementById('nueva-categoria').value = '';
        cargarCategorias();
    });
}

function filtrarProductos() {
    const texto = document.getElementById('buscador-productos').value.toLowerCase();
    const filas = document.querySelectorAll('#cuerpo-productos tr');
    filas.forEach(fila => {
        fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
    });
}
// =================== CLIENTES ===================

function cargarClientes() {
    fetch('/clientes/listar')
        .then(res => res.json())
        .then(data => {
            const cuerpo = document.getElementById('cuerpo-clientes');
            cuerpo.innerHTML = '';
            data.clientes.forEach(c => {
                cuerpo.innerHTML += `
                    <tr>
                        <td>${c.nombre}</td>
                        <td>${c.cedula}</td>
                        <td>${c.contacto}</td>
                        <td>${c.puntos} pts</td>
                        <td>
                            <button class="btn-editar" onclick="editarCliente(${c.id}, '${c.nombre}', '${c.contacto}')">Editar</button>
                            <button class="btn-desactivar" onclick="desactivarCliente(${c.id})">Desactivar</button>
                        </td>
                    </tr>
                `;
            });
        });
}

function abrirFormCliente() {
    document.getElementById('titulo-form-cliente').textContent = 'Agregar cliente';
    document.getElementById('cliente-id').value = '';
    document.getElementById('cliente-nombre').value = '';
    document.getElementById('cliente-cedula').value = '';
    document.getElementById('cliente-cedula').disabled = false;
    document.getElementById('cliente-contacto').value = '';
    document.getElementById('form-cliente').style.display = 'block';
}

function cerrarFormCliente() {
    document.getElementById('form-cliente').style.display = 'none';
}

function editarCliente(id, nombre, contacto) {
    document.getElementById('titulo-form-cliente').textContent = 'Editar cliente';
    document.getElementById('cliente-id').value = id;
    document.getElementById('cliente-nombre').value = nombre;
    document.getElementById('cliente-cedula').disabled = true;
    document.getElementById('cliente-contacto').value = contacto;
    document.getElementById('form-cliente').style.display = 'block';
}

function guardarCliente() {
    const id = document.getElementById('cliente-id').value;
    const data = {
        id: id,
        nombre: document.getElementById('cliente-nombre').value,
        cedula: document.getElementById('cliente-cedula').value,
        contacto: document.getElementById('cliente-contacto').value
    };

    if (!data.nombre) {
    alert('El nombre es obligatorio.');
    return;
    }
    if (!id && !data.cedula) {
    alert('La cédula es obligatoria.');
    return;
    }
    if (!id && data.cedula) {
    const cedula = data.cedula.toString();
    if (cedula.length < 8 || cedula.length > 10) {
        alert('La cédula debe tener entre 8 y 10 dígitos.');
        return;
        }
    }
    const url = id ? '/clientes/editar' : '/clientes/agregar';

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok === false) {
            alert(data.mensaje);
            return;
        }
        cerrarFormCliente();
        cargarClientes();
    });
}

function desactivarCliente(id) {
    if (!confirm('¿Estás seguro de que quieres desactivar este cliente?')) return;
    fetch('/clientes/desactivar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    })
    .then(res => res.json())
    .then(() => cargarClientes());
}

function filtrarClientes() {
    const texto = document.getElementById('buscador-clientes').value.toLowerCase();
    const filas = document.querySelectorAll('#cuerpo-clientes tr');
    filas.forEach(fila => {
        fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
    });
}
// =================== COMPRAS ===================

let itemsCompra = [];

function cambiarPestana(tabId, btn) {
    document.querySelectorAll('#compras .tab-contenido').forEach(t => t.style.display = 'none');
    document.querySelectorAll('#compras .pestana').forEach(p => p.classList.remove('activa'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('activa');
    if (tabId === 'tab-historial-compras') {
        cargarHistorialCompras();
        cargarFiltrosCompras();
    }
    if (tabId === 'tab-proveedores') cargarProveedores();
}


function agregarItemCompra() {
    const productoSelect = document.getElementById('compra-producto');
    const id_producto = productoSelect.value;
    const nombre_producto = productoSelect.options[productoSelect.selectedIndex].text;
    const cantidad = parseInt(document.getElementById('compra-cantidad').value);
    const precio_compra = parseFloat(document.getElementById('compra-precio').value);
    const fecha_vencimiento = document.getElementById('compra-vencimiento').value;

    if (!id_producto || !cantidad || !precio_compra || !fecha_vencimiento) {
        alert('Completa todos los campos del producto.');
        return;
    }

    itemsCompra.push({ id_producto, nombre_producto, cantidad, precio_compra, fecha_vencimiento });
    renderItemsCompra();

    document.getElementById('compra-producto').value = '';
    document.getElementById('compra-cantidad').value = '';
    document.getElementById('compra-precio').value = '';
    document.getElementById('compra-vencimiento').value = '';
}

function renderItemsCompra() {
    const cuerpo = document.getElementById('cuerpo-items-compra');
    cuerpo.innerHTML = '';
    let total = 0;
    itemsCompra.forEach((item, index) => {
        const subtotal = item.cantidad * item.precio_compra;
        total += subtotal;
        cuerpo.innerHTML += `
            <tr>
                <td>${item.nombre_producto}</td>
                <td>${item.cantidad}</td>
                <td>$${item.precio_compra.toLocaleString()}</td>
                <td>${item.fecha_vencimiento}</td>
                <td>$${subtotal.toLocaleString()}</td>
                <td><button class="btn-desactivar" onclick="quitarItemCompra(${index})">Quitar</button></td>
            </tr>
        `;
    });
    document.getElementById('total-compra').textContent = total.toLocaleString();
}

function quitarItemCompra(index) {
    itemsCompra.splice(index, 1);
    renderItemsCompra();
}

function guardarCompra() {
    const id_proveedor = document.getElementById('compra-proveedor').value;
    if (!id_proveedor) {
        alert('Selecciona un proveedor.');
        return;
    }
    if (itemsCompra.length === 0) {
        alert('Agrega al menos un producto.');
        return;
    }
    const total = itemsCompra.reduce((acc, item) => acc + item.cantidad * item.precio_compra, 0);
    const data = {
        id_proveedor,
        id_usuario: document.getElementById('session-id-usuario').value,
        total,
        items: itemsCompra
    };
    fetch('/compras/agregar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {
    if (data.ok) {
        mostrarFacturaCompra(data);
        limpiarCompra();
        cargarProductos();
        cargarInventario();
        cargarProductosVenta();
    } else {

        alert('Error: ' + data.mensaje);
    }
});
}

function limpiarCompra() {
    itemsCompra = [];
    renderItemsCompra();
    document.getElementById('compra-proveedor').value = '';
}

// =================== PROVEEDORES ===================

function cargarProveedores() {
    fetch('/proveedores/listar')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('producto-proveedor');
            if (select) {
                select.innerHTML = '<option value="">Selecciona un proveedor</option>';
                data.proveedores.forEach(p => {
                    select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                });
            }
            const selectCompra = document.getElementById('compra-proveedor');
            if (selectCompra) {
                selectCompra.innerHTML = '<option value="">Selecciona un proveedor</option>';
                data.proveedores.forEach(p => {
                    selectCompra.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                });
            }
            const cuerpo = document.getElementById('cuerpo-proveedores');
            if (cuerpo) {
                cuerpo.innerHTML = '';
                data.proveedores.forEach(p => {
                    cuerpo.innerHTML += `
                        <tr>
                            <td>${p.nombre}</td>
                            <td>${p.telefono || '-'}</td>
                            <td>${p.direccion || '-'}</td>
                            <td>
                                <button class="btn-editar" onclick="editarProveedor(${p.id}, '${p.nombre}', '${p.telefono}', '${p.direccion}')">Editar</button>
                                <button class="btn-editar" onclick="verProductosProveedor(${p.id}, '${p.nombre}')">Productos</button>
                                <button class="btn-desactivar" onclick="desactivarProveedor(${p.id})">Desactivar</button>
                            </td>
                        </tr>
                    `;
                });
            }
        });
}

function abrirFormProveedor() {
    document.getElementById('titulo-form-proveedor').textContent = 'Agregar proveedor';
    document.getElementById('proveedor-id').value = '';
    document.getElementById('proveedor-nombre').value = '';
    document.getElementById('proveedor-telefono').value = '';
    document.getElementById('proveedor-direccion').value = '';
    document.getElementById('form-proveedor').style.display = 'block';
}

function cerrarFormProveedor() {
    document.getElementById('form-proveedor').style.display = 'none';
}

function editarProveedor(id, nombre, telefono, direccion) {
    document.getElementById('titulo-form-proveedor').textContent = 'Editar proveedor';
    document.getElementById('proveedor-id').value = id;
    document.getElementById('proveedor-nombre').value = nombre;
    document.getElementById('proveedor-telefono').value = telefono;
    document.getElementById('proveedor-direccion').value = direccion;
    document.getElementById('form-proveedor').style.display = 'block';
}

function guardarProveedor() {
    const id = document.getElementById('proveedor-id').value;
    const data = {
        id,
        nombre: document.getElementById('proveedor-nombre').value,
        telefono: document.getElementById('proveedor-telefono').value,
        direccion: document.getElementById('proveedor-direccion').value
    };
    if (!data.nombre) {
        alert('El nombre del proveedor es obligatorio.');
        return;
    }
    const url = id ? '/proveedores/editar' : '/proveedores/agregar';
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(() => {
        cerrarFormProveedor();
        cargarProveedores();
    });
}

function desactivarProveedor(id) {
    if (!confirm('¿Estás seguro de que quieres desactivar este proveedor?')) return;
    fetch('/proveedores/desactivar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    })
    .then(res => res.json())
    .then(() => cargarProveedores());
}

function filtrarProveedores() {
    const texto = document.getElementById('buscador-proveedores').value.toLowerCase();
    const filas = document.querySelectorAll('#cuerpo-proveedores tr');
    filas.forEach(fila => {
        fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
    });
}
function cargarProductosCompra() {
    fetch('/productos/listar')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('compra-producto');
            if (select) {
                select.innerHTML = '<option value="">Selecciona un producto</option>';
                data.productos.forEach(p => {
                    select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                });
            }
        });
}
// =================== INVENTARIO ===================

function cargarInventario() {
    fetch('/inventario/listar')
        .then(res => res.json())
        .then(data => {
            const cuerpo = document.getElementById('cuerpo-inventario');
            cuerpo.innerHTML = '';
            data.inventario.forEach(p => {
                const stockBajo = p.stock_actual <= p.stock_minimo;
                cuerpo.innerHTML += `
                    <tr>
                        <td>${p.nombre}</td>
                        <td>${p.categoria || 'Sin categoría'}</td>
                        <td>$${parseFloat(p.precio_venta).toLocaleString()}</td>
                        <td>${p.stock_minimo}</td>
                        <td>${p.stock_actual}</td>
                        <td>${stockBajo 
                            ? '<span class="badge-bajo">Stock bajo</span>' 
                            : '<span class="badge-ok">OK</span>'}</td>
                        <td>
                            <button class="btn-ver-lotes" onclick="verLotes(${p.id}, '${p.nombre}')">Ver lotes</button>
                        </td>
                    </tr>
                `;
            });
        });
    cargarAlertas();
}

function cargarAlertas() {
    fetch('/inventario/alertas')
        .then(res => res.json())
        .then(data => {
            const contenedor = document.getElementById('alertas-inventario');
            contenedor.innerHTML = '';
            data.bajo_stock.forEach(p => {
                contenedor.innerHTML += `
                    <div class="alerta-danger">
                        Stock bajo: <strong>${p.nombre}</strong> — Stock actual: ${p.stock_actual} (mínimo: ${p.stock_minimo})
                    </div>
                `;
            });
            data.proximos_vencer.forEach(p => {
                contenedor.innerHTML += `
                    <div class="alerta-warning">
                        Próximo a vencer: <strong>${p.producto}</strong> — Vence el ${p.fecha_vencimiento} (disponible: ${p.cantidad_disponible} unidades)
                    </div>
                `;
            });
        });
}

function verLotes(id_producto, nombre) {
    fetch(`/inventario/lotes/${id_producto}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('titulo-lotes').textContent = `Lotes de: ${nombre}`;
            document.getElementById('titulo-lotes').style.display = 'block';
            document.getElementById('lotes-placeholder').style.display = 'none';
            document.getElementById('tabla-lotes').style.display = 'table';

            const cuerpo = document.getElementById('cuerpo-lotes');
            cuerpo.innerHTML = '';
            data.lotes.forEach((l, index) => {
                const agotado = l.cantidad_disponible <= 0;
                const vencePronto = new Date(l.fecha_vencimiento) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                cuerpo.innerHTML += `
                    <tr class="${agotado ? 'lote-agotado' : vencePronto ? 'lote-vence-pronto' : ''}">
                        <td>Lote ${index + 1}</td>
                        <td>${l.fecha_entrada}</td>
                        <td>${l.fecha_vencimiento}</td>
                        <td>${l.cantidad}</td>
                        <td>${l.cantidad_vendida}</td>
                        <td>${l.cantidad_disponible}</td>
                        <td>$${parseFloat(l.precio_compra).toLocaleString()}</td>
                    </tr>
                `;
            });

            cambiarPestanaInventario('tab-lotes', document.querySelectorAll('.pestana')[1]);
        });
}

function cambiarPestanaInventario(tabId, btn) {
    document.querySelectorAll('#inventario .tab-contenido').forEach(t => t.style.display = 'none');
    document.querySelectorAll('#inventario .pestana').forEach(p => p.classList.remove('activa'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('activa');
}

function filtrarInventario() {
    const texto = document.getElementById('buscador-inventario').value.toLowerCase();
    const filas = document.querySelectorAll('#cuerpo-inventario tr');
    filas.forEach(fila => {
        fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
    });
}
// =================== VENTAS ===================

let itemsVenta = [];

function cambiarPestanaVentas(tabId, btn) {
    document.querySelectorAll('#ventas .tab-contenido').forEach(t => t.style.display = 'none');
    document.querySelectorAll('#ventas .pestana').forEach(p => p.classList.remove('activa'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('activa');
    if (tabId === 'tab-historial-ventas') {
        cargarHistorialVentas();
        cargarFiltrosVentas();
    }
}

function cargarProductosVenta() {
    fetch('/productos/listar')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('venta-producto');
            if (select) {
                select.innerHTML = '<option value="">Selecciona un producto</option>';
                data.productos.forEach(p => {
                    select.innerHTML += `<option value="${p.id}" data-precio="${p.precio_venta}">${p.nombre}</option>`;
                });
            }
        });
}

function buscarClienteVenta() {
    const cedula = document.getElementById('venta-cedula').value;
    if (!cedula) {
        alert('Ingresa una cédula.');
        return;
    }
    fetch(`/clientes/buscar/${cedula}`)
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                document.getElementById('venta-id-cliente').value = data.cliente.id;
                document.getElementById('venta-puntos-disponibles').value = data.cliente.puntos;
                document.getElementById('venta-cliente-nombre').textContent = data.cliente.nombre;
                document.getElementById('venta-cliente-puntos').textContent = `Puntos disponibles: ${data.cliente.puntos}`;
                document.getElementById('info-cliente-venta').style.display = 'block';
                calcularTotalVenta();
            } else {
                alert('Cliente no encontrado. Regístralo primero en el módulo de clientes.');
                document.getElementById('info-cliente-venta').style.display = 'none';
                document.getElementById('venta-id-cliente').value = '';
                document.getElementById('venta-puntos-disponibles').value = '0';
                calcularTotalVenta();
            }
        });
}

function agregarItemVenta() {
    const productoSelect = document.getElementById('venta-producto');
    const id_producto = productoSelect.value;
    const nombre_producto = productoSelect.options[productoSelect.selectedIndex].text;
    const precio_unitario = parseFloat(productoSelect.options[productoSelect.selectedIndex].dataset.precio);
    const cantidad = parseInt(document.getElementById('venta-cantidad').value);

    if (!id_producto || !cantidad || cantidad <= 0) {
        alert('Selecciona un producto e ingresa una cantidad válida.');
        return;
    }

    const existente = itemsVenta.find(i => i.id_producto === id_producto);
    if (existente) {
        existente.cantidad += cantidad;
    } else {
        itemsVenta.push({ id_producto, nombre_producto, cantidad, precio_unitario });
    }

    renderItemsVenta();
    document.getElementById('venta-producto').value = '';
    document.getElementById('venta-cantidad').value = '';
}

function renderItemsVenta() {
    const cuerpo = document.getElementById('cuerpo-items-venta');
    cuerpo.innerHTML = '';
    let subtotal = 0;
    itemsVenta.forEach((item, index) => {
        const sub = item.cantidad * item.precio_unitario;
        subtotal += sub;
        cuerpo.innerHTML += `
            <tr>
                <td>${item.nombre_producto}</td>
                <td>${item.cantidad}</td>
                <td>$${item.precio_unitario.toLocaleString()}</td>
                <td>$${sub.toLocaleString()}</td>
                <td><button class="btn-desactivar" onclick="quitarItemVenta(${index})">Quitar</button></td>
            </tr>
        `;
    });
    document.getElementById('subtotal-venta').textContent = subtotal.toLocaleString();
    calcularTotalVenta();
}

function calcularTotalVenta() {
    const subtotal = itemsVenta.reduce((acc, item) => acc + item.cantidad * item.precio_unitario, 0);
    const puntosInput = document.getElementById('puntos-redimir');
    const warningSpan = document.getElementById('puntos-warning');
    
    let puntosRedimir = parseInt(puntosInput.value) || 0;
    const puntosDisponibles = parseInt(document.getElementById('venta-puntos-disponibles').value) || 0;
    const puntosNecesarios = Math.ceil(subtotal / 10);

    let errorMsg = '';
    let puntosEfectivos = puntosRedimir;

    if (puntosInput.value !== '') {
        if (puntosRedimir < 0) {
            errorMsg = 'Los puntos no pueden ser negativos.';
            puntosEfectivos = 0;
        } else if (puntosRedimir > puntosDisponibles) {
            errorMsg = `Solo tienes ${puntosDisponibles} puntos disponibles.`;
            puntosEfectivos = puntosDisponibles;
        } else if (puntosRedimir > puntosNecesarios) {
            errorMsg = `Solo necesitas redimir un máximo de ${puntosNecesarios} puntos.`;
            puntosEfectivos = puntosNecesarios;
        }
    } else {
        puntosEfectivos = 0;
    }

    if (warningSpan) {
        if (errorMsg) {
            warningSpan.textContent = errorMsg;
            warningSpan.style.display = 'block';
            puntosInput.style.borderColor = '#d9534f';
        } else {
            warningSpan.style.display = 'none';
            puntosInput.style.borderColor = '';
        }
    }

    const descuento = puntosEfectivos * 10;
    const total = Math.max(0, subtotal - descuento);
    document.getElementById('total-venta').textContent = total.toLocaleString();
    
    // Sincronizar con la calculadora de cambio
    calcularCambio();
}

function quitarItemVenta(index) {
    itemsVenta.splice(index, 1);
    renderItemsVenta();
}

function confirmarVenta() {
    const id_cliente = document.getElementById('venta-id-cliente').value;
    const id_usuario = document.getElementById('session-id-usuario').value;
    const puntosRedimirInput = parseInt(document.getElementById('puntos-redimir').value) || 0;

    if (!id_cliente) {
        alert('Busca y selecciona un cliente primero.');
        return;
    }
    if (itemsVenta.length === 0) {
        alert('Agrega al menos un producto.');
        return;
    }

    const subtotal = itemsVenta.reduce((acc, item) => acc + item.cantidad * item.precio_unitario, 0);
    const puntosDisponibles = parseInt(document.getElementById('venta-puntos-disponibles').value) || 0;
    const puntosNecesarios = Math.ceil(subtotal / 10);

    // Validar puntos en el envío
    if (puntosRedimirInput < 0) {
        alert('Los puntos a redimir no pueden ser negativos.');
        return;
    }
    if (puntosRedimirInput > puntosDisponibles) {
        alert(`El cliente no tiene suficientes puntos. Disponibles: ${puntosDisponibles}`);
        return;
    }
    if (puntosRedimirInput > puntosNecesarios) {
        alert(`Solo necesitas redimir un máximo de ${puntosNecesarios} puntos para esta venta.`);
        return;
    }

    const puntosRedimir = puntosRedimirInput;
    const descuento = puntosRedimir * 10;
    const total = Math.max(0, subtotal - descuento);

    const data = {
        id_usuario,
        id_cliente,
        total,
        puntos_redimidos: puntosRedimir,
        items: itemsVenta.map(item => ({
    id_producto: item.id_producto,
    nombre_producto: item.nombre_producto,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario
}))
    };

    const efectivo = parseFloat(document.getElementById('venta-efectivo').value) || 0;
    const cambio = parseFloat(document.getElementById('venta-cambio').textContent.replace(/\./g, '')) || 0;

    fetch('/ventas/agregar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {
    if (data.ok) {
        data.efectivo_recibido = efectivo;
        data.cambio_devuelto = cambio;
        mostrarFacturaVenta(data);
        limpiarVenta();
        cargarInventario();
    } else {
        alert('Error: ' + data.mensaje);
    }
});
}

function limpiarVenta() {
    itemsVenta = [];
    renderItemsVenta();
    document.getElementById('venta-cedula').value = '';
    document.getElementById('venta-id-cliente').value = '';
    document.getElementById('venta-puntos-disponibles').value = '0';
    
    const puntosInput = document.getElementById('puntos-redimir');
    puntosInput.value = '';
    puntosInput.style.borderColor = '';
    
    const warningSpan = document.getElementById('puntos-warning');
    if (warningSpan) {
        warningSpan.textContent = '';
        warningSpan.style.display = 'none';
    }
    
    document.getElementById('venta-efectivo').value = '';
    document.getElementById('venta-cambio').textContent = '0';
    itemsVenta = [];
    document.getElementById('info-cliente-venta').style.display = 'none';
    document.getElementById('total-venta').textContent = '0';
    document.getElementById('subtotal-venta').textContent = '0';
}

function calcularCambio() {
    const total = parseFloat(document.getElementById('total-venta').textContent.replace(/\./g, '').replace(/,/g, '')) || 0;
    const efectivo = parseFloat(document.getElementById('venta-efectivo').value) || 0;
    const cambio = efectivo - total;
    
    const spanCambio = document.getElementById('venta-cambio');
    const containerCambio = document.getElementById('venta-cambio-container');
    
    if (cambio < 0) {
        spanCambio.textContent = '0';
        containerCambio.style.color = '#ffb347'; // Naranja pálido
    } else {
        spanCambio.textContent = cambio.toLocaleString();
        containerCambio.style.color = '#2f7a5f'; // Verde principal de la página
    }
}

function cargarHistorialVentas(params = {}) {
    let url = '/ventas/listar?';
    if (params.fecha_desde) url += `fecha_desde=${params.fecha_desde}&`;
    if (params.fecha_hasta) url += `fecha_hasta=${params.fecha_hasta}&`;
    if (params.id_cliente) url += `id_cliente=${params.id_cliente}&`;
    if (params.id_producto) url += `id_producto=${params.id_producto}&`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            const cuerpo = document.getElementById('cuerpo-historial-ventas');
            cuerpo.innerHTML = '';
            data.ventas.forEach(v => {
                const productos = v.items.map(i => `<span class="product-badge">${i.nombre} (${i.cantidad})</span>`).join('');
                cuerpo.innerHTML += `
                    <tr>
                        <td>${String(v.numero_factura).padStart(6, '0')}</td>
                        <td>${v.fecha}</td>
                        <td>${v.cliente}</td>
                        <td style="min-width:200px;">${productos}</td>
                        <td>$${parseFloat(v.total).toLocaleString()}</td>
                        <td>
                            <button class="btn-editar" onclick="verFacturaHistorial(${JSON.stringify(v).replace(/"/g, '&quot;')})">Ver factura</button>
                            <button class="btn-editar" onclick="abrirModalModificarVenta(${v.id})">Modificar</button>
                        </td>
                    </tr>
                `;
            });
        });
}

function cargarFiltrosVentas() {
    fetch('/clientes/listar')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('filtro-venta-cliente');
            if (select) {
                select.innerHTML = '<option value="">Todos los clientes</option>';
                data.clientes.forEach(c => {
                    select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
                });
            }
        });

    fetch('/productos/listar')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('filtro-venta-producto');
            if (select) {
                select.innerHTML = '<option value="">Todos los productos</option>';
                data.productos.forEach(p => {
                    select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                });
            }
        });
}

function filtrarHistorialVentas() {
    const params = {
        fecha_desde: document.getElementById('filtro-venta-desde').value,
        fecha_hasta: document.getElementById('filtro-venta-hasta').value,
        id_cliente: document.getElementById('filtro-venta-cliente').value,
        id_producto: document.getElementById('filtro-venta-producto').value
    };
    cargarHistorialVentas(params);
}

function limpiarFiltrosVentas() {
    document.getElementById('filtro-venta-desde').value = '';
    document.getElementById('filtro-venta-hasta').value = '';
    document.getElementById('filtro-venta-cliente').value = '';
    document.getElementById('filtro-venta-producto').value = '';
    cargarHistorialVentas();
}

function verFacturaHistorial(v) {
    const data = {
        numero_factura: v.numero_factura,
        usuario: v.usuario,
        cliente: {
            nombre: v.cliente,
            cedula: v.cliente_cedula,
            contacto: v.cliente_contacto,
            puntos: 0
        },
        items: v.items.map(i => ({
            nombre_producto: i.nombre,
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario
        })),
        total: v.total,
        puntos_ganados: v.puntos_ganados,
        puntos_antes: v.puntos_antes,
        puntos_redimidos: v.puntos_redimidos,
        descuento: v.puntos_redimidos * 10,
        efectivo_recibido: 0,
        cambio_devuelto: 0,
        es_historial: true
    };
    mostrarFacturaVenta(data);
}

function abrirModalModificarVenta(id_venta) {
    document.getElementById('modificar-id-venta').value = id_venta;
    document.getElementById('modificar-cedula-venta').value = '';
    document.getElementById('modificar-info-cliente').style.display = 'none';
    document.getElementById('modificar-id-cliente-nuevo').value = '';
    document.getElementById('modal-modificar-venta').style.display = 'block';
}

function cerrarModalModificarVenta() {
    document.getElementById('modal-modificar-venta').style.display = 'none';
}

function buscarClienteModificar() {
    const cedula = document.getElementById('modificar-cedula-venta').value;
    if (!cedula) {
        alert('Ingresa una cédula.');
        return;
    }
    fetch(`/clientes/buscar/${cedula}`)
        .then(res => res.json())
        .then(data => {
            if (data.ok) {
                document.getElementById('modificar-id-cliente-nuevo').value = data.cliente.id;
                document.getElementById('modificar-nombre-cliente').textContent = data.cliente.nombre;
                document.getElementById('modificar-info-cliente').style.display = 'block';
            } else {
                alert('Cliente no encontrado.');
            }
        });
}

function guardarModificacionVenta() {
    const id_venta = document.getElementById('modificar-id-venta').value;
    const id_cliente = document.getElementById('modificar-id-cliente-nuevo').value;
    if (!id_cliente) {
        alert('Busca y selecciona un cliente primero.');
        return;
    }
    fetch('/ventas/modificar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_venta, id_cliente })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            alert('Cliente actualizado correctamente.');
            cerrarModalModificarVenta();
            cargarHistorialVentas();
        }
    });
}

function cargarHistorialCompras(params = {}) {
    let url = '/compras/listar?';
    if (params.fecha_desde) url += `fecha_desde=${params.fecha_desde}&`;
    if (params.fecha_hasta) url += `fecha_hasta=${params.fecha_hasta}&`;
    if (params.id_proveedor) url += `id_proveedor=${params.id_proveedor}&`;
    if (params.id_producto) url += `id_producto=${params.id_producto}&`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            const cuerpo = document.getElementById('cuerpo-historial-compras');
            cuerpo.innerHTML = '';
            data.compras.forEach(c => {
                const productos = c.items.map(i => `<span class="product-badge">${i.nombre} (${i.cantidad})</span>`).join('');
                cuerpo.innerHTML += `
                    <tr>
                        <td>${String(c.numero_orden).padStart(6, '0')}</td>
                        <td>${c.fecha}</td>
                        <td>${c.proveedor}</td>
                        <td style="min-width:200px;">${productos}</td>
                        <td>$${parseFloat(c.total).toLocaleString()}</td>
                        <td>
                            <button class="btn-editar" onclick="verOrdenHistorial(${JSON.stringify(c).replace(/"/g, '&quot;')})">Ver orden</button>
                            <button class="btn-editar" onclick="abrirModalModificarCompra(${JSON.stringify(c).replace(/"/g, '&quot;')})">Modificar</button>
                        </td>
                    </tr>
                `;
            });
        });
}

function verOrdenHistorial(c) {
    const data = {
        numero_orden: c.numero_orden,
        usuario: c.usuario,
        proveedor: {
            nombre: c.proveedor,
            telefono: c.proveedor_telefono,
            direccion: c.proveedor_direccion
        },
        items: c.items.map(i => ({
            nombre: i.nombre,
            cantidad: i.cantidad,
            precio_compra: i.precio_unitario,
            fecha_vencimiento: i.fecha_vencimiento,
            subtotal: i.cantidad * i.precio_unitario
        })),
        total: c.total
    };
    mostrarFacturaCompra(data);
}

function abrirModalModificarCompra(c) {
    document.getElementById('modificar-id-compra').value = c.id;

    const selectProveedor = document.getElementById('modificar-proveedor-compra');
    fetch('/proveedores/listar')
        .then(res => res.json())
        .then(data => {
            selectProveedor.innerHTML = '<option value="">Selecciona un proveedor</option>';
            data.proveedores.forEach(p => {
                selectProveedor.innerHTML += `<option value="${p.id}" ${p.id == c.id_proveedor ? 'selected' : ''}>${p.nombre}</option>`;
            });
        });

    const lotesDiv = document.getElementById('modificar-lotes-compra');
    lotesDiv.innerHTML = '';
    c.items.forEach(item => {
        lotesDiv.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; font-size:14px;">
                <span>${item.nombre}</span>
                <input type="date" data-id-lote="${item.id_lote}" value="${item.fecha_vencimiento}" style="padding:6px; border:1px solid #ddd; border-radius:6px;">
            </div>
        `;
    });

    document.getElementById('modal-modificar-compra').style.display = 'block';
}

function cerrarModalModificarCompra() {
    document.getElementById('modal-modificar-compra').style.display = 'none';
}

function guardarModificacionCompra() {
    const id_compra = document.getElementById('modificar-id-compra').value;
    const id_proveedor = document.getElementById('modificar-proveedor-compra').value;

    if (!id_proveedor) {
        alert('Selecciona un proveedor.');
        return;
    }

    const lotes = [];
    document.querySelectorAll('#modificar-lotes-compra input[type="date"]').forEach(input => {
        lotes.push({
            id_lote: input.dataset.idLote,
            fecha_vencimiento: input.value
        });
    });

    fetch('/compras/modificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_compra, id_proveedor, lotes })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            alert('Compra actualizada correctamente.');
            cerrarModalModificarCompra();
            cargarHistorialCompras();
        }
    });
}
// =================== FACTURAS ===================

function mostrarFacturaVenta(data) {
    const ahora = new Date();
    document.getElementById('factura-numero').textContent = String(data.numero_factura).padStart(6, '0');
    document.getElementById('factura-fecha').textContent = ahora.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    document.getElementById('factura-usuario').textContent = data.usuario;
    document.getElementById('factura-cliente-nombre').textContent = data.cliente.nombre;
    document.getElementById('factura-cliente-cedula').textContent = data.cliente.cedula;
    document.getElementById('factura-cliente-contacto').textContent = data.cliente.contacto;

    // Puntos
    const puntosAntes = data.puntos_antes;
    const puntosDespues = puntosAntes + data.puntos_ganados - data.puntos_redimidos;
    document.getElementById('factura-puntos-antes').textContent = puntosAntes;
    document.getElementById('factura-puntos-ganados').textContent = '+' + data.puntos_ganados;
    document.getElementById('factura-puntos-redimidos').textContent = '-' + data.puntos_redimidos;
    document.getElementById('factura-puntos-despues').textContent = puntosDespues;

    // Mostrar/ocultar línea de redimidos
    const redimidosLi = document.getElementById('factura-redimidos-li');
    if (redimidosLi) {
        redimidosLi.style.display = data.puntos_redimidos > 0 ? 'block' : 'none';
    }

    // Items de la tabla
    const items = document.getElementById('factura-items');
    items.innerHTML = '';
    let subtotalCalc = 0;
    data.items.forEach(item => {
        const lineTotal = item.cantidad * item.precio_unitario;
        subtotalCalc += lineTotal;
        items.innerHTML += `
            <tr>
                <td>${item.nombre_producto}</td>
                <td style="text-align:right;">$${parseFloat(item.precio_unitario).toLocaleString()}</td>
                <td style="text-align:center;">${item.cantidad}</td>
                <td style="text-align:right;">$${lineTotal.toLocaleString()}</td>
            </tr>
        `;
    });

    // Subtotal
    document.getElementById('factura-subtotal').textContent = subtotalCalc.toLocaleString();

    // Descuento
    if (data.descuento > 0) {
        document.getElementById('factura-descuento-row').style.display = 'flex';
        document.getElementById('factura-descuento').textContent = data.descuento.toLocaleString();
    } else {
        document.getElementById('factura-descuento-row').style.display = 'none';
    }

    // Total
    document.getElementById('factura-total').textContent = parseFloat(data.total).toLocaleString();

    // Detalle de pago (efectivo y cambio)
    const detallePago = document.getElementById('factura-pago-detalle');
    if (data.efectivo_recibido > 0 || !data.es_historial) {
        detallePago.style.display = 'block';
        document.getElementById('factura-recibido').textContent = parseFloat(data.efectivo_recibido || 0).toLocaleString();
        document.getElementById('factura-cambio').textContent = parseFloat(data.cambio_devuelto || 0).toLocaleString();
    } else {
        detallePago.style.display = 'none';
    }

    document.getElementById('modal-factura-venta').style.display = 'block';
}

function mostrarFacturaCompra(data) {
    const ahora = new Date();
    document.getElementById('orden-numero').textContent = String(data.numero_orden).padStart(6, '0');
    document.getElementById('orden-fecha').textContent = ahora.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    document.getElementById('orden-usuario').textContent = data.usuario;
    document.getElementById('orden-proveedor-nombre').textContent = data.proveedor.nombre;
    document.getElementById('orden-proveedor-telefono').textContent = data.proveedor.telefono || '-';
    document.getElementById('orden-proveedor-direccion').textContent = data.proveedor.direccion || '-';

    const items = document.getElementById('orden-items');
    items.innerHTML = '';
    data.items.forEach(item => {
        items.innerHTML += `
            <tr>
                <td>${item.nombre}</td>
                <td style="text-align:center;">${item.cantidad}</td>
                <td style="text-align:right;">$${parseFloat(item.precio_compra).toLocaleString()}</td>
                <td style="text-align:right;">${item.fecha_vencimiento}</td>
                <td style="text-align:right;">$${parseFloat(item.subtotal).toLocaleString()}</td>
            </tr>
        `;
    });

    document.getElementById('orden-total').textContent = parseFloat(data.total).toLocaleString();
    document.getElementById('modal-factura-compra').style.display = 'block';
}

function cerrarFactura(id) {
    document.getElementById(id).style.display = 'none';
}

function imprimirFactura(id) {
    window.print();
}
function filtrarHistorialCompras() {
    const params = {
        fecha_desde: document.getElementById('filtro-compra-desde').value,
        fecha_hasta: document.getElementById('filtro-compra-hasta').value,
        id_proveedor: document.getElementById('filtro-compra-proveedor').value,
        id_producto: document.getElementById('filtro-compra-producto').value
    };
    cargarHistorialCompras(params);
}

function limpiarFiltrosCompras() {
    document.getElementById('filtro-compra-desde').value = '';
    document.getElementById('filtro-compra-hasta').value = '';
    document.getElementById('filtro-compra-proveedor').value = '';
    document.getElementById('filtro-compra-producto').value = '';
    cargarHistorialCompras();
}

function cargarFiltrosCompras() {
    fetch('/proveedores/listar')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('filtro-compra-proveedor');
            if (select) {
                select.innerHTML = '<option value="">Todos los proveedores</option>';
                data.proveedores.forEach(p => {
                    select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                });
            }
        });

    fetch('/productos/listar')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('filtro-compra-producto');
            if (select) {
                select.innerHTML = '<option value="">Todos los productos</option>';
                data.productos.forEach(p => {
                    select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                });
            }
        });
}
// =================== USUARIOS ===================

function cambiarPestanaUsuarios(tabId, btn) {
    document.querySelectorAll('#usuarios .tab-contenido').forEach(t => t.style.display = 'none');
    document.querySelectorAll('#usuarios .pestana').forEach(p => p.classList.remove('activa'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('activa');
    if (tabId === 'tab-lista-usuarios') cargarUsuarios();
    if (tabId === 'tab-perfil') cargarPerfil();
}

function cargarUsuarios() {
    fetch('/usuarios/listar')
        .then(res => res.json())
        .then(data => {
            const cuerpo = document.getElementById('cuerpo-usuarios');
            cuerpo.innerHTML = '';
            data.usuarios.forEach(u => {
                const esActual = u.usuario === '{{ session["usuario"] }}';
                cuerpo.innerHTML += `
                    <tr>
                        <td>${u.nombre}</td>
                        <td>${u.usuario}</td>
                        <td>${u.rol}</td>
                        <td>${u.activo ? '<span class="badge-ok">Activo</span>' : '<span class="badge-bajo">Inactivo</span>'}</td>
                        <td>
                            ${!esActual ? `
                                <button class="btn-editar" onclick="editarUsuario(${u.id}, '${u.nombre}', '${u.usuario}')">Editar</button>
                                ${u.activo ? `<button class="btn-desactivar" onclick="desactivarUsuario(${u.id})">Desactivar</button>` : ''}
                            ` : '<span style="color:#888; font-size:13px;">Cuenta actual</span>'}
                        </td>
                    </tr>
                `;
            });
        });
}

function abrirFormUsuario() {
    document.getElementById('titulo-form-usuario').textContent = 'Agregar usuario';
    document.getElementById('usuario-id').value = '';
    document.getElementById('usuario-nombre').value = '';
    document.getElementById('usuario-usuario').value = '';
    document.getElementById('usuario-usuario').disabled = false;
    document.getElementById('usuario-contraseña').value = '';
    document.getElementById('form-usuario').style.display = 'block';
}

function cerrarFormUsuario() {
    document.getElementById('form-usuario').style.display = 'none';
}

function editarUsuario(id, nombre, usuario) {
    document.getElementById('titulo-form-usuario').textContent = 'Editar usuario';
    document.getElementById('usuario-id').value = id;
    document.getElementById('usuario-nombre').value = nombre;
    document.getElementById('usuario-usuario').value = usuario;
    document.getElementById('usuario-usuario').disabled = true;
    document.getElementById('usuario-contraseña').value = '';
    document.getElementById('form-usuario').style.display = 'block';
}

function guardarUsuario() {
    const id = document.getElementById('usuario-id').value;
    const data = {
        id,
        nombre: document.getElementById('usuario-nombre').value,
        usuario: document.getElementById('usuario-usuario').value,
        contraseña: document.getElementById('usuario-contraseña').value
    };

    if (!data.nombre) {
        alert('El nombre es obligatorio.');
        return;
    }
    if (!id && (!data.usuario || !data.contraseña)) {
        alert('El usuario y la contraseña son obligatorios.');
        return;
    }

    const url = id ? '/usuarios/editar' : '/usuarios/agregar';
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok === false) {
            alert(data.mensaje);
            return;
        }
        cerrarFormUsuario();
        cargarUsuarios();
    });
}

function desactivarUsuario(id) {
    if (!confirm('¿Estás seguro de que quieres desactivar este usuario?')) return;
    fetch('/usuarios/desactivar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
    })
    .then(res => res.json())
    .then(() => cargarUsuarios());
}

function filtrarUsuarios() {
    const texto = document.getElementById('buscador-usuarios').value.toLowerCase();
    const filas = document.querySelectorAll('#cuerpo-usuarios tr');
    filas.forEach(fila => {
        fila.style.display = fila.textContent.toLowerCase().includes(texto) ? '' : 'none';
    });
}

function cargarPerfil() {
    fetch('/usuarios/perfil')
        .then(res => res.json())
        .then(data => {
            document.getElementById('perfil-id').value = data.id;
            document.getElementById('perfil-nombre').value = data.nombre;
            document.getElementById('perfil-usuario').value = data.usuario;
            document.getElementById('perfil-contraseña').value = '';
            document.getElementById('perfil-confirmar').value = '';
        });
}

function guardarPerfil() {
    const data = {
        id: document.getElementById('perfil-id').value,
        nombre: document.getElementById('perfil-nombre').value,
        usuario: document.getElementById('perfil-usuario').value,
        contraseña: document.getElementById('perfil-contraseña').value,
        confirmar: document.getElementById('perfil-confirmar').value
    };

    if (!data.nombre || !data.usuario) {
        alert('Nombre y usuario son obligatorios.');
        return;
    }
    if (data.contraseña && data.contraseña !== data.confirmar) {
        alert('Las contraseñas no coinciden.');
        return;
    }

    fetch('/usuarios/actualizar_perfil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(res => {
        if (res.ok) {
            alert('Perfil actualizado. Si cambiaste la contraseña, usa la nueva en tu próximo inicio de sesión.');
            document.getElementById('perfil-contraseña').value = '';
            document.getElementById('perfil-confirmar').value = '';
        } else {
            alert('Error: ' + res.mensaje);
        }
    });
}
// =================== INICIO ===================

function cargarInicio() {
    const ahora = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('fecha-hora-actual').textContent = ahora.toLocaleDateString('es-CO', opciones);


    fetch('/inicio/resumen')
        .then(res => res.json())
        .then(data => {
            document.getElementById('card-productos').textContent = data.total_productos;
            document.getElementById('card-clientes').textContent = data.total_clientes;
            document.getElementById('card-ventas-hoy').textContent = data.ventas_hoy.total;
            document.getElementById('card-ventas-monto').textContent = '$' + formatearNumero(data.ventas_hoy.monto);
            document.getElementById('card-compras-hoy').textContent = data.compras_hoy.total;
            document.getElementById('card-compras-monto').textContent = '$' + formatearNumero(data.compras_hoy.monto);
            document.getElementById('card-ventas-mes').textContent = data.ventas_mes.total;
            document.getElementById('card-ventas-mes-monto').textContent = '$' + formatearNumero(data.ventas_mes.monto);
            document.getElementById('card-compras-mes').textContent = data.compras_mes.total;
            document.getElementById('card-compras-mes-monto').textContent = '$' + formatearNumero(data.compras_mes.monto);

            const cuerpoUltimasVentas = document.getElementById('cuerpo-ultimas-ventas');
            if (data.ultimas_ventas.length > 0) {
                cuerpoUltimasVentas.innerHTML = '';
                data.ultimas_ventas.forEach(v => {
                    cuerpoUltimasVentas.innerHTML += `
                        <tr>
                            <td>${String(v.numero_factura).padStart(6, '0')}</td>
                            <td>${v.fecha}</td>
                            <td>${v.cliente}</td>
                            <td>${v.usuario}</td>
                            <td>$${parseFloat(v.total).toLocaleString()}</td>
                        </tr>
                    `;
                });
            } else {
                cuerpoUltimasVentas.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">No hay ventas registradas.</td></tr>';
            }

            const bajosDiv = document.getElementById('inicio-bajo-stock');
            if (data.bajo_stock.length > 0) {
                bajosDiv.innerHTML = '';
                data.bajo_stock.forEach(p => {
                    bajosDiv.innerHTML += `
                        <div class="alerta-danger">
                            <strong>${p.nombre}</strong> — Stock: ${p.stock_actual} (mínimo: ${p.stock_minimo})
                        </div>
                    `;
                });
            } else {
                bajosDiv.innerHTML = '<p style="color:#888; font-size:14px;">Sin alertas de stock bajo.</p>';
            }

            const vencerDiv = document.getElementById('inicio-proximos-vencer');
            if (data.proximos_vencer.length > 0) {
                vencerDiv.innerHTML = '';
                data.proximos_vencer.forEach(p => {
                    vencerDiv.innerHTML += `
                        <div class="alerta-warning">
                            <strong>${p.producto}</strong> — Vence el ${p.fecha_vencimiento} 
                            (${p.dias_restantes} días, ${p.cantidad_disponible} unidades)
                        </div>
                    `;
                });
            } else {
                vencerDiv.innerHTML = '<p style="color:#888; font-size:14px;">Sin alertas de vencimiento.</p>';
            }
            const cuerpoProductosVendidos = document.getElementById('cuerpo-productos-vendidos');
            if (data.productos_mas_vendidos.length > 0) {
            cuerpoProductosVendidos.innerHTML = '';
            data.productos_mas_vendidos.forEach((p, index) => {
            cuerpoProductosVendidos.innerHTML += `
            <tr>
                <td>${index + 1}. ${p.nombre}</td>
                <td>${p.total_vendido} unidades</td>
            </tr>
        `;
    });
    } else {
    cuerpoProductosVendidos.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#888;">No hay ventas registradas.</td></tr>';
    }   
    const dias = [];
const montos = [];
const hoy = new Date();
for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const venta = data.ventas_semana.find(v => v.dia === key);
    dias.push(d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }));
    montos.push(venta ? parseFloat(venta.monto) : 0);
}

const canvas = document.getElementById('grafico-ventas');
if (window.graficaVentas) window.graficaVentas.destroy();
window.graficaVentas = new Chart(canvas, {
    type: 'bar',
    data: {
        labels: dias,
        datasets: [{
            label: 'Ventas ($)',
            data: montos,
            backgroundColor: '#2d6a4f',
            borderRadius: 6
        }]
    },
    options: {
        responsive: true,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: value => '$' + value.toLocaleString()
                }
            }
        }
    }
});

        });
}

// =================== REPORTES ===================

let graficaReporteEjecutivo = null;
let graficaReporteVentas = null;
let catalogosReportesCargados = false;

function construirQuery(params) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(key => {
        if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
            query.append(key, params[key]);
        }
    });
    return query.toString();
}

function cargarCatalogosReportes() {
    if (catalogosReportesCargados) return Promise.resolve();
    return Promise.all([
        fetch('/clientes/listar').then(res => res.json()),
        fetch('/productos/listar').then(res => res.json()),
        fetch('/categorias/listar').then(res => res.json()),
        fetch('/proveedores/listar').then(res => res.json())
    ]).then(([clientesData, productosData, categoriasData, proveedoresData]) => {
        const clientes = clientesData.clientes || [];
        const productos = productosData.productos || [];
        const categorias = categoriasData.categorias || [];
        const proveedores = proveedoresData.proveedores || [];

        const selVentasCliente = document.getElementById('rep-ventas-cliente');
        if (selVentasCliente) {
            selVentasCliente.innerHTML = '<option value="">Todos</option>';
            clientes.forEach(c => selVentasCliente.innerHTML += `<option value="${c.id}">${c.nombre}</option>`);
        }

        const selVentasProducto = document.getElementById('rep-ventas-producto');
        const selRentProducto = document.getElementById('rep-ren-producto');
        if (selVentasProducto) selVentasProducto.innerHTML = '<option value="">Todos</option>';
        if (selRentProducto) selRentProducto.innerHTML = '<option value="">Todos</option>';
        productos.forEach(p => {
            if (selVentasProducto) selVentasProducto.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
            if (selRentProducto) selRentProducto.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });

        const selectCategorias = ['rep-ventas-categoria', 'rep-inv-categoria', 'rep-ren-categoria'];
        selectCategorias.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            sel.innerHTML = '<option value="">Todas</option>';
            categorias.forEach(c => sel.innerHTML += `<option value="${c.id}">${c.nombre}</option>`);
        });

        const selProv = document.getElementById('rep-inv-proveedor');
        if (selProv) {
            selProv.innerHTML = '<option value="">Todos</option>';
            proveedores.forEach(p => selProv.innerHTML += `<option value="${p.id}">${p.nombre}</option>`);
        }

        catalogosReportesCargados = true;
    });
}

function cambiarPestanaReportes(tabId, btn) {
    document.querySelectorAll('#reportes .tab-contenido').forEach(t => t.style.display = 'none');
    document.querySelectorAll('#reportes .pestana').forEach(p => p.classList.remove('activa'));
    document.getElementById(tabId).style.display = 'block';
    btn.classList.add('activa');

    if (tabId === 'tab-reporte-ejecutivo') cargarReporteEjecutivo();
    if (tabId === 'tab-reporte-ventas') cargarReporteVentas();
    if (tabId === 'tab-reporte-inventario') cargarReporteInventario();
    if (tabId === 'tab-reporte-rentabilidad') cargarReporteRentabilidad();
}

function cargarReportes() {
    cargarCatalogosReportes().then(() => {
        cargarReporteEjecutivo();
    });
}

function fechaISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function rangoFechas(tipo) {
    const hoy = new Date();
    const desde = new Date(hoy);
    if (tipo === 'semana') desde.setDate(hoy.getDate() - 6);
    if (tipo === 'mes') desde.setDate(hoy.getDate() - 29);
    return { desde: fechaISO(desde), hasta: fechaISO(hoy) };
}

function aplicarRangoEjecutivo(tipo) {
    const r = rangoFechas(tipo);
    document.getElementById('reporte-ejecutivo-desde').value = r.desde;
    document.getElementById('reporte-ejecutivo-hasta').value = r.hasta;
    cargarReporteEjecutivo();
}

function aplicarRangoVentasReporte(tipo) {
    const r = rangoFechas(tipo);
    document.getElementById('rep-ventas-desde').value = r.desde;
    document.getElementById('rep-ventas-hasta').value = r.hasta;
    cargarReporteVentas();
}

function aplicarRangoRentabilidad(tipo) {
    const r = rangoFechas(tipo);
    document.getElementById('rep-ren-desde').value = r.desde;
    document.getElementById('rep-ren-hasta').value = r.hasta;
    cargarReporteRentabilidad();
}

function limpiarFiltrosReporteEjecutivo() {
    document.getElementById('reporte-ejecutivo-desde').value = '';
    document.getElementById('reporte-ejecutivo-hasta').value = '';
    cargarReporteEjecutivo();
}

function limpiarFiltrosReporteVentas() {
    document.getElementById('rep-ventas-desde').value = '';
    document.getElementById('rep-ventas-hasta').value = '';
    document.getElementById('rep-ventas-cliente').value = '';
    document.getElementById('rep-ventas-producto').value = '';
    document.getElementById('rep-ventas-categoria').value = '';
    cargarReporteVentas();
}

function limpiarFiltrosReporteInventario() {
    document.getElementById('rep-inv-categoria').value = '';
    document.getElementById('rep-inv-proveedor').value = '';
    document.getElementById('rep-inv-alertas').checked = false;
    cargarReporteInventario();
}

function limpiarFiltrosReporteRentabilidad() {
    document.getElementById('rep-ren-desde').value = '';
    document.getElementById('rep-ren-hasta').value = '';
    document.getElementById('rep-ren-categoria').value = '';
    document.getElementById('rep-ren-producto').value = '';
    cargarReporteRentabilidad();
}

function cargarReporteEjecutivo() {
    const params = construirQuery({
        fecha_desde: document.getElementById('reporte-ejecutivo-desde')?.value || '',
        fecha_hasta: document.getElementById('reporte-ejecutivo-hasta')?.value || ''
    });
    fetch(`/reportes/ejecutivo?${params}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('rep-ej-ventas').textContent = '$' + formatearNumero(data.kpis.ventas_total || 0);
            document.getElementById('rep-ej-compras').textContent = '$' + formatearNumero(data.kpis.compras_total || 0);
            document.getElementById('rep-ej-utilidad').textContent = '$' + formatearNumero(data.kpis.utilidad_estimada || 0);
            document.getElementById('rep-ej-ticket').textContent = '$' + formatearNumero(data.kpis.ticket_promedio || 0);

            const topBody = document.getElementById('rep-ej-top-productos');
            topBody.innerHTML = '';
            (data.top_productos || []).forEach(p => {
                topBody.innerHTML += `<tr><td>${p.nombre}</td><td>${p.unidades}</td></tr>`;
            });
            if (!topBody.innerHTML) {
                topBody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#888;">Sin datos</td></tr>';
            }

            const labels = [];
            const montos = [];
            const serie = data.ventas_ultimos_7_dias || [];
            serie.forEach(item => {
                labels.push(item.dia);
                montos.push(parseFloat(item.monto || 0));
            });
            const canvas = document.getElementById('grafico-reporte-ejecutivo');
            if (graficaReporteEjecutivo) graficaReporteEjecutivo.destroy();
            graficaReporteEjecutivo = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{ data: montos, backgroundColor: '#2d6a4f', borderRadius: 6 }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        });
}

function cargarReporteVentas() {
    const params = construirQuery({
        fecha_desde: document.getElementById('rep-ventas-desde')?.value || '',
        fecha_hasta: document.getElementById('rep-ventas-hasta')?.value || '',
        id_cliente: document.getElementById('rep-ventas-cliente')?.value || '',
        id_producto: document.getElementById('rep-ventas-producto')?.value || '',
        id_categoria: document.getElementById('rep-ventas-categoria')?.value || ''
    });
    fetch(`/reportes/ventas?${params}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('rep-ventas-facturas').textContent = data.kpis.total_facturas || 0;
            document.getElementById('rep-ventas-monto').textContent = '$' + formatearNumero(data.kpis.monto_total || 0);
            document.getElementById('rep-ventas-ticket').textContent = '$' + formatearNumero(data.kpis.ticket_promedio || 0);

            const cuerpo = document.getElementById('rep-ventas-detalle');
            cuerpo.innerHTML = '';
            (data.detalle_ventas || []).forEach(v => {
                cuerpo.innerHTML += `
                    <tr>
                        <td>${String(v.numero_factura).padStart(6, '0')}</td>
                        <td>${v.fecha}</td>
                        <td>${v.cliente}</td>
                        <td>${v.vendedor}</td>
                        <td>$${formatearNumero(v.total || 0)}</td>
                    </tr>
                `;
            });
            if (!cuerpo.innerHTML) {
                cuerpo.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Sin resultados</td></tr>';
            }

            const labels = (data.serie_diaria || []).map(i => i.dia);
            const montos = (data.serie_diaria || []).map(i => parseFloat(i.monto || 0));
            const canvas = document.getElementById('grafico-reporte-ventas');
            if (graficaReporteVentas) graficaReporteVentas.destroy();
            graficaReporteVentas = new Chart(canvas, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Ventas',
                        data: montos,
                        borderColor: '#2d6a4f',
                        backgroundColor: 'rgba(45,106,79,0.18)',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#2d6a4f',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            grid: { color: document.body.classList.contains('light-mode') ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' },
                            ticks: { color: document.body.classList.contains('light-mode') ? '#4a6b55' : '#7a9a82' }
                        },
                        y: {
                            beginAtZero: true,
                            grid: { color: document.body.classList.contains('light-mode') ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)' },
                            ticks: {
                                color: document.body.classList.contains('light-mode') ? '#4a6b55' : '#7a9a82',
                                callback: v => '$' + v.toLocaleString()
                            }
                        }
                    }
                }
            });
        });
}

function cargarReporteInventario() {
    const params = construirQuery({
        id_categoria: document.getElementById('rep-inv-categoria')?.value || '',
        id_proveedor: document.getElementById('rep-inv-proveedor')?.value || '',
        solo_alertas: document.getElementById('rep-inv-alertas')?.checked ? 1 : ''
    });
    fetch(`/reportes/inventario?${params}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('rep-inv-productos').textContent = data.kpis.productos || 0;
            document.getElementById('rep-inv-bajo').textContent = data.kpis.productos_bajo_minimo || 0;
            document.getElementById('rep-inv-valor').textContent = '$' + formatearNumero(data.kpis.valor_inventario_costo || 0);
            document.getElementById('rep-inv-vencer').textContent = data.kpis.productos_por_vencer_30d || 0;

            const cuerpo = document.getElementById('rep-inv-detalle');
            cuerpo.innerHTML = '';
            (data.inventario || []).forEach(p => {
                cuerpo.innerHTML += `
                    <tr>
                        <td>${p.nombre}</td>
                        <td>${p.categoria || 'Sin categoría'}</td>
                        <td>${p.stock_actual}</td>
                        <td>${p.stock_minimo}</td>
                        <td>$${formatearNumero(p.valor_inventario_costo || 0)}</td>
                    </tr>
                `;
            });
            if (!cuerpo.innerHTML) {
                cuerpo.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#888;">Sin resultados</td></tr>';
            }
        });
}

function cargarReporteRentabilidad() {
    const params = construirQuery({
        fecha_desde: document.getElementById('rep-ren-desde')?.value || '',
        fecha_hasta: document.getElementById('rep-ren-hasta')?.value || '',
        id_categoria: document.getElementById('rep-ren-categoria')?.value || '',
        id_producto: document.getElementById('rep-ren-producto')?.value || ''
    });
    fetch(`/reportes/rentabilidad?${params}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('rep-ren-ingresos').textContent = '$' + formatearNumero(data.kpis.ingresos_total || 0);
            document.getElementById('rep-ren-costos').textContent = '$' + formatearNumero(data.kpis.costo_total || 0);
            document.getElementById('rep-ren-margen').textContent = '$' + formatearNumero(data.kpis.margen_total || 0);
            document.getElementById('rep-ren-margen-pct').textContent = `${(data.kpis.margen_porcentaje_total || 0).toFixed(2)}%`;

            const cuerpo = document.getElementById('rep-ren-detalle');
            cuerpo.innerHTML = '';
            (data.detalle_productos || []).forEach(r => {
                cuerpo.innerHTML += `
                    <tr>
                        <td>${r.nombre}</td>
                        <td>${r.categoria || 'Sin categoría'}</td>
                        <td>${r.unidades_vendidas}</td>
                        <td>$${formatearNumero(r.ingresos || 0)}</td>
                        <td>$${formatearNumero(r.costo_estimado || 0)}</td>
                        <td>$${formatearNumero(r.margen || 0)}</td>
                        <td>${(r.margen_porcentaje || 0).toFixed(2)}%</td>
                    </tr>
                `;
            });
            if (!cuerpo.innerHTML) {
                cuerpo.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">Sin resultados</td></tr>';
            }
        });
}

// =================== EXPORTAR EXCEL ===================
function exportarExcel(idTabla, nombreArchivo) {
    const tabla = document.getElementById(idTabla);
    if (!tabla) {
        alert('No se encontró la tabla para exportar.');
        return;
    }
    
    // Crear un libro de trabajo y una hoja a partir de la tabla HTML
    const wb = XLSX.utils.table_to_book(tabla, { sheet: "Reporte" });
    
    // Generar la fecha actual para el nombre del archivo
    const hoy = new Date();
    const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const nombreFinal = `${nombreArchivo}_${fecha}.xlsx`;
    
    // Descargar el archivo
    XLSX.writeFile(wb, nombreFinal);
}