// ============================================================
// PUNTOSTOCK — Módulo de Ventas (POS) v2
// Modos de entrada: escáner físico | cámara | búsqueda manual
// Calculadora de balanza para productos por peso (fiambres, etc.)
// ============================================================

const Ventas = {
  productos: [],
  productosFiltrados: [],
  cart: [],
  scanBuffer: '',
  scanTimer: null,
  cameraStream: null,
  cameraActive: false,

  async load() {
    const page = document.getElementById('page-ventas');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando productos...</div>`;

    try {
      const snap = await db.collection('businesses').doc(PS.businessId)
        .collection('productos').where('activo', '==', true).get();
      this.productos = [];
      snap.forEach(d => this.productos.push({ id: d.id, ...d.data() }));
      this.productosFiltrados = [...this.productos];
      this.cart = [];
      this.render(page);
      this.initScanner();
    } catch (e) {
      page.innerHTML = `<div class="empty-state"><h3>Error al cargar</h3><p>${e.message}</p></div>`;
    }
  },

  render(page) {
    page.innerHTML = `
      <div class="pos-layout">
        <!-- LEFT -->
        <div class="pos-left">

          <!-- Barra de búsqueda + botones de modo -->
          <div style="display:flex; gap:8px; align-items:center;">
            <div class="pos-search-bar" style="flex:1;">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" id="pos-search" placeholder="Buscar por nombre o código..."
                oninput="Ventas.filter(this.value)">
            </div>

            <!-- Botón cámara -->
            <button id="btn-camara" onclick="Ventas.toggleCamera()"
              title="Escanear con cámara"
              style="width:44px; height:44px; background:var(--bg-card); border:1px solid var(--border);
                     border-radius:var(--radius-md); cursor:pointer; display:flex; align-items:center;
                     justify-content:center; flex-shrink:0; transition:all 0.2s; color:var(--text-secondary);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>

            <!-- Botón balanza -->
            <button onclick="Ventas.abrirBalanza()"
              title="Calculadora de balanza (fiambres y productos por peso)"
              style="width:44px; height:44px; background:var(--bg-card); border:1px solid var(--border);
                     border-radius:var(--radius-md); cursor:pointer; display:flex; align-items:center;
                     justify-content:center; flex-shrink:0; transition:all 0.2s; color:var(--text-secondary);"
              onmouseenter="this.style.borderColor='var(--green-primary)'; this.style.color='var(--green-primary)'"
              onmouseleave="this.style.borderColor='var(--border)'; this.style.color='var(--text-secondary)'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 3a1 1 0 0 0-1 1v1H5a1 1 0 0 0-.894 1.447L6 9H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2l1.894-2.553A1 1 0 0 0 19 5h-6V4a1 1 0 0 0-1-1z"/>
                <line x1="12" y1="9" x2="12" y2="17"/>
                <line x1="8" y1="13" x2="16" y2="13"/>
              </svg>
            </button>
          </div>

          <!-- Visor de cámara (oculto por default) -->
          <div id="camera-container" style="display:none; position:relative; border-radius:var(--radius-md);
               overflow:hidden; border:2px solid var(--green-primary); background:#000;">
            <video id="camera-video" autoplay playsinline muted
              style="width:100%; max-height:240px; object-fit:cover; display:block;"></video>
            <canvas id="camera-canvas" style="display:none;"></canvas>
            <!-- Guía de escaneo -->
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none;">
              <div style="width:200px; height:80px; border:2px solid var(--green-primary);
                          border-radius:8px; box-shadow:0 0 0 9999px rgba(0,0,0,0.4);">
                <div style="position:absolute; top:-2px; left:-2px; width:20px; height:20px;
                             border-top:3px solid var(--green-primary); border-left:3px solid var(--green-primary);"></div>
                <div style="position:absolute; top:-2px; right:-2px; width:20px; height:20px;
                             border-top:3px solid var(--green-primary); border-right:3px solid var(--green-primary);"></div>
                <div style="position:absolute; bottom:-2px; left:-2px; width:20px; height:20px;
                             border-bottom:3px solid var(--green-primary); border-left:3px solid var(--green-primary);"></div>
                <div style="position:absolute; bottom:-2px; right:-2px; width:20px; height:20px;
                             border-bottom:3px solid var(--green-primary); border-right:3px solid var(--green-primary);"></div>
              </div>
            </div>
            <!-- Status -->
            <div id="camera-status" style="position:absolute; bottom:8px; left:0; right:0; text-align:center;
                 font-size:12px; font-weight:600; color:white; text-shadow:0 1px 3px rgba(0,0,0,0.8);">
              Apuntá el código de barras al recuadro
            </div>
            <!-- Cerrar cámara -->
            <button onclick="Ventas.stopCamera()"
              style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.6);
                     border:none; color:white; width:28px; height:28px; border-radius:50%;
                     cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center;">
              ✕
            </button>
          </div>

          <!-- Categorías -->
          <div id="pos-cats" style="display:flex; gap:6px; flex-wrap:wrap;"></div>

          <!-- Grid productos -->
          <div class="pos-products" id="pos-products-grid"></div>
        </div>

        <!-- RIGHT: carrito -->
        <div class="pos-right">
          <div class="cart-header">
            <div class="cart-title">
              <span style="display:flex; align-items:center; gap:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                Carrito
              </span>
              <span class="cart-count" id="cart-count">0</span>
            </div>
          </div>

          <div class="cart-items" id="cart-items">
            <div class="cart-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3; margin-bottom:8px;">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span>El carrito está vacío</span>
              <span style="font-size:11px;">Buscá, escaneá o usá la cámara</span>
            </div>
          </div>

          <div class="cart-totals">
            <div class="total-row">
              <span>Subtotal</span>
              <span id="cart-subtotal">$0</span>
            </div>
            <div class="total-row">
              <span>Descuento</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <input type="number" id="cart-descuento" min="0" max="100" value="0"
                  style="width:50px; padding:3px 6px; text-align:center; font-size:12px;"
                  oninput="Ventas.updateTotals()"> %
              </div>
            </div>
            <div class="total-row main">
              <span>TOTAL</span>
              <span id="cart-total">$0</span>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">
              ${['Efectivo','Tarjeta','Transferencia','Cuenta corriente'].map(m => `
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer;
                              padding:8px; border:1px solid var(--border); border-radius:6px;
                              font-size:12px; font-weight:500; transition:all 0.15s;"
                       onclick="Ventas.selectPago('${m}')">
                  <input type="radio" name="pago" value="${m}" style="accent-color:var(--green-primary);">
                  ${m}
                </label>
              `).join('')}
            </div>

            <div id="efectivo-section" style="display:none; margin-bottom:10px;">
              <label>Monto recibido</label>
              <input type="number" id="monto-recibido" style="margin-top:4px;" oninput="Ventas.calcVuelto()">
              <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:12px;">
                <span style="color:var(--text-secondary);">Vuelto:</span>
                <span id="vuelto-val" style="font-family:var(--font-mono); font-weight:700; color:var(--green-primary);">$0</span>
              </div>
            </div>

            <button class="cobrar-btn" id="cobrar-btn" onclick="Ventas.cobrar()" disabled>
              Cobrar
            </button>
            <button class="btn btn-ghost w-full mt-8" onclick="Ventas.clearCart()" style="font-size:12px;">
              Vaciar carrito
            </button>
          </div>
        </div>
      </div>
    `;

    this.renderCategorias();
    this.renderProductos();
    this.renderCart();
    setTimeout(() => document.getElementById('pos-search')?.focus(), 100);
  },

  // ── Categorías ────────────────────────────────────────────
  renderCategorias() {
    const cats = ['Todos', ...new Set(this.productos.map(p => p.categoria).filter(Boolean))];
    const container = document.getElementById('pos-cats');
    if (!container) return;
    container.innerHTML = cats.map((c, i) => `
      <button class="btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-secondary'}"
              onclick="Ventas.filterCat('${c}', this)">${c}</button>
    `).join('');
  },

  filterCat(cat, btn) {
    document.querySelectorAll('#pos-cats .btn').forEach(b => {
      b.className = b === btn ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
    });
    this.productosFiltrados = cat === 'Todos'
      ? [...this.productos]
      : this.productos.filter(p => p.categoria === cat);
    document.getElementById('pos-search').value = '';
    this.renderProductos();
  },

  filter(q) {
    q = q.toLowerCase().trim();
    this.productosFiltrados = q
      ? this.productos.filter(p =>
          p.nombre?.toLowerCase().includes(q) ||
          p.codigo?.toLowerCase().includes(q) ||
          p.codigoBarra?.toLowerCase().includes(q) ||
          p.categoria?.toLowerCase().includes(q))
      : [...this.productos];
    this.renderProductos();
  },

  // ── Renderizar productos ──────────────────────────────────
  renderProductos() {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    if (this.productosFiltrados.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <h3>Sin resultados</h3>
          <p>No se encontraron productos</p>
        </div>`;
      return;
    }

    grid.innerHTML = this.productosFiltrados.map(p => {
      const noStock  = (p.stock || 0) <= 0;
      const esPeso   = p.unidad === 'kg' || p.unidad === 'g' ||
                       ['fiambre','queso','embutido','carne','deli'].some(k =>
                         (p.categoria || '').toLowerCase().includes(k) ||
                         (p.nombre || '').toLowerCase().includes(k));

      // Ícono según categoría
      const iconPath = this.getProductIcon(p.categoria || '');

      return `
        <div class="product-card ${noStock ? 'no-stock' : ''}"
             onclick="${noStock ? '' : esPeso ? `Ventas.abrirBalanza('${p.id}')` : `Ventas.addToCart('${p.id}')`}"
             title="${p.nombre}">
          <div class="product-icon" style="margin:0 auto 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              ${iconPath}
            </svg>
          </div>
          <div class="product-name">${p.nombre}</div>
          <div class="product-price">${formatPrice(p.precio)}${esPeso ? '/kg' : ''}</div>
          <div class="product-stock-label">
            ${noStock ? 'Sin stock' : esPeso ? 'Por peso' : `${p.stock} en stock`}
          </div>
          ${esPeso ? `<div style="margin-top:4px;">
            <span style="font-size:9px; background:rgba(126,211,33,0.15); color:var(--green-primary);
                         padding:2px 6px; border-radius:4px; font-weight:700;">BALANZA</span>
          </div>` : ''}
        </div>
      `;
    }).join('');
  },

  getProductIcon(cat) {
    cat = cat.toLowerCase();
    if (cat.includes('ropa') || cat.includes('indument')) return '<path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>';
    if (cat.includes('calzado') || cat.includes('zapato')) return '<path d="M2 11l5-7 5 4 3-2 7 9H2zM7 17h10M9 20h6"/>';
    if (cat.includes('fiambre') || cat.includes('deli') || cat.includes('queso') || cat.includes('carne')) return '<path d="M12 3a1 1 0 0 0-1 1v1H5a1 1 0 0 0-.894 1.447L6 9H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2l1.894-2.553A1 1 0 0 0 19 5h-6V4a1 1 0 0 0-1-1z"/>';
    if (cat.includes('bebida') || cat.includes('liquid')) return '<path d="M8 2h8l1 7H7L8 2zM7 9c0 5 2 9 5 9s5-4 5-9"/>';
    if (cat.includes('electro') || cat.includes('tecno')) return '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>';
    if (cat.includes('limpieza')) return '<path d="M3 3l18 18M9 9a3 3 0 0 0 4.24 4.24M17 17H7a2 2 0 0 1-2-2V7"/>';
    // Default: caja
    return '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>';
  },

  // ── CALCULADORA DE BALANZA ────────────────────────────────
  abrirBalanza(prodId) {
    // Si se llama desde un producto específico
    const prod = prodId ? this.productos.find(p => p.id === prodId) : null;

    // Productos que son por peso (filtrado)
    const prodsPeso = this.productos.filter(p =>
      p.unidad === 'kg' || p.unidad === 'g' ||
      ['fiambre','queso','embutido','carne','deli'].some(k =>
        (p.categoria || '').toLowerCase().includes(k) ||
        (p.nombre || '').toLowerCase().includes(k))
    );

    const opciones = prodsPeso.length > 0
      ? prodsPeso.map(p => `<option value="${p.id}" ${p.id === prodId ? 'selected' : ''}>${p.nombre} — ${formatPrice(p.precio)}/kg</option>`).join('')
      : this.productos.map(p => `<option value="${p.id}" ${p.id === prodId ? 'selected' : ''}>${p.nombre} — ${formatPrice(p.precio)}/kg</option>`).join('');

    openModal(`
      <div class="modal-header">
        <h3 class="modal-title" style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; background:var(--green-muted); border-radius:8px;
                      display:flex; align-items:center; justify-content:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" stroke-width="1.8">
              <path d="M12 3a1 1 0 0 0-1 1v1H5a1 1 0 0 0-.894 1.447L6 9H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2l1.894-2.553A1 1 0 0 0 19 5h-6V4a1 1 0 0 0-1-1z"/>
              <line x1="12" y1="9" x2="12" y2="17"/>
              <line x1="8" y1="13" x2="16" y2="13"/>
            </svg>
          </div>
          Calculadora de balanza
        </h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <div class="form-group">
        <label>Producto</label>
        <select id="balanza-prod" onchange="Ventas.balanzaCalc()">
          ${opciones.length ? opciones : '<option value="">— Seleccioná un producto —</option>'}
        </select>
      </div>

      <!-- Display de la balanza -->
      <div style="background:var(--bg-primary); border:1px solid var(--border); border-radius:var(--radius-md);
                  padding:20px; margin:16px 0; text-align:center; font-family:var(--font-mono);">
        <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">
          Peso ingresado
        </div>
        <div id="balanza-display" style="font-size:48px; font-weight:900; color:var(--green-primary);
             letter-spacing:2px; line-height:1;">0</div>
        <div style="font-size:14px; color:var(--text-secondary); margin-top:4px;">gramos</div>
      </div>

      <!-- Teclado numérico de balanza -->
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:16px;">
        ${[7,8,9,4,5,6,1,2,3].map(n => `
          <button onclick="Ventas.balanzaKey('${n}')"
            style="padding:16px; font-size:22px; font-weight:700; font-family:var(--font-mono);
                   background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md);
                   cursor:pointer; color:var(--text-primary); transition:all 0.15s;"
            onmouseenter="this.style.background='var(--bg-hover)'; this.style.borderColor='var(--green-primary)'"
            onmouseleave="this.style.background='var(--bg-card)'; this.style.borderColor='var(--border)'">
            ${n}
          </button>
        `).join('')}
        <button onclick="Ventas.balanzaKey('C')"
          style="padding:16px; font-size:16px; font-weight:700; background:rgba(248,81,73,0.1);
                 border:1px solid rgba(248,81,73,0.2); border-radius:var(--radius-md); cursor:pointer;
                 color:var(--red); transition:all 0.15s;"
          onmouseenter="this.style.background='rgba(248,81,73,0.2)'"
          onmouseleave="this.style.background='rgba(248,81,73,0.1)'">C</button>
        <button onclick="Ventas.balanzaKey('0')"
          style="padding:16px; font-size:22px; font-weight:700; font-family:var(--font-mono);
                 background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md);
                 cursor:pointer; color:var(--text-primary); transition:all 0.15s;"
          onmouseenter="this.style.background='var(--bg-hover)'; this.style.borderColor='var(--green-primary)'"
          onmouseleave="this.style.background='var(--bg-card)'; this.style.borderColor='var(--border)'">0</button>
        <button onclick="Ventas.balanzaKey('⌫')"
          style="padding:16px; font-size:18px; font-weight:700; background:var(--bg-card);
                 border:1px solid var(--border); border-radius:var(--radius-md); cursor:pointer;
                 color:var(--text-secondary); transition:all 0.15s;"
          onmouseenter="this.style.background='var(--bg-hover)'"
          onmouseleave="this.style.background='var(--bg-card)'">⌫</button>
      </div>

      <!-- Accesos rápidos de peso -->
      <div style="margin-bottom:16px;">
        <div style="font-size:11px; color:var(--text-muted); font-weight:600; text-transform:uppercase;
                    letter-spacing:0.5px; margin-bottom:8px;">Pesos frecuentes</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${[100,150,200,250,300,400,500,750,1000].map(g => `
            <button onclick="Ventas.balanzaSet('${g}')"
              style="padding:6px 12px; font-size:12px; font-weight:600; font-family:var(--font-mono);
                     background:var(--bg-card); border:1px solid var(--border); border-radius:6px;
                     cursor:pointer; color:var(--text-secondary); transition:all 0.15s;"
              onmouseenter="this.style.borderColor='var(--green-primary)'; this.style.color='var(--green-primary)'"
              onmouseleave="this.style.borderColor='var(--border)'; this.style.color='var(--text-secondary)'">
              ${g >= 1000 ? g/1000 + 'kg' : g + 'g'}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Resultado del precio -->
      <div id="balanza-resultado" style="background:var(--green-muted); border:1px solid var(--border-green);
           border-radius:var(--radius-md); padding:16px; text-align:center; display:none;">
        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;">Precio a cobrar</div>
        <div id="balanza-precio" style="font-size:32px; font-weight:900; font-family:var(--font-mono);
             color:var(--green-primary);">$0</div>
        <div id="balanza-detalle" style="font-size:12px; color:var(--text-secondary); margin-top:4px;"></div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" style="width:auto;" id="balanza-agregar-btn"
          onclick="Ventas.balanzaAgregar()" disabled>
          Agregar al carrito
        </button>
      </div>
    `);

    // Estado del teclado de balanza
    this._balanzaGramos = '';
    this.balanzaCalc();
  },

  balanzaKey(key) {
    if (!this._balanzaGramos && this._balanzaGramos !== '') this._balanzaGramos = '';
    if (key === 'C') {
      this._balanzaGramos = '';
    } else if (key === '⌫') {
      this._balanzaGramos = this._balanzaGramos.slice(0, -1);
    } else {
      if (this._balanzaGramos.length >= 5) return; // max 99999g
      this._balanzaGramos += key;
    }
    const display = document.getElementById('balanza-display');
    if (display) display.textContent = this._balanzaGramos || '0';
    this.balanzaCalc();
  },

  balanzaSet(gramos) {
    this._balanzaGramos = String(gramos);
    const display = document.getElementById('balanza-display');
    if (display) display.textContent = this._balanzaGramos;
    this.balanzaCalc();
  },

  balanzaCalc() {
    const gramos   = parseInt(this._balanzaGramos) || 0;
    const prodId   = document.getElementById('balanza-prod')?.value;
    const prod     = this.productos.find(p => p.id === prodId);
    const resultado= document.getElementById('balanza-resultado');
    const precioEl = document.getElementById('balanza-precio');
    const detalleEl= document.getElementById('balanza-detalle');
    const btnAgr   = document.getElementById('balanza-agregar-btn');

    if (!prod || gramos <= 0) {
      if (resultado) resultado.style.display = 'none';
      if (btnAgr) btnAgr.disabled = true;
      return;
    }

    // Precio por kg → calcular por gramos
    const precioPorGramo = prod.precio / 1000;
    const precioTotal    = precioPorGramo * gramos;

    if (resultado) resultado.style.display = 'block';
    if (precioEl)  precioEl.textContent = formatPrice(Math.round(precioTotal));
    if (detalleEl) detalleEl.textContent =
      `${gramos}g de ${prod.nombre} a ${formatPrice(prod.precio)}/kg`;
    if (btnAgr) btnAgr.disabled = false;

    // Guardar para agregar
    this._balanzaProd   = prod;
    this._balanzaGramos2= gramos;
    this._balanzaPrecio = Math.round(precioTotal);
  },

  balanzaAgregar() {
    if (!this._balanzaProd || !this._balanzaGramos2) return;
    const prod   = this._balanzaProd;
    const gramos = this._balanzaGramos2;
    const precio = this._balanzaPrecio;

    // Agregar al carrito como ítem de peso (cantidad = 1, precio = lo calculado)
    const itemId = `${prod.id}_${Date.now()}`;
    this.cart.push({
      id:       itemId,
      prodId:   prod.id,
      nombre:   `${prod.nombre} (${gramos}g)`,
      precio:   precio,
      cantidad: 1,
      esPeso:   true,
      stockMax: 999
    });

    this.renderCart();
    this.updateTotals();
    closeModal();
    showToast(`${prod.nombre} ${gramos}g — ${formatPrice(precio)} agregado`, 'success');
  },

  // ── CÁMARA ────────────────────────────────────────────────
  async toggleCamera() {
    if (this.cameraActive) {
      this.stopCamera();
    } else {
      await this.startCamera();
    }
  },

  async startCamera() {
    const container = document.getElementById('camera-container');
    const video     = document.getElementById('camera-video');
    const btn       = document.getElementById('btn-camara');
    const status    = document.getElementById('camera-status');

    if (!container || !video) return;

    try {
      // Solicitar permiso de cámara (preferir cámara trasera en mobile)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      this.cameraStream = stream;
      this.cameraActive = true;
      video.srcObject = stream;
      container.style.display = 'block';

      // Cambiar ícono del botón
      if (btn) {
        btn.style.borderColor = 'var(--green-primary)';
        btn.style.color = 'var(--green-primary)';
        btn.style.background = 'var(--green-muted)';
      }

      // Cargar librería de escaneo de códigos de barras (ZXing)
      if (!window.ZXing) {
        if (status) status.textContent = 'Cargando lector...';
        await this.loadZXing();
      }

      if (status) status.textContent = 'Apuntá el código de barras al recuadro';
      this.startCameraScan(video);

    } catch (e) {
      showToast('No se pudo acceder a la cámara. Verificá los permisos.', 'error');
      console.error('Camera error:', e);
    }
  },

  loadZXing() {
    return new Promise((resolve, reject) => {
      if (window.ZXing) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@zxing/library@0.18.6/umd/index.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  startCameraScan(video) {
    if (!window.ZXing) {
      // Fallback: escaneo básico por canvas sin librería
      this._scanInterval = setInterval(() => this.scanFrame(video), 500);
      return;
    }

    try {
      const hints = new Map();
      const formats = [
        ZXing.BarcodeFormat.EAN_13,
        ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.CODE_128,
        ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.QR_CODE,
        ZXing.BarcodeFormat.UPC_A,
        ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.DATA_MATRIX
      ];
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);

      const reader = new ZXing.MultiFormatReader();
      reader.setHints(hints);
      this._zxingReader = reader;

      const canvas  = document.getElementById('camera-canvas');
      const ctx     = canvas.getContext('2d');
      const status  = document.getElementById('camera-status');

      this._scanInterval = setInterval(() => {
        if (!this.cameraActive || video.readyState < 2) return;
        try {
          canvas.width  = video.videoWidth  || 640;
          canvas.height = video.videoHeight || 480;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const luminance = new ZXing.RGBLuminanceSource(
            imgData.data, canvas.width, canvas.height
          );
          const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminance));
          const result = reader.decode(bitmap);

          if (result) {
            const code = result.getText();
            if (status) status.textContent = `Detectado: ${code}`;
            this.stopCamera();
            this.addByCode(code);
          }
        } catch (e) {
          // NotFoundException es normal cuando no hay código en el frame
        }
      }, 300);

    } catch (e) {
      console.error('ZXing init error:', e);
      this._scanInterval = setInterval(() => this.scanFrame(video), 500);
    }
  },

  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
    if (this._scanInterval) {
      clearInterval(this._scanInterval);
      this._scanInterval = null;
    }
    this.cameraActive = false;

    const container = document.getElementById('camera-container');
    const btn       = document.getElementById('btn-camara');
    if (container) container.style.display = 'none';
    if (btn) {
      btn.style.borderColor = 'var(--border)';
      btn.style.color       = 'var(--text-secondary)';
      btn.style.background  = 'var(--bg-card)';
    }
  },

  // ── Carrito ───────────────────────────────────────────────
  addToCart(prodId) {
    const prod = this.productos.find(p => p.id === prodId);
    if (!prod || prod.stock <= 0) { showToast('Sin stock', 'error'); return; }

    const existing = this.cart.find(i => i.id === prodId);
    if (existing) {
      if (existing.cantidad >= prod.stock) {
        showToast(`Máximo ${prod.stock} unidades`, 'warning'); return;
      }
      existing.cantidad++;
    } else {
      this.cart.push({
        id: prodId, nombre: prod.nombre,
        precio: prod.precio, cantidad: 1, stockMax: prod.stock
      });
    }
    this.renderCart();
    this.updateTotals();
  },

  addByCode(code) {
    const prod = this.productos.find(p =>
      p.codigo === code || p.codigoBarra === code
    );
    if (prod) {
      // Detectar si es producto por peso
      const esPeso = prod.unidad === 'kg' || prod.unidad === 'g' ||
        ['fiambre','queso','embutido','carne','deli'].some(k =>
          (prod.categoria || '').toLowerCase().includes(k) ||
          (prod.nombre || '').toLowerCase().includes(k));

      if (esPeso) {
        this.abrirBalanza(prod.id);
      } else {
        this.addToCart(prod.id);
        showToast(`${prod.nombre} agregado`, 'success', 1500);
      }
    } else {
      showToast(`Código no encontrado: ${code}`, 'warning');
    }
  },

  changeQty(id, delta) {
    const item = this.cart.find(i => i.id === id);
    if (!item) return;
    if (item.esPeso) {
      // Items de peso: eliminar directamente si se resta
      if (delta < 0) {
        this.cart = this.cart.filter(i => i.id !== id);
      }
    } else {
      item.cantidad += delta;
      if (item.cantidad <= 0) this.cart = this.cart.filter(i => i.id !== id);
      else if (item.cantidad > item.stockMax) {
        item.cantidad = item.stockMax;
        showToast(`Máximo ${item.stockMax} unidades`, 'warning');
      }
    }
    this.renderCart();
    this.updateTotals();
  },

  removeFromCart(id) {
    this.cart = this.cart.filter(i => i.id !== id);
    this.renderCart();
    this.updateTotals();
  },

  clearCart() {
    this.cart = [];
    this.renderCart();
    this.updateTotals();
  },

  renderCart() {
    const container = document.getElementById('cart-items');
    const countEl   = document.getElementById('cart-count');
    if (!container) return;

    const total = this.cart.reduce((s, i) => s + i.cantidad, 0);
    if (countEl) countEl.textContent = total;

    if (this.cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3; margin-bottom:8px;">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <span>El carrito está vacío</span>
          <span style="font-size:11px;">Buscá, escaneá o usá la cámara</span>
        </div>`;
      const btn = document.getElementById('cobrar-btn');
      if (btn) btn.disabled = true;
      return;
    }

    container.innerHTML = this.cart.map(item => `
      <div class="cart-item">
        <div style="flex:1; min-width:0;">
          <div class="cart-item-name">${item.nombre}</div>
          <div class="cart-item-price">
            ${item.esPeso ? 'Precio por peso' : `${formatPrice(item.precio)} c/u`}
          </div>
        </div>
        ${item.esPeso ? `
          <div style="font-family:var(--font-mono); font-size:13px; font-weight:700;
                      color:var(--green-primary); min-width:70px; text-align:right;">
            ${formatPrice(item.precio)}
          </div>
        ` : `
          <div class="qty-control">
            <button class="qty-btn" onclick="Ventas.changeQty('${item.id}', -1)">−</button>
            <span class="qty-value">${item.cantidad}</span>
            <button class="qty-btn" onclick="Ventas.changeQty('${item.id}', 1)">+</button>
          </div>
          <div style="font-family:var(--font-mono); font-size:13px; font-weight:700;
                      color:var(--green-primary); min-width:70px; text-align:right;">
            ${formatPrice(item.precio * item.cantidad)}
          </div>
        `}
        <button class="cart-remove" onclick="Ventas.removeFromCart('${item.id}')">✕</button>
      </div>
    `).join('');

    const btn = document.getElementById('cobrar-btn');
    if (btn) btn.disabled = false;
  },

  updateTotals() {
    const subtotal = this.cart.reduce((s, i) => s + (i.esPeso ? i.precio : i.precio * i.cantidad), 0);
    const descPct  = parseFloat(document.getElementById('cart-descuento')?.value || 0);
    const total    = subtotal * (1 - descPct / 100);

    const subEl = document.getElementById('cart-subtotal');
    const totEl = document.getElementById('cart-total');
    if (subEl) subEl.textContent = formatPrice(subtotal);
    if (totEl) totEl.textContent = formatPrice(total);

    const btn = document.getElementById('cobrar-btn');
    if (btn && this.cart.length > 0) btn.textContent = `Cobrar ${formatPrice(total)}`;
    this.calcVuelto();
  },

  selectPago(metodo) {
    const section = document.getElementById('efectivo-section');
    if (section) section.style.display = metodo === 'Efectivo' ? 'block' : 'none';
  },

  calcVuelto() {
    const subtotal = this.cart.reduce((s, i) => s + (i.esPeso ? i.precio : i.precio * i.cantidad), 0);
    const descPct  = parseFloat(document.getElementById('cart-descuento')?.value || 0);
    const total    = subtotal * (1 - descPct / 100);
    const recibido = parseFloat(document.getElementById('monto-recibido')?.value || 0);
    const vuelto   = recibido - total;
    const el = document.getElementById('vuelto-val');
    if (el) {
      el.textContent = formatPrice(Math.max(0, vuelto));
      el.style.color = vuelto < 0 ? 'var(--red)' : 'var(--green-primary)';
    }
  },

  // ── Cobrar ────────────────────────────────────────────────
  async cobrar() {
    if (this.cart.length === 0) return;
    const metodoPago = document.querySelector('input[name="pago"]:checked')?.value;
    if (!metodoPago) { showToast('Seleccioná el método de pago', 'warning'); return; }

    const subtotal = this.cart.reduce((s, i) => s + (i.esPeso ? i.precio : i.precio * i.cantidad), 0);
    const descPct  = parseFloat(document.getElementById('cart-descuento')?.value || 0);
    const total    = subtotal * (1 - descPct / 100);

    const btn = document.getElementById('cobrar-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Procesando...';

    try {
      const batch  = db.batch();
      const bizRef = db.collection('businesses').doc(PS.businessId);

      const ventaRef = bizRef.collection('ventas').doc();
      batch.set(ventaRef, {
        items: this.cart.map(i => ({
          id: i.prodId || i.id, nombre: i.nombre,
          precio: i.precio, cantidad: i.cantidad,
          esPeso: i.esPeso || false
        })),
        subtotal, descuento: descPct, total, metodoPago,
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        usuario: PS.user.uid
      });

      // Solo descontar stock de productos normales
      this.cart.filter(i => !i.esPeso).forEach(item => {
        const prodRef = bizRef.collection('productos').doc(item.id);
        batch.update(prodRef, {
          stock: firebase.firestore.FieldValue.increment(-item.cantidad)
        });
      });

      await batch.commit();

      // Actualizar stock local
      this.cart.filter(i => !i.esPeso).forEach(item => {
        const p = this.productos.find(p => p.id === item.id);
        if (p) p.stock -= item.cantidad;
      });

      this.cart = [];
      this.renderCart();
      this.updateTotals();
      this.renderProductos();
      showToast(`Venta registrada — ${formatPrice(total)}`, 'success');

    } catch (e) {
      console.error(e);
      showToast('Error al registrar la venta: ' + e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Cobrar';
    }
  },

  // ── Escáner físico (teclado) ──────────────────────────────
  initScanner() {
    this.scanBuffer = '';
    this.scanTimer  = null;

    document.addEventListener('keydown', this._scanHandler = (e) => {
      const active  = document.activeElement;
      const inInput = active && active.tagName === 'INPUT' && active.id !== 'pos-search';
      if (inInput) return;

      if (e.key === 'Enter') {
        if (this.scanBuffer.length >= 4) this.addByCode(this.scanBuffer);
        this.scanBuffer = '';
        clearTimeout(this.scanTimer);
        return;
      }
      if (e.key.length === 1) {
        this.scanBuffer += e.key;
        clearTimeout(this.scanTimer);
        this.scanTimer = setTimeout(() => { this.scanBuffer = ''; }, 300);
      }
    });
  },

  destroyScanner() {
    if (this._scanHandler) {
      document.removeEventListener('keydown', this._scanHandler);
      this._scanHandler = null;
    }
    this.stopCamera();
  }
};
