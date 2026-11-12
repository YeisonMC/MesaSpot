// ==========================================
// Registro, inicio de sesión y menú de cuenta
// ==========================================

(() => {
  "use strict";
  const {
    $: seleccionar,
    element: crearElemento,
    button: crearBoton,
    modal: abrirModal,
    feedback: mostrarMensaje,
    field: crearCampo,
    pageUrl: rutaDePagina,
    link: crearEnlace,
  } = MesaUI;
  let validatedUser = false;
  let formVersion = 0;
  // El avatar comparte el mismo fallback de iniciales en el header y en el perfil.
  // ==========================================
  // Crear el avatar con foto o iniciales
  // ==========================================
  function crearAvatar(user, className = "account-avatar") {
    const node = crearElemento("span", className);
    const initials =
      [user?.firstName?.[0], user?.lastName?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase() || "MS";
    node.textContent = initials;
    const url = MesaUI.safeUrl(user?.avatarUrl);
    if (url) {
      const img = crearElemento("img");
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
  // ==========================================
  // Cerrar el menú de cuenta y devolver el foco
  // ==========================================
  function cerrarMenuDeCuenta(focus = false) {
    const menu = seleccionar("#account-dropdown"),
      trigger = seleccionar("#account-trigger");
    if (!menu || !trigger) return;
    const wasOpen = !menu.hidden;
    menu.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (focus && wasOpen) trigger.focus();
  }
  // Las opciones de cuenta se muestran en un desplegable compacto, accesible con teclado.
  // ==========================================
  // Actualizar los accesos de la cabecera según la sesión
  // ==========================================
  function actualizarCabeceraDeCuenta() {
    document
      .querySelectorAll("[data-session-action]")
      .forEach((node) => node.remove());
    const user = MesaAPI.session?.user;
    document.querySelectorAll("[data-account]").forEach((node) => {
      node.hidden = Boolean(user);
    });
    const actions = seleccionar(".header-actions");
    if (!user || !actions) return;
    const account = crearElemento("div", "header-account");
    account.dataset.sessionAction = "account";
    const trigger = crearBoton(
      "",
      () => {
        const menu = seleccionar("#account-dropdown");
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
      crearAvatar(user),
      crearElemento("span", "account-name", user.firstName),
      MesaIcons.icon("chevron-down"),
    );
    const menu = crearElemento("div", "account-dropdown");
    menu.id = "account-dropdown";
    menu.hidden = true;
    const profile =
      user.role === "CLIENT"
        ? crearEnlace(
            "Mi perfil",
            rutaDePagina("perfil.html"),
            "account-option",
          )
        : crearBoton(
            "Mi perfil",
            () => {
              cerrarMenuDeCuenta();
              abrirPerfilDeCuenta();
            },
            "account-option",
          );
    profile.prepend(MesaIcons.icon("user-round"));
    profile.dataset.sessionAction = "profile";
    const logout = crearBoton(
      "Cerrar sesión",
      () => {
        cerrarMenuDeCuenta();
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
      const compactAdmin = crearEnlace(
        "Administrar",
        rutaDePagina("administracion.html"),
        "account-option account-admin-option",
      );
      compactAdmin.prepend(MesaIcons.icon("layout-dashboard"));
      menu.insertBefore(compactAdmin, logout);
      const admin = crearEnlace(
        "Administrar",
        rutaDePagina("administracion.html"),
        "button header-admin",
      );
      admin.prepend(MesaIcons.icon("layout-dashboard"));
      admin.dataset.sessionAction = "admin";
      actions.append(admin);
    }
    actions.append(account);
  }
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".header-account")) cerrarMenuDeCuenta();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") cerrarMenuDeCuenta(true);
  });
  // Registro independiente: conserva el comportamiento y el diseño del inicio de sesión.
  // ==========================================
  // Abrir el formulario de registro
  // ==========================================
  function abrirRegistro() {
    const version = ++formVersion;
    const content = abrirModal("Crea tu cuenta", "auth-modal register-modal");
    const heading = content.firstElementChild;
    const brand = crearElemento("div", "register-brand", "MesaSpot");
    const brandIcon = crearElemento("span", "brand-icon");
    brandIcon.append(MesaIcons.icon("chef-hat"));
    brand.prepend(brandIcon);
    content.prepend(brand);
    heading.classList.add("register-title");
    content.append(
      crearElemento(
        "p",
        "register-description",
        "Completa tus datos para descubrir los mejores restaurantes de Lima y compartir tu experiencia.",
      ),
    );
    const google = crearBoton(
      "Registrarse con Google",
      () => {},
      "register-google",
    );
    google.prepend(MesaIcons.icon("circle-user-round"));
    google.disabled = true;
    google.setAttribute("aria-describedby", "register-google-note");
    const googleNote = crearElemento(
      "p",
      "register-google-note",
      "El registro con Google estará disponible próximamente.",
    );
    googleNote.id = "register-google-note";
    const divider = crearElemento("div", "auth-divider register-divider");
    divider.append(crearElemento("span", "", "o regístrate con tu correo"));
    content.append(google, googleNote, divider);
    const form = crearElemento("form", "register-form");
    form.noValidate = true;
    const fields = {},
      errors = {},
      touched = new Set();
    let submitted = false,
      saving = false;

    // Cada campo asocia etiqueta, icono y mensaje; los errores son visibles y accesibles.
    // ==========================================
    // Agregar un campo con etiqueta, icono y error
    // ==========================================
    function agregarCampo(
      name,
      title,
      type,
      placeholder,
      icon,
      autocomplete,
      maxLength,
    ) {
      const group = crearElemento("div", "register-field");
      const label = crearElemento("label", "", title);
      label.htmlFor = "register-" + name;
      const wrap = crearElemento("div", "register-input");
      const input = crearElemento("input");
      input.id = label.htmlFor;
      input.name = name;
      input.type = type;
      input.placeholder = placeholder;
      input.autocomplete = autocomplete;
      input.required = true;
      input.maxLength = maxLength;
      const error = crearElemento("p", "register-error");
      error.id = input.id + "-error";
      error.hidden = true;
      input.setAttribute("aria-describedby", error.id);
      wrap.append(MesaIcons.icon(icon), input);
      if (type === "password") {
        const toggle = crearBoton(
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
        validarCampo(name);
      });
      input.addEventListener("input", () => {
        if (submitted || touched.has(name)) validarCampo(name);
        if (name === "password" && (submitted || touched.has("confirm")))
          validarCampo("confirm");
        status.hidden = true;
      });
      return input;
    }
    agregarCampo(
      "firstName",
      "Nombre",
      "text",
      "Alejandro",
      "user-round",
      "given-name",
      80,
    );
    agregarCampo(
      "lastName",
      "Apellidos",
      "text",
      "Martínez Torres",
      "user-round",
      "family-name",
      80,
    );
    agregarCampo(
      "email",
      "Correo electrónico",
      "email",
      "ejemplo@correo.com",
      "mail",
      "email",
      254,
    );
    const phone = agregarCampo(
      "phone",
      "Número de celular",
      "tel",
      "987 654 321",
      "phone",
      "tel-national",
      20,
    );
    phone.inputMode = "tel";
    agregarCampo(
      "password",
      "Contraseña",
      "password",
      "Mínimo 8 caracteres",
      "lock-keyhole",
      "new-password",
      72,
    );
    agregarCampo(
      "confirm",
      "Confirmar contraseña",
      "password",
      "Repite tu contraseña",
      "lock-keyhole",
      "new-password",
      72,
    );
    const termsGroup = crearElemento("div", "register-terms-group");
    const termsLabel = crearElemento("label", "register-terms");
    const terms = crearElemento("input");
    terms.type = "checkbox";
    terms.name = "terms";
    terms.id = "register-terms";
    terms.required = true;
    const termsText = crearElemento("span", "", "Acepto los ");
    const legal = crearElemento("section", "register-legal");
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
    // ==========================================
    // Mostrar términos o privacidad dentro del registro
    // ==========================================
    function crearBotonLegal(key) {
      const control = crearBoton(
        legalCopy[key][0],
        () => {
          const expanded = legal.dataset.section !== key || legal.hidden;
          legal.hidden = !expanded;
          legal.dataset.section = key;
          legal.replaceChildren(
            crearElemento("h3", "", legalCopy[key][0]),
            crearElemento("p", "", legalCopy[key][1]),
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
      crearBotonLegal("terms"),
      document.createTextNode(" y la "),
      crearBotonLegal("privacy"),
      document.createTextNode(" de MesaSpot."),
    );
    const termsError = crearElemento("p", "register-error");
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
      validarCampo("terms");
    });
    const submit = crearElemento(
      "button",
      "button register-submit",
      "Crear cuenta",
    );
    submit.type = "submit";
    const status = crearElemento("p", "auth-feedback register-status");
    status.hidden = true;
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    form.append(submit, status);
    const switcher = crearElemento(
      "p",
      "register-switch",
      "¿Ya tienes cuenta? ",
    );
    switcher.append(
      crearBoton(
        "Inicia sesión aquí",
        () => {
          if (!saving) abrirAutenticacion("login");
        },
        "auth-link",
      ),
    );
    content.append(form, switcher);

    // Validamos antes de enviar: celular peruano y el límite real de 72 bytes de bcrypt.
    // ==========================================
    // Normalizar el celular peruano
    // ==========================================
    function normalizarCelular() {
      const number = fields.phone.value.replace(/[\s()-]/g, "");
      return number.startsWith("+51") ? number.slice(3) : number;
    }
    // ==========================================
    // Mostrar el error accesible de un campo de registro
    // ==========================================
    function mostrarErrorDeRegistro(name, message) {
      fields[name].setAttribute("aria-invalid", String(Boolean(message)));
      errors[name].textContent = message;
      errors[name].hidden = !message;
      fields[name]
        .closest(name === "terms" ? ".register-terms-group" : ".register-field")
        .classList.toggle("has-error", Boolean(message));
      return !message;
    }
    // ==========================================
    // Validar el valor del campo
    // ==========================================
    function validarCampo(name) {
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
      else if (name === "phone" && !/^9\d{8}$/.test(normalizarCelular()))
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
      return mostrarErrorDeRegistro(name, message);
    }
    // Conservamos los valores al fallar y evitamos solicitudes duplicadas mientras se guarda.
    // ==========================================
    // Validar y enviar la solicitud de registro
    // ==========================================
    const enviarRegistro = async (event) => {
      event.preventDefault();
      if (saving) return;
      submitted = true;
      const results = Object.keys(fields).map(validarCampo);
      if (results.includes(false)) {
        form.querySelector('[aria-invalid="true"]').focus();
        return;
      }
      saving = true;
      submit.disabled = true;
      submit.textContent = "Creando cuenta…";
      form.setAttribute("aria-busy", "true");
      switcher.querySelector("button").disabled = true;
      mostrarMensaje(status, "Estamos creando tu cuenta…");
      try {
        const body = {
          firstName: fields.firstName.value.trim(),
          lastName: fields.lastName.value.trim(),
          email: fields.email.value.trim().toLowerCase(),
          phone: "+51" + normalizarCelular(),
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
        const title = crearElemento("h2", "register-title", "¡Cuenta creada!");
        title.id = "modal-title";
        title.tabIndex = -1;
        const success = crearElemento("div", "register-success");
        success.append(MesaIcons.icon("circle-check"));
        content.replaceChildren(
          brand,
          success,
          title,
          crearElemento(
            "p",
            "register-description",
            "Tu cuenta de MesaSpot está lista. Ya puedes descubrir restaurantes y compartir tus reseñas.",
          ),
        );
        title.focus();
      } catch (error) {
        if (!form.isConnected) return;
        if (error.status === 409)
          mostrarErrorDeRegistro(
            "email",
            "Este correo ya está registrado. Inicia sesión o usa otro.",
          );
        (error.details || []).forEach((detail) => {
          if (fields[detail.field])
            mostrarErrorDeRegistro(detail.field, detail.message);
        });
        mostrarMensaje(
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
    };

    form.addEventListener("submit", enviarRegistro);
  }

  // ==========================================
  // Abrir el inicio de sesión o dirigir al registro
  // ==========================================
  function abrirAutenticacion(mode = "login") {
    if (mode === "register") return abrirRegistro();
    const version = ++formVersion;
    // La clase register-modal reutiliza el diseño del registro y hace que el modal solo se cierre con la X (ver app.js).
    const content = abrirModal(
      "Iniciar sesión",
      "auth-modal register-modal login-modal",
    );
    const heading = content.firstElementChild;
    const brand = crearElemento("div", "register-brand", "MesaSpot");
    const brandIcon = crearElemento("span", "brand-icon");
    brandIcon.append(MesaIcons.icon("chef-hat"));
    brand.prepend(brandIcon);
    content.prepend(brand);
    heading.classList.add("register-title");
    content.append(
      crearElemento(
        "p",
        "register-description",
        "Bienvenido de nuevo. Ingresa a tu cuenta para continuar.",
      ),
    );
    // El acceso con Google aún no existe: se muestra identificado y deshabilitado.
    const google = crearBoton(
      "Continuar con Google",
      () => {},
      "register-google",
    );
    google.prepend(MesaIcons.icon("circle-user-round"));
    google.disabled = true;
    google.setAttribute("aria-describedby", "login-google-note");
    const googleNote = crearElemento(
      "p",
      "register-google-note",
      "El acceso con Google estará disponible próximamente.",
    );
    googleNote.id = "login-google-note";
    const divider = crearElemento("div", "auth-divider register-divider");
    divider.append(crearElemento("span", "", "o continúa con tu correo"));
    content.append(google, googleNote, divider);

    const form = crearElemento("form", "register-form login-form");
    form.noValidate = true;
    const fields = {},
      errors = {};
    // Cada campo lleva etiqueta, icono a la izquierda y un mensaje de error debajo.
    // ==========================================
    // Agregar un campo con etiqueta, icono y error
    // ==========================================
    function agregarCampo(name, title, type, placeholder, icon, autocomplete) {
      const group = crearElemento("div", "register-field");
      const label = crearElemento("label", "", title);
      label.htmlFor = "login-" + name;
      const wrap = crearElemento("div", "register-input");
      const input = crearElemento("input");
      input.id = label.htmlFor;
      input.name = name;
      input.type = type;
      input.placeholder = placeholder;
      input.autocomplete = autocomplete;
      input.required = true;
      input.maxLength = name === "email" ? 254 : 72;
      const error = crearElemento("p", "register-error");
      error.id = input.id + "-error";
      error.hidden = true;
      input.setAttribute("aria-describedby", error.id);
      wrap.append(MesaIcons.icon(icon), input);
      if (type === "password") {
        // El ojo alterna entre mostrar y ocultar la contraseña.
        const toggle = crearBoton(
          "",
          () => {
            const visible = input.type === "password";
            input.type = visible ? "text" : "password";
            toggle.replaceChildren(MesaIcons.icon(visible ? "eye-off" : "eye"));
            toggle.setAttribute(
              "aria-label",
              visible ? "Ocultar contraseña" : "Mostrar contraseña",
            );
            toggle.setAttribute("aria-pressed", String(visible));
          },
          "register-password-toggle",
        );
        toggle.setAttribute("aria-label", "Mostrar contraseña");
        toggle.setAttribute("aria-pressed", "false");
        toggle.append(MesaIcons.icon("eye"));
        wrap.append(toggle);
      }
      group.append(label, wrap, error);
      form.append(group);
      fields[name] = input;
      errors[name] = error;
      input.addEventListener("input", () => {
        if (!errors[name].hidden) validarCampo(name);
        status.hidden = true;
      });
    }
    // ==========================================
    // Validar el valor del campo
    // ==========================================
    function validarCampo(name) {
      const value = fields[name].value.trim();
      let message = "";
      if (name === "email")
        message = !value
          ? "Ingresa tu correo electrónico."
          : !fields.email.validity.valid
            ? "Ingresa un correo válido, por ejemplo nombre@correo.com."
            : "";
      else message = fields.password.value ? "" : "Ingresa tu contraseña.";
      errors[name].textContent = message;
      errors[name].hidden = !message;
      fields[name].setAttribute("aria-invalid", String(Boolean(message)));
      return !message;
    }
    agregarCampo(
      "email",
      "Correo electrónico",
      "email",
      "ejemplo@correo.com",
      "mail",
      "email",
    );
    agregarCampo(
      "password",
      "Contraseña",
      "password",
      "Ingresa tu contraseña",
      "lock-keyhole",
      "current-password",
    );

    // Fila de opciones: en escritorio van en una línea; en móvil el enlace baja (ver auth.css).
    const options = crearElemento("div", "login-options");
    const rememberLabel = crearElemento(
      "label",
      "register-terms login-remember",
    );
    const remember = crearElemento("input");
    remember.type = "checkbox";
    remember.name = "remember";
    remember.id = "login-remember";
    rememberLabel.append(
      remember,
      crearElemento("span", "", "Mantener mi sesión iniciada"),
    );
    // La recuperación de contraseña aún no existe: se deja visible pero deshabilitada.
    const forgot = crearBoton(
      "¿Olvidaste tu contraseña?",
      () => {},
      "login-forgot",
    );
    forgot.disabled = true;
    forgot.title = "Próximamente";
    forgot.setAttribute(
      "aria-label",
      "¿Olvidaste tu contraseña? Disponible próximamente",
    );
    options.append(rememberLabel, forgot);

    const submit = crearElemento(
      "button",
      "button register-submit login-submit",
      "Iniciar sesión",
    );
    submit.type = "submit";
    const status = crearElemento("p", "auth-feedback register-status");
    status.setAttribute("role", "status");
    status.hidden = true;
    form.append(options, submit, status);

    // ==========================================
    // Validar los datos e iniciar sesión
    // ==========================================
    const enviarInicioDeSesion = async (event) => {
      event.preventDefault();
      // Se validan ambos campos antes de llamar a la API.
      const valid = [validarCampo("email"), validarCampo("password")].every(
        Boolean,
      );
      if (!valid) {
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      submit.disabled = true;
      mostrarMensaje(status, "Conectando…");
      try {
        const body = {
          email: fields.email.value.trim(),
          password: fields.password.value,
        };
        const result = await MesaAPI.request("/auth/login", {
          method: "POST",
          body,
        });
        validatedUser = true;
        MesaAPI.saveSession(result.data, remember.checked);
        if (
          version === formVersion &&
          seleccionar("#modal-content") === content &&
          form.isConnected
        )
          seleccionar("#modal").close();
      } catch (error) {
        if (form.isConnected) mostrarMensaje(status, error.message, true);
      } finally {
        submit.disabled = false;
        fields.password.value = "";
      }
    };

    form.addEventListener("submit", enviarInicioDeSesion);
    const switcher = crearElemento(
      "p",
      "register-switch",
      "¿No tienes cuenta? ",
    );
    switcher.append(
      crearBoton(
        "Regístrate aquí",
        () => abrirAutenticacion("register"),
        "auth-link",
      ),
    );
    content.append(form, switcher);
  }
  // ==========================================
  // Consultar y editar el perfil desde el menú de cuenta
  // ==========================================
  async function abrirPerfilDeCuenta() {
    const content = abrirModal("Mi perfil", "auth-modal");
    const area = crearElemento("div");
    content.append(area);
    MesaUI.state(area, "Cargando perfil…");
    try {
      const user = await MesaAPI.refreshUser();
      if (!user || !area.isConnected) return;
      area.replaceChildren();
      const form = crearElemento("form", "modal-form");
      crearCampo(form, "firstName", "Nombre", "text", user.firstName, {
        required: true,
        maxlength: "80",
      });
      crearCampo(form, "lastName", "Apellidos", "text", user.lastName, {
        required: true,
        maxlength: "80",
      });
      crearCampo(
        form,
        "avatarUrl",
        "Enlace de tu foto de perfil",
        "url",
        user.avatarUrl || "",
      );
      crearCampo(
        form,
        "phone",
        "Teléfono (formato +51…)",
        "tel",
        user.phone || "",
      );
      area.append(crearElemento("p", "muted", user.email));
      const save = crearElemento("button", "button", "Guardar perfil");
      save.type = "submit";
      const status = crearElemento("p", "auth-feedback");
      status.setAttribute("role", "status");
      form.append(save, status);
      // ==========================================
      // Guardar los cambios del perfil desde el diálogo
      // ==========================================
      const guardarPerfilDeCuenta = async (event) => {
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
          mostrarMensaje(status, "Perfil actualizado.");
        } catch (error) {
          mostrarMensaje(status, error.message, true);
        } finally {
          save.disabled = false;
        }
      };

      form.addEventListener("submit", guardarPerfilDeCuenta);
      area.append(form);
      const myReviews = crearElemento("div", "profile-reviews");
      area.append(crearElemento("h3", "", "Mis reseñas"), myReviews);
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
            crearEnlace(
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
      MesaUI.state(area, error.message, abrirPerfilDeCuenta);
    }
  }
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-account]");
    if (trigger) abrirAutenticacion(trigger.dataset.account);
  });
  window.addEventListener("mesa:session", actualizarCabeceraDeCuenta);
  window.MesaAuth = {
    avatar: crearAvatar,
    open: abrirAutenticacion,
    profile: abrirPerfilDeCuenta,
    // ==========================================
    // Esperar la validación inicial de la sesión
    // ==========================================
    get ready() {
      return ready;
    },
  };
  // Se valida el token guardado antes de habilitar acciones privadas.
  // ==========================================
  // Validar la sesión guardada al cargar la página
  // ==========================================
  async function validarSesionInicial() {
    if (MesaAPI.session?.token) {
      try {
        await MesaAPI.refreshUser();
        validatedUser = true;
      } catch (error) {
        if (error.status !== 401)
          console.warn("No se pudo validar la sesión:", error.message);
      }
    }
    actualizarCabeceraDeCuenta();
    return validatedUser ? MesaAPI.session?.user : null;
  }

  const ready = validarSesionInicial();
})();
