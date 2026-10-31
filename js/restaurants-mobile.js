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
  function setOpen(open, restoreFocus = false) {
    const isOpen = Boolean(open && mobile.matches);
    panel.classList.toggle("is-open", isOpen);
    openButton.setAttribute("aria-expanded", String(isOpen));
    document.body.style.overflow = isOpen ? "hidden" : "";
    if (isOpen) closeButton.focus();
    else if (restoreFocus) openButton.focus();
  }
  openButton.addEventListener("click", () => setOpen(true));
  closeButton.addEventListener("click", () => setOpen(false, true));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open"))
      setOpen(false, true);
  });
  // Si la pantalla crece a escritorio, el panel vuelve a mostrarse como barra lateral.
  mobile.addEventListener?.("change", () => setOpen(false));

  // El buscador de arriba copia su texto al campo de filtros y reutiliza la búsqueda existente.
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    queryInput.value = searchInput.value;
    form.requestSubmit();
  });
  // Al pulsar "Filtrar" dentro del panel, se aplica la búsqueda y el panel se cierra.
  form.addEventListener("submit", () => {
    if (mobile.matches) searchInput.value = queryInput.value;
    setOpen(false, true);
  });
  // "Limpiar todo" reutiliza el botón que ya restablece los filtros y vacía el buscador.
  clearButton?.addEventListener("click", () => resetButton?.click());
  resetButton?.addEventListener("click", () => {
    searchInput.value = "";
  });
})();
