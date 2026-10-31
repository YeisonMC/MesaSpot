(() => {
  "use strict";
  // Promociones: filtra y ordena las tarjetas que ya están en el HTML (datos de ejemplo, sin API).
  const form = document.querySelector("#promo-filters");
  const list = document.querySelector("#promo-cards");
  if (!form || !list) return;
  const cards = [...list.querySelectorAll(".promo-card")];
  const empty = document.querySelector("#promo-empty");
  const count = document.querySelector("#promo-count");
  // Sin tildes ni mayúsculas para que "pollo" encuentre "Pollo" y "Dulce Tradicion" encuentre "Tradición".
  const normalize = (text) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const priceRanges = {
    "": [0, Infinity],
    low: [0, 40],
    mid: [40.01, 70],
    high: [70.01, Infinity],
  };

  function apply() {
    const query = normalize(form.query.value.trim());
    const [min, max] = priceRanges[form.price.value];
    let visible = 0;
    cards.forEach((card) => {
      const price = Number(card.dataset.precio);
      const show =
        (!query || normalize(card.textContent).includes(query)) &&
        (!form.district.value || card.dataset.distrito === form.district.value) &&
        (!form.type.value || card.dataset.tipo === form.type.value) &&
        price >= min &&
        price <= max;
      card.hidden = !show;
      if (show) visible += 1;
    });
    // El orden se aplica reubicando las tarjetas en el contenedor.
    const sort = form.sort.value;
    [...cards]
      .sort((a, b) =>
        sort === "price-asc"
          ? a.dataset.precio - b.dataset.precio
          : sort === "price-desc"
            ? b.dataset.precio - a.dataset.precio
            : a.dataset.orden - b.dataset.orden,
      )
      .forEach((card) => list.append(card));
    empty.hidden = visible > 0;
    count.textContent =
      visible + (visible === 1 ? " promoción encontrada" : " promociones encontradas");
  }
  form.addEventListener("input", apply);
  form.addEventListener("change", apply);
  form.addEventListener("submit", (event) => event.preventDefault());
  document.querySelector("#promo-reset")?.addEventListener("click", () => {
    form.reset();
    apply();
  });
  // Si una foto no existe todavía: la tarjeta muestra la imagen de reemplazo y el hero oculta la imagen.
  function fallback(img) {
    if (img.dataset.fallback) return;
    img.dataset.fallback = "1";
    if (img.closest(".promo-hero__art")) img.hidden = true;
    else img.src = "../../assets/restaurant-placeholder.svg";
  }
  // Se revisan las fotos que ya fallaron antes de cargar este script y las que fallen después.
  document
    .querySelectorAll(".promo-card__image img, .promo-hero__art img")
    .forEach((img) => {
      if (img.complete && img.naturalWidth === 0) fallback(img);
    });
  document.addEventListener(
    "error",
    (event) => {
      if (event.target instanceof HTMLImageElement) fallback(event.target);
    },
    true,
  );
  apply();
})();