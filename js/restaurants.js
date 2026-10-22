(() => {
  "use strict";
  const data = [...window.MESA_CATALOG, ...window.MESA_DATA.restaurants];
  const form = document.querySelector("#filters-form");
  const grid = document.querySelector("#restaurant-grid");
  const pagination = document.querySelector("#pagination");
  const sort = document.querySelector("#sort");
  const pageSize = 6;
  let page = 1;
  let filters = { query: "", district: "", cuisines: [], price: "" };
  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const amount = (item) =>
    item.amount ?? Number(item.price.replace(/[^\d.]/g, ""));
  const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;

  function selectResults() {
    const results = data.filter(
      (item) =>
        normalize(item.name).includes(normalize(filters.query)) &&
        (!filters.district || filters.district === item.district) &&
        (!filters.cuisines.length ||
          filters.cuisines.includes(item.category)) &&
        (!filters.price || item.priceLevel === Number(filters.price)),
    );
    return results.sort((a, b) =>
      sort.value === "price-asc"
        ? amount(a) - amount(b)
        : sort.value === "price-desc"
          ? amount(b) - amount(a)
          : sort.value === "name"
            ? a.name.localeCompare(b.name, "es")
            : Number(b.rating) - Number(a.rating),
    );
  }
  function render() {
    const results = selectResults();
    const pages = Math.ceil(results.length / pageSize);
    page = Math.max(1, Math.min(page, pages || 1));
    document.querySelector("#result-count").textContent =
      `(${results.length} ${results.length === 1 ? "restaurante encontrado" : "restaurantes encontrados"})`;
    grid.innerHTML = results
      .slice((page - 1) * pageSize, page * pageSize)
      .map(
        (item, i) =>
          `<article class="restaurant-card" data-aos="fade-up" data-aos-delay="${(i % 3) * 60}">${item.id === 4 ? '<a class="card-detail-link" href="el-asador-de-surco.html" aria-label="Ver detalles de El Asador de Surco">' : ""}<div class="card-image"><img src="https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=700&q=85" width="700" height="440" alt="${item.alt}" loading="lazy" decoding="async"></div>${item.id === 4 ? "</a>" : ""}<div class="card-body"><div class="card-labels"><span class="tag">${item.category === "Tradicional" ? "Peruana tradicional" : item.category === "Fusión" ? "Fusión asiática" : item.category}</span><span class="rating" aria-label="Valoración ${item.rating} de 5">${icon("star")}${item.rating}</span></div><h3>${item.id === 4 ? '<a href="el-asador-de-surco.html">' : ""}${item.name}${item.id === 4 ? "</a>" : ""}</h3><p class="card-meta">${icon("pin")}${item.district}<span aria-hidden="true">·</span><span class="price">${item.price}</span></p>${item.id === 4 ? `<a class="reserve" href="el-asador-de-surco.html" aria-label="Ver detalles y reservar mesa en ${item.name}">Reservar Mesa</a>` : `<button class="reserve" data-reserve="${item.id}" aria-label="Reservar mesa en ${item.name}">Conocer más</button>`}</div></article>`,
      )
      .join("");
    document.querySelector("#empty-state").hidden = results.length > 0;
    pagination.hidden = pages <= 1;
    pagination.innerHTML = `<button type="button" data-page="${page - 1}" aria-label="Página anterior" ${page === 1 ? "disabled" : ""}>‹</button>${Array.from({ length: pages }, (_, i) => `<button type="button" data-page="${i + 1}" aria-label="Página ${i + 1}" ${page === i + 1 ? 'aria-current="page"' : ""}>${i + 1}</button>`).join("")}<button type="button" data-page="${page + 1}" aria-label="Página siguiente" ${page === pages ? "disabled" : ""}>›</button>`;
    window.AOS?.refreshHard();
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = new FormData(form);
    filters = {
      query: values.get("query").trim(),
      district: values.get("district"),
      cuisines: values.getAll("cuisine"),
      price: values.get("price") || "",
    };
    page = 1;
    render();
  });
  sort.addEventListener("change", () => {
    page = 1;
    render();
  });
  document.querySelector("#reset-filters").addEventListener("click", () => {
    form.reset();
    filters = { query: "", district: "", cuisines: [], price: "" };
    page = 1;
    render();
  });
  // Radio-style price buttons can be deselected to search all price ranges.
  form.querySelectorAll("[data-price]").forEach((button) =>
    button.addEventListener("click", () => {
      const selected = form.elements.price.value === button.dataset.price;
      form.elements.price.value = selected ? "" : button.dataset.price;
      form
        .querySelectorAll("[data-price]")
        .forEach((item) =>
          item.setAttribute(
            "aria-pressed",
            String(item.dataset.price === form.elements.price.value),
          ),
        );
    }),
  );
  form.addEventListener("reset", () =>
    form
      .querySelectorAll("[data-price]")
      .forEach((button) => button.setAttribute("aria-pressed", "false")),
  );
  pagination.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button || button.disabled) return;
    page = Number(button.dataset.page);
    render();
    const heading = document.querySelector("#results-title");
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  });
  render();
})();
