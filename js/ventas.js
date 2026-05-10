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
  _html5QrCode: null,
  _qrTrackCaps: null,
  _videoTrack: null,
  _scanInterval: null,
  _scanRAF: null,
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
                       transition:all 0.2s; line-height:1;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18h6"/><path d="M10 22h4"/>
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
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

            <button class="cobrar-btn" id="cobrar-btn" onclick="Ventas.cobrar()" disabled>Cobrar</button>
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
  // CÁMARA — usa html5-qrcode (BarcodeDetector nativo + fallback)
  // ════════════════════════════════════════════════════════
  async toggleCamera() {
    this.cameraActive ? this.stopCamera() : await this.startCamera();
  },

  async startCamera() {
    const container = document.getElementById('camera-container');
    const btn       = document.getElementById('btn-camara');
    const status    = document.getElementById('camera-status');
    if (!container) return;

    try {
      // Cargar html5-qrcode si no está disponible
      if (!window.Html5Qrcode) {
        if (status) status.textContent = 'Cargando lector...';
        await this._loadHtml5QrCode();
      }
      if (!window.Html5Qrcode) {
        showToast('No se pudo cargar el lector de códigos', 'error');
        return;
      }

      // Limpiar instancia anterior
      if (this._html5QrCode) {
        try { await this._html5QrCode.stop(); } catch(e) {}
        this._html5QrCode = null;
      }
      // Cerrar stream previo de detección de linterna
      if (this._probeStream) {
        this._probeStream.getTracks().forEach(t => t.stop());
        this._probeStream = null;
      }

      this.cameraActive = true;
      container.style.display = 'block';
      if (btn) {
        btn.style.borderColor = 'var(--green-primary)';
        btn.style.color       = 'var(--green-primary)';
        btn.style.background  = 'var(--green-muted)';
      }

      // ── Detectar linterna ANTES de iniciar el scanner ──────
      // Abrimos el stream nosotros para leer las capabilities
      let deviceId = null;
      try {
        const probeStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } }
        });
        this._probeStream = probeStream;
        const vtrack = probeStream.getVideoTracks()[0];
        const caps   = vtrack?.getCapabilities?.() || {};
        deviceId     = vtrack?.getSettings?.()?.deviceId || null;

        const torchBtn = document.getElementById('btn-torch');
        if (caps.torch) {
          // Linterna soportada — guardamos el track para usarlo
          this._videoTrack = vtrack;
          if (torchBtn) torchBtn.style.display = 'flex';
        } else {
          this._videoTrack = null;
          if (torchBtn) torchBtn.style.display = 'none';
        }
        // Cerramos el probe stream — html5-qrcode abrirá el suyo
        probeStream.getTracks().forEach(t => t.stop());
        this._probeStream = null;
      } catch(e) {
        // Sin acceso a probe = sin linterna, seguimos igual
        this._videoTrack = null;
      }

      // ── Iniciar html5-qrcode ───────────────────────────────
      const qrDivId = 'qr-reader-internal';
      let qrDiv = document.getElementById(qrDivId);
      if (!qrDiv) {
        qrDiv = document.createElement('div');
        qrDiv.id = qrDivId;
        qrDiv.style.cssText = 'position:absolute;inset:0;z-index:1;';
        container.insertBefore(qrDiv, container.firstChild);
      }
      qrDiv.innerHTML = '';

      const scanner = new Html5Qrcode(qrDivId, { verbose: false });
      this._html5QrCode = scanner;

      let lastCode = '', lastTime = 0;
      const onSuccess = (code) => {
        const now = Date.now();
        if (code === lastCode && now - lastTime < 2000) return;
        lastCode = code; lastTime = now;
        if (status) status.textContent = `✓ ${code}`;
        this._beep();
        this.stopCamera();
        setTimeout(() => this.addByCode(code), 80);
      };

      const config = {
        fps: 10,
        qrbox: { width: 220, height: 90 },
        aspectRatio: 1.7,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,  Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,  Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,    Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,  Html5QrcodeSupportedFormats.DATA_MATRIX,
        ]
      };

      // Usar deviceId específico si lo tenemos, sino facingMode
      const cameraConfig = deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: 'environment' };

      await scanner.start(cameraConfig, config, onSuccess, () => {});

      // Tras iniciar, intentar capturar el track interno del scanner
      // para que toggleTorch pueda encender la linterna por su propio stream
      try {
        await new Promise(r => setTimeout(r, 400));
        const qrCaps = scanner?.getRunningTrackCameraCapabilities?.();
        if (qrCaps?.torchFeature?.isSupported?.()) {
          this._qrTrackCaps = qrCaps;
        } else {
          // Fallback: buscar el video que inyectó html5-qrcode
          const vid = container.querySelector('video');
          if (vid?.srcObject) {
            const t = vid.srcObject.getVideoTracks()[0];
            if (t?.getCapabilities?.()?.torch) this._videoTrack = t;
          }
        }
      } catch(e) {}

      if (status) status.textContent = 'Apuntá el código de barras al recuadro';

    } catch (e) {
      console.error('Camera error:', e);
      this.cameraActive = false;
      if (e.name === 'NotAllowedError') {
        showToast('Permiso de cámara denegado. Habilitalo en la configuración del navegador.', 'error', 5000);
      } else {
        showToast('No se pudo acceder a la cámara: ' + e.message, 'error');
      }
    }
  },

  _loadHtml5QrCode() {
    return new Promise((resolve) => {
      if (window.Html5Qrcode) { resolve(); return; }
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      s.onload  = resolve;
      s.onerror = () => { console.warn('html5-qrcode no cargó'); resolve(); };
      document.head.appendChild(s);
    });
  },

  // Encender/apagar linterna
  async toggleTorch() {
    const torchBtn   = document.getElementById('btn-torch');
    const torchLabel = document.getElementById('torch-label');
    try {
      this.torchOn = !this.torchOn;
      // Método 1: html5-qrcode API
      if (this._qrTrackCaps?.torchFeature?.isSupported?.()) {
        await this._qrTrackCaps.torchFeature.apply(this.torchOn);
      }
      // Método 2: fallback MediaStreamTrack nativo
      else if (this._videoTrack) {
        await this._videoTrack.applyConstraints({ advanced: [{ torch: this.torchOn }] });
      } else {
        throw new Error('no torch');
      }
      if (torchBtn) {
        torchBtn.style.background  = this.torchOn ? 'rgba(126,211,33,0.85)' : 'rgba(0,0,0,0.75)';
        torchBtn.style.borderColor = this.torchOn ? 'var(--green-primary)' : 'rgba(255,255,255,0.35)';
        torchBtn.style.color       = this.torchOn ? '#0D1117' : 'white';
      }
      if (torchLabel) torchLabel.textContent = this.torchOn ? 'ON' : 'OFF';
    } catch(e) {
      showToast('Este dispositivo no soporta linterna desde el navegador', 'warning');
      this.torchOn = false;
    }
  },

  _beep() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const now  = ctx.currentTime;
      // Pip doble estilo supermercado: dos tonos cortos y limpios
      [0, 0.12].forEach(offset => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 1800;
        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.35, now + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
        osc.start(now + offset);
        osc.stop(now + offset + 0.1);
      });
    } catch (e) { /* sin audio = ok */ }
  },

  stopCamera() {
    if (this._html5QrCode) {
      this._html5QrCode.stop().catch(() => {});
      this._html5QrCode = null;
    }
    // limpieza legado por si quedó algo de versiones anteriores
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(t => t.stop());
      this.cameraStream = null;
    }
    if (this._scanInterval)  { clearInterval(this._scanInterval);   this._scanInterval = null; }
    if (this._scanRAF)       { cancelAnimationFrame(this._scanRAF); this._scanRAF = null; }

    this.cameraActive = false;
    this.torchOn      = false;
    this._videoTrack  = null;
    this._qrTrackCaps = null;

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
        showToast(`Máximo ${prod.stock} unidades`, 'warning'); return;
      }
      existing.cantidad++;
    } else {
      this.cart.push({ id: prodId, nombre: prod.nombre, precio: prod.precio, cantidad: 1, stockMax: prod.stock });
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
        showToast(`${prod.nombre} agregado`, 'success', 1500);
      }
    } else {
      // Código no encontrado → ofrecer registrar el producto
      this.mostrarProductoNoEncontrado(code);
    }
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
      const bizRef = db.collection('businesses').doc(PS.businessId);
      const ref = await bizRef.collection('productos').add({
        nombre, precio, stock, activo: true,
        codigoBarra: code,
        categoria: cat || '',
        unidad: 'unidad',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Agregar al array local
      const newProd = { id: ref.id, nombre, precio, stock, activo: true, codigoBarra: code, categoria: cat || '', unidad: 'unidad' };
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

  selectPago(metodo) {
    const s = document.getElementById('efectivo-section');
    if (s) s.style.display = metodo === 'Efectivo' ? 'block' : 'none';
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
      const batch  = db.batch();
      const bizRef = db.collection('businesses').doc(PS.businessId);
      const ventaRef = bizRef.collection('ventas').doc();

      batch.set(ventaRef, {
        items: this.cart.map(i => ({
          id: i.prodId || i.id, nombre: i.nombre,
          precio: i.precio, cantidad: i.cantidad, esPeso: i.esPeso || false
        })),
        subtotal, descuento: descPct, total, metodoPago,
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        usuario: PS.user.uid
      });

      // Solo descontar stock de productos por unidad
      this.cart.filter(i => !i.esPeso).forEach(item => {
        batch.update(bizRef.collection('productos').doc(item.id), {
          stock: firebase.firestore.FieldValue.increment(-item.cantidad)
        });
      });

      await batch.commit();

      // Stock local
      this.cart.filter(i => !i.esPeso).forEach(item => {
        const p = this.productos.find(p => p.id === item.id);
        if (p) p.stock -= item.cantidad;
      });

      // Guardar datos de la venta para el ticket ANTES de limpiar el carrito
      const ticketData = {
        items:      [...this.cart],
        subtotal, descPct, total, metodoPago,
        fecha:      new Date(),
        negocio:    PS.businessData?.name || 'Mi Negocio',
        telefono:   PS.businessData?.phone || '',
        direccion:  PS.businessData?.address || '',
      };

      this.cart = [];
      this.renderCart();
      this.updateTotals();
      this.renderProductos();

      // Mostrar modal de ticket
      this.mostrarTicket(ticketData);

    } catch (e) {
      console.error(e);
      showToast('Error al registrar la venta: ' + e.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Cobrar';
    }
  },

  // ── Ticket post-venta ─────────────────────────────────────
  mostrarTicket(d) {
    const ahora  = d.fecha.toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const lineas = d.items.map(i =>
      `${i.nombre.padEnd(20).slice(0,20)}  ${String(i.esPeso ? '1' : i.cantidad).padStart(3)}  ${formatPrice(i.esPeso ? i.precio : i.precio * i.cantidad)}`
    ).join('\n');

    const ticketHTML = `
      <div id="ticket-print-area" style="
        background:#fff; color:#000; font-family:'Courier New', monospace;
        width:280px; margin:0 auto; padding:16px 12px;
        border-radius:4px; font-size:12px; line-height:1.5;">

        <!-- Cabecera -->
        <div style="text-align:center; margin-bottom:10px;">
          <div style="font-size:18px; font-weight:900; letter-spacing:1px;">${d.negocio}</div>
          ${d.telefono ? `<div style="font-size:11px;">${d.telefono}</div>` : ''}
          ${d.direccion ? `<div style="font-size:11px;">${d.direccion}</div>` : ''}
          <div style="font-size:10px; color:#555; margin-top:4px;">${ahora}</div>
        </div>

        <div style="border-top:1px dashed #999; margin:8px 0;"></div>

        <!-- Items -->
        <div style="font-size:11px; white-space:pre; overflow:hidden;">
Producto             Cant  Precio
─────────────────────────────────
${lineas}
        </div>

        <div style="border-top:1px dashed #999; margin:8px 0;"></div>

        <!-- Totales -->
        <div style="display:flex; justify-content:space-between; font-size:12px;">
          <span>Subtotal</span><span>${formatPrice(d.subtotal)}</span>
        </div>
        ${d.descPct > 0 ? `
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#666;">
          <span>Descuento ${d.descPct}%</span>
          <span>-${formatPrice(d.subtotal * d.descPct / 100)}</span>
        </div>` : ''}
        <div style="display:flex; justify-content:space-between; font-size:15px; font-weight:900; margin-top:6px; border-top:2px solid #000; padding-top:6px;">
          <span>TOTAL</span><span>${formatPrice(d.total)}</span>
        </div>
        <div style="font-size:11px; color:#555; margin-top:4px;">
          Pago: ${d.metodoPago}
        </div>

        <div style="border-top:1px dashed #999; margin:10px 0;"></div>
        <div style="text-align:center; font-size:10px; color:#777;">
          ¡Gracias por su compra!<br>
          Powered by PuntoStock
        </div>
      </div>
    `;

    // Texto para WhatsApp
    const waTexto = encodeURIComponent(
      `🧾 *${d.negocio}*\n` +
      `📅 ${ahora}\n\n` +
      d.items.map(i => `• ${i.nombre} x${i.esPeso ? '1' : i.cantidad} — ${formatPrice(i.esPeso ? i.precio : i.precio * i.cantidad)}`).join('\n') +
      `\n${'─'.repeat(30)}\n` +
      (d.descPct > 0 ? `Subtotal: ${formatPrice(d.subtotal)}\nDescuento: ${d.descPct}%\n` : '') +
      `*TOTAL: ${formatPrice(d.total)}*\n` +
      `Pago: ${d.metodoPago}\n\n_¡Gracias por su compra!_`
    );

    openModal(`
      <div class="modal-header">
        <h3 class="modal-title" style="display:flex;align-items:center;gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Ticket de venta
        </h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <!-- Ticket visual -->
      ${ticketHTML}

      <!-- Acciones -->
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:16px;">

        <!-- Imprimir -->
        <button onclick="Ventas.imprimirTicket()"
          style="display:flex; flex-direction:column; align-items:center; gap:6px;
                 padding:12px 8px; background:var(--bg-card); border:1px solid var(--border);
                 border-radius:var(--radius-md); cursor:pointer; color:var(--text-primary);
                 font-family:var(--font); font-size:11px; font-weight:600; transition:all 0.2s;"
          onmouseenter="this.style.borderColor='var(--green-primary)';this.style.color='var(--green-primary)'"
          onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--text-primary)'">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          Imprimir
        </button>

        <!-- WhatsApp -->
        <a href="https://wa.me/?text=${waTexto}" target="_blank" rel="noopener"
          style="display:flex; flex-direction:column; align-items:center; gap:6px;
                 padding:12px 8px; background:var(--bg-card); border:1px solid var(--border);
                 border-radius:var(--radius-md); cursor:pointer; color:var(--text-primary);
                 font-family:var(--font); font-size:11px; font-weight:600; transition:all 0.2s;
                 text-decoration:none;"
          onmouseenter="this.style.borderColor='#25D366';this.style.color='#25D366'"
          onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--text-primary)'">
          <!-- WhatsApp SVG oficial -->
          <svg width="22" height="22" viewBox="0 0 32 32" fill="currentColor">
            <path d="M16 2C8.28 2 2 8.28 2 16c0 2.46.66 4.77 1.8 6.77L2 30l7.43-1.77A13.93 13.93 0 0 0 16 30c7.72 0 14-6.28 14-14S23.72 2 16 2zm0 25.4a11.4 11.4 0 0 1-5.8-1.58l-.42-.25-4.4 1.05 1.08-4.28-.28-.44A11.37 11.37 0 0 1 4.6 16C4.6 9.71 9.71 4.6 16 4.6S27.4 9.71 27.4 16 22.29 27.4 16 27.4zm6.26-8.5c-.34-.17-2.02-.99-2.33-1.1-.31-.12-.54-.17-.77.17-.23.34-.88 1.1-1.08 1.33-.2.22-.4.25-.74.08-.34-.17-1.43-.53-2.73-1.68-1.01-.9-1.69-2.01-1.88-2.35-.2-.34-.02-.52.15-.69.15-.15.34-.39.51-.59.17-.2.23-.34.34-.57.12-.23.06-.43-.03-.6-.08-.17-.77-1.85-1.05-2.54-.28-.67-.56-.58-.77-.59l-.65-.01c-.23 0-.6.08-.91.4-.31.31-1.19 1.16-1.19 2.84s1.22 3.29 1.39 3.52c.17.22 2.4 3.66 5.82 5.13.81.35 1.45.56 1.94.72.82.26 1.56.22 2.15.13.66-.1 2.02-.82 2.31-1.62.28-.8.28-1.48.2-1.62-.09-.14-.31-.22-.65-.39z"/>
          </svg>
          WhatsApp
        </a>

        <!-- Descargar imagen -->
        <button onclick="Ventas.descargarTicketImagen()"
          style="display:flex; flex-direction:column; align-items:center; gap:6px;
                 padding:12px 8px; background:var(--bg-card); border:1px solid var(--border);
                 border-radius:var(--radius-md); cursor:pointer; color:var(--text-primary);
                 font-family:var(--font); font-size:11px; font-weight:600; transition:all 0.2s;"
          onmouseenter="this.style.borderColor='var(--blue)';this.style.color='var(--blue)'"
          onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--text-primary)'">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          Descargar
        </button>
      </div>

      <button class="btn btn-ghost w-full mt-8" onclick="closeModal()" style="font-size:12px;">
        Cerrar sin imprimir
      </button>
    `);
  },

  imprimirTicket() {
    const area = document.getElementById('ticket-print-area');
    if (!area) return;
    const win = window.open('', '_blank', 'width=340,height=600');
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Ticket PuntoStock</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#fff; display:flex; justify-content:center; padding:10px; }
        @media print { body { padding:0; } button { display:none; } }
      </style>
      </head><body>
      ${area.outerHTML}
      <div style="text-align:center; margin-top:12px;">
        <button onclick="window.print(); window.close();"
          style="padding:10px 24px; background:#7ED321; color:#000; border:none;
                 border-radius:6px; font-size:14px; font-weight:700; cursor:pointer;">
          🖨 Imprimir
        </button>
      </div>
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 400);
  },

  async descargarTicketImagen() {
    const area = document.getElementById('ticket-print-area');
    if (!area) return;

    // Cargar html2canvas si no está
    if (!window.html2canvas) {
      showToast('Preparando imagen...', 'info', 2000);
      await new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s.onload  = resolve;
        s.onerror = () => { showToast('Error al generar imagen', 'error'); resolve(); };
        document.head.appendChild(s);
      });
    }
    if (!window.html2canvas) return;

    try {
      const canvas = await html2canvas(area, {
        backgroundColor: '#ffffff',
        scale: 2, // alta resolución
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `ticket-${new Date().toLocaleDateString('es-AR').replace(/\//g,'-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Imagen descargada', 'success');
    } catch(e) {
      showToast('Error al generar imagen: ' + e.message, 'error');
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
