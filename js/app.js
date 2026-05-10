// ============================================================
// PUNTOSTOCK — Core App v2
// ============================================================

const PS = {
  user: null,
  businessId: null,
  businessData: null,
  cart: [],
  listeners: [],
  isAdmin: false,
  trialExpired: false,
  trialDaysLeft: null,

  // ── Init ──────────────────────────────────────────────────
  async init() {
    // Aplicar tema guardado
    Theme.apply();

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.user = user;
        await this.loadUserData(user.uid);
        this.showApp();
      } else {
        this.user = null;
        this.businessId = null;
        this.businessData = null;
        this.isAdmin = false;
        this.showAuth('login');
      }
    });
  },

  async loadUserData(uid) {
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) { this.showAuth('login'); return; }

      const userData = userDoc.data();
      this.businessId = userData.businessId;
      this.isAdmin = userData.role === 'admin';

      const bizDoc = await db.collection('businesses').doc(this.businessId).get();
      if (bizDoc.exists) {
        this.businessData = bizDoc.data();

        if (!this.businessData.active && !this.isAdmin) {
          auth.signOut();
          showToast('Tu cuenta está desactivada. Contactá al administrador.', 'error');
          return;
        }

        // Verificar trial
        if (!this.isAdmin) {
          const plan = this.businessData.plan || 'trial';
          const trialEnds = this.businessData.trialEnds?.toDate
            ? this.businessData.trialEnds.toDate()
            : this.businessData.trialEnds ? new Date(this.businessData.trialEnds) : null;
          const now = new Date();

          if (plan === 'trial' && trialEnds && now > trialEnds) {
            this.trialExpired = true;
          } else if (plan === 'trial' && trialEnds) {
            this.trialDaysLeft = Math.ceil((trialEnds - now) / (1000*60*60*24));
            this.trialExpired = false;
          } else {
            this.trialExpired = false;
            this.trialDaysLeft = null;
          }
        }
      }
    } catch (e) {
      console.error('Error cargando usuario:', e);
      showToast('Error al cargar datos. Intentá de nuevo.', 'error');
    }
  },

  // ── Navigation ─────────────────────────────────────────────
  navigate(page) {
    this.listeners.forEach(u => u());
    this.listeners = [];

    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.querySelector(`[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');

    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    const titles = {
      dashboard:   'Dashboard',
      ventas:      'Nueva Venta',
      stock:       'Stock',
      historial:   'Historial de Ventas',
      clientes:    'Clientes',
      proveedores: 'Proveedores',
      caja:        'Cierre de Caja',
      admin:       'Panel de Administración',
      config:      'Configuración'
    };
    document.getElementById('topbar-title').textContent = titles[page] || 'PuntoStock';

    const loaders = {
      dashboard:   () => Dashboard.load(),
      ventas:      () => Ventas.load(),
      stock:       () => Stock.load(),
      historial:   () => Historial.load(),
      clientes:    () => Clientes.load(),
      proveedores: () => Proveedores.load(),
      caja:        () => Caja.load(),
      admin:       () => Admin.load(),
      config:      () => Config.load()
    };
    if (loaders[page]) loaders[page]();
  },

  // ── Show/Hide ──────────────────────────────────────────────
  showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    if (this.trialExpired) { this.showTrialExpired(); return; }

    this.renderSidebar();
    this.updateTopbarUser();
    this.navigate('dashboard');

    // Banner de aviso trial — siempre visible si está en trial
    if (this.trialDaysLeft !== null) {
      setTimeout(() => this.showTrialBanner(), 800);
    }

    // Popup WhatsApp para usuarios no admin (siempre al entrar, no solo nuevos)
    if (!this.isAdmin) {
      setTimeout(() => Auth.showUpgradePopup(), 1200);
    }

    // Tidio solo para usuarios con plan trial
    if (!this.isAdmin && (this.businessData?.plan === 'trial' || !this.businessData?.plan)) {
      this.loadTidio();
    }
  },

  loadTidio() {
    if (document.getElementById('tidio-script')) return;
    const s = document.createElement('script');
    s.id = 'tidio-script';
    s.src = '//code.tidio.co/eguph56krosseehnhpk1efwhuegt2vqb.js';
    s.async = true;
    document.body.appendChild(s);
  },

  showTrialExpired() {
    document.getElementById('app').innerHTML = `
      <div style="min-height:100vh; display:flex; align-items:center; justify-content:center;
                  background:var(--bg-primary); padding:24px;">
        <div style="max-width:480px; text-align:center;">
          <div style="width:72px; height:72px; background:rgba(248,81,73,0.1);
                      border:2px solid rgba(248,81,73,0.3); border-radius:50%;
                      display:flex; align-items:center; justify-content:center; margin:0 auto 24px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div style="font-size:11px; font-weight:700; color:var(--red); letter-spacing:2px;
                      text-transform:uppercase; margin-bottom:12px;">Plan Trial Expirado</div>
          <h2 style="font-size:28px; font-weight:800; margin-bottom:12px; line-height:1.2;">
            Tu período de prueba<br>ha terminado
          </h2>
          <p style="color:var(--text-secondary); font-size:15px; line-height:1.6; margin-bottom:32px;">
            Tu negocio <strong style="color:var(--text-primary);">${this.businessData?.name || ''}</strong>
            ya no tiene acceso al sistema.<br>
            Contactá al administrador para activar tu plan y seguir usando PuntoStock.
          </p>
          <div style="background:var(--bg-card); border:1px solid var(--border);
                      border-radius:var(--radius-lg); padding:20px; margin-bottom:24px;">
            <div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">Soporte</div>
            <div style="font-weight:600;">Usá el chat para contactarnos</div>
          </div>
          <button onclick="Auth.logout()"
            style="background:none; border:1px solid var(--border); color:var(--text-secondary);
                   padding:10px 24px; border-radius:var(--radius-md); cursor:pointer;
                   font-family:var(--font); font-size:13px;">
            Cerrar sesión
          </button>
        </div>
      </div>
    `;
    // Tidio también en pantalla de expirado
    this.loadTidio();
  },

  showTrialBanner() {
    if (document.getElementById('trial-banner')) return;
    const dias = this.trialDaysLeft;
    const urgente  = dias <= 2;
    const warning  = dias <= 5;
    const color = urgente ? 'rgba(248,81,73,0.97)' : warning ? 'rgba(240,165,0,0.97)' : 'rgba(88,166,255,0.97)';

    let mensaje;
    if (dias === 0)      mensaje = `<strong>⚠ Último día de prueba.</strong> Tu acceso vence hoy.`;
    else if (dias === 1) mensaje = `<strong>⚠ Mañana vence tu prueba.</strong> Contactá al admin para no perder el acceso.`;
    else if (urgente)    mensaje = `<strong>⚠ Te quedan ${dias} días de prueba.</strong> Coordiná tu plan antes de que venza.`;
    else if (warning)    mensaje = `Tu prueba vence en <strong>${dias} días</strong>. Contactá al administrador.`;
    else                 mensaje = `Período de prueba activo — <strong>${dias} días restantes</strong>.`;

    const banner = document.createElement('div');
    banner.id = 'trial-banner';
    banner.style.cssText = `
      position:fixed; top:0; left:0; right:0; z-index:9998;
      background:${color}; backdrop-filter:blur(8px);
      padding:10px 16px;
      display:flex; align-items:center; justify-content:space-between; gap:10px;
      font-family:var(--font); font-size:13px; font-weight:500; color:white;
      border-bottom:1px solid rgba(255,255,255,0.15);
    `;
    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:0;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style="line-height:1.4;">${mensaje}</span>
      </div>
      <button onclick="document.getElementById('trial-banner').remove(); document.getElementById('main-content').style.paddingTop=''"
        style="background:rgba(255,255,255,0.2); border:none; color:white; cursor:pointer;
               padding:5px 11px; border-radius:4px; font-size:12px; font-family:var(--font);
               white-space:nowrap; flex-shrink:0;">
        ✕
      </button>
    `;
    document.getElementById('main-content').style.paddingTop = '42px';
    document.body.prepend(banner);
  },

  renderSidebar() {
    const bizName = document.getElementById('sidebar-biz-name');
    if (bizName) bizName.textContent = this.businessData?.name || 'Mi Negocio';

    const planEl = document.getElementById('sidebar-biz-plan');
    if (planEl) {
      const plan = this.businessData?.plan || 'trial';
      const dias = this.trialDaysLeft;
      if (plan === 'trial' && dias !== null) {
        planEl.innerHTML = `<span style="color:var(--orange);">●</span> Trial — ${dias} días restantes`;
      } else if (plan === 'pro') {
        planEl.innerHTML = `<span style="color:var(--green-primary);">●</span> Plan Pro`;
      } else {
        planEl.innerHTML = `<span style="color:var(--green-primary);">●</span> Sistema activo`;
      }
    }

    const adminNav = document.getElementById('admin-nav-item');
    if (adminNav) adminNav.style.display = this.isAdmin ? 'flex' : 'none';
  },

  updateTopbarUser() {
    const av = document.getElementById('user-avatar');
    if (av) {
      const name = this.businessData?.name || this.user?.email || '?';
      av.textContent = name.charAt(0).toUpperCase();
    }
    const nameEl = document.getElementById('topbar-user-name');
    if (nameEl) nameEl.textContent = this.businessData?.name || this.user?.email;
  },

  showAuth(mode) {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    Auth.show(mode);
  }
};

// ============================================================
// THEME — Dark / Light
// ============================================================
const Theme = {
  current: 'dark',

  apply(theme) {
    if (!theme) theme = localStorage.getItem('ps_theme') || 'dark';
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ps_theme', theme);
    this.updateIcon();
  },

  toggle() {
    this.apply(this.current === 'dark' ? 'light' : 'dark');
  },

  updateIcon() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    if (this.current === 'dark') {
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>`;
      btn.title = 'Cambiar a tema claro';
    } else {
      btn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>`;
      btn.title = 'Cambiar a tema oscuro';
    }
  }
};

// ── Toast con íconos SVG ──────────────────────────────────────
function showToast(msg, type = 'success', duration = 3500) {
  const svgs = {
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
  };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${svgs[type] || svgs.info}<span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Modal ─────────────────────────────────────────────────────
function openModal(html, size = '') {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';
  overlay.innerHTML = `<div class="modal ${size}">${html}</div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
}

function closeModal() {
  const m = document.getElementById('active-modal');
  if (m) m.remove();
}

// ── Formatters ────────────────────────────────────────────────
function formatPrice(n) { return '$' + Number(n || 0).toLocaleString('es-AR'); }

function formatDate(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function formatDateTime(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function formatDateInput(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().split('T')[0];
}

// ── Confirm dialog ────────────────────────────────────────────
function confirmDialog(msg, onConfirm) {
  openModal(`
    <div class="modal-header">
      <h3 class="modal-title">Confirmar acción</h3>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <p style="color:var(--text-secondary); font-size:14px; line-height:1.6;">${msg}</p>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" id="confirm-btn">Confirmar</button>
    </div>
  `);
  document.getElementById('confirm-btn').onclick = () => { closeModal(); onConfirm(); };
}

// ── Sidebar mobile ────────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
