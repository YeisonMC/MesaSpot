(() => {
  "use strict";
  const { categories, information } = window.MESA_DATA;
  const isCatalog = document.body.dataset.page === "restaurants";
  const isHome = !document.body.dataset.page;
  const restaurants = isCatalog
    ? [...window.MESA_DATA.restaurants, ...window.MESA_CATALOG]
    : window.MESA_DATA.restaurants;
  const $ = (selector) => document.querySelector(selector);
  const grid = $("#restaurant-grid");
  const modal = $("#modal");
  const content = $("#modal-content");
  const state = {
    category: "Todos",
    query: "",
    district: "",
    date: localDate(),
    guests: "2",
  };

  function localDate() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
  // Only local, authored data is interpolated. User input is always assigned as text.
  function render() {
    const results = restaurants.filter(
      (item) =>
        (state.category === "Todos" || item.category === state.category) &&
        (!state.district || item.district === state.district) &&
        normalize(`${item.name} ${item.category}`).includes(
          normalize(state.query),
        ),
    );
    grid.innerHTML = results
      .map(
        (
          item,
          index,
        ) => `<article class="restaurant-card" data-aos="fade-up" data-aos-delay="${(index % 3) * 70}">
      ${item.id === 4 ? '<a class="card-detail-link" href="pages/el-asador-de-surco.html" aria-label="Ver detalles de El Asador de Surco">' : ""}<div class="card-image"><img src="https://images.unsplash.com/${item.image}?auto=format&fit=crop&w=850&q=85" alt="${item.alt}" width="850" height="530" loading="lazy" decoding="async"></div>${item.id === 4 ? "</a>" : ""}
      <div class="card-body"><div class="card-labels"><span class="tag">${item.category}</span><span class="rating" aria-label="Valoración ${item.rating} de 5">${icon("star")}${item.rating}</span></div>
      <h3>${item.id === 4 ? '<a href="pages/el-asador-de-surco.html">' : ""}${item.name}${item.id === 4 ? "</a>" : ""}</h3><p class="card-meta">${icon("pin")}${item.district}<span aria-hidden="true">·</span><span class="price" aria-label="Nivel de precio: ${item.priceLevel} de 4">${item.price}</span></p>
      <button class="reserve" data-reserve="${item.id}" aria-label="Reservar mesa en ${item.name}">Reservar Mesa</button></div></article>`,
      )
      .join("");
    $("#empty-state").hidden = results.length > 0;
    $("#result-count").textContent =
      `${results.length} restaurantes encontrados`;
    document
      .querySelectorAll(".category")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.textContent === state.category),
        ),
      );
    if (window.AOS) window.AOS.refreshHard();
  }

  if (isHome) {
    $("#categories").innerHTML = categories
      .map(
        (category) =>
          `<button class="category" type="button" aria-pressed="${category === state.category}">${category}</button>`,
      )
      .join("");
    $("#categories").addEventListener("click", (event) => {
      const button = event.target.closest(".category");
      if (!button) return;
      state.category = button.textContent;
      render();
    });
    $("#search-form").addEventListener("submit", (event) => {
      event.preventDefault();
      state.query = $("#query").value.trim();
      state.district = $("#district").value;
      render();
      $("#restaurantes").scrollIntoView({ behavior: "smooth" });
    });
    function reset() {
      Object.assign(state, { category: "Todos", query: "", district: "" });
      $("#query").value = "";
      $("#district").value = "";
      render();
    }
    $("#show-all").addEventListener("click", reset);
    $("#reset-filters").addEventListener("click", reset);
  }
  $(".menu-toggle").addEventListener("click", () => {
    const open = $(".header").classList.toggle("menu-open");
    $(".menu-toggle").setAttribute("aria-expanded", String(open));
    $(".menu-toggle").setAttribute(
      "aria-label",
      open ? "Cerrar menú" : "Abrir menú",
    );
  });
  $(".navigation").addEventListener("click", (event) => {
    if (!event.target.closest("a, button")) return;
    $(".header").classList.remove("menu-open");
    $(".menu-toggle").setAttribute("aria-expanded", "false");
    $(".menu-toggle").setAttribute("aria-label", "Abrir menú");
  });

  function openModal(markup) {
    modal.classList.remove("auth-modal");
    content.innerHTML = markup;
    modal.showModal();
    document.body.style.overflow = "hidden";
  }
  $("#close-modal").addEventListener("click", () => modal.close());
  modal.addEventListener("close", () => {
    document.body.style.overflow = "";
  });
  modal.addEventListener("click", (event) => {
    const rect = modal.getBoundingClientRect();
    if (
      event.target === modal &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    )
      modal.close();
  });
  function dateFields() {
    return `<label>Fecha<input type="date" name="date" min="${localDate()}" value="${state.date}" required></label><label>Personas<select name="guests">${Array.from({ length: 8 }, (_, i) => `<option value="${i + 1}" ${state.guests === String(i + 1) ? "selected" : ""}>${i + 1} ${i === 0 ? "persona" : "personas"}</option>`).join("")}</select></label>`;
  }
  function saveDate(form) {
    state.date = form.elements.date.value;
    state.guests = form.elements.guests.value;
    const dateLabel =
      state.date === localDate()
        ? "Hoy"
        : new Intl.DateTimeFormat("es-ES", {
            day: "numeric",
            month: "short",
          }).format(new Date(`${state.date}T12:00:00`));
    if ($("#date-summary"))
      $("#date-summary").textContent = `${dateLabel}, ${state.guests} pers.`;
  }
  $("#date-trigger")?.addEventListener("click", () => {
    openModal(
      `<h2 class="modal-title" id="modal-title">Tu próxima mesa</h2><p class="modal-description">Elige cuándo y con quién vas a disfrutar.</p><form class="modal-form" id="date-form">${dateFields()}<button class="button">Guardar selección</button></form>`,
    );
    $("#date-form").addEventListener("submit", (event) => {
      event.preventDefault();
      saveDate(event.currentTarget);
      modal.close();
    });
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-reserve]");
    if (!button) return;
    const restaurant = restaurants.find(
      (item) => item.id === Number(button.dataset.reserve),
    );
    if (!restaurant) return;
    openModal(
      `<h2 class="modal-title" id="modal-title">${restaurant.name}</h2><p class="modal-description">${restaurant.category} · ${restaurant.district} · ${restaurant.price} aprox. por persona</p><form class="modal-form" id="reservation-form">${dateFields()}<label>Hora<select name="time"><option>13:00</option><option>14:00</option><option>15:00</option><option>20:00</option><option>21:00</option><option>22:00</option></select></label><label>Tu nombre<input name="name" autocomplete="given-name" required maxlength="70" placeholder="¿A nombre de quién?"></label><button class="button">Simular reserva</button></form><p class="demo-note">Esta es una demostración. No se realiza una reserva real ni se envían tus datos.</p>`,
    );
    $("#reservation-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      saveDate(form);
      const name = form.elements.name.value.trim();
      if (!name) {
        form.elements.name.setCustomValidity("Introduce tu nombre.");
        form.elements.name.reportValidity();
        form.elements.name.addEventListener(
          "input",
          () => form.elements.name.setCustomValidity(""),
          { once: true },
        );
        return;
      }
      const time = form.elements.time.value;
      content.innerHTML = `<div class="success-icon" aria-hidden="true">✓</div><h2 class="modal-title" id="modal-title">¡Todo listo para imaginarlo!</h2><p class="modal-description" id="confirmation"></p><p class="demo-note">Simulación completada. No se ha contactado con el restaurante.</p><button class="button" id="done" style="margin-top:24px">Seguir explorando</button>`;
      $("#confirmation").textContent =
        `${name}, tu mesa de demostración en ${restaurant.name} es para ${state.guests} personas el ${new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date(`${state.date}T12:00:00`))} a las ${time}.`;
      $("#done").addEventListener("click", () => modal.close());
      $("#done").focus();
    });
  });
  document.querySelectorAll("[data-info]").forEach((button) =>
    button.addEventListener("click", () => {
      const [title, description] = information[button.dataset.info];
      openModal(
        `<h2 class="modal-title" id="modal-title">${title}</h2><p class="modal-description">${description}</p>`,
      );
    }),
  );
  if (isHome) render();
  if (
    window.AOS &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    window.AOS.init({
      duration: 650,
      once: true,
      offset: 45,
      easing: "ease-out-cubic",
    });
    document.body.classList.add("aos-ready");
  }
})();
