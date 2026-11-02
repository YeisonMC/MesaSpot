(() => {
  "use strict";
  const { $, element, button, modal, feedback, field, pageUrl, link } = MesaUI;
  let validatedUser = false;
  let formVersion = 0;
  // El avatar comparte el mismo fallback de iniciales en el header y en el perfil.
  function avatar(user, className = "account-avatar") {
    const node = element("span", className);
    const initials =
      [user?.firstName?.[0], user?.lastName?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase() || "MS";
    node.textContent = initials;
    const url = MesaUI.safeUrl(user?.avatarUrl);
    if (url) {
      const img = element("img");
      img.src = url;
      img.alt = "";
      img.addEventListener(
        "error",
        () => node.replaceChildren(document.createTextNode(initials)),
        { once: true },
      );
      node.replaceChildren(img);
    }
    return node;
  }
  function closeAccountMenu(focus = false) {
    const menu = $("#account-dropdown"),
      trigger = $("#account-trigger");
    if (!menu || !trigger) return;
    const wasOpen = !menu.hidden;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (focus && wasOpen) trigger.focus();
  }
  // Las opciones de cuenta se muestran en un desplegable compacto, accesible con teclado.
  function renderHeader() {
    document
      .querySelectorAll("[data-session-action]")
      .forEach((node) => node.remove());
    const user = MesaAPI.session?.user;
    document.querySelectorAll("[data-account]").forEach((node) => {
      node.hidden = Boolean(user);
    });
    const actions = $(".header-actions");
    if (!user || !actions) return;
    const account = element("div", "header-account");
    account.dataset.sessionAction = "account";
    const trigger = button(
      "",
      () => {
        const menu = $("#account-dropdown");
        menu.hidden = !menu.hidden;
        trigger.setAttribute("aria-expanded", String(!menu.hidden));
      },
      "account-trigger",
    );
    trigger.id = "account-trigger";
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", "account-dropdown");
    trigger.setAttribute("aria-label", user.firstName + ", menú de cuenta");
    trigger.append(
      avatar(user),
      element("span", "account-name", user.firstName),
      MesaIcons.icon("chevron-down"),
    );
    const menu = element("div", "account-dropdown");
    menu.id = "account-dropdown";
    menu.hidden = true;
    const profile =
      user.role === "CLIENT"
        ? link("Mi perfil", pageUrl("perfil.html"), "account-option")
        : button(
            "Mi perfil",
            () => {
              closeAccountMenu();
              openProfile();
            },
            "account-option",
          );
    profile.prepend(MesaIcons.icon("user-round"));
    profile.dataset.sessionAction = "profile";
    const logout = button(
      "Cerrar sesión",
      () => {
        closeAccountMenu();
        MesaAPI.logout();
      },
      "account-option account-logout",
    );
    logout.dataset.sessionAction = "logout";
    logout.prepend(MesaIcons.icon("log-out"));
    menu.append(profile, logout);
    account.append(trigger, menu);
    if (user.role === "RESTAURANT_ADMIN") {
      // En móvil el acceso administrativo permanece dentro del menú de cuenta.
      const compactAdmin = link(
        "Administrar",
        pageUrl("administracion.html"),
        "account-option account-admin-option",
      );
      compactAdmin.prepend(MesaIcons.icon("layout-dashboard"));
      menu.insertBefore(compactAdmin, logout);
      const admin = link(
        "Administrar",
        pageUrl("administracion.html"),
        "button header-admin",
      );
      admin.prepend(MesaIcons.icon("layout-dashboard"));
      admin.dataset.sessionAction = "admin";
      actions.append(admin);
    }
    actions.append(account);
  }
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".header-account")) closeAccountMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAccountMenu(true);
  });
  // Registro independiente: conserva el comportamiento y el diseño del inicio de sesión.
  function openRegister() {
    const version = ++formVersion;
    const content = modal("Crea tu cuenta", "auth-modal register-modal");
    const heading = content.firstElementChild;
    const brand = element("div", "register-brand", "MesaSpot");
    const brandIcon = element("span", "brand-icon");
    brandIcon.append(MesaIcons.icon("chef-hat"));
    brand.prepend(brandIcon);
    content.prepend(brand);
    heading.classList.add("register-title");
    content.append(
      element(
        "p",
        "register-description",
        "Completa tus datos para descubrir los mejores restaurantes de Lima y compartir tu experiencia.",
      ),
    );
    const google = button(
      "Registrarse con Google",
      () => {},
      "register-google",
    );
    google.prepend(MesaIcons.icon("circle-user-round"));
    google.disabled = true;
    google.setAttribute("aria-describedby", "register-google-note");
    const googleNote = element(
      "p",
      "register-google-note",
      "El registro con Google estará disponible próximamente.",
    );
    googleNote.id = "register-google-note";
    const divider = element("div", "auth-divider register-divider");
    divider.append(element("span", "", "o regístrate con tu correo"));
    content.append(google, googleNote, divider);
    const form = element("form", "register-form");
    form.noValidate = true;
    const fields = {},
      errors = {},
      touched = new Set();
    let submitted = false,
      saving = false;

    // Cada campo asocia etiqueta, icono y mensaje; los errores son visibles y accesibles.
    function addField(
      name,
      title,
      type,
      placeholder,
      icon,
      autocomplete,
      maxLength,
    ) {
      const group = element("div", "register-field");
      const label = element("label", "", title);
      label.htmlFor = "register-" + name;
      const wrap = element("div", "register-input");
      const input = element("input");
      input.id = label.htmlFor;
      input.name = name;
      input.type = type;
      input.placeholder = placeholder;
      input.autocomplete = autocomplete;
      input.required = true;
      input.maxLength = maxLength;
      const error = element("p", "register-error");
      error.id = input.id + "-error";
      error.hidden = true;
      input.setAttribute("aria-describedby", error.id);
      wrap.append(MesaIcons.icon(icon), input);
      if (type === "password") {
        const toggle = button(
          "",
          () => {
            const visible = input.type === "password";
            input.type = visible ? "text" : "password";
            toggle.replaceChildren(MesaIcons.icon(visible ? "eye-off" : "eye"));
            toggle.setAttribute(
              "aria-label",
              (visible ? "Ocultar " : "Mostrar ") + title.toLowerCase(),
            );
            toggle.setAttribute("aria-pressed", String(visible));
          },
          "register-password-toggle",
        );
        toggle.setAttribute("aria-label", "Mostrar " + title.toLowerCase());
        toggle.setAttribute("aria-pressed", "false");
        toggle.append(MesaIcons.icon("eye"));
        wrap.append(toggle);
      }
      group.append(label, wrap, error);
      form.append(group);
      fields[name] = input;
      errors[name] = error;
      input.addEventListener("blur", () => {
        touched.add(name);
        validate(name);
      });
      input.addEventListener("input", () => {
        if (submitted || touched.has(name)) validate(name);
        if (name === "password" && (submitted || touched.has("confirm")))
          validate("confirm");
        status.hidden = true;
      });
      return input;
    }
    addField(
      "firstName",
      "Nombre",
      "text",
      "Alejandro",
      "user-round",
      "given-name",
      80,
    );
    addField(
      "lastName",
      "Apellidos",
      "text",
      "Martínez Torres",
      "user-round",
      "family-name",
      80,
    );
    addField(
      "email",
      "Correo electrónico",
      "email",
      "ejemplo@correo.com",
      "mail",
      "email",
      254,
    );
    const phone = addField(
      "phone",
      "Número de celular",
      "tel",
      "987 654 321",
      "phone",
      "tel-national",
      20,
    );
    phone.inputMode = "tel";
    addField(
      "password",
      "Contraseña",
      "password",
      "Mínimo 8 caracteres",
      "lock-keyhole",
      "new-password",
      72,
    );
    addField(
      "confirm",
      "Confirmar contraseña",
      "password",
      "Repite tu contraseña",
      "lock-keyhole",
      "new-password",
      72,
    );
    const termsGroup = element("div", "register-terms-group");
    const termsLabel = element("label", "register-terms");
    const terms = element("input");
    terms.type = "checkbox";
    terms.name = "terms";
    terms.id = "register-terms";
    terms.required = true;
    const termsText = element("span", "", "Acepto los ");
    const legal = element("section", "register-legal");
    legal.id = "register-legal";
    legal.hidden = true;
    // Los textos legales se consultan sin reemplazar el modal ni perder el formulario.
    const legalCopy = {
      terms: [
        "Términos de Servicio",
        "MesaSpot permite descubrir restaurantes y compartir opiniones. Confirma precios y condiciones con cada local. Las reservas y los pagos todavía no están disponibles.",
      ],
      privacy: [
        "Política de Privacidad",
        "Tu perfil y tus reseñas se guardan en MesaSpot. Tu nombre y avatar aparecen junto a tus opiniones; tu correo y celular no se muestran públicamente en ellas.",
      ],
    };
    function legalButton(key) {
      const control = button(
        legalCopy[key][0],
        () => {
          const expanded = legal.dataset.section !== key || legal.hidden;
          legal.hidden = !expanded;
          legal.dataset.section = key;
          legal.replaceChildren(
            element("h3", "", legalCopy[key][0]),
            element("p", "", legalCopy[key][1]),
          );
          termsText
            .querySelectorAll("button")
            .forEach((node) =>
              node.setAttribute(
                "aria-expanded",
                String(expanded && node === control),
              ),
            );
        },
        "register-legal-link",
      );
      control.setAttribute("aria-controls", legal.id);
      control.setAttribute("aria-expanded", "false");
      return control;
    }
    termsText.append(
      legalButton("terms"),
      document.createTextNode(" y la "),
      legalButton("privacy"),
      document.createTextNode(" de MesaSpot."),
    );
    const termsError = element("p", "register-error");
    termsError.id = "register-terms-error";
    termsError.hidden = true;
    terms.setAttribute("aria-describedby", termsError.id);
    termsLabel.append(terms, termsText);
    termsGroup.append(termsLabel, termsError);
    form.append(termsGroup, legal);
    fields.terms = terms;
    errors.terms = termsError;
    terms.addEventListener("change", () => {
      touched.add("terms");
      validate("terms");
    });
    const submit = element("button", "button register-submit", "Crear cuenta");
    submit.type = "submit";
    const status = element("p", "auth-feedback register-status");
    status.hidden = true;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    form.append(submit, status);
    const switcher = element("p", "register-switch", "¿Ya tienes cuenta? ");
    switcher.append(
      button(
        "Inicia sesión aquí",
        () => {
          if (!saving) openAuth("login");
        },
        "auth-link",
      ),
    );
    content.append(form, switcher);

    // Validamos antes de enviar: celular peruano y el límite real de 72 bytes de bcrypt.
    function normalizedPhone() {
      const number = fields.phone.value.replace(/[\s()-]/g, "");
      return number.startsWith("+51") ? number.slice(3) : number;
    }
    function showError(name, message) {
      fields[name].setAttribute("aria-invalid", String(Boolean(message)));
      errors[name].textContent = message;
      errors[name].hidden = !message;
      fields[name]
        .closest(name === "terms" ? ".register-terms-group" : ".register-field")
        .classList.toggle("has-error", Boolean(message));
      return !message;
    }
    function validate(name) {
      const value = fields[name].value.trim();
      let message = "";
      if (name === "terms")
        message = terms.checked
          ? ""
          : "Debes aceptar los Términos de Servicio y la Política de Privacidad.";
      else if (!value)
        message = {
          firstName: "Ingresa tu nombre.",
          lastName: "Ingresa tus apellidos.",
          email: "Ingresa tu correo electrónico.",
          phone: "Ingresa tu número de celular.",
          password: "Ingresa una contraseña.",
          confirm: "Confirma tu contraseña.",
        }[name];
      else if (
        ["firstName", "lastName"].includes(name) &&
        !/^[\p{L}\p{M}][\p{L}\p{M}\s.'’\-]*$/u.test(value)
      )
        message = "Usa letras, espacios, apóstrofes o guiones.";
      else if (
        name === "email" &&
        (!fields.email.validity.valid ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value))
      )
        message = "Ingresa un correo válido, por ejemplo nombre@correo.com.";
      else if (name === "phone" && !/^9\d{8}$/.test(normalizedPhone()))
        message = "Ingresa un celular peruano de 9 dígitos que empiece con 9.";
      else if (name === "password" && fields.password.value.length < 8)
        message = "La contraseña debe tener al menos 8 caracteres.";
      else if (
        name === "password" &&
        new Blob([fields.password.value]).size > 72
      )
        message = "La contraseña es demasiado larga (máximo 72 bytes).";
      else if (
        name === "confirm" &&
        fields.confirm.value !== fields.password.value
      )
        message = "Las contraseñas no coinciden.";
      return showError(name, message);
    }
    // Conservamos los valores al fallar y evitamos solicitudes duplicadas mientras se guarda.
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (saving) return;
      submitted = true;
      const results = Object.keys(fields).map(validate);
      if (results.includes(false)) {
        form.querySelector('[aria-invalid="true"]').focus();
        return;
      }
      saving = true;
      submit.disabled = true;
      submit.textContent = "Creando cuenta…";
      form.setAttribute("aria-busy", "true");
      switcher.querySelector("button").disabled = true;
      feedback(status, "Estamos creando tu cuenta…");
      try {
        const body = {
          firstName: fields.firstName.value.trim(),
          lastName: fields.lastName.value.trim(),
          email: fields.email.value.trim().toLowerCase(),
          phone: "+51" + normalizedPhone(),
          password: fields.password.value,
        };
        const result = await MesaAPI.request("/auth/register", {
          method: "POST",
          body,
        });
        validatedUser = true;
        MesaAPI.saveSession(result.data);
        if (version !== formVersion || !form.isConnected) return;
        // Tras el éxito, la confirmación permanece abierta hasta pulsar la X.
        const title = element("h2", "register-title", "¡Cuenta creada!");
        title.id = "modal-title";
        title.tabIndex = -1;
        const success = element("div", "register-success");
        success.append(MesaIcons.icon("circle-check"));
        content.replaceChildren(
          brand,
          success,
          title,
          element(
            "p",
            "register-description",
            "Tu cuenta de MesaSpot está lista. Ya puedes descubrir restaurantes y compartir tus reseñas.",
          ),
        );
        title.focus();
      } catch (error) {
        if (!form.isConnected) return;
        if (error.status === 409)
          showError(
            "email",
            "Este correo ya está registrado. Inicia sesión o usa otro.",
          );
        (error.details || []).forEach((detail) => {
          if (fields[detail.field]) showError(detail.field, detail.message);
        });
        feedback(
          status,
          error.status === 409
            ? "Revisa el correo electrónico para continuar."
            : error.message,
          true,
        );
        form.querySelector('[aria-invalid="true"]')?.focus();
      } finally {
        saving = false;
        submit.disabled = false;
        submit.textContent = "Crear cuenta";
        form.removeAttribute("aria-busy");
        switcher.querySelector("button").disabled = false;
      }
    });
  }

  function openAuth(mode = "login") {
    if (mode === "register") return openRegister();
    const version = ++formVersion;
    const content = modal("Iniciar sesión", "auth-modal");
    content.append(
      element("p", "modal-description", "Accede a tu perfil de MesaSpot."),
    );
    const form = element("form", "modal-form auth-form");

    field(form, "email", "Correo electrónico", "email", "", {
      required: true,
      autocomplete: "email",
    });
    const password = field(form, "password", "Contraseña", "password", "", {
      required: true,
      minlength: "1",
      maxlength: "72",
      autocomplete: "current-password",
    });
    form.append(
      button(
        "Mostrar contraseña",
        (event) => {
          password.type = password.type === "password" ? "text" : "password";
          event.currentTarget.textContent =
            password.type === "password"
              ? "Mostrar contraseña"
              : "Ocultar contraseña";
          event.currentTarget.prepend(
            MesaIcons.icon(password.type === "password" ? "eye" : "eye-off"),
          );
        },
        "auth-link",
      ),
    );
    let remember;
    {
      const label = element("label", "auth-checkbox");
      remember = element("input");
      remember.type = "checkbox";
      label.append(
        remember,
        element("span", "", "Mantener mi sesión en este navegador"),
      );
      form.append(label);
    }
    const submit = element("button", "button auth-submit", "Iniciar sesión");
    submit.type = "submit";
    const status = element("p", "auth-feedback");
    status.setAttribute("role", "status");
    status.hidden = true;
    form.append(submit, status);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      feedback(status, "Conectando…");
      try {
        const values = Object.fromEntries(new FormData(form));
        const body = { email: values.email.trim(), password: values.password };

        const result = await MesaAPI.request("/auth/login", {
          method: "POST",
          body,
        });
        validatedUser = true;
        MesaAPI.saveSession(result.data, remember?.checked);
        if (
          version === formVersion &&
          $("#modal-content") === content &&
          form.isConnected
        )
          $("#modal").close();
      } catch (error) {
        if (form.isConnected) feedback(status, error.message, true);
      } finally {
        submit.disabled = false;
        password.value = "";
      }
    });
    content.append(
      form,
      button("Crear una cuenta", () => openAuth("register"), "auth-link"),
    );
    content.append(
      element(
        "p",
        "muted",
        "La recuperación de contraseña y el acceso con Google todavía no están disponibles.",
      ),
    );
  }
  async function openProfile() {
    const content = modal("Mi perfil", "auth-modal");
    const area = element("div");
    content.append(area);
    MesaUI.state(area, "Cargando perfil…");
    try {
      const user = await MesaAPI.refreshUser();
      if (!user || !area.isConnected) return;
      area.replaceChildren();
      const form = element("form", "modal-form");
      field(form, "firstName", "Nombre", "text", user.firstName, {
        required: true,
        maxlength: "80",
      });
      field(form, "lastName", "Apellidos", "text", user.lastName, {
        required: true,
        maxlength: "80",
      });
      field(
        form,
        "avatarUrl",
        "Enlace de tu foto de perfil",
        "url",
        user.avatarUrl || "",
      );
      field(form, "phone", "Teléfono (formato +51…)", "tel", user.phone || "");
      area.append(element("p", "muted", user.email));
      const save = element("button", "button", "Guardar perfil");
      save.type = "submit";
      const status = element("p", "auth-feedback");
      status.setAttribute("role", "status");
      form.append(save, status);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        save.disabled = true;
        try {
          const body = Object.fromEntries(new FormData(form));
          body.avatarUrl ||= null;
          body.phone ||= null;
          await MesaAPI.request("/users/me", {
            method: "PATCH",
            authenticated: true,
            body,
          });
          await MesaAPI.refreshUser();
          feedback(status, "Perfil actualizado.");
        } catch (error) {
          feedback(status, error.message, true);
        } finally {
          save.disabled = false;
        }
      });
      area.append(form);
      const myReviews = element("div", "profile-reviews");
      area.append(element("h3", "", "Mis reseñas"), myReviews);
      try {
        const reviews = await MesaAPI.all(
          "/users/me/reviews",
          {},
          { authenticated: true },
        );
        if (!reviews.length)
          MesaUI.state(myReviews, "Todavía no has publicado reseñas.");
        reviews.forEach((review) =>
          myReviews.append(
            link(
              review.title,
              MesaUI.detailUrl({ _id: review.restaurantId }) + "#reviews",
              "text-link",
            ),
          ),
        );
      } catch (error) {
        MesaUI.state(myReviews, error.message);
      }
    } catch (error) {
      MesaUI.state(area, error.message, openProfile);
    }
  }
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-account]");
    if (trigger) openAuth(trigger.dataset.account);
  });
  window.addEventListener("mesa:session", renderHeader);
  window.MesaAuth = {
    avatar,
    open: openAuth,
    profile: openProfile,
    get ready() {
      return ready;
    },
  };
  // Se valida el token guardado antes de habilitar acciones privadas.
  const ready = (async () => {
    if (MesaAPI.session?.token) {
      try {
        await MesaAPI.refreshUser();
        validatedUser = true;
      } catch (error) {
        if (error.status !== 401)
          console.warn("No se pudo validar la sesión:", error.message);
      }
    }
    renderHeader();
    return validatedUser ? MesaAPI.session?.user : null;
  })();
})();
