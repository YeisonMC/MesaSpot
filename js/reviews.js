(() => {
  "use strict";
  const { element, button, image, field, state, modal, feedback } = MesaUI;
  const icon = (name) => MesaIcons.icon(name);
  const criteria = [
    ["food", "Comida"],
    ["service", "Servicio"],
    ["ambience", "Ambiente"],
  ];
  const wordCount = (value) =>
    value.trim().split(/\s+/u).filter(Boolean).length;
  let version = 0,
    sort = "recent",
    context;

  // Las animaciones se aplican a bloques completos y respetan el movimiento reducido.
  function animate(node) {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      node.dataset.aos = "fade-up";
    return node;
  }
  function stars(value) {
    const row = element("div", "review-stars");
    row.setAttribute(
      "aria-label",
      Number(value).toFixed(1) + " de 5 estrellas",
    );
    for (let i = 1; i <= 5; i++) {
      const star = icon("star");
      star.classList.toggle("filled", i <= Math.round(value));
      row.append(star);
    }
    return row;
  }
  function authorName(user) {
    return (
      [user?.firstName, user?.lastName ? user.lastName[0] + "." : ""]
        .filter(Boolean)
        .join(" ") || "Cliente de MesaSpot"
    );
  }
  function timeAgo(value) {
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
  function reviewCard(review) {
    const card = element("article", "review-card customer-review");
    const header = element("div", "customer-review-header");
    const author = element("div", "customer-review-author");
    const initials =
      [review.user?.firstName?.[0], review.user?.lastName?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase() || "MS";
    const avatar = MesaUI.safeUrl(review.user?.avatarUrl)
      ? image(review.user.avatarUrl, "", "review-avatar")
      : element("span", "review-initials", initials);
    const name = element("div", "review-person");
    const top = element("div", "review-person-name");
    top.append(element("strong", "", authorName(review.user)));
    if (review.verifiedVisit) {
      const verified = icon("badge-check");
      verified.setAttribute("role", "img");
      verified.setAttribute("aria-label", "Visita verificada");
      verified.removeAttribute("aria-hidden");
      top.append(verified);
    }
    name.append(top);
    const date = new Date(review.createdAt || review.visitedAt);
    if (Number.isFinite(date.getTime())) {
      const time = element("time", "", timeAgo(date));
      time.dateTime = date.toISOString();
      time.title = new Intl.DateTimeFormat("es-PE", {
        dateStyle: "long",
        timeZone: "America/Lima",
      }).format(date);
      name.append(time);
    }
    author.append(avatar, name);
    header.append(author, stars(review.ratings.overall));
    card.append(
      header,
      element("h3", "", review.title),
      element("p", "review-comment", review.comment),
    );
    const scores = element("div", "review-score-chips");
    criteria.forEach(([code, title]) => {
      const chip = element("span", "", title + " ");
      chip.append(
        element("strong", "", Number(review.ratings[code]).toFixed(1)),
      );
      scores.append(chip);
    });
    card.append(scores);
    if (review.adminReply) {
      const reply = element("blockquote", "admin-reply");
      reply.append(
        element("strong", "", "Respuesta del restaurante"),
        element("p", "", review.adminReply.comment),
      );
      card.append(reply);
    }
    return card;
  }

  // La política describe capacidades reales: todavía no existe verificación automática de reservas.
  function policies() {
    const card = element("section", "detail-panel review-policies");
    const title = element("h3", "");
    title.append(
      icon("shield-check"),
      document.createTextNode("Políticas de reseña"),
    );
    card.append(
      title,
      element(
        "p",
        "",
        "Comparte una opinión honesta sobre tu experiencia. Las reseñas se publican desde cuentas de cliente.",
      ),
    );
    const list = element("ul");
    [
      "Experiencias propias y recientes",
      "Comentarios respetuosos y útiles",
      "Sin incentivos por puntuar mejor",
    ].forEach((text) => {
      const li = element("li", "", text);
      li.prepend(icon("check"));
      list.append(li);
    });
    const more = button(
      "Ver políticas completas",
      () => {
        const content = modal("Políticas de reseña", "review-policy-modal");
        [
          "Publica una sola reseña por restaurante; puedes editarla o retirarla desde tu cuenta.",
          "Valora comida, servicio y ambiente de 1 a 5. El promedio de estas tres puntuaciones determina la valoración general.",
          "Escribe entre 10 y 5000 caracteres, con un máximo de 500 palabras. Evita datos personales, publicidad, insultos y contenido ajeno a tu visita.",
          "Los administradores pueden responder opiniones de sus restaurantes, pero no publicar reseñas como clientes.",
          "Una cuenta registrada no equivale a una visita verificada. Actualmente MesaSpot no comprueba reservas ni modera automáticamente el contenido.",
        ].forEach((text) => content.append(element("p", "", text)));
      },
      "text-link review-policy-link",
    );
    more.append(icon("arrow-right"));
    card.append(list, more);
    return card;
  }

  // El formulario modal envía únicamente las tres calificaciones; el servidor calcula la general.
  function openForm(ownReview) {
    const user = MesaAPI.session?.user;
    if (user?.role !== "CLIENT")
      return user ? undefined : MesaAuth.open("login");
    const { restaurant, branches, selectedBranch } = context;
    const content = modal(
      ownReview ? "Editar tu reseña" : "Escribir una reseña",
      "review-modal",
    );
    content.append(
      element(
        "p",
        "review-modal-intro",
        "Comparte tu experiencia en " +
          restaurant.name +
          ". Tu opinión ayuda a otros comensales.",
      ),
    );
    const note = element(
      "p",
      "review-form-notice",
      "Opina sobre una visita que hayas realizado. Tu reseña se publicará con tu nombre de perfil.",
    );
    note.prepend(icon("info"));
    content.append(note);
    const form = element("form", "review-form");
    const visit = element("div", "review-visit-fields");
    field(
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
    field(
      visit,
      "visitedAt",
      "Fecha de visita",
      "date",
      ownReview?.visitedAt?.slice(0, 10) || "",
      { required: true, max: today },
    );
    form.append(visit);
    form.append(element("h3", "review-ratings-heading", "Calificaciones"));
    const groups = element("div", "review-rating-groups");
    criteria.forEach(([code, title]) => {
      const group = element("fieldset", "review-rating-group");
      group.append(element("legend", "", title));
      const choices = element("div", "review-rating-choices");
      const labels = [];
      for (let i = 1; i <= 5; i++) {
        const choice = element("label", "review-rating-star");
        const input = element("input");
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
        choice.append(input, icon("star"));
        labels.push(choice);
        choices.append(choice);
      }
      group.append(choices);
      groups.append(group);
    });
    form.append(groups);
    const comment = field(
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
    const counter = element("p", "review-word-count");
    counter.id = "review-word-count";
    counter.setAttribute("aria-live", "polite");
    comment.setAttribute("aria-describedby", counter.id);
    function validateComment() {
      const words = wordCount(comment.value);
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
    comment.addEventListener("input", validateComment);
    validateComment();
    form.append(counter);
    const status = element("p", "auth-feedback");
    status.setAttribute("role", "alert");
    status.hidden = true;
    const actions = element("div", "review-form-actions");
    const cancel = button(
      "Cancelar",
      () => document.getElementById("modal").close(),
      "review-cancel",
    );
    const submit = element(
      "button",
      "button",
      ownReview ? "Guardar cambios" : "Publicar reseña",
    );
    submit.type = "submit";
    actions.append(cancel, submit);
    form.append(status, actions);
    content.append(form);
    let saving = false;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      validateComment();
      if (saving || !form.reportValidity()) return;
      if (MesaAPI.session?.user?.role !== "CLIENT")
        return feedback(
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
        if (form.isConnected) showSuccess(Boolean(ownReview));
        await context.onPublished().catch(() => {});
        await render(context);
      } catch (error) {
        if (form.isConnected) feedback(status, error.message, true);
      } finally {
        saving = false;
        submit.disabled = false;
        cancel.disabled = false;
        submit.textContent = ownReview ? "Guardar cambios" : "Publicar reseña";
      }
    });
  }

  // La confirmación se muestra únicamente después de que la API acepte la escritura.
  function showSuccess(edited) {
    const content = modal(
      edited ? "¡Reseña actualizada!" : "¡Reseña publicada!",
      "review-modal review-success-modal",
    );
    const badge = element("span", "review-success-icon");
    badge.append(icon("check"));
    content.prepend(badge);
    content.append(
      element(
        "p",
        "",
        "Gracias por compartir tu experiencia en " +
          context.restaurant.name +
          ". Tu opinión ya está disponible para otros comensales.",
      ),
    );
    content.append(
      button(
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
  function removeOwnReview(review) {
    const content = modal("Retirar mi reseña", "review-policy-modal");
    content.append(
      element(
        "p",
        "",
        "Tu opinión dejará de aparecer en el restaurante. Podrás compartir una nueva experiencia más adelante.",
      ),
    );
    const status = element("p", "auth-feedback");
    status.setAttribute("role", "alert");
    const remove = button(
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
          await render(context);
        } catch (error) {
          feedback(status, error.message, true);
          remove.disabled = false;
        }
      },
      "button",
    );
    content.append(remove, status);
  }

  // El listado conserva orden y paginación, y descarta respuestas de sesiones anteriores.
  async function render(options) {
    context = options;
    const current = ++version;
    const { panel, restaurant, branches } = options;
    panel.replaceChildren();
    const layout = element("div", "reviews-layout");
    const main = animate(element("div", "reviews-main"));
    const title = element("div", "reviews-heading");
    title.append(
      element("h2", "", "Reseñas de comensales"),
      element("p", "", "Experiencias y opiniones de nuestra comunidad."),
    );
    main.append(title);
    const summary = element("section", "review-overview");
    summary.setAttribute("aria-label", "Resumen de valoraciones");
    const average = restaurant.ratingSummary || {};
    const overall = element("div", "review-overall");
    const score = element(
      "strong",
      "",
      average.reviewCount
        ? Number(average.overall).toFixed(1) + " de 5.0"
        : "Sin valoraciones",
    );
    score.prepend(icon("star"));
    overall.append(
      score,
      element(
        "p",
        "",
        average.reviewCount
          ? "Basado en " +
              average.reviewCount +
              (average.reviewCount === 1 ? " reseña" : " reseñas")
          : "Sé la primera persona en compartir tu opinión.",
      ),
    );
    const dimensions = element("div", "review-dimensions");
    criteria.forEach(([code, name]) => {
      const item = element("div");
      item.append(
        element(
          "strong",
          "",
          average.reviewCount && Number.isFinite(average[code])
            ? average[code].toFixed(1)
            : "—",
        ),
        element("span", "", name),
      );
      dimensions.append(item);
    });
    summary.append(overall, dimensions);
    main.append(summary);
    const toolbar = element("div", "reviews-toolbar");
    const orderText = element("span", "", "Mostrando las más recientes");
    const select = element("select");
    select.setAttribute("aria-label", "Ordenar reseñas");
    [
      ["recent", "Más recientes"],
      ["highest", "Mejor valoradas"],
      ["lowest", "Menor valoración"],
    ].forEach(([code, text]) => {
      const option = element("option", "", text);
      option.value = code;
      select.append(option);
    });
    select.value = sort;
    toolbar.append(orderText, select);
    main.append(toolbar);
    const list = element("div", "customer-review-list");
    list.setAttribute("aria-live", "polite");
    const listStatus = element("div");
    const more = button(
      "Ver más reseñas",
      () => loadPage(page + 1),
      "reviews-load-more",
    );
    more.hidden = true;
    main.append(list, listStatus, more);
    const sidebar = animate(element("aside", "reviews-sidebar"));
    const action = element("section", "detail-panel review-action-card");
    const badge = element("span", "review-action-icon");
    badge.append(icon("message-square-plus"));
    action.append(badge, element("h3", "", "Cuéntanos tu experiencia"));
    sidebar.append(action, policies());
    layout.append(main, sidebar);
    panel.append(layout);
    const user = MesaAPI.session?.user;
    if (!user) {
      action.append(
        element(
          "p",
          "",
          "Inicia sesión para compartir una opinión útil con la comunidad.",
        ),
      );
      const locked = element(
        "p",
        "review-account-required",
        "Necesitas una cuenta de cliente para escribir una reseña.",
      );
      locked.prepend(icon("lock-keyhole"));
      action.append(
        locked,
        button(
          "Iniciar sesión",
          () => MesaAuth.open("login"),
          "button review-login",
        ),
      );
    } else if (user.role !== "CLIENT") {
      action.append(
        element(
          "p",
          "",
          "Los administradores no pueden publicar reseñas. Puedes responder las opiniones de tus restaurantes desde Administrar.",
        ),
      );
    } else if (!branches.length) {
      action.append(
        element(
          "p",
          "",
          "El restaurante necesita un local publicado para recibir reseñas.",
        ),
      );
    } else {
      action.append(
        element(
          "p",
          "",
          "Cuéntanos cómo fue tu visita y ayuda a otros comensales a elegir.",
        ),
      );
      const ownStatus = element("div");
      action.append(ownStatus);
      async function ownAction() {
        state(ownStatus, "Comprobando tus reseñas…");
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
          const write = button(
            own ? "Editar mi reseña" : "Escribir una reseña",
            () => openForm(own),
            "button review-write",
          );
          write.prepend(icon("square-pen"));
          ownStatus.append(write);
          if (own)
            ownStatus.append(
              button(
                "Retirar mi reseña",
                () => removeOwnReview(own),
                "text-link review-remove",
              ),
            );
        } catch (error) {
          if (current === version) state(ownStatus, error.message, ownAction);
        }
      }
      ownAction();
    }
    let page = 0,
      loading = false,
      loadVersion = 0;
    async function loadPage(next) {
      if (loading) return;
      loading = true;
      more.disabled = true;
      const requestVersion = ++loadVersion;
      state(listStatus, "Cargando reseñas…");
      try {
        const result = await MesaAPI.request(
          "/restaurants/" +
            restaurant._id +
            "/reviews" +
            MesaAPI.query({ page: next, limit: 3, sort }),
        );
        if (current !== version || requestVersion !== loadVersion) return;
        if (next === 1) list.replaceChildren();
        result.data.forEach((review) => list.append(reviewCard(review)));
        page = next;
        listStatus.replaceChildren();
        if (!list.children.length)
          state(
            listStatus,
            "Todavía no hay reseñas. Comparte la primera experiencia.",
          );
        more.hidden = page >= result.meta.totalPages;
      } catch (error) {
        if (current === version)
          state(listStatus, error.message, () => loadPage(next));
      } finally {
        loading = false;
        more.disabled = false;
      }
    }
    select.addEventListener("change", () => {
      sort = select.value;
      orderText.textContent =
        sort === "recent"
          ? "Mostrando las más recientes"
          : sort === "highest"
            ? "Mostrando las mejor valoradas"
            : "Mostrando las de menor valoración";
      // Un nuevo render cancela lógicamente las respuestas anteriores sin mezclar distintos órdenes.
      render(context);
    });
    orderText.textContent =
      sort === "recent"
        ? "Mostrando las más recientes"
        : sort === "highest"
          ? "Mostrando las mejor valoradas"
          : "Mostrando las de menor valoración";
    window.AOS?.refreshHard();
    await loadPage(1);
  }
  window.MesaReviews = { render };
})();
