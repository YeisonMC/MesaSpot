// ==========================================
// Vista y edición de la información del restaurante
// ==========================================
(() => {
  "use strict";
  const U = MesaAdminUI;

  // ==========================================
  // Mostrar los datos publicados del restaurante
  // ==========================================
  function mostrar(contenedor, contexto) {
    const restaurante = contexto.restaurante;
    if (!restaurante) return editar(contenedor, contexto);
    const enlace = U.crearElemento(
      "a",
      "owner-button secondary",
      "Ver perfil público",
    );
    enlace.href = MesaUI.detailUrl(restaurante);
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    enlace.prepend(MesaIcons.icon("external-link"));
    if (restaurante.status !== "PUBLISHED") {
      enlace.removeAttribute("href");
      enlace.setAttribute("aria-disabled", "true");
      enlace.title = "Publica el restaurante para consultar su perfil público.";
    }
    contenedor.replaceChildren(
      U.cabecera(
        "Mi restaurante",
        "Consulta la información que compartes con tus comensales.",
        [
          U.boton(
            "Editar restaurante",
            () => editar(contenedor, contexto),
            "pencil",
          ),
          enlace,
        ],
      ),
    );
    const columnas = U.crearElemento("div", "owner-columns");
    const principal = U.crearElemento("div", "owner-stack");
    const lateral = U.crearElemento("div", "owner-stack");
    const informacion = U.tarjeta("Información del restaurante");
    const identidad = U.crearElemento("div", "owner-identity");
    const resumen = U.crearElemento("div");
    resumen.append(
      U.crearElemento("h2", "owner-restaurant-name", restaurante.name),
      U.insignia(restaurante.status),
      U.crearElemento("p", "", restaurante.shortDescription),
    );
    identidad.append(
      U.crearImagen(restaurante.thumbnailPhoto?.url, restaurante.name),
      resumen,
    );
    informacion.append(identidad);
    const datos = U.crearElemento("dl", "owner-data-grid");
    agregarDato(datos, "Nombre", restaurante.name);
    agregarDato(datos, "Identificador público", restaurante.slug);
    agregarDato(
      datos,
      "Año de fundación",
      restaurante.foundedYear || "Sin especificar",
    );
    const tipos = U.crearElemento("div", "owner-tags");
    restaurante.cuisineTypes.forEach((tipo) =>
      tipos.append(U.crearElemento("span", "owner-tag", U.traducir(tipo))),
    );
    agregarDato(datos, "Tipo de comida", tipos);
    informacion.append(
      datos,
      U.crearElemento("h3", "owner-divider", "Sobre el restaurante"),
    );
    if (!restaurante.description?.length)
      informacion.append(
        U.crearElemento(
          "p",
          "owner-muted",
          "Agrega una descripción para contar la historia de tu restaurante.",
        ),
      );
    for (const parrafo of restaurante.description || [])
      informacion.append(U.crearElemento("p", "owner-paragraph", parrafo));
    const contacto = U.tarjeta("Contacto y redes");
    for (const [clave, titulo, icono] of [
      ["email", "Correo electrónico", "mail"],
      ["website", "Página web", "globe"],
      ["instagramUrl", "Instagram", "instagram"],
      ["facebookUrl", "Facebook", "facebook"],
    ]) {
      const fila = U.crearElemento("div", "owner-contact-row");
      const valor = restaurante.contact?.[clave];
      fila.append(MesaIcons.icon(icono), U.crearElemento("strong", "", titulo));
      if (valor)
        fila.append(
          MesaUI.external(
            valor,
            clave === "email" ? "mailto:" + valor : valor,
            clave === "email" ? ["mailto:"] : undefined,
          ),
        );
      else
        fila.append(U.crearElemento("span", "owner-muted", "Sin especificar"));
      contacto.append(fila);
    }
    principal.append(informacion, contacto);
    const fotos = U.tarjeta("Imágenes del perfil");
    fotos.append(
      U.crearElemento("h3", "", "Portada"),
      U.crearImagen(
        restaurante.coverPhoto?.url,
        "Portada del restaurante",
        "owner-cover",
      ),
      U.crearElemento("h3", "", "Miniatura"),
      U.crearImagen(
        restaurante.thumbnailPhoto?.url,
        "Miniatura del restaurante",
        "owner-thumbnail",
      ),
    );
    const publicacion = U.tarjeta("Publicación");
    const ficha = U.crearElemento("dl", "owner-publication");
    agregarDato(ficha, "Estado", U.traducir(restaurante.status));
    agregarDato(
      ficha,
      "Local principal",
      restaurante.mainBranch?.name || "Sin elegir",
    );
    agregarDato(ficha, "Destacado", restaurante.featured ? "Sí" : "No");
    agregarDato(
      ficha,
      "Dirección",
      restaurante.mainBranch
        ? restaurante.mainBranch.address.street +
            ", " +
            restaurante.mainBranch.address.district
        : "Agrega un local desde Locales.",
    );
    publicacion.append(ficha);
    lateral.append(fotos, publicacion);
    columnas.append(principal, lateral);
    contenedor.append(columnas);
    U.animar(contenedor);
  }

  // ==========================================
  // Añadir un dato descriptivo a la ficha de lectura
  // ==========================================
  function agregarDato(lista, titulo, valor) {
    const grupo = U.crearElemento("div");
    grupo.append(U.crearElemento("dt", "", titulo));
    const detalle = U.crearElemento("dd");
    if (valor instanceof Node) detalle.append(valor);
    else detalle.textContent = valor;
    grupo.append(detalle);
    lista.append(grupo);
  }

  // ==========================================
  // Construir un selector de imagen con vista previa
  // ==========================================
  function selectorImagen(contenedor, contexto, nombre, titulo, valor) {
    contenedor.append(U.crearElemento("h3", "", titulo));
    const imagen = U.crearImagen(
      contexto.fotos.find((foto) => foto._id === valor)?.url,
      titulo,
      nombre === "thumbnailPhotoId" ? "owner-thumbnail" : "owner-cover",
    );
    const entrada = U.campo(contenedor, nombre, titulo, valor || "", {
      tipo: "hidden",
    });
    entrada.closest(".owner-field").hidden = true;
    // Un contenedor estable permite elegir varias fotos sin recrear el editor.
    const vista = U.crearElemento("div");
    vista.append(imagen);
    const elegir = U.boton(
      "Elegir de la galería",
      () =>
        U.elegirFoto(contexto, entrada.value, (id) => {
          entrada.value = id || "";
          vista.replaceChildren(
            U.crearImagen(
              contexto.fotos.find((foto) => foto._id === id)?.url,
              titulo,
              imagen.className,
            ),
          );
          U.estado.cambios = true;
        }),
      "images",
      "owner-button secondary",
    );
    contenedor.append(vista, elegir);
    return entrada;
  }

  // ==========================================
  // Editar o crear el restaurante con todos sus campos
  // ==========================================
  function editar(contenedor, contexto) {
    const restaurante = contexto.restaurante || {};
    contenedor.replaceChildren(
      U.cabecera(
        restaurante._id ? "Información del restaurante" : "Crear restaurante",
        "Actualiza los datos que verán tus comensales. Los campos con * son obligatorios.",
        restaurante._id ? [U.enlacePublico(contexto)] : [],
      ),
    );
    const formulario = U.formulario("owner-columns");
    const principal = U.crearElemento("div", "owner-stack");
    const lateral = U.crearElemento("div", "owner-stack");
    const general = U.tarjeta("Información general");
    const grupo = U.crearElemento("div", "owner-form-grid");
    const nombre = U.campo(grupo, "name", "Nombre", restaurante.name, {
      required: true,
      maxLength: 120,
    });
    const slug = U.campo(
      grupo,
      "slug",
      "URL del restaurante",
      restaurante.slug,
      {
        required: true,
        minLength: 3,
        maxLength: 150,
        pattern: "[a-z0-9]+(?:-[a-z0-9]+)*",
        ayuda: "Solo minúsculas, números y guiones. Ejemplo: mi-restaurante.",
      },
    );
    const anio = U.campo(
      grupo,
      "foundedYear",
      "Año de fundación",
      restaurante.foundedYear,
      { tipo: "number", min: 1500, max: new Date().getFullYear(), step: 1 },
    );
    general.append(grupo);
    const breve = U.campo(
      general,
      "shortDescription",
      "Descripción breve",
      restaurante.shortDescription,
      { tipo: "textarea", required: true, maxLength: 300, rows: 2 },
    );
    const descripcion = U.campo(
      general,
      "description",
      "Sobre el restaurante",
      restaurante.description?.join("\n\n"),
      {
        tipo: "textarea",
        rows: 7,
        ayuda:
          "Separa los párrafos con una línea en blanco. Hasta 10 párrafos de 3000 caracteres.",
      },
    );
    const cocinas = U.crearElemento("fieldset", "owner-food-types");
    cocinas.append(U.crearElemento("legend", "", "Tipo de comida *"));
    const codigos = [
      ...new Set([
        ...(contexto.metadata.foodTypes || contexto.metadata.cuisines),
        ...(restaurante.cuisineTypes || []),
      ]),
    ];
    const controles = codigos.map((codigo) => [
      codigo,
      U.casilla(
        cocinas,
        "cuisineTypes",
        U.traducir(codigo),
        restaurante.cuisineTypes?.includes(codigo),
      ),
    ]);
    general.append(cocinas);
    const contacto = U.tarjeta("Contacto y redes");
    const redes = U.crearElemento("div", "owner-form-grid");
    const entradasContacto = {};
    for (const [clave, titulo] of [
      ["email", "Correo electrónico"],
      ["website", "Página web"],
      ["instagramUrl", "Instagram"],
      ["facebookUrl", "Facebook"],
    ])
      entradasContacto[clave] = U.campo(
        redes,
        "contact." + clave,
        titulo,
        restaurante.contact?.[clave],
        { tipo: clave === "email" ? "email" : "url" },
      );
    contacto.append(redes);
    principal.append(general, contacto);
    const fotos = U.tarjeta("Imágenes del perfil");
    const portada = selectorImagen(
      fotos,
      contexto,
      "coverPhotoId",
      "Portada",
      restaurante.coverPhotoId,
    );
    const miniatura = selectorImagen(
      fotos,
      contexto,
      "thumbnailPhotoId",
      "Miniatura",
      restaurante.thumbnailPhotoId,
    );
    const publicacion = U.tarjeta("Publicación");
    const estado = U.campo(
      publicacion,
      "status",
      "Estado",
      restaurante.status || "DRAFT",
      {
        opciones: ["DRAFT", "PUBLISHED", "ARCHIVED"].map((codigo) => [
          codigo,
          U.traducir(codigo),
        ]),
      },
    );
    const local = U.campo(
      publicacion,
      "mainBranchId",
      "Local principal",
      restaurante.mainBranchId,
      {
        opciones: [
          ["", "Sin elegir"],
          ...contexto.locales
            .filter((local) => local.status === "ACTIVE")
            .map((local) => [local._id, local.name]),
        ],
      },
    );
    const destacado = U.casilla(
      publicacion,
      "featured",
      "Destacar restaurante",
      restaurante.featured,
      "owner-switch",
    );
    if (!restaurante._id)
      publicacion.append(
        U.crearElemento(
          "p",
          "owner-help",
          "Primero crea el restaurante. Después podrás agregar locales y fotografías.",
        ),
      );
    lateral.append(fotos, publicacion);
    formulario.append(principal, lateral);
    U.accionesFormulario(
      formulario,
      () => {
        if (U.permitirSalida()) mostrar(contenedor, contexto);
      },
      restaurante._id ? "Guardar cambios" : "Crear restaurante",
    );
    if (!restaurante._id)
      formulario.querySelector(".owner-form-actions button").hidden = true;
    if (restaurante._id && restaurante.status !== "ARCHIVED")
      formulario.append(
        U.boton(
          "Archivar restaurante",
          () => contexto.archivar("", restaurante),
          "archive",
          "owner-button danger owner-archive",
        ),
      );
    formulario.addEventListener("submit", (evento) => {
      evento.preventDefault();
      U.guardar(
        formulario,
        () => {
          const tipos = controles
            .filter(([, entrada]) => entrada.checked)
            .map(([codigo]) => codigo);
          if (!tipos.length || tipos.length > 10)
            throw new Error("Selecciona entre 1 y 10 tipos de comida.");
          const parrafos = descripcion.value
            .split(/\n\s*\n/)
            .map((parrafo) => parrafo.trim())
            .filter(Boolean);
          if (
            parrafos.length > 10 ||
            parrafos.some((parrafo) => parrafo.length > 3000)
          )
            throw new Error(
              "La descripción admite 10 párrafos de hasta 3000 caracteres cada uno.",
            );
          return {
            name: nombre.value.trim(),
            slug: slug.value.trim(),
            foundedYear: anio.value ? Number(anio.value) : null,
            shortDescription: breve.value.trim(),
            description: parrafos,
            cuisineTypes: tipos,
            contact: Object.fromEntries(
              Object.entries(entradasContacto).map(([clave, entrada]) => [
                clave,
                entrada.value.trim() || null,
              ]),
            ),
            coverPhotoId: portada.value || null,
            thumbnailPhotoId: miniatura.value || null,
            mainBranchId: local.value || null,
            featured: destacado.checked,
            status: estado.value,
          };
        },
        (cuerpo) =>
          contexto.peticion("", {
            method: restaurante._id ? "PATCH" : "POST",
            body: cuerpo,
          }),
        async (guardado) => {
          await contexto.actualizar(guardado._id);
          U.confirmarExito(
            "La información de tu restaurante se actualizó correctamente.",
          );
        },
      );
    });
    contenedor.append(formulario);
    U.animar(contenedor);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  window.MesaAdminRestaurante = { mostrar, editar, selectorImagen };
})();
