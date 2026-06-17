// ============================================================
// PUNTOSTOCK — Dashboard Module (Supabase)
// ============================================================

const Dashboard = {
  async load() {
    const page = document.getElementById('page-dashboard');
    page.innerHTML = `<div class="page-loader"><div class="loader"></div> Cargando dashboard...</div>`;

    try {
      const biz   = PS.businessId;
      const now   = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart  = new Date(now);
      weekStart.setDate(now.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      // Consultas paralelas
      const [
        { data: ventasHoy },
        { data: ventasSemana },
        { data: productos },
        { data: stockBajoData }
      ] = await Promise.all([
        sb.from('ventas').select('total').eq('business_id', biz).gte('fecha', todayStart),
        sb.from('ventas').select('total,fecha,items').eq('business_id', biz).gte('fecha', weekStart.toISOString()).order('fecha', { ascending: true }),
        sb.from('productos').select('precio,stock,vencimiento,categoria,nombre').eq('business_id', biz).limit(500),
        sb.from('productos').select('id,nombre,stock,categoria').eq('business_id', biz).lte('stock', 5).limit(10)
      ]);

      // Stats ventas hoy
      let ventasHoyTotal = 0, ventasHoyCount = 0;
      (ventasHoy || []).forEach(v => { ventasHoyTotal += v.total || 0; ventasHoyCount++; });

      // Stats semana
      let ventasSemanaTotal = 0;
      const ventasPorDia = {};
      (ventasSemana || []).forEach(v => {
        ventasSemanaTotal += v.total || 0;
        const key = new Date(v.fecha).toLocaleDateString('es-AR', { weekday: 'short' });
        ventasPorDia[key] = (ventasPorDia[key] || 0) + (v.total || 0);
      });

      // Stats productos
      let productosTotal = 0, productosValor = 0;
      (productos || []).forEach(p => {
        productosTotal++;
        productosValor += (p.precio || 0) * (p.stock || 0);
      });

      // Productos por vencer (30 días)
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const en30 = new Date(hoy); en30.setDate(hoy.getDate() + 30);
      const porVencer = [];
      (productos || []).forEach(p => {
        if (!p.vencimiento) return;
        const fv = new Date(p.vencimiento);
        if (fv <= en30) {
          porVencer.push({ ...p, diasRestantes: Math.ceil((fv - hoy) / (1000*60*60*24)) });
        }
      });
      porVencer.sort((a, b) => a.diasRestantes - b.diasRestantes);

      // Top productos semana
      const topProds = {};
      (ventasSemana || []).forEach(v => {
        const items = Array.isArray(v.items) ? v.items : [];
        items.forEach(item => {
          if (!topProds[item.nombre]) topProds[item.nombre] = 0;
          topProds[item.nombre] += item.cantidad || 1;
        });
      });
      const topList = Object.entries(topProds).sort((a, b) => b[1] - a[1]).slice(0, 5);

      // Barras últimos 7 días
      const dias = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(now.getDate() - i);
        dias.push(d.toLocaleDateString('es-AR', { weekday: 'short' }));
      }
      const maxVenta = Math.max(...dias.map(d => ventasPorDia[d] || 0), 1);
      const stockBajo = stockBajoData || [];

      page.innerHTML = `
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-icon green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div class="stat-label">Ventas hoy</div>
            <div class="stat-value green">${formatPrice(ventasHoyTotal)}</div>
            <div class="stat-change up">▲ ${ventasHoyCount} ventas</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            </div>
            <div class="stat-label">Productos</div>
            <div class="stat-value">${productosTotal.toLocaleString()}</div>
            <div class="stat-change up">en stock</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
              </svg>
            </div>
            <div class="stat-label">Ventas 7 días</div>
            <div class="stat-value green">${formatPrice(ventasSemanaTotal)}</div>
            <div class="stat-change up">▲ esta semana</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div class="stat-label">Valor en stock</div>
            <div class="stat-value">${formatPrice(productosValor)}</div>
            <div class="stat-change ${stockBajo.length > 0 ? 'down' : 'up'}">
              ${stockBajo.length > 0 ? stockBajo.length + ' con stock bajo' : 'Todo OK'}
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-title">
              Ventas últimos 7 días
              <span style="font-size:11px; color:var(--text-muted); text-transform:none; font-weight:400;">
                ${formatPrice(ventasSemanaTotal)} total
              </span>
            </div>
            <div style="display:flex; align-items:flex-end; gap:8px; height:120px; padding-bottom:8px;">
              ${dias.map(d => {
                const val = ventasPorDia[d] || 0;
                const pct = Math.max(8, Math.round((val / maxVenta) * 100));
                return `
                  <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; height:100%; justify-content:flex-end;">
                    <div style="font-size:9px; color:var(--text-muted); font-family:var(--font-mono);">
                      ${val > 0 ? formatPrice(val).replace('$','') : ''}
                    </div>
                    <div title="${d}: ${formatPrice(val)}"
                         style="width:100%; height:${pct}%; background:var(--green-muted); border-radius:4px 4px 0 0;
                                border:1px solid var(--border-green); transition:all 0.3s; cursor:pointer;"
                         onmouseenter="this.style.background='var(--green-primary)'"
                         onmouseleave="this.style.background='var(--green-muted)'"></div>
                    <div style="font-size:10px; color:var(--text-secondary);">${d}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="card">
            <div class="card-title">Más vendidos esta semana</div>
            ${topList.length === 0 ? `
              <div class="empty-state" style="padding:30px 0;">
                <div class="empty-state-icon">📊</div>
                <p>Sin ventas esta semana todavía</p>
              </div>
            ` : topList.map(([nombre, qty], i) => `
              <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border);">
                <span style="font-size:11px; font-weight:700; color:var(--text-muted); width:16px;">${i+1}</span>
                <span style="flex:1; font-size:13px; font-weight:500;">${nombre}</span>
                <span style="font-family:var(--font-mono); font-size:13px; font-weight:700; color:var(--green-primary);">${qty} uds</span>
              </div>
            `).join('')}
          </div>
        </div>

        ${stockBajo.length > 0 ? `
          <div class="card mt-16">
            <div class="card-title" style="color:var(--orange);">
              Stock bajo — reponés pronto
              <button class="btn btn-sm btn-secondary" onclick="PS.navigate('stock')">Ver stock completo</button>
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; margin-top:4px;">
              ${stockBajo.map(p => `
                <div style="background:var(--bg-secondary); border:1px solid rgba(240,165,0,0.2);
                            border-radius:var(--radius-md); padding:12px 14px; display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <div style="font-weight:600; font-size:13px;">${p.nombre}</div>
                    <div style="font-size:11px; color:var(--text-secondary);">${p.categoria || 'Sin categoría'}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-family:var(--font-mono); font-size:18px; font-weight:800; color:var(--red);">${p.stock}</div>
                    <div style="font-size:10px; color:var(--text-muted);">unidades</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${porVencer.length > 0 ? `
          <div class="card mt-16">
            <div class="card-title" style="color:var(--red);">
              <span style="display:flex; align-items:center; gap:8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Productos próximos a vencer
              </span>
              <button class="btn btn-sm btn-secondary" onclick="PS.navigate('stock')">Ver stock</button>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:4px;">
              ${porVencer.map(p => {
                const vencido  = p.diasRestantes <= 0;
                const urgente  = p.diasRestantes <= 7;
                const color    = vencido || urgente ? 'var(--red)' : 'var(--orange)';
                const bgColor  = vencido ? 'rgba(248,81,73,0.08)' : urgente ? 'rgba(248,81,73,0.06)' : 'rgba(240,165,0,0.06)';
                const border   = vencido ? 'rgba(248,81,73,0.25)' : urgente ? 'rgba(248,81,73,0.2)' : 'rgba(240,165,0,0.2)';
                const texto    = vencido ? '¡Vencido!' : p.diasRestantes === 1 ? 'Vence mañana' : `Vence en ${p.diasRestantes} días`;
                return `
                  <div style="background:${bgColor}; border:1px solid ${border}; border-radius:var(--radius-md); padding:12px 16px; display:flex; align-items:center; gap:12px;">
                    <div style="flex:1; min-width:0;">
                      <div style="font-weight:700; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.nombre}</div>
                      <div style="font-size:11px; color:var(--text-secondary);">${p.categoria || ''} · Vence: ${p.vencimiento}</div>
                    </div>
                    <div style="text-align:right; flex-shrink:0;">
                      <div style="font-weight:800; font-size:13px; color:${color};">${texto}</div>
                      ${!vencido ? `<div style="font-size:10px; color:var(--text-muted);">${p.diasRestantes} días</div>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      `;

    } catch (e) {
      console.error(e);
      page.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>Error al cargar</h3><p>${e.message}</p></div>`;
    }
  }
};
