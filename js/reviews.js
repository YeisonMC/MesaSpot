// ==========================================
// Reseñas, puntuaciones y publicación de opiniones
// ==========================================

(() => {
  "use strict";
  const {
    element: crearElemento,
    button: crearBoton,
    image: crearImagen,
    field: crearCampo,
    state: mostrarEstado,
    modal: abrirModal,
    feedback: mostrarMensaje,
  } = MesaUI;
  // ==========================================
  // Crear un icono de reseñas
  // ==========================================
  const crearIcono = (name) => MesaIcons.icon(name);
  const criteria = [
    ["food", "Comida"],
    ["service", "Servicio"],
    ["ambience", "Ambiente"],
  ];
  // ==========================================
  // Contar las palabras del comentario
  // ==========================================
  const contarPalabras = (value) =>
    value.trim().split(/\s+/u).filter(Boolean).length;
  let version = 0,
    sort = "recent",
    context;

  // Las animaciones se aplican a bloques completos y respetan el movimiento reducido.
  // ==========================================
  // Preparar la animación de la reseña
  // ==========================================
  function prepararAnimacion(node) {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      node.dataset.aos = "fade-up";
    return node;
  }
  // ==========================================
  // Mostrar la puntuación con estrellas accesibles
  // ==========================================
  function crearEstrellas(value) {
    const row = crearElemento("div", "review-stars");
    row.setAttribute(
      "aria-label",
      Number(value).toFixed(1) + " de 5 estrellas",
    );
    for (let i = 1; i <= 5; i++) {
      const star = crearIcono("star");
      star.classList.toggle("filled", i <= Math.round(value));
      row.append(star);
    }
    return row;
  }
  // ==========================================
  // Preparar el nombre público del autor
  // ==========================================
  function formatearNombreDelAutor(user) {
    return (
      [user?.firstName, user?.lastName ? user.lastName[0] + "." : ""]
        .filter(Boolean)
        .join(" ") || "Cliente de MesaSpot"
    );
  }
  // ==========================================
  // Mostrar cuánto tiempo pasó desde la publicación
  // ==========================================
  function formatearTiempoTranscurrido(value) {
    const stamp = new Date(value).getTime();
    if (!Number.isFinite(stamp)) return "";
    const days = Math.max(0, Math.floor((Date.now() - stamp) / 86400000));
    return new Intl.RelativeTimeFormat("es", { numeric: "auto" }).format(
      days < 30
        ? -days
        : days < 365
          ? -Math.floor(days / 30)
          : -Math.floor(days / 365),
      days < 30 ? "day" : days < 365 ? "month" : "year",
    );
  }

  // Cada opinión usa texto seguro y solo muestra verificación cuando la API la confirma.
  // ==========================================
  // Construir una tarjeta con la opinión del cliente
  // ==========================================
  function crearTarjetaDeResena(review) {
    const card = crearElemento("article", "review-card customer-review");
    const header = crearElemento("div", "customer-review-header");
    const author = crearElemento("div", "customer-review-author");
    const initials =
      [review.user?.firstName?.[0], review.user?.lastName?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase() || "MS";
    const avatar = MesaUI.safeUrl(review.user?.avatarUrl)
      ? crearImagen(review.user.avatarUrl, "", "review-avatar")
      : crearElemento("span", "review-initials", initials);
    const name = crearElemento("div", "review-person");
    const top = crearElemento("div", "review-person-name");
    top.append(
      crearElemento("strong", "", formatearNombreDelAutor(review.user)),
    );
    if (review.verifiedVisit) {
      const verified = crearIcono("badge-check");
      verified.setAttribute("role", "img");
      verified.setAttribute("aria-label", "Visita verificada");
      verified.removeAttribute("aria-hidden");
      top.append(verified);
    }
    name.append(top);
    const date = new Date(review.createdAt || review.visitedAt);
    if (Number.isFinite(date.getTime())) {
      const time = crearElemento("time", "", formatearTiempoTranscurrido(date));
      time.dateTime = date.toISOString();
      time.title = new Intl.DateTimeFormat("es-PE", {
        dateStyle: "long",
        timeZone: "America/Lima",
      }).format(date);
      name.append(time);
    }
    author.append(avatar, name);
    header.append(author, crearEstrellas(review.ratings.overall));
    card.append(
      header,
      crearElemento("h3", "", review.title),
      crearElemento("p", "review-comment", review.comment),
    );
    const scores = crearElemento("div", "review-score-chips");
    criteria.forEach(([code, title]) => {
      const chip = crearElemento("span", "", title + " ");
      chip.append(
        crearElemento("strong", "", Number(review.ratings[code]).toFixed(1)),
      );
      scores.append(chip);
    });
    card.append(scores);
    if (review.adminReply) {
      const reply = crearElemento("blockquote", "admin-reply");
      reply.append(
        crearElemento("strong", "", "Respuesta del restaurante"),
        crearElemento("p", "", review.adminReply.comment),
      );
      card.append(reply);
    }
    return card;
  }

  // La política describe capacidades reales: todavía no existe verificación automática de reservas.
  // ==========================================
  // Mostrar las reglas de publicación de reseñas
  // ==========================================
  function crearPanelDePoliticas() {
    const card = crearElemento("section", "detail-panel review-policies");
    const title = crearElemento("h3", "");
    title.append(
      crearIcono("shield-check"),
      document.createTextNode("Políticas de reseña"),
    );
    card.append(
      title,
      crearElemento(
        "p",
        "",
        "Comparte una opinión honesta sobre tu experiencia. Las reseñas se publican desde cuentas de cliente.",
      ),
    );
    const list = crearElemento("ul");
    [
      "Experiencias propias y recientes",
      "Comentarios respetuosos y útiles",
      "Sin incentivos por puntuar mejor",
    ].forEach((text) => {
      const li = crearElemento("li", "", text);
      li.prepend(crearIcono("check"));
      list.append(li);
    });
    const more = crearBoton(
      "Ver políticas completas",
      () => {
        const content = abrirModal(
          "Políticas de reseña",
          "review-policy-modal",
        );
        [
          "Publica una sola reseña por restaurante; puedes editarla o retirarla desde tu cuenta.",
          "Valora comida, servicio y ambiente de 1 a 5. El promedio de estas tres puntuaciones determina la valoración general.",
          "Escribe entre 10 y 5000 caracteres, con un máximo de 500 palabras. Evita datos personales, publicidad, insultos y contenido ajeno a tu visita.",
          "Los administradores pueden responder opiniones de sus restaurantes, pero no publicar reseñas como clientes.",
          "Una cuenta registrada no equivale a una visita verificada. Actualmente MesaSpot no comprueba reservas ni modera automáticamente el contenido.",
        ].forEach((text) => content.append(crearElemento("p", "", text)));
      },
      "text-link review-policy-link",
    );
    more.append(crearIcono("arrow-right"));
    card.append(list, more);
    return card;
  }

  // El formulario modal envía únicamente las tres calificaciones; el servidor calcula la general.
  // ==========================================
  // Abrir el formulario para publicar o editar una reseña
  // ==========================================
  function abrirFormularioDeResena(ownReview) {
    const user = MesaAPI.session?.user;
    if (user?.role !== "CLIENT")
      return user ? undefined : MesaAuth.open("login");
    const { restaurant, branches, selectedBranch } = context;
    const content = abrirModal(
      ownReview ? "Editar tu reseña" : "Escribir una reseña",
      "review-modal",
    );
    content.append(
      crearElemento(
        "p",
        "review-modal-intro",
        "Comparte tu experiencia en " +
          restaurant.name +
          ". Tu opinión ayuda a otros comensales.",
      ),
    );
    const note = crearElemento(
      "p",
      "review-form-notice",
      "Opina sobre una visita que hayas realizado. Tu reseña se publicará con tu nombre de perfil.",
    );
    note.prepend(crearIcono("info"));
    content.append(note);
    const form = crearElemento("form", "review-form");
    const visit = crearElemento("div", "review-visit-fields");
    crearCampo(
      visit,
      "branchId",
      "Local visitado",
      "select",
      ownReview?.branchId || selectedBranch?._id,
      {
        required: true,
        choices: branches.map((branch) => [branch._id, branch.name]),
      },
    );
    const today = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Lima",
    }).format(new Date());
    crearCampo(
      visit,
      "visitedAt",
      "Fecha de visita",
      "date",
      ownReview?.visitedAt?.slice(0, 10) || "",
      { required: true, max: today },
    );
    form.append(visit);
    form.append(
      crearElemento("h3", "review-ratings-heading", "Calificaciones"),
    );
    const groups = crearElemento("div", "review-rating-groups");
    criteria.forEach(([code, title]) => {
      const group = crearElemento("fieldset", "review-rating-group");
      group.append(crearElemento("legend", "", title));
      const choices = crearElemento("div", "review-rating-choices");
      const labels = [];
      for (let i = 1; i <= 5; i++) {
        const choice = crearElemento("label", "review-rating-star");
        const input = crearElemento("input");
        input.type = "radio";
        input.name = code;
        input.value = String(i);
        input.required = true;
        input.setAttribute(
          "aria-label",
          title + ": " + i + (i === 1 ? " estrella" : " estrellas"),
        );
        input.checked = ownReview?.ratings[code] === i;
        choice.classList.toggle(
          "selected",
          i <= (ownReview?.ratings[code] || 0),
        );
        input.addEventListener("change", () =>
          labels.forEach((node, index) =>
            node.classList.toggle("selected", index < i),
          ),
        );
        choice.append(input, crearIcono("star"));
        labels.push(choice);
        choices.append(choice);
      }
      group.append(choices);
      groups.append(group);
    });
    form.append(groups);
    const comment = crearCampo(
      form,
      "comment",
      "Comentario",
      "textarea",
      ownReview?.comment || "",
      {
        required: true,
        minlength: "10",
        maxlength: "5000",
        rows: "5",
        placeholder: "¿Qué te gustó? ¿Qué podríamos mejorar?",
      },
    );
    const counter = crearElemento("p", "review-word-count");
    counter.id = "review-word-count";
    counter.setAttribute("aria-live", "polite");
    comment.setAttribute("aria-describedby", counter.id);
    // ==========================================
    // Validar el comentario y actualizar su contador
    // ==========================================
    function validarComentario() {
      const words = contarPalabras(comment.value);
      counter.textContent =
        words + "/500 palabras · " + comment.value.length + "/5000 caracteres";
      counter.classList.toggle("is-error", words > 500);
      comment.setCustomValidity(
        words > 500
          ? "Tu comentario no puede superar las 500 palabras."
          : comment.value.trim().length < 10
            ? "Escribe al menos 10 caracteres."
            : "",
      );
    }
    comment.addEventListener("input", validarComentario);
    validarComentario();
    form.append(counter);
    const status = crearElemento("p", "auth-feedback");
    status.setAttribute("role", "alert");
    status.hidden = true;
    const actions = crearElemento("div", "review-form-actions");
    const cancel = crearBoton(
      "Cancelar",
      () => document.getElementById("modal").close(),
      "review-cancel",
    );
    const submit = crearElemento(
      "button",
      "button",
      ownReview ? "Guardar cambios" : "Publicar reseña",
    );
    submit.type = "submit";
    actions.append(cancel, submit);
    form.append(status, actions);
    content.append(form);
    let saving = false;
    // ==========================================
    // Validar y guardar la opinión del cliente
    // ==========================================
    const guardarResena = async (event) => {
      event.preventDefault();
      validarComentario();
      if (saving || !form.reportValidity()) return;
      if (MesaAPI.session?.user?.role !== "CLIENT")
        return mostrarMensaje(
          status,
          "Inicia sesión con una cuenta de cliente para publicar.",
          true,
        );
      saving = true;
      submit.disabled = true;
      cancel.disabled = true;
      submit.textContent = "Publicando…";
      try {
        const values = Object.fromEntries(new FormData(form));
        const text = values.comment.trim();
        const body = {
          branchId: values.branchId,
          title:
            ownReview?.title ||
            text.split(/\s+/u).slice(0, 9).join(" ").slice(0, 120),
          comment: text,
          ratings: Object.fromEntries(
            criteria.map(([code]) => [code, Number(values[code])]),
          ),
          visitedAt: new Date(
            values.visitedAt + "T00:00:00-05:00",
          ).toISOString(),
        };
        await MesaAPI.request(
          "/restaurants/" +
            restaurant._id +
            "/reviews" +
            (ownReview ? "/" + ownReview._id : ""),
          { method: ownReview ? "PATCH" : "POST", body, authenticated: true },
        );
        // Una lectura fallida tras guardar no debe inducir una segunda publicación.
        if (form.isConnected) mostrarConfirmacionDeResena(Boolean(ownReview));
        await context.onPublished().catch(() => {});
        await mostrarPanelDeResenas(context);
      } catch (error) {
        if (form.isConnected) mostrarMensaje(status, error.message, true);
      } finally {
        saving = false;
        submit.disabled = false;
        cancel.disabled = false;
        submit.textContent = ownReview ? "Guardar cambios" : "Publicar reseña";
      }
    };

    form.addEventListener("submit", guardarResena);
  }

  // La confirmación se muestra únicamente después de que la API acepte la escritura.
  // ==========================================
  // Confirmar que se publicó o actualizó la reseña
  // ==========================================
  function mostrarConfirmacionDeResena(edited) {
    const content = abrirModal(
      edited ? "¡Reseña actualizada!" : "¡Reseña publicada!",
      "review-modal review-success-modal",
    );
    const badge = crearElemento("span", "review-success-icon");
    badge.append(crearIcono("check"));
    content.prepend(badge);
    content.append(
      crearElemento(
        "p",
        "",
        "Gracias por compartir tu experiencia en " +
          context.restaurant.name +
          ". Tu opinión ya está disponible para otros comensales.",
      ),
    );
    content.append(
      crearBoton(
        "Ver todas las reseñas",
        () => {
          document.getElementById("modal").close();
          document.getElementById("tab-reviews").click();
          document.getElementById("panel-reviews").focus();
        },
        "button",
      ),
    );
    document.getElementById("modal-title").tabIndex = -1;
    document.getElementById("modal-title").focus();
  }

  // Solo el cliente autor puede editar o retirar una reseña; el servidor valida la propiedad.
  // ==========================================
  // Confirmar y retirar la reseña propia
  // ==========================================
  function retirarResenaPropia(review) {
    const content = abrirModal("Retirar mi reseña", "review-policy-modal");
    content.append(
      crearElemento(
        "p",
        "",
        "Tu opinión dejará de aparecer en el restaurante. Podrás compartir una nueva experiencia más adelante.",
      ),
    );
    const status = crearElemento("p", "auth-feedback");
    status.setAttribute("role", "alert");
    const remove = crearBoton(
      "Retirar reseña",
      async () => {
        remove.disabled = true;
        try {
          await MesaAPI.request(
            "/restaurants/" + context.restaurant._id + "/reviews/" + review._id,
            { method: "DELETE", authenticated: true },
          );
          document.getElementById("modal").close();
          await context.onPublished().catch(() => {});
          await mostrarPanelDeResenas(context);
        } catch (error) {
          mostrarMensaje(status, error.message, true);
          remove.disabled = false;
        }
      },
      "button",
    );
    content.append(remove, status);
  }

  // El listado conserva orden y paginación, y descarta respuestas de sesiones anteriores.
  // ==========================================
  // Mostrar el resumen, las opiniones y sus acciones
  // ==========================================
  async function mostrarPanelDeResenas(options) {
    context = options;
    const current = ++version;
    const { panel, restaurant, branches } = options;
    panel.replaceChildren();
    const layout = crearElemento("div", "reviews-layout");
    const main = prepararAnimacion(crearElemento("div", "reviews-main"));
    const title = crearElemento("div", "reviews-heading");
    title.append(
      crearElemento("h2", "", "Reseñas de comensales"),
      crearElemento("p", "", "Experiencias y opiniones de nuestra comunidad."),
    );
    main.append(title);
    const summary = crearElemento("section", "review-overview");
    summary.setAttribute("aria-label", "Resumen de valoraciones");
    const average = restaurant.ratingSummary || {};
    const overall = crearElemento("div", "review-overall");
    const score = crearElemento(
      "strong",
      "",
      average.reviewCount
        ? Number(average.overall).toFixed(1) + " de 5.0"
        : "Sin valoraciones",
    );
    score.prepend(crearIcono("star"));
    overall.append(
      score,
      crearElemento(
        "p",
        "",
        average.reviewCount
          ? "Basado en " +
              average.reviewCount +
              (average.reviewCount === 1 ? " reseña" : " reseñas")
          : "Sé la primera persona en compartir tu opinión.",
      ),
    );
    const dimensions = crearElemento("div", "review-dimensions");
    criteria.forEach(([code, name]) => {
      const item = crearElemento("div");
      item.append(
        crearElemento(
          "strong",
          "",
          average.reviewCount && Number.isFinite(average[code])
            ? average[code].toFixed(1)
            : "—",
        ),
        crearElemento("span", "", name),
      );
      dimensions.append(item);
    });
    summary.append(overall, dimensions);
    main.append(summary);
    const toolbar = crearElemento("div", "reviews-toolbar");
    const orderText = crearElemento("span", "", "Mostrando las más recientes");
    const select = crearElemento("select");
    select.setAttribute("aria-label", "Ordenar reseñas");
    [
      ["recent", "Más recientes"],
      ["highest", "Mejor valoradas"],
      ["lowest", "Menor valoración"],
    ].forEach(([code, text]) => {
      const option = crearElemento("option", "", text);
      option.value = code;
      select.append(option);
    });
    select.value = sort;
    toolbar.append(orderText, select);
    main.append(toolbar);
    const list = crearElemento("div", "customer-review-list");
    list.setAttribute("aria-live", "polite");
    const listStatus = crearElemento("div");
    const more = crearBoton(
      "Ver más reseñas",
      () => cargarPaginaDeResenas(page + 1),
      "reviews-load-more",
    );
    more.hidden = true;
    main.append(list, listStatus, more);
    const sidebar = prepararAnimacion(
      crearElemento("aside", "reviews-sidebar"),
    );
    const action = crearElemento("section", "detail-panel review-action-card");
    const badge = crearElemento("span", "review-action-icon");
    badge.append(crearIcono("message-square-plus"));
    action.append(badge, crearElemento("h3", "", "Cuéntanos tu experiencia"));
    sidebar.append(action, crearPanelDePoliticas());
    layout.append(main, sidebar);
    panel.append(layout);
    const user = MesaAPI.session?.user;
    if (!user) {
      action.append(
        crearElemento(
          "p",
          "",
          "Inicia sesión para compartir una opinión útil con la comunidad.",
        ),
      );
      const locked = crearElemento(
        "p",
        "review-account-required",
        "Necesitas una cuenta de cliente para escribir una reseña.",
      );
      locked.prepend(crearIcono("lock-keyhole"));
      action.append(
        locked,
        crearBoton(
          "Iniciar sesión",
          () => MesaAuth.open("login"),
          "button review-login",
        ),
      );
    } else if (user.role !== "CLIENT") {
      action.append(
        crearElemento(
          "p",
          "",
          "Los administradores no pueden publicar reseñas. Puedes responder las opiniones de tus restaurantes desde Administrar.",
        ),
      );
    } else if (!branches.length) {
      action.append(
        crearElemento(
          "p",
          "",
          "El restaurante necesita un local publicado para recibir reseñas.",
        ),
      );
    } else {
      action.append(
        crearElemento(
          "p",
          "",
          "Cuéntanos cómo fue tu visita y ayuda a otros comensales a elegir.",
        ),
      );
      const ownStatus = crearElemento("div");
      action.append(ownStatus);
      // ==========================================
      // Consultar la reseña propia para habilitar su gestión
      // ==========================================
      async function mostrarAccionesDeResenaPropia() {
        mostrarEstado(ownStatus, "Comprobando tus reseñas…");
        try {
          const mine = await MesaAPI.all(
            "/users/me/reviews",
            {},
            { authenticated: true },
          );
          if (current !== version) return;
          const own = mine.find(
            (review) => review.restaurantId === restaurant._id,
          );
          ownStatus.replaceChildren();
          const write = crearBoton(
            own ? "Editar mi reseña" : "Escribir una reseña",
            () => abrirFormularioDeResena(own),
            "button review-write",
          );
          write.prepend(crearIcono("square-pen"));
          ownStatus.append(write);
          if (own)
            ownStatus.append(
              crearBoton(
                "Retirar mi reseña",
                () => retirarResenaPropia(own),
                "text-link review-remove",
              ),
            );
        } catch (error) {
          if (current === version)
            mostrarEstado(
              ownStatus,
              error.message,
              mostrarAccionesDeResenaPropia,
            );
        }
      }
      mostrarAccionesDeResenaPropia();
    }
    let page = 0,
      loading = false,
      loadVersion = 0;
    // ==========================================
    // Cargar la página de reseñas solicitada
    // ==========================================
    async function cargarPaginaDeResenas(next) {
      if (loading) return;
      loading = true;
      more.disabled = true;
      const requestVersion = ++loadVersion;
      mostrarEstado(listStatus, "Cargando reseñas…");
      try {
        const result = await MesaAPI.request(
          "/restaurants/" +
            restaurant._id +
            "/reviews" +
            MesaAPI.query({ page: next, limit: 3, sort }),
        );
        if (current !== version || requestVersion !== loadVersion) return;
        if (next === 1) list.replaceChildren();
        result.data.forEach((review) =>
          list.append(crearTarjetaDeResena(review)),
        );
        page = next;
        listStatus.replaceChildren();
        if (!list.children.length)
          mostrarEstado(
            listStatus,
            "Todavía no hay reseñas. Comparte la primera experiencia.",
          );
        more.hidden = page >= result.meta.totalPages;
      } catch (error) {
        if (current === version)
          mostrarEstado(listStatus, error.message, () =>
            cargarPaginaDeResenas(next),
          );
      } finally {
        loading = false;
        more.disabled = false;
      }
    }
    // ==========================================
    // Recargar las reseñas al cambiar el orden
    // ==========================================
    const cambiarOrdenDeResenas = () => {
      sort = select.value;
      orderText.textContent =
        sort === "recent"
          ? "Mostrando las más recientes"
          : sort === "highest"
            ? "Mostrando las mejor valoradas"
            : "Mostrando las de menor valoración";
      // Un nuevo render cancela lógicamente las respuestas anteriores sin mezclar distintos órdenes.
      mostrarPanelDeResenas(context);
    };

    select.addEventListener("change", cambiarOrdenDeResenas);
    orderText.textContent =
      sort === "recent"
        ? "Mostrando las más recientes"
        : sort === "highest"
          ? "Mostrando las mejor valoradas"
          : "Mostrando las de menor valoración";
    window.AOS?.refreshHard();
    await cargarPaginaDeResenas(1);
  }
  window.MesaReviews = { render: mostrarPanelDeResenas };
})();
