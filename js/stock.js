// ============================================================
// PUNTOSTOCK — Módulo de Stock (Supabase)
// ============================================================

const Stock = {
  productos: [],
  filtrados: [],

  async load() {
    const page = document.getElementById('page-stock');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando stock...</div>`;

    try {
      const { data, error } = await sb
        .from('productos')
        .select('*')
        .eq('business_id', PS.businessId)
        .order('nombre');
      if (error) throw error;
      this.productos = data || [];
      this.filtrados = [...this.productos];
      this.render(page);
    } catch (e) {
      page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error</h3><p>${e.message}</p></div>`;
    }
  },

  render(page) {
    const esTrial = (PS.businessData?.plan || 'trial') === 'trial';

    page.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="font-size:18px; font-weight:800;">Stock <span style="font-size:14px; font-weight:500; color:var(--text-muted);">(${this.productos.length})</span></div>
          <button class="btn btn-primary btn-sm" onclick="Stock.openModal()"
            style="display:flex; align-items:center; gap:6px; white-space:nowrap;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo producto
          </button>
        </div>
        <div class="search-input-wrapper" style="max-width:100%;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" id="stock-search" placeholder="Buscar producto..." oninput="Stock.filter(this.value)">
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
          <select id="stock-cat-filter" onchange="Stock.filterCat(this.value)"
            style="flex:1; min-width:140px; padding:8px 12px;">
            <option value="">Todas las categorías</option>
            ${[...new Set(this.productos.map(p => p.categoria).filter(Boolean))]
              .map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
          ${esTrial ? `
            <button class="btn btn-secondary btn-sm" onclick="Stock.bloquearImportExport()" style="opacity:0.6; position:relative; display:flex; align-items:center; gap:5px;">
              Importar
              <span style="position:absolute; top:-6px; right:-6px; background:var(--orange); color:white; font-size:9px; font-weight:700; padding:1px 5px; border-radius:4px;">PRO</span>
            </button>
            <button class="btn btn-secondary btn-sm" onclick="Stock.bloquearImportExport()" style="opacity:0.6; position:relative; display:flex; align-items:center; gap:5px;">
              Exportar
              <span style="position:absolute; top:-6px; right:-6px; background:var(--orange); color:white; font-size:9px; font-weight:700; padding:1px 5px; border-radius:4px;">PRO</span>
            </button>
          ` : `
            <label class="btn btn-secondary btn-sm" style="cursor:pointer; display:flex; align-items:center; gap:5px;">
              Importar
              <input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="Stock.importarCSV(this)">
            </label>
            <button class="btn btn-secondary btn-sm" onclick="Stock.exportarCSV()" style="display:flex; align-items:center; gap:5px;">Exportar</button>
          `}
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:16px;">
        <div class="stat-card" style="padding:12px 14px;">
          <div class="stat-label" style="font-size:11px;">TOTAL PRODUCTOS</div>
          <div class="stat-value" style="font-size:20px;">${this.productos.length}</div>
        </div>
        <div class="stat-card" style="padding:12px 14px;">
          <div class="stat-label" style="font-size:11px;">VALOR STOCK</div>
          <div class="stat-value green" style="font-size:18px;">
            ${formatPrice(this.productos.reduce((s,p) => s + (p.precio||0)*(p.stock||0), 0))}
          </div>
        </div>
        <div class="stat-card" style="padding:12px 14px;">
          <div class="stat-label" style="font-size:11px;">STOCK BAJO (≤5)</div>
          <div class="stat-value" style="font-size:20px; color:var(--orange);">
            ${this.productos.filter(p => (p.stock||0) <= 5 && (p.stock||0) > 0).length}
          </div>
        </div>
        <div class="stat-card" style="padding:12px 14px;">
          <div class="stat-label" style="font-size:11px;">SIN STOCK</div>
          <div class="stat-value" style="font-size:20px; color:var(--red);">
            ${this.productos.filter(p => (p.stock||0) <= 0).length}
          </div>
        </div>
      </div>

      <div id="stock-list-container"></div>
    `;
    this.renderTabla();
  },

  renderTabla() {
    const container = document.getElementById('stock-list-container');
    if (!container) return;
    const isMobile = window.innerWidth < 900;

    if (this.filtrados.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding:48px 0;">
          <div class="empty-state-icon">🔍</div>
          <h3>Sin resultados</h3>
          <p>Probá con otro término o categoría</p>
        </div>`;
      return;
    }

    if (isMobile) {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${this.filtrados.map(p => {
            const stock = p.stock || 0;
            const stockColor = stock <= 0 ? 'var(--red)' : stock <= 5 ? 'var(--orange)' : 'var(--green-primary)';
            const stockLabel = stock <= 0 ? 'Sin stock' : stock <= 5 ? 'Stock bajo' : 'En stock';
            const stockBadge = stock <= 0 ? 'badge-red' : stock <= 5 ? 'badge-orange' : 'badge-green';
            const esPeso = p.unidad === 'kg' || p.unidad === 'g';
            let vencInfo = '';
            if (p.vencimiento) {
              const dias = Math.ceil((new Date(p.vencimiento) - new Date()) / (1000*60*60*24));
              const vc = dias <= 7 ? 'var(--red)' : dias <= 30 ? 'var(--orange)' : 'var(--text-muted)';
              const vt = dias <= 0 ? 'Vencido' : dias === 1 ? 'Vence mañana' : `Vence en ${dias}d`;
              vencInfo = `<span style="font-size:11px; color:${vc}; font-weight:600;">${vt}</span>`;
            }
            return `
              <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:14px 16px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                  <div style="flex:1; min-width:0; margin-right:10px;">
                    <div style="font-weight:700; font-size:15px; line-height:1.2;">${p.nombre}</div>
                    ${p.categoria ? `<span class="badge badge-muted" style="margin-top:4px; display:inline-block;">${p.categoria}</span>` : ''}
                  </div>
                  <div style="text-align:right; flex-shrink:0;">
                    <div style="font-size:16px; font-weight:800; color:var(--green-primary);">${formatPrice(p.precio)}${esPeso?'/kg':''}</div>
                    ${p.costo ? `<div style="font-size:11px; color:var(--text-muted);">Costo: ${formatPrice(p.costo)}</div>` : ''}
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px; flex-wrap:wrap;">
                  ${esPeso
                    ? `<span class="badge badge-blue" style="font-size:11px;">Por peso / balanza</span>`
                    : `<div style="display:flex; align-items:baseline; gap:4px;">
                        <span style="font-size:22px; font-weight:800; color:${stockColor}; line-height:1;">${stock}</span>
                        <span style="font-size:11px; color:var(--text-muted);">uds</span>
                       </div>
                       <span class="badge ${stockBadge}" style="font-size:11px;">${stockLabel}</span>`
                  }
                  ${p.codigo ? `<span style="font-size:11px; color:var(--text-muted); font-family:var(--font-mono);">${p.codigo}</span>` : ''}
                  ${vencInfo}
                </div>
                <div style="display:flex; gap:8px;">
                  <button onclick="Stock.ajustarStock('${p.id}', '${p.nombre.replace(/'/g,"\\'")}', ${stock})"
                    style="flex:1; padding:9px; background:var(--bg-secondary); border:1px solid var(--border);
                           border-radius:var(--radius-md); font-size:13px; font-weight:600;
                           color:var(--text-primary); cursor:pointer;">
                    Ajustar stock
                  </button>
                  <button onclick="Stock.openModal('${p.id}')"
                    style="padding:9px 14px; background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); cursor:pointer; color:var(--text-primary);">
                    ✏
                  </button>
                  <button onclick="Stock.eliminar('${p.id}', '${p.nombre.replace(/'/g,"\\'")}' )"
                    style="padding:9px 14px; background:rgba(248,81,73,0.08); border:1px solid rgba(248,81,73,0.3); border-radius:var(--radius-md); cursor:pointer; color:var(--red);">
                    🗑
                  </button>
                </div>
              </div>`;
          }).join('')}
        </div>`;
    } else {
      container.innerHTML = `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Producto</th><th>Código</th><th>Categoría</th>
                <th>Precio venta</th><th>Precio costo</th><th>Stock</th>
                <th>Estado</th><th>Vencimiento</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${this.filtrados.map(p => {
                const stock = p.stock || 0;
                const stockClass = stock <= 0 ? 'td-red' : stock <= 5 ? '' : 'td-green';
                const stockBadge = stock <= 0 ? 'badge-red' : stock <= 5 ? 'badge-orange' : 'badge-green';
                const stockLabel = stock <= 0 ? 'Sin stock' : stock <= 5 ? 'Stock bajo' : 'En stock';
                return `
                <tr>
                  <td><div style="font-weight:600;">${p.nombre}</div></td>
                  <td class="td-mono td-muted">${p.codigo || '—'}</td>
                  <td><span class="badge badge-muted">${p.categoria || 'Sin cat.'}</span></td>
                  <td class="td-mono td-green">${formatPrice(p.precio)}</td>
                  <td class="td-mono td-muted">${p.costo ? formatPrice(p.costo) : '—'}</td>
                  <td>
                    ${p.unidad === 'kg' || p.unidad === 'g'
                      ? '<span class="badge badge-blue" style="font-size:10px;">Por peso / kg</span>'
                      : `<span class="td-mono font-bold ${stockClass}" style="font-size:15px;">${stock}</span>`
                    }
                  </td>
                  <td><span class="badge ${stockBadge}">${stockLabel}</span></td>
                  <td>
                    ${(() => {
                      if (!p.vencimiento) return '<span style="color:var(--text-muted); font-size:12px;">—</span>';
                      const dias = Math.ceil((new Date(p.vencimiento) - new Date()) / (1000*60*60*24));
                      const color = dias <= 0 ? 'var(--red)' : dias <= 30 ? 'var(--orange)' : 'var(--text-secondary)';
                      return `<span style="color:${color}; font-size:12px;">${p.vencimiento} (${dias <= 0 ? 'Vencido' : dias + 'd'})</span>`;
                    })()}
                  </td>
                  <td>
                    <div style="display:flex; gap:6px;">
                      <button class="btn btn-sm btn-secondary" onclick="Stock.ajustarStock('${p.id}', '${p.nombre.replace(/'/g,"\\'")}', ${stock})">Stock</button>
                      <button class="btn btn-sm btn-secondary" onclick="Stock.openModal('${p.id}')">✏</button>
                      <button class="btn btn-sm btn-danger" onclick="Stock.eliminar('${p.id}', '${p.nombre.replace(/'/g,"\\'")}')">🗑</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
    }
  },

  filter(q) {
    q = q.toLowerCase().trim();
    const cat = document.getElementById('stock-cat-filter')?.value || '';
    this.filtrados = this.productos.filter(p => {
      const matchQ = !q || p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q);
      const matchC = !cat || p.categoria === cat;
      return matchQ && matchC;
    });
    this.renderTabla();
  },

  filterCat() { this.filter(document.getElementById('stock-search')?.value || ''); },

  openModal(id) {
    const prod  = id ? this.productos.find(p => p.id === id) : null;
    const cats  = [...new Set(this.productos.map(p => p.categoria).filter(Boolean))];
    const esPeso = prod?.unidad === 'kg' || prod?.unidad === 'g';

    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">${prod ? 'Editar producto' : 'Nuevo producto'}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body" style="display:flex; flex-direction:column; gap:0;">
        <input type="hidden" id="prod-unidad" value="${prod?.unidad || 'unidad'}">
        <div class="form-group"><label>Nombre del producto *</label>
          <input type="text" id="prod-nombre" value="${prod?.nombre || ''}" autofocus></div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <div class="form-group" style="margin:0;"><label>Precio de venta *</label>
            <input type="number" id="prod-precio" value="${prod?.precio || ''}" min="0" step="0.01"></div>
          <div class="form-group" style="margin:0;"><label>Precio de costo</label>
            <input type="number" id="prod-costo" value="${prod?.costo || ''}" min="0" step="0.01"></div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
          <div class="form-group" style="margin:0;"><label>Código / SKU</label>
            <input type="text" id="prod-codigo" value="${prod?.codigo || ''}"></div>
          <div class="form-group" style="margin:0;"><label>Categoría</label>
            <input type="text" id="prod-cat" value="${prod?.categoria || ''}" list="cats-datalist">
            <datalist id="cats-datalist">${cats.map(c => `<option value="${c}">`).join('')}</datalist>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:10px;">
          <div class="form-group" style="margin:0;"><label>Stock actual</label>
            <input type="number" id="prod-stock" value="${prod?.stock ?? 0}" min="0"></div>
          <div class="form-group" style="margin:0;"><label>Vencimiento</label>
            <input type="date" id="prod-vencimiento" value="${prod?.vencimiento || ''}"></div>
        </div>
        <div class="form-group" style="margin-top:10px;"><label>Descripción</label>
          <input type="text" id="prod-desc" value="${prod?.descripcion || ''}" placeholder="Opcional"></div>
        <div style="display:flex; align-items:center; justify-content:space-between;
          padding:10px 14px; background:var(--bg-secondary); border:1px solid var(--border);
          border-radius:var(--radius-md); margin-top:12px;">
          <div><div style="font-size:13px; font-weight:600;">Producto activo</div></div>
          <label class="toggle" style="margin:0;">
            <input type="checkbox" id="prod-activo" ${prod?.activo !== false ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Stock.guardar('${id || ''}')">
          ${prod ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    `);
  },

  async guardar(id) {
    const nombre      = document.getElementById('prod-nombre').value.trim();
    const precio      = parseFloat(document.getElementById('prod-precio').value) || 0;
    const costo       = parseFloat(document.getElementById('prod-costo').value) || null;
    const stock       = parseInt(document.getElementById('prod-stock').value) || 0;
    const codigo      = document.getElementById('prod-codigo').value.trim() || null;
    const cat         = document.getElementById('prod-cat').value.trim() || null;
    const desc        = document.getElementById('prod-desc').value.trim() || null;
    const activo      = document.getElementById('prod-activo').checked;
    const vencimiento = document.getElementById('prod-vencimiento').value || null;

    if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }
    if (isNaN(precio) || precio < 0) { showToast('Precio inválido', 'error'); return; }

    const data = {
      business_id: PS.businessId,
      nombre, precio, stock, activo,
      costo, codigo, categoria: cat, descripcion: desc, vencimiento,
      updated_at: new Date().toISOString()
    };

    try {
      if (id) {
        const { error } = await sb.from('productos').update(data).eq('id', id);
        if (error) throw error;
        showToast('Producto actualizado', 'success');
      } else {
        const { error } = await sb.from('productos').insert({ ...data, created_at: new Date().toISOString() });
        if (error) throw error;
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
        <h3 class="modal-title">Ajustar stock</h3>
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
          <option value="establecer">Establecer cantidad exacta</option>
        </select>
      </div>
      <div class="form-group">
        <label>Cantidad</label>
        <input type="number" id="ajuste-cant" value="1" min="0">
      </div>
      <div class="form-group">
        <label>Motivo (opcional)</label>
        <input type="text" id="ajuste-motivo" placeholder="Ej: Compra a proveedor, pérdida...">
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Stock.confirmarAjuste('${id}', ${stockActual}, '${nombre.replace(/'/g,"\\'")}')">
          Confirmar ajuste
        </button>
      </div>
    `);
  },

  async confirmarAjuste(id, stockActual, nombre) {
    const tipo   = document.getElementById('ajuste-tipo').value;
    const cant   = parseInt(document.getElementById('ajuste-cant').value) || 0;
    const motivo = document.getElementById('ajuste-motivo').value.trim();

    let nuevoStock;
    if (tipo === 'agregar')     nuevoStock = stockActual + cant;
    else if (tipo === 'restar') nuevoStock = Math.max(0, stockActual - cant);
    else                        nuevoStock = cant;

    try {
      const { error: stockError } = await sb
        .from('productos')
        .update({ stock: nuevoStock, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (stockError) throw stockError;

      // Registrar movimiento
      await sb.from('movimientos').insert({
        business_id:    PS.businessId,
        producto_id:    id,
        producto_nombre: nombre,
        cantidad:       cant,
        motivo,
        stock_antes:    stockActual,
        stock_despues:  nuevoStock,
        fecha:          new Date().toISOString()
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
        const { error } = await sb.from('productos').delete().eq('id', id);
        if (error) throw error;
        showToast('Producto eliminado', 'success');
        await this.load();
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
      }
    });
  },

  bloquearImportExport() {
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Función exclusiva Pro</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div style="text-align:center; padding:20px 0;">
        <h3 style="margin-bottom:8px;">Importar y exportar es Pro</h3>
        <p style="color:var(--text-secondary); font-size:13px; max-width:280px; margin:0 auto 24px; line-height:1.6;">
          Disponible en los planes Pro y Multi-negocio.
        </p>
        <a href="https://wa.me/5493624897927" target="_blank"
           style="display:inline-flex; align-items:center; gap:8px; background:#25D366; color:white;
                  padding:12px 24px; border-radius:10px; font-weight:700; text-decoration:none; font-size:14px;">
          Contratar plan Pro
        </a>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
      </div>
    `);
  },

  async exportarCSV() {
    if (!this.productos.length) { showToast('No hay productos para exportar', 'warning'); return; }
    if (!window.XLSX) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    const data = this.productos.map(p => ({
      'Nombre':           p.nombre || '',
      'Precio venta':     p.precio || 0,
      'Precio costo':     p.costo || '',
      'Stock':            p.stock || 0,
      'Categoría':        p.categoria || '',
      'Código / SKU':     p.codigo || '',
      'Vencimiento':      p.vencimiento || '',
      'Activo':           p.activo !== false ? 'SI' : 'NO',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    const nombre = `stock-${(PS.businessData?.name || 'productos').replace(/[^a-z0-9]/gi,'-')}-${new Date().toLocaleDateString('es-AR').replace(/\//g,'-')}.xlsx`;
    XLSX.writeFile(wb, nombre);
    showToast(`${this.productos.length} productos exportados`, 'success');
  },

  async importarCSV(input) {
    const file = input.files[0];
    if (!file) return;
    const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    let rows = [], headers = [];

    if (isXLSX) {
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const buffer = await file.arrayBuffer();
      const wb     = XLSX.read(buffer, { type: 'array' });
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const data   = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (data.length < 2) { showToast('El archivo está vacío', 'error'); return; }
      headers = data[0].map(h => String(h).toLowerCase().trim());
      rows    = data.slice(1).filter(r => r.length > 0).map(r => headers.map((_, i) => String(r[i] ?? '')));
    } else {
      const text  = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { showToast('El archivo está vacío', 'error'); return; }
      const parseLine = (line) => {
        const result = []; let cur = '', inQ = false;
        for (const ch of line) {
          if (ch === '"') inQ = !inQ;
          else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
          else cur += ch;
        }
        result.push(cur.trim());
        return result;
      };
      headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/"/g,''));
      rows    = lines.slice(1).map(l => parseLine(l));
    }

    const getIdx = (...names) => names.map(n => headers.findIndex(h => h.includes(n))).find(i => i >= 0) ?? -1;
    const iNombre  = getIdx('nombre','name','producto');
    const iPrecio  = getIdx('precio','price','venta');
    const iCosto   = getIdx('costo','cost');
    const iStock   = getIdx('stock','cantidad');
    const iCat     = getIdx('categor');
    const iCodigo  = getIdx('código','codigo','sku');

    if (iNombre < 0) { showToast('No se encontró columna "Nombre"', 'error'); return; }

    const validos = rows.filter(r => r[iNombre]?.trim());
    if (!validos.length) { showToast('No se encontraron productos válidos', 'error'); return; }

    this._importRows    = validos;
    this._importHeaders = { iNombre, iPrecio, iCosto, iStock, iCat, iCodigo };

    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Importar ${validos.length} productos</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:12px 16px; margin-bottom:16px;">
        <div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">Vista previa (primeros 5):</div>
        ${validos.slice(0,5).map(r => `
          <div style="font-size:12px; padding:6px 0; border-bottom:1px solid var(--border); display:flex; gap:12px; justify-content:space-between;">
            <span style="font-weight:600;">${r[iNombre]}</span>
            <span style="color:var(--green-primary); font-family:var(--font-mono);">
              ${iPrecio >= 0 && r[iPrecio] ? formatPrice(parseFloat(r[iPrecio])||0) : ''}
            </span>
          </div>
        `).join('')}
        ${validos.length > 5 ? `<div style="font-size:11px; color:var(--text-muted); margin-top:6px;">... y ${validos.length-5} más</div>` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" style="width:auto;" onclick="Stock.confirmarImport()">
          Importar ${validos.length} productos
        </button>
      </div>
    `);
    input.value = '';
  },

  async confirmarImport() {
    const { iNombre, iPrecio, iCosto, iStock, iCat, iCodigo } = this._importHeaders;
    const rows = this._importRows;
    if (!rows) return;

    closeModal();
    showToast('Importando productos...', 'info');

    const BATCH_SIZE = 50;
    let count = 0;

    // Filtrar solo los que no existen
    const nuevos = [];
    for (const r of rows) {
      const nombre = r[iNombre]?.replace(/^"|"$/g,'').trim();
      if (!nombre) continue;
      const existe = this.productos.find(p =>
        p.nombre?.toLowerCase() === nombre.toLowerCase() ||
        (iCodigo >= 0 && r[iCodigo] && p.codigo === r[iCodigo].replace(/^"|"$/g,''))
      );
      if (existe) continue;
      nuevos.push({
        business_id: PS.businessId,
        nombre,
        precio:      parseFloat(r[iPrecio]) || 0,
        costo:       iCosto >= 0 ? parseFloat(r[iCosto]) || null : null,
        stock:       iStock >= 0 ? parseInt(r[iStock]) || 0 : 0,
        categoria:   iCat >= 0 ? r[iCat]?.replace(/^"|"$/g,'').trim() || null : null,
        codigo:      iCodigo >= 0 ? r[iCodigo]?.replace(/^"|"$/g,'').trim() || null : null,
        activo:      true
      });
    }

    // Insertar en batches de 50
    for (let i = 0; i < nuevos.length; i += BATCH_SIZE) {
      const batch = nuevos.slice(i, i + BATCH_SIZE);
      const { error } = await sb.from('productos').insert(batch);
      if (error) { showToast('Error importando: ' + error.message, 'error'); return; }
      count += batch.length;
    }

    showToast(`${count} productos importados correctamente`, 'success');
    await this.load();
  }
};
