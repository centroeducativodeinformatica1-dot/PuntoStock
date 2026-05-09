// ============================================================
// PUNTOSTOCK — Core App
// ============================================================

const PS = {
  user: null,
  businessId: null,
  businessData: null,
  cart: [],
  listeners: [],

  // ── Init ──────────────────────────────────────────────────
  async init() {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        this.user = user;
        await this.loadUserData(user.uid);
        this.showApp();
      } else {
        this.user = null;
        this.businessId = null;
        this.businessData = null;
        this.showAuth('login');
      }
    });
  },

  async loadUserData(uid) {
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        // Nuevo usuario sin perfil
        this.showAuth('login');
        return;
      }
      const userData = userDoc.data();
      this.businessId = userData.businessId;
      this.isAdmin = userData.role === 'admin';

      // Cargar datos del negocio
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
            : this.businessData.trialEnds
            ? new Date(this.businessData.trialEnds)
            : null;
          const now = new Date();
          if (plan === 'trial' && trialEnds && now > trialEnds) {
            this.trialExpired = true;
          } else if (plan === 'trial' && trialEnds) {
            const diasRestantes = Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24));
            this.trialDaysLeft = diasRestantes;
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

  // ── Navigation ────────────────────────────────────────────
  navigate(page) {
    // Detach old listeners
    this.listeners.forEach(u => u());
    this.listeners = [];

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.querySelector(`[data-page="${page}"]`);
    if (navEl) navEl.classList.add('active');

    // Show page
    document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    // Update topbar title
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

    // Load page data
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

  // ── Show/Hide screens ─────────────────────────────────────
  showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';

    // Pantalla de trial expirado
    if (this.trialExpired) {
      this.showTrialExpired();
      return;
    }

    // Setup sidebar
    this.renderSidebar();
    this.updateTopbarUser();
    this.navigate('dashboard');

    // Banner de trial si quedan pocos días
    if (this.trialDaysLeft !== null && this.trialDaysLeft <= 7) {
      setTimeout(() => this.showTrialBanner(), 800);
    }
  },

  showTrialExpired() {
    document.getElementById('app').innerHTML = `
      <div style="min-height:100vh; display:flex; align-items:center; justify-content:center;
                  background:var(--bg-primary); padding:24px;">
        <div style="max-width:480px; text-align:center;">
          <div style="width:72px; height:72px; background:rgba(248,81,73,0.1);
                      border:2px solid rgba(248,81,73,0.3); border-radius:50%;
                      display:flex; align-items:center; justify-content:center;
                      margin:0 auto 24px;">
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
            <div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px;">Contacto</div>
            <div style="font-weight:600;">admin@puntostock.com</div>
            <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">
              o escribinos por WhatsApp
            </div>
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
  },

  showTrialBanner() {
    const existing = document.getElementById('trial-banner');
    if (existing) return;

    const dias = this.trialDaysLeft;
    const urgente = dias <= 2;
    const banner = document.createElement('div');
    banner.id = 'trial-banner';
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 9998;
      background: ${urgente ? 'rgba(248,81,73,0.95)' : 'rgba(240,165,0,0.95)'};
      backdrop-filter: blur(8px);
      padding: 10px 20px;
      display: flex; align-items: center; justify-content: center; gap: 16px;
      font-family: var(--font); font-size: 13px; font-weight: 500;
      color: white;
      border-bottom: 1px solid ${urgente ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.2)'};
    `;
    banner.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>
        ${urgente
          ? `<strong>¡Atención!</strong> Tu plan trial vence ${dias === 1 ? 'mañana' : 'en ' + dias + ' días'}.`
          : `Tu plan trial vence en <strong>${dias} días</strong>.`
        }
        Contactá al administrador para no perder el acceso.
      </span>
      <button onclick="document.getElementById('trial-banner').remove()"
        style="background:rgba(255,255,255,0.2); border:none; color:white; cursor:pointer;
               padding:4px 10px; border-radius:4px; font-size:12px; font-family:var(--font);">
        Cerrar
      </button>
    `;

    // Empujar el contenido hacia abajo
    document.getElementById('main-content').style.paddingTop = '42px';
    document.body.prepend(banner);
  },

  showAuth(mode) {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
    Auth.show(mode);
  },

  renderSidebar() {
    const bizName = document.getElementById('sidebar-biz-name');
    if (bizName) bizName.textContent = this.businessData?.name || 'Mi Negocio';

    // Mostrar/ocultar admin nav
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
  }
};

// ── Toast system ─────────────────────────────────────────────
function showToast(msg, type = 'success', duration = 3500) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Modal helper ─────────────────────────────────────────────
function openModal(html, size = '') {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'active-modal';
  overlay.innerHTML = `<div class="modal ${size}">${html}</div>`;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.body.appendChild(overlay);
}

function closeModal() {
  const m = document.getElementById('active-modal');
  if (m) m.remove();
}

// ── Format helpers ────────────────────────────────────────────
function formatPrice(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR');
}

function formatDate(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
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
      <h3 class="modal-title">⚠️ Confirmar</h3>
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

// ── Sidebar mobile toggle ─────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}
