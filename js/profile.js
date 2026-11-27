// ==========================================
// Perfil del cliente, avatar, reservas, favoritos y reseñas propias
// ==========================================

(() => {
  "use strict";
  const {
    $: seleccionar,
    element: crearElemento,
    button: crearBoton,
    field: crearCampo,
    state: mostrarEstado,
    link: crearEnlace,
    feedback: mostrarMensaje,
    modal: abrirModal,
    pageUrl: rutaDePagina,
  } = MesaUI;
  // ==========================================
  // Crear un icono del perfil
  // ==========================================
  const crearIcono = (name) => MesaIcons.icon(name);
  const maxBytes = 5 * 1024 * 1024;
  const formats = ["image/jpeg", "image/png", "image/webp"];
  let user,
    previewUrl,
    selectedFile,
    pendingPublicId,
    saving = false,
    viewVersion = 0;
  const host = seleccionar("#profile-content");

  // Liberamos las vistas previas locales al cancelar, cambiar de sección o salir de la página.
  // ==========================================
  // Liberar la vista previa y limpiar la foto pendiente
  // ==========================================
  function limpiarVistaPrevia() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    selectedFile = null;
    pendingPublicId = null;
  }
  window.addEventListener("pagehide", limpiarVistaPrevia);
  // ==========================================
  // Actualizar el nombre y el avatar del cliente
  // ==========================================
  function mostrarIdentidadDelCliente() {
    const area = seleccionar("#profile-identity");
    const text = crearElemento("div");
    text.append(
      crearElemento(
        "strong",
        "",
        [user.firstName, user.lastName].filter(Boolean).join(" "),
      ),
      crearElemento("span", "", user.email),
    );
    area.replaceChildren(MesaAuth.avatar(user, "profile-sidebar-avatar"), text);
  }
  // ==========================================
  // Crear el título y la descripción de la vista
  // ==========================================
  function crearCabeceraDePerfil(title, copy) {
    const area = crearElemento("div", "profile-heading");
    area.append(crearElemento("h1", "", title), crearElemento("p", "", copy));
    return area;
  }
  // ==========================================
  // Abrir la vista del perfil indicada por el enlace
  // ==========================================
  function seleccionarVistaDelPerfil() {
    const view = ["profile", "reservations", "favorites", "reviews", "help"].includes(
      location.hash.slice(1),
    )
      ? location.hash.slice(1)
      : "profile";
    document.querySelectorAll("[data-profile-view]").forEach((item) => {
      if (item.dataset.profileView === view)
        item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    if (view === "reservations") mostrarMisReservas();
    else if (view === "favorites") mostrarMisFavoritos();
    else if (view === "reviews") mostrarMisResenas();
    else if (view === "help") mostrarAyudaDelPerfil();
    else mostrarFormularioDePerfil();
  }

  // ==========================================
  // Abrir las reservas dentro del perfil del cliente
  // ==========================================
  function mostrarMisReservas() {
    limpiarVistaPrevia();
    ++viewVersion;
    const panel = crearElemento("div", "profile-reservations");
    host.replaceChildren(
      crearCabeceraDePerfil("Mis reservas", "Consulta tus próximas reservas y tu historial."),
      panel,
    );
    MesaReservas.mostrar(panel);
  }

  // La imagen viaja directamente a Cloudinary con firma del backend; no pasa por el disco de Vercel.
  // ==========================================
  // Firmar y subir la foto de perfil
  // ==========================================
  async function subirFotoDePerfil(file) {
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
  // ==========================================
  // Mostrar el formulario de datos personales
  // ==========================================
  function mostrarFormularioDePerfil() {
    ++viewVersion;
    limpiarVistaPrevia();
    host.replaceChildren(
      crearCabeceraDePerfil(
        "Mi perfil",
        "Gestiona tu información personal y mantén tus datos actualizados.",
      ),
    );
    const form = crearElemento("form", "profile-form");
    const photo = crearElemento("section", "profile-photo-card");
    const portrait = crearElemento("div", "profile-portrait-wrap");
    const avatar = crearElemento("div", "profile-portrait");
    avatar.append(MesaAuth.avatar(user, "profile-large-avatar"));
    const file = crearElemento("input");
    file.type = "file";
    file.name = "avatar";
    file.id = "profile-photo-input";
    file.accept = formats.join(",");
    file.hidden = true;
    const camera = crearBoton("", () => file.click(), "profile-camera");
    camera.setAttribute("aria-label", "Elegir foto de perfil");
    camera.append(crearIcono("camera"));
    portrait.append(avatar, camera);
    const photoCopy = crearElemento("div", "profile-photo-copy");
    photoCopy.append(
      crearElemento("h2", "", "Foto de perfil"),
      crearElemento(
        "p",
        "",
        "Una foto ayuda a personalizar tu experiencia en MesaSpot.",
      ),
    );
    const change = crearBoton(
      "Cambiar foto",
      () => file.click(),
      "profile-outline-button",
    );
    change.prepend(crearIcono("upload"));
    photoCopy.append(
      change,
      crearElemento(
        "p",
        "profile-photo-hint",
        "Formatos permitidos: JPG, PNG y WebP. Tamaño máximo: 5 MB.",
      ),
    );
    const photoStatus = crearElemento("p", "profile-photo-status");
    photoStatus.setAttribute("role", "status");
    photoCopy.append(photoStatus);
    photo.append(portrait, photoCopy, file);
    form.append(photo);
    // La selección solo genera una vista previa; la subida se realiza al guardar los cambios.
    // ==========================================
    // Validar el archivo y mostrar la vista previa
    // ==========================================
    const prepararFotoSeleccionada = () => {
      const candidate = file.files?.[0];
      if (!candidate) return;
      limpiarVistaPrevia();
      if (
        !formats.includes(candidate.type) ||
        !candidate.size ||
        candidate.size > maxBytes
      ) {
        file.value = "";
        avatar.replaceChildren(MesaAuth.avatar(user, "profile-large-avatar"));
        mostrarMensaje(
          photoStatus,
          "Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.",
          true,
        );
        return;
      }
      selectedFile = candidate;
      previewUrl = URL.createObjectURL(candidate);
      const picture = crearElemento("img");
      picture.src = previewUrl;
      picture.alt = "Vista previa de tu nueva foto de perfil";
      picture.addEventListener(
        "error",
        () => {
          if (!picture.isConnected) return;
          limpiarVistaPrevia();
          file.value = "";
          avatar.replaceChildren(MesaAuth.avatar(user, "profile-large-avatar"));
          mostrarMensaje(
            photoStatus,
            "No se pudo leer esta imagen. Selecciona otra foto.",
            true,
          );
        },
        { once: true },
      );
      avatar.replaceChildren(picture);
      mostrarMensaje(
        photoStatus,
        "Foto seleccionada. Guarda los cambios para actualizarla.",
      );
    };

    file.addEventListener("change", prepararFotoSeleccionada);
    const info = crearElemento("section", "profile-info-card");
    info.append(
      crearElemento("h2", "", "Información personal"),
      crearElemento(
        "p",
        "profile-section-description",
        "Actualiza tus datos personales. Tu nombre y foto se muestran en tus reseñas.",
      ),
    );
    const fields = crearElemento("div", "profile-fields");
    const firstName = crearCampo(
      fields,
      "firstName",
      "Nombres *",
      "text",
      user.firstName,
      { required: true, maxlength: "80", autocomplete: "given-name" },
    );
    const lastName = crearCampo(
      fields,
      "lastName",
      "Apellidos *",
      "text",
      user.lastName,
      { required: true, maxlength: "80", autocomplete: "family-name" },
    );
    const emailWrap = crearElemento("div", "profile-email-field");
    const email = crearCampo(
      emailWrap,
      "email",
      "Correo electrónico",
      "email",
      user.email,
      { readonly: true, autocomplete: "email" },
    );
    email.setAttribute("aria-describedby", "profile-email-hint");
    const emailHint = crearElemento(
      "p",
      "profile-field-hint",
      "El correo electrónico no se puede modificar.",
    );
    emailHint.id = "profile-email-hint";
    emailWrap.append(emailHint);
    fields.append(emailWrap);
    const phoneWrap = crearElemento(
      "label",
      "form-field profile-phone-field",
      "Número de celular",
    );
    const phoneRow = crearElemento("span", "profile-phone-control");
    phoneRow.append(crearElemento("span", "profile-country-code", "+51"));
    const phone = crearElemento("input");
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
    const phoneHint = crearElemento(
      "span",
      "profile-field-hint",
      "Celular peruano de 9 dígitos. Campo opcional.",
    );
    phoneHint.id = "profile-phone-hint";
    phoneWrap.append(phoneHint);
    fields.append(phoneWrap);
    // ==========================================
    // Validar nombre, apellidos y celular
    // ==========================================
    function validarCamposDelPerfil() {
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
      input.addEventListener("input", validarCamposDelPerfil),
    );
    phone.addEventListener("input", () => {
      phone.value = phone.value.replace(/\D/g, "").replace(/^51(?=\d{9}$)/, "");
      validarCamposDelPerfil();
    });
    info.append(fields);
    const status = crearElemento("p", "profile-save-status");
    status.setAttribute("role", "alert");
    status.hidden = true;
    const actions = crearElemento("div", "profile-form-actions");
    const cancel = crearBoton(
      "Cancelar",
      () => mostrarFormularioDePerfil(),
      "profile-outline-button",
    );
    const submit = crearElemento("button", "button", "Guardar cambios");
    submit.type = "submit";
    actions.append(cancel, submit);
    info.append(status, actions);
    form.append(info);
    host.append(form);
    const privacy = crearElemento("div", "profile-privacy");
    privacy.append(crearIcono("shield-check"));
    const privacyCopy = crearElemento("div");
    privacyCopy.append(
      crearElemento("strong", "", "Tu información personal"),
      crearElemento(
        "p",
        "",
        "Tu nombre y avatar acompañan tus reseñas. El correo y el celular no se muestran públicamente.",
      ),
    );
    privacy.append(privacyCopy);
    host.append(privacy);
    // ==========================================
    // Subir la foto pendiente y guardar el perfil
    // ==========================================
    const guardarDatosDelPerfil = async (event) => {
      event.preventDefault();
      validarCamposDelPerfil();
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
          body.avatarPublicId = await subirFotoDePerfil(selectedFile);
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
        limpiarVistaPrevia();
        mostrarIdentidadDelCliente();
        mostrarFormularioDePerfil();
        const content = abrirModal(
          "¡Cambios guardados!",
          "profile-success-modal",
        );
        const check = crearElemento("span", "profile-success-icon");
        check.append(crearIcono("check"));
        content.prepend(check);
        content.append(
          crearElemento("p", "", "Tu perfil se actualizó correctamente."),
          crearBoton(
            "Continuar",
            () => seleccionar("#modal").close(),
            "button",
          ),
        );
      } catch (error) {
        if (form.isConnected) mostrarMensaje(status, error.message, true);
      } finally {
        saving = false;
        submit.disabled = false;
        cancel.disabled = false;
        change.disabled = false;
        camera.disabled = false;
        submit.textContent = "Guardar cambios";
      }
    };

    form.addEventListener("submit", guardarDatosDelPerfil);
  }

  // Mis reseñas consulta únicamente opiniones del usuario autenticado y enlaza cada restaurante.
  // ==========================================
  // Cargar y mostrar las reseñas del cliente
  // ==========================================
  async function mostrarMisResenas() {
    limpiarVistaPrevia();
    const version = ++viewVersion;
    host.replaceChildren(
      crearCabeceraDePerfil(
        "Mis reseñas",
        "Estas son las experiencias que has compartido con la comunidad.",
      ),
    );
    const list = crearElemento("div", "profile-reviews-list");
    host.append(list);
    mostrarEstado(list, "Cargando tus reseñas…");
    try {
      const records = await MesaAPI.all(
        "/users/me/reviews",
        {},
        { authenticated: true },
      );
      if (version !== viewVersion) return;
      list.replaceChildren();
      if (!records.length) {
        mostrarEstado(list, "Todavía no has publicado reseñas.");
        list.append(
          crearEnlace(
            "Explorar restaurantes",
            rutaDePagina("restaurantes.html"),
            "button",
          ),
        );
        return;
      }
      records.forEach((review) => {
        const card = crearElemento("article", "profile-review-card");
        if (review.restaurant?.name)
          card.append(
            crearElemento(
              "p",
              "profile-review-restaurant",
              review.restaurant.name,
            ),
          );
        const meta = crearElemento("div", "profile-review-meta");
        const score = crearElemento(
          "span",
          "",
          Number(review.ratings.overall).toFixed(1) + " / 5",
        );
        score.prepend(crearIcono("star"));
        meta.append(score);
        const date = new Date(review.visitedAt);
        if (Number.isFinite(date.getTime()))
          meta.append(
            crearElemento(
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
          crearElemento("h2", "", review.title),
          crearElemento("p", "", review.comment),
        );
        const scores = crearElemento("div", "profile-review-scores");
        [
          ["food", "Comida"],
          ["service", "Servicio"],
          ["ambience", "Ambiente"],
        ].forEach(([key, name]) =>
          scores.append(
            crearElemento("span", "", name + " " + review.ratings[key]),
          ),
        );
        const url = rutaDePagina(
          "restaurante.html?id=" +
            encodeURIComponent(review.restaurantId) +
            "#reviews",
        );
        const detail = crearEnlace(
          "Ver mi reseña en el restaurante",
          url,
          "text-link",
        );
        detail.append(crearIcono("arrow-right"));
        card.append(scores, detail);
        list.append(card);
      });
    } catch (error) {
      if (version === viewVersion)
        mostrarEstado(list, error.message, mostrarMisResenas);
    }
  }
  // ==========================================
  // Mostrar las tarjetas guardadas y el estado vacío
  // ==========================================
  function pintarFavoritos(panel, restaurantes, animar = false) {
    const resultados = panel.querySelector(".profile-favorites-results");
    const botones = [...resultados.querySelectorAll("[data-favorito]")];
    const indiceDeFoco = botones.indexOf(document.activeElement);
    const cantidad = restaurantes.length;
    panel.querySelector(".profile-heading p").textContent = `${cantidad} ${
      cantidad === 1 ? "restaurante guardado" : "restaurantes guardados"
    }`;
    const enlace = crearEnlace(
      "Explorar restaurantes",
      rutaDePagina("restaurantes.html"),
      "button",
    );
    if (!cantidad) {
      const vacio = crearElemento("div", "profile-favorites-empty");
      vacio.append(
        crearIcono("heart"),
        crearElemento("p", "", "Aún no tienes restaurantes guardados."),
        enlace,
      );
      resultados.replaceChildren(vacio);
      if (indiceDeFoco >= 0) enlace.focus();
      return;
    }

    const activarAos =
      animar &&
      window.AOS &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rejilla = crearElemento("div", "restaurant-grid");
    restaurantes.forEach((restaurante, indice) => {
      const tarjeta = MesaUI.card(restaurante);
      if (activarAos) {
        tarjeta.dataset.aos = "fade-up";
        tarjeta.dataset.aosDuration = "350";
        tarjeta.dataset.aosDelay = String(Math.min(indice, 3) * 50);
      }
      rejilla.append(tarjeta);
    });
    resultados.replaceChildren(rejilla);
    if (activarAos) window.AOS.refreshHard();
    if (indiceDeFoco >= 0)
      rejilla.children[Math.min(indiceDeFoco, cantidad - 1)]
        .querySelector("[data-favorito]")
        ?.focus();
  }

  // ==========================================
  // Abrir la vista de favoritos de la cuenta
  // ==========================================
  async function mostrarMisFavoritos() {
    const version = ++viewVersion;
    limpiarVistaPrevia();
    const panel = crearElemento("div", "profile-favorites");
    const resultados = crearElemento("div", "profile-favorites-results");
    panel.append(crearCabeceraDePerfil("Favoritos", ""), resultados);
    host.replaceChildren(panel);
    mostrarEstado(resultados, "Cargando favoritos…");
    try {
      const restaurantes = await MesaFavoritos.listar();
      if (version === viewVersion) pintarFavoritos(panel, restaurantes, true);
    } catch (error) {
      if (version === viewVersion)
        mostrarEstado(resultados, error.message, mostrarMisFavoritos);
    }
  }

  // ==========================================
  // Mostrar la ayuda para el cliente
  // ==========================================
  function mostrarAyudaDelPerfil() {
    ++viewVersion;
    limpiarVistaPrevia();
    host.replaceChildren(
      crearCabeceraDePerfil(
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
        "¿Cómo guardo un restaurante?",
        "Pulsa el corazón en una tarjeta o en la ficha. Puedes consultar los restaurantes guardados en Favoritos.",
      ],
    ].forEach(([question, answer]) => {
      const block = crearElemento("details", "profile-help-item");
      block.append(
        crearElemento("summary", "", question),
        crearElemento("p", "", answer),
      );
      host.append(block);
    });
  }

  // La pantalla privada se habilita después de verificar la sesión y se limpia al cerrarla.
  // ==========================================
  // Actualizar el perfil cuando cambia la sesión
  // ==========================================
  function actualizarPerfilSegunSesion(value) {
    const previousId = user?._id;
    user = value;
    const allowed = user?.role === "CLIENT";
    seleccionar("#profile-shell").hidden = !allowed;
    if (!allowed) {
      ++viewVersion;
      limpiarVistaPrevia();
      host.replaceChildren();
      const status = seleccionar("#profile-status");
      mostrarEstado(
        status,
        user
          ? "Esta pantalla está disponible para cuentas de cliente."
          : "Inicia sesión para gestionar tu perfil.",
      );
      if (!user)
        status.append(
          crearBoton("Iniciar sesión", () => MesaAuth.open("login")),
        );
      else
        status.append(
          crearEnlace(
            "Ir a administración",
            rutaDePagina("administracion.html"),
            "button",
          ),
        );
      return;
    }
    seleccionar("#profile-status").replaceChildren();
    mostrarIdentidadDelCliente();
    if (previousId !== user._id || !host.children.length)
      seleccionarVistaDelPerfil();
  }
  window.addEventListener("hashchange", () => {
    if (user?.role === "CLIENT") seleccionarVistaDelPerfil();
  });
  window.addEventListener("mesa:favoritos", (evento) => {
    const panel = host.querySelector(".profile-favorites");
    if (panel) pintarFavoritos(panel, evento.detail);
  });
  document.querySelector(".profile-nav").addEventListener("click", (event) => {
    if (saving) event.preventDefault();
  });
  seleccionar("#profile-logout").addEventListener("click", () =>
    MesaAPI.logout(),
  );
  mostrarEstado(seleccionar("#profile-status"), "Cargando tu perfil…");
  MesaAuth.ready.then((verified) => {
    actualizarPerfilSegunSesion(verified);
    window.addEventListener("mesa:session", (event) =>
      actualizarPerfilSegunSesion(event.detail),
    );
  });
})();
