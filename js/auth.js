/* Formularios de demostración: no almacenan contraseñas ni autentican usuarios. */
(() => {
  "use strict";
  const modal = document.querySelector("#modal");
  const content = document.querySelector("#modal-content");
  const eye =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';

  function field(name, label, type, placeholder, autocomplete, extra = "") {
    return `<div class="auth-field"><div class="auth-label-row"><label for="auth-${name}">${label}</label>${extra}</div><div class="auth-input-wrap"><input id="auth-${name}" name="${name}" type="${type}" placeholder="${placeholder}" autocomplete="${autocomplete}" required aria-describedby="error-${name}" ${name === "name" ? 'maxlength="100"' : ""} ${type === "password" ? 'minlength="8"' : ""}>${type === "password" ? `<button class="password-toggle" type="button" data-password="auth-${name}" aria-label="Mostrar ${label.toLowerCase()}" aria-pressed="false">${eye}</button>` : ""}</div><p class="field-error" id="error-${name}" aria-live="polite"></p></div>`;
  }

  function openAuth(mode = "login") {
    const register = mode === "register";
    const recovery = mode === "recovery";
    modal.classList.add("auth-modal");
    content.innerHTML = `<div class="auth-heading"><span class="brand-icon"><svg aria-hidden="true"><use href="#chef"/></svg></span><h2 id="modal-title">${recovery ? "Recupera tu contraseña" : register ? "Crea tu cuenta" : "Iniciar sesión"}</h2><p>${recovery ? "Introduce tu correo para probar la recuperación de acceso." : register ? "Únete a MesaSpot para descubrir y reservar las mejores experiencias culinarias" : "Accede a tu cuenta para gestionar tus reservas gastronómicas"}</p></div>
      ${recovery ? "" : `<button type="button" class="google-button" id="auth-google"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12h-8m8 0c0 5-3 8-8 8a8 8 0 1 1 6-13"/></svg>${register ? "Registrarse" : "Continuar"} con Google</button><div class="auth-divider"><span>${register ? "o completa el formulario" : "o usa tu correo"}</span></div>`}
      <form class="auth-form" id="auth-form" novalidate>
      ${register ? field("name", "Nombre completo", "text", "Tu nombre y apellidos", "name") : ""}
      ${field("email", "Correo electrónico", "email", "ejemplo@correo.com", "email")}
      ${recovery ? "" : field("password", "Contraseña", "password", register ? "Mínimo 8 caracteres" : "••••••••", register ? "new-password" : "current-password", register ? "" : '<button type="button" class="auth-link forgot-password" data-auth-mode="recovery">¿Olvidaste tu contraseña?</button>')}
      ${register ? field("confirm", "Confirmar contraseña", "password", "Repite tu contraseña", "new-password") : ""}
      ${recovery ? "" : `<div class="auth-check-group"><label class="auth-checkbox"><input type="checkbox" name="${register ? "terms" : "remember"}" ${register ? 'required aria-describedby="error-terms"' : ""}><span>${register ? 'Acepto los <button type="button" class="auth-link legal-link" data-legal="terms">Términos de Servicio</button> y la <button type="button" class="auth-link legal-link" data-legal="privacy">Política de Privacidad</button> de MesaSpot.' : "Mantener mi sesión iniciada"}</span></label>${register ? '<p class="field-error" id="error-terms" aria-live="polite"></p>' : ""}</div>`}
      <button class="button auth-submit" type="submit">${recovery ? "Enviar enlace" : register ? "Crear cuenta" : "Iniciar sesión"}</button>
      <p class="auth-feedback" id="auth-feedback" role="status" hidden></p></form>
      <p class="auth-switch">${recovery ? "¿Ya recuerdas tu contraseña?" : register ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"} <button type="button" class="auth-link" data-auth-mode="${register || recovery ? "login" : "register"}">${register || recovery ? "Inicia sesión aquí" : "Regístrate aquí"}</button></p>`;
    if (!modal.open) modal.showModal();
    document.body.style.overflow = "hidden";
    // Keep the heading visible when a long registration modal opens on mobile.
    modal.scrollTop = 0;
    const form = content.querySelector("form");
    const feedback = content.querySelector("#auth-feedback");
    function message(text) {
      feedback.textContent = text;
      feedback.hidden = false;
    }
    function validate(input) {
      let error = "";
      if (input.name === "terms") {
        if (!input.checked)
          error = "Debes aceptar los términos y la política de privacidad.";
      } else if (!input.value.trim()) {
        error = "Completa este campo.";
      } else if (
        input.name === "name" &&
        input.value.trim().split(/\s+/).length < 2
      ) {
        error = "Introduce tu nombre y al menos un apellido.";
      } else if (
        input.name === "email" &&
        (input.validity.typeMismatch ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value))
      ) {
        error = "Introduce un correo electrónico válido.";
      } else if (
        input.type === "password" ||
        input.dataset.visiblePassword === "true"
      ) {
        if (input.value.length < 8)
          error = "La contraseña debe tener al menos 8 caracteres.";
        else if (
          input.name === "confirm" &&
          input.value !== form.elements.password.value
        )
          error = "Las contraseñas no coinciden.";
      }
      input.setAttribute("aria-invalid", String(Boolean(error)));
      content.querySelector(`#error-${input.name}`).textContent = error;
      return !error;
    }
    const inputs = [...form.querySelectorAll("input[required]")];
    inputs.forEach((input) => {
      input.addEventListener("blur", () => validate(input));
      input.addEventListener("input", () => {
        feedback.hidden = true;
        if (input.getAttribute("aria-invalid") === "true") validate(input);
        if (input.name === "password" && form.elements.confirm?.value)
          validate(form.elements.confirm);
      });
      if (input.type === "checkbox")
        input.addEventListener("change", () => validate(input));
    });
    content.querySelectorAll("[data-password]").forEach((button) =>
      button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.password);
        const visible = input.type === "password";
        input.type = visible ? "text" : "password";
        input.dataset.visiblePassword = String(visible);
        button.setAttribute("aria-pressed", String(visible));
        button.setAttribute(
          "aria-label",
          `${visible ? "Ocultar" : "Mostrar"} ${input.name === "confirm" ? "confirmación de contraseña" : "contraseña"}`,
        );
      }),
    );
    content.querySelectorAll("[data-auth-mode]").forEach((button) =>
      button.addEventListener("click", () => {
        openAuth(button.dataset.authMode);
        content.querySelector("input").focus({ preventScroll: true });
      }),
    );
    content.querySelectorAll("[data-legal]").forEach((button) =>
      button.addEventListener("click", () => {
        const [title, description] =
          window.MESA_DATA.information[button.dataset.legal];
        message(`${title}: ${description}`);
      }),
    );
    content
      .querySelector("#auth-google")
      ?.addEventListener("click", () =>
        message(
          "El acceso con Google requiere conectar un servicio de autenticación. No está disponible en esta demostración.",
        ),
      );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const valid = inputs.map(validate).every(Boolean);
      if (!valid) {
        form.querySelector('[aria-invalid="true"]').focus();
        return;
      }
      message(
        recovery
          ? "Validación completada. En esta demostración no se envía un correo de recuperación."
          : register
            ? "Formulario válido. Registro de demostración completado; no se ha creado una cuenta."
            : "Formulario válido. Inicio de sesión de demostración; no se ha autenticado una cuenta.",
      );
      form
        .querySelectorAll(
          'input[type="password"], input[data-visible-password]',
        )
        .forEach((input) => {
          input.value = "";
        });
    });
  }
  document
    .querySelectorAll("[data-account]")
    .forEach((button) =>
      button.addEventListener("click", () => openAuth(button.dataset.account)),
    );
})();
