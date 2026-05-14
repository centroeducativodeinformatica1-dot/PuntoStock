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
    const esTrial = (PS.businessData?.plan || 'trial') === 'trial';

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

          <!-- Importar -->
          ${esTrial ? `
            <button class="btn btn-secondary btn-sm" onclick="Stock.bloquearImportExport()"
              title="Función exclusiva de planes Pro"
              style="opacity:0.6; position:relative;">
              ⬆ Importar
              <span style="position:absolute; top:-6px; right:-6px; background:var(--orange);
                           color:white; font-size:9px; font-weight:700; padding:1px 5px;
                           border-radius:4px;">PRO</span>
            </button>
          ` : `
            <label class="btn btn-secondary btn-sm" style="cursor:pointer;" title="Importar desde Excel o CSV">
              ⬆ Importar Excel/CSV
              <input type="file" accept=".csv,.xlsx,.xls" style="display:none;" onchange="Stock.importarCSV(this)">
            </label>
          `}

          <!-- Exportar -->
          ${esTrial ? `
            <button class="btn btn-secondary btn-sm" onclick="Stock.bloquearImportExport()"
              title="Función exclusiva de planes Pro"
              style="opacity:0.6; position:relative;">
              ⬇ Exportar Excel
              <span style="position:absolute; top:-6px; right:-6px; background:var(--orange);
                           color:white; font-size:9px; font-weight:700; padding:1px 5px;
                           border-radius:4px;">PRO</span>
            </button>
          ` : `
            <button class="btn btn-secondary btn-sm" onclick="Stock.exportarCSV()" title="Exportar stock a Excel">
              ⬇ Exportar Excel
            </button>
          `}

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
              <th>Vencimiento</th>
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
            ${p.promo?.activa ? `
              <div style="display:inline-flex; align-items:center; gap:4px; margin-top:3px;
                           background:rgba(240,165,0,0.12); border:1px solid rgba(240,165,0,0.3);
                           border-radius:4px; padding:2px 7px; font-size:10px; font-weight:700; color:var(--orange);">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                ${p.promo.texto || p.promo.tipo}
              </div>
            ` : ''}
          </td>
          <td class="td-mono td-muted">${p.codigo || p.codigoBarra || '—'}</td>
          <td><span class="badge badge-muted">${p.categoria || 'Sin cat.'}</span></td>
          <td class="td-mono td-green">${formatPrice(p.precio)}${p.unidad === 'kg' || p.unidad === 'g' ? '/kg' : ''}</td>
          <td class="td-mono td-muted">${p.precioCosto ? formatPrice(p.precioCosto) : '—'}</td>
          <td>
            ${p.unidad === 'kg' || p.unidad === 'g'
              ? '<span class="badge badge-blue" style="font-size:10px;">Por peso / kg</span>'
              : `<span class="td-mono font-bold ${stockClass}" style="font-size:15px;">${stock}</span>`
            }
          </td>
          <td>
            ${p.unidad === 'kg' || p.unidad === 'g'
              ? '<span class="badge badge-green">Con balanza</span>'
              : `<span class="badge ${stockBadge}">${stockLabel}</span>`
            }
          </td>
          <td>
            ${(() => {
              if (!p.vencimiento) return '<span style="color:var(--text-muted); font-size:12px;">—</span>';
              const dias = Math.ceil((new Date(p.vencimiento) - new Date()) / (1000*60*60*24));
              const color = dias <= 0 ? 'var(--red)' : dias <= 7 ? 'var(--red)' : dias <= 30 ? 'var(--orange)' : 'var(--text-secondary)';
              const texto = dias <= 0 ? '¡Vencido!' : dias === 1 ? 'Mañana' : `${dias}d`;
              return `<span style="color:${color}; font-size:12px; font-weight:${dias<=30?700:400};">${p.vencimiento} <span style="font-size:10px;">(${texto})</span></span>`;
            })()}
          </td>
            <td>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm btn-secondary" onclick="Stock.ajustarStock('${p.id}', '${p.nombre}', ${stock})"
                style="display:flex; align-items:center; gap:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Stock
              </button>
              <button class="btn btn-sm btn-secondary" onclick="Stock.openModal('${p.id}')"
                style="display:flex; align-items:center; gap:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="btn btn-sm btn-danger" onclick="Stock.eliminar('${p.id}', '${p.nombre}')"
                style="display:flex; align-items:center; gap:4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
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
    const prod    = id ? this.productos.find(p => p.id === id) : null;
    const cats    = [...new Set(this.productos.map(p => p.categoria).filter(Boolean))];
    const esPeso  = prod?.unidad === 'kg' || prod?.unidad === 'g';
    const tipo    = PS.businessData?.tipoNegocio || 'otro';

    // Configuración por tipo de negocio
    const cfg = {
      kiosco:     { balanza: true,  vencimiento: true,  envio: false, talle: false, color: false },
      ropa:       { balanza: false, vencimiento: false, envio: true,  talle: true,  color: true  },
      comida:     { balanza: true,  vencimiento: true,  envio: true,  talle: false, color: false },
      verduleria: { balanza: true,  vencimiento: true,  envio: false, talle: false, color: false },
      farmacia:   { balanza: false, vencimiento: true,  envio: false, talle: false, color: false },
      electronica:{ balanza: false, vencimiento: false, envio: true,  talle: false, color: false },
      ferreteria: { balanza: false, vencimiento: false, envio: false, talle: false, color: false },
      otro:       { balanza: true,  vencimiento: true,  envio: false, talle: false, color: false },
    }[tipo] || { balanza: true, vencimiento: true, envio: false, talle: false, color: false };

    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">${prod ? 'Editar producto' : '+ Nuevo producto'}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>

      <!-- Selector balanza — solo rubros que lo necesitan -->
      ${cfg.balanza ? `
      <div class="form-group" style="margin-bottom:20px;">
        <label>Tipo de producto</label>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:4px;">
          <label id="tipo-unidad-label" onclick="Stock.setTipo('unidad')"
            style="display:flex; align-items:center; gap:10px; padding:12px 14px;
                   border:2px solid ${!esPeso ? 'var(--green-primary)' : 'var(--border)'};
                   border-radius:var(--radius-md); cursor:pointer; transition:all 0.2s;
                   background:${!esPeso ? 'var(--green-muted)' : 'var(--bg-card)'};">
            <input type="radio" name="prod-tipo" value="unidad" ${!esPeso ? 'checked' : ''}
              style="accent-color:var(--green-primary); width:16px; height:16px;">
            <div>
              <div style="font-weight:700; font-size:13px;">Por unidad</div>
              <div style="font-size:11px; color:var(--text-secondary);">Precio fijo por unidad</div>
            </div>
          </label>
          <label id="tipo-peso-label" onclick="Stock.setTipo('kg')"
            style="display:flex; align-items:center; gap:10px; padding:12px 14px;
                   border:2px solid ${esPeso ? 'var(--green-primary)' : 'var(--border)'};
                   border-radius:var(--radius-md); cursor:pointer; transition:all 0.2s;
                   background:${esPeso ? 'var(--green-muted)' : 'var(--bg-card)'};">
            <input type="radio" name="prod-tipo" value="kg" ${esPeso ? 'checked' : ''}
              style="accent-color:var(--green-primary); width:16px; height:16px;">
            <div>
              <div style="font-weight:700; font-size:13px;">Por peso / balanza</div>
              <div style="font-size:11px; color:var(--text-secondary);">Precio por kg, venta en gramos</div>
            </div>
          </label>
        </div>
        <div id="peso-aviso" style="display:${esPeso ? 'flex' : 'none'}; align-items:center; gap:8px;
             margin-top:10px; padding:10px 12px; background:rgba(126,211,33,0.08);
             border:1px solid var(--border-green); border-radius:var(--radius-md); font-size:12px; color:var(--green-primary);">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Al vender se abrirá la calculadora de balanza. El precio es por kilogramo.
        </div>
      </div>
      ` : ''}

      <input type="hidden" id="prod-unidad" value="${prod?.unidad || 'unidad'}">

      <div class="grid-2">
        <div class="form-group" style="grid-column:1/-1;">
          <label>Nombre del producto *</label>
          <input type="text" id="prod-nombre" value="${prod?.nombre || ''}">
        </div>
        <div class="form-group">
          <label>Código / SKU</label>
          <input type="text" id="prod-codigo" value="${prod?.codigo || ''}">
        </div>
        <div class="form-group">
          <label>Código de barras</label>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="prod-barcode" value="${prod?.codigoBarra || ''}"
              style="flex:1;" placeholder="Escribí o escaneá">
            <button type="button" onclick="Stock.abrirCamaraBarcode()"
              title="Escanear con cámara"
              style="width:42px; height:42px; flex-shrink:0; background:var(--bg-card);
                     border:1px solid var(--border); border-radius:var(--radius-md);
                     cursor:pointer; display:flex; align-items:center; justify-content:center;
                     color:var(--text-secondary); transition:all 0.2s;"
              onmouseenter="this.style.borderColor='var(--green-primary)';this.style.color='var(--green-primary)'"
              onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
          </div>
          <!-- Visor de cámara en el modal de stock -->
          <div id="stock-camera-container" style="display:none; margin-top:8px; position:relative;
               border-radius:var(--radius-md); overflow:hidden; border:2px solid var(--green-primary); background:#000;">
            <video id="stock-camera-video" autoplay playsinline muted
              style="width:100%; max-height:200px; object-fit:cover; display:block;"></video>
            <canvas id="stock-camera-canvas" style="display:none;"></canvas>
            <!-- Marco -->
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none;">
              <div style="position:relative; width:200px; height:70px;">
                <div style="position:absolute; inset:0; box-shadow:0 0 0 9999px rgba(0,0,0,0.45); border-radius:4px;"></div>
                <div style="position:absolute; inset:0; border:2px solid var(--green-primary); border-radius:4px;"></div>
                <div style="position:absolute; top:-2px; left:-2px; width:16px; height:16px; border-top:3px solid var(--green-primary); border-left:3px solid var(--green-primary);"></div>
                <div style="position:absolute; top:-2px; right:-2px; width:16px; height:16px; border-top:3px solid var(--green-primary); border-right:3px solid var(--green-primary);"></div>
                <div style="position:absolute; bottom:-2px; left:-2px; width:16px; height:16px; border-bottom:3px solid var(--green-primary); border-left:3px solid var(--green-primary);"></div>
                <div style="position:absolute; bottom:-2px; right:-2px; width:16px; height:16px; border-bottom:3px solid var(--green-primary); border-right:3px solid var(--green-primary);"></div>
              </div>
            </div>
            <!-- Controles -->
            <div style="position:absolute; top:6px; right:6px; display:flex; gap:5px;">
              <button id="stock-torch-btn" onclick="Stock.toggleTorch()" title="Linterna"
                style="width:34px; height:34px; background:rgba(0,0,0,0.65);
                       border:2px solid rgba(255,255,255,0.25); border-radius:8px;
                       cursor:pointer; display:none; align-items:center; justify-content:center;
                       font-size:16px; transition:all 0.2s;">
                💡
              </button>
              <button onclick="Stock.stopCamara()"
                style="width:34px; height:34px; background:rgba(0,0,0,0.65);
                       border:2px solid rgba(255,255,255,0.25); border-radius:8px;
                       cursor:pointer; display:flex; align-items:center; justify-content:center;
                       color:white; font-size:15px;">✕</button>
            </div>
            <div id="stock-camera-status"
              style="position:absolute; bottom:0; left:0; right:0; padding:6px;
                     background:linear-gradient(transparent,rgba(0,0,0,0.8));
                     text-align:center; font-size:11px; font-weight:600; color:white;">
              Apuntá al código de barras
            </div>
          </div>
        </div>
        <div class="form-group">
          <label id="label-precio">Precio de venta${esPeso ? ' por kg *' : ' *'}</label>
          <div style="position:relative;">
            <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%);
                         color:var(--text-muted); font-weight:600; font-size:13px;">$</span>
            <input type="number" id="prod-precio" value="${prod?.precio || ''}" min="0" step="0.01"
              style="padding-left:26px;">
          </div>
          <div id="precio-hint" style="font-size:11px; color:var(--text-muted); margin-top:4px; display:${esPeso ? 'block' : 'none'};">
            Precio por kilogramo. Ej: Jamón a $8.000/kg → ingresás 8000. Al vender se cobra por los gramos que pese.
          </div>
        </div>
        <div class="form-group">
          <label>Precio de costo</label>
          <div style="position:relative;">
            <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%);
                         color:var(--text-muted); font-weight:600; font-size:13px;">$</span>
            <input type="number" id="prod-costo" value="${prod?.precioCosto || ''}" min="0" step="0.01"
              style="padding-left:26px;">
          </div>
        </div>

        <!-- Stock: ocultar para productos por peso -->
        <div class="form-group" id="stock-field" style="display:${esPeso ? 'none' : 'block'};">
          <label>Stock actual</label>
          <input type="number" id="prod-stock" value="${prod?.stock ?? 0}" min="0">
        </div>

        <div class="form-group">
          <label>Categoría</label>
          <input type="text" id="prod-cat" value="${prod?.categoria || ''}" list="cats-datalist">
          <datalist id="cats-datalist">
            ${cats.map(c => `<option value="${c}">`).join('')}
          </datalist>
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label>Descripción</label>
          <input type="text" id="prod-desc" value="${prod?.descripcion || ''}">
        </div>

        <!-- Fecha de vencimiento — solo rubros que lo necesitan -->
        ${cfg.vencimiento ? `
        <div class="form-group" style="grid-column:1/-1;">
          <label style="display:flex; align-items:center; gap:6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Fecha de vencimiento
            <span style="font-size:10px; color:var(--text-muted); font-weight:400; text-transform:none; letter-spacing:0;">(opcional)</span>
          </label>
          <input type="date" id="prod-vencimiento"
            value="${prod?.vencimiento || ''}"
            min="${new Date().toISOString().split('T')[0]}">
          ${prod?.vencimiento ? (() => {
            const dias = Math.ceil((new Date(prod.vencimiento) - new Date()) / (1000*60*60*24));
            const color = dias <= 0 ? 'var(--red)' : dias <= 7 ? 'var(--red)' : dias <= 30 ? 'var(--orange)' : 'var(--green-primary)';
            const texto = dias <= 0 ? 'Vencido' : dias === 1 ? 'Vence mañana' : `Vence en ${dias} días`;
            return `<div style="font-size:11px; color:${color}; margin-top:4px; font-weight:600;">⚠ ${texto}</div>`;
          })() : ''}
        </div>
        ` : ''}

        <!-- Talle y Color — solo indumentaria -->
        ${cfg.talle ? `
        <div class="form-group">
          <label style="display:flex; align-items:center; gap:6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>
            </svg>
            Talle <span style="font-size:10px; color:var(--text-muted); font-weight:400; text-transform:none; letter-spacing:0;">(opcional)</span>
          </label>
          <input type="text" id="prod-talle" value="${prod?.talle || ''}" placeholder="XS, S, M, L, XL, 38, 40...">
        </div>
        ` : ''}

        ${cfg.color ? `
        <div class="form-group">
          <label style="display:flex; align-items:center; gap:6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/>
              <circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/>
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
            </svg>
            Color <span style="font-size:10px; color:var(--text-muted); font-weight:400; text-transform:none; letter-spacing:0;">(opcional)</span>
          </label>
          <input type="text" id="prod-color" value="${prod?.color || ''}" placeholder="Rojo, Azul marino, Negro...">
        </div>
        ` : ''}

        <!-- Envío — indumentaria, electrónica, comida -->
        ${cfg.envio ? `
        <div class="form-group" style="grid-column:1/-1;">
          <label style="display:flex; align-items:center; gap:6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            Costo de envío
            <span style="font-size:10px; color:var(--text-muted); font-weight:400; text-transform:none; letter-spacing:0;">(opcional)</span>
          </label>
          <div style="position:relative;">
            <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%);
                         color:var(--text-muted); font-weight:600; font-size:13px;">$</span>
            <input type="number" id="prod-envio" value="${prod?.costoEnvio || ''}" min="0" step="0.01"
              style="padding-left:26px;" placeholder="0 = envío gratis">
          </div>
        </div>
        ` : ''}

      </div>

      <div class="form-group">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;
                       font-size:13px; text-transform:none; letter-spacing:0;">
          <label class="toggle">
            <input type="checkbox" id="prod-activo" ${prod?.activo !== false ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
          Producto activo (visible en ventas)
        </label>
      </div>

      <!-- Sección de promo -->
      <div style="border:1px solid var(--border); border-radius:var(--radius-md); padding:16px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span style="font-weight:700; font-size:13px;">Promoción</span>
            <span style="font-size:10px; color:var(--text-muted);">(opcional)</span>
          </div>
          <label class="toggle" style="margin:0;">
            <input type="checkbox" id="prod-tiene-promo"
              ${prod?.promo?.activa ? 'checked' : ''}
              onchange="Stock.togglePromo(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div id="promo-opciones" style="display:${prod?.promo?.activa ? 'block' : 'none'};">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            ${[
              { id:'2x1',    label:'2x1',                     sub:'Llevás 2, pagás 1',            svg:'<text x="2" y="17" font-size="11" font-weight="900" fill="currentColor">2x1</text>' },
              { id:'3x1',    label:'3x1',                     sub:'Llevás 3, pagás 1',            svg:'<text x="2" y="17" font-size="11" font-weight="900" fill="currentColor">3x1</text>' },
              { id:'4x1',    label:'4x1',                     sub:'Llevás 4, pagás 1',            svg:'<text x="2" y="17" font-size="11" font-weight="900" fill="currentColor">4x1</text>' },
              { id:'50off2', label:'50% OFF 2da unidad',      sub:'La 2da unidad al 50%',         svg:'<text x="1" y="13" font-size="8" font-weight="900" fill="currentColor">50%</text><text x="1" y="21" font-size="7" fill="currentColor">2da ud</text>' },
              { id:'30off',  label:'30% OFF',                 sub:'Descuento del 30%',            svg:'<text x="1" y="13" font-size="8" font-weight="900" fill="currentColor">30%</text><text x="2" y="21" font-size="7" fill="currentColor">OFF</text>' },
              { id:'custom', label:'Personalizada',           sub:'Escribí tu propia promo',      svg:'<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' },
            ].map(p => {
              const sel = prod?.promo?.tipo === p.id;
              return `
                <div onclick="Stock.selPromo('${p.id}')" id="promo-op-${p.id}"
                  style="display:flex; align-items:center; gap:10px; padding:10px 12px;
                         border:2px solid ${sel ? 'var(--orange)' : 'var(--border)'};
                         border-radius:var(--radius-md); cursor:pointer; transition:all 0.15s;
                         background:${sel ? 'rgba(240,165,0,0.08)' : 'var(--bg-card)'};">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                       stroke="${sel ? 'var(--orange)' : 'var(--text-muted)'}" stroke-width="1.5">
                    ${p.svg.startsWith('<text') ? p.svg.replace('fill="currentColor"', `fill="${sel ? 'var(--orange)' : 'var(--text-muted)'}"`) : p.svg}
                  </svg>
                  <div>
                    <div style="font-size:12px; font-weight:700; color:${sel ? 'var(--orange)' : 'var(--text-primary)'};">${p.label}</div>
                    <div style="font-size:10px; color:var(--text-muted);">${p.sub}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Campo texto para promo personalizada -->
          <div id="promo-custom-field" style="display:${prod?.promo?.tipo === 'custom' ? 'block' : 'none'}; margin-top:10px;">
            <input type="text" id="promo-custom-texto"
              value="${prod?.promo?.texto || ''}"
              placeholder="Ej: 3x2 en artículos seleccionados...">
          </div>

          <input type="hidden" id="promo-tipo-seleccionado" value="${prod?.promo?.tipo || ''}">
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Stock.guardar('${id || ''}')" style="width:auto;">
          ${prod ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    `);
  },

  // Cambiar tipo (unidad/kg) dinámicamente en el modal
  setTipo(tipo) {
    const esPeso = tipo === 'kg' || tipo === 'g';

    // Actualizar hidden input
    const unidadInput = document.getElementById('prod-unidad');
    if (unidadInput) unidadInput.value = tipo;

    // Actualizar radio visualmente
    document.querySelectorAll('input[name="prod-tipo"]').forEach(r => {
      r.checked = r.value === tipo;
    });

    // Actualizar estilos de las tarjetas
    const lblUnidad = document.getElementById('tipo-unidad-label');
    const lblPeso   = document.getElementById('tipo-peso-label');
    if (lblUnidad) {
      lblUnidad.style.borderColor = !esPeso ? 'var(--green-primary)' : 'var(--border)';
      lblUnidad.style.background  = !esPeso ? 'var(--green-muted)' : 'var(--bg-card)';
      lblUnidad.querySelector('div div:first-child').style.color = !esPeso ? 'var(--green-primary)' : 'var(--text-primary)';
    }
    if (lblPeso) {
      lblPeso.style.borderColor = esPeso ? 'var(--green-primary)' : 'var(--border)';
      lblPeso.style.background  = esPeso ? 'var(--green-muted)' : 'var(--bg-card)';
      lblPeso.querySelector('div div:first-child').style.color = esPeso ? 'var(--green-primary)' : 'var(--text-primary)';
    }

    // Mostrar/ocultar aviso y hint
    const aviso      = document.getElementById('peso-aviso');
    const hint       = document.getElementById('precio-hint');
    const stockField = document.getElementById('stock-field');
    const labelPrecio= document.getElementById('label-precio');

    if (aviso)       aviso.style.display      = esPeso ? 'flex' : 'none';
    if (hint)        hint.style.display       = esPeso ? 'block' : 'none';
    if (stockField)  stockField.style.display = esPeso ? 'none' : 'block';
    if (labelPrecio) labelPrecio.textContent  = esPeso ? 'Precio de venta por kg *' : 'Precio de venta *';
  },

  togglePromo(activa) {
    document.getElementById('promo-opciones').style.display = activa ? 'block' : 'none';
    if (!activa) {
      document.getElementById('promo-tipo-seleccionado').value = '';
      document.getElementById('promo-custom-field').style.display = 'none';
    }
  },

  selPromo(id) {
    document.getElementById('promo-tipo-seleccionado').value = id;
    // Resetear todos
    ['2x1','3x1','4x1','50off2','30off','custom'].forEach(p => {
      const el = document.getElementById(`promo-op-${p}`);
      if (!el) return;
      el.style.border = '2px solid var(--border)';
      el.style.background = 'var(--bg-card)';
      el.querySelector('div:first-child + div div:first-child').style.color = 'var(--text-primary)';
    });
    // Resaltar seleccionado
    const el = document.getElementById(`promo-op-${id}`);
    if (el) {
      el.style.border = '2px solid var(--orange)';
      el.style.background = 'rgba(240,165,0,0.08)';
    }
    // Mostrar/ocultar campo personalizado
    document.getElementById('promo-custom-field').style.display = id === 'custom' ? 'block' : 'none';
  },

  async guardar(id) {
    const nombre      = document.getElementById('prod-nombre').value.trim();
    const precio      = parseFloat(document.getElementById('prod-precio').value);
    const costo       = parseFloat(document.getElementById('prod-costo').value) || null;
    const stock       = parseInt(document.getElementById('prod-stock').value) || 0;
    const codigo      = document.getElementById('prod-codigo').value.trim();
    const barcode     = document.getElementById('prod-barcode').value.trim();
    const cat         = document.getElementById('prod-cat').value.trim();
    const unidad      = document.getElementById('prod-unidad').value;
    const desc        = document.getElementById('prod-desc').value.trim();
    const activo      = document.getElementById('prod-activo').checked;
    const vencimiento = document.getElementById('prod-vencimiento')?.value || null;
    const talle       = document.getElementById('prod-talle')?.value?.trim() || null;
    const color       = document.getElementById('prod-color')?.value?.trim() || null;
    const costoEnvio  = parseFloat(document.getElementById('prod-envio')?.value) || null;
    const tienePromo  = document.getElementById('prod-tiene-promo')?.checked || false;
    const promoTipo   = document.getElementById('promo-tipo-seleccionado')?.value || null;
    const promoTexto  = document.getElementById('promo-custom-texto')?.value?.trim() || null;

    const promo = tienePromo && promoTipo ? {
      activa: true,
      tipo:   promoTipo,
      texto:  promoTipo === 'custom' ? promoTexto : {
        '2x1':   '2x1 — Llevás 2, pagás 1',
        '3x1':   '3x1 — Llevás 3, pagás 1',
        '4x1':   '4x1 — Llevás 4, pagás 1',
        '50off2':'50% OFF en la 2da unidad',
        '30off': '30% OFF',
      }[promoTipo] || promoTipo,
    } : { activa: false, tipo: null, texto: null };

    if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }
    if (isNaN(precio) || precio < 0) { showToast('Precio inválido', 'error'); return; }

    const data = {
      nombre, precio, stock, activo, unidad,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (costo)       data.precioCosto  = costo;
    if (codigo)      data.codigo       = codigo;
    if (barcode)     data.codigoBarra  = barcode;
    if (cat)         data.categoria    = cat;
    if (desc)        data.descripcion  = desc;
    if (vencimiento) data.vencimiento  = vencimiento;
    else             data.vencimiento  = null;
    if (talle)       data.talle        = talle;
    if (color)       data.color        = color;
    if (costoEnvio)  data.costoEnvio   = costoEnvio;
    data.promo = promo;

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
  },

  // ── Bloqueo para plan trial ───────────────────────────────
  bloquearImportExport() {
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Función exclusiva Pro</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div style="text-align:center; padding:20px 0;">
        <div style="width:56px; height:56px; background:rgba(240,165,0,0.1); border-radius:50%;
                    display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h3 style="margin-bottom:8px;">Importar y exportar es Pro</h3>
        <p style="color:var(--text-secondary); font-size:13px; max-width:280px; margin:0 auto 24px; line-height:1.6;">
          La importación y exportación de productos está disponible en los planes Pro y Multi-negocio.
        </p>
        <a href="https://wa.me/5493624897927?text=Hola%2C%20quiero%20activar%20un%20plan%20Pro%20en%20PuntoStock"
           target="_blank"
           style="display:inline-flex; align-items:center; gap:8px; background:#25D366; color:white;
                  padding:12px 24px; border-radius:10px; font-weight:700; text-decoration:none; font-size:14px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
          </svg>
          Contratar plan Pro
        </a>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
      </div>
    `);
  },

  // ── Exportar XLSX ─────────────────────────────────────────
  async exportarCSV() {
    if (!this.productos.length) { showToast('No hay productos para exportar', 'warning'); return; }

    // Cargar SheetJS si no está
    if (!window.XLSX) {
      showToast('Preparando exportación...', 'info');
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    // Armar datos para el Excel
    const data = this.productos.map(p => ({
      'Nombre':          p.nombre || '',
      'Precio venta':    p.precio || 0,
      'Precio costo':    p.precioCosto || '',
      'Stock':           p.stock || 0,
      'Categoría':       p.categoria || '',
      'Código / SKU':    p.codigo || '',
      'Código de barras': p.codigoBarra || '',
      'Unidad':          p.unidad || 'unidad',
      'Activo':          p.activo !== false ? 'SI' : 'NO',
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 30 }, // Nombre
      { wch: 14 }, // Precio venta
      { wch: 14 }, // Precio costo
      { wch: 8  }, // Stock
      { wch: 18 }, // Categoría
      { wch: 16 }, // Código
      { wch: 18 }, // Código de barras
      { wch: 10 }, // Unidad
      { wch: 8  }, // Activo
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');

    const nombre = `stock-${(PS.businessData?.name || 'productos').replace(/[^a-z0-9]/gi,'-')}-${new Date().toLocaleDateString('es-AR').replace(/\//g,'-')}.xlsx`;
    XLSX.writeFile(wb, nombre);
    showToast(`${this.productos.length} productos exportados a Excel`, 'success');
  },

  // ── Importar CSV o XLSX ───────────────────────────────────
  async importarCSV(input) {
    const file = input.files[0];
    if (!file) return;

    let rows = [];
    let headers = [];

    const isXLSX = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isXLSX) {
      // Cargar SheetJS
      if (!window.XLSX) {
        showToast('Cargando lector de Excel...', 'info');
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
      rows    = data.slice(1).filter(r => r.length > 0);
      // Convertir a formato array con mismo índice que headers
      rows = rows.map(r => headers.map((_, i) => String(r[i] ?? '')));
    } else {
      // CSV normal
      const text  = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { showToast('El archivo está vacío', 'error'); return; }
      const parseCSVLine = (line) => {
        const result = []; let cur = '', inQ = false;
        for (const ch of line) {
          if (ch === '"') inQ = !inQ;
          else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
          else cur += ch;
        }
        result.push(cur.trim());
        return result;
      };
      headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/"/g,''));
      rows    = lines.slice(1).map(l => parseCSVLine(l));
    }

    const getIdx = (...names) => names.map(n => headers.findIndex(h => h.includes(n))).find(i => i >= 0) ?? -1;
    const iNombre  = getIdx('nombre', 'name', 'producto', 'descripcion');
    const iPrecio  = getIdx('precio', 'price', 'venta');
    const iCosto   = getIdx('costo', 'cost');
    const iStock   = getIdx('stock', 'cantidad', 'quantity');
    const iCat     = getIdx('categor');
    const iCodigo  = getIdx('código', 'codigo', 'sku', 'code');
    const iBarcode = getIdx('barra', 'barcode', 'ean');
    const iUnidad  = getIdx('unidad', 'unit');

    if (iNombre < 0) { showToast('No se encontró columna "Nombre"', 'error'); return; }

    const validos = rows.filter(r => r[iNombre]?.trim());
    if (!validos.length) { showToast('No se encontraron productos válidos', 'error'); return; }

    this._importRows    = validos;
    this._importHeaders = { iNombre, iPrecio, iCosto, iStock, iCat, iCodigo, iBarcode, iUnidad };

    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Importar ${validos.length} productos</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md);
                  padding:12px 16px; margin-bottom:16px;">
        <div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">Vista previa (primeros 5):</div>
        ${validos.slice(0,5).map(r => `
          <div style="font-size:12px; padding:6px 0; border-bottom:1px solid var(--border);
                      display:flex; gap:12px; justify-content:space-between; align-items:center;">
            <span style="font-weight:600;">${r[iNombre]}</span>
            <span style="color:var(--green-primary); font-family:var(--font-mono);">
              ${iPrecio >= 0 && r[iPrecio] ? formatPrice(parseFloat(r[iPrecio])||0) : ''}
            </span>
          </div>
        `).join('')}
        ${validos.length > 5 ? `<div style="font-size:11px; color:var(--text-muted); margin-top:6px;">... y ${validos.length-5} más</div>` : ''}
      </div>
      <div style="background:rgba(240,165,0,0.08); border:1px solid rgba(240,165,0,0.2); border-radius:var(--radius-md);
                  padding:10px 14px; font-size:12px; color:var(--orange);">
        ⚠ Los productos que ya existan con el mismo nombre o código no se duplicarán.
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
    const { iNombre, iPrecio, iCosto, iStock, iCat, iCodigo, iBarcode, iUnidad } = this._importHeaders;
    const rows = this._importRows;
    if (!rows) return;

    closeModal();
    showToast('Importando productos...', 'info');

    const batch = db.batch();
    const bizRef = db.collection('businesses').doc(PS.businessId).collection('productos');
    let count = 0;

    for (const r of rows) {
      const nombre = r[iNombre]?.replace(/^"|"$/g,'').trim();
      if (!nombre) continue;

      // Verificar si ya existe
      const existe = this.productos.find(p =>
        p.nombre?.toLowerCase() === nombre.toLowerCase() ||
        (iCodigo >= 0 && r[iCodigo] && p.codigo === r[iCodigo].replace(/^"|"$/g,''))
      );
      if (existe) continue;

      const data = {
        nombre,
        precio:      parseFloat(r[iPrecio]) || 0,
        precioCosto: iCosto >= 0 ? parseFloat(r[iCosto]) || null : null,
        stock:       iStock >= 0 ? parseInt(r[iStock]) || 0 : 0,
        categoria:   iCat >= 0 ? r[iCat]?.replace(/^"|"$/g,'').trim() || '' : '',
        codigo:      iCodigo >= 0 ? r[iCodigo]?.replace(/^"|"$/g,'').trim() || '' : '',
        codigoBarra: iBarcode >= 0 ? r[iBarcode]?.replace(/^"|"$/g,'').trim() || '' : '',
        unidad:      iUnidad >= 0 ? r[iUnidad]?.replace(/^"|"$/g,'').trim() || 'unidad' : 'unidad',
        activo:      true,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      };

      batch.set(bizRef.doc(), data);
      count++;

      // Firestore permite 500 ops por batch
      if (count % 499 === 0) { await batch.commit(); }
    }

    await batch.commit();
    showToast(`${count} productos importados correctamente`, 'success');
    await this.load();
  },

  // ══════════════════════════════════════════════════════════
  // CÁMARA EN MODAL DE STOCK — para escanear código de barras
  // ══════════════════════════════════════════════════════════
  _stockStream: null,
  _stockScanInterval: null,
  _stockTorchOn: false,
  _stockVideoTrack: null,

  async abrirCamaraBarcode() {
    const container = document.getElementById('stock-camera-container');
    const video     = document.getElementById('stock-camera-video');
    const status    = document.getElementById('stock-camera-status');
    if (!container || !video) return;

    // Si ya está abierta, cerrar
    if (this._stockStream) { this.stopCamara(); return; }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      this._stockStream = stream;
      video.srcObject = stream;
      container.style.display = 'block';

      // Linterna
      const track = stream.getVideoTracks()[0];
      this._stockVideoTrack = track;
      const caps = track.getCapabilities?.() || {};
      const torchBtn = document.getElementById('stock-torch-btn');
      if (torchBtn) torchBtn.style.display = caps.torch ? 'flex' : 'none';

      // Cargar ZXing si no está
      if (!window.ZXing) {
        if (status) status.textContent = 'Cargando lector...';
        await new Promise((resolve) => {
          if (window.ZXing) { resolve(); return; }
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/@zxing/library@0.18.6/umd/index.min.js';
          s.onload = resolve;
          s.onerror = resolve;
          document.head.appendChild(s);
        });
      }

      if (status) status.textContent = 'Apuntá al código de barras';
      this._iniciarScanStock(video);

    } catch (e) {
      if (e.name === 'NotAllowedError') {
        showToast('Permiso de cámara denegado. Habilitalo en el navegador.', 'error', 5000);
      } else {
        showToast('No se pudo acceder a la cámara.', 'error');
      }
    }
  },

  _iniciarScanStock(video) {
    if (!window.ZXing) return;
    const canvas  = document.getElementById('stock-camera-canvas');
    const status  = document.getElementById('stock-camera-status');
    const ctx     = canvas.getContext('2d');

    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
      ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8,
      ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.CODE_39,
      ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E,
      ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.DATA_MATRIX,
      ZXing.BarcodeFormat.ITF, ZXing.BarcodeFormat.CODABAR
    ]);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

    const reader = new ZXing.MultiFormatReader();
    reader.setHints(hints);

    this._stockScanInterval = setInterval(() => {
      if (video.readyState < 2) return;
      try {
        canvas.width  = video.videoWidth  || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData   = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const luminance = new ZXing.RGBLuminanceSource(imgData.data, canvas.width, canvas.height);
        const bitmap    = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminance));
        const result    = reader.decode(bitmap);

        if (result) {
          const code = result.getText();
          // Poner el código en el input
          const input = document.getElementById('prod-barcode');
          if (input) {
            input.value = code;
            input.style.borderColor = 'var(--green-primary)';
            input.style.boxShadow   = '0 0 0 3px var(--green-muted)';
          }
          if (status) status.textContent = `Detectado: ${code}`;
          // Beep
          this._beepStock();
          showToast(`Código escaneado: ${code}`, 'success', 2000);
          this.stopCamara();
        }
      } catch (e) { /* NotFoundException = sin código en frame */ }
    }, 250);
  },

  async toggleTorch() {
    if (!this._stockVideoTrack) return;
    const torchBtn = document.getElementById('stock-torch-btn');
    this._stockTorchOn = !this._stockTorchOn;
    try {
      await this._stockVideoTrack.applyConstraints({
        advanced: [{ torch: this._stockTorchOn }]
      });
      if (torchBtn) {
        torchBtn.style.background   = this._stockTorchOn ? 'rgba(126,211,33,0.3)' : 'rgba(0,0,0,0.65)';
        torchBtn.style.borderColor  = this._stockTorchOn ? 'var(--green-primary)' : 'rgba(255,255,255,0.25)';
        torchBtn.title = this._stockTorchOn ? 'Apagar linterna' : 'Encender linterna';
      }
    } catch (e) {
      showToast('Este dispositivo no soporta linterna.', 'warning');
      this._stockTorchOn = false;
    }
  },

  stopCamara() {
    if (this._stockVideoTrack && this._stockTorchOn) {
      this._stockVideoTrack.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
    }
    if (this._stockStream) {
      this._stockStream.getTracks().forEach(t => t.stop());
      this._stockStream = null;
    }
    if (this._stockScanInterval) {
      clearInterval(this._stockScanInterval);
      this._stockScanInterval = null;
    }
    this._stockVideoTrack = null;
    this._stockTorchOn = false;
    const container = document.getElementById('stock-camera-container');
    if (container) container.style.display = 'none';
  },

  _beepStock() {
    try {
      const ctx  = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15);
    } catch (e) { /* sin audio = ok */ }
  }
};
