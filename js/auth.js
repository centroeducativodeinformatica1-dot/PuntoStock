// ============================================================
// PUNTOSTOCK — Auth Module
// ============================================================

const Auth = {
  show(mode) {
    const screen = document.getElementById('auth-screen');
    screen.innerHTML = '';

    if (mode === 'login') {
      screen.innerHTML = this.loginHTML();
    } else if (mode === 'register') {
      screen.innerHTML = this.registerHTML();
    }
  },

  loginHTML() {
    return `
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon">P</div>
          <span>Punto<em>Stock</em></span>
        </div>
        <h2 class="auth-title">Bienvenido de nuevo</h2>
        <p class="auth-subtitle">Ingresá a tu cuenta para continuar</p>

        <div class="form-group">
          <label>Correo electrónico</label>
          <input type="email" id="login-email" placeholder="tu@email.com" autocomplete="email">
        </div>
        <div class="form-group">
          <label>Contraseña</label>
          <input type="password" id="login-pass" placeholder="••••••••" autocomplete="current-password">
        </div>

        <div style="text-align:right; margin-bottom:20px;">
          <a href="#" onclick="Auth.forgotPassword()" style="font-size:12px; color:var(--green-primary); text-decoration:none;">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        <button class="btn btn-primary" onclick="Auth.login()" id="login-btn">
          Iniciar sesión
        </button>

        <p style="text-align:center; margin-top:20px; font-size:13px; color:var(--text-secondary);">
          ¿No tenés cuenta?
          <a href="#" onclick="Auth.show('register')" style="color:var(--green-primary); text-decoration:none; font-weight:600;">
            Registrá tu negocio
          </a>
        </p>

        <div id="auth-error" style="display:none; margin-top:14px; padding:10px 14px; background:rgba(248,81,73,0.1); border:1px solid rgba(248,81,73,0.2); border-radius:8px; font-size:13px; color:var(--red);"></div>
      </div>
    `;
  },

  registerHTML() {
    return `
      <div class="auth-card">
        <div class="auth-logo">
          <div class="logo-icon">P</div>
          <span>Punto<em>Stock</em></span>
        </div>
        <h2 class="auth-title">Registrá tu negocio</h2>
        <p class="auth-subtitle">Empezá gratis, sin tarjeta de crédito</p>

        <div class="form-group">
          <label>Nombre del negocio</label>
          <input type="text" id="reg-biz" placeholder="Ej: Tienda Lola" maxlength="60">
        </div>
        <div class="form-group">
          <label>Tu nombre</label>
          <input type="text" id="reg-name" placeholder="Tu nombre completo" maxlength="60">
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="reg-email" placeholder="tu@email.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input type="text" id="reg-phone" placeholder="+54 11 ..." maxlength="20">
          </div>
        </div>
        <div class="form-group">
          <label>Contraseña</label>
          <input type="password" id="reg-pass" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label>Confirmar contraseña</label>
          <input type="password" id="reg-pass2" placeholder="Repetí la contraseña" autocomplete="new-password">
        </div>

        <button class="btn btn-primary" onclick="Auth.register()" id="reg-btn">
          Crear cuenta gratis
        </button>

        <p style="text-align:center; margin-top:20px; font-size:13px; color:var(--text-secondary);">
          ¿Ya tenés cuenta?
          <a href="#" onclick="Auth.show('login')" style="color:var(--green-primary); text-decoration:none; font-weight:600;">
            Iniciar sesión
          </a>
        </p>

        <div id="auth-error" style="display:none; margin-top:14px; padding:10px 14px; background:rgba(248,81,73,0.1); border:1px solid rgba(248,81,73,0.2); border-radius:8px; font-size:13px; color:var(--red);"></div>
      </div>
    `;
  },

  showError(msg) {
    const el = document.getElementById('auth-error');
    if (el) { el.style.display = 'block'; el.textContent = msg; }
  },

  setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading
      ? '<span class="loader"></span> Cargando...'
      : btn.dataset.label || btn.textContent;
    if (!loading && !btn.dataset.label) btn.dataset.label = btn.textContent;
  },

  async login() {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-pass').value;

    if (!email || !pass) { this.showError('Completá todos los campos.'); return; }

    this.setLoading('login-btn', true);
    try {
      await auth.signInWithEmailAndPassword(email, pass);
      // onAuthStateChanged en PS.init() se encarga del resto
    } catch (e) {
      this.setLoading('login-btn', false);
      const msgs = {
        'auth/user-not-found':  'No existe una cuenta con ese email.',
        'auth/wrong-password':  'Contraseña incorrecta.',
        'auth/invalid-email':   'El email no es válido.',
        'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos.'
      };
      this.showError(msgs[e.code] || 'Error al iniciar sesión: ' + e.message);
    }
  },

  async register() {
    const bizName = document.getElementById('reg-biz').value.trim();
    const name    = document.getElementById('reg-name').value.trim();
    const email   = document.getElementById('reg-email').value.trim();
    const phone   = document.getElementById('reg-phone').value.trim();
    const pass    = document.getElementById('reg-pass').value;
    const pass2   = document.getElementById('reg-pass2').value;

    if (!bizName || !name || !email || !pass) {
      this.showError('Completá todos los campos obligatorios.'); return;
    }
    if (pass.length < 6) {
      this.showError('La contraseña debe tener al menos 6 caracteres.'); return;
    }
    if (pass !== pass2) {
      this.showError('Las contraseñas no coinciden.'); return;
    }

    this.setLoading('reg-btn', true);
    try {
      // Crear usuario en Firebase Auth
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      const uid = cred.user.uid;

      // Crear el negocio (businessId = uid del owner)
      const businessId = uid;
      const batch = db.batch();

      batch.set(db.collection('businesses').doc(businessId), {
        name: bizName,
        ownerName: name,
        email: email,
        phone: phone,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        active: true,  // Admin puede desactivar
        plan: 'trial',
        trialEnds: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      batch.set(db.collection('users').doc(uid), {
        businessId: businessId,
        name: name,
        email: email,
        role: 'owner',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();
      // Auth state change llevará al app
    } catch (e) {
      this.setLoading('reg-btn', false);
      const msgs = {
        'auth/email-already-in-use': 'Ya existe una cuenta con ese email.',
        'auth/invalid-email':        'El email no es válido.',
        'auth/weak-password':        'La contraseña es muy débil.'
      };
      this.showError(msgs[e.code] || 'Error al registrar: ' + e.message);
    }
  },

  async forgotPassword() {
    const email = document.getElementById('login-email')?.value.trim();
    if (!email) {
      this.showError('Ingresá tu email primero para recuperar la contraseña.'); return;
    }
    try {
      await auth.sendPasswordResetEmail(email);
      showToast('Se envió un email para restablecer tu contraseña.', 'success');
    } catch (e) {
      this.showError('No se pudo enviar el email. Verificá el correo ingresado.');
    }
  },

  async logout() {
    await auth.signOut();
  }
};
