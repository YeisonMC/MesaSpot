// ==========================================
// Contenido de platos, promociones y ubicación
// ==========================================

(() => {
  "use strict";
  const {
    element: crearElemento,
    image: crearImagen,
    button: crearBoton,
    money: formatearImporte,
    label: traducirEtiqueta,
    state: mostrarEstado,
    external: crearEnlaceExterno,
    safeUrl: validarUrl,
  } = MesaUI;
  // ==========================================
  // Crear un icono del panel
  // ==========================================
  const crearIcono = (name) => MesaIcons.icon(name);
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
  // ==========================================
  // Crear el encabezado de una sección
  // ==========================================
  function crearCabeceraDePanel(title, symbol, subtitle) {
    const wrap = crearElemento("div", "tab-section-heading");
    const badge = crearElemento("span", "panel-icon");
    badge.append(crearIcono(symbol));
    const copy = crearElemento("div");
    copy.append(crearElemento("h2", "", title));
    if (subtitle) copy.append(crearElemento("p", "", subtitle));
    wrap.append(badge, copy);
    return wrap;
  }
  // ==========================================
  // Configurar la animación según la preferencia del usuario
  // ==========================================
  function prepararAnimacion(node, delay = 0) {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.dataset.aos = "fade-up";
      node.dataset.aosDelay = String(delay);
    }
    return node;
  }
  // ==========================================
  // Actualizar AOS tras renderizar el contenido
  // ==========================================
  function actualizarAnimaciones() {
    window.AOS?.refreshHard();
  }
  // ==========================================
  // Crear la etiqueta de un plato recomendado
  // ==========================================
  function crearEtiquetaDeRecomendacion(item) {
    const code = item.recommendation?.label || "FEATURED";
    const badge = crearElemento("span", "dish-badge", traducirEtiqueta(code));
    badge.prepend(crearIcono(code === "CHEF_FAVORITE" ? "star" : "thumbs-up"));
    return badge;
  }

  // Los precios y sugerencias corresponden siempre al local seleccionado, en céntimos PEN.
  // ==========================================
  // Mostrar carta, sugerencias y promociones destacadas
  // ==========================================
  function mostrarPlatosYPromociones({
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
    // ==========================================
    // Buscar la URL de una foto por su identificador
    // ==========================================
    const buscarFotoPorId = (id) =>
      photos.find((photo) => photo._id === id)?.url;
    // ==========================================
    // Buscar el precio y la disponibilidad en el local
    // ==========================================
    const buscarOfertaDelLocal = (item) =>
      item.branchOffers.find(
        (offer) => offer.branchId === branch?._id && offer.available,
      );
    const layout = crearElemento("div", "dishes-layout");
    const main = crearElemento("div", "dishes-main");

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
      const offers = prepararAnimacion(
        crearElemento("section", "detail-panel featured-promotions"),
      );
      offers.append(
        crearCabeceraDePanel(
          "Promociones destacadas",
          "badge-percent",
          "Disfruta más de tus sabores favoritos.",
        ),
      );
      const grid = crearElemento("div", "featured-promo-grid");
      featured.forEach((promo) => {
        const card = crearElemento("article", "featured-promo-card");
        const visual = crearElemento("div", "featured-promo-image");
        visual.append(crearImagen(buscarFotoPorId(promo.photoId), promo.title));
        visual.append(
          crearElemento(
            "span",
            "promo-ribbon",
            promo.pricingUnit === "COUPLE" ? "Ideal para dos" : "Destacada",
          ),
        );
        const body = crearElemento("div", "featured-promo-body");
        body.append(
          crearElemento("h3", "", promo.title),
          crearElemento("p", "promo-description", promo.description || ""),
        );
        const meta = crearElemento("div", "promo-meta");
        const count = (promo.items || []).reduce(
          (sum, item) => sum + item.quantity,
          0,
        );
        if (count) {
          const items = crearElemento(
            "span",
            "",
            count + (count === 1 ? " producto" : " productos"),
          );
          items.prepend(crearIcono("utensils"));
          meta.append(items);
        }
        if (promo.peopleCount) {
          const people = crearElemento(
            "span",
            "",
            promo.peopleCount +
              (promo.peopleCount === 1 ? " persona" : " personas"),
          );
          people.prepend(crearIcono("users"));
          meta.append(people);
        }
        body.append(meta);
        const bottom = crearElemento("div", "promo-bottom");
        const price = crearElemento("div", "promo-price");
        price.append(
          crearElemento("strong", "", formatearImporte(promo.priceCents)),
          crearElemento("span", "", traducirEtiqueta(promo.pricingUnit)),
        );
        // El detalle completo se desarrollará después; este aviso evita un botón sin respuesta.
        const details = crearBoton(
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
    const carta = prepararAnimacion(
      crearElemento("section", "detail-panel dishes-carta"),
      50,
    );
    carta.append(
      crearCabeceraDePanel(
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
    const filters = crearElemento("div", "dish-filters");
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", "Categorías de platos");
    const content = crearElemento("div", "dish-category-content");
    const choices = [["", "Todo", "layout-grid"], ...present];
    // ==========================================
    // Actualizar los platos de la categoría activa
    // ==========================================
    function seleccionarCategoriaDePlatos(code) {
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
          const group = crearElemento("section", "dish-category-group");
          group.append(
            crearElemento("h3", "", title),
            crearElemento("p", "dish-category-description", subtitle),
          );
          const grid = crearElemento("div", "dish-list");
          available
            .filter((item) => item.category === category)
            .forEach((item) => {
              const card = crearElemento("article", "dish-item");
              card.append(
                crearImagen(
                  buscarFotoPorId(item.photoId),
                  item.name,
                  "dish-image",
                ),
              );
              const copy = crearElemento("div", "dish-copy");
              const titleRow = crearElemento("div", "dish-title-row");
              titleRow.append(crearElemento("h4", "", item.name));
              if (item.recommendation?.featured)
                titleRow.append(crearEtiquetaDeRecomendacion(item));
              copy.append(
                titleRow,
                crearElemento(
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
              copy.append(crearElemento("span", "sr-only", allergenInfo));
              card.append(
                copy,
                crearElemento(
                  "strong",
                  "dish-price",
                  formatearImporte(buscarOfertaDelLocal(item).priceCents),
                ),
              );
              grid.append(card);
            });
          group.append(grid);
          content.append(group);
        });
      if (!available.length)
        mostrarEstado(content, "No hay platos disponibles para este local.");
      actualizarAnimaciones();
    }
    choices.forEach(([code, text, symbol]) => {
      const choice = crearBoton(
        text,
        () => seleccionarCategoriaDePlatos(code),
        "dish-filter",
      );
      choice.dataset.category = code;
      choice.prepend(crearIcono(symbol));
      filters.append(choice);
    });
    carta.append(filters, content);
    carta.append(
      crearElemento(
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
      const aside = prepararAnimacion(
        crearElemento("aside", "detail-panel dishes-suggestions"),
        100,
      );
      aside.setAttribute("aria-label", "Sugerencias de platos");
      aside.append(
        crearCabeceraDePanel(
          "Hoy te sugerimos",
          "thumbs-up",
          "Una selección de la casa para ti.",
        ),
      );
      suggested.forEach((item) => {
        const card = crearElemento("article", "suggested-dish");
        card.append(crearImagen(buscarFotoPorId(item.photoId), item.name));
        const copy = crearElemento("div", "suggested-copy");
        copy.append(
          crearElemento("h3", "", item.name),
          crearEtiquetaDeRecomendacion(item),
          crearElemento(
            "p",
            "",
            item.description || "Especialidad de la casa.",
          ),
          crearElemento(
            "strong",
            "dish-price",
            formatearImporte(buscarOfertaDelLocal(item).priceCents),
          ),
        );
        card.append(copy);
        aside.append(card);
      });
      layout.append(aside);
    } else layout.classList.add("without-suggestions");
    panel.append(layout);
    seleccionarCategoriaDePlatos(selectedCategory);
  }

  // Copia o comparte un enlace público; el mensaje permanece accesible si el navegador lo rechaza.
  // ==========================================
  // Compartir la ubicación o copiar su enlace
  // ==========================================
  async function compartirUbicacion(url, title, status) {
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
  // ==========================================
  // Mostrar mapa, dirección y contacto del local
  // ==========================================
  function mostrarUbicacionYContacto({
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
      validarUrl(branch?.googleMaps?.mapsUrl) ||
      "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(destination);
    const directionsUrl =
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(destination) +
      (placeId ? "&destination_place_id=" + encodeURIComponent(placeId) : "");
    if (!branch) {
      mostrarEstado(
        panel,
        "Este restaurante todavía no tiene un local publicado.",
      );
      return;
    }
    const layout = crearElemento("div", "location-layout");
    const map = prepararAnimacion(
      crearElemento("section", "detail-panel location-map-panel"),
    );
    const mapHeading = crearCabeceraDePanel("Ubicación en el mapa", "map-pin");
    if (branches.length > 1) {
      const selector = crearElemento("label", "map-branch-select", "Local");
      const select = crearElemento("select");
      select.setAttribute("aria-label", "Local en el mapa");
      branches.forEach((item) => {
        const option = crearElemento("option", "", item.name);
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
      const iframe = crearElemento("iframe", "restaurant-map");
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
        crearElemento(
          "p",
          "map-note",
          hasCoords || placeId
            ? "Ubicación proporcionada por el restaurante."
            : "Mapa de referencia según la dirección publicada. Confirma el punto exacto con el restaurante.",
        ),
      );
    } else
      mostrarEstado(
        map,
        "La dirección de este local está pendiente de publicación.",
      );
    const contact = prepararAnimacion(
      crearElemento("aside", "detail-panel location-contact"),
      75,
    );
    contact.append(
      crearCabeceraDePanel("Dirección y contacto", "map-pin"),
      crearElemento("p", "location-branch-name", branch.name),
    );
    const list = crearElemento("ul", "location-contact-list");
    // ==========================================
    // Agregar una fila de contacto con su icono
    // ==========================================
    function agregarFilaDeContacto(symbol, node) {
      const li = crearElemento("li");
      li.append(crearIcono(symbol), node);
      list.append(li);
    }
    if (address)
      agregarFilaDeContacto("map-pin", crearElemento("span", "", address));
    const phone = branch.contact?.phone || restaurant.contact?.phone;
    const email = branch.contact?.email || restaurant.contact?.email;
    if (phone)
      agregarFilaDeContacto(
        "phone",
        crearEnlaceExterno(phone, "tel:" + phone, ["tel:"]),
      );
    if (email)
      agregarFilaDeContacto(
        "mail",
        crearEnlaceExterno(email, "mailto:" + email, ["mailto:"]),
      );
    if (validarUrl(restaurant.contact?.website))
      agregarFilaDeContacto(
        "globe",
        crearEnlaceExterno(
          new URL(restaurant.contact.website).hostname,
          restaurant.contact.website,
        ),
      );
    if (branch.contact?.whatsapp)
      agregarFilaDeContacto(
        "message-circle",
        crearEnlaceExterno(
          "WhatsApp",
          "https://wa.me/" + branch.contact.whatsapp.replace(/\D/g, ""),
        ),
      );
    contact.append(list);
    if (destination) {
      const directions = crearEnlaceExterno("Cómo llegar", directionsUrl);
      directions.className = "button location-directions";
      directions.querySelector("svg")?.replaceWith(crearIcono("navigation"));
      contact.append(directions);
      const shareStatus = crearElemento("p", "location-share-status");
      shareStatus.setAttribute("role", "status");
      const share = crearBoton(
        "Compartir ubicación",
        () => compartirUbicacion(mapsUrl, restaurant.name, shareStatus),
        "location-share",
      );
      share.prepend(crearIcono("share-2"));
      contact.append(share, shareStatus);
    }
    layout.append(map, contact);
    panel.append(layout);
    actualizarAnimaciones();
  }
  window.MesaRestaurantTabs = {
    renderDishes: mostrarPlatosYPromociones,
    renderLocation: mostrarUbicacionYContacto,
  };
})();
