// ============================================================
// PUNTOSTOCK — Módulo de Ventas (POS) v3
// - Balanza solo en GRAMOS
// - Cámara con linterna (torch) para mobile
// - Teclado físico + escáner + pantalla táctil funcionando juntos
// ============================================================

const Ventas = {
  productos: [],
  productosFiltrados: [],
  cart: [],
  scanBuffer: '',
  scanTimer: null,
  cameraStream: null,
  cameraActive: false,
  torchOn: false,
  _balanzaGramos: '',
  _balanzaProd: null,
  _balanzaPrecio: 0,

  // ── Helper: producto por peso ─────────────────────────────
  _esPeso(p) {
    return p.unidad === 'kg' || p.unidad === 'g';
  },

  // ── Cargar página ─────────────────────────────────────────
  async load() {
    const page = document.getElementById('page-ventas');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando productos...</div>`;
    try {
      const { data: _prods, error: _pe } = await sb
        .from('productos').select('*')
        .eq('business_id', PS.businessId).eq('activo', true);
      if (_pe) throw _pe;
      this.productos = _prods || [];
      this.productosFiltrados = [...this.productos];
      this.cart = [];
      this.render(page);
      this.initScanner();
    } catch (e) {
      page.innerHTML = `<div class="empty-state"><h3>Error al cargar</h3><p>${e.message}</p></div>`;
    }
  },

  // ── Render principal ──────────────────────────────────────
  render(page) {
    page.innerHTML = `
      <div class="pos-layout">
        <div class="pos-left">

          <!-- Barra búsqueda + botones -->
          <div style="display:flex; gap:8px; align-items:center;">
            <div class="pos-search-bar" style="flex:1;">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input type="text" id="pos-search" placeholder="Buscar por nombre o código..."
                oninput="Ventas.filter(this.value)">
            </div>

            <!-- Botón cámara -->
            <button id="btn-camara" onclick="Ventas.toggleCamera()" title="Escanear con cámara"
              style="width:44px; height:44px; background:var(--bg-card); border:1px solid var(--border);
                     border-radius:var(--radius-md); cursor:pointer; display:flex; align-items:center;
                     justify-content:center; flex-shrink:0; transition:all 0.2s; color:var(--text-secondary);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>

            <!-- Botón balanza -->
            <button onclick="Ventas.abrirBalanza()" title="Calculadora de balanza"
              style="width:44px; height:44px; background:var(--bg-card); border:1px solid var(--border);
                     border-radius:var(--radius-md); cursor:pointer; display:flex; align-items:center;
                     justify-content:center; flex-shrink:0; transition:all 0.2s; color:var(--text-secondary);"
              onmouseenter="this.style.borderColor='var(--green-primary)';this.style.color='var(--green-primary)'"
              onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
                <line x1="12" y1="6" x2="12" y2="12"/><line x1="9" y1="9" x2="15" y2="9"/>
                <rect x="7" y="14" width="10" height="4" rx="1"/>
              </svg>
            </button>
          </div>

          <!-- Visor de cámara -->
          <div id="camera-container" style="display:none; position:relative; border-radius:var(--radius-md);
               overflow:hidden; border:2px solid var(--green-primary); background:#000;">
            <video id="camera-video" autoplay playsinline muted
              style="width:100%; max-height:260px; object-fit:cover; display:block;"></video>
            <canvas id="camera-canvas" style="display:none;"></canvas>

            <!-- Marco de escaneo -->
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none;">
              <div style="position:relative; width:220px; height:90px;">
                <div style="position:absolute; inset:0; box-shadow:0 0 0 9999px rgba(0,0,0,0.45); border-radius:4px;"></div>
                <div style="position:absolute; inset:0; border:2px solid var(--green-primary); border-radius:4px;
                             animation: scanPulse 1.5s ease-in-out infinite;"></div>
                <!-- Esquinas -->
                <div style="position:absolute; top:-2px; left:-2px; width:20px; height:20px; border-top:3px solid var(--green-primary); border-left:3px solid var(--green-primary);"></div>
                <div style="position:absolute; top:-2px; right:-2px; width:20px; height:20px; border-top:3px solid var(--green-primary); border-right:3px solid var(--green-primary);"></div>
                <div style="position:absolute; bottom:-2px; left:-2px; width:20px; height:20px; border-bottom:3px solid var(--green-primary); border-left:3px solid var(--green-primary);"></div>
                <div style="position:absolute; bottom:-2px; right:-2px; width:20px; height:20px; border-bottom:3px solid var(--green-primary); border-right:3px solid var(--green-primary);"></div>
                <!-- Línea de escaneo animada -->
                <div id="scan-line" style="position:absolute; left:0; right:0; height:2px;
                     background:linear-gradient(90deg, transparent, var(--green-primary), transparent);
                     animation:scanLine 1.5s ease-in-out infinite;"></div>
              </div>
            </div>

            <!-- Controles de cámara -->
            <div style="position:absolute; top:8px; right:8px; display:flex; gap:6px;">
              <!-- Botón linterna -->
              <button id="btn-torch" onclick="Ventas.toggleTorch()"
                style="background:rgba(0,0,0,0.75); border:2px solid rgba(255,255,255,0.35);
                       color:white; width:48px; height:48px; border-radius:12px;
                       cursor:pointer; display:none; flex-direction:column;
                       align-items:center; justify-content:center; gap:2px;
                       transition:all 0.2s; font-size:20px; line-height:1;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 7 7c0 2.6-1.4 4.9-3.5 6.2V17a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-1.8A7 7 0 0 1 12 2z"/>
                </svg>
                <span id="torch-label" style="font-size:9px; font-weight:800; letter-spacing:0.5px;">OFF</span>
              </button>
              <!-- Cerrar cámara -->
              <button onclick="Ventas.stopCamera()"
                style="background:rgba(0,0,0,0.75); border:2px solid rgba(255,255,255,0.35);
                       color:white; width:48px; height:48px; border-radius:12px;
                       cursor:pointer; display:flex; align-items:center; justify-content:center;
                       font-size:20px; transition:all 0.2s;"
                onmouseenter="this.style.background='rgba(248,81,73,0.8)'"
                onmouseleave="this.style.background='rgba(0,0,0,0.75)'">
                ✕
              </button>
            </div>

            <!-- Status -->
            <div id="camera-status"
              style="position:absolute; bottom:0; left:0; right:0; padding:8px 12px;
                     background:linear-gradient(transparent, rgba(0,0,0,0.8)); text-align:center;
                     font-size:12px; font-weight:600; color:white;">
              Apuntá el código de barras al recuadro
            </div>
          </div>

          <!-- Animaciones CSS para la cámara -->
          <style>
            @keyframes scanLine {
              0%   { top: 0; opacity: 1; }
              50%  { top: calc(100% - 2px); opacity: 1; }
              100% { top: 0; opacity: 1; }
            }
            @keyframes scanPulse {
              0%, 100% { border-color: var(--green-primary); }
              50%       { border-color: var(--green-bright); box-shadow: 0 0 8px rgba(126,211,33,0.4); }
            }
          </style>

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
              <span>Subtotal</span><span id="cart-subtotal">$0</span>
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
              <span>TOTAL</span><span id="cart-total">$0</span>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">
              ${Ventas._renderMetodosPago()}
            </div>

            <div id="efectivo-section" style="display:none; margin-bottom:10px;">
              <label>Monto recibido</label>
              <input type="number" id="monto-recibido" style="margin-top:4px;" oninput="Ventas.calcVuelto()">
              <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:12px;">
                <span style="color:var(--text-secondary);">Vuelto:</span>
                <span id="vuelto-val" style="font-family:var(--font-mono); font-weight:700; color:var(--green-primary);">$0</span>
              </div>
            </div>

            <div id="consumo-empleado-section" style="display:none; margin-bottom:10px;">
              <label style="font-size:11px; font-weight:700; color:var(--purple); text-transform:uppercase; letter-spacing:.05em;">Elegir empleada</label>
              <select id="consumo-empleada-sel"
                style="width:100%; margin-top:6px; padding:8px 10px; background:var(--bg-card);
                border:1px solid var(--purple); border-radius:var(--radius-md);
                color:var(--text-primary); font-family:var(--font); font-size:13px; cursor:pointer;">
                <option value="">Cargando empleadas...</option>
              </select>
            </div>

            <button class="cobrar-btn" id="cobrar-btn" onclick="Ventas.cobrar()" disabled
              style="display:flex; align-items:center; justify-content:center; gap:8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              Cobrar
            </button>
            <button class="btn btn-ghost w-full mt-8" onclick="Ventas.clearCart()"
              style="font-size:12px; display:flex; align-items:center; justify-content:center; gap:6px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
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
    const el = document.getElementById('pos-cats');
    if (!el) return;
    el.innerHTML = cats.map((c, i) => `
      <button class="btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-secondary'}"
        onclick="Ventas.filterCat('${c}', this)">${c}</button>
    `).join('');
  },

  filterCat(cat, btn) {
    document.querySelectorAll('#pos-cats .btn').forEach(b =>
      b.className = b === btn ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary'
    );
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

  // ── Productos grid ────────────────────────────────────────
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
        </div>`;
      return;
    }

    grid.innerHTML = this.productosFiltrados.map(p => {
      const esPeso  = this._esPeso(p);
      const noStock = !esPeso && (p.stock || 0) <= 0;
      const onclick = noStock ? '' : esPeso
        ? `Ventas.abrirBalanza('${p.id}')`
        : `Ventas.addToCart('${p.id}')`;

      return `
        <div class="product-card ${noStock ? 'no-stock' : ''}"
             onclick="${onclick}" title="${p.nombre}">
          <div class="product-icon" style="margin:0 auto 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              ${this._getIcon(p.categoria || '')}
            </svg>
          </div>
          <div class="product-name">${p.nombre}</div>
          <div class="product-price">
            ${formatPrice(p.precio)}${esPeso ? '/kg' : ''}
          </div>
          <div class="product-stock-label">
            ${noStock ? 'Sin stock' : esPeso ? 'Por peso' : `${p.stock} en stock`}
          </div>
          ${esPeso ? `<div style="margin-top:4px;">
            <span style="font-size:9px; background:rgba(126,211,33,0.15); color:var(--green-primary);
                         padding:2px 7px; border-radius:4px; font-weight:700; letter-spacing:0.5px;">
              BALANZA
            </span>
          </div>` : ''}
        </div>
      `;
    }).join('');
  },

  _getIcon(cat) {
    cat = cat.toLowerCase();
    if (cat.includes('ropa') || cat.includes('indument'))
      return '<path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>';
    if (cat.includes('fiambre') || cat.includes('queso') || cat.includes('carne') || cat.includes('deli'))
      return '<path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="9" y1="9" x2="15" y2="9"/><rect x="7" y="14" width="10" height="4" rx="1"/>';
    if (cat.includes('bebida'))
      return '<path d="M8 2h8l1 7H7L8 2z"/><path d="M7 9c0 5 2 9 5 9s5-4 5-9"/>';
    if (cat.includes('electro') || cat.includes('tecno'))
      return '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>';
    return '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>';
  },

  // ════════════════════════════════════════════════════════
  // CALCULADORA DE BALANZA — solo en GRAMOS
  // ════════════════════════════════════════════════════════
  abrirBalanza(prodId) {
    const prodsPeso = this.productos.filter(p => this._esPeso(p));
    const lista = prodsPeso.length > 0 ? prodsPeso : this.productos;
    const opciones = lista.map(p =>
      `<option value="${p.id}" ${p.id === prodId ? 'selected' : ''}>
        ${p.nombre} — ${formatPrice(p.precio)}/kg
      </option>`
    ).join('');

    openModal(`
      <div class="modal-header">
        <h3 class="modal-title" style="display:flex; align-items:center; gap:10px;">
          <div style="width:36px; height:36px; background:var(--green-muted); border-radius:8px;
                      display:flex; align-items:center; justify-content:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" stroke-width="1.8">
              <path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
              <line x1="12" y1="6" x2="12" y2="12"/><line x1="9" y1="9" x2="15" y2="9"/>
              <rect x="7" y="14" width="10" height="4" rx="1"/>
            </svg>
          </div>
          Calculadora de balanza
        </h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <div class="form-group">
        <label>Producto</label>
        <select id="balanza-prod" onchange="Ventas.balanzaCalc()">
          ${opciones || '<option value="">Sin productos por peso</option>'}
        </select>
      </div>

      <!-- Display -->
      <div style="background:var(--bg-primary); border:2px solid var(--border-green);
                  border-radius:var(--radius-lg); padding:24px; margin:16px 0;
                  text-align:center; font-family:var(--font-mono);">
        <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase;
                    letter-spacing:1.5px; margin-bottom:6px;">Peso</div>
        <div id="balanza-display"
          style="font-size:56px; font-weight:900; color:var(--green-primary);
                 letter-spacing:3px; line-height:1; transition:all 0.1s;">0</div>
        <div style="font-size:16px; color:var(--text-secondary); margin-top:4px; font-weight:600;">
          gramos
        </div>
        <div style="margin-top:12px; display:flex; align-items:center; justify-content:center;
                    gap:6px; font-size:11px; color:var(--text-muted);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Teclado físico · Escáner · Pantalla · Enter = agregar · Esc = borrar
        </div>
      </div>

      <!-- Teclado en pantalla -->
      <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px;">
        ${[7,8,9,4,5,6,1,2,3].map(n => `
          <button id="bkey-${n}" onclick="Ventas.balanzaKey('${n}')"
            style="padding:18px; font-size:24px; font-weight:700; font-family:var(--font-mono);
                   background:var(--bg-card); border:1px solid var(--border);
                   border-radius:var(--radius-md); cursor:pointer; color:var(--text-primary);
                   transition:all 0.12s; user-select:none;"
            onmousedown="this.style.background='var(--green-muted)';this.style.borderColor='var(--green-primary)'"
            onmouseup="this.style.background='var(--bg-card)';this.style.borderColor='var(--border)'"
            ontouchstart="this.style.background='var(--green-muted)';this.style.borderColor='var(--green-primary)'"
            ontouchend="this.style.background='var(--bg-card)';this.style.borderColor='var(--border)'">
            ${n}
          </button>
        `).join('')}
        <!-- Fila inferior: C · 0 · ⌫ -->
        <button id="bkey-C" onclick="Ventas.balanzaKey('C')"
          style="padding:18px; font-size:18px; font-weight:800;
                 background:rgba(248,81,73,0.08); border:1px solid rgba(248,81,73,0.2);
                 border-radius:var(--radius-md); cursor:pointer; color:var(--red);
                 transition:all 0.12s; user-select:none;"
          onmousedown="this.style.background='rgba(248,81,73,0.2)'"
          onmouseup="this.style.background='rgba(248,81,73,0.08)'"
          ontouchstart="this.style.background='rgba(248,81,73,0.2)'"
          ontouchend="this.style.background='rgba(248,81,73,0.08)'">C</button>
        <button id="bkey-0" onclick="Ventas.balanzaKey('0')"
          style="padding:18px; font-size:24px; font-weight:700; font-family:var(--font-mono);
                 background:var(--bg-card); border:1px solid var(--border);
                 border-radius:var(--radius-md); cursor:pointer; color:var(--text-primary);
                 transition:all 0.12s; user-select:none;"
          onmousedown="this.style.background='var(--green-muted)';this.style.borderColor='var(--green-primary)'"
          onmouseup="this.style.background='var(--bg-card)';this.style.borderColor='var(--border)'"
          ontouchstart="this.style.background='var(--green-muted)';this.style.borderColor='var(--green-primary)'"
          ontouchend="this.style.background='var(--bg-card)';this.style.borderColor='var(--border)'">0</button>
        <button id="bkey-del" onclick="Ventas.balanzaKey('⌫')"
          style="padding:18px; font-size:20px; font-weight:700;
                 background:var(--bg-card); border:1px solid var(--border);
                 border-radius:var(--radius-md); cursor:pointer; color:var(--text-secondary);
                 transition:all 0.12s; user-select:none;"
          onmousedown="this.style.background='var(--bg-hover)'"
          onmouseup="this.style.background='var(--bg-card)'"
          ontouchstart="this.style.background='var(--bg-hover)'"
          ontouchend="this.style.background='var(--bg-card)'">⌫</button>
      </div>

      <!-- Pesos frecuentes -->
      <div style="margin-bottom:16px;">
        <div style="font-size:10px; color:var(--text-muted); font-weight:700;
                    text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px;">
          Pesos frecuentes
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${[100,150,200,250,300,400,500,750,1000].map(g => `
            <button onclick="Ventas.balanzaSet('${g}')"
              style="padding:7px 13px; font-size:12px; font-weight:700; font-family:var(--font-mono);
                     background:var(--bg-card); border:1px solid var(--border); border-radius:6px;
                     cursor:pointer; color:var(--text-secondary); transition:all 0.15s; user-select:none;"
              onmouseenter="this.style.borderColor='var(--green-primary)';this.style.color='var(--green-primary)'"
              onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
              ${g >= 1000 ? (g/1000)+'kg' : g+'g'}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Resultado -->
      <div id="balanza-resultado" style="background:var(--green-muted); border:1px solid var(--border-green);
           border-radius:var(--radius-md); padding:16px; text-align:center; display:none; margin-bottom:4px;">
        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;">Precio a cobrar</div>
        <div id="balanza-precio" style="font-size:34px; font-weight:900; font-family:var(--font-mono);
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

    // Resetear estado
    this._balanzaGramos = '';
    this._balanzaProd   = null;
    this._balanzaPrecio = 0;
    this.balanzaCalc();
  },

  // Tecla del teclado en pantalla o físico
  balanzaKey(key) {
    if (key === 'C' || key === 'Escape') {
      this._balanzaGramos = '';
    } else if (key === '⌫' || key === 'Backspace' || key === 'Delete') {
      this._balanzaGramos = this._balanzaGramos.slice(0, -1);
    } else if (/^\d$/.test(key)) {
      if (this._balanzaGramos.length >= 6) return; // max 999999g
      this._balanzaGramos += key;
    } else {
      return;
    }

    const display = document.getElementById('balanza-display');
    if (display) {
      display.textContent = this._balanzaGramos || '0';
      // Flash verde al escribir
      display.style.color = 'var(--green-bright)';
      setTimeout(() => { display.style.color = 'var(--green-primary)'; }, 80);
    }
    this.balanzaCalc();
  },

  // Botones de peso frecuente
  balanzaSet(gramos) {
    this._balanzaGramos = String(gramos);
    const display = document.getElementById('balanza-display');
    if (display) display.textContent = this._balanzaGramos;
    this.balanzaCalc();
  },

  // Calcular precio en tiempo real
  balanzaCalc() {
    const gramos    = parseInt(this._balanzaGramos) || 0;
    const prodId    = document.getElementById('balanza-prod')?.value;
    const prod      = this.productos.find(p => p.id === prodId);
    const resultado = document.getElementById('balanza-resultado');
    const precioEl  = document.getElementById('balanza-precio');
    const detalleEl = document.getElementById('balanza-detalle');
    const btnAgr    = document.getElementById('balanza-agregar-btn');

    if (!prod || gramos <= 0) {
      if (resultado) resultado.style.display = 'none';
      if (btnAgr) btnAgr.disabled = true;
      return;
    }

    // precio del producto = precio por KG
    // gramos → precio = (precio/1000) * gramos
    const precioPorGramo = prod.precio / 1000;
    const precioTotal    = Math.round(precioPorGramo * gramos);

    if (resultado) resultado.style.display = 'block';
    if (precioEl)  precioEl.textContent = formatPrice(precioTotal);
    if (detalleEl) detalleEl.textContent =
      `${gramos}g de ${prod.nombre} · ${formatPrice(prod.precio)}/kg`;
    if (btnAgr) {
      btnAgr.disabled = false;
      btnAgr.textContent = `Agregar ${formatPrice(precioTotal)}`;
    }

    this._balanzaProd   = prod;
    this._balanzaPrecio = precioTotal;
  },

  // Confirmar y agregar al carrito
  balanzaAgregar() {
    if (!this._balanzaProd || !this._balanzaGramos) return;
    const gramos = parseInt(this._balanzaGramos) || 0;
    if (gramos <= 0) { showToast('Ingresá el peso en gramos', 'warning'); return; }

    const itemId = `${this._balanzaProd.id}_${Date.now()}`;
    this.cart.push({
      id:       itemId,
      prodId:   this._balanzaProd.id,
      nombre:   `${this._balanzaProd.nombre} (${gramos}g)`,
      precio:   this._balanzaPrecio,
      cantidad: 1,
      esPeso:   true,
      stockMax: 9999
    });

    this.renderCart();
    this.updateTotals();
    closeModal();
    showToast(`${this._balanzaProd.nombre} ${gramos}g — ${formatPrice(this._balanzaPrecio)} agregado`, 'success');
  },

  // ════════════════════════════════════════════════════════
  // CÁMARA con linterna (torch)
  // ════════════════════════════════════════════════════════
  async toggleCamera() {
    this.cameraActive ? this.stopCamera() : await this.startCamera();
  },

  async startCamera() {
    const container = document.getElementById('camera-container');
    const video     = document.getElementById('camera-video');
    const btn       = document.getElementById('btn-camara');
    const status    = document.getElementById('camera-status');
    if (!container || !video) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      this.cameraStream = stream;
      this.cameraActive = true;
      this.torchOn = false;
      video.srcObject = stream;
      container.style.display = 'block';

      if (btn) {
        btn.style.borderColor = 'var(--green-primary)';
        btn.style.color       = 'var(--green-primary)';
        btn.style.background  = 'var(--green-muted)';
      }

      const track = stream.getVideoTracks()[0];
      this._videoTrack = track;

      // Forzar autofocus continuo
      await this._aplicarFoco(track);

      // Mostrar linterna siempre — detectamos soporte al usarla
      const torchBtn = document.getElementById('btn-torch');
      if (torchBtn) torchBtn.style.display = 'flex';

      if (status) status.textContent = 'Apuntá el código al recuadro';
      this.startCameraScan(video);

    } catch (e) {
      console.error('Camera error:', e);
      if (e.name === 'NotAllowedError') {
        showToast('Permiso de cámara denegado. Habilitalo en la configuración del navegador.', 'error', 5000);
      } else {
        showToast('No se pudo acceder a la cámara: ' + e.message, 'error');
      }
    }
  },

  // Autofocus continuo + zoom mínimo para códigos chicos
  async _aplicarFoco(track) {
    try {
      const caps = track.getCapabilities?.() || {};
      const constraints = {};

      // Autofocus continuo
      if (caps.focusMode?.includes('continuous')) {
        constraints.focusMode = 'continuous';
      }

      // Zoom al mínimo (máxima área = mejor para códigos chicos)
      if (caps.zoom) {
        constraints.zoom = caps.zoom.min;
      }

      if (Object.keys(constraints).length) {
        await track.applyConstraints({ advanced: [constraints] });
      }
    } catch(e) { /* dispositivo no soporta — ok */ }
  },

  // Re-enfocar manualmente al tocar el video
  async _refocar(track) {
    try {
      const caps = track.getCapabilities?.() || {};
      if (caps.focusMode?.includes('single-shot')) {
        await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
        await new Promise(r => setTimeout(r, 400));
        if (caps.focusMode?.includes('continuous')) {
          await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
        }
      }
    } catch(e) {}
  },

  // Encender/apagar linterna
  async toggleTorch() {
    // Buscar el track activo — puede haber cambiado si h5q tomó control
    const track = this._videoTrack
      || this.cameraStream?.getVideoTracks()[0]
      || null;

    if (!track) {
      showToast('Cámara no activa', 'warning');
      return;
    }

    const torchBtn   = document.getElementById('btn-torch');
    const torchLabel = document.getElementById('torch-label');

    // Verificar soporte AHORA (después de que el track esté activo)
    const caps = track.getCapabilities?.() || {};
    if (!caps.torch) {
      // Algunos dispositivos no reportan torch en getCapabilities pero sí lo soportan
      // Intentamos igual
    }

    try {
      this.torchOn = !this.torchOn;
      await track.applyConstraints({ advanced: [{ torch: this.torchOn }] });

      if (torchBtn) {
        torchBtn.style.background  = this.torchOn ? 'rgba(126,211,33,0.85)' : 'rgba(0,0,0,0.75)';
        torchBtn.style.borderColor = this.torchOn ? 'var(--green-primary)' : 'rgba(255,255,255,0.35)';
        torchBtn.style.color       = this.torchOn ? '#0D1117' : 'white';
      }
      if (torchLabel) torchLabel.textContent = this.torchOn ? 'ON' : 'OFF';

    } catch (e) {
      this.torchOn = false;
      if (torchBtn) {
        torchBtn.style.background  = 'rgba(0,0,0,0.75)';
        torchBtn.style.borderColor = 'rgba(255,255,255,0.35)';
        torchBtn.style.color       = 'white';
      }
      if (torchLabel) torchLabel.textContent = 'OFF';
      showToast('Este dispositivo no soporta linterna desde el navegador', 'warning');
    }
  },

  _loadScanLib() {
    return new Promise((resolve) => {
      // Intentar BarcodeDetector nativo (Chrome Android, Edge) — el más rápido
      if (window.BarcodeDetector) { resolve('native'); return; }
      // Fallback: html5-qrcode (más confiable que ZXing UMD)
      if (window.Html5Qrcode) { resolve('h5q'); return; }
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js';
      s.onload  = () => resolve('h5q');
      s.onerror = () => {
        // último recurso: ZXing
        const z = document.createElement('script');
        z.src = 'https://unpkg.com/@zxing/library@0.18.6/umd/index.min.js';
        z.onload  = () => resolve('zxing');
        z.onerror = () => resolve(null);
        document.head.appendChild(z);
      };
      document.head.appendChild(s);
    });
  },

  async startCameraScan(video) {
    const status = document.getElementById('camera-status');

    // Tap en el video = re-enfocar
    video.onclick = () => {
      if (this._videoTrack) this._refocar(this._videoTrack);
      if (status) { status.textContent = 'Enfocando...'; setTimeout(() => { if(status) status.textContent = 'Apuntá el código al recuadro'; }, 800); }
    };

    const lib = await this._loadScanLib();
    if (!lib) {
      if (status) status.textContent = 'Lector no disponible. Usá el escáner físico.';
      return;
    }
    if (status) status.textContent = 'Apuntá el código al recuadro';

    // Helper: recortar solo el centro del frame (donde está el recuadro guía)
    // Esto mejora mucho el reconocimiento de códigos chicos
    const _cropCenter = (canvas, ctx, vw, vh) => {
      // Recortar el 60% central horizontalmente y 40% vertical central
      const cw = Math.floor(vw * 0.65);
      const ch = Math.floor(vh * 0.45);
      const cx = Math.floor((vw - cw) / 2);
      const cy = Math.floor((vh - ch) / 2);
      canvas.width  = cw;
      canvas.height = ch;
      ctx.drawImage(video, cx, cy, cw, ch, 0, 0, cw, ch);
    };

    const _onCode = (code, now) => {
      if (status) status.textContent = `✓ ${code}`;
      this._beep(); this.stopCamera(); this.addByCode(code);
    };

    // ── Opción A: BarcodeDetector nativo ──────────────────────
    if (lib === 'native') {
      const detector = new BarcodeDetector({
        formats: ['ean_13','ean_8','code_128','code_39','upc_a','upc_e','qr_code','itf','codabar','data_matrix']
      });
      const canvas = document.getElementById('camera-canvas');
      const ctx    = canvas.getContext('2d');
      let lastCode = '', lastTime = 0, frame = 0;
      this._scanInterval = setInterval(async () => {
        if (!this.cameraActive || video.readyState < 2) return;
        try {
          // Alternar: frames pares = frame completo, impares = centro recortado
          // Esto cubre códigos grandes y chicos
          frame++;
          const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
          if (frame % 2 === 0) {
            canvas.width = vw; canvas.height = vh;
            ctx.drawImage(video, 0, 0, vw, vh);
          } else {
            _cropCenter(canvas, ctx, vw, vh);
          }
          const barcodes = await detector.detect(canvas);
          if (!barcodes.length) return;
          const code = barcodes[0].rawValue, now = Date.now();
          if (code === lastCode && now - lastTime < 2000) return;
          lastCode = code; lastTime = now;
          _onCode(code);
        } catch(e) {}
      }, 150);
      return;
    }

    // ── Opción B: html5-qrcode sobre el stream ────────────────
    if (lib === 'h5q') {
      clearInterval(this._scanInterval);
      this._scanInterval = null;
      await this._startH5QScan(status);
      return;
    }

    // ── Opción C: ZXing fallback con crop central ─────────────
    if (lib === 'zxing' && window.ZXing) {
      const canvas = document.getElementById('camera-canvas');
      const ctx    = canvas.getContext('2d');
      const hints  = new Map();
      hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
        ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
        ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39,
        ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E,
        ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.ITF, ZXing.BarcodeFormat.CODABAR
      ]);
      hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
      const reader = new ZXing.MultiFormatReader();
      reader.setHints(hints);
      let lastCode = '', lastTime = 0, frame = 0;
      this._scanInterval = setInterval(() => {
        if (!this.cameraActive || video.readyState < 2) return;
        try {
          frame++;
          const vw = video.videoWidth || 640, vh = video.videoHeight || 480;
          if (frame % 2 === 0) { canvas.width=vw; canvas.height=vh; ctx.drawImage(video,0,0,vw,vh); }
          else { _cropCenter(canvas, ctx, vw, vh); }
          const imgData   = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const luminance = new ZXing.RGBLuminanceSource(imgData.data, canvas.width, canvas.height);
          const bitmap    = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminance));
          const result    = reader.decode(bitmap);
          if (result) {
            const code = result.getText(), now = Date.now();
            if (code === lastCode && now - lastTime < 2000) return;
            lastCode = code; lastTime = now;
            _onCode(code);
          }
        } catch(e) {}
      }, 150);
    }
  },

  async _startH5QScan(status) {
    // Parar la cámara actual y dejar que html5-qrcode maneje todo
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
    const container = document.getElementById('camera-container');
    // Crear div temporal para html5-qrcode
    let scanDiv = document.getElementById('h5q-scan-region');
    if (!scanDiv) {
      scanDiv = document.createElement('div');
      scanDiv.id = 'h5q-scan-region';
      scanDiv.style.cssText = 'width:100%;';
      container.prepend(scanDiv);
    }
    // Ocultar el video original
    const video = document.getElementById('camera-video');
    if (video) video.style.display = 'none';

    const html5QrCode = new Html5Qrcode('h5q-scan-region');
    this._h5qInstance = html5QrCode;
    this.cameraActive = true;

    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR, Html5QrcodeSupportedFormats.DATA_MATRIX
          ]
        },
        (code) => {
          if (status) status.textContent = `Código: ${code}`;
          this._beep();
          this.stopCamera();
          this.addByCode(code);
        },
        () => {} // error silencioso por frame
      );
    } catch(e) {
      if (status) status.textContent = 'Error al iniciar escáner: ' + e;
    }
  },

  _beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) { /* sin audio = ok */ }
  },

  stopCamera() {
    // Parar html5-qrcode si está activo
    if (this._h5qInstance) {
      this._h5qInstance.stop().catch(() => {});
      this._h5qInstance = null;
      const scanDiv = document.getElementById('h5q-scan-region');
      if (scanDiv) scanDiv.remove();
      const video = document.getElementById('camera-video');
      if (video) video.style.display = '';
    }
    // Apagar linterna antes de cerrar
    if (this._videoTrack && this.torchOn) {
      this._videoTrack.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
    if (this._scanInterval) {
      clearInterval(this._scanInterval);
      this._scanInterval = null;
    }
    this.cameraActive = false;
    this.torchOn = false;
    this._videoTrack = null;

    const container = document.getElementById('camera-container');
    const btn       = document.getElementById('btn-camara');
    if (container) container.style.display = 'none';
    if (btn) {
      btn.style.borderColor = 'var(--border)';
      btn.style.color       = 'var(--text-secondary)';
      btn.style.background  = 'var(--bg-card)';
    }
  },

  // ════════════════════════════════════════════════════════
  // CARRITO
  // ════════════════════════════════════════════════════════
  addToCart(prodId) {
    const prod = this.productos.find(p => p.id === prodId);
    if (!prod || prod.stock <= 0) { showToast('Sin stock', 'error'); return; }
    const existing = this.cart.find(i => i.id === prodId);
    if (existing) {
      if (existing.cantidad >= prod.stock) {
        showToast('Máximo ' + prod.stock + ' unidades', 'warning'); return;
      }
      existing.cantidad++;
    } else {
      this.cart.push({
        id: prodId, nombre: prod.nombre, precio: prod.precio,
        cantidad: 1, stockMax: prod.stock,
        promo: prod.promo || null
      });
      // Mostrar alerta de promo la primera vez que se agrega
      if (prod.promo?.activa && prod.promo?.tipo) {
        this.renderCart();
        this.updateTotals();
        this._mostrarAlertaPromo(prod);
        return;
      }
    }
    this.renderCart();
    this.updateTotals();
  },

  addByCode(code) {
    const prod = this.productos.find(p => p.codigo === code || p.codigoBarra === code);
    if (prod) {
      if (this._esPeso(prod)) {
        this.abrirBalanza(prod.id);
      } else {
        this.addToCart(prod.id);
        // Alerta de promo si el producto tiene una activa
        if (prod.promo?.activa && prod.promo?.tipo) {
          this._mostrarAlertaPromo(prod);
        } else {
          showToast(`${prod.nombre} agregado`, 'success', 1500);
        }
      }
    } else {
      // Código no encontrado → ofrecer registrar el producto
      this.mostrarProductoNoEncontrado(code);
    }
  },

  _mostrarAlertaPromo(prod) {
    const promoLabels = {
      '2x1':    { titulo: '¡2x1!',           desc: 'Llevás 2 unidades y pagás 1.',         color: '#7ED321', bg: 'rgba(126,211,33,0.1)',  border: 'rgba(126,211,33,0.35)' },
      '3x1':    { titulo: '¡3x1!',           desc: 'Llevás 3 unidades y pagás 1.',         color: '#7ED321', bg: 'rgba(126,211,33,0.1)',  border: 'rgba(126,211,33,0.35)' },
      '4x1':    { titulo: '¡4x1!',           desc: 'Llevás 4 unidades y pagás 1.',         color: '#7ED321', bg: 'rgba(126,211,33,0.1)',  border: 'rgba(126,211,33,0.35)' },
      '50off2': { titulo: '¡50% en la 2da!', desc: 'La segunda unidad tiene 50% de dto.', color: '#F0A500', bg: 'rgba(240,165,0,0.1)',   border: 'rgba(240,165,0,0.35)'  },
      '30off':  { titulo: '¡30% OFF!',       desc: '30% de descuento en este producto.',   color: '#F0A500', bg: 'rgba(240,165,0,0.1)',   border: 'rgba(240,165,0,0.35)'  },
      'custom': { titulo: '¡Promoción!',     desc: prod.promo?.texto || 'Tiene promo especial.', color: '#7ED321', bg: 'rgba(126,211,33,0.1)', border: 'rgba(126,211,33,0.35)' },
    };
    const info = promoLabels[prod.promo.tipo] || promoLabels['custom'];

    openModal(`
      <div style="text-align:center; padding:8px 0 16px;">
        <!-- Icono promo -->
        <div style="width:64px; height:64px; background:${info.bg}; border:2px solid ${info.border};
                    border-radius:50%; display:flex; align-items:center; justify-content:center;
                    margin:0 auto 16px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${info.color}" stroke-width="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
            <line x1="7" y1="7" x2="7.01" y2="7"/>
          </svg>
        </div>

        <div style="font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase;
                    color:${info.color}; margin-bottom:6px;">Promoción activa</div>
        <h3 style="font-size:26px; font-weight:900; margin-bottom:6px; color:var(--text-primary);">
          ${info.titulo}
        </h3>
        <div style="font-size:14px; color:var(--text-secondary); margin-bottom:4px;">
          <strong style="color:var(--text-primary);">${prod.nombre}</strong>
        </div>
        <div style="font-size:13px; color:var(--text-secondary); line-height:1.5; margin-bottom:24px;">
          ${info.desc}
        </div>

        <button onclick="Ventas._aplicarPromo('${prod.id}', '${prod.promo.tipo}'); closeModal();"
          class="btn btn-primary w-full"
          style="font-size:15px; padding:14px; font-weight:700;">
          Aplicar promo
        </button>
        <button onclick="closeModal()" class="btn btn-secondary w-full"
          style="font-size:13px; padding:10px; margin-top:8px;">
          Sin promo (precio normal)
        </button>
      </div>
    `);
  },

  _aplicarPromo(prodId, tipo) {
    const item = this.cart.find(i => i.id === prodId);
    if (!item) return;
    const prod = this.productos.find(p => p.id === prodId);
    if (!prod) return;

    // Reglas por tipo de promo
    if (tipo === '2x1') {
      // Llevar 2, pagar 1 → agrega 1 unidad gratis (precio 0 en el carrito)
      const gratis = this.cart.find(i => i.id === prodId + '_promo');
      if (!gratis) {
        this.cart.push({ id: prodId + '_promo', nombre: prod.nombre + ' (2x1 gratis)', precio: 0, cantidad: 1, stockMax: prod.stock, esPromo: true });
      }
    } else if (tipo === '3x1') {
      // Llevar 3, pagar 1 → agrega 2 gratis
      const gratis = this.cart.find(i => i.id === prodId + '_promo');
      if (!gratis) {
        this.cart.push({ id: prodId + '_promo', nombre: prod.nombre + ' (3x1 gratis x2)', precio: 0, cantidad: 2, stockMax: prod.stock, esPromo: true });
      }
    } else if (tipo === '4x1') {
      const gratis = this.cart.find(i => i.id === prodId + '_promo');
      if (!gratis) {
        this.cart.push({ id: prodId + '_promo', nombre: prod.nombre + ' (4x1 gratis x3)', precio: 0, cantidad: 3, stockMax: prod.stock, esPromo: true });
      }
    } else if (tipo === '50off2') {
      // La 2da unidad al 50% → agregar 1 unidad al 50%
      const mitad = this.cart.find(i => i.id === prodId + '_promo');
      if (!mitad) {
        this.cart.push({ id: prodId + '_promo', nombre: prod.nombre + ' (50% dto.)', precio: prod.precio * 0.5, cantidad: 1, stockMax: prod.stock, esPromo: true });
      }
    } else if (tipo === '30off') {
      // 30% off sobre el precio del item actual
      item.precio = prod.precio * 0.7;
    }

    showToast('Promo aplicada', 'success', 1500);
    this.renderCart();
    this.updateTotals();
  },

  mostrarProductoNoEncontrado(code) {
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Código no encontrado</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <div style="background:rgba(240,165,0,0.08); border:1px solid rgba(240,165,0,0.25);
                  border-radius:var(--radius-md); padding:14px 16px; margin-bottom:20px;
                  display:flex; align-items:center; gap:10px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2" style="flex-shrink:0;">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <div style="font-weight:700; font-size:13px; color:var(--orange);">Código no encontrado en el sistema</div>
          <div style="font-size:12px; color:var(--text-secondary); margin-top:2px; font-family:var(--font-mono);">${code}</div>
        </div>
      </div>

      <p style="font-size:13px; color:var(--text-secondary); margin-bottom:20px; line-height:1.6;">
        ¿Querés registrar este producto ahora y agregarlo al carrito?
      </p>

      <!-- Formulario rápido -->
      <div class="form-group">
        <label>Nombre del producto *</label>
        <input type="text" id="nf-nombre" placeholder="Ej: Galletitas Oreo" autofocus>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label>Precio de venta *</label>
          <div style="position:relative;">
            <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%);
                         color:var(--text-muted); font-weight:600;">$</span>
            <input type="number" id="nf-precio" min="0" step="0.01" style="padding-left:26px;">
          </div>
        </div>
        <div class="form-group">
          <label>Stock inicial</label>
          <input type="number" id="nf-stock" value="1" min="0">
        </div>
      </div>
      <div class="form-group">
        <label>Categoría</label>
        <input type="text" id="nf-cat" placeholder="Ej: Almacén">
      </div>

      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md);
                  padding:10px 14px; font-size:12px; color:var(--text-secondary); margin-bottom:4px;">
        El código <strong style="font-family:var(--font-mono); color:var(--text-primary);">${code}</strong>
        se guardará como código de barras del producto.
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" style="width:auto;"
          onclick="Ventas.registrarYAgregar('${code}')">
          Registrar y agregar al carrito
        </button>
      </div>
    `);
  },

  async registrarYAgregar(code) {
    const nombre = document.getElementById('nf-nombre')?.value.trim();
    const precio = parseFloat(document.getElementById('nf-precio')?.value);
    const stock  = parseInt(document.getElementById('nf-stock')?.value) || 0;
    const cat    = document.getElementById('nf-cat')?.value.trim();

    if (!nombre) { showToast('Ingresá el nombre del producto', 'warning'); return; }
    if (!precio || precio <= 0) { showToast('Ingresá un precio válido', 'warning'); return; }

    try {
      const { data: _newProd, error: _np } = await sb.from('productos').insert({
        business_id: PS.businessId,
        nombre, precio, stock, activo: true,
        codigo: code, categoria: cat || '', unidad: 'unidad'
      }).select().single();
      if (_np) throw _np;
      const ref = { id: _newProd.id };

      // Agregar al array local
      const newProd = { ..._newProd };
      this.productos.push(newProd);
      this.productosFiltrados = [...this.productos];
      this.renderProductos();

      // Agregar al carrito directamente
      this.cart.push({ id: ref.id, nombre, precio, cantidad: 1, stockMax: Math.max(stock, 999) });
      this.renderCart();
      this.updateTotals();

      closeModal();
      showToast(`${nombre} registrado y agregado al carrito`, 'success');

    } catch (e) {
      showToast('Error al registrar: ' + e.message, 'error');
    }
  },

  changeQty(id, delta) {
    const item = this.cart.find(i => i.id === id);
    if (!item) return;
    if (item.esPeso) {
      if (delta < 0) this.cart = this.cart.filter(i => i.id !== id);
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
        ${item.esPeso ? '' : `
          <div class="qty-control">
            <button class="qty-btn" onclick="Ventas.changeQty('${item.id}', -1)">−</button>
            <span class="qty-value">${item.cantidad}</span>
            <button class="qty-btn" onclick="Ventas.changeQty('${item.id}', 1)">+</button>
          </div>
        `}
        <div style="font-family:var(--font-mono); font-size:13px; font-weight:700;
                    color:var(--green-primary); min-width:70px; text-align:right;">
          ${formatPrice(item.esPeso ? item.precio : item.precio * item.cantidad)}
        </div>
        <button class="cart-remove" onclick="Ventas.removeFromCart('${item.id}')">✕</button>
      </div>
    `).join('');

    const btn = document.getElementById('cobrar-btn');
    if (btn) btn.disabled = false;
  },

  updateTotals() {
    const subtotal = this.cart.reduce((s, i) =>
      s + (i.esPeso ? i.precio : i.precio * i.cantidad), 0
    );
    const descPct = parseFloat(document.getElementById('cart-descuento')?.value || 0);
    const total   = subtotal * (1 - descPct / 100);
    const subEl   = document.getElementById('cart-subtotal');
    const totEl   = document.getElementById('cart-total');
    if (subEl) subEl.textContent = formatPrice(subtotal);
    if (totEl) totEl.textContent = formatPrice(total);
    const btn = document.getElementById('cobrar-btn');
    if (btn && this.cart.length > 0) btn.textContent = `Cobrar ${formatPrice(total)}`;
    this.calcVuelto();
  },

  _pyLogo(bg) {
    return '<svg width="22" height="22" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="512" height="512" rx="100" fill="' + bg + '"/>'
      + '<path fill="white" d="M154 104h103c59 0 102 39 102 92 0 53-43 92-102 92h-54v58h-49V241h103c24 0 41-16 41-37s-17-37-41-37H154v-63z"/>'
      + '</svg>';
  },

  _renderMetodosPago() {
    const tieneEmpleadas = PS.businessData?.modulo_empleadas === true;
    const metodos = [
      { id:'Efectivo',           label:'Efectivo',       color:'#2ECC71', py:false, icon:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
      { id:'Tarjeta',            label:'Tarjeta',        color:'#3B82F6', py:false, icon:'<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>' },
      { id:'Transferencia',      label:'Transferencia',  color:'#8B5CF6', py:false, icon:'<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>' },
      { id:'Cuenta corriente',   label:'Cta. corriente', color:'#F59E0B', py:false, icon:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
      { id:'PedidosYa Efectivo', label:'PY Efectivo',   color:'#FF3C00', py:true,  pyBg:'#FF3C00' },
      { id:'PedidosYa Digital',  label:'PY Tarjeta/Transf.', color:'#E8001A', py:true,  pyBg:'#E8001A' },
      ...(tieneEmpleadas ? [{ id:'Consumo empleado', label:'Consumo empleado', color:'#7C3AED', py:false,
        icon:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' }] : []),
    ];
    var self = this;
    return metodos.map(function(m) {
      var iconHtml = m.py
        ? self._pyLogo(m.pyBg)
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"'
          + ' stroke="' + m.color + '" stroke-width="2" style="flex-shrink:0; opacity:0.9;">'
          + m.icon + '</svg>';
      return '<label data-pago="' + m.id + '"'
        + ' style="display:flex; align-items:center; gap:7px; cursor:pointer;'
        + ' padding:9px 8px; border:2px solid var(--border); border-radius:8px;'
        + ' font-size:12px; font-weight:500; transition:all 0.15s; color:var(--text-primary);"'
        + ' onclick="Ventas.selectPago(' + "'" + m.id + "'" + ')">'
        + '<input type="radio" name="pago" value="' + m.id + '" style="display:none;">'
        + iconHtml + m.label
        + '</label>';
    }).join('');
  },

  selectPago(metodo) {
    // Mostrar/ocultar campo de vuelto
    const s = document.getElementById('efectivo-section');
    if (s) s.style.display = metodo === 'Efectivo' ? 'block' : 'none';

    // Consumo empleado: mostrar selector y cargar empleadas
    const empSec = document.getElementById('consumo-empleado-section');
    if (empSec) {
      empSec.style.display = metodo === 'Consumo empleado' ? 'block' : 'none';
      if (metodo === 'Consumo empleado') {
        const sel = document.getElementById('consumo-empleada-sel');
        if (sel && sel.options.length <= 1) {
          sb.from('empleadas').select('*').eq('business_id', PS.businessId).then(r => ({ docs: (r.data||[]).map(d => ({id:d.id, data:()=>d})) }))
            .then(snap => {
              const empleadas = snap.docs.map(d=>({id:d.id,...d.data()})).filter(e=>e.activa!==false);
              sel.innerHTML = '<option value="">-- Elegir empleada --</option>'
                + empleadas.map(e=>'<option value="'+e.id+'">'+e.nombre+'</option>').join('');
            }).catch(()=>{});
        }
      }
    }

    // Colores por método
    const colors = {
      'Efectivo':           '#2ECC71',
      'Tarjeta':            '#3B82F6',
      'Transferencia':      '#8B5CF6',
      'Cuenta corriente':   '#F59E0B',
      'PedidosYa Efectivo': '#FF3C00',
      'PedidosYa Digital':  '#E8001A',
      'Consumo empleado':   '#7C3AED',
    };
    const color = colors[metodo] || 'var(--green-primary)';

    // Resetear todos los labels
    document.querySelectorAll('[data-pago]').forEach(label => {
      label.style.border      = '2px solid var(--border)';
      label.style.background  = 'transparent';
      label.style.color       = 'var(--text-primary)';
    });

    // Marcar el seleccionado
    const sel = document.querySelector(`[data-pago="${metodo}"]`);
    if (sel) {
      sel.style.border     = `2px solid ${color}`;
      sel.style.background = `${color}18`;
      sel.style.color      = color;
      sel.querySelector('input[type=radio]').checked = true;
    }

    // Habilitar cobrar
    const btn = document.getElementById('cobrar-btn');
    if (btn) btn.disabled = this.cart.length === 0;
  },

  calcVuelto() {
    const subtotal = this.cart.reduce((s, i) =>
      s + (i.esPeso ? i.precio : i.precio * i.cantidad), 0
    );
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


  _mostrarBtnTicket() {
    const existente = document.getElementById('btn-imprimir-ticket');
    if (existente) existente.remove();
    const btn = document.createElement('button');
    btn.id = 'btn-imprimir-ticket';
    btn.className = 'btn btn-secondary w-full mt-8';
    btn.style.cssText = 'font-size:12px;display:flex;align-items:center;justify-content:center;gap:6px;';
    btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Imprimir ticket';
    btn.addEventListener('click', () => Ventas.imprimirTicket());
    const vaciar = document.querySelector('.btn-ghost.w-full.mt-8');
    if (vaciar) vaciar.parentNode.insertBefore(btn, vaciar);
  },

  imprimirTicket() {
    const s = this._lastSale;
    if (!s) { showToast('No hay venta reciente para imprimir', 'warning'); return; }
    const bizName = (PS.businessData?.name || 'PuntoStock').toUpperCase();
    const metodos = {
      'Efectivo':'Efectivo','Tarjeta':'Tarjeta','Transferencia':'Transfer.',
      'Cuenta corriente':'Cta. Cte.','PedidosYa Efectivo':'PY Efectivo',
      'PedidosYa Digital':'PY Digital','Consumo empleado':'Cons. Empleado'
    };
    const itemsHTML = s.items.map(i => {
      const nom = (i.nombre||'').length > 20 ? (i.nombre||'').substring(0,19)+'.' : (i.nombre||'');
      const sub = formatPrice(i.precio * i.cantidad);
      return '<div style="display:flex;justify-content:space-between;font-size:10px;margin:2px 0;">'
        + '<span>'+nom+' x'+i.cantidad+'</span><span>'+sub+'</span></div>';
    }).join('');
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'
      + CSS_58MM + 'body{font-size:10px}</style></head><body>'
      + '<div class="center bold" style="font-size:13px;letter-spacing:1px;">'+bizName+'</div>'
      + (PS.businessData?.direccion ? '<div class="center" style="font-size:9px;">'+PS.businessData.direccion+'</div>' : '')
      + '<div class="center" style="font-size:9px;">Ticket de Venta</div>'
      + '<hr class="sep">'
      + itemsHTML
      + '<hr class="sep">'
      + '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;"><span>TOTAL</span><span>'+formatPrice(s.total)+'</span></div>'
      + '<hr class="sep">'
      + '<div style="font-size:10px;">'
      + '<div>Pago: '+(metodos[s.metodoPago]||s.metodoPago)+'</div>'
      + (s.empNombre ? '<div>Empleada: '+s.empNombre+'</div>' : '')
      + (s.montoRecibido ? '<div style="display:flex;justify-content:space-between;"><span>Recibido:</span><span>'+formatPrice(s.montoRecibido)+'</span></div>' : '')
      + (s.vuelto ? '<div style="display:flex;justify-content:space-between;font-weight:900;"><span>VUELTO:</span><span>'+formatPrice(s.vuelto)+'</span></div>' : '')
      + '<div>N° '+s.saleId.substring(0,8).toUpperCase()+'</div>'
      + '<div>'+s.timestamp.toLocaleString('es-AR')+'</div>'
      + '</div>'
      + '<hr class="sep">'
      + '<div class="center" style="font-size:9px;">Gracias por su compra!</div>'
      + '</body></html>';
    imprimirHTML(html);
  },

  // ── Cobrar ────────────────────────────────────────────────
  async cobrar() {
    if (this.cart.length === 0) return;
    const metodoPago = document.querySelector('input[name="pago"]:checked')?.value;
    if (!metodoPago) { showToast('Seleccioná el método de pago', 'warning'); return; }

    const subtotal = this.cart.reduce((s, i) =>
      s + (i.esPeso ? i.precio : i.precio * i.cantidad), 0
    );
    const descPct = parseFloat(document.getElementById('cart-descuento')?.value || 0);
    const total   = subtotal * (1 - descPct / 100);

    const btn = document.getElementById('cobrar-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Procesando...';

    try {
      // Supabase: guardar venta y descontar stock atomicamente
      const _ventaPayload = {
        business_id: PS.businessId
      };
      const _ventaRef = { id: null };  // placeholder, se llena abajo

      // Datos adicionales para consumo empleado
      let empId = null, empNombre = null;
      if (metodoPago === 'Consumo empleado') {
        const sel = document.getElementById('consumo-empleada-sel');
        empId = sel?.value;
        empNombre = sel?.options[sel.selectedIndex]?.text;
        if (!empId) { showToast('Elegí una empleada', 'warning'); btn.disabled=false; btn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Cobrar'; return; }
      }

      const montoRecibido = metodoPago === 'Efectivo'
        ? (parseFloat(document.getElementById('monto-recibido')?.value) || total) : null;
      const vuelto = montoRecibido ? Math.max(0, montoRecibido - total) : null;

      // Insertar venta
      const { data: _ventaData, error: _ventaErr } = await sb.from('ventas').insert({
        business_id: PS.businessId,
        items: this.cart.map(i => ({
          id: i.prodId || i.id, nombre: i.nombre,
          precio: i.precio, cantidad: i.cantidad, esPeso: i.esPeso || false
        })),
        total, descuento: descPct, metodo_pago: metodoPago,
        pagado_con: montoRecibido, vuelto,
        ...(empId ? { empleada_id: empId } : {}),
        fecha: new Date().toISOString()
      }).select().single();
      if (_ventaErr) throw _ventaErr;
      _ventaRef.id = _ventaData.id;

      // Descontar stock usando RPC atómica
      const stockUpdates = this.cart.filter(i => !i.esPeso).map(item => {
        const realId = item.esPromo ? item.id.replace('_promo', '') : item.id;
        return sb.rpc('decrementar_stock', { p_id: realId, p_cantidad: item.cantidad });
      });
      await Promise.all(stockUpdates);

      // Registrar consumo en empleada si corresponde
      if (metodoPago === 'Consumo empleado' && empId) {
        const semanaKey = Empleadas?._getSemanaKey ? Empleadas._getSemanaKey() : new Date().toISOString().substring(0,10);
        await sb.from('empleada_consumos').insert({
          business_id: PS.businessId,
          empleada_id: empId,
          descripcion: this.cart.map(i=>i.nombre+' x'+i.cantidad).join(', '),
          monto: total,
          fecha: new Date().toISOString()
        });
      }

      // Guardar última venta para imprimir ticket
      this._lastSale = {
        saleId: _ventaRef.id,
        items: this.cart.slice(),
        total, subtotal, descuento: descPct, metodoPago,
        montoRecibido, vuelto,
        empNombre,
        timestamp: new Date()
      };

      // Stock local
      this.cart.filter(i => !i.esPeso).forEach(item => {
        const realId = item.esPromo ? item.id.replace('_promo', '') : item.id;
        const p = this.productos.find(p => p.id === realId);
        if (p) p.stock -= item.cantidad;
      });

      this.cart = [];
      this.renderCart();
      this.updateTotals();
      this.renderProductos();
      btn.disabled = false;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Cobrar';
      document.querySelectorAll('[data-pago]').forEach(l => {
        l.style.border = '2px solid var(--border)';
        l.style.background = 'transparent';
        l.style.color = 'var(--text-primary)';
      });
      document.querySelectorAll('input[name="pago"]').forEach(r => r.checked = false);
      document.getElementById('efectivo-section').style.display = 'none';
      const empSec2 = document.getElementById('consumo-empleado-section');
      if (empSec2) empSec2.style.display = 'none';
      showToast('Venta registrada — ' + formatPrice(total), 'success');
      // Mostrar botón imprimir ticket
      Ventas._mostrarBtnTicket();

    } catch (e) {
      console.error(e);
      showToast('Error al registrar la venta: ' + e.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Cobrar';
    }
  },

  // ════════════════════════════════════════════════════════
  // ESCÁNER FÍSICO + TECLADO
  // Detecta el escáner por velocidad (< 50ms entre teclas)
  // Cuando la balanza está abierta, redirige todo al display
  // ════════════════════════════════════════════════════════
  initScanner() {
    this.scanBuffer = '';
    this.scanTimer  = null;

    document.addEventListener('keydown', this._scanHandler = (e) => {
      // Ignorar si hay un input de texto enfocado (que no sea la búsqueda del POS)
      const active  = document.activeElement;
      const inInput = active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT') &&
        active.id !== 'pos-search';
      if (inInput) return;

      // ── Balanza abierta → redirigir teclas ──────────────
      const balanzaAbierta = !!document.getElementById('balanza-display');
      if (balanzaAbierta) {
        if (/^\d$/.test(e.key)) {
          e.preventDefault();
          this.balanzaKey(e.key);
          this._flashKey(e.key);
          return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          this.balanzaKey('⌫');
          return;
        }
        if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          this.balanzaKey('C');
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const btn = document.getElementById('balanza-agregar-btn');
          if (btn && !btn.disabled) this.balanzaAgregar();
          return;
        }
        return; // bloquear otras teclas
      }

      // ── POS normal: detectar escáner o teclado ──────────
      if (e.key === 'Enter') {
        if (this.scanBuffer.length >= 3) {
          this.addByCode(this.scanBuffer.trim());
        }
        this.scanBuffer = '';
        clearTimeout(this.scanTimer);
        return;
      }

      if (e.key.length === 1) {
        this.scanBuffer += e.key;
        clearTimeout(this.scanTimer);
        // Si pasan más de 100ms entre teclas = teclado manual (no escáner)
        // El escáner envía todo en < 50ms
        this.scanTimer = setTimeout(() => {
          this.scanBuffer = '';
        }, 100);
      }
    });
  },

  // Flash visual en el botón de la balanza
  _flashKey(key) {
    const btn = document.getElementById(`bkey-${key}`);
    if (!btn) return;
    const orig = btn.style.background;
    btn.style.background  = 'var(--green-muted)';
    btn.style.borderColor = 'var(--green-primary)';
    setTimeout(() => {
      btn.style.background  = orig || 'var(--bg-card)';
      btn.style.borderColor = 'var(--border)';
    }, 100);
  },

  destroyScanner() {
    if (this._scanHandler) {
      document.removeEventListener('keydown', this._scanHandler);
      this._scanHandler = null;
    }
    this.stopCamera();
  }
};
