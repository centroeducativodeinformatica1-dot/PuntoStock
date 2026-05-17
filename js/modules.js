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
      const biz = PS.businessId;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const snap = await db.collection('businesses').doc(biz).collection('ventas')
        .where('fecha', '>=', firebase.firestore.Timestamp.fromDate(todayStart)).get();

      let totEfectivo=0, totTarjeta=0, totTransf=0, totCC=0, totPYE=0, totPYD=0, totGeneral=0, cantVentas=0;
      const ventas = [];
      snap.forEach(d => {
        const v = { id: d.id, ...d.data() };
        ventas.push(v); cantVentas++; totGeneral += v.total || 0;
        const m = v.metodoPago || '';
        if (m === 'Efectivo')           totEfectivo += v.total||0;
        else if (m === 'Tarjeta')       totTarjeta  += v.total||0;
        else if (m === 'Transferencia') totTransf   += v.total||0;
        else if (m === 'Cuenta corriente') totCC    += v.total||0;
        else if (m === 'PedidosYa Efectivo')  totPYE += v.total||0;
        else if (m === 'PedidosYa Digital')   totPYD += v.total||0;
      });

      const metodos = [
        { svg:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', color:'var(--green-primary)', label:'Efectivo',       val:totEfectivo },
        { svg:'<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',               color:'var(--blue)',         label:'Tarjeta',       val:totTarjeta  },
        { svg:'<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',           color:'var(--purple)',       label:'Transferencia', val:totTransf   },
        { svg:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',color:'var(--orange)', label:'Cta. corriente',val:totCC       },
        { svg:'<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',               color:'#FF3C00',             label:'PY Efectivo',   val:totPYE      },
        { svg:'<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',               color:'#E8001A',             label:'PY Digital',    val:totPYD      },
      ];

      page.innerHTML = `
        <div class="page-header">
          <div class="page-header-title">Caja</div>
          <div style="font-size:12px; color:var(--text-secondary);">
            ${now.toLocaleDateString('es-AR', { weekday:'long', day:'2-digit', month:'long' })}
          </div>
        </div>

        <!-- Stats ventas del día -->
        <div class="stat-grid" style="margin-bottom:20px;">
          <div class="stat-card">
            <div class="stat-label">Total del día</div>
            <div class="stat-value green">${formatPrice(totGeneral)}</div>
            <div class="stat-change up">▲ ${cantVentas} ventas</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Efectivo</div>
            <div class="stat-value">${formatPrice(totEfectivo)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Tarjeta</div>
            <div class="stat-value">${formatPrice(totTarjeta)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Transferencia</div>
            <div class="stat-value">${formatPrice(totTransf)}</div>
          </div>
        </div>

        <!-- Desglose + Cierre -->
        <div class="grid-2" style="margin-bottom:20px;">
          <div class="card">
            <div class="card-title">Desglose por método</div>
            ${metodos.map(m => `
              <div class="cierre-metodo">
                <span style="display:flex;align-items:center;gap:8px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${m.color}" stroke-width="2">${m.svg}</svg>
                  ${m.label}
                </span>
                <span class="cierre-metodo-value">${formatPrice(m.val)}</span>
              </div>`).join('')}
            <div style="border-top:2px solid var(--border-green);margin-top:8px;padding-top:12px;display:flex;justify-content:space-between;">
              <strong>TOTAL</strong>
              <strong style="font-family:var(--font-mono);color:var(--green-primary);font-size:18px;">${formatPrice(totGeneral)}</strong>
            </div>
          </div>
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
            <button class="btn btn-primary" onclick="Caja.cerrar(${totEfectivo}, ${totGeneral})">
              Registrar cierre del día
            </button>
          </div>
        </div>

        <!-- Caja Fuerte + Registradora lado a lado -->
        <div class="card" style="margin-bottom:20px;">
          <div class="card-title" style="margin-bottom:16px;">
            <span>Cajas</span>
          </div>

          <!-- Saldos -->
          <div class="grid-2" style="margin-bottom:16px;">
            <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <div style="width:10px;height:10px;border-radius:50%;background:var(--green-primary);"></div>
                <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">Caja Fuerte</span>
              </div>
              <div id="ps-cf-balance" style="font-size:22px;font-weight:900;font-family:var(--font-mono);color:var(--green-primary);">$0</div>
            </div>
            <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;"></div>
                <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">Caja Registradora</span>
              </div>
              <div id="ps-cr-balance" style="font-size:22px;font-weight:900;font-family:var(--font-mono);color:#f59e0b;">$0</div>
            </div>
          </div>

          <!-- Botones -->
          <div class="grid-2" style="margin-bottom:16px;">
            <button class="btn btn-primary" onclick="Caja.openMovModal('ingreso')"
              style="display:flex;align-items:center;justify-content:center;gap:8px;background:#16a34a;border-color:#16a34a;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              INGRESO
            </button>
            <button class="btn btn-primary" onclick="Caja.openMovModal('egreso')"
              style="display:flex;align-items:center;justify-content:center;gap:8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              EGRESO
            </button>
          </div>

          <!-- Historiales lado a lado -->
          <div class="grid-2">
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                <div style="width:8px;height:8px;border-radius:50%;background:var(--green-primary);"></div>
                Caja Fuerte
              </div>
              <div id="ps-cf-historial" style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;">
                <div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px 0;">Sin movimientos</div>
              </div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                <div style="width:8px;height:8px;border-radius:50%;background:#f59e0b;"></div>
                Caja Registradora
              </div>
              <div id="ps-cr-historial" style="display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto;">
                <div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px 0;">Sin movimientos</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Histórico por día -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <div class="card-title" style="margin:0;">Histórico por día — Ambas cajas</div>
            <button onclick="Caja.imprimirHistorico()" class="btn btn-sm btn-secondary"
              style="display:flex;align-items:center;gap:6px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Imprimir
            </button>
          </div>
          <div id="ps-cajas-historico" style="display:flex;flex-direction:column;gap:8px;">
            <div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px 0;">Cargando...</div>
          </div>
        </div>

        <!-- Modal movimiento -->
        <div id="ps-mov-modal" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.5);
          align-items:center;justify-content:center;padding:16px;">
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);
            width:100%;max-width:420px;padding:24px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
              <h3 id="ps-mov-title" style="font-size:18px;font-weight:800;">Ingreso</h3>
              <button onclick="Caja.closeMovModal()" style="background:transparent;border:none;cursor:pointer;color:var(--text-muted);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div id="ps-mov-indicator" style="display:flex;align-items:center;justify-content:center;gap:8px;
              padding:10px;border-radius:var(--radius-md);margin-bottom:16px;background:#16a34a;color:white;font-weight:700;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span id="ps-mov-tipo-label">INGRESO</span>
            </div>
            <div class="form-group">
              <label>Descripción *</label>
              <input type="text" id="ps-mov-desc" placeholder="Ej: Pago proveedor, fondo inicial...">
            </div>
            <div style="margin-bottom:16px;">
              <label style="font-size:11px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:8px;">
                ¿En qué caja(s)?
              </label>
              <!-- Caja Fuerte -->
              <div id="ps-cf-selector" style="border:2px solid var(--border);border-radius:var(--radius-md);padding:12px;margin-bottom:8px;cursor:pointer;"
                onclick="Caja.toggleCaja('cf')">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:0;" id="ps-cf-header">
                  <div style="width:10px;height:10px;border-radius:50%;background:var(--green-primary);flex-shrink:0;"></div>
                  <span style="font-weight:700;font-size:13px;">Caja Fuerte</span>
                  <span id="ps-cf-badge" style="margin-left:auto;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:var(--bg-secondary);color:var(--text-muted);">OFF</span>
                </div>
                <div id="ps-cf-monto-wrap" style="display:none;margin-top:10px;">
                  <input type="number" id="ps-cf-monto" step="0.01" placeholder="$ 0.00"
                    oninput="Caja.updateTotal()"
                    style="width:100%;padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);
                    border-radius:var(--radius-md);color:var(--text-primary);font-family:var(--font-mono);font-size:15px;"
                    onclick="event.stopPropagation()">
                </div>
              </div>
              <!-- Caja Registradora -->
              <div id="ps-cr-selector" style="border:2px solid var(--border);border-radius:var(--radius-md);padding:12px;cursor:pointer;"
                onclick="Caja.toggleCaja('cr')">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></div>
                  <span style="font-weight:700;font-size:13px;">Caja Registradora</span>
                  <span id="ps-cr-badge" style="margin-left:auto;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;background:var(--bg-secondary);color:var(--text-muted);">OFF</span>
                </div>
                <div id="ps-cr-monto-wrap" style="display:none;margin-top:10px;">
                  <input type="number" id="ps-cr-monto" step="0.01" placeholder="$ 0.00"
                    oninput="Caja.updateTotal()"
                    style="width:100%;padding:8px 12px;background:var(--bg-secondary);border:1px solid var(--border);
                    border-radius:var(--radius-md);color:var(--text-primary);font-family:var(--font-mono);font-size:15px;"
                    onclick="event.stopPropagation()">
                </div>
              </div>
              <div id="ps-total-combinado" style="display:none;margin-top:8px;padding:8px 12px;
                background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);
                display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:12px;color:var(--text-muted);">Total combinado</span>
                <span id="ps-total-val" style="font-family:var(--font-mono);font-weight:900;font-size:15px;">$0</span>
              </div>
            </div>
            <p id="ps-mov-msg" style="font-size:11px;color:var(--red);min-height:16px;margin-bottom:8px;"></p>
            <div style="display:flex;gap:10px;">
              <button class="btn btn-secondary" onclick="Caja.closeMovModal()" style="flex:1;">Cancelar</button>
              <button class="btn btn-primary" onclick="Caja.confirmarMov()" style="flex:1;">Registrar</button>
            </div>
          </div>
        </div>

        <!-- Ventas del día -->
        <div class="card mt-16">
          <div class="card-title">Ventas de hoy (${cantVentas})</div>
          ${ventas.length === 0
            ? '<div class="empty-state" style="padding:30px 0;"><p>Sin ventas hoy</p></div>'
            : `<div class="table-wrapper"><table>
                <thead><tr><th>Hora</th><th>Productos</th><th>Total</th><th>Método</th></tr></thead>
                <tbody>
                  ${ventas.map(v => `<tr>
                    <td class="td-mono td-muted" style="font-size:12px;">
                      ${v.fecha?.toDate ? v.fecha.toDate().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'}) : '—'}
                    </td>
                    <td style="font-size:12px;color:var(--text-secondary);">
                      ${(v.items||[]).slice(0,2).map(i=>i.nombre).join(', ')}${(v.items||[]).length>2?'+más':''}
                    </td>
                    <td class="td-mono td-green">${formatPrice(v.total)}</td>
                    <td><span class="badge badge-muted" style="font-size:10px;">${v.metodoPago||'—'}</span></td>
                  </tr>`).join('')}
                </tbody>
              </table></div>`}
        </div>
      `;

      // Cargar historiales de cajas
      Caja.loadHistoriales();

    } catch(e) {
      page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error</h3><p>${e.message}</p></div>`;
    }
  },

  _tipoActual: 'ingreso',

  openMovModal(tipo) {
    this._tipoActual = tipo;
    const isI = tipo === 'ingreso';
    document.getElementById('ps-mov-title').textContent      = isI ? 'Ingreso' : 'Egreso';
    document.getElementById('ps-mov-tipo-label').textContent = isI ? 'INGRESO' : 'EGRESO';
    document.getElementById('ps-mov-indicator').style.background = isI ? '#16a34a' : 'var(--red)';
    const svg = document.querySelector('#ps-mov-indicator svg line:first-child');
    // Reset form
    document.getElementById('ps-mov-desc').value = '';
    document.getElementById('ps-mov-msg').textContent = '';
    document.getElementById('ps-cf-monto').value = '';
    document.getElementById('ps-cr-monto').value = '';
    ['cf','cr'].forEach(c => {
      const wrap  = document.getElementById('ps-'+c+'-monto-wrap');
      const sel   = document.getElementById('ps-'+c+'-selector');
      const badge = document.getElementById('ps-'+c+'-badge');
      wrap.style.display = 'none';
      sel.style.borderColor = 'var(--border)';
      sel.style.background  = 'transparent';
      badge.textContent = 'OFF';
      badge.style.background = 'var(--bg-secondary)';
      badge.style.color = 'var(--text-muted)';
    });
    document.getElementById('ps-total-combinado').style.display = 'none';
    document.getElementById('ps-mov-modal').style.display = 'flex';
  },

  closeMovModal() {
    document.getElementById('ps-mov-modal').style.display = 'none';
  },

  toggleCaja(caja) {
    const wrap  = document.getElementById('ps-'+caja+'-monto-wrap');
    const sel   = document.getElementById('ps-'+caja+'-selector');
    const badge = document.getElementById('ps-'+caja+'-badge');
    const color = caja === 'cf' ? 'var(--green-primary)' : '#f59e0b';
    const bgColor = caja === 'cf' ? 'rgba(126,211,33,0.05)' : 'rgba(245,158,11,0.05)';
    const isOn  = wrap.style.display === 'none';
    if (isOn) {
      wrap.style.display = 'block';
      sel.style.borderColor = color;
      sel.style.background  = bgColor;
      badge.textContent = 'ON';
      badge.style.background = color;
      badge.style.color = 'white';
      setTimeout(() => document.getElementById('ps-'+caja+'-monto').focus(), 50);
    } else {
      wrap.style.display = 'none';
      document.getElementById('ps-'+caja+'-monto').value = '';
      sel.style.borderColor = 'var(--border)';
      sel.style.background  = 'transparent';
      badge.textContent = 'OFF';
      badge.style.background = 'var(--bg-secondary)';
      badge.style.color = 'var(--text-muted)';
    }
    this.updateTotal();
  },

  updateTotal() {
    const cfOn = document.getElementById('ps-cf-monto-wrap').style.display !== 'none';
    const crOn = document.getElementById('ps-cr-monto-wrap').style.display !== 'none';
    const mc   = parseFloat(document.getElementById('ps-cf-monto').value) || 0;
    const mr   = parseFloat(document.getElementById('ps-cr-monto').value) || 0;
    const box  = document.getElementById('ps-total-combinado');
    if (cfOn && crOn) {
      box.style.display = 'flex';
      document.getElementById('ps-total-val').textContent = formatPrice(mc + mr);
    } else {
      box.style.display = 'none';
    }
  },

  async confirmarMov() {
    const desc  = document.getElementById('ps-mov-desc').value.trim();
    const cfOn  = document.getElementById('ps-cf-monto-wrap').style.display !== 'none';
    const crOn  = document.getElementById('ps-cr-monto-wrap').style.display !== 'none';
    const mc    = parseFloat(document.getElementById('ps-cf-monto').value) || 0;
    const mr    = parseFloat(document.getElementById('ps-cr-monto').value) || 0;
    const msgEl = document.getElementById('ps-mov-msg');
    if (!desc)             { msgEl.textContent = 'Ingresá una descripción'; return; }
    if (!cfOn && !crOn)    { msgEl.textContent = 'Activá al menos una caja'; return; }
    if (cfOn && mc <= 0)   { msgEl.textContent = 'Ingresá el monto de Caja Fuerte'; return; }
    if (crOn && mr <= 0)   { msgEl.textContent = 'Ingresá el monto de Caja Registradora'; return; }

    const signo    = this._tipoActual === 'ingreso' ? 1 : -1;
    const biz      = PS.businessId;
    const fechaHora= new Date().toLocaleString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
    const usuario  = PS.user?.email || 'sistema';

    try {
      const promises = [];
      if (cfOn) promises.push(db.collection('businesses').doc(biz).collection('caja_fuerte').add({
        tipo: this._tipoActual, monto: signo*mc, montoAbs: mc,
        descripcion: desc, usuario, fechaHora,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }));
      if (crOn) promises.push(db.collection('businesses').doc(biz).collection('caja_registradora').add({
        tipo: this._tipoActual, monto: signo*mr, montoAbs: mr,
        descripcion: desc, usuario, fechaHora,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }));
      await Promise.all(promises);
      this.closeMovModal();
      const cajas = [cfOn&&'Caja Fuerte', crOn&&'Registradora'].filter(Boolean).join(' + ');
      showToast((this._tipoActual==='ingreso'?'Ingreso':'Egreso')+' registrado — '+cajas, 'success');
      this.loadHistoriales();
    } catch(e) {
      msgEl.textContent = 'Error: ' + e.message;
    }
  },

  async loadHistoriales() {
    const biz = PS.businessId;
    const renderMov = (d, nombreCaja) => {
      const isI  = d.tipo === 'ingreso';
      const ts   = d.fechaHora || '—';
      const monto= Math.abs(d.monto||d.montoAbs||0);
      const dataStr = encodeURIComponent(JSON.stringify(d));
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--radius-md);border:1px solid var(--border);background:var(--bg-secondary);">'
        + '<div style="width:28px;height:28px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:'+(isI?'rgba(126,211,33,0.15)':'rgba(248,81,73,0.12)')+';">'
        + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="'+(isI?'var(--green-primary)':'var(--red)')+'" stroke-width="2.5">'
        + '<line x1="12" y1="'+(isI?'5':'12')+'" x2="12" y2="'+(isI?'19':'12')+'"/>'
        + (isI?'<line x1="5" y1="12" x2="19" y2="12"/>':'')
        + '</svg></div>'
        + '<div style="flex:1;min-width:0;">'
        + '<div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(d.descripcion||'')+'</div>'
        + '<div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono);">'+ts+'</div>'
        + '</div>'
        + '<span style="font-family:var(--font-mono);font-size:12px;font-weight:700;flex-shrink:0;color:'+(isI?'var(--green-primary)':'var(--red)')+'">'
        + (isI?'+':'−')+formatPrice(monto)+'</span>'
        + '<button onclick="imprimirMovCaja(decodeURIComponent(\'' + dataStr + '\'),\'' + nombreCaja + '\')"'
        + ' style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:5px;cursor:pointer;color:var(--text-muted);flex-shrink:0;">'
        + '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>'
        + '</button></div>';
    };

    try {
      const [snapCF, snapCR] = await Promise.all([
        db.collection('businesses').doc(biz).collection('caja_fuerte')
          .orderBy('timestamp','desc').limit(50).get(),
        db.collection('businesses').doc(biz).collection('caja_registradora')
          .orderBy('timestamp','desc').limit(50).get(),
      ]);

      // Saldos
      const docsCF = snapCF.docs.map(d=>({id:d.id,...d.data()}));
      const docsCR = snapCR.docs.map(d=>({id:d.id,...d.data()}));
      const balCF  = docsCF.reduce((s,d)=>s+(d.monto||0),0);
      const balCR  = docsCR.reduce((s,d)=>s+(d.monto||0),0);

      const bEl = document.getElementById('ps-cf-balance');
      const rEl = document.getElementById('ps-cr-balance');
      if (bEl) { bEl.textContent = formatPrice(balCF); bEl.style.color = balCF>=0?'var(--green-primary)':'var(--red)'; }
      if (rEl) { rEl.textContent = formatPrice(balCR); rEl.style.color = balCR>=0?'#f59e0b':'var(--red)'; }

      const cfH = document.getElementById('ps-cf-historial');
      const crH = document.getElementById('ps-cr-historial');
      if (cfH) cfH.innerHTML = docsCF.length ? docsCF.map(d=>renderMov(d,'Caja Fuerte')).join('') : '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px 0;">Sin movimientos</div>';
      if (crH) crH.innerHTML = docsCR.length ? docsCR.map(d=>renderMov(d,'Caja Registradora')).join('') : '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px 0;">Sin movimientos</div>';

      // Histórico por día
      await this.loadHistoricoDia(docsCF, docsCR);

    } catch(e) { console.error(e); }
  },

  async loadHistoricoDia(docsCF, docsCR) {
    const el = document.getElementById('ps-cajas-historico');
    if (!el) return;
    const movs = [
      ...docsCF.map(d=>({...d,_src:'CF'})),
      ...docsCR.map(d=>({...d,_src:'Reg'})),
    ].sort((a,b)=>(a.timestamp?.toDate?.()?.getTime()||0)-(b.timestamp?.toDate?.()?.getTime()||0));

    if (!movs.length) { el.innerHTML = '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px 0;">Sin movimientos</div>'; return; }

    const porDia = {};
    movs.forEach(m => {
      const ts  = m.timestamp?.toDate?.() || new Date();
      const key = ts.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});
      if (!porDia[key]) porDia[key] = [];
      porDia[key].push(m);
    });

    el.innerHTML = Object.entries(porDia).reverse().map(([dia, ms]) => {
      const totCF  = ms.filter(m=>m._src==='CF').reduce((s,m)=>s+(m.monto||0),0);
      const totCR  = ms.filter(m=>m._src==='Reg').reduce((s,m)=>s+(m.monto||0),0);
      const totDia = totCF + totCR;
      const rows   = ms.map(m => {
        const isI = m.tipo==='ingreso';
        const hora= (m.fechaHora||'').split(',')[1]?.trim().substring(0,5)||'';
        return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border);font-size:11px;">'
          + '<span style="color:var(--text-muted);font-family:var(--font-mono);width:36px;flex-shrink:0;">'+hora+'</span>'
          + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+m.descripcion+'</span>'
          + '<span style="font-size:10px;color:var(--text-muted);padding:1px 5px;border-radius:4px;background:var(--bg-secondary);flex-shrink:0;">'+m._src+'</span>'
          + '<span style="font-family:var(--font-mono);font-weight:700;flex-shrink:0;color:'+(isI?'var(--green-primary)':'var(--red)')+'">'+(isI?'+':'−')+formatPrice(Math.abs(m.monto||0))+'</span>'
          + '</div>';
      }).join('');

      return '<div style="border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;margin-bottom:8px;">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-secondary);">'
        + '<span style="font-weight:700;font-size:13px;">'+dia+'</span>'
        + '<div style="display:flex;align-items:center;gap:12px;">'
        + '<span style="font-size:11px;color:var(--green-primary);font-family:var(--font-mono);">CF '+(totCF>=0?'+':'')+formatPrice(totCF)+'</span>'
        + '<span style="font-size:11px;color:#f59e0b;font-family:var(--font-mono);">Reg '+(totCR>=0?'+':'')+formatPrice(totCR)+'</span>'
        + '<span style="font-family:var(--font-mono);font-weight:900;font-size:13px;color:'+(totDia>=0?'var(--green-primary)':'var(--red)')+';">'+(totDia>=0?'+':'')+formatPrice(totDia)+'</span>'
        + '</div></div>'
        + '<div style="padding:8px 14px;">'+rows+'</div></div>';
    }).join('');
  },

  async imprimirHistorico() {
    const biz = PS.businessId;
    const [snapCF, snapCR] = await Promise.all([
      db.collection('businesses').doc(biz).collection('caja_fuerte').orderBy('timestamp','asc').limit(500).get(),
      db.collection('businesses').doc(biz).collection('caja_registradora').orderBy('timestamp','asc').limit(500).get(),
    ]);
    const movs = [
      ...snapCF.docs.map(d=>({...d.data(),_src:'CF'})),
      ...snapCR.docs.map(d=>({...d.data(),_src:'Reg'})),
    ].sort((a,b)=>(a.timestamp?.toDate?.()?.getTime()||0)-(b.timestamp?.toDate?.()?.getTime()||0));

    const porDia = {};
    movs.forEach(m=>{
      const ts  = m.timestamp?.toDate?.() || new Date();
      const key = ts.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'});
      if (!porDia[key]) porDia[key]=[];
      porDia[key].push(m);
    });

    const rows = Object.entries(porDia).map(([dia,ms])=>{
      const totDia = ms.reduce((s,m)=>s+(m.monto||0),0);
      const movLines = ms.map(m=>{
        const isI = m.tipo==='ingreso';
        const hora= (m.fechaHora||'').split(',')[1]?.trim().substring(0,5)||'';
        const desc= (m.descripcion||'').substring(0,16);
        return '<div style="display:flex;justify-content:space-between;font-size:9px;margin:1px 0;">'
          +'<span style="color:#666;">'+hora+'</span>'
          +'<span style="flex:1;margin:0 4px;overflow:hidden;">'+desc+' ['+m._src+']</span>'
          +'<span style="font-weight:700;">'+(isI?'+':'−')+'$'+Math.abs(m.monto||0).toLocaleString('es-AR',{minimumFractionDigits:2})+'</span></div>';
      }).join('');
      return '<div style="font-weight:900;font-size:11px;border-top:1px dashed #000;margin-top:4px;padding-top:3px;">'
        +dia+'<span style="font-weight:400;float:right;font-size:9px;">'+(totDia>=0?'+':'')+'$'+totDia.toLocaleString('es-AR',{minimumFractionDigits:2})+'</span></div>'
        +movLines;
    }).join('');

    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'+CSS_58MM+'body{font-size:10px}</style></head><body>'
      +'<div class="center bold" style="font-size:13px;letter-spacing:1px;">'+PS.businessData?.name?.toUpperCase()+'</div>'
      +'<div class="center" style="font-size:9px;">Histórico de Caja</div>'
      +'<div class="center" style="font-size:9px;">'+new Date().toLocaleString('es-AR')+'</div>'
      +'<hr class="sep">'+rows+'</body></html>';
    imprimirHTML(html);
  },

  async cerrar(totalEfectivoSistema, totalGeneral) {
    const efectivoReal = parseFloat(document.getElementById('caja-efectivo-real').value) || 0;
    const notas = document.getElementById('caja-notas').value.trim();
    const diferencia = efectivoReal - totalEfectivoSistema;
    try {
      await db.collection('businesses').doc(PS.businessId).collection('cierres').add({
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        totalGeneral, totalEfectivoSistema, efectivoReal, diferencia, notas, usuario: PS.user.uid
      });
      showToast('Cierre registrado. Diferencia: '+formatPrice(diferencia), diferencia>=0?'success':'warning');
    } catch(e) { showToast('Error: '+e.message,'error'); }
  }
};

// Función global para imprimir movimiento de caja
window.imprimirMovCaja = function(dataStr, nombreCaja) {
  const d = JSON.parse(dataStr);
  const isI = d.tipo==='ingreso';
  const monto = Math.abs(d.monto||d.montoAbs||0);
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'+CSS_58MM+'</style></head><body>'
    +'<div class="center bold" style="font-size:13px;">'+PS.businessData?.name?.toUpperCase()+'</div>'
    +'<div class="center" style="font-size:9px;">Comprobante de Movimiento</div>'
    +'<div class="center" style="font-size:9px;">'+nombreCaja+'</div>'
    +'<hr class="sep">'
    +'<div class="center bold" style="font-size:16px;margin:6px 0;">'+(isI?'INGRESO':'EGRESO')+'</div>'
    +'<div class="center bold" style="font-size:18px;">'+(isI?'+':'−')+'$'+monto.toLocaleString('es-AR',{minimumFractionDigits:2})+'</div>'
    +'<hr class="sep">'
    +'<div style="font-size:10px;"><div>'+(d.descripcion||'')+'</div><div>'+(d.fechaHora||'')+'</div><div>'+(d.usuario||'')+'</div></div>'
    +'<hr class="sep">'
    +'<div class="center" style="font-size:9px;">'+PS.businessData?.name+'</div>'
    +'</body></html>';
  imprimirHTML(html);
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
              ${Admin.rubroSelect(n.id, n.tipoNegocio)}
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

  _rubrosMeta: {
    '':           { label: 'Sin definir', svg: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm-1-5h2v2h-2zm0-8h2v6h-2z"/>' },
    kiosco:       { label: 'Kiosco',      svg: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
    ropa:         { label: 'Ropa',        svg: '<path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>' },
    comida:       { label: 'Comida',      svg: '<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>' },
    verduleria:   { label: 'Verdulería',  svg: '<path d="M12 22V12m0 0C12 7 7 2 2 2c0 5 5 10 10 10zm0 0c0-5 5-10 10-10-5 0-10 5-10 10z"/>' },
    farmacia:     { label: 'Farmacia',    svg: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="12" y1="9" x2="12" y2="15"/>' },
    electronica:  { label: 'Electrónica', svg: '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>' },
    ferreteria:   { label: 'Ferretería',  svg: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' },
    otro:         { label: 'Otro',        svg: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>' },
  },

  rubroSelect(id, actual) {
    const meta = this._rubrosMeta[actual || ''] || this._rubrosMeta[''];
    const uid  = 'rubro-dd-' + id.replace(/[^a-z0-9]/gi,'');
    const items = Object.entries(this._rubrosMeta).map(([v, m]) => {
      const sel = (actual || '') === v;
      return `<div onclick="Admin._rubroElegir('${id}','${uid}','${v}')"
        style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;
               border-radius:6px;transition:background 0.15s;
               background:${sel?'var(--green-muted)':'transparent'};
               color:${sel?'var(--green-primary)':'var(--text-primary)'};"
        onmouseenter="if(this.style.background==='transparent')this.style.background='var(--bg-secondary)'"
        onmouseleave="this.style.background='${sel?'var(--green-muted)':'transparent'}'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          style="flex-shrink:0;opacity:0.75;">${m.svg}</svg>
        <span style="font-size:12px;white-space:nowrap;">${m.label}</span>
      </div>`;
    }).join('');

    return `
      <div style="position:relative;display:inline-block;" id="${uid}-wrap">
        <button onclick="Admin._rubroToggle('${uid}')"
          style="display:flex;align-items:center;gap:6px;padding:5px 10px;
                 background:var(--bg-card);border:1px solid var(--border);
                 border-radius:6px;cursor:pointer;font-size:12px;
                 color:var(--text-primary);white-space:nowrap;min-width:120px;
                 justify-content:space-between;" id="${uid}-btn">
          <span style="display:flex;align-items:center;gap:6px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              style="opacity:0.7;">${meta.svg}</svg>
            <span id="${uid}-label">${meta.label}</span>
          </span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div id="${uid}-menu" style="display:none;position:absolute;top:calc(100% + 4px);left:0;
             z-index:999;background:var(--bg-card);border:1px solid var(--border);
             border-radius:8px;padding:4px;min-width:150px;
             box-shadow:0 8px 24px rgba(0,0,0,0.4);">
          ${items}
        </div>
      </div>`;
  },

  _rubroToggle(uid) {
    const menu = document.getElementById(uid+'-menu');
    if (!menu) return;
    const isOpen = menu.style.display !== 'none';
    // Cerrar todos los demás
    document.querySelectorAll('[id$="-menu"]').forEach(m => { if(m!==menu) m.style.display='none'; });
    menu.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) {
      // Click fuera cierra
      setTimeout(() => {
        const handler = (e) => {
          if (!menu.closest('[id$="-wrap"]')?.contains(e.target)) {
            menu.style.display = 'none';
            document.removeEventListener('click', handler);
          }
        };
        document.addEventListener('click', handler);
      }, 0);
    }
  },

  async _rubroElegir(id, uid, valor) {
    document.getElementById(uid+'-menu').style.display = 'none';
    const meta = Admin._rubrosMeta[valor] || Admin._rubrosMeta[''];
    // Actualizar botón
    const labelEl = document.getElementById(uid+'-label');
    const btnEl   = document.getElementById(uid+'-btn');
    if (labelEl) labelEl.textContent = meta.label;
    if (btnEl) {
      const svgEl = btnEl.querySelector('span > svg');
      if (svgEl) svgEl.innerHTML = meta.svg;
    }
    await Admin.cambiarRubro(id, valor);
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

// ============================================================
// PUNTOSTOCK — Empleadas
// ============================================================

const Empleadas = {
  async load() {
    const page = document.getElementById('page-empleadas');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando empleadas...</div>`;

    const biz = PS.businessId;

    try {
      // Semana actual
      const semanaKey   = this._getSemanaKey();
      const semanaLabel = this._getSemanaLabel(semanaKey);

      // Cargar empleadas
      const snap = await db.collection('businesses').doc(biz).collection('empleadas').get();
      const empleadas = snap.docs.map(d=>({id:d.id,...d.data()})).filter(e=>e.activa!==false);

      // Guardar mapa de consumos para tickets
      window._psConsumosMap = window._psConsumosMap || {};

      // Cargar consumos/anticipos de cada empleada en paralelo
      const cards = await Promise.all(empleadas.map(async emp => {
        // Verificar si ya fue liquidada esta semana
        const cierreSnap = await db.collection('businesses').doc(biz)
          .collection('empleadas').doc(emp.id).collection('cierres')
          .where('semana','==',semanaKey).get();
        if (!cierreSnap.empty) {
          return { emp, totalConsumo:0, totalAnticipo:0, consumos:[], yaLiquidada:true };
        }
        const [cSnap, aSnap] = await Promise.all([
          db.collection('businesses').doc(biz).collection('empleadas').doc(emp.id).collection('consumos')
            .where('semana','==',semanaKey).get(),
          db.collection('businesses').doc(biz).collection('empleadas').doc(emp.id).collection('anticipos')
            .where('semana','==',semanaKey).get(),
        ]);
        const consumos  = cSnap.docs.map(d=>({id:d.id,...d.data()}))
          .sort((a,b)=>(b.fecha?.toDate?.()?.getTime()||0)-(a.fecha?.toDate?.()?.getTime()||0));
        const anticipos = aSnap.docs.map(d=>({id:d.id,...d.data()}));
        window._psConsumosMap[emp.id] = consumos;
        return {
          emp,
          totalConsumo:  consumos.reduce((s,c)=>s+(c.total||0),0),
          totalAnticipo: anticipos.reduce((s,a)=>s+(a.monto||0),0),
          consumos,
          yaLiquidada:   false,
        };
      }));

      // Cargar historial de liquidaciones
      const histSnap = await db.collection('businesses').doc(biz)
        .collection('empleadas').get();
      let histCierres = [];
      await Promise.all(histSnap.docs.map(async d => {
        const cs = await db.collection('businesses').doc(biz)
          .collection('empleadas').doc(d.id).collection('cierres')
          .orderBy('cerradoEn','desc').limit(10).get();
        cs.docs.forEach(c => histCierres.push({ empNombre: d.data().nombre, ...c.data() }));
      }));
      histCierres.sort((a,b)=>(b.cerradoEn?.toDate?.()?.getTime()||0)-(a.cerradoEn?.toDate?.()?.getTime()||0));

      page.innerHTML = `
        <div class="page-header">
          <div class="page-header-title">Empleadas</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span id="ps-semana-badge" style="font-size:11px;color:var(--text-muted);">${semanaLabel}</span>
            <button class="btn btn-sm btn-primary" onclick="Empleadas.openRegistrar()"
              style="display:flex;align-items:center;gap:6px;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nueva empleada
            </button>
          </div>
        </div>

        <!-- Cards empleadas -->
        <div id="ps-empleadas-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px;"></div>

        <!-- Historial liquidaciones -->
        <div class="card">
          <div class="card-title">Historial de Liquidaciones</div>
          <div id="ps-hist-liquid" style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">
            ${histCierres.length===0
              ? '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px 0;">Sin liquidaciones registradas</div>'
              : histCierres.map(c => Empleadas._renderHistCierre(c)).join('')
            }
          </div>
        </div>

        <!-- Modal registrar empleada -->
        ${Empleadas._modalRegistrar()}
        <!-- Modal anticipo -->
        ${Empleadas._modalAnticipo()}
        <!-- Modal liquidar -->
        ${Empleadas._modalLiquidar()}
      `;

      // Renderizar cards
      const grid = document.getElementById('ps-empleadas-grid');
      grid.innerHTML = '';
      cards.forEach(({emp, totalConsumo, totalAnticipo, consumos, yaLiquidada}) => {
        const card = document.createElement('div');
        card.className = 'card';

        const VISIBLE = 2;
        const extraId = 'ps-extra-'+emp.id;
        const extraCnt= Math.max(0, consumos.length - VISIBLE);

        let consumosHTML = '';
        if (yaLiquidada) {
          consumosHTML = '<div style="font-size:12px;color:var(--green-primary);font-weight:600;padding:8px 0;">Semana liquidada</div>';
        } else if (consumos.length === 0) {
          consumosHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0;">Sin consumos esta semana</div>';
        } else {
          const renderC = (c) => {
            const items = (c.items||[]).map(i=>i.nombre+' x'+i.cantidad).join(', ')||(c.descripcion||'Consumo');
            const hora  = (c.fechaLabel||'').replace(/^[a-z]+\s/i,'');
            return '<div style="padding:4px 0;border-bottom:1px solid var(--border);font-size:11px;">'
              +'<div style="display:flex;justify-content:space-between;">'
              +'<span style="color:var(--text-muted);">'+hora+'</span>'
              +'<span style="font-weight:700;color:var(--red);">'+formatPrice(c.total||0)+'</span>'
              +'</div>'
              +'<div style="font-size:10px;color:var(--text-secondary);">'+items+'</div></div>';
          };
          consumosHTML = consumos.slice(0,VISIBLE).map(renderC).join('');
          if (extraCnt > 0) {
            consumosHTML += '<div id="'+extraId+'" style="display:none;">'+consumos.slice(VISIBLE).map(renderC).join('')+'</div>'
              +'<button onclick="Empleadas._toggleExtra(this,\''+extraId+'\','+extraCnt+')"'
              +' style="background:transparent;border:none;cursor:pointer;color:var(--green-primary);font-size:11px;font-weight:600;padding:4px 0;width:100%;text-align:center;">'
              +'Ver '+extraCnt+' más</button>';
          }
        }

        card.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">'
          +'<div style="display:flex;align-items:center;gap:10px;">'
          +'<div style="width:36px;height:36px;border-radius:50%;background:var(--green-muted);border:1px solid var(--border-green);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;color:var(--green-primary);">'+emp.nombre.charAt(0).toUpperCase()+'</div>'
          +'<span style="font-weight:700;font-size:15px;">'+emp.nombre+'</span>'
          +'</div>'
          +'<span style="font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--red);">'+formatPrice(totalConsumo+totalAnticipo)+'</span>'
          +'</div>'
          +'<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);padding:10px;min-height:48px;margin-bottom:10px;">'+consumosHTML+'</div>'
          +'<div style="font-size:11px;margin-bottom:12px;">'
          +'<div style="display:flex;justify-content:space-between;color:var(--text-muted);margin-bottom:2px;"><span>Consumos:</span><span style="color:var(--red);font-family:var(--font-mono);">'+formatPrice(totalConsumo)+'</span></div>'
          +'<div style="display:flex;justify-content:space-between;color:var(--text-muted);"><span>Anticipos:</span><span style="color:var(--orange);font-family:var(--font-mono);">'+formatPrice(totalAnticipo)+'</span></div>'
          +'</div>'
          +'<div style="display:flex;gap:8px;" id="ps-btns-'+emp.id+'"></div>';

        const btnAnticipo = document.createElement('button');
        btnAnticipo.className = 'btn btn-sm btn-secondary';
        btnAnticipo.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;gap:5px;border-color:var(--orange);color:var(--orange);';
        btnAnticipo.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Anticipo';
        btnAnticipo.addEventListener('click', () => Empleadas.openAnticipo(emp.id, emp.nombre));

        const btnLiquidar = document.createElement('button');
        btnLiquidar.className = 'btn btn-sm btn-primary';
        btnLiquidar.style.cssText = 'flex:1;display:flex;align-items:center;justify-content:center;gap:5px;background:#7c3aed;border-color:#7c3aed;';
        btnLiquidar.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> Liquidar';
        btnLiquidar.addEventListener('click', () => Empleadas.openLiquidar(emp.id, emp.nombre, totalConsumo, totalAnticipo));

        const btnImprimir = document.createElement('button');
        btnImprimir.className = 'btn btn-sm btn-secondary';
        btnImprimir.style.cssText = 'padding:6px 10px;';
        btnImprimir.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>';
        btnImprimir.title = 'Imprimir resumen';
        btnImprimir.addEventListener('click', () => Empleadas.imprimirResumen(emp.id, emp.nombre, totalConsumo, totalAnticipo));

        const btnsEl = card.querySelector('#ps-btns-'+emp.id);
        btnsEl.appendChild(btnAnticipo);
        btnsEl.appendChild(btnLiquidar);
        btnsEl.appendChild(btnImprimir);
        grid.appendChild(card);
      });

    } catch(e) {
      console.error(e);
      page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error</h3><p>${e.message}</p></div>`;
    }
  },

  _toggleExtra(btn, id, cnt) {
    const el = document.getElementById(id);
    if (!el) return;
    const hidden = el.style.display === 'none';
    el.style.display = hidden ? 'block' : 'none';
    btn.textContent  = hidden ? 'Ocultar' : 'Ver '+cnt+' más';
  },

  _getSemanaKey(fecha = new Date()) {
    const d = new Date(fecha);
    d.setHours(0,0,0,0);
    // Lunes de la semana
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().substring(0,10);
  },

  _getSemanaLabel(key) {
    const inicio = new Date(key+'T00:00:00');
    const fin    = new Date(inicio); fin.setDate(fin.getDate()+6);
    const f = d => d.toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit'});
    return f(inicio)+' – '+f(fin);
  },

  _modalRegistrar() {
    return `<div id="ps-modal-registrar" style="display:none;position:fixed;inset:0;z-index:1000;
      background:rgba(0,0,0,0.5);align-items:center;justify-content:center;padding:16px;">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);width:100%;max-width:400px;padding:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h3 style="font-size:18px;font-weight:800;">Nueva Empleada</h3>
          <button onclick="document.getElementById('ps-modal-registrar').style.display='none'"
            style="background:transparent;border:none;cursor:pointer;color:var(--text-muted);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="form-group">
          <label>Nombre completo *</label>
          <input type="text" id="ps-emp-nombre" placeholder="Nombre de la empleada">
        </div>
        <div class="form-group">
          <label>Teléfono (opcional)</label>
          <input type="text" id="ps-emp-tel" placeholder="Ej: 2915000000">
        </div>
        <p id="ps-registrar-msg" style="font-size:11px;color:var(--red);min-height:16px;margin-bottom:8px;"></p>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-secondary" onclick="document.getElementById('ps-modal-registrar').style.display='none'" style="flex:1;">Cancelar</button>
          <button class="btn btn-primary" onclick="Empleadas.guardarEmpleada()" style="flex:1;">Registrar</button>
        </div>
      </div>
    </div>`;
  },

  _modalAnticipo() {
    return `<div id="ps-modal-anticipo" style="display:none;position:fixed;inset:0;z-index:1000;
      background:rgba(0,0,0,0.5);align-items:center;justify-content:center;padding:16px;">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);width:100%;max-width:400px;padding:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h3 style="font-size:18px;font-weight:800;">Registrar Anticipo</h3>
          <button onclick="document.getElementById('ps-modal-anticipo').style.display='none'"
            style="background:transparent;border:none;cursor:pointer;color:var(--text-muted);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div id="ps-anticipo-nombre" style="font-weight:700;font-size:15px;margin-bottom:16px;color:var(--green-primary);"></div>
        <div class="form-group">
          <label>Monto del anticipo *</label>
          <input type="number" id="ps-anticipo-monto" placeholder="$ 0" min="0" step="100">
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <input type="text" id="ps-anticipo-desc" placeholder="Ej: Anticipo quincenal">
        </div>
        <p id="ps-anticipo-msg" style="font-size:11px;color:var(--red);min-height:16px;margin-bottom:8px;"></p>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-secondary" onclick="document.getElementById('ps-modal-anticipo').style.display='none'" style="flex:1;">Cancelar</button>
          <button class="btn btn-primary" onclick="Empleadas.confirmarAnticipo()" style="flex:1;background:var(--orange);border-color:var(--orange);">Registrar</button>
        </div>
      </div>
    </div>`;
  },

  _modalLiquidar() {
    return `<div id="ps-modal-liquidar" style="display:none;position:fixed;inset:0;z-index:1000;
      background:rgba(0,0,0,0.5);align-items:center;justify-content:center;padding:16px;">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);width:100%;max-width:420px;padding:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <h3 style="font-size:18px;font-weight:800;">Liquidar Sueldo</h3>
          <button onclick="document.getElementById('ps-modal-liquidar').style.display='none'"
            style="background:transparent;border:none;cursor:pointer;color:var(--text-muted);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div id="ps-liquid-nombre" style="font-weight:700;font-size:15px;margin-bottom:16px;color:var(--purple);"></div>
        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px;margin-bottom:16px;font-size:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:var(--text-muted);">Consumos:</span><span style="color:var(--red);font-weight:700;" id="ps-liquid-consumo">$0</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:var(--text-muted);">Anticipos:</span><span style="color:var(--orange);font-weight:700;" id="ps-liquid-anticipo">$0</span></div>
          <div style="display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:6px;margin-top:4px;"><span style="color:var(--text-muted);">Total descuento:</span><span style="font-weight:900;" id="ps-liquid-descuento">$0</span></div>
        </div>
        <div class="form-group">
          <label>Sueldo bruto *</label>
          <input type="number" id="ps-liquid-sueldo" placeholder="$ 0" min="0" step="100" oninput="Empleadas.calcNeto()">
        </div>
        <div style="background:var(--green-muted);border:1px solid var(--border-green);border-radius:var(--radius-md);padding:12px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;font-size:14px;">Neto a cobrar:</span>
          <span style="font-family:var(--font-mono);font-size:18px;font-weight:900;color:var(--green-primary);" id="ps-liquid-neto">—</span>
        </div>
        <p id="ps-liquid-msg" style="font-size:11px;color:var(--red);min-height:16px;margin-bottom:8px;"></p>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-secondary" onclick="document.getElementById('ps-modal-liquidar').style.display='none'" style="flex:1;">Cancelar</button>
          <button class="btn btn-primary" onclick="Empleadas.confirmarLiquidar()" style="flex:1;background:#7c3aed;border-color:#7c3aed;">Confirmar</button>
        </div>
      </div>
    </div>`;
  },

  _renderHistCierre(c) {
    const bruto    = c.sueldoBruto   || 0;
    const consumo  = c.totalConsumo  || 0;
    const anticipo = c.totalAnticipo || 0;
    const descuento= c.totalDescuento|| consumo+anticipo;
    const neto     = c.sueldoNeto    || Math.max(0, bruto-descuento);
    const semana   = c.semanaLabel   || c.semana || '';
    const dataStr  = encodeURIComponent(JSON.stringify(c));

    return '<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;margin-bottom:8px;">'
      // Header
      +'<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;">'
      +'<div style="width:34px;height:34px;border-radius:50%;background:#7c3aed18;border:1px solid #7c3aed44;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:#7c3aed;flex-shrink:0;">'+(c.empNombre||'?').charAt(0).toUpperCase()+'</div>'
      +'<div style="flex:1;min-width:0;">'
      +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">'
      +'<span style="font-weight:700;font-size:13px;">'+c.empNombre+'</span>'
      +'<span style="font-size:10px;padding:2px 8px;border-radius:99px;font-weight:700;background:#dcfce7;color:#166534;">Pagado</span>'
      +'</div>'
      +'<div style="font-size:11px;color:var(--text-muted);">'+semana+'</div>'
      +'</div>'
      +'<button onclick="imprimirLiquidPS(decodeURIComponent(\''+dataStr+'\'))" title="Imprimir"'
      +' style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:6px;cursor:pointer;color:var(--text-muted);flex-shrink:0;">'
      +'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>'
      +'</button></div>'
      // Desglose
      +'<div style="border-top:1px solid var(--border);padding:8px 14px;font-size:11px;">'
      +(bruto?'<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="color:var(--text-muted);">Sueldo bruto</span><span style="font-family:var(--font-mono);font-weight:600;">'+formatPrice(bruto)+'</span></div>':'')
      +'<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span style="color:var(--text-muted);">— Consumos</span><span style="font-family:var(--font-mono);color:var(--red);">−'+formatPrice(consumo)+'</span></div>'
      +'<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:var(--text-muted);">— Anticipos</span><span style="font-family:var(--font-mono);color:var(--orange);">−'+formatPrice(anticipo)+'</span></div>'
      +'<div style="display:flex;justify-content:space-between;border-top:1px dashed var(--border);padding-top:4px;">'
      +'<span style="font-weight:700;">Neto a cobrar</span>'
      +'<span style="font-family:var(--font-mono);font-weight:900;color:var(--green-primary);">'+formatPrice(neto)+'</span>'
      +'</div></div></div>';
  },

  openRegistrar() {
    document.getElementById('ps-emp-nombre').value = '';
    document.getElementById('ps-emp-tel').value    = '';
    document.getElementById('ps-registrar-msg').textContent = '';
    document.getElementById('ps-modal-registrar').style.display = 'flex';
    setTimeout(() => document.getElementById('ps-emp-nombre').focus(), 100);
  },

  async guardarEmpleada() {
    const nombre = document.getElementById('ps-emp-nombre').value.trim();
    const tel    = document.getElementById('ps-emp-tel').value.trim();
    const msg    = document.getElementById('ps-registrar-msg');
    if (!nombre) { msg.textContent = 'El nombre es obligatorio'; return; }
    try {
      await db.collection('businesses').doc(PS.businessId).collection('empleadas').add({
        nombre, telefono: tel, activa: true,
        creadaEn: firebase.firestore.FieldValue.serverTimestamp()
      });
      document.getElementById('ps-modal-registrar').style.display = 'none';
      showToast('Empleada registrada: '+nombre, 'success');
      Empleadas.load();
    } catch(e) { msg.textContent = 'Error: '+e.message; }
  },

  _anticEmpId: null,
  openAnticipo(empId, empNombre) {
    this._anticEmpId = empId;
    document.getElementById('ps-anticipo-nombre').textContent = empNombre;
    document.getElementById('ps-anticipo-monto').value = '';
    document.getElementById('ps-anticipo-desc').value  = '';
    document.getElementById('ps-anticipo-msg').textContent = '';
    document.getElementById('ps-modal-anticipo').style.display = 'flex';
    setTimeout(() => document.getElementById('ps-anticipo-monto').focus(), 100);
  },

  async confirmarAnticipo() {
    const monto = parseFloat(document.getElementById('ps-anticipo-monto').value) || 0;
    const desc  = document.getElementById('ps-anticipo-desc').value.trim();
    const msg   = document.getElementById('ps-anticipo-msg');
    if (monto <= 0) { msg.textContent = 'Ingresá un monto válido'; return; }
    try {
      const semanaKey = this._getSemanaKey();
      await db.collection('businesses').doc(PS.businessId)
        .collection('empleadas').doc(this._anticEmpId).collection('anticipos').add({
          monto, descripcion: desc||'Anticipo',
          semana: semanaKey, semanaLabel: this._getSemanaLabel(semanaKey),
          fecha: firebase.firestore.FieldValue.serverTimestamp(),
          fechaLabel: new Date().toLocaleString('es-AR')
        });
      document.getElementById('ps-modal-anticipo').style.display = 'none';
      showToast('Anticipo registrado: '+formatPrice(monto), 'success');
      Empleadas.load();
    } catch(e) { document.getElementById('ps-anticipo-msg').textContent = 'Error: '+e.message; }
  },

  _liquidEmpId: null, _liquidConsumo: 0, _liquidAnticipo: 0,
  openLiquidar(empId, empNombre, totalConsumo, totalAnticipo) {
    this._liquidEmpId     = empId;
    this._liquidConsumo   = totalConsumo;
    this._liquidAnticipo  = totalAnticipo;
    document.getElementById('ps-liquid-nombre').textContent   = empNombre;
    document.getElementById('ps-liquid-consumo').textContent  = formatPrice(totalConsumo);
    document.getElementById('ps-liquid-anticipo').textContent = formatPrice(totalAnticipo);
    document.getElementById('ps-liquid-descuento').textContent= formatPrice(totalConsumo+totalAnticipo);
    document.getElementById('ps-liquid-sueldo').value = '';
    document.getElementById('ps-liquid-neto').textContent = '—';
    document.getElementById('ps-liquid-msg').textContent = '';
    document.getElementById('ps-modal-liquidar').style.display = 'flex';
    setTimeout(() => document.getElementById('ps-liquid-sueldo').focus(), 100);
  },

  calcNeto() {
    const sueldo   = parseFloat(document.getElementById('ps-liquid-sueldo').value) || 0;
    const descuento= this._liquidConsumo + this._liquidAnticipo;
    const neto     = Math.max(0, sueldo - descuento);
    document.getElementById('ps-liquid-neto').textContent = formatPrice(neto);
  },

  async confirmarLiquidar() {
    const sueldo = parseFloat(document.getElementById('ps-liquid-sueldo').value);
    const msg    = document.getElementById('ps-liquid-msg');
    if (!sueldo || sueldo < 0) { msg.textContent = 'Ingresá el sueldo bruto'; return; }
    const descuento  = this._liquidConsumo + this._liquidAnticipo;
    const sueldoNeto = Math.max(0, sueldo - descuento);
    const semanaKey  = this._getSemanaKey();
    try {
      await db.collection('businesses').doc(PS.businessId)
        .collection('empleadas').doc(this._liquidEmpId).collection('cierres').add({
          semana: semanaKey, semanaLabel: this._getSemanaLabel(semanaKey),
          totalConsumo: this._liquidConsumo, totalAnticipo: this._liquidAnticipo,
          totalDescuento: descuento, sueldoBruto: sueldo, sueldoNeto,
          pagado: true, cerradoEn: firebase.firestore.FieldValue.serverTimestamp()
        });
      document.getElementById('ps-modal-liquidar').style.display = 'none';
      showToast('Liquidación confirmada. Neto: '+formatPrice(sueldoNeto), 'success');
      Empleadas.load();
    } catch(e) { msg.textContent = 'Error: '+e.message; }
  },

  imprimirResumen(empId, nombre, totalConsumo, totalAnticipo) {
    const consumos = (window._psConsumosMap && window._psConsumosMap[empId]) || [];
    const semana   = document.getElementById('ps-semana-badge')?.textContent || '';
    let filas = '';
    consumos.forEach(c => {
      const items = (c.items||[]).map(i=>i.nombre+' x'+i.cantidad).join(', ')||(c.descripcion||'Consumo');
      const hora  = (c.fechaLabel||'').replace(/^[a-z]+\s/i,'').trim();
      filas += '<div style="border-bottom:1px dashed #ccc;padding:2px 0;">'
        +'<div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;">'
        +'<span>'+hora+'</span><span>'+formatPrice(c.total||0)+'</span></div>'
        +'<div style="font-size:9px;color:#444;">'+items+'</div></div>';
    });
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'+CSS_58MM+'body{font-size:10px}</style></head><body>'
      +'<div class="center bold" style="font-size:13px;">'+PS.businessData?.name?.toUpperCase()+'</div>'
      +'<div class="center" style="font-size:9px;">Resumen de Consumos</div>'
      +'<hr class="sep"><div style="font-weight:700;">'+nombre+'</div>'
      +'<div style="font-size:9px;color:#555;">'+semana+'</div><hr class="sep">'
      +(consumos.length?filas:'<div style="text-align:center;color:#888;font-size:10px;">Sin consumos esta semana</div>')
      +'<hr class="sep">'
      +'<div style="display:flex;justify-content:space-between;">Consumos:<span style="font-weight:700;">'+formatPrice(totalConsumo)+'</span></div>'
      +'<div style="display:flex;justify-content:space-between;">Anticipos:<span style="font-weight:700;">'+formatPrice(totalAnticipo)+'</span></div>'
      +'<hr class="sep">'
      +'<div style="display:flex;justify-content:space-between;font-size:12px;font-weight:900;">TOTAL DESCUENTO<span>'+formatPrice(totalConsumo+totalAnticipo)+'</span></div>'
      +'<hr class="sep"><div class="center" style="font-size:9px;">'+PS.businessData?.name+'</div>'
      +'</body></html>';
    imprimirHTML(html);
  }
};

// Función global para imprimir liquidación 58mm
window.imprimirLiquidPS = function(dataStr) {
  const c = JSON.parse(dataStr);
  const bruto    = c.sueldoBruto   || 0;
  const consumo  = c.totalConsumo  || 0;
  const anticipo = c.totalAnticipo || 0;
  const descuento= c.totalDescuento|| consumo+anticipo;
  const neto     = c.sueldoNeto    || Math.max(0, bruto-descuento);
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>'+CSS_58MM+'body{font-size:10px}</style></head><body>'
    +'<div class="center bold" style="font-size:13px;">'+PS.businessData?.name?.toUpperCase()+'</div>'
    +'<div class="center" style="font-size:9px;">Liquidacion de Sueldo</div>'
    +'<hr class="sep">'
    +'<div style="font-weight:700;">'+c.empNombre+'</div>'
    +'<div style="font-size:9px;">'+( c.semanaLabel||c.semana||'')+'</div>'
    +'<div style="font-size:9px;">[PAGADO]</div>'
    +'<hr class="sep">'
    +(bruto?'<div style="display:flex;justify-content:space-between;">Sueldo bruto<span>'+formatPrice(bruto)+'</span></div>':'')
    +'<div style="display:flex;justify-content:space-between;">- Consumos<span>-'+formatPrice(consumo)+'</span></div>'
    +'<div style="display:flex;justify-content:space-between;">- Anticipos<span>-'+formatPrice(anticipo)+'</span></div>'
    +'<hr class="sep">'
    +'<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;">NETO A COBRAR<span>'+formatPrice(neto)+'</span></div>'
    +'<hr class="sep"><div class="center" style="font-size:9px;">'+PS.businessData?.name+'</div>'
    +'</body></html>';
  imprimirHTML(html);
};

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
                ['kiosco','Kiosco / Almacén'],
                ['ropa','Indumentaria / Ropa'],
                ['comida','Gastronomía / Comida'],
                ['verduleria','Verdulería / Frutería'],
                ['farmacia','Farmacia / Dietética'],
                ['electronica','Electrónica / Tecnología'],
                ['ferreteria','Ferretería / Materiales'],
                ['otro','Otro'],
              ].map(([v,l]) => `<option value="${v}" ${biz.tipoNegocio===v?'selected':''}>${l}</option>`).join('')}
            </select>
            <div style="font-size:11px; color:var(--text-muted); margin-top:5px;">
              Define las unidades disponibles al cargar productos en el stock.
            </div>
          </div>

          <!-- Módulo Empleadas -->
          <div class="form-group">
            <label>Módulos opcionales</label>
            <label style="display:flex; align-items:center; gap:12px; padding:12px 14px;
              background:var(--bg-secondary); border:1px solid var(--border);
              border-radius:var(--radius-md); cursor:pointer;">
              <div style="position:relative; width:44px; height:24px; flex-shrink:0;">
                <input type="checkbox" id="cfg-empleadas" ${biz.modulo_empleadas ? 'checked' : ''}
                  style="opacity:0;position:absolute;width:100%;height:100%;cursor:pointer;z-index:1;">
                <div id="cfg-empleadas-track" style="width:44px;height:24px;border-radius:12px;
                  background:${biz.modulo_empleadas ? 'var(--green-primary)' : 'var(--bg-card)'};
                  border:1px solid var(--border);transition:background 0.2s;position:absolute;top:0;left:0;"></div>
                <div id="cfg-empleadas-thumb" style="width:18px;height:18px;border-radius:50%;
                  background:white;position:absolute;top:3px;
                  left:${biz.modulo_empleadas ? '23px' : '3px'};
                  transition:left 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>
              </div>
              <div>
                <div style="font-weight:600; font-size:13px;">Módulo Empleadas</div>
                <div style="font-size:11px; color:var(--text-muted);">
                  Habilita consumos de empleadas y el método de pago "Consumo empleado" en ventas
                </div>
              </div>
            </label>
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
    const empMod = document.getElementById('cfg-empleadas')?.checked || false;

    if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }

    try {
      await db.collection('businesses').doc(PS.businessId).update({
        name: nombre, email, phone: tel, direccion: dir, tipoNegocio: rubro,
        modulo_empleadas: empMod,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      PS.businessData = { ...PS.businessData, name: nombre, email, phone: tel, direccion: dir, tipoNegocio: rubro, modulo_empleadas: empMod };
      // Ocultar/mostrar nav empleadas según módulo
      const empNav = document.getElementById('empleadas-nav-item');
      if (empNav) empNav.style.display = empMod ? 'flex' : 'none';
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
