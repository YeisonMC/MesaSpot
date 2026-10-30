(() => {
  "use strict";
  const {
    $,
    element,
    label,
    money,
    image,
    button,
    state,
    external,
  } = MesaUI;
  let restaurant,
    branches = [],
    selectedBranch,
    photoRecords = [],
    menuRecords = [],
    initialized = false;
  const days = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];
  const address = (branch) =>
    branch?.address
      ? [
          branch.address.street,
          branch.address.district,
          branch.address.province,
        ]
          .filter(Boolean)
          .join(", ")
      : "Dirección pendiente";
  const hours = (periods) =>
    periods
      .map(
        (p) =>
          p.opens +
          " – " +
          p.closes +
          (p.closesNextDay ? " (día siguiente)" : ""),
      )
      .join(", ");
  const base = () => "/restaurants/" + restaurant._id;
  // Cambia las pestañas y conserva la navegación accesible mediante teclado.
  function selectTab(name, focus = false) {
    document.querySelectorAll('[role="tab"]').forEach((tab) => {
      const selected = tab.id === "tab-" + name;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden =
        !selected;
      if (selected && focus) tab.focus();
    });
    history.replaceState(null, "", "#" + name);
    window.AOS?.refreshHard();
  }
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab.id.replace("tab-", "")));
    tab.addEventListener("keydown", (event) => {
      const next =
        event.key === "ArrowRight"
          ? tabs[(index + 1) % tabs.length]
          : event.key === "ArrowLeft"
            ? tabs[(index + tabs.length - 1) % tabs.length]
            : event.key === "Home"
              ? tabs[0]
              : event.key === "End"
                ? tabs.at(-1)
                : null;
      if (next) {
        event.preventDefault();
        selectTab(next.id.replace("tab-", ""), true);
      }
    });
  });
  // Actualiza dirección, servicios, horarios y contacto al elegir una sede.
  function practicalInfo() {
    const branch = selectedBranch;
    $("#detail-address").textContent = address(branch);
    $("#detail-price").textContent =
      money(branch?.averagePricePerPersonCents) + " aprox. por persona";
    const services = $("#services-list");
    services.replaceChildren();
    (branch?.services || []).forEach(code => {
      const symbols = { TERRACE: "umbrella", FREE_WIFI: "wifi", WHEELCHAIR_ACCESS: "accessibility", VEGETARIAN_OPTIONS: "leaf", CARD_PAYMENT: "credit-card", DELIVERY: "bike", TAKEAWAY: "shopping-bag" };
      const item = element("li", "", label(code)); item.prepend(MesaIcons.icon(symbols[code] || "check")); services.append(item);
    });
    if (!services.children.length)
      services.append(element("li", "", "Servicios por confirmar"));
    const dl = $("#hours-list");
    dl.replaceChildren();
    // Agrupa días consecutivos con el mismo horario, sin perder los turnos partidos.
    const weeklyGroups = [];
    (branch?.openingHours || []).slice().sort((a,b) => a.dayOfWeek - b.dayOfWeek).forEach(day => {
      const text = day.closed ? "Cerrado" : hours(day.periods);
      const previous = weeklyGroups.at(-1);
      if (previous && previous.last + 1 === day.dayOfWeek && previous.text === text) previous.last = day.dayOfWeek;
      else weeklyGroups.push({ first: day.dayOfWeek, last: day.dayOfWeek, text });
    });
    weeklyGroups.forEach(group => {
      const title = group.first === group.last ? days[group.first-1] : days[group.first-1] + " a " + days[group.last-1];
      const row = element("div"); row.append(element("dt", "", title), element("dd", "", group.text)); dl.append(row);
    });
    (branch?.specialHours || []).forEach((day) => {
      const row = element("div");
      row.append(
        element("dt", "", day.date),
        element("dd", "", day.closed ? "Cerrado" : hours(day.periods)),
      );
      dl.append(row);
    });
    if (!dl.children.length)
      dl.append(element("p", "muted", "Horarios por confirmar"));
    const contact = $("#contact-list");
    contact.replaceChildren();
    const phone = branch?.contact?.phone;
    const email = branch?.contact?.email || restaurant.contact?.email;
    if (phone) {
      const li = element("li");
      li.append(external(phone, "tel:" + phone, ["tel:"]));
      contact.append(li);
    }
    if (email) {
      const li = element("li");
      li.append(external(email, "mailto:" + email, ["mailto:"]));
      contact.append(li);
    }
    if (restaurant.contact?.website) {
      const li = element("li");
      li.append(external("Página web", restaurant.contact.website));
      contact.append(li);
    }
    if (branch?.contact?.whatsapp) {
      const li = element("li");
      li.append(
        external(
          "WhatsApp",
          "https://wa.me/" + branch.contact.whatsapp.replace(/\D/g, ""),
        ),
      );
      contact.append(li);
    }
    if (!contact.children.length)
      contact.append(element("li", "", "Contacto por confirmar"));
    const summary = $("#summary-list");
    summary.replaceChildren();
    const values = [
      ["Tipo de cocina", restaurant.cuisineTypes.map(label).join(", ")],
      ["Precio por persona", money(branch?.averagePricePerPersonCents)],
      [
        "Capacidad",
        branch?.capacity ? branch.capacity + " personas" : "Por confirmar",
      ],
      ["Estacionamiento", branch?.parking?.description || "Por confirmar"],
    ];
    values.forEach(([title, value]) => {
      const row = element("div");
      row.append(element("dt", "", title), element("dd", "", value));
      summary.append(row);
    });
    renderMap();
  }
  // Cada local mantiene sus propios horarios, precios y datos de contacto.
  function renderLocations() {
    const list = $("#locations-list");
    list.replaceChildren();
    branches.forEach((branch) => {
      const b = button(
        "",
        () => {
          selectedBranch = branch;
          renderLocations();
          practicalInfo();
          renderGallery();
          renderMenu();
        },
        "location-card",
      );
      b.setAttribute(
        "aria-pressed",
        String(branch._id === selectedBranch?._id),
      );
      b.classList.toggle("selected", branch._id === selectedBranch?._id);
      const text = element("span");
      text.append(
        element(
          "strong",
          "",
          branch.name +
            (branch._id === restaurant.mainBranchId ? " · Principal" : ""),
        ),
        element("span", "", address(branch)),
      );
      b.prepend(MesaIcons.icon("map-pin"));
      b.append(text);
      list.append(b);
    });
    if (!branches.length)
      state(list, "Este restaurante todavía no tiene locales publicados.");
  }
  // La pestaña de ubicación comparte el local activo con toda la ficha.
  function renderMap() {
    MesaRestaurantTabs.renderLocation({ panel: $("#panel-location"), restaurant, branch: selectedBranch, branches, onBranchChange: id => {
      selectedBranch = branches.find(branch => branch._id === id) || selectedBranch;
      renderLocations(); practicalInfo(); renderGallery(); renderMenu();
    } });
  }
  // La galería y el visor comparten las fotos y el local seleccionados.
  function renderGallery() {
    MesaGallery.render({ panel: $("#panel-photos"), restaurant, branch: selectedBranch, photos: photoRecords, menu: menuRecords });
  }
  let promotions = [];
  // Compone promociones, categorías y sugerencias a partir de los recursos de la API.
  function renderMenu() {
    MesaRestaurantTabs.renderDishes({ panel: $("#panel-menu"), restaurant, branch: selectedBranch, photos: photoRecords, menu: menuRecords, promotions });
  }
  // El módulo de reseñas administra listado, sesión, modal y confirmación de publicación.
  async function renderReviews() {
    await MesaReviews.render({ panel: $("#panel-reviews"), restaurant, branches, selectedBranch, onPublished: refreshRatings });
  }
  async function refreshRatings() {
    const { data } = await MesaAPI.request(base());
    restaurant.ratingSummary = data.ratingSummary;
    $("#detail-rating").textContent = data.ratingSummary.reviewCount
      ? data.ratingSummary.overall.toFixed(1) + " (" + data.ratingSummary.reviewCount + " reseñas)"
      : "Sin reseñas todavía";
  }
  // Recupera el restaurante y sus recursos desde la API antes de mostrar la ficha.
  async function load() {
    const status = $("#detail-load-status");
    state(status, "Cargando restaurante…");
    try {
      const id = new URLSearchParams(location.search).get("id");
      if (!id) throw new Error("Selecciona un restaurante desde el catálogo para consultar su ficha.");
      if (id && !/^[a-f0-9]{24}$/i.test(id))
        throw new Error("El identificador del restaurante no es válido.");
      const { data } = await MesaAPI.request(
        "/restaurants/" + encodeURIComponent(id),
      );
      restaurant = data;
      document.title = restaurant.name + " · MesaSpot";
      $("#restaurant-title").textContent = restaurant.name;
      document.querySelector('meta[name="description"]').content =
        restaurant.shortDescription;
      $("#detail-description").textContent = restaurant.shortDescription;
      $("#detail-cuisine").textContent = restaurant.cuisineTypes
        .map(label)
        .join(" · ");
      $("#hero-cuisine").textContent = restaurant.cuisineTypes
        .map(label)
        .join(", ");
      $("#hero-founded").textContent = restaurant.foundedYear
        ? "Desde " + restaurant.foundedYear
        : "Conoce el restaurante";
      const cover = MesaUI.safeUrl(restaurant.coverPhoto?.url);
      if (cover)
        $(".detail-hero").style.backgroundImage =
          "linear-gradient(90deg, #1b120ce0, #1b120c55), url(" +
          JSON.stringify(cover) +
          ")";
      const about = $("#about-copy");
      about.replaceChildren(
        ...(restaurant.description.length
          ? restaurant.description
          : [restaurant.shortDescription]
        ).map((text) => element("p", "", text)),
      );
      const aboutImage = $(".about-panel img");
      aboutImage.replaceWith(
        image(restaurant.thumbnailPhoto?.url, restaurant.name),
      );
      await refreshRatings();
      const results = await Promise.allSettled([
        MesaAPI.all(base() + "/branches"),
        MesaAPI.all(base() + "/photos"),
        MesaAPI.all(base() + "/menu-items"),
        MesaAPI.all(base() + "/promotions"),
      ]);
      if (results[0].status === "rejected") throw results[0].reason;
      branches = results[0].value.sort((a, b) => Number(b._id === restaurant.mainBranchId) - Number(a._id === restaurant.mainBranchId) || a.name.localeCompare(b.name, 'es'));
      photoRecords = results[1].value || [];
      menuRecords = results[2].value || [];
      promotions = results[3].value || [];
      selectedBranch =
        branches.find((b) => b._id === restaurant.mainBranchId) || branches[0];
      renderLocations();
      practicalInfo();
      renderGallery();
      renderMenu();
      if (results[1].status === "rejected")
        state($("#panel-photos"), results[1].reason.message, load);
      if (results[2].status === "rejected" || results[3].status === "rejected")
        state(
          $("#panel-menu"),
          "No pudimos cargar la carta o sus promociones.",
          load,
        );
      status.replaceChildren();
      initialized = true;
      await MesaAuth.ready;
      await renderReviews();
    } catch (error) {
      $("#restaurant-title").textContent = "Restaurante no disponible";
      state(status, error.message, load);
    }
  }
  $("#all-locations")?.addEventListener("click", () => {
    $("#locations-list").classList.toggle("expanded");
  });
  $("#contact-trigger")?.addEventListener("click", () => {
    selectTab("information");
    $("#contact-list").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  window.addEventListener("mesa:session", () => {
    if (initialized) renderReviews();
  });
  selectTab(
    ["information", "photos", "menu", "reviews", "location"].includes(
      location.hash.slice(1),
    )
      ? location.hash.slice(1)
      : "information",
  );
  load();
})();


