(() => {
  "use strict";
  const labels = {
    CRIOLLA: "Criolla",
    CHIFA: "Chifa",
    POLLERIA: "Pollería",
    MAKIS: "Makis",
    CAFETERIAS: "Cafeterías",
    PERUANA_TRADICIONAL: "Peruana tradicional",
    CARNES: "Carnes",
    MARISCOS: "Mariscos",
    FUSION_ASIATICA: "Fusión asiática",
    MEXICANA: "Mexicana",
    DESAYUNOS: "Desayunos",
    ITALIANA: "Italiana",
    JAPONESA: "Japonesa",
    INTERNACIONAL: "Internacional",
    AMBIENCE: "Ambiente",
    DISH: "Platos",
    DESSERT: "Postres",
    DRINK: "Bebidas",
    TERRACE: "Terraza",
    OTHER: "Otros",
    STARTER: "Entradas",
    MAIN: "Platos principales",
    SIDE: "Acompañamientos",
    FREE_WIFI: "Wi-Fi gratuito",
    WHEELCHAIR_ACCESS: "Accesible",
    VEGETARIAN_OPTIONS: "Opciones vegetarianas",
    CARD_PAYMENT: "Pago con tarjeta",
    DELIVERY: "Delivery",
    TAKEAWAY: "Para llevar",
    CHEF_FAVORITE: "Favorito del chef",
    RECOMMENDED: "Recomendado",
    FEATURED: "Destacado",
    PERSON: "por persona",
    COUPLE: "por pareja",
    PACKAGE: "por paquete",
    ACTIVE: "Activo",
    INACTIVE: "Inactivo",
    PUBLISHED: "Publicado",
    DRAFT: "Borrador",
    ARCHIVED: "Archivado",
  };
  const $ = (selector) => document.querySelector(selector);
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const label = (code) => labels[code] || code || "Sin especificar";
  const money = (value) =>
    value === null || value === undefined
      ? "Precio por confirmar"
      : new Intl.NumberFormat("es-PE", {
          style: "currency",
          currency: "PEN",
        }).format(value / 100);
  function safeUrl(value, protocols = ["https:", "http:"]) {
    try {
      const url = new URL(value);
      return protocols.includes(url.protocol) ? url.href : null;
    } catch {
      return null;
    }
  }
  const fallback = new URL(
    "../assets/restaurant-placeholder.svg",
    document.querySelector('script[src$="js/ui.js"]').src,
  ).href;
  function image(url, alt, className = "") {
    const img = element("img", className);
    img.alt = alt || "";
    img.loading = "lazy";
    img.src = safeUrl(url) || fallback;
    img.addEventListener(
      "error",
      () => {
        img.src = fallback;
      },
      { once: true },
    );
    return img;
  }
  function button(text, handler, className = "button") {
    const node = element("button", className, text);
    node.type = "button";
    const symbols = {
      "Volver a intentar": "rotate-cw",
      "Crear restaurante": "plus",
      "Editar restaurante": "pencil",
      Editar: "pencil",
      Archivar: "archive",
      "Archivar restaurante": "archive",
      "Eliminar mi reseña": "trash-2",
      "Eliminar respuesta": "trash-2",
      "Iniciar sesión": "log-in",
      Salir: "log-out",
      "Crear una cuenta": "user-plus",
      "Ya tengo cuenta": "log-in",
      "Mostrar contraseña": "eye",
      Restaurante: "store",
      Locales: "map-pin",
      Galería: "images",
      Carta: "book-open",
      Promociones: "badge-percent",
      Reseñas: "message-square",
      "Agregar local": "plus",
      "Agregar foto": "image-plus",
      "Agregar plato": "utensils",
      "Agregar promoción": "badge-percent",
    };
    if (symbols[text]) node.prepend(MesaIcons.icon(symbols[text]));
    if (handler) node.addEventListener("click", handler);
    return node;
  }
  function link(text, href, className = "") {
    const node = element("a", className, text);
    node.href = href;
    return node;
  }
  function external(text, value, protocols) {
    const url = safeUrl(value, protocols);
    if (!url) return element("span", "", "No disponible");
    const node = link(text, url);
    node.prepend(
      MesaIcons.icon(
        protocols?.includes("tel:")
          ? "phone"
          : protocols?.includes("mailto:")
            ? "mail"
            : "external-link",
      ),
    );
    node.rel = "noopener noreferrer";
    if (!protocols) node.target = "_blank";
    return node;
  }
  // Resolvemos las páginas desde el script compartido para admitir carpetas y subdirectorios.
  const siteRoot = new URL(
    "../",
    document.querySelector('script[src$="js/ui.js"]').src,
  );
  const pageFolders = {
    "restaurantes.html": "restaurantes",
    "restaurante.html": "restaurantes",
    "perfil.html": "perfil",
    "administracion.html": "administracion",
  };
  const pageUrl = (file) => {
    const name = file.split(/[?#]/)[0];
    return new URL("pages/" + pageFolders[name] + "/" + file, siteRoot).href;
  };
  const detailUrl = (item) =>
    pageUrl(`restaurante.html?id=${encodeURIComponent(item._id)}`);
  function state(container, message, retry) {
    container.replaceChildren();
    const box = element("div", "api-state");
    box.setAttribute("role", "status");
    box.append(element("p", "", message));
    if (retry) box.append(button("Volver a intentar", retry));
    container.append(box);
  }
  function card(item) {
    const article = element("article", "restaurant-card");
    const photo = link("", detailUrl(item), "card-detail-link");
    const picture = element("div", "card-image");
    picture.append(
      image(item.thumbnail?.url, item.thumbnail?.altText || item.name),
    );
    photo.append(picture);
    const body = element("div", "card-body");
    const badges = element("div", "card-labels");
    const cuisines = element("div", "card-cuisines");
    (item.cuisineTypes || []).forEach((code) =>
      cuisines.append(element("span", "tag", label(code))),
    );
    const rating = element(
      "span",
      "rating",
      item.ratingSummary?.reviewCount
        ? item.ratingSummary.overall.toFixed(1)
        : "Nuevo",
    );
    rating.prepend(MesaIcons.icon("star"));
    rating.setAttribute(
      "aria-label",
      item.ratingSummary?.reviewCount
        ? `Valoración ${item.ratingSummary.overall.toFixed(1)} de 5`
        : "Todavía no tiene reseñas",
    );
    badges.append(cuisines, rating);
    const h3 = element("h3");
    h3.append(link(item.name, detailUrl(item)));
    const meta = element("p", "card-meta");
    const location = element(
      "span",
      "card-location",
      item.displayBranch?.address?.district || "Local por confirmar",
    );
    location.prepend(MesaIcons.icon("map-pin"));
    meta.append(
      location,
      element(
        "span",
        "price",
        money(item.displayBranch?.averagePricePerPersonCents),
      ),
    );
    const action = link("Conocer restaurante", detailUrl(item), "reserve");
    action.append(MesaIcons.icon("arrow-right"));
    body.append(badges, h3, meta, action);
    article.append(photo, body);
    return article;
  }
  function modal(title, className = "") {
    const dialog = $("#modal");
    dialog.className = className;
    const content = $("#modal-content");
    content.replaceChildren(element("h2", "modal-title", title));
    content.firstElementChild.id = "modal-title";
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    return content;
  }
  function feedback(container, message, error = false) {
    container.hidden = false;
    container.textContent = message;
    container.classList.toggle("is-error", error);
  }
  function paginate(container, page, totalPages, callback) {
    container.replaceChildren();
    container.hidden = totalPages <= 1;
    const previous = button("", () => callback(page - 1));
    previous.append(MesaIcons.icon("chevron-left"));
    previous.disabled = page <= 1;
    previous.setAttribute("aria-label", "Página anterior");
    container.append(previous);
    [...new Set([1, page - 1, page, page + 1, totalPages])]
      .filter((p) => p >= 1 && p <= totalPages)
      .forEach((p) => {
        const b = button(String(p), () => callback(p));
        if (p === page) b.setAttribute("aria-current", "page");
        container.append(b);
      });
    const next = button("", () => callback(page + 1));
    next.append(MesaIcons.icon("chevron-right"));
    next.disabled = page >= totalPages;
    next.setAttribute("aria-label", "Página siguiente");
    container.append(next);
  }
  function field(form, name, title, type = "text", value = "", options = {}) {
    const wrap = element("label", "form-field", title);
    const input = element(
      type === "textarea" ? "textarea" : type === "select" ? "select" : "input",
    );
    input.name = name;
    if (input.tagName === "INPUT") input.type = type;
    if (options.choices)
      options.choices.forEach(([v, text]) => {
        const option = element("option", "", text);
        option.value = v;
        input.append(option);
      });
    input.value = value ?? "";
    input.required = Boolean(options.required);
    Object.entries(options).forEach(([key, val]) => {
      if (key !== "choices" && key !== "required") input.setAttribute(key, val);
    });
    wrap.append(input);
    form.append(wrap);
    return input;
  }
  window.MesaUI = {
    $,
    element,
    label,
    money,
    safeUrl,
    image,
    button,
    link,
    external,
    pageUrl,
    detailUrl,
    state,
    card,
    modal,
    feedback,
    paginate,
    field,
  };
})();
