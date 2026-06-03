// ===== CARRITO DE COMPRAS =====
let carrito = [];
let productosGlobales = [];
let categoriasUnicas = new Set();

// URL de la hoja de cálculo pública en CSV
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTuWNsipZA0w9IX9Opr7u6vYw0BcWHqvpPk6rCi-4rpsJUpB1dGoG5duncWJNAQlyZB_GtP57DfOnnn/pub?output=csv';

// Inicializar cuando el DOM está listo
document.addEventListener("DOMContentLoaded", function() {
    cargarProductosDesdeSheet();
    cargarCarritoDelLocalStorage();
    
    // Botón de recargar
    const recargarBtn = document.getElementById('recargarBtn');
    if (recargarBtn) {
        recargarBtn.addEventListener('click', cargarProductosDesdeSheet);
    }
    
    // Recargar automáticamente cada 30 segundos
    setInterval(recargarAutomaticamente, 30000);
});

// Cargar productos desde Google Sheets
async function cargarProductosDesdeSheet() {
    try {
        const recargarBtn = document.getElementById('recargarBtn');
        if (recargarBtn) {
            recargarBtn.disabled = true;
            recargarBtn.textContent = '⏳ Recargando...';
        }
        
        const response = await fetch(SHEET_URL);
        const csv = await response.text();
        
        // Parsear CSV
        const lineas = csv.trim().split('\n');
        
        productosGlobales = [];
        categoriasUnicas.clear();
        
        // Procesar cada fila (empezando desde la fila 1, saltando header)
        for (let i = 1; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (!linea) continue;
            
            // Parse CSV respetando comillas
            const valores = parseCSVLine(linea);
            
            if (valores.length >= 7 && valores[1] && valores[2]) {
                const producto = {
                    id: valores[0],
                    nombre: valores[1],
                    categoria: valores[2],
                    precio: valores[3],
                    promoPrice: valores[4],
                    promoQty: valores[5],
                    imagen: valores[6]
                };
                
                // Solo incluir si tiene nombre, categoría e imagen válida
                if (producto.nombre && 
                    producto.categoria && 
                    producto.imagen && 
                    !producto.imagen.includes('http') &&
                    !producto.imagen.includes('https') &&
                    producto.precio !== 'sin stock' && 
                    producto.precio !== '' &&
                    !isNaN(parseFloat(producto.precio))) {
                    
                    productosGlobales.push(producto);
                    categoriasUnicas.add(producto.categoria);
                }
            }
        }
        
        // Ordenar categorías
        const categoriasOrdenadas = Array.from(categoriasUnicas).sort();
        
        // Crear botones de filtro
        crearFiltros(categoriasOrdenadas);
        
        // Mostrar todos los productos
        mostrarProductos(productosGlobales);
        
        // Inicializar eventos
        inicializarEventosFiltro();
        inicializarBotones();
        
        console.log('Productos cargados:', productosGlobales.length);
        
        // Feedback al usuario
        if (recargarBtn) {
            recargarBtn.disabled = false;
            recargarBtn.textContent = '🔄 Recargar';
        }
        
    } catch (error) {
        console.error('Error al cargar productos:', error);
        document.getElementById('gridProductos').innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red;">Error al cargar los productos</p>';
        
        const recargarBtn = document.getElementById('recargarBtn');
        if (recargarBtn) {
            recargarBtn.disabled = false;
            recargarBtn.textContent = '🔄 Recargar';
        }
    }
}

// Parser CSV que respeta comillas
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
}

// Recargar automáticamente sin interferir
async function recargarAutomaticamente() {
    try {
        const response = await fetch(SHEET_URL);
        const csv = await response.text();
        
        const lineas = csv.trim().split('\n');
        let nuevosProductos = [];
        categoriasUnicas.clear();
        
        for (let i = 1; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (!linea) continue;
            
            const valores = parseCSVLine(linea);
            
            if (valores.length >= 7 && valores[1] && valores[2]) {
                const producto = {
                    id: valores[0],
                    nombre: valores[1],
                    categoria: valores[2],
                    precio: valores[3],
                    promoPrice: valores[4],
                    promoQty: valores[5],
                    imagen: valores[6]
                };
                
                if (producto.nombre && 
                    producto.categoria && 
                    producto.imagen && 
                    !producto.imagen.includes('http') &&
                    !producto.imagen.includes('https') &&
                    producto.precio !== 'sin stock' && 
                    producto.precio !== '' &&
                    !isNaN(parseFloat(producto.precio))) {
                    
                    nuevosProductos.push(producto);
                    categoriasUnicas.add(producto.categoria);
                }
            }
        }
        
        // Solo actualizar si hay cambios
        if (JSON.stringify(productosGlobales) !== JSON.stringify(nuevosProductos)) {
            productosGlobales = nuevosProductos;
            const categoriasOrdenadas = Array.from(categoriasUnicas).sort();
            crearFiltros(categoriasOrdenadas);
            mostrarProductos(productosGlobales);
            inicializarEventosFiltro();
            inicializarBotones();
            console.log('Productos actualizados automáticamente');
        }
    } catch (error) {
        console.warn('Actualización automática fallida:', error);
    }
}

// Crear botones de filtro de categorías
function crearFiltros(categorias) {
    const contenedorFiltros = document.querySelector('.filtros');
    
    // Limpiar filtros existentes
    contenedorFiltros.innerHTML = '<button class="filtro-btn active" data-categoria="todos">Todos</button>';
    
    categorias.forEach(categoria => {
        const btn = document.createElement('button');
        btn.className = 'filtro-btn';
        btn.setAttribute('data-categoria', categoria);
        btn.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
        contenedorFiltros.appendChild(btn);
    });
}

// Eventos de filtro
function inicializarEventosFiltro() {
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover clase active de todos
            document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
            // Agregar active al clickeado
            this.classList.add('active');
            
            const categoria = this.getAttribute('data-categoria');
            if (categoria === 'todos') {
                mostrarProductos(productosGlobales);
            } else {
                const filtrados = productosGlobales.filter(p => p.categoria === categoria);
                mostrarProductos(filtrados);
            }
        });
    });
}

// Mostrar productos en el grid
function mostrarProductos(productos) {
    const grid = document.getElementById('gridProductos');
    grid.innerHTML = '';
    
    if (productos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No hay productos en esta categoría</p>';
        return;
    }
    
    productos.forEach((producto, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const imagenPath = `img/${producto.imagen}`;
        const precioTexto = `$${producto.precio}`;
        
        card.innerHTML = `
            <img src="${imagenPath}" alt="${producto.nombre}" onerror="this.src='img/logo-luto.png'">
            <h3>${producto.nombre}</h3>
            <p class="precio">${precioTexto}</p>
            <button class="btn-agregar" data-id="${index}" data-nombre="${producto.nombre}" data-precio="${producto.precio}">Agregar al carrito</button>
        `;
        
        grid.appendChild(card);
    });
}

// Inicializar los botones de agregar
function inicializarBotones() {
    document.querySelectorAll(".btn-agregar").forEach((boton) => {
        boton.addEventListener("click", function() {
            const btnIndex = parseInt(this.getAttribute('data-id'));
            agregarAlCarrito(btnIndex);
        });
    });
}

// Agregar producto al carrito
function agregarAlCarrito(indice) {
    const producto = productosGlobales[indice];
    const productoEnCarrito = carrito.find(p => p.id === producto.id);

    if (productoEnCarrito) {
        productoEnCarrito.cantidad++;
    } else {
        carrito.push({
            ...producto,
            cantidad: 1
        });
    }

    guardarCarritoEnLocalStorage();
    mostrarNotificacion(`${producto.nombre} agregado al carrito`);
}

// Guardar carrito en localStorage
function guardarCarritoEnLocalStorage() {
    localStorage.setItem("carrito", JSON.stringify(carrito));
}

// Cargar carrito desde localStorage
function cargarCarritoDelLocalStorage() {
    const carritoGuardado = localStorage.getItem("carrito");
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
    }
}

// Mostrar notificación al usuario
function mostrarNotificacion(mensaje) {
    // Crear elemento de notificación
    const notificacion = document.createElement("div");
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #25d366;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease;
        font-weight: 600;
    `;
    
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);

    // Remover después de 2 segundos
    setTimeout(() => {
        notificacion.style.animation = "slideOut 0.3s ease";
        setTimeout(() => notificacion.remove(), 300);
    }, 2000);
}

// Agregar animaciones de notificación
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Obtener información del carrito
function obtenerInfoCarrito() {
    const total = carrito.reduce((sum, item) => sum + (parseFloat(item.precio) * item.cantidad), 0);
    const cantidad = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    
    return {
        items: carrito,
        total: total,
        cantidad: cantidad
    };
}

// Log del carrito (para debugging)
console.log("Script de Luto Bebidas cargado correctamente");
