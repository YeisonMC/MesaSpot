// ==========================================
// Menú de navegación y accesos en móvil
// ==========================================

(() => {
  "use strict";
  const header = document.querySelector(".header");
  const toggle = header?.querySelector(".menu-toggle");
  const navigation = header?.querySelector(".navigation");
  if (!toggle || !navigation) return;
  const mobile = matchMedia("(max-width: 1024px)");

  // En pantallas pequeñas las acciones de acceso pasan al panel de navegación.
  const account = document.createElement("div");
  account.className = "nav-mobile-account";
  for (const [mode, text] of [
    ["login", "Iniciar sesión"],
    ["register", "Registrarse"],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.dataset.account = mode;
    button.className = mode === "register" ? "button" : "nav-login";
    account.append(button);
  }
  navigation.append(account);
  toggle.type = "button";
  toggle.setAttribute("aria-controls", navigation.id);

  // El estado accesible y el icono se mantienen sincronizados al abrir o cerrar el panel.
  // ==========================================
  // Abrir o cerrar el menú y actualizar el foco
  // ==========================================
  function cambiarEstadoDelMenu(open, restoreFocus = false) {
    const expanded = Boolean(open && mobile.matches);
    header.classList.toggle("menu-open", expanded);
    navigation.hidden = mobile.matches && !expanded;
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", expanded ? "Cerrar menú" : "Abrir menú");
    toggle.replaceChildren(MesaIcons.icon(expanded ? "x" : "menu"));
    if (restoreFocus) toggle.focus();
  }
  // ==========================================
  // Sincronizar la navegación con la sesión y el ancho de pantalla
  // ==========================================
  function sincronizarNavegacion() {
    account.hidden = Boolean(MesaAPI.session?.user);
    cambiarEstadoDelMenu(false);
  }
  // ==========================================
  // Alternar el menú móvil desde su botón
  // ==========================================
  const alternarMenuMovil = () => {
    const open = !header.classList.contains("menu-open");
    // Evita superponer el panel de navegación con el menú del avatar.
    const profile = document.getElementById("account-trigger");
    if (open && profile?.getAttribute("aria-expanded") === "true")
      profile.click();
    cambiarEstadoDelMenu(open);
  };

  // ==========================================
  // Cerrar el menú al elegir una opción
  // ==========================================
  const cerrarTrasElegirOpcion = (event) => {
    if (event.target.closest("a,button")) cambiarEstadoDelMenu(false);
  };

  // ==========================================
  // Cerrar el menú al pulsar fuera de la cabecera
  // ==========================================
  const cerrarMenuAlPulsarFuera = (event) => {
    // La ruta original evita interpretar como clic exterior el icono que acabamos de reemplazar.
    const path = event.composedPath();
    if (
      !path.includes(header) ||
      path.some(
        (node) =>
          node instanceof Element && node.classList.contains("header-account"),
      )
    )
      cambiarEstadoDelMenu(false);
  };

  // ==========================================
  // Cerrar el menú con Escape y devolver el foco
  // ==========================================
  const cerrarMenuConEscape = (event) => {
    if (event.key === "Escape" && header.classList.contains("menu-open")) {
      event.preventDefault();
      cambiarEstadoDelMenu(false, true);
    }
  };

  // Eventos de la interfaz.
  toggle.addEventListener("click", alternarMenuMovil);
  navigation.addEventListener("click", cerrarTrasElegirOpcion);
  document.addEventListener("click", cerrarMenuAlPulsarFuera);
  document.addEventListener("keydown", cerrarMenuConEscape);
  // El cambio de ancho y de sesión elimina estados de navegación que ya no corresponden.
  mobile.addEventListener?.("change", sincronizarNavegacion);
  window.addEventListener("mesa:session", sincronizarNavegacion);
  sincronizarNavegacion();
})();
