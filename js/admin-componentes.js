// ==========================================
// Componentes compartidos del panel del propietario
// ==========================================
(() => {
  "use strict";
  const {
    element: crearElemento,
    image: crearImagen,
    label: traducir,
    money: dinero,
  } = MesaUI;
  let secuencia = 0;
  const estado = { cambios: false, guardando: false };

  // ==========================================
  // Crear un botón accesible con icono Lucide
  // ==========================================
  function boton(texto, accion, icono, clase = "owner-button") {
    const control = crearElemento("button", clase);
    control.type = "button";
    if (icono) control.append(MesaIcons.icon(icono));
    if (texto) control.append(crearElemento("span", "", texto));
    else control.setAttribute("aria-label", accion?.titulo || "Acción");
    if (accion) control.addEventListener("click", accion);
    return control;
  }

  // ==========================================
  // Construir una tarjeta con título y contenido
  // ==========================================
  function tarjeta(titulo, clase = "") {
    const bloque = crearElemento("section", "owner-card " + clase);
    if (titulo) bloque.append(crearElemento("h2", "", titulo));
    return bloque;
  }

  // ==========================================
  // Construir la cabecera de una pantalla
  // ==========================================
  function cabecera(titulo, descripcion, acciones = []) {
    const bloque = crearElemento("header", "owner-heading");
    const texto = crearElemento("div");
    texto.append(
      crearElemento("h1", "", titulo),
      crearElemento("p", "owner-muted", descripcion),
    );
    const botones = crearElemento("div", "owner-actions");
    botones.append(...acciones);
    bloque.append(texto, botones);
    return bloque;
  }

  // ==========================================
  // Abrir el perfil público cuando el restaurante está publicado
  // ==========================================
  function enlacePublico(contexto) {
    const enlace = crearElemento(
      "a",
      "owner-button secondary",
      "Ver restaurante",
    );
    enlace.prepend(MesaIcons.icon("external-link"));
    if (contexto.restaurante?.status === "PUBLISHED") {
      enlace.href = MesaUI.detailUrl(contexto.restaurante);
      enlace.target = "_blank";
      enlace.rel = "noopener noreferrer";
    } else {
      enlace.setAttribute("aria-disabled", "true");
      enlace.title = "Publica el restaurante para consultar su perfil público.";
    }
    return enlace;
  }

  // ==========================================
  // Crear un campo con etiqueta y espacio para su error
  // ==========================================
  function campo(contenedor, nombre, etiqueta, valor = "", opciones = {}) {
    const envoltura = crearElemento(
      "div",
      "owner-field " + (opciones.clase || ""),
    );
    const id = "owner-field-" + ++secuencia;
    const titulo = crearElemento(
      "label",
      "",
      etiqueta + (opciones.required ? " *" : ""),
    );
    titulo.htmlFor = id;
    const entrada = crearElemento(
      opciones.tipo === "textarea"
        ? "textarea"
        : opciones.opciones
          ? "select"
          : "input",
    );
    entrada.name = nombre;
    entrada.id = id;
    if (entrada.tagName === "INPUT") entrada.type = opciones.tipo || "text";
    if (opciones.opciones) {
      for (const [codigo, texto] of opciones.opciones) {
        const opcion = crearElemento("option", "", texto);
        opcion.value = codigo;
        entrada.append(opcion);
      }
    }
    entrada.value = valor ?? "";
    for (const atributo of [
      "required",
      "maxLength",
      "minLength",
      "min",
      "max",
      "step",
      "pattern",
      "rows",
    ]) {
      if (opciones[atributo] !== undefined)
        entrada[atributo] = opciones[atributo];
    }
    const error = crearElemento("small", "owner-field-error");
    error.id = id + "-error";
    entrada.setAttribute("aria-describedby", error.id);
    if (opciones.ayuda) {
      const ayuda = crearElemento("small", "owner-help", opciones.ayuda);
      ayuda.id = id + "-help";
      entrada.setAttribute("aria-describedby", ayuda.id + " " + error.id);
      envoltura.append(titulo, entrada, ayuda, error);
    } else envoltura.append(titulo, entrada, error);
    contenedor.append(envoltura);
    return entrada;
  }

  // ==========================================
  // Crear una casilla o interruptor con etiqueta
  // ==========================================
  function casilla(contenedor, nombre, etiqueta, marcado = false, clase = "") {
    const grupo = crearElemento("label", "owner-check " + clase);
    const entrada = crearElemento("input");
    entrada.type = "checkbox";
    entrada.name = nombre;
    entrada.checked = marcado;
    grupo.append(entrada, crearElemento("span", "", etiqueta));
    contenedor.append(grupo);
    return entrada;
  }

  // ==========================================
  // Mostrar el estado de publicación de un recurso
  // ==========================================
  function insignia(codigo) {
    return crearElemento(
      "span",
      "owner-badge " +
        (codigo === "ACTIVE" || codigo === "PUBLISHED"
          ? "positive"
          : "neutral"),
      traducir(codigo),
    );
  }

  // ==========================================
  // Marcar un campo inválido con su mensaje
  // ==========================================
  function errorCampo(entrada, mensaje) {
    if (!entrada) return;
    entrada.setAttribute("aria-invalid", "true");
    const aviso = entrada
      .closest(".owner-field")
      ?.querySelector(".owner-field-error");
    if (aviso) aviso.textContent = mensaje;
  }

  // ==========================================
  // Preparar el formulario y detectar cambios pendientes
  // ==========================================
  function formulario(clase = "") {
    const formulario = crearElemento("form", "owner-form " + clase);
    formulario.noValidate = true;
    formulario.addEventListener("input", () => {
      estado.cambios = true;
    });
    formulario.addEventListener("change", () => {
      estado.cambios = true;
    });
    return formulario;
  }

  // ==========================================
  // Mostrar una confirmación después del guardado real
  // ==========================================
  function confirmarExito(mensaje) {
    const contenido = MesaUI.modal("Cambios guardados", "owner-notice");
    contenido.prepend(MesaIcons.icon("circle-check"));
    contenido.append(
      crearElemento("p", "owner-muted", mensaje),
      boton(
        "Entendido",
        () => document.querySelector("#modal").close(),
        "check",
      ),
    );
  }

  // ==========================================
  // Validar y enviar un formulario sin perder sus valores
  // ==========================================
  async function guardar(formulario, construir, enviar, completar) {
    if (estado.guardando) return;
    const aviso = formulario.querySelector(".owner-form-message");
    aviso.hidden = true;
    for (const entrada of formulario.querySelectorAll("[aria-invalid]"))
      entrada.removeAttribute("aria-invalid");
    for (const error of formulario.querySelectorAll(".owner-field-error"))
      error.textContent = "";
    let controles = [];
    try {
      const invalidos = [...formulario.elements].filter(
        (entrada) => entrada.willValidate && !entrada.checkValidity(),
      );
      if (invalidos.length) {
        for (const entrada of invalidos)
          errorCampo(entrada, entrada.validationMessage);
        invalidos[0].focus();
        throw new Error("Revisa los campos señalados antes de guardar.");
      }
      const cuerpo = construir();
      estado.guardando = true;
      formulario.setAttribute("aria-busy", "true");
      controles = [...formulario.elements].map((entrada) => [
        entrada,
        entrada.disabled,
      ]);
      controles.forEach(([entrada]) => {
        entrada.disabled = true;
      });
      const resultado = await enviar(cuerpo);
      estado.cambios = false;
      await completar(resultado.data);
    } catch (error) {
      if (!formulario.isConnected) return;
      aviso.hidden = false;
      aviso.textContent = error.message || "No pudimos guardar los cambios.";
      if (Array.isArray(error.details)) {
        for (const detalle of error.details) {
          if (!detalle?.field) continue;
          const entrada = [...formulario.elements].find(
            (entrada) => entrada.name === detalle.field,
          );
          if (entrada) errorCampo(entrada, detalle.message);
          else
            aviso.append(
              crearElemento(
                "span",
                "owner-error-detail",
                detalle.field + ": " + detalle.message,
              ),
            );
        }
      }
      formulario.querySelector('[aria-invalid="true"]')?.focus();
    } finally {
      estado.guardando = false;
      formulario.removeAttribute("aria-busy");
      controles.forEach(([entrada, deshabilitado]) => {
        entrada.disabled = deshabilitado;
      });
    }
  }

  // ==========================================
  // Añadir acciones y mensajes accesibles a un formulario
  // ==========================================
  function accionesFormulario(
    formulario,
    cancelar,
    titulo = "Guardar cambios",
  ) {
    const mensaje = crearElemento("div", "owner-form-message");
    mensaje.hidden = true;
    mensaje.setAttribute("role", "alert");
    const acciones = crearElemento("div", "owner-form-actions");
    const guardar = boton(titulo, null, "check");
    guardar.type = "submit";
    acciones.append(
      boton("Cancelar", cancelar, null, "owner-button secondary"),
      guardar,
    );
    formulario.append(mensaje, acciones);
  }

  // ==========================================
  // Mostrar un estado vacío o un fallo con reintento
  // ==========================================
  function mensaje(contenedor, titulo, descripcion, accion) {
    const bloque = crearElemento("div", "owner-empty");
    bloque.setAttribute("role", "status");
    bloque.append(
      MesaIcons.icon("store"),
      crearElemento("h2", "", titulo),
      crearElemento("p", "owner-muted", descripcion),
    );
    if (accion) bloque.append(accion);
    contenedor.replaceChildren(bloque);
  }

  // ==========================================
  // Animar las tarjetas respetando movimiento reducido
  // ==========================================
  function animar(contenedor) {
    if (!window.AOS || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    contenedor
      .querySelectorAll(".owner-card, .owner-photo, .owner-dish")
      .forEach((nodo) => {
        nodo.dataset.aos = "fade-up";
        nodo.dataset.aosDuration = "400";
      });
    AOS.refreshHard();
  }

  // ==========================================
  // Confirmar la salida cuando existen cambios sin guardar
  // ==========================================
  function permitirSalida() {
    if (estado.guardando) return false;
    if (
      estado.cambios &&
      !window.confirm(
        "Tienes cambios sin guardar. ¿Quieres salir y descartarlos?",
      )
    )
      return false;
    estado.cambios = false;
    return true;
  }

  // ==========================================
  // Elegir una foto publicada de la galería del restaurante
  // ==========================================
  function elegirFoto(contexto, seleccionada, seleccionar) {
    const contenido = MesaUI.modal("Elegir de la galería", "owner-picker");
    const lista = crearElemento("div", "owner-picker-grid");
    lista.append(
      boton(
        "Sin fotografía",
        () => {
          seleccionar(null);
          document.querySelector("#modal").close();
        },
        "image-off",
        "owner-button secondary",
      ),
    );
    for (const foto of contexto.fotos.filter(
      (foto) => foto.status === "PUBLISHED",
    )) {
      const opcion = boton(
        "",
        () => {
          seleccionar(foto._id);
          document.querySelector("#modal").close();
        },
        null,
        "owner-picker-option",
      );
      opcion.setAttribute("aria-label", foto.title);
      opcion.setAttribute("aria-pressed", String(foto._id === seleccionada));
      opcion.append(
        crearImagen(foto.url, foto.altText || foto.title),
        crearElemento("span", "", foto.title),
      );
      lista.append(opcion);
    }
    if (!contexto.fotos.some((foto) => foto.status === "PUBLISHED"))
      contenido.append(
        crearElemento(
          "p",
          "owner-muted",
          "Publica fotografías desde Fotos para poder elegirlas aquí.",
        ),
      );
    contenido.append(lista);
  }

  // ==========================================
  // Consultar una página y construir su paginación
  // ==========================================
  function paginar(contenedor, metadatos, cambiar) {
    const pie = crearElemento("footer", "owner-pagination");
    const desde = metadatos.total
      ? (metadatos.page - 1) * metadatos.limit + 1
      : 0;
    pie.append(
      crearElemento(
        "p",
        "owner-muted",
        "Mostrando " +
          desde +
          "–" +
          Math.min(metadatos.page * metadatos.limit, metadatos.total) +
          " de " +
          metadatos.total,
      ),
    );
    const controles = crearElemento("nav", "owner-page-controls");
    controles.setAttribute("aria-label", "Páginas de resultados");
    MesaUI.paginate(controles, metadatos.page, metadatos.totalPages, cambiar);
    pie.append(controles);
    contenedor.append(pie);
  }

  window.MesaAdminUI = {
    crearElemento,
    crearImagen,
    traducir,
    dinero,
    boton,
    tarjeta,
    cabecera,
    enlacePublico,
    campo,
    casilla,
    insignia,
    errorCampo,
    formulario,
    guardar,
    accionesFormulario,
    confirmarExito,
    mensaje,
    animar,
    permitirSalida,
    elegirFoto,
    paginar,
    estado,
  };
})();
