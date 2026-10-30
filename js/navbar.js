(() => {
  "use strict";
  const header = document.querySelector('.header');
  const toggle = header?.querySelector('.menu-toggle');
  const navigation = header?.querySelector('.navigation');
  if (!toggle || !navigation) return;
  const mobile = matchMedia('(max-width: 1024px)');

  // En pantallas pequeñas las acciones de acceso pasan al panel de navegación.
  const account = document.createElement('div');
  account.className = 'nav-mobile-account';
  for (const [mode, text] of [['login', 'Iniciar sesión'], ['register', 'Registrarse']]) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = text; button.dataset.account = mode;
    button.className = mode === 'register' ? 'button' : 'nav-login';
    account.append(button);
  }
  navigation.append(account);
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', navigation.id);

  // El estado accesible y el icono se mantienen sincronizados al abrir o cerrar el panel.
  function setOpen(open, restoreFocus = false) {
    const expanded = Boolean(open && mobile.matches);
    header.classList.toggle('menu-open', expanded);
    navigation.hidden = mobile.matches && !expanded;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Cerrar menú' : 'Abrir menú');
    toggle.replaceChildren(MesaIcons.icon(expanded ? 'x' : 'menu'));
    if (restoreFocus) toggle.focus();
  }
  function synchronize() {
    account.hidden = Boolean(MesaAPI.session?.user);
    setOpen(false);
  }
  toggle.addEventListener('click', () => {
    const open = !header.classList.contains('menu-open');
    // Evita superponer el panel de navegación con el menú del avatar.
    const profile = document.getElementById('account-trigger');
    if (open && profile?.getAttribute('aria-expanded') === 'true') profile.click();
    setOpen(open);
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a,button')) setOpen(false);
  });
  document.addEventListener('click', event => {
    // La ruta original evita interpretar como clic exterior el icono que acabamos de reemplazar.
    const path = event.composedPath();
    if (!path.includes(header) || path.some(node => node instanceof Element && node.classList.contains('header-account'))) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && header.classList.contains('menu-open')) { event.preventDefault(); setOpen(false, true); }
  });
  // El cambio de ancho y de sesión elimina estados de navegación que ya no corresponden.
  mobile.addEventListener?.('change', synchronize);
  window.addEventListener('mesa:session', synchronize);
  synchronize();
})();
