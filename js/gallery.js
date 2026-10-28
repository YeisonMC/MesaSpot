(() => {
  "use strict";
  const { element, button, image, label, state } = MesaUI;
  const icon = (name) => MesaIcons.icon(name);
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
  function openViewer(records, initialIndex = 0) {
    if (!records.length) return;
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const dialog = element("dialog", "photo-viewer");
    dialog.setAttribute("aria-label", "Galería de fotografías del restaurante");
    const toolbar = element("div", "viewer-toolbar");
    const counter = element("p", "viewer-counter");
    counter.setAttribute("role", "status");
    counter.append(icon("images"), element("span"));
    const close = button("", () => dialog.close(), "viewer-close");
    close.setAttribute("aria-label", "Cerrar galería");
    close.append(icon("x"));
    toolbar.append(counter, close);
    const stage = element("div", "viewer-stage");
    const main = element("div", "swiper viewer-main");
    const wrapper = element("div", "swiper-wrapper");
    const previous = button("", null, "viewer-arrow viewer-prev");
    previous.setAttribute("aria-label", "Foto anterior");
    previous.append(icon("chevron-left"));
    const next = button("", null, "viewer-arrow viewer-next");
    next.setAttribute("aria-label", "Foto siguiente");
    next.append(icon("chevron-right"));
    const thumbnails = element("div", "swiper viewer-thumbs");
    thumbnails.setAttribute("aria-label", "Miniaturas de la galería");
    const thumbnailWrapper = element("div", "swiper-wrapper");
    const thumbnailButtons = [];
    records.forEach((photo, index) => {
      const slide = element("div", "swiper-slide viewer-slide");
      const photoImage = image(photo.url, photo.altText || photo.title);
      photoImage.loading = index === initialIndex ? "eager" : "lazy";
      const caption = element("div", "viewer-caption");
      caption.append(
        element("h2", "", photo.title),
        element("p", "", photo.altText || label(photo.type)),
      );
      slide.append(photoImage, caption);
      wrapper.append(slide);
      const thumb = element("div", "swiper-slide");
      const select = button("", null, "viewer-thumb");
      select.setAttribute(
        "aria-label",
        "Ver foto " + (index + 1) + ": " + photo.title,
      );
      select.append(image(photo.url, ""));
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
    function synchronize(activeIndex) {
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
          slideChange() {
            synchronize(this.activeIndex);
          },
        },
      });
      thumbnailButtons.forEach((thumb, i) =>
        thumb.addEventListener("click", () => mainSwiper.slideTo(i)),
      );
    } else {
      // Si el CDN falla, las flechas, miniaturas y el teclado siguen funcionando.
      const go = (value) => {
        const target = Math.max(0, Math.min(records.length - 1, value));
        [...wrapper.children].forEach((slide, i) => {
          slide.hidden = i !== target;
        });
        previous.disabled = target === 0;
        next.disabled = target === records.length - 1;
        synchronize(target);
      };
      previous.addEventListener("click", () => go(index - 1));
      next.addEventListener("click", () => go(index + 1));
      thumbnailButtons.forEach((thumb, i) =>
        thumb.addEventListener("click", () => go(i)),
      );
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          go(index + (event.key === "ArrowRight" ? 1 : -1));
        }
      });
      dialog.classList.add("viewer-without-swiper");
      go(initialIndex);
    }
    synchronize(initialIndex);
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
  function render({ panel, restaurant, branch, photos, menu = [] }) {
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
    const layout = element("div", "restaurant-gallery");
    const introduction = element(
      "section",
      "gallery-introduction detail-panel",
    );
    introduction.setAttribute("aria-labelledby", "gallery-heading");
    const heading = element("div", "gallery-heading");
    const badge = element("span", "panel-icon");
    badge.append(icon("camera"));
    const headingCopy = element("div");
    const h2 = element("h2", "", "Galería del restaurante");
    h2.id = "gallery-heading";
    headingCopy.append(
      h2,
      element(
        "p",
        "",
        "Descubre la esencia de " +
          restaurant.name +
          " a través de nuestras fotos. Ambiente, platos y momentos únicos.",
      ),
    );
    heading.append(badge, headingCopy);
    introduction.append(heading);
    const filters = element("div", "gallery-filters");
    filters.setAttribute("role", "group");
    filters.setAttribute("aria-label", "Filtrar fotos por categoría");
    categories
      .filter(([type]) => !type || records.some((p) => p.type === type))
      .forEach(([type, title, symbol]) => {
        const count = records.filter((p) => !type || p.type === type).length;
        const filter = button(
          "",
          () => {
            selectedType = type;
            expanded = false;
            render({ panel, restaurant, branch, photos, menu });
          },
          "gallery-filter",
        );
        if (type) filter.append(icon(symbol));
        filter.append(
          element("span", "", title),
          element("span", "", "(" + count + ")"),
        );
        filter.setAttribute("aria-pressed", String(type === selectedType));
        filters.append(filter);
      });
    introduction.append(filters);
    const sidebar = element("aside", "gallery-summary detail-panel");
    sidebar.setAttribute("aria-label", "Resumen de la galería");
    const total = element("div", "gallery-stat");
    total.append(icon("images"));
    const totalText = element("div");
    totalText.append(
      element(
        "strong",
        "",
        records.length + (records.length === 1 ? " foto" : " fotos"),
      ),
      element("span", "", "de nuestro restaurante"),
    );
    total.append(totalText);
    sidebar.append(total);
    if (featured) {
      const highlight = element("div", "gallery-stat gallery-featured");
      highlight.append(icon("eye"));
      const description = element("div");
      description.append(
        element("strong", "", "Plato destacado"),
        element("span", "", featured.title),
      );
      const preview = button(
        "",
        () => openViewer(records, records.indexOf(featured)),
        "gallery-featured-preview",
      );
      preview.setAttribute("aria-label", "Ver " + featured.title);
      preview.append(image(featured.url, ""));
      highlight.append(description, preview);
      sidebar.append(highlight);
    }
    const share = button(
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
    share.append(icon("share-2"), element("span", "", "Compartir galería"));
    sidebar.append(share);
    const filtered = records.filter(
      (p) => !selectedType || p.type === selectedType,
    );
    const grid = element("div", "gallery-mosaic");
    grid.setAttribute("aria-label", "Fotografías del restaurante");
    filtered.slice(0, expanded ? undefined : 8).forEach((photo, index) => {
      const figure = element("figure", "gallery-tile");
      figure.dataset.aos = "fade-up";
      figure.dataset.aosDelay = String(Math.min((index % 5) * 35, 140));
      const open = button(
        "",
        () => openViewer(filtered, index),
        "gallery-photo-button",
      );
      open.setAttribute("aria-label", "Ampliar " + photo.title);
      open.append(image(photo.url, photo.altText || photo.title));
      const caption = element(
        "figcaption",
        photo === featured
          ? "gallery-photo-label is-featured"
          : "gallery-photo-label",
      );
      caption.append(
        icon(
          photo === featured
            ? "crown"
            : categories.find((c) => c[0] === photo.type)?.[2] || "image",
        ),
        element(
          "span",
          "",
          photo === featured ? "Plato estrella" : label(photo.type),
        ),
      );
      figure.append(open, caption);
      grid.append(figure);
    });
    if (!filtered.length) state(grid, "No hay fotos en esta categoría.");
    layout.append(introduction, sidebar, grid);
    if (filtered.length > 8 && !expanded) {
      const more = button(
        "Ver las " + filtered.length + " fotos",
        () => {
          expanded = true;
          render({ panel, restaurant, branch, photos, menu });
        },
        "gallery-show-more",
      );
      layout.append(more);
    }
    panel.append(layout);
    window.AOS?.refreshHard();
  }
  window.MesaGallery = { render, openViewer };
})();
