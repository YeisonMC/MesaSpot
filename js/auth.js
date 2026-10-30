(() => {
  'use strict';
  const { $, element, button, modal, feedback, field, pageUrl, link } = MesaUI;
  let validatedUser = false;
  let formVersion = 0;
  // El avatar comparte el mismo fallback de iniciales en el header y en el perfil.
  function avatar(user, className = "account-avatar") {
    const node = element('span', className);
    const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'MS';
    node.textContent = initials;
    const url = MesaUI.safeUrl(user?.avatarUrl);
    if (url) {
      const img = element('img'); img.src = url; img.alt = '';
      img.addEventListener('error', () => node.replaceChildren(document.createTextNode(initials)), { once: true });
      node.replaceChildren(img);
    }
    return node;
  }
  function closeAccountMenu(focus = false) {
    const menu = $('#account-dropdown'), trigger = $('#account-trigger');
    if (!menu || !trigger) return;
    const wasOpen = !menu.hidden;
    menu.hidden = true; trigger.setAttribute('aria-expanded', 'false');
    if (focus && wasOpen) trigger.focus();
  }
  // Las opciones de cuenta se muestran en un desplegable compacto, accesible con teclado.
  function renderHeader() {
    document.querySelectorAll('[data-session-action]').forEach(node => node.remove());
    const user = MesaAPI.session?.user;
    document.querySelectorAll('[data-account]').forEach(node => { node.hidden = Boolean(user); });
    const actions = $('.header-actions');
    if (!user || !actions) return;
    const account = element('div', 'header-account'); account.dataset.sessionAction = 'account';
    const trigger = button('', () => {
      const menu = $('#account-dropdown'); menu.hidden = !menu.hidden;
      trigger.setAttribute('aria-expanded', String(!menu.hidden));
    }, 'account-trigger');
    trigger.id = 'account-trigger'; trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'account-dropdown'); trigger.setAttribute('aria-label', user.firstName + ', menú de cuenta');
    trigger.append(avatar(user), element('span', 'account-name', user.firstName), MesaIcons.icon('chevron-down'));
    const menu = element('div', 'account-dropdown'); menu.id = 'account-dropdown'; menu.hidden = true;
    const profile = user.role === 'CLIENT' ? link('Mi perfil', pageUrl('perfil.html'), 'account-option') : button('Mi perfil', () => { closeAccountMenu(); openProfile(); }, 'account-option');
    profile.prepend(MesaIcons.icon('user-round')); profile.dataset.sessionAction = 'profile';
    const logout = button('Cerrar sesión', () => { closeAccountMenu(); MesaAPI.logout(); }, 'account-option account-logout');
    logout.dataset.sessionAction = 'logout'; logout.prepend(MesaIcons.icon('log-out'));
    menu.append(profile, logout); account.append(trigger, menu);
    if (user.role === 'RESTAURANT_ADMIN') {
      // En móvil el acceso administrativo permanece dentro del menú de cuenta.
      const compactAdmin = link('Administrar', pageUrl('administracion.html'), 'account-option account-admin-option');
      compactAdmin.prepend(MesaIcons.icon('layout-dashboard')); menu.insertBefore(compactAdmin, logout);
      const admin = link('Administrar', pageUrl('administracion.html'), 'button header-admin');
      admin.prepend(MesaIcons.icon('layout-dashboard')); admin.dataset.sessionAction = 'admin'; actions.append(admin);
    }
    actions.append(account);
  }
  document.addEventListener('click', event => { if (!event.target.closest('.header-account')) closeAccountMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeAccountMenu(true); });
  function openAuth(mode = 'login') {
    const version = ++formVersion;
    const register = mode === 'register';
    const content = modal(register ? 'Crea tu cuenta' : 'Iniciar sesión', 'auth-modal');
    content.append(element('p', 'modal-description', register ? 'Descubre restaurantes y comparte tu experiencia.' : 'Accede a tu perfil de MesaSpot.'));
    const form = element('form', 'modal-form auth-form');
    if (register) {
      field(form, 'firstName', 'Nombre', 'text', '', { required: true, maxlength: '80', autocomplete: 'given-name' });
      field(form, 'lastName', 'Apellidos', 'text', '', { required: true, maxlength: '80', autocomplete: 'family-name' });
    }
    field(form, 'email', 'Correo electrónico', 'email', '', { required: true, autocomplete: 'email' });
    const password = field(form, 'password', 'Contraseña', 'password', '', { required: true, minlength: register ? '8' : '1', maxlength: '72', autocomplete: register ? 'new-password' : 'current-password' });
    form.append(button('Mostrar contraseña', event => {
      password.type = password.type === 'password' ? 'text' : 'password';
      event.currentTarget.textContent = password.type === 'password' ? 'Mostrar contraseña' : 'Ocultar contraseña';
      event.currentTarget.prepend(MesaIcons.icon(password.type === 'password' ? 'eye' : 'eye-off'));
    }, 'auth-link'));
    let confirm, remember;
    if (register) {
      confirm = field(form, 'confirm', 'Confirmar contraseña', 'password', '', { required: true, autocomplete: 'new-password' });
      const terms = element('label', 'auth-checkbox');
      const checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.required = true;
      terms.append(checkbox, element('span', '', 'Acepto los términos de servicio y la política de privacidad.'));
      form.append(terms);
    } else {
      const label = element('label', 'auth-checkbox');
      remember = element('input'); remember.type = 'checkbox';
      label.append(remember, element('span', '', 'Mantener mi sesión en este navegador')); form.append(label);
    }
    const submit = element('button', 'button auth-submit', register ? 'Crear cuenta' : 'Iniciar sesión'); submit.type = 'submit';
    const status = element('p', 'auth-feedback'); status.setAttribute('role', 'status'); status.hidden = true;
    form.append(submit, status);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (confirm && confirm.value !== password.value) return feedback(status, 'Las contraseñas no coinciden.', true);
      submit.disabled = true; feedback(status, 'Conectando…');
      try {
        const values = Object.fromEntries(new FormData(form));
        const body = { email: values.email.trim(), password: values.password };
        if (register) Object.assign(body, { firstName: values.firstName.trim(), lastName: values.lastName.trim() });
        const result = await MesaAPI.request(register ? '/auth/register' : '/auth/login', { method: 'POST', body });
        validatedUser = true;
        MesaAPI.saveSession(result.data, remember?.checked);
        if (version === formVersion && $('#modal-content') === content && form.isConnected) $('#modal').close();
      } catch (error) {
        if (form.isConnected) feedback(status, error.message, true);
      } finally { submit.disabled = false; password.value = ''; if (confirm) confirm.value = ''; }
    });
    content.append(form, button(register ? 'Ya tengo cuenta' : 'Crear una cuenta', () => openAuth(register ? 'login' : 'register'), 'auth-link'));
    if (!register) content.append(element('p', 'muted', 'La recuperación de contraseña y el acceso con Google todavía no están disponibles.'));
  }
  async function openProfile() {
    const content = modal('Mi perfil', 'auth-modal');
    const area = element('div'); content.append(area);
    MesaUI.state(area, 'Cargando perfil…');
    try {
      const user = await MesaAPI.refreshUser();
      if (!user || !area.isConnected) return;
      area.replaceChildren();
      const form = element('form', 'modal-form');
      field(form, 'firstName', 'Nombre', 'text', user.firstName, { required: true, maxlength: '80' });
      field(form, 'lastName', 'Apellidos', 'text', user.lastName, { required: true, maxlength: '80' });
      field(form, 'avatarUrl', 'Enlace de tu foto de perfil', 'url', user.avatarUrl || '');
      field(form, 'phone', 'Teléfono (formato +51…)', 'tel', user.phone || '');
      area.append(element('p', 'muted', user.email));
      const save = element('button', 'button', 'Guardar perfil'); save.type = 'submit';
      const status = element('p', 'auth-feedback'); status.setAttribute('role', 'status');
      form.append(save, status);
      form.addEventListener('submit', async event => {
        event.preventDefault(); save.disabled = true;
        try {
          const body = Object.fromEntries(new FormData(form)); body.avatarUrl ||= null; body.phone ||= null;
          await MesaAPI.request('/users/me', { method: 'PATCH', authenticated: true, body });
          await MesaAPI.refreshUser(); feedback(status, 'Perfil actualizado.');
        } catch (error) { feedback(status, error.message, true); } finally { save.disabled = false; }
      });
      area.append(form);
      const myReviews = element('div', 'profile-reviews'); area.append(element('h3', '', 'Mis reseñas'), myReviews);
      try {
        const reviews = await MesaAPI.all('/users/me/reviews', {}, { authenticated: true });
        if (!reviews.length) MesaUI.state(myReviews, 'Todavía no has publicado reseñas.');
        reviews.forEach(review => myReviews.append(link(review.title, MesaUI.detailUrl({ _id: review.restaurantId }) + '#reviews', 'text-link')));
      } catch (error) { MesaUI.state(myReviews, error.message); }
    } catch (error) { MesaUI.state(area, error.message, openProfile); }
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-account]');
    if (trigger) openAuth(trigger.dataset.account);
  });
  window.addEventListener('mesa:session', renderHeader);
  window.MesaAuth = { avatar, open: openAuth, profile: openProfile, get ready() { return ready; } };
  // Se valida el token guardado antes de habilitar acciones privadas.
  const ready = (async () => {
    if (MesaAPI.session?.token) {
      try { await MesaAPI.refreshUser(); validatedUser = true; } catch (error) {
        if (error.status !== 401) console.warn('No se pudo validar la sesión:', error.message);
      }
    }
    renderHeader();
    return validatedUser ? MesaAPI.session?.user : null;
  })();
})();

