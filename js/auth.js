// ============================================================
// PUNTOSTOCK — Auth Module v4 (Supabase)
// ============================================================

const WA_NUMBER = '5493624897927';

const PLANES = {
  trial:      { id:'trial',      nombre:'Prueba gratuita',        precio_mensual:0,     precio_anual:null,   negocios:1,          descripcion:'7 días sin costo para que lo conozcas', color:'var(--text-secondary)', badge:'7 días gratis' },
  pro_mensual:{ id:'pro_mensual',nombre:'Pro — 1 negocio',        precio_mensual:20000, precio_anual:null,   negocios:1,          descripcion:'Para un negocio, facturación mensual',  color:'var(--green-primary)',  badge:'Más elegido' },
  pro_anual:  { id:'pro_anual',  nombre:'Pro — 1 negocio anual',  precio_mensual:null,  precio_anual:200000, negocios:1,          descripcion:'Para un negocio, pago anual único',      color:'var(--blue)',           badge:'Pago único' },
  multi:      { id:'multi',      nombre:'Multi-negocio',           precio_mensual:null,  precio_anual:150000, negocios:'multiple', descripcion:'$15.000 por negocio/mes',                color:'var(--purple)',         badge:'$15.000 c/u/mes' }
};

const Auth = {
  planSeleccionado: null,
  cantidadNegocios: 1,

  show(mode) {
    const screen = document.getElementById('auth-screen');
    screen.innerHTML = '';
    if (mode === 'login')    screen.innerHTML = this.loginHTML();
    if (mode === 'planes')   screen.innerHTML = this.planesHTML();
    if (mode === 'register') screen.innerHTML = this.registerHTML();
  },

  loginHTML() {
    return `
      <div class="auth-card">
        <div class="auth-logo" style="justify-content:center;">
          <img src="../logo-dark.png" class="ps-logo" alt="PuntoStock" style="height:40px; width:auto;">
        </div>
        <h2 class="auth-title">Bienvenido de nuevo</h2>
        <p class="auth-subtitle">Ingresá a tu cuenta para continuar</p>
        <div class="form-group">
          <label>Correo electrónico</label>
          <input type="email" id="login-email" autocomplete="email">
        </div>
        <div class="form-group">
          <label>Contraseña</label>
          <input type="password" id="login-pass" autocomplete="current-password">
        </div>
        <div style="text-align:right; margin-bottom:20px;">
          <a href="#" onclick="Auth.forgotPassword()" style="font-size:12px; color:var(--green-primary); text-decoration:none;">
            ¿Olvidaste tu contraseña?
          </a>
        </div>
        <button class="btn btn-primary" onclick="Auth.login()" id="login-btn">Iniciar sesión</button>
        <p style="text-align:center; margin-top:20px; font-size:13px; color:var(--text-secondary);">
          ¿No tenés cuenta?
          <a href="#" onclick="Auth.show('planes')" style="color:var(--green-primary); text-decoration:none; font-weight:600;">
            Conocer planes y registrarse
          </a>
        </p>
        <div id="auth-error" style="display:none; margin-top:14px; padding:10px 14px;
          background:rgba(248,81,73,0.1); border:1px solid rgba(248,81,73,0.2);
          border-radius:8px; font-size:13px; color:var(--red);"></div>
      </div>
    `;
  },

  planesHTML() {
    return `
      <div style="min-height:100vh; padding:40px 16px 60px; display:flex; flex-direction:column;
                  align-items:center; justify-content:flex-start; gap:0; overflow-y:auto;">
        <div style="text-align:center; margin-bottom:40px; max-width:600px;">
          <div style="margin-bottom:20px; text-align:center;">
            <img src="../logo-dark.png" class="ps-logo" alt="PuntoStock" style="height:44px; width:auto;">
          </div>
          <h1 style="font-size:clamp(24px,4vw,36px); font-weight:900; letter-spacing:-1px; margin-bottom:10px; line-height:1.1;">
            Elegí tu plan
          </h1>
          <p style="color:var(--text-secondary); font-size:15px;">
            Todos los planes incluyen acceso completo al sistema. El admin activa tu cuenta manualmente.
          </p>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
                    gap:16px; max-width:960px; width:100%; padding:0 4px;">
          <div class="plan-select-card" onclick="Auth.selectPlan('trial')" id="plan-trial">
            <div class="plan-select-badge" style="background:rgba(139,92,246,0.15); color:var(--purple);">7 días gratis</div>
            <div class="plan-select-name">Prueba gratuita</div>
            <div class="plan-select-price"><span style="font-size:36px; font-weight:900; font-family:var(--font-mono);">$0</span></div>
            <div class="plan-select-desc">7 días para conocer el sistema sin costo ni tarjeta.</div>
            <ul class="plan-select-features"><li>Punto de venta completo</li><li>Control de stock</li><li>Dashboard y reportes</li><li>1 negocio</li></ul>
            <div class="plan-select-btn" style="border-color:var(--border);">Empezar prueba gratis</div>
          </div>
          <div class="plan-select-card featured" onclick="Auth.selectPlan('pro_mensual')" id="plan-pro_mensual">
            <div class="plan-select-badge" style="background:var(--green-muted); color:var(--green-primary);">Más elegido</div>
            <div class="plan-select-name">Pro · 1 negocio</div>
            <div class="plan-select-price">
              <span style="font-size:14px; font-weight:600; color:var(--text-secondary);">$</span>
              <span style="font-size:36px; font-weight:900; font-family:var(--font-mono);">20.000</span>
              <span style="font-size:13px; color:var(--text-secondary);">/mes</span>
            </div>
            <div class="plan-select-desc">Facturación mensual para un negocio.</div>
            <ul class="plan-select-features"><li>Todo incluido</li><li>Sin límite de productos</li><li>Soporte prioritario</li><li>1 negocio</li></ul>
            <div class="plan-select-btn" style="background:var(--green-primary); color:#0D1117; border-color:var(--green-primary);">Elegir plan mensual</div>
          </div>
          <div class="plan-select-card" onclick="Auth.selectPlan('pro_anual')" id="plan-pro_anual">
            <div class="plan-select-badge" style="background:rgba(88,166,255,0.12); color:var(--blue);">Pago único — 1 año</div>
            <div class="plan-select-name">Pro · 1 negocio anual</div>
            <div class="plan-select-price">
              <span style="font-size:14px; font-weight:600; color:var(--text-secondary);">$</span>
              <span style="font-size:36px; font-weight:900; font-family:var(--font-mono);">200.000</span>
              <span style="font-size:13px; color:var(--text-secondary);">pago único</span>
            </div>
            <div class="plan-select-desc">Un solo pago anual para un negocio.</div>
            <ul class="plan-select-features"><li>Todo incluido</li><li>Sin límite de productos</li><li>Soporte prioritario</li><li>1 negocio</li></ul>
            <div class="plan-select-btn" style="border-color:var(--blue); color:var(--blue);">Elegir plan anual</div>
          </div>
          <div class="plan-select-card" onclick="Auth.selectPlan('multi')" id="plan-multi">
            <div class="plan-select-badge" style="background:rgba(139,92,246,0.12); color:var(--purple);">$15.000 c/u/mes</div>
            <div class="plan-select-name">Multi-negocio</div>
            <div class="plan-select-price">
              <span style="font-size:14px; font-weight:600; color:var(--text-secondary);">$</span>
              <span style="font-size:30px; font-weight:900; font-family:var(--font-mono);">15.000</span>
              <span style="font-size:13px; color:var(--text-secondary);">/negocio/mes</span>
            </div>
            <div class="plan-select-desc">Más de un negocio · $15.000 por negocio por mes.</div>
            <ul class="plan-select-features"><li>Múltiples negocios</li><li>Selector de negocio activo</li><li>Panel unificado</li><li>Todo incluido en Pro</li></ul>
            <div class="plan-select-btn" style="border-color:var(--purple); color:var(--purple);">Elegir multi-negocio</div>
          </div>
        </div>
        <div style="margin-top:28px; text-align:center; max-width:500px;">
          <p style="font-size:12px; color:var(--text-muted); line-height:1.6;">
            Al registrarte ingresás en modo trial 7 días. Para activar un plan pago
            contactate por WhatsApp con el administrador después del registro.
          </p>
          <p style="margin-top:12px; font-size:13px; color:var(--text-secondary);">
            ¿Ya tenés cuenta?
            <a href="#" onclick="Auth.show('login')" style="color:var(--green-primary); text-decoration:none; font-weight:600;">
              Iniciar sesión
            </a>
          </p>
        </div>
      </div>
      <style>
        .plan-select-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-lg); padding:24px; cursor:pointer; transition:all 0.2s; display:flex; flex-direction:column; gap:12px; position:relative; }
        .plan-select-card:hover { border-color:var(--border-green); transform:translateY(-3px); box-shadow:0 8px 32px rgba(0,0,0,0.3); }
        .plan-select-card.featured { border-color:var(--border-green); box-shadow:0 0 0 1px rgba(126,211,33,0.1); }
        .plan-select-card.selected { border-color:var(--green-primary) !important; box-shadow:0 0 0 2px var(--green-primary), 0 8px 32px rgba(126,211,33,0.2) !important; }
        .plan-select-badge { display:inline-block; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700; width:fit-content; }
        .plan-select-name { font-size:16px; font-weight:800; color:var(--text-primary); }
        .plan-select-price { line-height:1; }
        .plan-select-desc { font-size:12px; color:var(--text-secondary); line-height:1.5; }
        .plan-select-features { list-style:none; display:flex; flex-direction:column; gap:6px; margin:4px 0; }
        .plan-select-features li { font-size:12px; color:var(--text-secondary); display:flex; align-items:center; gap:6px; }
        .plan-select-features li::before { content:''; width:5px; height:5px; background:var(--green-primary); border-radius:50%; flex-shrink:0; }
        .plan-select-btn { margin-top:auto; padding:10px; border:1px solid var(--border); border-radius:var(--radius-md); text-align:center; font-size:13px; font-weight:700; transition:all 0.2s; }
        @media (max-width:600px) { .plan-select-card:hover { transform:none; } .plan-select-card { padding:18px; } }
      </style>
    `;
  },

  selectPlan(planId) {
    this.planSeleccionado = planId;
    document.querySelectorAll('.plan-select-card').forEach(c => c.classList.remove('selected'));
    document.getElementById(`plan-${planId}`)?.classList.add('selected');
    setTimeout(() => Auth.show('register'), 300);
  },

  registerHTML() {
    const plan   = PLANES[this.planSeleccionado] || PLANES.trial;
    const isMulti = plan.id === 'multi';
    return `
      <div class="auth-card" style="max-width:480px;">
        <div style="margin-bottom:16px;">
          <img src="../logo-dark.png" class="ps-logo" alt="PuntoStock" style="height:36px; width:auto;">
        </div>
        <div style="background:var(--bg-card); border:1px solid var(--border-green);
                    border-radius:var(--radius-md); padding:12px 16px; margin-bottom:24px;
                    display:flex; align-items:center; justify-content:space-between;">
          <div>
            <div style="font-size:11px; color:var(--text-secondary); font-weight:600; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">Plan elegido</div>
            <div style="font-weight:700; color:var(--green-primary);">${plan.nombre}</div>
            <div style="font-size:11px; color:var(--text-secondary);">${plan.descripcion}</div>
          </div>
          <a href="#" onclick="Auth.show('planes')" style="font-size:11px; color:var(--text-secondary); text-decoration:none; border:1px solid var(--border); padding:4px 10px; border-radius:6px;">Cambiar</a>
        </div>
        <h2 class="auth-title" style="font-size:20px; margin-bottom:4px;">Creá tu cuenta</h2>
        <p class="auth-subtitle">Ingresás en modo trial 7 días. El admin activa tu plan.</p>
        <div class="form-group" style="margin-bottom:20px;">
          <label>¿Qué tipo de negocio tenés? *</label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:6px;" id="tipo-negocio-grid">
            ${[
              { id:'kiosco',     label:'Kiosco',         sub:'Almacén, bebidas, snacks',      color:'#F59E0B', svg:'<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>' },
              { id:'ropa',       label:'Indumentaria',   sub:'Ropa, calzado, accesorios',     color:'#8B5CF6', svg:'<path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z"/>' },
              { id:'comida',     label:'Comida / Rest.', sub:'Restaurant, delivery, buffet',  color:'#EF4444', svg:'<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>' },
              { id:'verduleria', label:'Verdulería',      sub:'Frutas, verduras, a granel',    color:'#10B981', svg:'<path d="M17 8C8 10 5.9 16.17 3.82 19.34a1 1 0 1 0 1.66 1.1C7 18.62 8.63 16.35 11 15c-1 3-2.5 5-4 6.5a1 1 0 1 0 1.5 1.32C11 20 13 17 14 13c1 3.5.5 6.5-1 9a1 1 0 1 0 1.76.94C17 19 17.5 15 17 11c1.5 1.5 2.5 3.5 2.76 6a1 1 0 1 0 2-.2C21.5 12 19.5 8.5 17 8z"/><path d="M17 8c0-4-2-6-5-6-1 0-2 .5-2 .5"/>' },
              { id:'farmacia',   label:'Farmacia',        sub:'Medicamentos, perfumería',      color:'#0EA5E9', svg:'<path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>' },
              { id:'electronica',label:'Electrónica',     sub:'Tecnología, celulares, PC',     color:'#6366F1', svg:'<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>' },
              { id:'ferreteria', label:'Ferretería',      sub:'Herramientas, materiales',      color:'#F97316', svg:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' },
              { id:'otro',       label:'Otro rubro',      sub:'Personalizado',                 color:'#64748B', svg:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
            ].map(t => `
              <div onclick="Auth.selTipo('${t.id}')" id="tipo-${t.id}"
                style="display:flex; align-items:center; gap:10px; padding:12px;
                       border:2px solid var(--border); border-radius:var(--radius-md);
                       cursor:pointer; transition:all 0.15s; background:var(--bg-card);">
                <div style="width:36px; height:36px; border-radius:9px; background:${t.color}18;
                            display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                       stroke="${t.color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    ${t.svg}
                  </svg>
                </div>
                <div style="min-width:0;">
                  <div style="font-size:12px; font-weight:700; color:var(--text-primary);">${t.label}</div>
                  <div style="font-size:10px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.sub}</div>
                </div>
              </div>
            `).join('')}
          </div>
          <input type="hidden" id="reg-tipo" value="">
        </div>
        <div class="form-group"><label>Nombre del negocio *</label><input type="text" id="reg-biz" maxlength="60"></div>
        <div class="form-group"><label>Tu nombre *</label><input type="text" id="reg-name" maxlength="60"></div>
        ${isMulti ? `
        <div class="form-group">
          <label>Cantidad de negocios *</label>
          <div style="display:flex; align-items:center; gap:12px;">
            <input type="number" id="reg-cant-negocios" value="2" min="2" max="50"
              style="max-width:100px;" oninput="Auth.updateMultiCost(this.value)">
            <div style="font-size:13px; color:var(--text-secondary); flex:1;">
              Total anual: <span id="multi-total" style="color:var(--green-primary); font-weight:700; font-family:var(--font-mono);">$300.000</span>
            </div>
          </div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">$15.000 × cantidad de negocios · mensual</div>
        </div>
        ` : ''}
        <div class="grid-2">
          <div class="form-group"><label>Email *</label><input type="email" id="reg-email" autocomplete="email"></div>
          <div class="form-group"><label>Teléfono</label><input type="text" id="reg-phone" maxlength="20"></div>
        </div>
        <div class="form-group"><label>Contraseña *</label><input type="password" id="reg-pass" autocomplete="new-password"></div>
        <div class="form-group"><label>Confirmar contraseña *</label><input type="password" id="reg-pass2" autocomplete="new-password"></div>
        <button class="btn btn-primary" onclick="Auth.register()" id="reg-btn">Crear cuenta y empezar</button>
        <p style="text-align:center; margin-top:16px; font-size:13px; color:var(--text-secondary);">
          ¿Ya tenés cuenta?
          <a href="#" onclick="Auth.show('login')" style="color:var(--green-primary); text-decoration:none; font-weight:600;">Iniciar sesión</a>
        </p>
        <div id="auth-error" style="display:none; margin-top:14px; padding:10px 14px;
          background:rgba(248,81,73,0.1); border:1px solid rgba(248,81,73,0.2);
          border-radius:8px; font-size:13px; color:var(--red);"></div>
      </div>
    `;
  },

  updateMultiCost(cant) {
    const n = Math.max(2, parseInt(cant) || 2);
    const total = n * 15000 * 12;
    const el = document.getElementById('multi-total');
    if (el) el.textContent = '$' + total.toLocaleString('es-AR');
  },

  _tipoColors: {
    kiosco:'#F59E0B', ropa:'#8B5CF6', comida:'#EF4444', verduleria:'#10B981',
    farmacia:'#0EA5E9', electronica:'#6366F1', ferreteria:'#F97316', otro:'#64748B'
  },

  selTipo(id) {
    document.getElementById('reg-tipo').value = id;
    document.querySelectorAll('#tipo-negocio-grid > div').forEach(el => {
      el.style.border = '2px solid var(--border)';
      el.style.background = 'var(--bg-card)';
    });
    const color = this._tipoColors[id] || '#64748B';
    const el = document.getElementById(`tipo-${id}`);
    if (el) { el.style.border = `2px solid ${color}`; el.style.background = `${color}10`; }
  },

  // ── REGISTER SUBMIT ───────────────────────────────────────
  async register() {
    const bizName     = document.getElementById('reg-biz').value.trim();
    const name        = document.getElementById('reg-name').value.trim();
    const email       = document.getElementById('reg-email').value.trim();
    const phone       = document.getElementById('reg-phone').value.trim();
    const pass        = document.getElementById('reg-pass').value;
    const pass2       = document.getElementById('reg-pass2').value;
    const tipoNegocio = document.getElementById('reg-tipo')?.value || 'otro';
    const plan        = this.planSeleccionado || 'trial';
    const isMulti     = plan === 'multi';
    const cantBiz     = isMulti
      ? Math.max(2, parseInt(document.getElementById('reg-cant-negocios')?.value) || 2)
      : 1;

    if (!tipoNegocio) { this.showError('Seleccioná el tipo de negocio.'); return; }
    if (!bizName || !name || !email || !pass) { this.showError('Completá todos los campos obligatorios.'); return; }
    if (pass.length < 6) { this.showError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (pass !== pass2)  { this.showError('Las contraseñas no coinciden.'); return; }

    this.setLoading('reg-btn', true);

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: signUpData, error: signUpError } = await sb.auth.signUp({ email, password: pass });
      if (signUpError) throw signUpError;

      const uid       = signUpData.user.id;
      const trialEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // 2. Crear negocio principal
      const { data: mainBiz, error: bizError } = await sb.from('businesses').insert({
        name:              bizName,
        owner_name:        name,
        owner_uid:         uid,
        email, phone,
        numero:            1,
        tipo_negocio:      tipoNegocio,
        active:            true,
        plan:              'trial',
        plan_solicitado:   plan,
        cantidad_negocios: cantBiz,
        trial_ends:        trialEnds
      }).select().single();
      if (bizError) throw bizError;

      const bizIds = [mainBiz.id];

      // 3. Crear negocios adicionales (multi)
      if (isMulti && cantBiz > 1) {
        const extraBizRows = [];
        for (let i = 2; i <= cantBiz; i++) {
          extraBizRows.push({
            name:              `${bizName} — Local ${i}`,
            owner_name:        name,
            owner_uid:         uid,
            email, phone,
            numero:            i,
            tipo_negocio:      tipoNegocio,
            active:            true,
            plan:              'trial',
            plan_solicitado:   plan,
            cantidad_negocios: cantBiz,
            trial_ends:        trialEnds
          });
        }
        const { data: extraBizData, error: extraBizError } = await sb
          .from('businesses').insert(extraBizRows).select('id');
        if (extraBizError) throw extraBizError;
        extraBizData.forEach(b => bizIds.push(b.id));
      }

      // 4. Crear perfil (el trigger puede haber creado uno vacío, usamos upsert)
      const { error: profileError } = await sb.from('profiles').upsert({
        id:                uid,
        business_id:       mainBiz.id,
        business_ids:      bizIds,
        name, email, phone,
        role:              'owner',
        plan,
        cantidad_negocios: cantBiz
      });
      if (profileError) throw profileError;

      sessionStorage.setItem('ps_plan_solicitado', plan);
      sessionStorage.setItem('ps_is_new_user', '1');

    } catch (e) {
      this.setLoading('reg-btn', false);
      const msgs = {
        'User already registered':  'Ya existe una cuenta con ese email.',
        'Invalid email':            'El email no es válido.',
        'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.'
      };
      const msg = msgs[e.message] || e.message || 'Error al registrar.';
      this.showError(msg);
    }
  },

  // ── POPUP WHATSAPP ─────────────────────────────────────────
  showUpgradePopup({ businessName, email, plan, cantBiz } = {}) {
    if (PS.isAdmin) return;
    if (document.getElementById('wa-upgrade-popup')) return;

    const planSol = plan || 'trial';
    const planNombres = {
      trial:       'Prueba gratuita (7 días)',
      pro_mensual: 'Pro Mensual — $20.000/mes',
      pro_anual:   'Pro Anual — $200.000 pago único',
      multi:       `Multi-negocio — $15.000 c/u/mes`
    };
    const planSolMulti = planSol === 'multi'
      ? `Multi-negocio (${cantBiz} negocios) — Total: $${(cantBiz * 15000 * 12).toLocaleString('es-AR')}/año`
      : (planNombres[planSol] || planSol);

    const waMsg = encodeURIComponent(
      `Hola! Me registré en PuntoStock con el plan "${planSolMulti}".\n` +
      `Negocio: ${businessName}\nEmail: ${email}\n\n` +
      `Quiero activar mi plan. ¿Cómo procedo con el pago?`
    );
    const waURL = `https://wa.me/${WA_NUMBER}?text=${waMsg}`;

    const overlay = document.createElement('div');
    overlay.id = 'wa-upgrade-popup';
    overlay.style.cssText = `position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px;`;
    overlay.innerHTML = `
      <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-xl); padding:32px; max-width:440px; width:100%; text-align:center;">
        <div style="width:60px; height:60px; background:rgba(37,211,102,0.12); border:1px solid rgba(37,211,102,0.3); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
        </div>
        <div style="font-size:11px; font-weight:700; color:var(--green-primary); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:10px;">Tu cuenta está activa</div>
        <h2 style="font-size:22px; font-weight:800; margin-bottom:12px; line-height:1.2;">Para activar tu plan<br>contactate por WhatsApp</h2>
        <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-md); padding:14px; margin-bottom:20px;">
          <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">Plan solicitado</div>
          <div style="font-weight:700; color:var(--text-primary); font-size:14px;">${planSolMulti}</div>
        </div>
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:24px; line-height:1.6;">
          Entrás en período de prueba <strong style="color:var(--text-primary);">7 días gratis</strong>. Una vez que coordines el pago, tu plan queda activo.
        </p>
        <a href="${waURL}" target="_blank"
           style="display:flex; align-items:center; justify-content:center; gap:10px; width:100%; padding:14px; background:#25D366; border-radius:var(--radius-md); color:white; font-family:var(--font); font-size:15px; font-weight:700; text-decoration:none; margin-bottom:12px;">
          Contactar por WhatsApp
        </a>
        <button onclick="document.getElementById('wa-upgrade-popup').remove()"
          style="width:100%; padding:10px; background:transparent; border:1px solid var(--border); border-radius:var(--radius-md); color:var(--text-secondary); font-family:var(--font); font-size:13px; cursor:pointer;">
          Entrar al sistema primero
        </button>
        <p style="margin-top:12px; font-size:11px; color:var(--text-muted);">El número de WhatsApp es <strong>+54 362 489-7927</strong></p>
      </div>
    `;
    document.body.appendChild(overlay);
    sessionStorage.removeItem('ps_is_new_user');
  },

  // ── HELPERS ───────────────────────────────────────────────
  showError(msg) {
    const el = document.getElementById('auth-error');
    if (el) { el.style.display = 'block'; el.textContent = msg; }
  },

  setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
      btn.dataset.label = btn.textContent;
      btn.innerHTML = '<span class="loader"></span> Creando cuenta...';
    } else {
      btn.textContent = btn.dataset.label || 'Crear cuenta';
    }
  },

  async login() {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-pass').value;
    if (!email || !pass) { this.showError('Completá todos los campos.'); return; }

    this.setLoading('login-btn', true);
    try {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
    } catch (e) {
      this.setLoading('login-btn', false);
      const msgs = {
        'Invalid login credentials': 'Email o contraseña incorrectos.',
        'Email not confirmed':        'Confirmá tu email antes de ingresar.',
        'Too many requests':          'Demasiados intentos. Esperá unos minutos.'
      };
      this.showError(msgs[e.message] || 'Error al iniciar sesión.');
    }
  },

  async forgotPassword() {
    const email = document.getElementById('login-email')?.value.trim();
    if (!email) { this.showError('Ingresá tu email primero.'); return; }
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email);
      if (error) throw error;
      showToast('Email de recuperación enviado', 'success');
    } catch (e) {
      this.showError('No se pudo enviar el email.');
    }
  },

  async logout() {
    await sb.auth.signOut();
  }
};
