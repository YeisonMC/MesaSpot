(() => {
  "use strict";
  const { element, image, button, money, label, state, external, safeUrl } =
    MesaUI;
  const icon = (name) => MesaIcons.icon(name);
  const categories = [
    ["STARTER", "Entradas", "salad", "Para empezar y compartir en la mesa."],
    [
      "MAIN",
      "Platos principales",
      "utensils-crossed",
      "Los sabores y especialidades de nuestra cocina.",
    ],
    ["DESSERT", "Postres", "cake-slice", "Un final dulce para tu experiencia."],
    ["DRINK", "Bebidas", "wine", "El acompañamiento perfecto para cada plato."],
    [
      "SIDE",
      "Acompañamientos",
      "cooking-pot",
      "Complementa tus platos favoritos.",
    ],
    ["OTHER", "Otros", "chef-hat", "Más opciones de nuestra carta."],
  ];
  let selectedCategory = "";

  // Comparte encabezados e iconos; AOS se actualiza cuando cambia el contenido de la API.
  function heading(title, symbol, subtitle) {
    const wrap = element("div", "tab-section-heading");
    const badge = element("span", "panel-icon");
    badge.append(icon(symbol));
    const copy = element("div");
    copy.append(element("h2", "", title));
    if (subtitle) copy.append(element("p", "", subtitle));
    wrap.append(badge, copy);
    return wrap;
  }
  function animate(node, delay = 0) {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.dataset.aos = "fade-up";
      node.dataset.aosDelay = String(delay);
    }
    return node;
  }
  function refreshAnimations() {
    window.AOS?.refreshHard();
  }
  function recommendation(item) {
    const code = item.recommendation?.label || "FEATURED";
    const badge = element("span", "dish-badge", label(code));
    badge.prepend(icon(code === "CHEF_FAVORITE" ? "star" : "thumbs-up"));
    return badge;
  }

  // Los precios y sugerencias corresponden siempre al local seleccionado, en céntimos PEN.
  function renderDishes({
    panel,
    restaurant,
    branch,
    photos,
    menu,
    promotions,
  }) {
    panel.replaceChildren();
    const available = menu.filter((item) =>
      item.branchOffers?.some(
        (offer) => offer.branchId === branch?._id && offer.available,
      ),
    );
    const photoFor = (id) => photos.find((photo) => photo._id === id)?.url;
    const offerFor = (item) =>
      item.branchOffers.find(
        (offer) => offer.branchId === branch?._id && offer.available,
      );
    const layout = element("div", "dishes-layout");
    const main = element("div", "dishes-main");

    // Solo las promociones destacadas y vigentes de esta sede muestran el botón de detalles.
    const now = Date.now();
    const featured = promotions.filter(
      (p) =>
        p.featured &&
        p.branchIds?.includes(branch?._id) &&
        (!p.startsAt || new Date(p.startsAt).getTime() <= now) &&
        (!p.endsAt || new Date(p.endsAt).getTime() > now),
    );
    if (featured.length) {
      const offers = animate(
        element("section", "detail-panel featured-promotions"),
      );
      offers.append(
        heading(
          "Promociones destacadas",
          "badge-percent",
          "Disfruta más de tus sabores favoritos.",
        ),
      );
      const grid = element("div", "featured-promo-grid");
      featured.forEach((promo) => {
        const card = element("article", "featured-promo-card");
        const visual = element("div", "featured-promo-image");
        visual.append(image(photoFor(promo.photoId), promo.title));
        visual.append(
          element(
            "span",
            "promo-ribbon",
            promo.pricingUnit === "COUPLE" ? "Ideal para dos" : "Destacada",
          ),
        );
        const body = element("div", "featured-promo-body");
        body.append(
          element("h3", "", promo.title),
          element("p", "promo-description", promo.description || ""),
        );
        const meta = element("div", "promo-meta");
        const count = (promo.items || []).reduce(
          (sum, item) => sum + item.quantity,
          0,
        );
        if (count) {
          const items = element(
            "span",
            "",
            count + (count === 1 ? " producto" : " productos"),
          );
          items.prepend(icon("utensils"));
          meta.append(items);
        }
        if (promo.peopleCount) {
          const people = element(
            "span",
            "",
            promo.peopleCount +
              (promo.peopleCount === 1 ? " persona" : " personas"),
          );
          people.prepend(icon("users"));
          meta.append(people);
        }
        body.append(meta);
        const bottom = element("div", "promo-bottom");
        const price = element("div", "promo-price");
        price.append(
          element("strong", "", money(promo.priceCents)),
          element("span", "", label(promo.pricingUnit)),
        );
        // El detalle completo se desarrollará después; este aviso evita un botón sin respuesta.
        const details = button(
          "Ver detalles",
          () => {
            const toast = document.getElementById("toast");
            if (!toast) return;
            toast.textContent =
              "Los detalles de esta promoción estarán disponibles próximamente.";
            toast.hidden = false;
            clearTimeout(details.noticeTimer);
            details.noticeTimer = setTimeout(() => {
              toast.hidden = true;
            }, 4500);
          },
          "button promo-details",
        );
        details.dataset.promotionId = promo._id;
        details.setAttribute("aria-label", "Ver detalles de " + promo.title);
        bottom.append(price, details);
        body.append(bottom);
        card.append(visual, body);
        grid.append(card);
      });
      offers.append(grid);
      main.append(offers);
    }

    // Las categorías actúan como filtros reales, sin mezclar platos de otras sedes.
    const carta = animate(element("section", "detail-panel dishes-carta"), 50);
    carta.append(
      heading(
        "Carta",
        "chef-hat",
        "Descubre nuestros platos, preparados para disfrutar cada momento.",
      ),
    );
    const present = categories.filter(([code]) =>
      available.some((item) => item.category === code),
    );
    if (!present.some(([code]) => code === selectedCategory))
      selectedCategory = "";
    const filters = element("div", "dish-filters");
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", "Categorías de platos");
    const content = element("div", "dish-category-content");
    const choices = [["", "Todo", "layout-grid"], ...present];
    function updateCategory(code) {
      selectedCategory = code;
      [...filters.children].forEach((choice) =>
        choice.setAttribute(
          "aria-pressed",
          String(choice.dataset.category === code),
        ),
      );
      content.replaceChildren();
      present
        .filter(([category]) => !code || code === category)
        .forEach(([category, title, , subtitle]) => {
          const group = element("section", "dish-category-group");
          group.append(
            element("h3", "", title),
            element("p", "dish-category-description", subtitle),
          );
          const grid = element("div", "dish-list");
          available
            .filter((item) => item.category === category)
            .forEach((item) => {
              const card = element("article", "dish-item");
              card.append(
                image(photoFor(item.photoId), item.name, "dish-image"),
              );
              const copy = element("div", "dish-copy");
              const titleRow = element("div", "dish-title-row");
              titleRow.append(element("h4", "", item.name));
              if (item.recommendation?.featured)
                titleRow.append(recommendation(item));
              copy.append(
                titleRow,
                element(
                  "p",
                  "",
                  item.description || "Preparado al momento en nuestra cocina.",
                ),
              );
              // La información de alérgenos se conserva sin saturar la tarjeta de la carta.
              const allergenInfo = item.allergenInformationConfirmed
                ? "Alérgenos: " +
                  (item.allergens?.join(", ") || "Sin alérgenos declarados")
                : "Consulta ingredientes y alérgenos con el restaurante.";
              copy.append(element("span", "sr-only", allergenInfo));
              card.append(
                copy,
                element(
                  "strong",
                  "dish-price",
                  money(offerFor(item).priceCents),
                ),
              );
              grid.append(card);
            });
          group.append(grid);
          content.append(group);
        });
      if (!available.length)
        state(content, "No hay platos disponibles para este local.");
      refreshAnimations();
    }
    choices.forEach(([code, text, symbol]) => {
      const choice = button(text, () => updateCategory(code), "dish-filter");
      choice.dataset.category = code;
      choice.prepend(icon(symbol));
      filters.append(choice);
    });
    carta.append(filters, content);
    carta.append(
      element(
        "p",
        "dish-footnote",
        "Precios en soles (S/). Consulta ingredientes y alérgenos con el restaurante.",
      ),
    );
    main.append(carta);
    layout.append(main);

    // Las sugerencias proceden del campo recommendation; no se inventan métricas de popularidad.
    const suggested = available
      .filter((item) => item.recommendation?.featured)
      .sort(
        (a, b) =>
          (a.recommendation.sortOrder || 0) - (b.recommendation.sortOrder || 0),
      )
      .slice(0, 3);
    if (suggested.length) {
      const aside = animate(
        element("aside", "detail-panel dishes-suggestions"),
        100,
      );
      aside.setAttribute("aria-label", "Sugerencias de platos");
      aside.append(
        heading(
          "Hoy te sugerimos",
          "thumbs-up",
          "Una selección de la casa para ti.",
        ),
      );
      suggested.forEach((item) => {
        const card = element("article", "suggested-dish");
        card.append(image(photoFor(item.photoId), item.name));
        const copy = element("div", "suggested-copy");
        copy.append(
          element("h3", "", item.name),
          recommendation(item),
          element("p", "", item.description || "Especialidad de la casa."),
          element("strong", "dish-price", money(offerFor(item).priceCents)),
        );
        card.append(copy);
        aside.append(card);
      });
      layout.append(aside);
    } else layout.classList.add("without-suggestions");
    panel.append(layout);
    updateCategory(selectedCategory);
  }

  // Copia o comparte un enlace público; el mensaje permanece accesible si el navegador lo rechaza.
  async function shareLocation(url, title, status) {
    try {
      if (navigator.share) await navigator.share({ title, url });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        status.textContent = "Enlace de ubicación copiado.";
      } else {
        const content = MesaUI.modal("Compartir ubicación");
        MesaUI.field(content, "mapLink", "Copia este enlace", "url", url, {
          readonly: true,
        });
        content.querySelector("input").select();
      }
    } catch (error) {
      if (error.name !== "AbortError")
        status.textContent =
          "No se pudo compartir. Puedes abrir Google Maps y copiar el enlace.";
    }
  }

  // Google Maps admite coordenadas o búsqueda por dirección: no generamos coordenadas ficticias.
  function renderLocation({
    panel,
    restaurant,
    branch,
    branches,
    onBranchChange,
  }) {
    panel.replaceChildren();
    const address = [
      branch?.address?.street,
      branch?.address?.district,
      branch?.address?.province,
      branch?.address ? "Perú" : "",
    ]
      .filter(Boolean)
      .join(", ");
    const coords = branch?.location?.coordinates;
    const hasCoords = coords?.length === 2 && coords.every(Number.isFinite);
    const destination = hasCoords ? coords[1] + "," + coords[0] : address;
    const placeId = branch?.googleMaps?.placeId;
    const query = destination;
    const mapsUrl =
      safeUrl(branch?.googleMaps?.mapsUrl) ||
      "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(destination);
    const directionsUrl =
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(destination) +
      (placeId ? "&destination_place_id=" + encodeURIComponent(placeId) : "");
    if (!branch) {
      state(panel, "Este restaurante todavía no tiene un local publicado.");
      return;
    }
    const layout = element("div", "location-layout");
    const map = animate(element("section", "detail-panel location-map-panel"));
    const mapHeading = heading("Ubicación en el mapa", "map-pin");
    if (branches.length > 1) {
      const selector = element("label", "map-branch-select", "Local");
      const select = element("select");
      select.setAttribute("aria-label", "Local en el mapa");
      branches.forEach((item) => {
        const option = element("option", "", item.name);
        option.value = item._id;
        select.append(option);
      });
      select.value = branch._id;
      // El cambio de sede actualiza también carta, contacto y galería mediante el controlador principal.
      select.addEventListener("change", () => onBranchChange(select.value));
      selector.append(select);
      mapHeading.append(selector);
    }
    map.append(mapHeading);
    if (destination) {
      const iframe = element("iframe", "restaurant-map");
      iframe.title = "Mapa de " + branch.name;
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.allowFullscreen = true;
      iframe.src =
        "https://maps.google.com/maps?q=" +
        encodeURIComponent(query) +
        "&z=16&output=embed";
      map.append(iframe);
      map.append(
        element(
          "p",
          "map-note",
          hasCoords || placeId
            ? "Ubicación proporcionada por el restaurante."
            : "Mapa de referencia según la dirección publicada. Confirma el punto exacto con el restaurante.",
        ),
      );
    } else
      state(map, "La dirección de este local está pendiente de publicación.");
    const contact = animate(
      element("aside", "detail-panel location-contact"),
      75,
    );
    contact.append(
      heading("Dirección y contacto", "map-pin"),
      element("p", "location-branch-name", branch.name),
    );
    const list = element("ul", "location-contact-list");
    function row(symbol, node) {
      const li = element("li");
      li.append(icon(symbol), node);
      list.append(li);
    }
    if (address) row("map-pin", element("span", "", address));
    const phone = branch.contact?.phone || restaurant.contact?.phone;
    const email = branch.contact?.email || restaurant.contact?.email;
    if (phone) row("phone", external(phone, "tel:" + phone, ["tel:"]));
    if (email) row("mail", external(email, "mailto:" + email, ["mailto:"]));
    if (safeUrl(restaurant.contact?.website))
      row(
        "globe",
        external(
          new URL(restaurant.contact.website).hostname,
          restaurant.contact.website,
        ),
      );
    if (branch.contact?.whatsapp)
      row(
        "message-circle",
        external(
          "WhatsApp",
          "https://wa.me/" + branch.contact.whatsapp.replace(/\D/g, ""),
        ),
      );
    contact.append(list);
    if (destination) {
      const directions = external("Cómo llegar", directionsUrl);
      directions.className = "button location-directions";
      directions.querySelector("svg")?.replaceWith(icon("navigation"));
      contact.append(directions);
      const shareStatus = element("p", "location-share-status");
      shareStatus.setAttribute("role", "status");
      const share = button(
        "Compartir ubicación",
        () => shareLocation(mapsUrl, restaurant.name, shareStatus),
        "location-share",
      );
      share.prepend(icon("share-2"));
      contact.append(share, shareStatus);
    }
    layout.append(map, contact);
    panel.append(layout);
    refreshAnimations();
  }
  window.MesaRestaurantTabs = { renderDishes, renderLocation };
})();
