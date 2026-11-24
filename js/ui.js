// ==========================================
// Utilidades compartidas de la interfaz
// ==========================================

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
  // ==========================================
  // Seleccionar un elemento del documento
  // ==========================================
  const seleccionar = (selector) => document.querySelector(selector);
  // ==========================================
  // Crear un elemento con clase y texto opcionales
  // ==========================================
  const crearElemento = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  // ==========================================
  // Traducir un código a su etiqueta de interfaz
  // ==========================================
  const traducirEtiqueta = (code) => labels[code] || code || "Sin especificar";
  // ==========================================
  // Formatear un importe de céntimos a soles
  // ==========================================
  const formatearImporte = (value) =>
    value === null || value === undefined
      ? "Precio por confirmar"
      : new Intl.NumberFormat("es-PE", {
          style: "currency",
          currency: "PEN",
        }).format(value / 100);
  // ==========================================
  // Validar que una URL use un protocolo permitido
  // ==========================================
  function validarUrl(value, protocols = ["https:", "http:"]) {
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
  // ==========================================
  // Crear una imagen con alternativa de respaldo
  // ==========================================
  function crearImagen(url, alt, className = "") {
    const img = crearElemento("img", className);
    img.alt = alt || "";
    img.loading = "lazy";
    img.src = validarUrl(url) || fallback;
    img.addEventListener(
      "error",
      () => {
        img.src = fallback;
      },
      { once: true },
    );
    return img;
  }
  // ==========================================
  // Crear un botón con su acción e icono
  // ==========================================
  function crearBoton(text, handler, className = "button") {
    const node = crearElemento("button", className, text);
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
  // ==========================================
  // Crear un enlace de navegación
  // ==========================================
  function crearEnlace(text, href, className = "") {
    const node = crearElemento("a", className, text);
    node.href = href;
    return node;
  }
  // ==========================================
  // Crear un enlace externo seguro
  // ==========================================
  function crearEnlaceExterno(text, value, protocols) {
    const url = validarUrl(value, protocols);
    if (!url) return crearElemento("span", "", "No disponible");
    const node = crearEnlace(text, url);
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
    "promociones.html": "promociones",
    "reservas.html": "reservas",
  };
  // ==========================================
  // Resolver la ruta de una página desde la raíz del sitio
  // ==========================================
  const rutaDePagina = (file) => {
    const name = file.split(/[?#]/)[0];
    return new URL("pages/" + pageFolders[name] + "/" + file, siteRoot).href;
  };
  // ==========================================
  // Construir el enlace a la ficha de un restaurante
  // ==========================================
  const rutaDeFicha = (item) =>
    rutaDePagina(`restaurante.html?id=${encodeURIComponent(item._id)}`);
  // ==========================================
  // Mostrar un estado y una acción opcional de reintento
  // ==========================================
  function mostrarEstado(container, message, retry) {
    container.replaceChildren();
    const box = crearElemento("div", "api-state");
    box.setAttribute("role", "status");
    box.append(crearElemento("p", "", message));
    if (retry) box.append(crearBoton("Volver a intentar", retry));
    container.append(box);
  }
  // ==========================================
  // Construir una tarjeta del catálogo
  // ==========================================
  function crearTarjetaDeRestaurante(item) {
    const article = crearElemento("article", "restaurant-card");
    const photo = crearEnlace("", rutaDeFicha(item), "card-detail-link");
    const picture = crearElemento("div", "card-image");
    picture.append(
      crearImagen(item.thumbnail?.url, item.thumbnail?.altText || item.name),
    );
    photo.append(picture);
    const body = crearElemento("div", "card-body");
    const badges = crearElemento("div", "card-labels");
    const cuisines = crearElemento("div", "card-cuisines");
    (item.cuisineTypes || []).forEach((code) =>
      cuisines.append(crearElemento("span", "tag", traducirEtiqueta(code))),
    );
    const rating = crearElemento(
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
    const h3 = crearElemento("h3");
    h3.append(crearEnlace(item.name, rutaDeFicha(item)));
    const meta = crearElemento("p", "card-meta");
    const location = crearElemento(
      "span",
      "card-location",
      item.displayBranch?.address?.district || "Local por confirmar",
    );
    location.prepend(MesaIcons.icon("map-pin"));
    meta.append(
      location,
      crearElemento(
        "span",
        "price",
        formatearImporte(item.displayBranch?.averagePricePerPersonCents),
      ),
    );
    const action = crearEnlace(
      "Conocer restaurante",
      rutaDeFicha(item),
      "reserve",
    );
    action.append(MesaIcons.icon("arrow-right"));
    body.append(badges, h3, meta, action);
    article.append(photo, body);
    if (window.MesaFavoritos) article.append(MesaFavoritos.crearBoton(item));
    return article;
  }
  // ==========================================
  // Mostrar el diálogo y preparar su contenido
  // ==========================================
  function abrirModal(title, className = "") {
    const dialog = seleccionar("#modal");
    dialog.className = className;
    const content = seleccionar("#modal-content");
    content.replaceChildren(crearElemento("h2", "modal-title", title));
    content.firstElementChild.id = "modal-title";
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    return content;
  }
  // ==========================================
  // Mostrar un aviso de éxito o error
  // ==========================================
  function mostrarMensaje(container, message, error = false) {
    container.hidden = false;
    container.textContent = message;
    container.classList.toggle("is-error", error);
  }
  // ==========================================
  // Crear controles para recorrer las páginas
  // ==========================================
  function mostrarPaginacion(container, page, totalPages, callback) {
    container.replaceChildren();
    container.hidden = totalPages <= 1;
    const previous = crearBoton("", () => callback(page - 1));
    previous.append(MesaIcons.icon("chevron-left"));
    previous.disabled = page <= 1;
    previous.setAttribute("aria-label", "Página anterior");
    container.append(previous);
    [...new Set([1, page - 1, page, page + 1, totalPages])]
      .filter((p) => p >= 1 && p <= totalPages)
      .forEach((p) => {
        const b = crearBoton(String(p), () => callback(p));
        if (p === page) b.setAttribute("aria-current", "page");
        container.append(b);
      });
    const next = crearBoton("", () => callback(page + 1));
    next.append(MesaIcons.icon("chevron-right"));
    next.disabled = page >= totalPages;
    next.setAttribute("aria-label", "Página siguiente");
    container.append(next);
  }
  // ==========================================
  // Agregar un control con etiqueta al formulario
  // ==========================================
  function crearCampo(
    form,
    name,
    title,
    type = "text",
    value = "",
    options = {},
  ) {
    const wrap = crearElemento("label", "form-field", title);
    const input = crearElemento(
      type === "textarea" ? "textarea" : type === "select" ? "select" : "input",
    );
    input.name = name;
    if (input.tagName === "INPUT") input.type = type;
    if (options.choices)
      options.choices.forEach(([v, text]) => {
        const option = crearElemento("option", "", text);
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
    $: seleccionar,
    element: crearElemento,
    label: traducirEtiqueta,
    money: formatearImporte,
    safeUrl: validarUrl,
    image: crearImagen,
    button: crearBoton,
    link: crearEnlace,
    external: crearEnlaceExterno,
    pageUrl: rutaDePagina,
    detailUrl: rutaDeFicha,
    state: mostrarEstado,
    card: crearTarjetaDeRestaurante,
    modal: abrirModal,
    feedback: mostrarMensaje,
    paginate: mostrarPaginacion,
    field: crearCampo,
  };
})();
