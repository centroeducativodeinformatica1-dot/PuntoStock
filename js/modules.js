// ============================================================
// PUNTOSTOCK — Historial de Ventas
// ============================================================

const Historial = {
  ventas: [],

  async load() {
    const page = document.getElementById('page-historial');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando historial...</div>`;

    try {
      const snap = await db.collection('businesses').doc(PS.businessId)
        .collection('ventas').orderBy('fecha', 'desc').limit(200).get();
      this.ventas = [];
      snap.forEach(d => this.ventas.push({ id: d.id, ...d.data() }));
      this.render(page);
    } catch (e) {
      page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error</h3><p>${e.message}</p></div>`;
    }
  },

  render(page) {
    const totalVentas = this.ventas.reduce((s, v) => s + (v.total || 0), 0);

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-title">Historial de ventas</div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <input type="date" id="hist-desde" onchange="Historial.filtrar()"
            style="padding:8px 12px; font-size:13px; max-width:150px;">
          <input type="date" id="hist-hasta" onchange="Historial.filtrar()"
            style="padding:8px 12px; font-size:13px; max-width:150px;">
          <select id="hist-metodo" onchange="Historial.filtrar()"
            style="padding:8px 12px; max-width:160px;">
            <option value="">Todos los medios</option>
            <option>Efectivo</option>
            <option>Tarjeta</option>
            <option>Transferencia</option>
            <option>Cuenta corriente</option>
          </select>
        </div>
      </div>

      <div class="stat-grid" style="margin-bottom:20px;">
        <div class="stat-card" style="padding:14px 16px;">
          <div class="stat-label">Total facturado</div>
          <div class="stat-value green" style="font-size:22px;">${formatPrice(totalVentas)}</div>
        </div>
        <div class="stat-card" style="padding:14px 16px;">
          <div class="stat-label">Cantidad de ventas</div>
          <div class="stat-value" style="font-size:22px;">${this.ventas.length}</div>
        </div>
        <div class="stat-card" style="padding:14px 16px;">
          <div class="stat-label">Ticket promedio</div>
          <div class="stat-value" style="font-size:22px;">
            ${this.ventas.length ? formatPrice(totalVentas / this.ventas.length) : '$0'}
          </div>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Productos</th>
              <th>Subtotal</th>
              <th>Descuento</th>
              <th>Total</th>
              <th>Método</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="hist-tbody"></tbody>
        </table>
      </div>
    `;

    this.renderTabla(this.ventas);
  },

  renderTabla(ventas) {
    const tbody = document.getElementById('hist-tbody');
    if (!tbody) return;

    if (ventas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7">
        <div class="empty-state" style="padding:40px 0;">
          <div class="empty-state-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
          <h3>Sin ventas registradas</h3>
        </div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = ventas.map(v => {
      const items = v.items || [];
      const resumen = items.slice(0,2).map(i => `${i.nombre} x${i.cantidad}`).join(', ');
      const mas = items.length > 2 ? ` +${items.length-2} más` : '';
      const metBadge = { Efectivo:'badge-green', Tarjeta:'badge-blue', Transferencia:'badge-blue', 'Cuenta corriente':'badge-orange' };

      return `
        <tr>
          <td class="td-mono td-muted" style="font-size:12px; white-space:nowrap;">
            ${formatDateTime(v.fecha)}
          </td>
          <td>
            <div style="font-size:12px; color:var(--text-secondary); max-width:220px;
                        overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              ${resumen}${mas}
            </div>
          </td>
          <td class="td-mono">${formatPrice(v.subtotal)}</td>
          <td style="color:var(--orange);">${v.descuento ? v.descuento + '%' : '—'}</td>
          <td class="td-mono td-green font-bold">${formatPrice(v.total)}</td>
          <td><span class="badge ${metBadge[v.metodoPago] || 'badge-muted'}">${v.metodoPago || '—'}</span></td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="Historial.verDetalle('${v.id}')">
              Ver detalle
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  filtrar() {
    const desde  = document.getElementById('hist-desde')?.value;
    const hasta  = document.getElementById('hist-hasta')?.value;
    const metodo = document.getElementById('hist-metodo')?.value;

    let result = [...this.ventas];
    if (desde) result = result.filter(v => {
      const d = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
      return d >= new Date(desde + 'T00:00:00');
    });
    if (hasta) result = result.filter(v => {
      const d = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
      return d <= new Date(hasta + 'T23:59:59');
    });
    if (metodo) result = result.filter(v => v.metodoPago === metodo);

    this.renderTabla(result);
  },

  verDetalle(id) {
    const v = this.ventas.find(v => v.id === id);
    if (!v) return;
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">🧾 Detalle de venta</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <p style="color:var(--text-secondary); font-size:13px; margin-bottom:20px;">
        ${formatDateTime(v.fecha)} — ${v.metodoPago}
      </p>
      <div class="table-wrapper" style="margin-bottom:16px;">
        <table>
          <thead><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${(v.items || []).map(i => `
              <tr>
                <td>${i.nombre}</td>
                <td class="td-mono">${formatPrice(i.precio)}</td>
                <td class="td-mono">${i.cantidad}</td>
                <td class="td-mono td-green">${formatPrice(i.precio * i.cantidad)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div style="background:var(--bg-secondary); padding:16px; border-radius:var(--radius-md);">
        <div class="total-row"><span>Subtotal</span><span class="td-mono">${formatPrice(v.subtotal)}</span></div>
        ${v.descuento ? `<div class="total-row"><span>Descuento ${v.descuento}%</span>
          <span class="td-mono" style="color:var(--orange);">-${formatPrice(v.subtotal * v.descuento/100)}</span></div>` : ''}
        <div class="total-row main"><span>TOTAL</span><span>${formatPrice(v.total)}</span></div>
      </div>
    `);
  }
};

// ============================================================
// PUNTOSTOCK — Clientes
// ============================================================

const Clientes = {
  lista: [],

  async load() {
    const page = document.getElementById('page-clientes');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando clientes...</div>`;

    try {
      const snap = await db.collection('businesses').doc(PS.businessId)
        .collection('clientes').orderBy('nombre').get();
      this.lista = [];
      snap.forEach(d => this.lista.push({ id: d.id, ...d.data() }));
      this.render(page);
    } catch (e) {
      page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error</h3><p>${e.message}</p></div>`;
    }
  },

  render(page) {
    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-title">Clientes (${this.lista.length})</div>
        <div style="display:flex; gap:10px; align-items:center;">
          <div class="search-input-wrapper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Buscar cliente..." oninput="Clientes.filter(this.value)">
          </div>
          <button class="btn btn-primary btn-sm" onclick="Clientes.openModal()">+ Nuevo cliente</button>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>CUIT/DNI</th>
              <th>Saldo CC</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="clientes-tbody"></tbody>
        </table>
      </div>
    `;
    this.renderTabla(this.lista);
  },

  renderTabla(lista) {
    const tbody = document.getElementById('clientes-tbody');
    if (!tbody) return;

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state" style="padding:40px 0;">
          <div class="empty-state-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
          <h3>Sin clientes todavía</h3>
          <p>Agregá tu primer cliente</p>
        </div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map(c => `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:32px; height:32px; background:var(--green-muted); border-radius:50%;
                        display:flex; align-items:center; justify-content:center; font-weight:700;
                        color:var(--green-primary); font-size:13px; flex-shrink:0;">
              ${c.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style="font-weight:600;">${c.nombre}</div>
              ${c.notas ? `<div style="font-size:11px; color:var(--text-muted);">${c.notas}</div>` : ''}
            </div>
          </div>
        </td>
        <td class="td-muted">${c.email || '—'}</td>
        <td class="td-muted">${c.telefono || '—'}</td>
        <td class="td-mono td-muted">${c.cuit || '—'}</td>
        <td class="td-mono ${(c.saldoCC || 0) < 0 ? 'td-red' : 'td-green'}">
          ${formatPrice(c.saldoCC || 0)}
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-sm btn-secondary" onclick="Clientes.openModal('${c.id}')">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="Clientes.eliminar('${c.id}', '${c.nombre}')"></button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  filter(q) {
    q = q.toLowerCase().trim();
    const filtrados = q
      ? this.lista.filter(c =>
          c.nombre?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.telefono?.includes(q)
        )
      : [...this.lista];
    this.renderTabla(filtrados);
  },

  openModal(id) {
    const c = id ? this.lista.find(x => x.id === id) : null;
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">${c ? 'Editar cliente' : '+ Nuevo cliente'}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="grid-2">
        <div class="form-group" style="grid-column:1/-1;">
          <label>Nombre completo *</label>
          <input type="text" id="cli-nombre" value="${c?.nombre || ''}" placeholder="Juan García">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="cli-email" value="${c?.email || ''}" placeholder="juan@email.com">
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input type="text" id="cli-tel" value="${c?.telefono || ''}" placeholder="+54 11 ...">
        </div>
        <div class="form-group">
          <label>CUIT / DNI</label>
          <input type="text" id="cli-cuit" value="${c?.cuit || ''}" placeholder="20-12345678-9">
        </div>
        <div class="form-group">
          <label>Saldo cuenta corriente</label>
          <input type="number" id="cli-saldo" value="${c?.saldoCC || 0}" step="0.01">
        </div>
        <div class="form-group" style="grid-column:1/-1;">
          <label>Notas</label>
          <textarea id="cli-notas" placeholder="Notas internas...">${c?.notas || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Clientes.guardar('${id || ''}')" style="width:auto;">
          ${c ? 'Guardar cambios' : 'Crear cliente'}
        </button>
      </div>
    `);
  },

  async guardar(id) {
    const nombre = document.getElementById('cli-nombre').value.trim();
    if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }

    const data = {
      nombre,
      email:    document.getElementById('cli-email').value.trim(),
      telefono: document.getElementById('cli-tel').value.trim(),
      cuit:     document.getElementById('cli-cuit').value.trim(),
      saldoCC:  parseFloat(document.getElementById('cli-saldo').value) || 0,
      notas:    document.getElementById('cli-notas').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      const col = db.collection('businesses').doc(PS.businessId).collection('clientes');
      if (id) {
        await col.doc(id).update(data);
        showToast('Cliente actualizado', 'success');
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await col.add(data);
        showToast('Cliente creado', 'success');
      }
      closeModal();
      await this.load();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  },

  eliminar(id, nombre) {
    confirmDialog(`¿Eliminar al cliente <strong>${nombre}</strong>?`, async () => {
      try {
        await db.collection('businesses').doc(PS.businessId).collection('clientes').doc(id).delete();
        showToast('Cliente eliminado', 'success');
        await this.load();
      } catch (e) { showToast('Error: ' + e.message, 'error'); }
    });
  }
};

// ============================================================
// PUNTOSTOCK — Proveedores
// ============================================================

const Proveedores = {
  lista: [],

  async load() {
    const page = document.getElementById('page-proveedores');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando...</div>`;

    try {
      const snap = await db.collection('businesses').doc(PS.businessId)
        .collection('proveedores').orderBy('nombre').get();
      this.lista = [];
      snap.forEach(d => this.lista.push({ id: d.id, ...d.data() }));
      this.render(page);
    } catch (e) {
      page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error</h3><p>${e.message}</p></div>`;
    }
  },

  render(page) {
    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-title">Proveedores (${this.lista.length})</div>
        <button class="btn btn-primary btn-sm" onclick="Proveedores.openModal()">+ Nuevo proveedor</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Contacto</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Productos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="prov-tbody"></tbody>
        </table>
      </div>
    `;
    this.renderTabla();
  },

  renderTabla() {
    const tbody = document.getElementById('prov-tbody');
    if (!tbody) return;

    if (this.lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state" style="padding:40px 0;">
          <div class="empty-state-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
          <h3>Sin proveedores todavía</h3>
        </div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = this.lista.map(p => `
      <tr>
        <td>
          <div style="font-weight:600;">${p.nombre}</div>
          ${p.empresa ? `<div style="font-size:11px; color:var(--text-muted);">${p.empresa}</div>` : ''}
        </td>
        <td>${p.contacto || '—'}</td>
        <td class="td-muted">${p.email || '—'}</td>
        <td class="td-muted">${p.telefono || '—'}</td>
        <td class="td-muted">${p.productos || '—'}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-sm btn-secondary" onclick="Proveedores.openModal('${p.id}')"></button>
            <button class="btn btn-sm btn-danger" onclick="Proveedores.eliminar('${p.id}', '${p.nombre}')"></button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openModal(id) {
    const p = id ? this.lista.find(x => x.id === id) : null;
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">${p ? 'Editar proveedor' : '+ Nuevo proveedor'}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label>Nombre *</label>
          <input type="text" id="prov-nombre" value="${p?.nombre || ''}" placeholder="Nombre del proveedor">
        </div>
        <div class="form-group">
          <label>Empresa</label>
          <input type="text" id="prov-empresa" value="${p?.empresa || ''}" placeholder="Nombre de la empresa">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="prov-email" value="${p?.email || ''}" placeholder="proveedor@email.com">
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input type="text" id="prov-tel" value="${p?.telefono || ''}" placeholder="+54 ...">
        </div>
        <div class="form-group">
          <label>Contacto</label>
          <input type="text" id="prov-contacto" value="${p?.contacto || ''}" placeholder="Nombre del contacto">
        </div>
        <div class="form-group">
          <label>Productos que provee</label>
          <input type="text" id="prov-prods" value="${p?.productos || ''}" placeholder="Ej: Ropa, Calzado">
        </div>
        <div class="form-group" style="grid-column:1/-1;">
          <label>Notas</label>
          <textarea id="prov-notas" placeholder="Notas internas...">${p?.notas || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Proveedores.guardar('${id || ''}')" style="width:auto;">
          ${p ? 'Guardar cambios' : 'Crear proveedor'}
        </button>
      </div>
    `);
  },

  async guardar(id) {
    const nombre = document.getElementById('prov-nombre').value.trim();
    if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }

    const data = {
      nombre,
      empresa:  document.getElementById('prov-empresa').value.trim(),
      email:    document.getElementById('prov-email').value.trim(),
      telefono: document.getElementById('prov-tel').value.trim(),
      contacto: document.getElementById('prov-contacto').value.trim(),
      productos:document.getElementById('prov-prods').value.trim(),
      notas:    document.getElementById('prov-notas').value.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      const col = db.collection('businesses').doc(PS.businessId).collection('proveedores');
      if (id) {
        await col.doc(id).update(data);
        showToast('Proveedor actualizado', 'success');
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await col.add(data);
        showToast('Proveedor creado', 'success');
      }
      closeModal();
      await this.load();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  },

  eliminar(id, nombre) {
    confirmDialog(`¿Eliminar al proveedor <strong>${nombre}</strong>?`, async () => {
      try {
        await db.collection('businesses').doc(PS.businessId).collection('proveedores').doc(id).delete();
        showToast('Proveedor eliminado', 'success');
        await this.load();
      } catch (e) { showToast('Error: ' + e.message, 'error'); }
    });
  }
};

// ============================================================
// PUNTOSTOCK — Cierre de Caja
// ============================================================

const Caja = {
  async load() {
    const page = document.getElementById('page-caja');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Calculando caja...</div>`;

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const snap = await db.collection('businesses').doc(PS.businessId)
        .collection('ventas')
        .where('fecha', '>=', firebase.firestore.Timestamp.fromDate(todayStart))
        .get();

      let totalEfectivo = 0, totalTarjeta = 0, totalTransf = 0, totalCC = 0;
      let totalGeneral = 0, cantVentas = 0;
      const ventas = [];

      snap.forEach(d => {
        const v = { id: d.id, ...d.data() };
        ventas.push(v);
        cantVentas++;
        totalGeneral += v.total || 0;
        if (v.metodoPago === 'Efectivo')       totalEfectivo += v.total || 0;
        else if (v.metodoPago === 'Tarjeta')   totalTarjeta  += v.total || 0;
        else if (v.metodoPago === 'Transferencia') totalTransf += v.total || 0;
        else if (v.metodoPago === 'Cuenta corriente') totalCC += v.total || 0;
      });

      page.innerHTML = `
        <div class="page-header">
          <div class="page-header-title">Cierre de Caja</div>
          <div style="font-size:12px; color:var(--text-secondary);">
            📅 ${now.toLocaleDateString('es-AR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-icon green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <div class="stat-label">Total del día</div>
            <div class="stat-value green">${formatPrice(totalGeneral)}</div>
            <div class="stat-change up">▲ ${cantVentas} ventas</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div class="stat-label">Efectivo</div>
            <div class="stat-value">${formatPrice(totalEfectivo)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div class="stat-label">Tarjeta</div>
            <div class="stat-value">${formatPrice(totalTarjeta)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
            </div>
            <div class="stat-label">Transferencia</div>
            <div class="stat-value">${formatPrice(totalTransf)}</div>
          </div>
        </div>

        <div class="cierre-grid mt-16">
          <!-- Detalle por método -->
          <div class="card">
            <div class="card-title">Desglose por método de pago</div>
            ${[
              { svg:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', color:'var(--green-primary)', label:'Efectivo',         val: totalEfectivo },
              { svg:'<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',               color:'var(--blue)',         label:'Tarjeta',          val: totalTarjeta  },
              { svg:'<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',           color:'var(--blue)',         label:'Transferencia',    val: totalTransf   },
              { svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>', color:'var(--orange)',    label:'Cuenta corriente', val: totalCC       },
            ].map(({ svg, color, label, val }) => `
              <div class="cierre-metodo">
                <span class="cierre-metodo-label" style="display:flex; align-items:center; gap:8px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" style="flex-shrink:0;">${svg}</svg>
                  ${label}
                </span>
                <span class="cierre-metodo-value">${formatPrice(val)}</span>
              </div>
            `).join('')}
            <div style="border-top:2px solid var(--border-green); margin-top:8px; padding-top:12px;
                        display:flex; justify-content:space-between;">
              <strong>TOTAL</strong>
              <strong style="font-family:var(--font-mono); color:var(--green-primary); font-size:18px;">
                ${formatPrice(totalGeneral)}
              </strong>
            </div>
          </div>

          <!-- Cierre manual -->
          <div class="card">
            <div class="card-title">Registrar cierre</div>
            <div class="form-group">
              <label>Efectivo en caja (contado físico)</label>
              <input type="number" id="caja-efectivo-real" placeholder="$ 0" min="0">
            </div>
            <div class="form-group">
              <label>Notas del cierre</label>
              <textarea id="caja-notas" placeholder="Observaciones del día..." style="min-height:60px;"></textarea>
            </div>
            <button class="btn btn-primary" onclick="Caja.cerrar(${totalEfectivo}, ${totalGeneral})">
              Registrar cierre del día
            </button>
          </div>
        </div>

        <!-- Últimas ventas del día -->
        <div class="card mt-16">
          <div class="card-title">Ventas de hoy (${cantVentas})</div>
          ${ventas.length === 0 ? '<div class="empty-state" style="padding:30px 0;"><div class="empty-state-icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div><p>Sin ventas hoy</p></div>' : `
            <div class="table-wrapper">
              <table>
                <thead><tr><th>Hora</th><th>Productos</th><th>Total</th><th>Método</th></tr></thead>
                <tbody>
                  ${ventas.map(v => `
                    <tr>
                      <td class="td-mono td-muted" style="font-size:12px;">
                        ${v.fecha?.toDate ? v.fecha.toDate().toLocaleTimeString('es-AR', {hour:'2-digit',minute:'2-digit'}) : '—'}
                      </td>
                      <td style="font-size:12px; color:var(--text-secondary);">
                        ${(v.items||[]).slice(0,2).map(i=>i.nombre).join(', ')}
                        ${(v.items||[]).length > 2 ? '+más' : ''}
                      </td>
                      <td class="td-mono td-green">${formatPrice(v.total)}</td>
                      <td><span class="badge badge-muted" style="font-size:10px;">${v.metodoPago || '—'}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      `;

    } catch (e) {
      page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error</h3><p>${e.message}</p></div>`;
    }
  },

  async cerrar(totalEfectivoSistema, totalGeneral) {
    const efectivoReal = parseFloat(document.getElementById('caja-efectivo-real').value) || 0;
    const notas = document.getElementById('caja-notas').value.trim();
    const diferencia = efectivoReal - totalEfectivoSistema;

    try {
      await db.collection('businesses').doc(PS.businessId).collection('cierres').add({
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        totalGeneral,
        totalEfectivoSistema,
        efectivoReal,
        diferencia,
        notas,
        usuario: PS.user.uid
      });

      showToast(`✅ Cierre registrado. Diferencia: ${formatPrice(diferencia)}`, diferencia >= 0 ? 'success' : 'warning');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }
};

// ============================================================
// PUNTOSTOCK — Admin Panel (completo con planes y facturación)
// ============================================================

const Admin = {
  async load() {
    if (!PS.isAdmin) {
      document.getElementById('page-admin').innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:0.3">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h3>Acceso restringido</h3>
          <p>Solo los administradores pueden ver esta sección.</p>
        </div>`;
      return;
    }

    const page = document.getElementById('page-admin');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando negocios...</div>`;

    try {
      const snap = await db.collection('businesses').orderBy('createdAt', 'desc').get();
      const negocios = [];
      snap.forEach(d => negocios.push({ id: d.id, ...d.data() }));

      // Calcular totales de facturación
      const facturacionTotal = negocios.reduce((sum, n) => sum + Admin.calcMonto(n), 0);
      const activos = negocios.filter(n => n.active).length;
      const trial   = negocios.filter(n => n.plan === 'trial').length;
      const pagos   = negocios.filter(n => n.plan !== 'trial').length;

      page.innerHTML = `
        <div class="page-header">
          <div class="page-header-title">
            Panel de Administración
            <span class="admin-badge" style="margin-left:10px;">ADMIN</span>
          </div>
        </div>

        <!-- Stats -->
        <div class="stat-grid" style="margin-bottom:24px;">
          <div class="stat-card" style="padding:14px 16px;">
            <div class="stat-icon blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
            </div>
            <div class="stat-label">Total negocios</div>
            <div class="stat-value" style="font-size:22px;">${negocios.length}</div>
          </div>
          <div class="stat-card" style="padding:14px 16px;">
            <div class="stat-icon green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div class="stat-label">Activos</div>
            <div class="stat-value green" style="font-size:22px;">${activos}</div>
          </div>
          <div class="stat-card" style="padding:14px 16px;">
            <div class="stat-icon orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div class="stat-label">En trial</div>
            <div class="stat-value" style="font-size:22px; color:var(--orange);">${trial}</div>
          </div>
          <div class="stat-card" style="padding:14px 16px;">
            <div class="stat-icon green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div class="stat-label">Facturación estimada</div>
            <div class="stat-value green" style="font-size:18px;">${formatPrice(facturacionTotal)}</div>
            <div class="stat-change up">${pagos} con plan pago</div>
          </div>
        </div>

        <!-- Tabla -->
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Negocio / Owner</th>
                <th>Contacto</th>
                <th>Rubro</th>
                <th>Plan solicitado</th>
                <th>Negocios</th>
                <th>Monto</th>
                <th>Plan activo</th>
                <th>Período</th>
                <th>Venc. trial</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="admin-tbody"></tbody>
          </table>
        </div>
      `;

      const tbody = document.getElementById('admin-tbody');
      tbody.innerHTML = negocios.map(n => {
        const trialEnd = n.trialEnds?.toDate ? n.trialEnds.toDate() : null;
        const trialExp = trialEnd && new Date() > trialEnd;
        const monto    = Admin.calcMonto(n);
        const planSol  = Admin.planLabel(n.planSolicitado);

        return `
          <tr>
            <td>
              <div style="font-weight:700;">${n.name}</div>
              <div style="font-size:11px; color:var(--text-muted);">${n.ownerName || ''}</div>
            </td>
            <td>
              <div style="font-size:12px;">${n.email || '—'}</div>
              <div style="font-size:11px; color:var(--text-muted);">${n.phone || ''}</div>
            </td>
            <td>
              <select onchange="Admin.cambiarRubro('${n.id}', this.value)"
                style="padding:4px 8px; font-size:12px; max-width:130px; border-radius:6px;">
                <option value="">— Sin definir —</option>
                ${[
                  ['kiosco','🏪 Kiosco'],['ropa','👗 Ropa'],['comida','🍔 Comida'],
                  ['verduleria','🥦 Verdulería'],['farmacia','💊 Farmacia'],
                  ['electronica','📱 Electrónica'],['ferreteria','🔧 Ferretería'],['otro','🏢 Otro']
                ].map(([v,l]) => `<option value="${v}" ${n.tipoNegocio===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </td>
            <td>
              <span class="badge ${Admin.planBadgeClass(n.planSolicitado)}" style="font-size:10px;">
                ${planSol}
              </span>
            </td>
            <td style="text-align:center; font-family:var(--font-mono); font-weight:700;">
              ${n.cantidadNegocios || 1}
            </td>
            <td class="td-mono" style="font-weight:700; color:var(--green-primary);">
              ${monto ? formatPrice(monto) : '—'}
            </td>
            <td>
              <select onchange="Admin.cambiarPlan('${n.id}', this.value)"
                style="padding:4px 8px; font-size:12px; max-width:130px; border-radius:6px;">
                <option ${n.plan==='trial'      ?'selected':''} value="trial">Trial</option>
                <option ${n.plan==='pro_mensual'?'selected':''} value="pro_mensual">Pro Mensual</option>
                <option ${n.plan==='pro_anual'  ?'selected':''} value="pro_anual">Pro Anual</option>
                <option ${n.plan==='multi'      ?'selected':''} value="multi">Multi-negocio</option>
              </select>
            </td>
            <td>
              <select onchange="Admin.cambiarPeriodo('${n.id}', this.value)"
                style="padding:4px 8px; font-size:12px; max-width:100px; border-radius:6px;">
                <option ${n.periodo==='mensual'||!n.periodo?'selected':''} value="mensual">Mensual</option>
                <option ${n.periodo==='anual'?'selected':''} value="anual">Anual</option>
              </select>
            </td>
            <td style="font-size:12px; white-space:nowrap;">
              ${trialEnd
                ? `<span style="color:${trialExp?'var(--red)':'var(--orange)'};">
                    ${trialExp ? 'Vencido' : formatDate({toDate:()=>trialEnd})}
                  </span>`
                : '—'}
            </td>
            <td>
              <label class="toggle" title="${n.active?'Desactivar':'Activar'}">
                <input type="checkbox" ${n.active?'checked':''}
                  onchange="Admin.toggleActive('${n.id}', this.checked, '${n.name}')">
                <span class="toggle-slider"></span>
              </label>
            </td>
            <td>
              <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                <button class="btn btn-sm btn-secondary"
                  onclick="Admin.gestionarTrial('${n.id}', '${n.name}')"
                  title="Gestionar días de trial">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Trial
                </button>
                <button class="btn btn-sm btn-secondary"
                  onclick="Admin.editarNegocios('${n.id}', ${n.cantidadNegocios||1}, '${n.name}')"
                  title="Editar cantidad de negocios">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                  Negos
                </button>
                <button class="btn btn-sm btn-secondary"
                  onclick="Admin.exportarStock('${n.id}', '${n.name}')"
                  title="Exportar stock a Excel">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export
                </button>
                <label class="btn btn-sm btn-secondary" style="cursor:pointer; margin:0;"
                  title="Importar stock desde Excel">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:inline;vertical-align:middle;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Import
                  <input type="file" accept=".csv,.xlsx,.xls" style="display:none;"
                    onchange="Admin.importarStock('${n.id}', '${n.name}', this)">
                </label>
              </div>
            </td>
          </tr>
        `;
      }).join('');

    } catch (e) {
      page.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${e.message}</p></div>`;
    }
  },

  // ── Helpers de plan ──────────────────────────────────────
  planLabel(p) {
    return { trial:'Trial 7d', pro_mensual:'Pro Mensual', pro_anual:'Pro Anual', multi:'Multi' }[p] || p || '—';
  },

  planBadgeClass(p) {
    return { trial:'badge-muted', pro_mensual:'badge-green', pro_anual:'badge-blue', multi:'badge-orange' }[p] || 'badge-muted';
  },

  calcMonto(n) {
    const plan = n.plan || 'trial';
    const cant = n.cantidadNegocios || 1;
    const per  = n.periodo || 'mensual';
    if (plan === 'trial') return 0;
    if (plan === 'pro_mensual') return 20000;
    if (plan === 'pro_anual')   return 20000; // anual único
    if (plan === 'multi')       return cant * 15000 * 12; // anual
    return 0;
  },

  // ── Acciones ─────────────────────────────────────────────
  async toggleActive(id, active, nombre) {
    try {
      await db.collection('businesses').doc(id).update({ active });
      showToast(`${nombre}: ${active ? 'Activado' : 'Desactivado'}`, active ? 'success' : 'warning');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  },

  async cambiarRubro(id, tipoNegocio) {
    try {
      await db.collection('businesses').doc(id).update({ tipoNegocio });
      const label = { kiosco:'Kiosco', ropa:'Ropa', comida:'Comida', verduleria:'Verdulería',
                      farmacia:'Farmacia', electronica:'Electrónica', ferreteria:'Ferretería', otro:'Otro' }[tipoNegocio] || 'Sin definir';
      showToast(`Rubro actualizado: ${label}`, 'success');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  },

  async cambiarPlan(id, plan) {
    try {
      await db.collection('businesses').doc(id).update({ plan });
      showToast('Plan actualizado a ' + this.planLabel(plan), 'success');
      // Recalcular fila
      setTimeout(() => Admin.load(), 500);
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  },

  async cambiarPeriodo(id, periodo) {
    try {
      await db.collection('businesses').doc(id).update({ periodo });
      showToast('Período actualizado', 'success');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  },

  // ── Exportar stock de un negocio ─────────────────────────
  async exportarStock(bizId, bizName) {
    showToast('Preparando exportación...', 'info');
    try {
      // Cargar SheetJS
      if (!window.XLSX) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }

      const snap = await db.collection('businesses').doc(bizId).collection('productos').get();
      const productos = [];
      snap.forEach(d => productos.push({ id: d.id, ...d.data() }));

      if (!productos.length) { showToast('Este negocio no tiene productos', 'warning'); return; }

      const data = productos.map(p => ({
        'Nombre':           p.nombre || '',
        'Precio venta':     p.precio || 0,
        'Precio costo':     p.precioCosto || '',
        'Stock':            p.stock || 0,
        'Categoría':        p.categoria || '',
        'Código / SKU':     p.codigo || '',
        'Código de barras': p.codigoBarra || '',
        'Unidad':           p.unidad || 'unidad',
        'Vencimiento':      p.vencimiento || '',
        'Talle':            p.talle || '',
        'Color':            p.color || '',
        'Activo':           p.activo !== false ? 'SI' : 'NO',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [
        {wch:30},{wch:14},{wch:14},{wch:8},{wch:18},
        {wch:16},{wch:18},{wch:10},{wch:14},{wch:10},{wch:14},{wch:8}
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stock');
      const nombre = `stock-${bizName.replace(/[^a-z0-9]/gi,'-')}-${new Date().toLocaleDateString('es-AR').replace(/\//g,'-')}.xlsx`;
      XLSX.writeFile(wb, nombre);
      showToast(`${productos.length} productos exportados — ${bizName}`, 'success');
    } catch (e) {
      showToast('Error al exportar: ' + e.message, 'error');
    }
  },

  // ── Importar stock a un negocio ───────────────────────────
  async importarStock(bizId, bizName, input) {
    const file = input.files[0];
    if (!file) return;

    try {
      // Cargar SheetJS
      if (!window.XLSX) {
        showToast('Cargando lector...', 'info');
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }

      let rows = [], headers = [];
      const isXLSX = file.name.match(/\.xlsx?$/i);

      if (isXLSX) {
        const buf = await file.arrayBuffer();
        const wb  = XLSX.read(buf, { type: 'array' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        headers = data[0].map(h => String(h).toLowerCase().trim());
        rows    = data.slice(1).filter(r => r.length).map(r => headers.map((_,i) => String(r[i]??'')));
      } else {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        const parse = l => { const res=[]; let cur='',q=false; for(const c of l){if(c==='"')q=!q;else if(c===','&&!q){res.push(cur.trim());cur='';}else cur+=c;} res.push(cur.trim()); return res; };
        headers = parse(lines[0]).map(h => h.toLowerCase().replace(/"/g,''));
        rows    = lines.slice(1).map(parse);
      }

      const gi = (...names) => names.map(n => headers.findIndex(h => h.includes(n))).find(i => i >= 0) ?? -1;
      const iN = gi('nombre','name','producto'); const iP = gi('precio','price','venta');
      const iC = gi('costo','cost');             const iS = gi('stock','cantidad');
      const iCat = gi('categor');                const iCod = gi('código','codigo','sku');
      const iBar = gi('barra','barcode');         const iU = gi('unidad','unit');
      const iV = gi('vencim');                    const iT = gi('talle');
      const iCol = gi('color');

      if (iN < 0) { showToast('El archivo debe tener columna "Nombre"', 'error'); return; }

      const validos = rows.filter(r => r[iN]?.trim());
      if (!validos.length) { showToast('No se encontraron productos', 'error'); return; }

      // Cargar productos existentes para no duplicar
      const existSnap = await db.collection('businesses').doc(bizId).collection('productos').get();
      const existentes = new Set();
      existSnap.forEach(d => {
        const data = d.data();
        if (data.nombre) existentes.add(data.nombre.toLowerCase());
        if (data.codigo) existentes.add(data.codigo.toLowerCase());
      });

      openModal(`
        <div class="modal-header">
          <h3 class="modal-title">Importar a — ${bizName}</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md);
                    padding:12px 16px; margin-bottom:16px;">
          <div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px;">
            Vista previa (primeros 5 de ${validos.length}):
          </div>
          ${validos.slice(0,5).map(r => `
            <div style="font-size:12px; padding:6px 0; border-bottom:1px solid var(--border);
                        display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:600;">${r[iN]}</span>
              <span style="color:var(--green-primary); font-family:var(--font-mono);">
                ${iP >= 0 && r[iP] ? formatPrice(parseFloat(r[iP])||0) : ''}
              </span>
            </div>
          `).join('')}
        </div>
        <div style="font-size:12px; color:var(--orange); padding:10px 14px; background:rgba(240,165,0,0.08);
                    border:1px solid rgba(240,165,0,0.2); border-radius:var(--radius-md);">
          ⚠ Los productos que ya existan no se duplicarán. Negocio destino: <strong>${bizName}</strong>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-primary" style="width:auto;"
            onclick="Admin._confirmarImportStock('${bizId}', '${bizName}')">
            Importar ${validos.length} productos
          </button>
        </div>
      `);

      // Guardar para confirmar
      Admin._pendingImport = { bizId, bizName, validos, iN, iP, iC, iS, iCat, iCod, iBar, iU, iV, iT, iCol, existentes };
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
    input.value = '';
  },

  async _confirmarImportStock(bizId, bizName) {
    const { validos, iN, iP, iC, iS, iCat, iCod, iBar, iU, iV, iT, iCol, existentes } = Admin._pendingImport;
    closeModal();
    showToast('Importando...', 'info');

    const colRef = db.collection('businesses').doc(bizId).collection('productos');
    const batch  = db.batch();
    let count = 0;

    for (const r of validos) {
      const nombre = r[iN]?.trim();
      if (!nombre) continue;
      if (existentes.has(nombre.toLowerCase())) continue;
      const codigo = iCod >= 0 ? r[iCod]?.trim() : '';
      if (codigo && existentes.has(codigo.toLowerCase())) continue;

      batch.set(colRef.doc(), {
        nombre,
        precio:      iP >= 0 ? parseFloat(r[iP]) || 0 : 0,
        precioCosto: iC >= 0 ? parseFloat(r[iC]) || null : null,
        stock:       iS >= 0 ? parseInt(r[iS]) || 0 : 0,
        categoria:   iCat >= 0 ? r[iCat]?.trim() || '' : '',
        codigo:      codigo || '',
        codigoBarra: iBar >= 0 ? r[iBar]?.trim() || '' : '',
        unidad:      iU >= 0 ? r[iU]?.trim() || 'unidad' : 'unidad',
        vencimiento: iV >= 0 ? r[iV]?.trim() || null : null,
        talle:       iT >= 0 ? r[iT]?.trim() || null : null,
        color:       iCol >= 0 ? r[iCol]?.trim() || null : null,
        activo:      true,
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:   firebase.firestore.FieldValue.serverTimestamp(),
      });
      count++;
      if (count % 499 === 0) await batch.commit();
    }

    await batch.commit();
    showToast(`✅ ${count} productos importados a ${bizName}`, 'success');
  },
  gestionarTrial(id, nombre) {
    // Calcular días restantes actuales
    db.collection('businesses').doc(id).get().then(snap => {
      const data = snap.data();
      const trialEnd = data.trialEnds?.toDate ? data.trialEnds.toDate()
        : data.trialEnds ? new Date(data.trialEnds) : new Date();
      const hoy = new Date();
      hoy.setHours(0,0,0,0);
      const diasRestantes = Math.max(0, Math.ceil((trialEnd - hoy) / (1000*60*60*24)));

      openModal(`
        <div class="modal-header">
          <h3 class="modal-title">Gestionar trial — ${nombre}</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>

        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md);
                    padding:14px 16px; margin-bottom:20px; display:flex; align-items:center; gap:12px;">
          <div style="width:48px; height:48px; border-radius:12px; background:var(--orange-muted,rgba(240,165,0,0.1));
                      display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div>
            <div style="font-size:12px; color:var(--text-muted);">Días restantes actuales</div>
            <div style="font-size:28px; font-weight:900; font-family:var(--font-mono);
                        color:${diasRestantes <= 2 ? 'var(--red)' : diasRestantes <= 4 ? 'var(--orange)' : 'var(--green-primary)'};">
              ${diasRestantes} días
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Establecer días restantes</label>
          <div style="display:flex; align-items:center; gap:10px;">
            <input type="number" id="trial-dias" value="${diasRestantes}" min="0" max="365"
              style="font-size:24px; font-weight:700; text-align:center; font-family:var(--font-mono);">
            <span style="color:var(--text-secondary); font-size:14px; white-space:nowrap;">días desde hoy</span>
          </div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">
            Podés poner 0 para vencer el trial ahora, o cualquier número para extenderlo.
          </div>
        </div>

        <!-- Accesos rápidos -->
        <div style="margin-bottom:20px;">
          <div style="font-size:11px; color:var(--text-muted); font-weight:700; text-transform:uppercase;
                      letter-spacing:0.5px; margin-bottom:8px;">Accesos rápidos</div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${[1,2,3,5,7,14,30].map(d => `
              <button onclick="document.getElementById('trial-dias').value=${d}"
                style="padding:6px 14px; border:1px solid var(--border); border-radius:6px;
                       background:var(--bg-card); color:var(--text-secondary); font-size:12px;
                       font-weight:600; cursor:pointer; transition:all 0.15s;"
                onmouseenter="this.style.borderColor='var(--green-primary)';this.style.color='var(--green-primary)'"
                onmouseleave="this.style.borderColor='var(--border)';this.style.color='var(--text-secondary)'">
                ${d} día${d>1?'s':''}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button class="btn btn-primary" style="width:auto;" onclick="Admin.guardarTrial('${id}')">
            Guardar
          </button>
        </div>
      `);
    });
  },

  async guardarTrial(id) {
    const dias = parseInt(document.getElementById('trial-dias').value);
    if (isNaN(dias) || dias < 0) { showToast('Ingresá un número válido', 'warning'); return; }
    try {
      const nueva = new Date();
      nueva.setHours(0,0,0,0);
      nueva.setDate(nueva.getDate() + dias);
      await db.collection('businesses').doc(id).update({ trialEnds: nueva });
      showToast(`Trial actualizado — ${dias} días restantes`, 'success');
      closeModal();
      Admin.load();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  },

  extenderTrial(id, nombre) {
    this.gestionarTrial(id, nombre);
  },

  async confirmarExtension(id) {
    await this.guardarTrial(id);
  },

  editarNegocios(id, cantActual, nombre) {
    openModal(`
      <div class="modal-header">
        <h3 class="modal-title">Cantidad de negocios — ${nombre}</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      <div class="form-group">
        <label>Negocios habilitados</label>
        <input type="number" id="edit-cant" value="${cantActual}" min="1" max="50"
          oninput="Admin.previewMonto(this.value)">
      </div>
      <div id="monto-preview" style="background:var(--bg-card); border:1px solid var(--border);
           border-radius:var(--radius-md); padding:12px; font-size:13px; color:var(--text-secondary);">
        ${cantActual > 1
          ? `Multi-negocio: <strong style="color:var(--green-primary);">${formatPrice(cantActual * 15000 * 12)}/año</strong>`
          : `Plan individual: <strong style="color:var(--green-primary);">$20.000/mes</strong>`}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" style="width:auto;" onclick="Admin.guardarNegocios('${id}')">
          Guardar
        </button>
      </div>
    `);
  },

  previewMonto(cant) {
    cant = parseInt(cant) || 1;
    const el = document.getElementById('monto-preview');
    if (!el) return;
    if (cant > 1) {
      el.innerHTML = `Multi-negocio (${cant}): <strong style="color:var(--green-primary);">${formatPrice(cant * 15000 * 12)}/año</strong>`;
    } else {
      el.innerHTML = `Plan individual: <strong style="color:var(--green-primary);">$20.000/mes</strong>`;
    }
  },

  async guardarNegocios(id) {
    const cant = parseInt(document.getElementById('edit-cant').value) || 1;
    try {
      const updates = { cantidadNegocios: cant };
      if (cant > 1) updates.plan = 'multi';
      await db.collection('businesses').doc(id).update(updates);
      showToast('Cantidad de negocios actualizada', 'success');
      closeModal();
      Admin.load();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  }
};

// ============================================================
// PUNTOSTOCK — Configuración
// ============================================================

const Config = {
  async load() {
    const page = document.getElementById('page-config');
    const biz = PS.businessData || {};

    page.innerHTML = `
      <div class="page-header">
        <div class="page-header-title">Configuración</div>
      </div>

      <div style="max-width:600px;">
        <div class="card mb-20">
          <div class="card-title">Datos del negocio</div>
          <div class="form-group">
            <label>Nombre del negocio</label>
            <input type="text" id="cfg-nombre" value="${biz.name || ''}">
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Email</label>
              <input type="email" id="cfg-email" value="${biz.email || ''}">
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input type="text" id="cfg-tel" value="${biz.phone || ''}">
            </div>
          </div>
          <div class="form-group">
            <label>Dirección</label>
            <input type="text" id="cfg-dir" value="${biz.direccion || ''}" placeholder="Dirección del negocio">
          </div>
          <div class="form-group">
            <label>Tipo de negocio / Rubro</label>
            <select id="cfg-rubro" style="width:100%; padding:10px 12px; background:var(--bg-card);
              border:1px solid var(--border); border-radius:var(--radius-md);
              color:var(--text-primary); font-family:var(--font); font-size:13px;">
              <option value="">— Sin definir —</option>
              ${[
                ['kiosco','🏪 Kiosco / Almacén'],
                ['ropa','👗 Indumentaria / Ropa'],
                ['comida','🍔 Gastronomía / Comida'],
                ['verduleria','🥦 Verdulería / Frutería'],
                ['farmacia','💊 Farmacia / Dietética'],
                ['electronica','📱 Electrónica / Tecnología'],
                ['ferreteria','🔧 Ferretería / Materiales'],
                ['otro','🏢 Otro'],
              ].map(([v,l]) => `<option value="${v}" ${biz.tipoNegocio===v?'selected':''}>${l}</option>`).join('')}
            </select>
            <div style="font-size:11px; color:var(--text-muted); margin-top:5px;">
              Define las unidades disponibles al cargar productos en el stock.
            </div>
          </div>
          <button class="btn btn-primary" style="width:auto;" onclick="Config.guardar()">
            Guardar cambios
          </button>
        </div>

        <div class="card mb-20">
          <div class="card-title">Cuenta</div>
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
            Sesión iniciada como <strong>${PS.user?.email}</strong>
          </p>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="Auth.forgotPassword()">
              Cambiar contraseña
            </button>
            <button class="btn btn-danger" onclick="Config.logout()">
              Cerrar sesión
            </button>
          </div>
        </div>

        <div class="card" style="border-color:rgba(248,81,73,0.2);">
          <div class="card-title" style="color:var(--red);">Zona de peligro</div>
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
            Estas acciones son irreversibles. Procedé con cuidado.
          </p>
          <button class="btn btn-danger" onclick="Config.exportarDatos()">
            Exportar mis datos
          </button>
        </div>
      </div>
    `;
  },

  async guardar() {
    const nombre = document.getElementById('cfg-nombre').value.trim();
    const email  = document.getElementById('cfg-email').value.trim();
    const tel    = document.getElementById('cfg-tel').value.trim();
    const dir    = document.getElementById('cfg-dir').value.trim();
    const rubro  = document.getElementById('cfg-rubro').value;

    if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }

    try {
      await db.collection('businesses').doc(PS.businessId).update({
        name: nombre, email, phone: tel, direccion: dir, tipoNegocio: rubro,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      PS.businessData = { ...PS.businessData, name: nombre, email, phone: tel, direccion: dir, tipoNegocio: rubro };
      PS.renderSidebar();
      showToast('Configuración guardada', 'success');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  },

  logout() {
    confirmDialog('¿Cerrar sesión?', async () => { await Auth.logout(); });
  },

  exportarDatos() {
    showToast('Función de exportación próximamente', 'info');
  }
};
