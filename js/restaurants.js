(() => {
  "use strict";
  const { $, element, label, card, state, paginate } = MesaUI;
  const grid = $("#restaurant-grid");
  if (!grid) return;
  const home = !document.body.dataset.page;
  const form = home ? $("#search-form") : $("#filters-form");
  const aliases = {
    Criolla: "CRIOLLA",
    Chifa: "CHIFA",
    Polleria: "POLLERIA",
    Pollería: "POLLERIA",
    Makis: "MAKIS",
    Cafeterias: "CAFETERIAS",
    Cafeterías: "CAFETERIAS",
    Tradicional: "PERUANA_TRADICIONAL",
    Fusión: "FUSION_ASIATICA",
    Mexicano: "MEXICANA",
    Mexicana: "MEXICANA",
    Italiana: "ITALIANA",
    Japonesa: "JAPONESA",
    "Peruana tradicional": "PERUANA_TRADICIONAL",
    Mariscos: "MARISCOS",
    Carnes: "CARNES",
    Desayunos: "DESAYUNOS",
  };
  const relatedTypes = {
    CRIOLLA: ["CRIOLLA", "PERUANA_TRADICIONAL"],
    PERUANA_TRADICIONAL: ["CRIOLLA", "PERUANA_TRADICIONAL"],
    FUSION_ASIATICA: ["FUSION_ASIATICA", "CHIFA", "MAKIS"],
    JAPONESA: ["JAPONESA", "MAKIS"],
  };
  document.querySelectorAll("select option").forEach((option) => {
    if (option.value === "Surco" || option.textContent === "Surco") {
      option.value = "Santiago de Surco";
      option.textContent = "Santiago de Surco";
    }
  });
  let category = "",
    records = [],
    page = 1,
    controller;
  const pagination = $("#pagination") || element("nav", "pagination");
  if (home) {
    pagination.setAttribute("aria-label", "Páginas de restaurantes");
    grid.after(pagination);
  }
  const errorBox = element("div");
  grid.before(errorBox);
  function render() {
    const size = home ? 9 : 6;
    const pages = Math.ceil(records.length / size);
    page = Math.max(1, Math.min(page, pages || 1));
    grid.replaceChildren(
      ...records.slice((page - 1) * size, page * size).map(card),
    );
    $("#empty-state").hidden = records.length > 0;
    $("#result-count").textContent =
      records.length +
      (records.length === 1
        ? " restaurante encontrado"
        : " restaurantes encontrados");
    paginate(pagination, page, pages, (value) => {
      page = value;
      render();
      $("#results-title").scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    window.AOS?.refreshHard();
  }
  async function load() {
    controller?.abort();
    controller = new AbortController();
    const current = controller;
    errorBox.replaceChildren();
    $("#empty-state").hidden = true;
    pagination.hidden = true;
    state(grid, "Buscando restaurantes…");
    grid.setAttribute("aria-busy", "true");
    const values = new FormData(form);
    const query = home
      ? $("#query").value.trim()
      : String(values.get("query") || "").trim();
    const district = home ? $("#district").value : values.get("district");
    const cuisines = home
      ? category
        ? [category]
        : []
      : values.getAll("cuisine").map((v) => aliases[v] || v);
    // Criolla incluye la clasificación anterior; las demás categorías mantienen su identidad.
    const selectedTypes = new Set(
      cuisines.flatMap((code) => relatedTypes[code] || [code]),
    );
    const params = {
      q: query,
      district,
      ...window.MesaPriceRange?.params(),
    };
    const normalize = (value) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const typedCuisine = Object.entries(aliases).find(
      ([name]) => normalize(name) === normalize(query),
    )?.[1];
    const homeType = home ? category || typedCuisine : null;
    const homeTypes = homeType ? relatedTypes[homeType] || [homeType] : [];
    if (home && typedCuisine) params.q = "";
    if (homeType && homeTypes.length === 1) params.cuisine = homeType;
    try {
      let items = await MesaAPI.all("/restaurants", params, {
        signal: current.signal,
      });
      // Las categorías del inicio siguen encontrando los tipos nuevos durante el despliegue del backend.
      if (home && homeTypes.length)
        items = items.filter((item) =>
          item.cuisineTypes.some((code) => homeTypes.includes(code)),
        );
      if (!home && cuisines.length)
        items = items.filter((item) =>
          item.cuisineTypes.some((c) => selectedTypes.has(c)),
        );
      const sort = $("#sort")?.value || "rating";
      items.sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name, "es")
          : sort === "price-asc"
            ? (a.displayBranch?.averagePricePerPersonCents ?? Infinity) -
              (b.displayBranch?.averagePricePerPersonCents ?? Infinity)
            : sort === "price-desc"
              ? (b.displayBranch?.averagePricePerPersonCents ?? -1) -
                (a.displayBranch?.averagePricePerPersonCents ?? -1)
              : (b.ratingSummary?.overall || 0) -
                (a.ratingSummary?.overall || 0),
      );
      if (current !== controller) return;
      records = items;
      page = 1;
      render();
    } catch (error) {
      if (current !== controller || error.name === "AbortError") return;
      grid.replaceChildren();
      $("#result-count").textContent = "";
      state(errorBox, error.message, load);
    } finally {
      if (current === controller) grid.removeAttribute("aria-busy");
    }
  }
  if (home) {
    const categories = [
      ["", "Todos"],
      ["PERUANA_TRADICIONAL", "Tradicional"],
      ["FUSION_ASIATICA", "Fusión"],
      ["MARISCOS", "Mariscos"],
      ["DESAYUNOS", "Desayunos"],
      ["CARNES", "Carnes"],
      ["INTERNACIONAL", "Internacional"],
      ["MEXICANA", "Mexicana"],
    ];
    categories.forEach(([value, text]) => {
      const b = MesaUI.button(
        text,
        () => {
          category = value;
          $("#categories")
            .querySelectorAll("button")
            .forEach((node) =>
              node.setAttribute("aria-pressed", String(node === b)),
            );
          load();
        },
        "category",
      );
      b.setAttribute("aria-pressed", String(!value));
      $("#categories").append(b);
    });
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    load();
  });
  $("#sort")?.addEventListener("change", load);
  $("#reset-filters").addEventListener("click", () => {
    form.reset();
    window.MesaPriceRange?.reset();
    category = "";
    if (home)
      $("#categories")
        .querySelectorAll("button")
        .forEach((node, i) =>
          node.setAttribute("aria-pressed", String(i === 0)),
        );
    load();
  });
  document
    .querySelectorAll('.price-range-track input[type="range"]')
    .forEach((slider) => slider.addEventListener("change", load));
  load();
})();
