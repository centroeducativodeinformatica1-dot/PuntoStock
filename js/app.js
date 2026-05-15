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
      this.businessId  = userData.businessId;
      this.businessIds = userData.businessIds || [userData.businessId];
      this.isAdmin     = userData.role === 'admin';
      this.userUid     = uid;

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

        // Cargar todos los negocios del usuario (para multi)
        if (this.businessIds.length > 1) {
          const snaps = await Promise.all(
            this.businessIds.map(id => db.collection('businesses').doc(id).get())
          );
          this.allBusinesses = snaps
            .filter(s => s.exists)
            .map(s => ({ id: s.id, ...s.data() }));
        } else {
          this.allBusinesses = [{ id: this.businessId, ...this.businessData }];
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

    // Banner de aviso trial
    if (this.trialDaysLeft !== null && this.trialDaysLeft <= 7) {
      setTimeout(() => this.showTrialBanner(), 800);
    }

    // Popup WhatsApp para usuarios no admin (siempre al entrar, no solo nuevos)
    if (!this.isAdmin) {
     setTimeout(() => Auth.showUpgradePopup({
  businessName: this.businessData?.name || '',
  email: this.user?.email || '',
  plan: this.businessData?.planSolicitado || this.businessData?.plan || 'trial',
  cantBiz: this.businessData?.cantidadNegocios || 1
}), 1200);
    }

    // Tidio solo para usuarios con plan trial
    if (!this.isAdmin && (this.businessData?.plan === 'trial' || !this.businessData?.plan)) {
      // Chat widget se carga desde el HTML
    }
  },

  showTrialExpired() {
    document.getElementById('app').innerHTML = `
      <div style="min-height:100vh; display:flex; align-items:center; justify-content:center;
                  background:var(--bg-primary); padding:24px;">
        <div style="max-width:460px; width:100%; text-align:center;">

          <!-- Ícono -->
          <div style="width:80px; height:80px; background:rgba(248,81,73,0.1);
                      border:2px solid rgba(248,81,73,0.3); border-radius:50%;
                      display:flex; align-items:center; justify-content:center; margin:0 auto 24px;">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2">
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
          <p style="color:var(--text-secondary); font-size:15px; line-height:1.6; margin-bottom:28px;">
            Tu negocio <strong style="color:var(--text-primary);">${this.businessData?.name || ''}</strong>
            ya no tiene acceso al sistema. Contactanos por WhatsApp para activar tu plan.
          </p>

          <!-- Plan solicitado -->
          ${this.businessData?.planSolicitado && this.businessData.planSolicitado !== 'trial' ? `
            <div style="background:var(--bg-card); border:1px solid var(--border);
                        border-radius:var(--radius-lg); padding:14px 18px; margin-bottom:20px; text-align:left;">
              <div style="font-size:11px; color:var(--text-muted); margin-bottom:4px;">Plan solicitado al registrarse</div>
              <div style="font-weight:700; font-size:14px;">
                ${{trial:'Trial',pro_mensual:'Pro Mensual — $20.000/mes',pro_anual:'Pro Anual — $200.000',multi:'Multi-negocio'}[this.businessData.planSolicitado] || this.businessData.planSolicitado}
              </div>
            </div>
          ` : ''}

          <!-- Botón WhatsApp -->
          <a href="https://wa.me/5493624897927?text=Hola%2C%20quiero%20activar%20mi%20plan%20en%20PuntoStock.%20Mi%20negocio%20es%3A%20${encodeURIComponent(this.businessData?.name||'')}"
             target="_blank"
             style="display:flex; align-items:center; justify-content:center; gap:12px;
                    background:#25D366; color:white; text-decoration:none;
                    padding:16px 24px; border-radius:var(--radius-lg); font-weight:700;
                    font-size:16px; margin-bottom:14px; font-family:var(--font);
                    box-shadow:0 4px 20px rgba(37,211,102,0.35); transition:all 0.2s;"
             onmouseenter="this.style.background='#20bd5a'"
             onmouseleave="this.style.background='#25D366'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
            </svg>
            Activar mi plan por WhatsApp
          </a>
          <div style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">
            +54 362 489-7927
          </div>

          <button onclick="Auth.logout()"
            style="background:none; border:1px solid var(--border); color:var(--text-secondary);
                   padding:10px 24px; border-radius:var(--radius-md); cursor:pointer;
                   font-family:var(--font); font-size:13px; width:100%;">
            Cerrar sesión
          </button>
        </div>
      </div>
    `;
  },

  showTrialBanner() {
    if (document.getElementById('trial-banner')) return;
    const dias    = this.trialDaysLeft;
    const urgente = dias <= 2;
    const banner  = document.createElement('div');
    banner.id = 'trial-banner';
    banner.style.cssText = `
      position:fixed; top:0; left:0; right:0; z-index:9998;
      background:${urgente ? 'rgba(248,81,73,0.97)' : 'rgba(240,165,0,0.97)'};
      backdrop-filter:blur(8px); padding:10px 16px;
      display:flex; align-items:center; justify-content:center; gap:12px; flex-wrap:wrap;
      font-family:var(--font); font-size:13px; font-weight:500; color:white;
      border-bottom:1px solid rgba(255,255,255,0.15);
    `;
    banner.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>
        ${urgente
          ? `<strong>¡Atención!</strong> Tu plan trial vence ${dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : 'en ' + dias + ' días'}.`
          : `Tu plan trial vence en <strong>${dias} días</strong>.`
        }
      </span>
      <a href="https://wa.me/5493624897927?text=Hola%2C%20quiero%20mejorar%20mi%20plan%20en%20PuntoStock"
         target="_blank"
         style="display:inline-flex; align-items:center; gap:6px; background:white;
                color:#0D1117; text-decoration:none; padding:5px 14px; border-radius:6px;
                font-size:12px; font-weight:700; white-space:nowrap;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
        </svg>
        Mejorar plan
      </a>
      <button onclick="document.getElementById('trial-banner').remove(); document.getElementById('main-content').style.paddingTop=''"
        style="background:rgba(255,255,255,0.2); border:none; color:white; cursor:pointer;
               padding:5px 10px; border-radius:4px; font-size:12px; font-family:var(--font);">
        ✕
      </button>
    `;
    document.getElementById('main-content').style.paddingTop = '46px';
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
      } else if (plan === 'pro_mensual') {
        planEl.innerHTML = `<span style="color:var(--green-primary);">●</span> Plan Pro Mensual`;
      } else if (plan === 'pro_anual') {
        planEl.innerHTML = `<span style="color:var(--green-primary);">●</span> Plan Pro Anual`;
      } else if (plan === 'multi') {
        planEl.innerHTML = `<span style="color:var(--purple);">●</span> Multi-negocio`;
      } else {
        planEl.innerHTML = `<span style="color:var(--green-primary);">●</span> Sistema activo`;
      }
    }

    // Selector de negocio (solo si tiene más de uno)
    const switcherEl = document.getElementById('sidebar-biz-switcher');
    if (switcherEl) {
      const negocios = this.allBusinesses || [];
      if (negocios.length > 1) {
        switcherEl.style.display = 'block';
        switcherEl.innerHTML = `
          <div style="font-size:10px; font-weight:700; color:var(--text-muted);
                      text-transform:uppercase; letter-spacing:0.8px; margin-bottom:6px;">
            Cambiar negocio
          </div>
          ${negocios.map(biz => `
            <div onclick="PS.cambiarNegocio('${biz.id}')"
              style="display:flex; align-items:center; gap:8px; padding:8px 10px;
                     border-radius:var(--radius-md); cursor:pointer; transition:all 0.15s;
                     background:${biz.id === this.businessId ? 'var(--green-muted)' : 'transparent'};
                     border:1px solid ${biz.id === this.businessId ? 'var(--border-green)' : 'transparent'};
                     margin-bottom:3px;">
              <div style="width:8px; height:8px; border-radius:50%; flex-shrink:0;
                           background:${biz.id === this.businessId ? 'var(--green-primary)' : 'var(--text-muted)'};">
              </div>
              <div style="flex:1; min-width:0;">
                <div style="font-size:12px; font-weight:${biz.id === this.businessId ? '700' : '500'};
                             color:${biz.id === this.businessId ? 'var(--green-primary)' : 'var(--text-secondary)'};
                             overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${biz.name}
                </div>
              </div>
              ${biz.id === this.businessId ? `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>` : ''}
            </div>
          `).join('')}
        `;
      } else {
        switcherEl.style.display = 'none';
      }
    }

    const adminNav = document.getElementById('admin-nav-item');
    if (adminNav) adminNav.style.display = this.isAdmin ? 'flex' : 'none';
  },

  // Cambiar al negocio activo
  async cambiarNegocio(bizId) {
    if (bizId === this.businessId) return;

    try {
      // Actualizar en Firestore
      await db.collection('users').doc(this.userUid).update({ businessId: bizId });

      // Cargar datos del nuevo negocio
      const bizDoc = await db.collection('businesses').doc(bizId).get();
      if (bizDoc.exists) {
        this.businessId   = bizId;
        this.businessData = bizDoc.data();
        this.renderSidebar();
        this.updateTopbarUser();
        this.navigate('dashboard');
        showToast(`Cambiaste a: ${this.businessData.name}`, 'success');
      }
    } catch (e) {
      showToast('Error al cambiar de negocio: ' + e.message, 'error');
    }
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
    this.updateLogos(theme);
  },

  updateLogos(theme) {
    // Determinar si estamos en /app/ o en la raíz
    const isApp = window.location.pathname.includes('/app');
    const base  = isApp ? '../' : '';
    const src   = theme === 'light'
      ? `${base}logo-light.png`
      : `${base}logo-dark.png`;

    document.querySelectorAll('.ps-logo').forEach(img => {
      img.src = src;
    });
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
