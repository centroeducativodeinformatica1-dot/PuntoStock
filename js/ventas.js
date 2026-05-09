// ============================================================
// PUNTOSTOCK — Módulo de Ventas (POS)
// ============================================================

const Ventas = {
  productos: [],
  productosFiltrados: [],
  cart: [],
  scanBuffer: '',
  scanTimer: null,

  async load() {
    const page = document.getElementById('page-ventas');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando productos...</div>`;

    // Cargar productos
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
      page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error</h3><p>${e.message}</p></div>`;
    }
  },

  render(page) {
    page.innerHTML = `
      <div class="pos-layout">
        <!-- LEFT: productos -->
        <div class="pos-left">
          <div class="pos-search-bar">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" id="pos-search" placeholder="Buscar producto o escanear código de barras..."
              oninput="Ventas.filter(this.value)">
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
              <span style="font-size:36px;">🛒</span>
              <span>El carrito está vacío</span>
              <span style="font-size:11px;">Buscá o escaneá un producto</span>
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

            <!-- Método de pago -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">
              ${['Efectivo','Tarjeta','Transferencia','Cuenta corriente'].map(m => `
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer;
                              padding:8px; border:1px solid var(--border); border-radius:6px;
                              font-size:12px; font-weight:500; transition:all 0.15s;"
                       id="pago-${m.toLowerCase().replace(' ','_')}-label"
                       onclick="Ventas.selectPago('${m}')">
                  <input type="radio" name="pago" value="${m}" style="accent-color:var(--green-primary);">
                  ${m}
                </label>
              `).join('')}
            </div>

            <!-- Monto recibido (sólo efectivo) -->
            <div id="efectivo-section" style="display:none; margin-bottom:10px;">
              <label>Monto recibido</label>
              <input type="number" id="monto-recibido" placeholder="$ 0"
                style="margin-top:4px;" oninput="Ventas.calcVuelto()">
              <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:12px;">
                <span style="color:var(--text-secondary);">Vuelto:</span>
                <span id="vuelto-val" style="font-family:var(--font-mono); font-weight:700; color:var(--green-primary);">$0</span>
              </div>
            </div>

            <button class="cobrar-btn" id="cobrar-btn" onclick="Ventas.cobrar()" disabled>
              Cobrar
            </button>
            <button class="btn btn-ghost w-full mt-8" onclick="Ventas.clearCart()" style="font-size:12px;">
              🗑 Vaciar carrito
            </button>
          </div>
        </div>
      </div>
    `;

    this.renderCategorias();
    this.renderProductos();
    this.renderCart();

    // Focus en busqueda
    setTimeout(() => document.getElementById('pos-search')?.focus(), 100);
  },

  renderCategorias() {
    const cats = ['Todos', ...new Set(this.productos.map(p => p.categoria).filter(Boolean))];
    const container = document.getElementById('pos-cats');
    if (!container) return;
    container.innerHTML = cats.map((c, i) => `
      <button class="btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-secondary'}"
              onclick="Ventas.filterCat('${c}', this)" data-cat="${c}">
        ${c}
      </button>
    `).join('');
  },

  filterCat(cat, btn) {
    document.querySelectorAll('#pos-cats .btn').forEach(b => {
      b.className = b === btn ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
    });
    if (cat === 'Todos') {
      this.productosFiltrados = [...this.productos];
    } else {
      this.productosFiltrados = this.productos.filter(p => p.categoria === cat);
    }
    document.getElementById('pos-search').value = '';
    this.renderProductos();
  },

  filter(q) {
    q = q.toLowerCase().trim();
    this.productosFiltrados = q
      ? this.productos.filter(p =>
          p.nombre?.toLowerCase().includes(q) ||
          p.codigo?.toLowerCase().includes(q) ||
          p.categoria?.toLowerCase().includes(q)
        )
      : [...this.productos];
    this.renderProductos();
  },

  renderProductos() {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    if (this.productosFiltrados.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">🔍</div>
          <h3>Sin resultados</h3>
          <p>No se encontraron productos</p>
        </div>
      `;
      return;
    }

    const emojis = { ropa:'👕', calzado:'👟', accesorio:'👜', electro:'📱', alimento:'🍎', bebida:'🧃', otros:'📦' };

    grid.innerHTML = this.productosFiltrados.map(p => {
      const noStock = (p.stock || 0) <= 0;
      const cat = (p.categoria || 'otros').toLowerCase();
      const emoji = Object.keys(emojis).find(k => cat.includes(k)) ? emojis[Object.keys(emojis).find(k => cat.includes(k))] : '📦';
      return `
        <div class="product-card ${noStock ? 'no-stock' : ''}"
             onclick="${noStock ? '' : `Ventas.addToCart('${p.id}')`}"
             title="${p.nombre}">
          <span class="product-emoji">${emoji}</span>
          <div class="product-name">${p.nombre}</div>
          <div class="product-price">${formatPrice(p.precio)}</div>
          <div class="product-stock-label">${noStock ? 'Sin stock' : `${p.stock} en stock`}</div>
        </div>
      `;
    }).join('');
  },

  addToCart(prodId) {
    const prod = this.productos.find(p => p.id === prodId);
    if (!prod || prod.stock <= 0) { showToast('Sin stock', 'error'); return; }

    const existing = this.cart.find(i => i.id === prodId);
    if (existing) {
      if (existing.cantidad >= prod.stock) {
        showToast(`Máximo ${prod.stock} unidades disponibles`, 'warning');
        return;
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
      this.addToCart(prod.id);
      showToast(`${prod.nombre} agregado`, 'success', 1500);
    } else {
      showToast(`Código no encontrado: ${code}`, 'warning');
    }
  },

  changeQty(id, delta) {
    const item = this.cart.find(i => i.id === id);
    if (!item) return;
    item.cantidad += delta;
    if (item.cantidad <= 0) {
      this.cart = this.cart.filter(i => i.id !== id);
    } else if (item.cantidad > item.stockMax) {
      item.cantidad = item.stockMax;
      showToast(`Máximo ${item.stockMax} unidades`, 'warning');
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
              <span style="font-size:11px;">Buscá o escaneá un producto</span>
            </div>
      `;
      const btn = document.getElementById('cobrar-btn');
      if (btn) btn.disabled = true;
      return;
    }

    container.innerHTML = this.cart.map(item => `
      <div class="cart-item">
        <div style="flex:1; min-width:0;">
          <div class="cart-item-name">${item.nombre}</div>
          <div class="cart-item-price">${formatPrice(item.precio)} c/u</div>
        </div>
        <div class="qty-control">
          <button class="qty-btn" onclick="Ventas.changeQty('${item.id}', -1)">−</button>
          <span class="qty-value">${item.cantidad}</span>
          <button class="qty-btn" onclick="Ventas.changeQty('${item.id}', 1)">+</button>
        </div>
        <div style="font-family:var(--font-mono); font-size:13px; font-weight:700;
                    color:var(--green-primary); min-width:70px; text-align:right;">
          ${formatPrice(item.precio * item.cantidad)}
        </div>
        <button class="cart-remove" onclick="Ventas.removeFromCart('${item.id}')">✕</button>
      </div>
    `).join('');

    const btn = document.getElementById('cobrar-btn');
    if (btn) btn.disabled = false;
  },

  updateTotals() {
    const subtotal = this.cart.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const descPct  = parseFloat(document.getElementById('cart-descuento')?.value || 0);
    const descMonto= subtotal * (descPct / 100);
    const total    = subtotal - descMonto;

    const subEl = document.getElementById('cart-subtotal');
    const totEl = document.getElementById('cart-total');
    if (subEl) subEl.textContent = formatPrice(subtotal);
    if (totEl) totEl.textContent = formatPrice(total);

    this.updateCobrarLabel(total);
    this.calcVuelto();
  },

  updateCobrarLabel(total) {
    const btn = document.getElementById('cobrar-btn');
    if (btn && this.cart.length > 0) {
      btn.textContent = `Cobrar ${formatPrice(total)}`;
    }
  },

  selectPago(metodo) {
    const section = document.getElementById('efectivo-section');
    if (section) section.style.display = metodo === 'Efectivo' ? 'block' : 'none';
  },

  calcVuelto() {
    const subtotal = this.cart.reduce((s, i) => s + (i.precio * i.cantidad), 0);
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

  async cobrar() {
    if (this.cart.length === 0) return;

    const metodoPago = document.querySelector('input[name="pago"]:checked')?.value;
    if (!metodoPago) { showToast('Seleccioná el método de pago', 'warning'); return; }

    const subtotal = this.cart.reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const descPct  = parseFloat(document.getElementById('cart-descuento')?.value || 0);
    const total    = subtotal * (1 - descPct / 100);

    const btn = document.getElementById('cobrar-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> Procesando...';

    try {
      const batch = db.batch();
      const bizRef = db.collection('businesses').doc(PS.businessId);

      // Registrar venta
      const ventaRef = bizRef.collection('ventas').doc();
      batch.set(ventaRef, {
        items: this.cart.map(i => ({
          id: i.id, nombre: i.nombre, precio: i.precio, cantidad: i.cantidad
        })),
        subtotal,
        descuento: descPct,
        total,
        metodoPago,
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        usuario: PS.user.uid
      });

      // Actualizar stock
      this.cart.forEach(item => {
        const prodRef = bizRef.collection('productos').doc(item.id);
        batch.update(prodRef, {
          stock: firebase.firestore.FieldValue.increment(-item.cantidad)
        });
      });

      await batch.commit();

      // Actualizar stock local
      this.cart.forEach(item => {
        const p = this.productos.find(p => p.id === item.id);
        if (p) p.stock -= item.cantidad;
      });

      this.cart = [];
      this.renderCart();
      this.updateTotals();
      this.renderProductos();

      showToast(`Venta registrada — ${formatPrice(total)}`, 'success');

      // Ticket rápido
      this.showTicket({ items: this.cart, total, metodoPago, subtotal, descuento: descPct });

    } catch (e) {
      console.error(e);
      showToast('Error al registrar la venta: ' + e.message, 'error');
      btn.disabled = false;
      btn.textContent = `Cobrar`;
    }
  },

  showTicket(data) {
    // En una próxima versión: imprimir ticket
    showToast('Venta registrada exitosamente 🎉', 'success');
  },

  // ── Escáner de código de barras ──────────────────────────
  initScanner() {
    // El escáner envía los chars muy rápido (< 50ms entre teclas) y termina con Enter
    this.scanBuffer = '';
    this.scanTimer = null;

    document.addEventListener('keydown', this._scanHandler = (e) => {
      // Solo si no hay un input enfocado (excepto el buscador POS)
      const active = document.activeElement;
      const inInput = active && active.tagName === 'INPUT' &&
                      active.id !== 'pos-search' &&
                      active.type !== 'search';
      if (inInput) return;

      if (e.key === 'Enter') {
        if (this.scanBuffer.length >= 4) {
          this.addByCode(this.scanBuffer);
        }
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

  // Llamar al salir de ventas
  destroyScanner() {
    if (this._scanHandler) {
      document.removeEventListener('keydown', this._scanHandler);
      this._scanHandler = null;
    }
  }
};
