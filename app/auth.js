// ============================================================
// PUNTOSTOCK — Auth Module v4 FIXED
// Flujo: Login | Planes | Registro | App
// ============================================================

const WA_NUMBER = '5493624897927';

const PLANES = {
  trial: {
    id: 'trial',
    nombre: 'Prueba gratuita',
    precio_mensual: 0,
    precio_anual: 0,
    negocios: 1,
    descripcion: '7 días sin costo para que lo conozcas',
    features: [
      'Punto de venta completo',
      'Control de stock',
      'Dashboard',
      'Historial de ventas'
    ],
    color: 'var(--text-secondary)',
    badge: '7 días gratis'
  },

  pro_mensual: {
    id: 'pro_mensual',
    nombre: 'Pro — 1 negocio',
    precio_mensual: 20000,
    precio_anual: null,
    negocios: 1,
    descripcion: 'Para un negocio, facturación mensual',
    features: [
      'Todo incluido',
      'Soporte prioritario',
      'Sin límite de productos',
      'Cierre de caja'
    ],
    color: 'var(--green-primary)',
    badge: 'Más elegido'
  },

  pro_anual: {
    id: 'pro_anual',
    nombre: 'Pro — 1 negocio anual',
    precio_mensual: null,
    precio_anual: 200000,
    negocios: 1,
    descripcion: 'Para un negocio, pago anual único',
    features: [
      'Todo incluido',
      'Soporte prioritario',
      'Sin límite de productos',
      'Cierre de caja'
    ],
    color: 'var(--blue)',
    badge: 'Pago único'
  },

  multi: {
    id: 'multi',
    nombre: 'Multi-negocio',
    precio_mensual: null,
    precio_anual: 150000,
    negocios: 'multiple',
    descripcion: '$15.000 por negocio/mes',
    features: [
      'Múltiples negocios',
      'Panel unificado',
      'Selector de negocio activo',
      'Todo incluido en Pro'
    ],
    color: 'var(--purple)',
    badge: '$15.000 c/u/mes'
  }
};

const Auth = {

  planSeleccionado: null,

  cantidadNegocios: 1,

  // =========================================================
  // ROUTING
  // =========================================================

  show(mode) {

    const screen = document.getElementById('auth-screen');

    if (!screen) return;

    screen.innerHTML = '';

    if (mode === 'login') {
      screen.innerHTML = this.loginHTML();
    }

    if (mode === 'planes') {
      screen.innerHTML = this.planesHTML();
    }

    if (mode === 'register') {
      screen.innerHTML = this.registerHTML();
    }

    if (window.Theme) {
      Theme.updateLogos();
    }

  },

  // =========================================================
  // LOGIN HTML
  // =========================================================

  loginHTML() {

    return `
      <div class="auth-card">

        <div class="auth-logo" style="justify-content:center;">
          <img
            id="auth-logo-1"
            src="../logo-dark.png"
            alt="PuntoStock"
            style="height:40px;width:auto;"
          >
        </div>

        <h2 class="auth-title">
          Bienvenido de nuevo
        </h2>

        <p class="auth-subtitle">
          Ingresá a tu cuenta para continuar
        </p>

        <div class="form-group">
          <label>Correo electrónico</label>

          <input
            type="email"
            id="login-email"
            autocomplete="email"
          >
        </div>

        <div class="form-group">
          <label>Contraseña</label>

          <input
            type="password"
            id="login-pass"
            autocomplete="current-password"
          >
        </div>

        <div style="text-align:right;margin-bottom:20px;">

          <a
            href="#"
            onclick="Auth.forgotPassword()"
            style="
              font-size:12px;
              color:var(--green-primary);
              text-decoration:none;
            "
          >
            ¿Olvidaste tu contraseña?
          </a>

        </div>

        <button
          class="btn btn-primary"
          onclick="Auth.login()"
          id="login-btn"
        >
          Iniciar sesión
        </button>

        <p style="
          text-align:center;
          margin-top:20px;
          font-size:13px;
          color:var(--text-secondary);
        ">

          ¿No tenés cuenta?

          <a
            href="#"
            onclick="Auth.show('planes')"
            style="
              color:var(--green-primary);
              text-decoration:none;
              font-weight:600;
            "
          >
            Registrarse
          </a>

        </p>

        <div
          id="auth-error"
          style="
            display:none;
            margin-top:14px;
            padding:10px 14px;
            background:rgba(248,81,73,0.1);
            border:1px solid rgba(248,81,73,0.2);
            border-radius:8px;
            font-size:13px;
            color:var(--red);
          "
        ></div>

      </div>
    `;
  },

  // =========================================================
  // PLANES HTML
  // =========================================================

  planesHTML() {

    return `
      <div style="
        min-height:100vh;
        padding:40px 20px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
      ">

        <div style="
          text-align:center;
          margin-bottom:40px;
        ">

          <img
            src="../logo-dark.png"
            style="height:44px;margin-bottom:20px;"
          >

          <h1 style="
            font-size:34px;
            font-weight:900;
            margin-bottom:10px;
          ">
            Elegí tu plan
          </h1>

          <p style="
            color:var(--text-secondary);
          ">
            Todos los planes incluyen acceso completo.
          </p>

        </div>

        <div style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
          gap:16px;
          max-width:960px;
          width:100%;
        ">

          ${Object.values(PLANES).map(plan => `

            <div
              class="plan-select-card"
              onclick="Auth.selectPlan('${plan.id}')"
              id="plan-${plan.id}"
            >

              <div class="plan-select-badge">
                ${plan.badge}
              </div>

              <div class="plan-select-name">
                ${plan.nombre}
              </div>

              <div class="plan-select-desc">
                ${plan.descripcion}
              </div>

            </div>

          `).join('')}

        </div>

      </div>
    `;
  },

  // =========================================================
  // SELECT PLAN
  // =========================================================

  selectPlan(planId) {

    this.planSeleccionado = planId;

    document
      .querySelectorAll('.plan-select-card')
      .forEach(card => {
        card.classList.remove('selected');
      });

    document
      .getElementById(`plan-${planId}`)
      ?.classList.add('selected');

    setTimeout(() => {
      this.show('register');
    }, 300);

  },

  // =========================================================
  // REGISTER HTML
  // =========================================================

  registerHTML() {

    const plan = PLANES[this.planSeleccionado] || PLANES.trial;

    const isMulti = plan.id === 'multi';

    return `
      <div class="auth-card" style="max-width:480px;">

        <h2 class="auth-title">
          Crear cuenta
        </h2>

        <p class="auth-subtitle">
          Plan seleccionado:
          <strong>${plan.nombre}</strong>
        </p>

        <div class="form-group">
          <label>Nombre del negocio *</label>

          <input
            type="text"
            id="reg-biz"
          >
        </div>

        <div class="form-group">
          <label>Tu nombre *</label>

          <input
            type="text"
            id="reg-name"
          >
        </div>

        ${isMulti ? `

          <div class="form-group">

            <label>Cantidad de negocios *</label>

            <input
              type="number"
              id="reg-cant-negocios"
              value="2"
              min="2"
              max="50"
            >

          </div>

        ` : ''}

        <div class="grid-2">

          <div class="form-group">

            <label>Email *</label>

            <input
              type="email"
              id="reg-email"
            >

          </div>

          <div class="form-group">

            <label>Teléfono</label>

            <input
              type="text"
              id="reg-phone"
            >

          </div>

        </div>

        <div class="form-group">

          <label>Contraseña *</label>

          <input
            type="password"
            id="reg-pass"
          >

        </div>

        <div class="form-group">

          <label>Confirmar contraseña *</label>

          <input
            type="password"
            id="reg-pass2"
          >

        </div>

        <button
          class="btn btn-primary"
          onclick="Auth.register()"
          id="reg-btn"
        >
          Crear cuenta
        </button>

        <div
          id="auth-error"
          style="
            display:none;
            margin-top:14px;
            padding:10px 14px;
            background:rgba(248,81,73,0.1);
            border:1px solid rgba(248,81,73,0.2);
            border-radius:8px;
            font-size:13px;
            color:var(--red);
          "
        ></div>

      </div>
    `;
  },

  // =========================================================
  // REGISTER
  // =========================================================

  async register() {

    const bizName = document
      .getElementById('reg-biz')
      ?.value
      .trim();

    const name = document
      .getElementById('reg-name')
      ?.value
      .trim();

    const email = document
      .getElementById('reg-email')
      ?.value
      .trim();

    const phone = document
      .getElementById('reg-phone')
      ?.value
      .trim();

    const pass = document
      .getElementById('reg-pass')
      ?.value;

    const pass2 = document
      .getElementById('reg-pass2')
      ?.value;

    const plan = this.planSeleccionado || 'trial';

    const isMulti = plan === 'multi';

    const cantBiz = isMulti
      ? Math.max(
          2,
          parseInt(
            document
              .getElementById('reg-cant-negocios')
              ?.value
          ) || 2
        )
      : 1;

    // =====================================================
    // VALIDACIONES
    // =====================================================

    if (!bizName || !name || !email || !pass || !pass2) {

      this.showError(
        'Completá todos los campos obligatorios.'
      );

      return;
    }

    if (pass.length < 6) {

      this.showError(
        'La contraseña debe tener mínimo 6 caracteres.'
      );

      return;
    }

    if (pass !== pass2) {

      this.showError(
        'Las contraseñas no coinciden.'
      );

      return;
    }

    this.setLoading('reg-btn', true);

    try {

      // ===================================================
      // FIREBASE AUTH
      // ===================================================

      const cred =
        await auth.createUserWithEmailAndPassword(
          email,
          pass
        );

      const uid = cred.user.uid;

      const batch = db.batch();

      const businessIds = [uid];

      // ===================================================
      // NEGOCIO PRINCIPAL
      // ===================================================

      batch.set(
        db.collection('businesses').doc(uid),
        {
          name: bizName,

          ownerName: name,

          ownerUid: uid,

          email,
          phone,

          active: true,

          plan: 'trial',

          planSolicitado: plan,

          cantidadNegocios: cantBiz,

          createdAt:
            firebase.firestore.FieldValue.serverTimestamp(),

          trialEnds: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          )
        }
      );

      // ===================================================
      // NEGOCIOS EXTRA
      // ===================================================

      if (isMulti && cantBiz > 1) {

        for (let i = 2; i <= cantBiz; i++) {

          const extraRef =
            db.collection('businesses').doc();

          businessIds.push(extraRef.id);

          batch.set(extraRef, {

            name: `${bizName} — Negocio ${i}`,

            ownerName: name,

            ownerUid: uid,

            email,
            phone,

            active: true,

            plan: 'trial',

            planSolicitado: plan,

            createdAt:
              firebase.firestore.FieldValue.serverTimestamp(),

            trialEnds: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000
            )

          });

        }

      }

      // ===================================================
      // USER
      // ===================================================

      batch.set(
        db.collection('users').doc(uid),
        {

          businessId: uid,

          businessIds,

          name,

          email,

          role: 'owner',

          plan,

          cantidadNegocios: cantBiz,

          createdAt:
            firebase.firestore.FieldValue.serverTimestamp()

        }
      );

      // ===================================================
      // COMMIT
      // ===================================================

      await batch.commit();

      // ===================================================
      // SESSION
      // ===================================================

      sessionStorage.setItem(
        'ps_plan_solicitado',
        plan
      );

      sessionStorage.setItem(
        'ps_is_new_user',
        '1'
      );

      // ===================================================
      // FIN LOADING
      // ===================================================

      this.setLoading('reg-btn', false);

      // ===================================================
      // POPUP
      // ===================================================

      this.showUpgradePopup({
        businessName: bizName,
        email,
        plan,
        cantBiz
      });

    } catch (e) {

      console.error(e);

      this.setLoading('reg-btn', false);

      const msgs = {

        'auth/email-already-in-use':
          'Ya existe una cuenta con ese email.',

        'auth/invalid-email':
          'El email no es válido.',

        'auth/weak-password':
          'La contraseña es muy débil.'

      };

      this.showError(
        msgs[e.code] ||
        ('Error al registrar: ' + e.message)
      );

    }

  },

  // =========================================================
  // POPUP WHATSAPP
  // =========================================================

  showUpgradePopup(data) {

    if (
      document.getElementById('wa-upgrade-popup')
    ) {
      return;
    }

    const waMsg = encodeURIComponent(

      `Hola! Me registré en PuntoStock.\n\n` +

      `Negocio: ${data.businessName}\n` +

      `Email: ${data.email}\n\n` +

      `Quiero activar mi plan.`

    );

    const waURL =
      `https://wa.me/${WA_NUMBER}?text=${waMsg}`;

    const overlay = document.createElement('div');

    overlay.id = 'wa-upgrade-popup';

    overlay.style.cssText = `
      position:fixed;
      inset:0;
      z-index:9999;
      background:rgba(0,0,0,0.75);
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
    `;

    overlay.innerHTML = `

      <div style="
        background:var(--bg-secondary);
        border:1px solid var(--border);
        border-radius:20px;
        padding:32px;
        max-width:420px;
        width:100%;
        text-align:center;
      ">

        <div style="
          font-size:54px;
          margin-bottom:16px;
        ">
          ✅
        </div>

        <h2 style="
          font-size:24px;
          font-weight:800;
          margin-bottom:10px;
        ">
          Cuenta creada
        </h2>

        <p style="
          color:var(--text-secondary);
          margin-bottom:24px;
          line-height:1.6;
        ">
          Tu prueba gratuita ya está activa.
        </p>

        <a
          href="${waURL}"
          target="_blank"
          style="
            display:flex;
            align-items:center;
            justify-content:center;
            width:100%;
            padding:14px;
            background:#25D366;
            color:white;
            border-radius:12px;
            text-decoration:none;
            font-weight:700;
            margin-bottom:12px;
          "
        >
          Contactar por WhatsApp
        </a>

        <button
          onclick="location.reload()"
          style="
            width:100%;
            padding:12px;
            border-radius:12px;
            border:1px solid var(--border);
            background:transparent;
            color:var(--text-primary);
            cursor:pointer;
          "
        >
          Entrar al sistema
        </button>

      </div>

    `;

    document.body.appendChild(overlay);

  },

  // =========================================================
  // HELPERS
  // =========================================================

  showError(msg) {

    const el =
      document.getElementById('auth-error');

    if (!el) return;

    el.style.display = 'block';

    el.textContent = msg;

  },

  setLoading(btnId, loading) {

    const btn =
      document.getElementById(btnId);

    if (!btn) return;

    btn.disabled = loading;

    if (loading) {

      btn.dataset.label = btn.textContent;

      btn.innerHTML =
        '<span class="loader"></span> Procesando...';

    } else {

      btn.textContent =
        btn.dataset.label || 'Continuar';

    }

  },

  // =========================================================
  // LOGIN
  // =========================================================

  async login() {

    const email = document
      .getElementById('login-email')
      ?.value
      .trim();

    const pass = document
      .getElementById('login-pass')
      ?.value;

    if (!email || !pass) {

      this.showError(
        'Completá todos los campos.'
      );

      return;
    }

    this.setLoading('login-btn', true);

    try {

      await auth.signInWithEmailAndPassword(
        email,
        pass
      );

    } catch (e) {

      console.error(e);

      this.setLoading('login-btn', false);

      const msgs = {

        'auth/user-not-found':
          'No existe una cuenta con ese email.',

        'auth/wrong-password':
          'Contraseña incorrecta.',

        'auth/invalid-email':
          'Email inválido.',

        'auth/invalid-credential':
          'Credenciales incorrectas.'

      };

      this.showError(
        msgs[e.code] ||
        'Error al iniciar sesión.'
      );

    }

  },

  // =========================================================
  // RECUPERAR PASSWORD
  // =========================================================

  async forgotPassword() {

    const email = document
      .getElementById('login-email')
      ?.value
      .trim();

    if (!email) {

      this.showError(
        'Ingresá tu email primero.'
      );

      return;
    }

    try {

      await auth.sendPasswordResetEmail(email);

      alert(
        'Email de recuperación enviado.'
      );

    } catch (e) {

      this.showError(
        'No se pudo enviar el email.'
      );

    }

  },

  // =========================================================
  // LOGOUT
  // =========================================================

  async logout() {

    await auth.signOut();

  }

};
