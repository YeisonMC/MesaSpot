(() => {
  "use strict";
  const labels = {
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
    node.rel = "noopener noreferrer";
    if (!protocols) node.target = "_blank";
    return node;
  }
  const pageUrl = (file) => (document.body.dataset.page ? "" : "pages/") + file;
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
    badges.append(
      element("span", "tag", (item.cuisineTypes || []).map(label).join(" · ")),
      element(
        "span",
        "rating",
        item.ratingSummary?.reviewCount
          ? `★ ${item.ratingSummary.overall.toFixed(1)}`
          : "Sin reseñas",
      ),
    );
    const h3 = element("h3");
    h3.append(link(item.name, detailUrl(item)));
    const meta = element(
      "p",
      "card-meta",
      `${item.displayBranch?.address?.district || "Local por confirmar"} · `,
    );
    meta.append(
      element(
        "span",
        "price",
        money(item.displayBranch?.averagePricePerPersonCents),
      ),
    );
    body.append(
      badges,
      h3,
      meta,
      link("Conocer restaurante", detailUrl(item), "reserve"),
    );
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
    const previous = button("‹", () => callback(page - 1));
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
    const next = button("›", () => callback(page + 1));
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
