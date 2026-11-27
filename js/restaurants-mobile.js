// ==========================================
// Buscador y panel de filtros en móvil
// ==========================================

(() => {
  "use strict";
  // Filtros en móvil: el panel se abre con el botón "Filtrar" y el buscador vive arriba de la página.
  const panel = document.querySelector("#filters-panel");
  const form = document.querySelector("#filters-form");
  const openButton = document.querySelector("#open-filters");
  const closeButton = document.querySelector("#close-filters");
  const clearButton = document.querySelector("#clear-filters");
  const resetButton = document.querySelector("#reset-filters");
  const searchForm = document.querySelector("#mobile-search-form");
  const searchInput = document.querySelector("#mobile-query");
  const queryInput = document.querySelector("#filter-query");
  if (!panel || !form || !openButton || !searchForm || !queryInput) return;
  const mobile = matchMedia("(max-width: 560px)");

  // Abre o cierra el panel; el scroll de la página se bloquea mientras está abierto.
  // ==========================================
  // Abrir o cerrar los filtros móviles y gestionar el foco
  // ==========================================
  function cambiarEstadoDelPanelDeFiltros(open, restoreFocus = false) {
    const isOpen = Boolean(open && mobile.matches);
    panel.classList.toggle("is-open", isOpen);
    openButton.setAttribute("aria-expanded", String(isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (isOpen) closeButton.focus();
    else if (restoreFocus) openButton.focus();
  }
  // ==========================================
  // Abrir el panel de filtros desde su botón
  // ==========================================
  const abrirFiltrosMoviles = () => cambiarEstadoDelPanelDeFiltros(true);

  // ==========================================
  // Cerrar el panel y devolver el foco
  // ==========================================
  const cerrarFiltrosMoviles = () =>
    cambiarEstadoDelPanelDeFiltros(false, true);

  // ==========================================
  // Cerrar los filtros móviles con Escape
  // ==========================================
  const cerrarFiltrosConEscape = (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open"))
      cambiarEstadoDelPanelDeFiltros(false, true);
  };

  // ==========================================
  // Cerrar el panel cuando cambia el ancho
  // ==========================================
  const cerrarFiltrosAlCambiarAncho = () =>
    cambiarEstadoDelPanelDeFiltros(false);

  // ==========================================
  // Enviar la búsqueda móvil mediante el formulario de filtros
  // ==========================================
  const aplicarBusquedaMovil = (event) => {
    event.preventDefault();
    queryInput.value = searchInput.value;
    form.requestSubmit();
  };

  // ==========================================
  // Sincronizar el buscador móvil y cerrar el panel
  // ==========================================
  const cerrarFiltrosTrasAplicar = () => {
    if (mobile.matches) searchInput.value = queryInput.value;
    cambiarEstadoDelPanelDeFiltros(false, true);
  };

  // ==========================================
  // Restablecer los filtros desde el panel móvil
  // ==========================================
  const limpiarFiltrosMoviles = () => resetButton?.click();

  // ==========================================
  // Vaciar el buscador móvil al restablecer los filtros
  // ==========================================
  const vaciarBusquedaMovil = () => {
    searchInput.value = "";
  };

  // Eventos de la interfaz.
  openButton.addEventListener("click", abrirFiltrosMoviles);
  closeButton.addEventListener("click", cerrarFiltrosMoviles);
  document.addEventListener("keydown", cerrarFiltrosConEscape);
  // Si la pantalla crece a escritorio, el panel vuelve a mostrarse como barra lateral.
  mobile.addEventListener?.("change", cerrarFiltrosAlCambiarAncho);

  // El buscador de arriba copia su texto al campo de filtros y reutiliza la búsqueda existente.
  searchForm.addEventListener("submit", aplicarBusquedaMovil);
  // Al pulsar "Filtrar" dentro del panel, se aplica la búsqueda y el panel se cierra.
  form.addEventListener("submit", cerrarFiltrosTrasAplicar);
  // "Limpiar todo" reutiliza el botón que ya restablece los filtros y vacía el buscador.
  clearButton?.addEventListener("click", limpiarFiltrosMoviles);
  resetButton?.addEventListener("click", vaciarBusquedaMovil);
})();
