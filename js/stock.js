// ============================================================
// PUNTOSTOCK — Módulo de Stock
// ============================================================

const Stock = {
  productos: [],
  filtrados: [],

  async load() {
    const page = document.getElementById('page-stock');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando stock...</div>`;

    try {
      const snap = await db.collection('businesses').doc(PS.businessId)
        .collection('productos').orderBy('nombre').get();
      this.productos = [];
      snap.forEach(d => this.productos.push({ id: d.id, ...d.data() }));
      this.filtrados = [...this.productos];
      this.render(page);
    } catch (e) {
      page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error</h3><p>${e.message}</p></div>`;
    }
  },

  render(page) {
    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-title">Stock (${this.productos.length} productos)</div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <div class="search-input-wrapper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" id="stock-search" placeholder="Buscar producto..."
              oninput="Stock.filter(this.value)">
          </div>
          <select id="stock-cat-filter" onchange="Stock.filterCat(this.value)"
            style="padding:8px 12px; max-width:160px;">
            <option value="">Todas las categorías</option>
            ${[...new Set(this.productos.map(p => p.categoria).filter(Boolean))]
              .map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-sm" onclick="Stock.openModal()">+ Nuevo producto</button>
        </div>
      </div>

      <!-- Resumen stock -->
      <div class="stat-grid" style="margin-bottom:20px;">
        <div class="stat-card" style="padding:14px 16px;">
          <div class="stat-label">Total productos</div>
          <div class="stat-value" style="font-size:22px;">${this.productos.length}</div>
        </div>
        <div class="stat-card" style="padding:14px 16px;">
          <div class="stat-label">Valor total stock</div>
          <div class="stat-value green" style="font-size:22px;">
            ${formatPrice(this.productos.reduce((s,p) => s + (p.precio||0)*(p.stock||0), 0))}
          </div>
        </div>
        <div class="stat-card" style="padding:14px 16px;">
          <div class="stat-label">Stock bajo (≤5)</div>
          <div class="stat-value" style="font-size:22px; color:var(--orange);">
            ${this.productos.filter(p => (p.stock||0) <= 5).length}
          </div>
        </div>
        <div class="stat-card" style="padding:14px 16px;">
          <div class="stat-label">Sin stock</div>
          <div class="stat-value" style="font-size:22px; color:var(--red);">
            ${this.productos.filter(p => (p.stock||0) <= 0).length}
          </div>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Código</th>
              <th>Categoría</th>
              <th>Precio venta</th>
              <th>Precio costo</th>
              <th>Stock</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="stock-tbody"></tbody>
        </table>
      </div>
    `;
    this.renderTabla();
  },

  renderTabla() {
    const tbody = document.getElementById('stock-tbody');
    if (!tbody) return;

    if (this.filtrados.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="8">
          <div class="empty-state" style="padding:40px 0;">
            <div class="empty-state-icon">🔍</div>
            <h3>Sin resultados</h3>
          </div>
        </td></tr>`;
      return;
    }

    tbody.innerHTML = this.filtrados.map(p => {
      const stock = p.stock || 0;
      const stockClass = stock <= 0 ? 'td-red' : stock <= 5 ? '' : 'td-green';
      const stockBadge = stock <= 0 ? 'badge-red' : stock <= 5 ? 'badge-orange' : 'badge-green';
      const stockLabel = stock <= 0 ? 'Sin stock' : stock <= 5 ? 'Stock bajo' : 'En stock';

      return `
        <tr>
          <td>
            <div style="font-weight:600;">${p.nombre}</div>
            ${p.descripcion ? `<div style="font-size:11px; color:var(--text-muted);">${p.descripcion}</div>` : ''}
          </td>
          <td class="td-mono td-muted">${p.codigo || p.codigoBarra || '—'}</td>
          <td><span class="badge badge-muted">${p.categoria || 'Sin cat.'}</span></td>
          <td class="td-mono td-green">${formatPrice(p.precio)}</td>
          <td class="td-mono td-muted">${p.precioCosto ? formatPrice(p.precioCosto) : '—'}</td>
          <td class="td-mono font-bold ${stockClass}" style="font-size:15px;">${stock}</td>
          <td><span class="badge ${stockBadge}">${stockLabel}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm btn-secondary" onclick="Stock.ajustarStock('${p.id}', '${p.nombre}', ${stock})">
                ± Stock
              </button>
              <button class="btn btn-sm btn-secondary" onclick="Stock.openModal('${p.id}')">
                
              </button>
              <button class="btn btn-sm btn-danger" onclick="Stock.eliminar('${p.id}', '${p.nombre}')">
                
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  filter(q) {
    q = q.toLowerCase().trim();
    const cat = document.getElementById('stock-cat-filter')?.value || '';
    this.filtrados = this.productos.filter(p => {
      const matchQ = !q || p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q) || p.codigoBarra?.toLowerCase().includes(q);
      const matchC = !cat || p.categoria === cat;
      return matchQ && matchC;
    });
    this.renderTabla();
  },

  filterCat(cat) {
    const q = document.getElementById('stock-search')?.value || '';
    this.filter(q);
  },

  openModal(id) {
    const prod = id ? this.productos.find(p => p.id === id) : null;
    const cats = [...new Set(this.productos.map(p => p.categoria).filter(Boolean))];

    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">${prod ? 'Editar producto' : '+ Nuevo producto'}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <div class="grid-2">
        <div class="form-group" style="grid-column:1/-1;">
          <label>Nombre del producto *</label>
          <input type="text" id="prod-nombre" value="${prod?.nombre || ''}" placeholder="Ej: Remera Oversize T.M">
        </div>
        <div class="form-group">
          <label>Código / SKU</label>
          <input type="text" id="prod-codigo" value="${prod?.codigo || ''}" placeholder="SKU001">
        </div>
        <div class="form-group">
          <label>Código de barras</label>
          <input type="text" id="prod-barcode" value="${prod?.codigoBarra || ''}" placeholder="7891234567890">
        </div>
        <div class="form-group">
          <label>Precio de venta *</label>
          <input type="number" id="prod-precio" value="${prod?.precio || ''}" placeholder="0" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label>Precio de costo</label>
          <input type="number" id="prod-costo" value="${prod?.precioCosto || ''}" placeholder="0" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label>Stock actual</label>
          <input type="number" id="prod-stock" value="${prod?.stock ?? 0}" placeholder="0" min="0">
        </div>
        <div class="form-group">
          <label>Categoría</label>
          <input type="text" id="prod-cat" value="${prod?.categoria || ''}" placeholder="Ropa, Calzado..."
            list="cats-datalist">
          <datalist id="cats-datalist">
            ${cats.map(c => `<option value="${c}">`).join('')}
          </datalist>
        </div>
        <div class="form-group" style="grid-column:1/-1;">
          <label>Descripción</label>
          <input type="text" id="prod-desc" value="${prod?.descripcion || ''}" placeholder="Descripción opcional">
        </div>
      </div>

      <div class="form-group">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:13px; text-transform:none; letter-spacing:0;">
          <label class="toggle">
            <input type="checkbox" id="prod-activo" ${prod?.activo !== false ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          Producto activo (visible en ventas)
        </label>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Stock.guardar('${id || ''}')" style="width:auto;">
          ${prod ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    `);
  },

  async guardar(id) {
    const nombre   = document.getElementById('prod-nombre').value.trim();
    const precio   = parseFloat(document.getElementById('prod-precio').value);
    const costo    = parseFloat(document.getElementById('prod-costo').value) || null;
    const stock    = parseInt(document.getElementById('prod-stock').value) || 0;
    const codigo   = document.getElementById('prod-codigo').value.trim();
    const barcode  = document.getElementById('prod-barcode').value.trim();
    const cat      = document.getElementById('prod-cat').value.trim();
    const desc     = document.getElementById('prod-desc').value.trim();
    const activo   = document.getElementById('prod-activo').checked;

    if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }
    if (isNaN(precio) || precio < 0) { showToast('Precio inválido', 'error'); return; }

    const data = {
      nombre, precio, stock, activo,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (costo) data.precioCosto = costo;
    if (codigo) data.codigo = codigo;
    if (barcode) data.codigoBarra = barcode;
    if (cat) data.categoria = cat;
    if (desc) data.descripcion = desc;

    try {
      const col = db.collection('businesses').doc(PS.businessId).collection('productos');
      if (id) {
        await col.doc(id).update(data);
        showToast('Producto actualizado', 'success');
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await col.add(data);
        showToast('Producto creado', 'success');
      }
      closeModal();
      await this.load();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  },

  ajustarStock(id, nombre, stockActual) {
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">± Ajustar stock</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <p style="font-weight:600; margin-bottom:4px;">${nombre}</p>
      <p style="color:var(--text-secondary); font-size:13px; margin-bottom:20px;">
        Stock actual: <span style="color:var(--green-primary); font-weight:700;">${stockActual}</span>
      </p>

      <div class="form-group">
        <label>Tipo de ajuste</label>
        <select id="ajuste-tipo">
          <option value="agregar">➕ Agregar unidades</option>
          <option value="restar">➖ Restar unidades</option>
          <option value="establecer">🔄 Establecer cantidad exacta</option>
        </select>
      </div>
      <div class="form-group">
        <label>Cantidad</label>
        <input type="number" id="ajuste-cant" value="1" min="0" placeholder="0">
      </div>
      <div class="form-group">
        <label>Motivo (opcional)</label>
        <input type="text" id="ajuste-motivo" placeholder="Ej: Compra a proveedor, pérdida, inventario...">
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Stock.confirmarAjuste('${id}', ${stockActual})" style="width:auto;">
          Confirmar ajuste
        </button>
      </div>
    `);
  },

  async confirmarAjuste(id, stockActual) {
    const tipo  = document.getElementById('ajuste-tipo').value;
    const cant  = parseInt(document.getElementById('ajuste-cant').value) || 0;
    const motivo= document.getElementById('ajuste-motivo').value.trim();

    let nuevoStock;
    if (tipo === 'agregar')    nuevoStock = stockActual + cant;
    else if (tipo === 'restar') nuevoStock = Math.max(0, stockActual - cant);
    else                        nuevoStock = cant;

    try {
      const prodRef = db.collection('businesses').doc(PS.businessId).collection('productos').doc(id);
      await prodRef.update({ stock: nuevoStock, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });

      // Registrar movimiento
      await db.collection('businesses').doc(PS.businessId).collection('movimientos').add({
        productoId: id,
        tipo, cantidad: cant, stockAntes: stockActual, stockDespues: nuevoStock,
        motivo, fecha: firebase.firestore.FieldValue.serverTimestamp(),
        usuario: PS.user.uid
      });

      showToast(`Stock actualizado a ${nuevoStock} unidades`, 'success');
      closeModal();
      await this.load();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  },

  eliminar(id, nombre) {
    confirmDialog(`¿Eliminar el producto <strong>${nombre}</strong>? Esta acción no se puede deshacer.`, async () => {
      try {
        await db.collection('businesses').doc(PS.businessId).collection('productos').doc(id).delete();
        showToast('Producto eliminado', 'success');
        await this.load();
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
      }
    });
  }
};
