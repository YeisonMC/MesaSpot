(() => {
  "use strict";
  const { $, element, button, field, state, link, feedback, modal, pageUrl } =
    MesaUI;
  const icon = (name) => MesaIcons.icon(name);
  const maxBytes = 5 * 1024 * 1024;
  const formats = ["image/jpeg", "image/png", "image/webp"];
  let user,
    previewUrl,
    selectedFile,
    pendingPublicId,
    saving = false,
    viewVersion = 0;
  const host = $("#profile-content");

  // Liberamos las vistas previas locales al cancelar, cambiar de sección o salir de la página.
  function clearPhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    selectedFile = null;
    pendingPublicId = null;
  }
  window.addEventListener("pagehide", clearPhoto);
  function identity() {
    const area = $("#profile-identity");
    const text = element("div");
    text.append(
      element(
        "strong",
        "",
        [user.firstName, user.lastName].filter(Boolean).join(" "),
      ),
      element("span", "", user.email),
    );
    area.replaceChildren(MesaAuth.avatar(user, "profile-sidebar-avatar"), text);
  }
  function heading(title, copy) {
    const area = element("div", "profile-heading");
    area.append(element("h1", "", title), element("p", "", copy));
    return area;
  }
  function selectView() {
    const view = ["profile", "reviews", "help"].includes(location.hash.slice(1))
      ? location.hash.slice(1)
      : "profile";
    document.querySelectorAll("[data-profile-view]").forEach((item) => {
      if (item.dataset.profileView === view)
        item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    if (view === "reviews") renderReviews();
    else if (view === "help") renderHelp();
    else renderProfile();
  }

  // La imagen viaja directamente a Cloudinary con firma del backend; no pasa por el disco de Vercel.
  async function uploadAvatar(file) {
    if (pendingPublicId) return pendingPublicId;
    const { data } = await MesaAPI.request("/users/me/avatar/signature", {
      method: "POST",
      authenticated: true,
    });
    const url = new URL(data.uploadUrl);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "api.cloudinary.com" ||
      !url.pathname.endsWith("/image/upload")
    )
      throw new Error("El servicio de fotos devolvió una dirección inválida.");
    if (file.size > Math.min(data.maxBytes, maxBytes))
      throw new Error("La foto debe pesar como máximo 5 MB.");
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", data.apiKey);
    form.append("signature", data.signature);
    Object.entries(data.params).forEach(([key, value]) =>
      form.append(key, String(value)),
    );
    let result, response;
    try {
      response = await fetch(url.href, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(120000),
      });
      result = await response.json();
    } catch {
      throw new Error(
        "No se pudo subir tu foto. Revisa tu conexión e inténtalo de nuevo.",
      );
    }
    if (!response.ok || result.public_id !== data.params.public_id)
      throw new Error(
        "Cloudinary no pudo recibir la foto. Prueba con otra imagen JPG, PNG o WebP.",
      );
    pendingPublicId = result.public_id;
    return pendingPublicId;
  }

  // El formulario permite editar nombres, apellidos y celular; el correo permanece de solo lectura.
  function renderProfile() {
    ++viewVersion;
    clearPhoto();
    host.replaceChildren(
      heading(
        "Mi perfil",
        "Gestiona tu información personal y mantén tus datos actualizados.",
      ),
    );
    const form = element("form", "profile-form");
    const photo = element("section", "profile-photo-card");
    const portrait = element("div", "profile-portrait-wrap");
    const avatar = element("div", "profile-portrait");
    avatar.append(MesaAuth.avatar(user, "profile-large-avatar"));
    const file = element("input");
    file.type = "file";
    file.name = "avatar";
    file.id = "profile-photo-input";
    file.accept = formats.join(",");
    file.hidden = true;
    const camera = button("", () => file.click(), "profile-camera");
    camera.setAttribute("aria-label", "Elegir foto de perfil");
    camera.append(icon("camera"));
    portrait.append(avatar, camera);
    const photoCopy = element("div", "profile-photo-copy");
    photoCopy.append(
      element("h2", "", "Foto de perfil"),
      element(
        "p",
        "",
        "Una foto ayuda a personalizar tu experiencia en MesaSpot.",
      ),
    );
    const change = button(
      "Cambiar foto",
      () => file.click(),
      "profile-outline-button",
    );
    change.prepend(icon("upload"));
    photoCopy.append(
      change,
      element(
        "p",
        "profile-photo-hint",
        "Formatos permitidos: JPG, PNG y WebP. Tamaño máximo: 5 MB.",
      ),
    );
    const photoStatus = element("p", "profile-photo-status");
    photoStatus.setAttribute("role", "status");
    photoCopy.append(photoStatus);
    photo.append(portrait, photoCopy, file);
    form.append(photo);
    // La selección solo genera una vista previa; la subida se realiza al guardar los cambios.
    file.addEventListener("change", () => {
      const candidate = file.files?.[0];
      if (!candidate) return;
      clearPhoto();
      if (
        !formats.includes(candidate.type) ||
        !candidate.size ||
        candidate.size > maxBytes
      ) {
        file.value = "";
        avatar.replaceChildren(MesaAuth.avatar(user, "profile-large-avatar"));
        feedback(
          photoStatus,
          "Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.",
          true,
        );
        return;
      }
      selectedFile = candidate;
      previewUrl = URL.createObjectURL(candidate);
      const picture = element("img");
      picture.src = previewUrl;
      picture.alt = "Vista previa de tu nueva foto de perfil";
      picture.addEventListener(
        "error",
        () => {
          if (!picture.isConnected) return;
          clearPhoto();
          file.value = "";
          avatar.replaceChildren(MesaAuth.avatar(user, "profile-large-avatar"));
          feedback(
            photoStatus,
            "No se pudo leer esta imagen. Selecciona otra foto.",
            true,
          );
        },
        { once: true },
      );
      avatar.replaceChildren(picture);
      feedback(
        photoStatus,
        "Foto seleccionada. Guarda los cambios para actualizarla.",
      );
    });
    const info = element("section", "profile-info-card");
    info.append(
      element("h2", "", "Información personal"),
      element(
        "p",
        "profile-section-description",
        "Actualiza tus datos personales. Tu nombre y foto se muestran en tus reseñas.",
      ),
    );
    const fields = element("div", "profile-fields");
    const firstName = field(
      fields,
      "firstName",
      "Nombres *",
      "text",
      user.firstName,
      { required: true, maxlength: "80", autocomplete: "given-name" },
    );
    const lastName = field(
      fields,
      "lastName",
      "Apellidos *",
      "text",
      user.lastName,
      { required: true, maxlength: "80", autocomplete: "family-name" },
    );
    const emailWrap = element("div", "profile-email-field");
    const email = field(
      emailWrap,
      "email",
      "Correo electrónico",
      "email",
      user.email,
      { readonly: true, autocomplete: "email" },
    );
    email.setAttribute("aria-describedby", "profile-email-hint");
    const emailHint = element(
      "p",
      "profile-field-hint",
      "El correo electrónico no se puede modificar.",
    );
    emailHint.id = "profile-email-hint";
    emailWrap.append(emailHint);
    fields.append(emailWrap);
    const phoneWrap = element(
      "label",
      "form-field profile-phone-field",
      "Número de celular",
    );
    const phoneRow = element("span", "profile-phone-control");
    phoneRow.append(element("span", "profile-country-code", "+51"));
    const phone = element("input");
    phone.type = "tel";
    phone.name = "phone";
    phone.inputMode = "numeric";
    phone.autocomplete = "tel-national";
    phone.maxLength = 14;
    phone.placeholder = "987654321";
    phone.value = (user.phone || "").replace(/^\+51/, "");
    phone.setAttribute("aria-describedby", "profile-phone-hint");
    phoneRow.append(phone);
    phoneWrap.append(phoneRow);
    const phoneHint = element(
      "span",
      "profile-field-hint",
      "Celular peruano de 9 dígitos. Campo opcional.",
    );
    phoneHint.id = "profile-phone-hint";
    phoneWrap.append(phoneHint);
    fields.append(phoneWrap);
    function validateFields() {
      [firstName, lastName].forEach((input) =>
        input.setCustomValidity(
          input.value.trim()
            ? ""
            : "Completa este campo con tu nombre o apellido.",
        ),
      );
      phone.setCustomValidity(
        phone.value && !/^9\d{8}$/.test(phone.value)
          ? "Ingresa un celular de 9 dígitos que empiece con 9."
          : "",
      );
    }
    [firstName, lastName].forEach((input) =>
      input.addEventListener("input", validateFields),
    );
    phone.addEventListener("input", () => {
      phone.value = phone.value.replace(/\D/g, "").replace(/^51(?=\d{9}$)/, "");
      validateFields();
    });
    info.append(fields);
    const status = element("p", "profile-save-status");
    status.setAttribute("role", "alert");
    status.hidden = true;
    const actions = element("div", "profile-form-actions");
    const cancel = button(
      "Cancelar",
      () => renderProfile(),
      "profile-outline-button",
    );
    const submit = element("button", "button", "Guardar cambios");
    submit.type = "submit";
    actions.append(cancel, submit);
    info.append(status, actions);
    form.append(info);
    host.append(form);
    const privacy = element("div", "profile-privacy");
    privacy.append(icon("shield-check"));
    const privacyCopy = element("div");
    privacyCopy.append(
      element("strong", "", "Tu información personal"),
      element(
        "p",
        "",
        "Tu nombre y avatar acompañan tus reseñas. El correo y el celular no se muestran públicamente.",
      ),
    );
    privacy.append(privacyCopy);
    host.append(privacy);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      validateFields();
      if (saving || !form.reportValidity()) return;
      saving = true;
      submit.disabled = true;
      cancel.disabled = true;
      change.disabled = true;
      camera.disabled = true;
      const ownerId = user._id;
      try {
        const body = {
          firstName: firstName.value.trim(),
          lastName: lastName.value.trim(),
          phone: phone.value ? "+51" + phone.value : null,
        };
        if (selectedFile) {
          submit.textContent = "Subiendo foto…";
          body.avatarPublicId = await uploadAvatar(selectedFile);
        }
        if (MesaAPI.session?.user?._id !== ownerId) return;
        submit.textContent = "Guardando…";
        const { data } = await MesaAPI.request("/users/me", {
          method: "PATCH",
          body,
          authenticated: true,
        });
        if (MesaAPI.session?.user?._id !== ownerId) return;
        // La respuesta actualiza la sesión y el avatar del header sin recargar toda la página.
        MesaAPI.updateUser(data);
        user = data;
        clearPhoto();
        identity();
        renderProfile();
        const content = modal("¡Cambios guardados!", "profile-success-modal");
        const check = element("span", "profile-success-icon");
        check.append(icon("check"));
        content.prepend(check);
        content.append(
          element("p", "", "Tu perfil se actualizó correctamente."),
          button("Continuar", () => $("#modal").close(), "button"),
        );
      } catch (error) {
        if (form.isConnected) feedback(status, error.message, true);
      } finally {
        saving = false;
        submit.disabled = false;
        cancel.disabled = false;
        change.disabled = false;
        camera.disabled = false;
        submit.textContent = "Guardar cambios";
      }
    });
  }

  // Mis reseñas consulta únicamente opiniones del usuario autenticado y enlaza cada restaurante.
  async function renderReviews() {
    clearPhoto();
    const version = ++viewVersion;
    host.replaceChildren(
      heading(
        "Mis reseñas",
        "Estas son las experiencias que has compartido con la comunidad.",
      ),
    );
    const list = element("div", "profile-reviews-list");
    host.append(list);
    state(list, "Cargando tus reseñas…");
    try {
      const records = await MesaAPI.all(
        "/users/me/reviews",
        {},
        { authenticated: true },
      );
      if (version !== viewVersion) return;
      list.replaceChildren();
      if (!records.length) {
        state(list, "Todavía no has publicado reseñas.");
        list.append(
          link("Explorar restaurantes", pageUrl("restaurantes.html"), "button"),
        );
        return;
      }
      records.forEach((review) => {
        const card = element("article", "profile-review-card");
        if (review.restaurant?.name)
          card.append(
            element("p", "profile-review-restaurant", review.restaurant.name),
          );
        const meta = element("div", "profile-review-meta");
        const score = element(
          "span",
          "",
          Number(review.ratings.overall).toFixed(1) + " / 5",
        );
        score.prepend(icon("star"));
        meta.append(score);
        const date = new Date(review.visitedAt);
        if (Number.isFinite(date.getTime()))
          meta.append(
            element(
              "span",
              "",
              "Visita: " +
                new Intl.DateTimeFormat("es-PE", {
                  dateStyle: "medium",
                  timeZone: "America/Lima",
                }).format(date),
            ),
          );
        card.append(
          meta,
          element("h2", "", review.title),
          element("p", "", review.comment),
        );
        const scores = element("div", "profile-review-scores");
        [
          ["food", "Comida"],
          ["service", "Servicio"],
          ["ambience", "Ambiente"],
        ].forEach(([key, name]) =>
          scores.append(element("span", "", name + " " + review.ratings[key])),
        );
        const url = pageUrl(
          "restaurante.html?id=" +
            encodeURIComponent(review.restaurantId) +
            "#reviews",
        );
        const detail = link(
          "Ver mi reseña en el restaurante",
          url,
          "text-link",
        );
        detail.append(icon("arrow-right"));
        card.append(scores, detail);
        list.append(card);
      });
    } catch (error) {
      if (version === viewVersion) state(list, error.message, renderReviews);
    }
  }
  function renderHelp() {
    ++viewVersion;
    clearPhoto();
    host.replaceChildren(
      heading(
        "¿Cómo podemos ayudarte?",
        "Resuelve las dudas más frecuentes sobre tu cuenta.",
      ),
    );
    [
      [
        "¿Cómo cambio mi foto?",
        "Elige Cambiar foto, selecciona un archivo JPG, PNG o WebP de hasta 5 MB y pulsa Guardar cambios.",
      ],
      [
        "¿Qué datos puedo modificar?",
        "Puedes editar tus nombres, apellidos y celular. Tu correo se mantiene como identificador de acceso.",
      ],
      [
        "¿Dónde edito mis reseñas?",
        "En Mis reseñas abre el restaurante correspondiente. Desde su pestaña Reseñas puedes editar o retirar tu opinión.",
      ],
      [
        "¿Puedo gestionar reservas o favoritos?",
        "Estas funciones todavía están en preparación. Por ahora puedes explorar restaurantes y compartir tu experiencia.",
      ],
    ].forEach(([question, answer]) => {
      const block = element("details", "profile-help-item");
      block.append(element("summary", "", question), element("p", "", answer));
      host.append(block);
    });
  }

  // La pantalla privada se habilita después de verificar la sesión y se limpia al cerrarla.
  function sessionChanged(value) {
    const previousId = user?._id;
    user = value;
    const allowed = user?.role === "CLIENT";
    $("#profile-shell").hidden = !allowed;
    if (!allowed) {
      ++viewVersion;
      clearPhoto();
      host.replaceChildren();
      const status = $("#profile-status");
      state(
        status,
        user
          ? "Esta pantalla está disponible para cuentas de cliente."
          : "Inicia sesión para gestionar tu perfil.",
      );
      if (!user)
        status.append(button("Iniciar sesión", () => MesaAuth.open("login")));
      else
        status.append(
          link("Ir a administración", pageUrl("administracion.html"), "button"),
        );
      return;
    }
    $("#profile-status").replaceChildren();
    identity();
    if (previousId !== user._id || !host.children.length) selectView();
  }
  window.addEventListener("hashchange", () => {
    if (user?.role === "CLIENT") selectView();
  });
  document.querySelector(".profile-nav").addEventListener("click", (event) => {
    if (saving) event.preventDefault();
  });
  $("#profile-logout").addEventListener("click", () => MesaAPI.logout());
  state($("#profile-status"), "Cargando tu perfil…");
  MesaAuth.ready.then((verified) => {
    sessionChanged(verified);
    window.addEventListener("mesa:session", (event) =>
      sessionChanged(event.detail),
    );
  });
})();
