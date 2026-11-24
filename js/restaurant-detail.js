// ==========================================
// Ficha del restaurante, locales y pestañas
// ==========================================

(() => {
  "use strict";
  const {
    $: seleccionar,
    element: crearElemento,
    label: traducirEtiqueta,
    money: formatearImporte,
    image: crearImagen,
    button: crearBoton,
    state: mostrarEstado,
    external: crearEnlaceExterno,
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
  // ==========================================
  // Formatear la dirección del local
  // ==========================================
  const formatearDireccion = (branch) =>
    branch?.address
      ? [
          branch.address.street,
          branch.address.district,
          branch.address.province,
        ]
          .filter(Boolean)
          .join(", ")
      : "Dirección pendiente";
  // ==========================================
  // Formatear los tramos del horario de atención
  // ==========================================
  const formatearHorarios = (periods) =>
    periods
      .map(
        (p) =>
          p.opens +
          " – " +
          p.closes +
          (p.closesNextDay ? " (día siguiente)" : ""),
      )
      .join(", ");
  // ==========================================
  // Construir la ruta de la ficha en la API
  // ==========================================
  const rutaDelRestaurante = () => "/restaurants/" + restaurant._id;
  // Cambia las pestañas y conserva la navegación accesible mediante teclado.
  // ==========================================
  // Activar la pestaña y actualizar su panel
  // ==========================================
  function seleccionarPestana(name, focus = false) {
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
    tab.addEventListener("click", () =>
      seleccionarPestana(tab.id.replace("tab-", "")),
    );
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
        seleccionarPestana(next.id.replace("tab-", ""), true);
      }
    });
  });
  // Actualiza dirección, servicios, horarios y contacto al elegir una sede.
  // ==========================================
  // Mostrar contacto, horarios y servicios del local
  // ==========================================
  function mostrarInformacionDelLocal() {
    const branch = selectedBranch;
    seleccionar("#detail-address").textContent = formatearDireccion(branch);
    seleccionar("#detail-price").textContent =
      formatearImporte(branch?.averagePricePerPersonCents) +
      " aprox. por persona";
    const services = seleccionar("#services-list");
    services.replaceChildren();
    (branch?.services || []).forEach((code) => {
      const symbols = {
        TERRACE: "umbrella",
        FREE_WIFI: "wifi",
        WHEELCHAIR_ACCESS: "accessibility",
        VEGETARIAN_OPTIONS: "leaf",
        CARD_PAYMENT: "credit-card",
        DELIVERY: "bike",
        TAKEAWAY: "shopping-bag",
      };
      const item = crearElemento("li", "", traducirEtiqueta(code));
      item.prepend(MesaIcons.icon(symbols[code] || "check"));
      services.append(item);
    });
    if (!services.children.length)
      services.append(crearElemento("li", "", "Servicios por confirmar"));
    const dl = seleccionar("#hours-list");
    dl.replaceChildren();
    // Agrupa días consecutivos con el mismo horario, sin perder los turnos partidos.
    const weeklyGroups = [];
    (branch?.openingHours || [])
      .slice()
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .forEach((day) => {
        const text = day.closed ? "Cerrado" : formatearHorarios(day.periods);
        const previous = weeklyGroups.at(-1);
        if (
          previous &&
          previous.last + 1 === day.dayOfWeek &&
          previous.text === text
        )
          previous.last = day.dayOfWeek;
        else
          weeklyGroups.push({
            first: day.dayOfWeek,
            last: day.dayOfWeek,
            text,
          });
      });
    weeklyGroups.forEach((group) => {
      const title =
        group.first === group.last
          ? days[group.first - 1]
          : days[group.first - 1] + " a " + days[group.last - 1];
      const row = crearElemento("div");
      row.append(
        crearElemento("dt", "", title),
        crearElemento("dd", "", group.text),
      );
      dl.append(row);
    });
    (branch?.specialHours || []).forEach((day) => {
      const row = crearElemento("div");
      row.append(
        crearElemento("dt", "", day.date),
        crearElemento(
          "dd",
          "",
          day.closed ? "Cerrado" : formatearHorarios(day.periods),
        ),
      );
      dl.append(row);
    });
    if (!dl.children.length)
      dl.append(crearElemento("p", "muted", "Horarios por confirmar"));
    const contact = seleccionar("#contact-list");
    contact.replaceChildren();
    const phone = branch?.contact?.phone;
    const email = branch?.contact?.email || restaurant.contact?.email;
    if (phone) {
      const li = crearElemento("li");
      li.append(crearEnlaceExterno(phone, "tel:" + phone, ["tel:"]));
      contact.append(li);
    }
    if (email) {
      const li = crearElemento("li");
      li.append(crearEnlaceExterno(email, "mailto:" + email, ["mailto:"]));
      contact.append(li);
    }
    if (restaurant.contact?.website) {
      const li = crearElemento("li");
      li.append(crearEnlaceExterno("Página web", restaurant.contact.website));
      contact.append(li);
    }
    if (branch?.contact?.whatsapp) {
      const li = crearElemento("li");
      li.append(
        crearEnlaceExterno(
          "WhatsApp",
          "https://wa.me/" + branch.contact.whatsapp.replace(/\D/g, ""),
        ),
      );
      contact.append(li);
    }
    if (!contact.children.length)
      contact.append(crearElemento("li", "", "Contacto por confirmar"));
    const summary = seleccionar("#summary-list");
    summary.replaceChildren();
    const values = [
      [
        "Tipo de cocina",
        restaurant.cuisineTypes.map(traducirEtiqueta).join(", "),
      ],
      [
        "Precio por persona",
        formatearImporte(branch?.averagePricePerPersonCents),
      ],
      [
        "Capacidad",
        branch?.capacity ? branch.capacity + " personas" : "Por confirmar",
      ],
      ["Estacionamiento", branch?.parking?.description || "Por confirmar"],
    ];
    values.forEach(([title, value]) => {
      const row = crearElemento("div");
      row.append(
        crearElemento("dt", "", title),
        crearElemento("dd", "", value),
      );
      summary.append(row);
    });
    mostrarMapaDelLocal();
  }
  // Cada local mantiene sus propios horarios, precios y datos de contacto.
  // ==========================================
  // Mostrar la lista de locales y la selección actual
  // ==========================================
  function mostrarLocales() {
    const list = seleccionar("#locations-list");
    list.replaceChildren();
    branches.forEach((branch) => {
      const b = crearBoton(
        "",
        () => {
          selectedBranch = branch;
          mostrarLocales();
          mostrarInformacionDelLocal();
          mostrarFotosDelLocal();
          mostrarCartaDelLocal();
        },
        "location-card",
      );
      b.setAttribute(
        "aria-pressed",
        String(branch._id === selectedBranch?._id),
      );
      b.classList.toggle("selected", branch._id === selectedBranch?._id);
      const text = crearElemento("span");
      text.append(
        crearElemento(
          "strong",
          "",
          branch.name +
            (branch._id === restaurant.mainBranchId ? " · Principal" : ""),
        ),
        crearElemento("span", "", formatearDireccion(branch)),
      );
      b.prepend(MesaIcons.icon("map-pin"));
      b.append(text);
      list.append(b);
    });
    if (!branches.length)
      mostrarEstado(
        list,
        "Este restaurante todavía no tiene locales publicados.",
      );
  }
  // La pestaña de ubicación comparte el local activo con toda la ficha.
  // ==========================================
  // Mostrar el mapa y sincronizar la sede seleccionada
  // ==========================================
  function mostrarMapaDelLocal() {
    MesaRestaurantTabs.renderLocation({
      panel: seleccionar("#panel-location"),
      restaurant,
      branch: selectedBranch,
      branches,
      // ==========================================
      // Actualizar la ficha al elegir otro local en el mapa
      // ==========================================
      onBranchChange: function seleccionarSedeDelMapa(id) {
        selectedBranch =
          branches.find((branch) => branch._id === id) || selectedBranch;
        mostrarLocales();
        mostrarInformacionDelLocal();
        mostrarFotosDelLocal();
        mostrarCartaDelLocal();
      },
    });
  }
  // La galería y el visor comparten las fotos y el local seleccionados.
  // ==========================================
  // Mostrar las fotos del restaurante y su local
  // ==========================================
  function mostrarFotosDelLocal() {
    MesaGallery.render({
      panel: seleccionar("#panel-photos"),
      restaurant,
      branch: selectedBranch,
      photos: photoRecords,
      menu: menuRecords,
    });
  }
  let promotions = [];
  // Compone promociones, categorías y sugerencias a partir de los recursos de la API.
  // ==========================================
  // Mostrar platos y promociones del local
  // ==========================================
  function mostrarCartaDelLocal() {
    MesaRestaurantTabs.renderDishes({
      panel: seleccionar("#panel-menu"),
      restaurant,
      branch: selectedBranch,
      photos: photoRecords,
      menu: menuRecords,
      promotions,
    });
  }
  // El módulo de reseñas administra listado, sesión, modal y confirmación de publicación.
  // ==========================================
  // Mostrar las reseñas del restaurante
  // ==========================================
  async function mostrarResenasDelRestaurante() {
    await MesaReviews.render({
      panel: seleccionar("#panel-reviews"),
      restaurant,
      branches,
      selectedBranch,
      onPublished: actualizarCalificaciones,
    });
  }
  // ==========================================
  // Consultar y actualizar el resumen de calificaciones
  // ==========================================
  async function actualizarCalificaciones() {
    const { data } = await MesaAPI.request(rutaDelRestaurante());
    restaurant.ratingSummary = data.ratingSummary;
    seleccionar("#detail-rating").textContent = data.ratingSummary.reviewCount
      ? data.ratingSummary.overall.toFixed(1) +
        " (" +
        data.ratingSummary.reviewCount +
        " reseñas)"
      : "Sin reseñas todavía";
  }
  // Recupera el restaurante y sus recursos desde la API antes de mostrar la ficha.
  // ==========================================
  // Cargar la ficha y los recursos asociados
  // ==========================================
  async function cargarFichaDelRestaurante() {
    const status = seleccionar("#detail-load-status");
    mostrarEstado(status, "Cargando restaurante…");
    try {
      const id = new URLSearchParams(location.search).get("id");
      if (!id)
        throw new Error(
          "Selecciona un restaurante desde el catálogo para consultar su ficha.",
        );
      if (id && !/^[a-f0-9]{24}$/i.test(id))
        throw new Error("El identificador del restaurante no es válido.");
      const { data } = await MesaAPI.request(
        "/restaurants/" + encodeURIComponent(id),
      );
      restaurant = data;
      seleccionar("#detail-favorite")?.replaceChildren(
        MesaFavoritos.crearBoton(restaurant, "detail"),
      );
      document.title = restaurant.name + " · MesaSpot";
      seleccionar("#restaurant-title").textContent = restaurant.name;
      document.querySelector('meta[name="description"]').content =
        restaurant.shortDescription;
      seleccionar("#detail-description").textContent =
        restaurant.shortDescription;
      seleccionar("#detail-cuisine").textContent = restaurant.cuisineTypes
        .map(traducirEtiqueta)
        .join(" · ");
      seleccionar("#hero-cuisine").textContent = restaurant.cuisineTypes
        .map(traducirEtiqueta)
        .join(", ");
      seleccionar("#hero-founded").textContent = restaurant.foundedYear
        ? "Desde " + restaurant.foundedYear
        : "Conoce el restaurante";
      const cover = MesaUI.safeUrl(restaurant.coverPhoto?.url);
      if (cover)
        seleccionar(".detail-hero").style.backgroundImage =
          "linear-gradient(90deg, #1b120ce0, #1b120c55), url(" +
          JSON.stringify(cover) +
          ")";
      const about = seleccionar("#about-copy");
      about.replaceChildren(
        ...(restaurant.description.length
          ? restaurant.description
          : [restaurant.shortDescription]
        ).map((text) => crearElemento("p", "", text)),
      );
      const aboutImage = seleccionar(".about-panel img");
      aboutImage.replaceWith(
        crearImagen(restaurant.thumbnailPhoto?.url, restaurant.name),
      );
      await actualizarCalificaciones();
      const results = await Promise.allSettled([
        MesaAPI.all(rutaDelRestaurante() + "/branches"),
        MesaAPI.all(rutaDelRestaurante() + "/photos"),
        MesaAPI.all(rutaDelRestaurante() + "/menu-items"),
        MesaAPI.all(rutaDelRestaurante() + "/promotions"),
      ]);
      if (results[0].status === "rejected") throw results[0].reason;
      branches = results[0].value.sort(
        (a, b) =>
          Number(b._id === restaurant.mainBranchId) -
            Number(a._id === restaurant.mainBranchId) ||
          a.name.localeCompare(b.name, "es"),
      );
      photoRecords = results[1].value || [];
      menuRecords = results[2].value || [];
      promotions = results[3].value || [];
      selectedBranch =
        branches.find((b) => b._id === restaurant.mainBranchId) || branches[0];
      mostrarLocales();
      mostrarInformacionDelLocal();
      mostrarFotosDelLocal();
      mostrarCartaDelLocal();
      if (results[1].status === "rejected")
        mostrarEstado(
          seleccionar("#panel-photos"),
          results[1].reason.message,
          cargarFichaDelRestaurante,
        );
      if (results[2].status === "rejected" || results[3].status === "rejected")
        mostrarEstado(
          seleccionar("#panel-menu"),
          "No pudimos cargar la carta o sus promociones.",
          cargarFichaDelRestaurante,
        );
      status.replaceChildren();
      initialized = true;
      await MesaAuth.ready;
      await mostrarResenasDelRestaurante();
    } catch (error) {
      seleccionar("#restaurant-title").textContent =
        "Restaurante no disponible";
      mostrarEstado(status, error.message, cargarFichaDelRestaurante);
    }
  }
  seleccionar("#all-locations")?.addEventListener("click", () => {
    seleccionar("#locations-list").classList.toggle("expanded");
  });
  seleccionar("#contact-trigger")?.addEventListener("click", () => {
    seleccionarPestana("information");
    seleccionar("#contact-list").scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });

// ==========================================
// Ir a reservas con el restaurante y local seleccionados
// ==========================================
  seleccionar("#reserve-button")?.addEventListener("click", (event) => {
    if (!restaurant?._id) {
      event.preventDefault();
      mostrarEstado(
        seleccionar("#detail-load-status"),
        "Espera a que cargue la información del restaurante.",
      );
      return;
    }

    const parametros = new URLSearchParams({
      restaurantId: restaurant._id,
    });

    if (selectedBranch?._id) {
      parametros.set("branchId", selectedBranch._id);
    }

    event.currentTarget.href =
      "../reservas/reservas.html?" + parametros.toString();
  });

  window.addEventListener("mesa:session", () => {
    if (initialized) mostrarResenasDelRestaurante();
  });
  seleccionarPestana(
    ["information", "photos", "menu", "reviews", "location"].includes(
      location.hash.slice(1),
    )
      ? location.hash.slice(1)
      : "information",
  );
  cargarFichaDelRestaurante();
})();
