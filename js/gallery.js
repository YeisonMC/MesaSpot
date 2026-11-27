// ==========================================
// Galería de fotos y visor del restaurante
// ==========================================

(() => {
  "use strict";
  const {
    element: crearElemento,
    button: crearBoton,
    image: crearImagen,
    label: traducirEtiqueta,
    state: mostrarEstado,
  } = MesaUI;
  // ==========================================
  // Crear un icono de la galería
  // ==========================================
  const crearIcono = (name) => MesaIcons.icon(name);
  const categories = [
    ["", "Todo", "images"],
    ["AMBIENCE", "Ambiente", "image"],
    ["DISH", "Platos", "utensils-crossed"],
    ["DESSERT", "Postres", "cake-slice"],
    ["TERRACE", "Terraza", "sun"],
    ["DRINK", "Bebidas", "wine"],
    ["OTHER", "Otros", "grid-2x2"],
  ];
  let selectedType = "",
    expanded = false;

  // Construye el visor a partir de las mismas fotos filtradas, sin nuevas peticiones.
  // ==========================================
  // Abrir el visor desde la foto seleccionada
  // ==========================================
  function abrirVisorDeFotos(records, initialIndex = 0) {
    if (!records.length) return;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialog = crearElemento("dialog", "photo-viewer");
    dialog.setAttribute("aria-label", "Galería de fotografías del restaurante");
    const toolbar = crearElemento("div", "viewer-toolbar");
    const counter = crearElemento("p", "viewer-counter");
    counter.setAttribute("role", "status");
    counter.append(crearIcono("images"), crearElemento("span"));
    const close = crearBoton("", () => dialog.close(), "viewer-close");
    close.setAttribute("aria-label", "Cerrar galería");
    close.append(crearIcono("x"));
    toolbar.append(counter, close);
    const stage = crearElemento("div", "viewer-stage");
    const main = crearElemento("div", "swiper viewer-main");
    const wrapper = crearElemento("div", "swiper-wrapper");
    const previous = crearBoton("", null, "viewer-arrow viewer-prev");
    previous.setAttribute("aria-label", "Foto anterior");
    previous.append(crearIcono("chevron-left"));
    const next = crearBoton("", null, "viewer-arrow viewer-next");
    next.setAttribute("aria-label", "Foto siguiente");
    next.append(crearIcono("chevron-right"));
    const thumbnails = crearElemento("div", "swiper viewer-thumbs");
    thumbnails.setAttribute("aria-label", "Miniaturas de la galería");
    const thumbnailWrapper = crearElemento("div", "swiper-wrapper");
    const thumbnailButtons = [];
    records.forEach((photo, index) => {
      const slide = crearElemento("div", "swiper-slide viewer-slide");
      const photoImage = crearImagen(photo.url, photo.altText || photo.title);
      photoImage.loading = index === initialIndex ? "eager" : "lazy";
      const caption = crearElemento("div", "viewer-caption");
      caption.append(
        crearElemento("h2", "", photo.title),
        crearElemento("p", "", photo.altText || traducirEtiqueta(photo.type)),
      );
      slide.append(photoImage, caption);
      wrapper.append(slide);
      const thumb = crearElemento("div", "swiper-slide");
      const select = crearBoton("", null, "viewer-thumb");
      select.setAttribute(
        "aria-label",
        "Ver foto " + (index + 1) + ": " + photo.title,
      );
      select.append(crearImagen(photo.url, ""));
      thumbnailButtons.push(select);
      thumb.append(select);
      thumbnailWrapper.append(thumb);
    });
    main.append(wrapper);
    stage.append(main, previous, next);
    thumbnails.append(thumbnailWrapper);
    dialog.append(toolbar, stage, thumbnails);
    document.body.append(dialog);
    document.body.style.overflow = "hidden";
    dialog.showModal();
    let mainSwiper,
      thumbsSwiper,
      index = initialIndex;

    // Mantiene sincronizados contador, miniatura activa y controles accesibles.
    // ==========================================
    // Actualizar contador, texto y miniatura de la foto activa
    // ==========================================
    function sincronizarFotoActiva(activeIndex) {
      index = activeIndex;
      counter.lastElementChild.textContent = index + 1 + " / " + records.length;
      [...wrapper.children].forEach((slide, i) =>
        slide.setAttribute("aria-hidden", String(i !== index)),
      );
      thumbnailButtons.forEach((thumb, i) => {
        thumb.setAttribute("aria-current", String(i === index));
      });
    }
    if (window.Swiper) {
      const reduceMotion = matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      thumbsSwiper = new Swiper(thumbnails, {
        slidesPerView: "auto",
        spaceBetween: 8,
        freeMode: true,
        watchSlidesProgress: true,
      });
      mainSwiper = new Swiper(main, {
        initialSlide: initialIndex,
        speed: reduceMotion ? 0 : 320,
        keyboard: { enabled: true, onlyInViewport: false },
        navigation: { prevEl: previous, nextEl: next },
        thumbs: { swiper: thumbsSwiper },
        a11y: {
          prevSlideMessage: "Foto anterior",
          nextSlideMessage: "Foto siguiente",
          slideLabelMessage: "Foto {{index}} de {{slidesLength}}",
        },
        on: {
          // ==========================================
          // Sincronizar el visor cuando Swiper cambia de foto
          // ==========================================
          slideChange: function sincronizarCambioDeDiapositiva() {
            sincronizarFotoActiva(this.activeIndex);
          },
        },
      });
      thumbnailButtons.forEach((thumb, i) =>
        thumb.addEventListener("click", () => mainSwiper.slideTo(i)),
      );
    } else {
      // Si el CDN falla, las flechas, miniaturas y el teclado siguen funcionando.
      // ==========================================
      // Cambiar la foto del visor sin Swiper
      // ==========================================
      const irAFoto = (value) => {
        const target = Math.max(0, Math.min(records.length - 1, value));
        [...wrapper.children].forEach((slide, i) => {
          slide.hidden = i !== target;
        });
        previous.disabled = target === 0;
        next.disabled = target === records.length - 1;
        sincronizarFotoActiva(target);
      };
      previous.addEventListener("click", () => irAFoto(index - 1));
      next.addEventListener("click", () => irAFoto(index + 1));
      thumbnailButtons.forEach((thumb, i) =>
        thumb.addEventListener("click", () => irAFoto(i)),
      );
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          irAFoto(index + (event.key === "ArrowRight" ? 1 : -1));
        }
      });
      dialog.classList.add("viewer-without-swiper");
      irAFoto(initialIndex);
    }
    sincronizarFotoActiva(initialIndex);
    dialog.addEventListener(
      "close",
      () => {
        mainSwiper?.destroy(true, true);
        thumbsSwiper?.destroy(true, true);
        document.body.style.overflow = previousOverflow;
        dialog.remove();
        if (opener?.isConnected) opener.focus({ preventScroll: true });
      },
      { once: true },
    );
    close.focus({ preventScroll: true });
  }

  // Presenta el mosaico, las categorías con sus cantidades y el resumen lateral.
  // ==========================================
  // Mostrar el mosaico y los filtros de la galería
  // ==========================================
  function mostrarGaleria({ panel, restaurant, branch, photos, menu = [] }) {
    panel.replaceChildren();
    const records = photos
      .filter((p) => !p.branchId || p.branchId === branch?._id)
      .slice()
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const featured =
      records.find((p) =>
        menu.some(
          (item) => item.photoId === p._id && item.recommendation?.featured,
        ),
      ) || records.find((p) => p.type === "DISH");
    const layout = crearElemento("div", "restaurant-gallery");
    const introduction = crearElemento(
      "section",
      "gallery-introduction detail-panel",
    );
    introduction.setAttribute("aria-labelledby", "gallery-heading");
    const heading = crearElemento("div", "gallery-heading");
    const badge = crearElemento("span", "panel-icon");
    badge.append(crearIcono("camera"));
    const headingCopy = crearElemento("div");
    const h2 = crearElemento("h2", "", "Galería del restaurante");
    h2.id = "gallery-heading";
    headingCopy.append(
      h2,
      crearElemento(
        "p",
        "",
        "Descubre la esencia de " +
          restaurant.name +
          " a través de nuestras fotos. Ambiente, platos y momentos únicos.",
      ),
    );
    heading.append(badge, headingCopy);
    introduction.append(heading);
    const filters = crearElemento("div", "gallery-filters");
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", "Filtrar fotos por categoría");
    categories
      .filter(([type]) => !type || records.some((p) => p.type === type))
      .forEach(([type, title, symbol]) => {
        const count = records.filter((p) => !type || p.type === type).length;
        const filter = crearBoton(
          "",
          () => {
            selectedType = type;
            expanded = false;
            mostrarGaleria({ panel, restaurant, branch, photos, menu });
          },
          "gallery-filter",
        );
        if (type) filter.append(crearIcono(symbol));
        filter.append(
          crearElemento("span", "", title),
          crearElemento("span", "", "(" + count + ")"),
        );
        filter.setAttribute("aria-pressed", String(type === selectedType));
        filters.append(filter);
      });
    introduction.append(filters);
    const sidebar = crearElemento("aside", "gallery-summary detail-panel");
    sidebar.setAttribute("aria-label", "Resumen de la galería");
    const total = crearElemento("div", "gallery-stat");
    total.append(crearIcono("images"));
    const totalText = crearElemento("div");
    totalText.append(
      crearElemento(
        "strong",
        "",
        records.length + (records.length === 1 ? " foto" : " fotos"),
      ),
      crearElemento("span", "", "de nuestro restaurante"),
    );
    total.append(totalText);
    sidebar.append(total);
    if (featured) {
      const highlight = crearElemento("div", "gallery-stat gallery-featured");
      highlight.append(crearIcono("eye"));
      const description = crearElemento("div");
      description.append(
        crearElemento("strong", "", "Plato destacado"),
        crearElemento("span", "", featured.title),
      );
      const preview = crearBoton(
        "",
        () => abrirVisorDeFotos(records, records.indexOf(featured)),
        "gallery-featured-preview",
      );
      preview.setAttribute("aria-label", "Ver " + featured.title);
      preview.append(crearImagen(featured.url, ""));
      highlight.append(description, preview);
      sidebar.append(highlight);
    }
    const share = crearBoton(
      "",
      async () => {
        const url = new URL(location.href);
        url.hash = "photos";
        try {
          if (navigator.share)
            await navigator.share({
              title: restaurant.name + " · Galería",
              url: url.href,
            });
          else if (navigator.clipboard) {
            await navigator.clipboard.writeText(url.href);
            share.lastElementChild.textContent = "Enlace copiado";
          } else {
            const content = MesaUI.modal("Comparte esta galería");
            const field = MesaUI.field(
              content,
              "galleryLink",
              "Enlace de la galería",
              "url",
              url.href,
            );
            field.readOnly = true;
            field.select();
          }
        } catch (error) {
          if (error.name !== "AbortError")
            share.lastElementChild.textContent = "No se pudo compartir";
        }
      },
      "gallery-share",
    );
    share.append(
      crearIcono("share-2"),
      crearElemento("span", "", "Compartir galería"),
    );
    sidebar.append(share);
    const filtered = records.filter(
      (p) => !selectedType || p.type === selectedType,
    );
    const grid = crearElemento("div", "gallery-mosaic");
    grid.setAttribute("aria-label", "Fotografías del restaurante");
    filtered.slice(0, expanded ? undefined : 8).forEach((photo, index) => {
      const figure = crearElemento("figure", "gallery-tile");
      figure.dataset.aos = "fade-up";
      figure.dataset.aosDelay = String(Math.min((index % 5) * 35, 140));
      const open = crearBoton(
        "",
        () => abrirVisorDeFotos(filtered, index),
        "gallery-photo-button",
      );
      open.setAttribute("aria-label", "Ampliar " + photo.title);
      open.append(crearImagen(photo.url, photo.altText || photo.title));
      const caption = crearElemento(
        "figcaption",
        photo === featured
          ? "gallery-photo-label is-featured"
          : "gallery-photo-label",
      );
      caption.append(
        crearIcono(
          photo === featured
            ? "crown"
            : categories.find((c) => c[0] === photo.type)?.[2] || "image",
        ),
        crearElemento(
          "span",
          "",
          photo === featured ? "Plato estrella" : traducirEtiqueta(photo.type),
        ),
      );
      figure.append(open, caption);
      grid.append(figure);
    });
    if (!filtered.length)
      mostrarEstado(grid, "No hay fotos en esta categoría.");
    layout.append(introduction, sidebar, grid);
    if (filtered.length > 8 && !expanded) {
      const more = crearBoton(
        "Ver las " + filtered.length + " fotos",
        () => {
          expanded = true;
          mostrarGaleria({ panel, restaurant, branch, photos, menu });
        },
        "gallery-show-more",
      );
      layout.append(more);
    }
    panel.append(layout);
    window.AOS?.refreshHard();
  }
  window.MesaGallery = {
    render: mostrarGaleria,
    openViewer: abrirVisorDeFotos,
  };
})();
