// ==========================================
// Administración de restaurantes y sus recursos
// ==========================================

(() => {
  "use strict";
  const {
    $: seleccionar,
    element: crearElemento,
    button: crearBoton,
    field: crearCampo,
    label: traducirEtiqueta,
    state: mostrarEstado,
    feedback: mostrarMensaje,
    modal: abrirModal,
  } = MesaUI;
  const root = seleccionar("#admin-workspace");
  let restaurants = [],
    selected,
    metadata,
    activeType = "restaurants",
    resources = {},
    operation = 0;
  const names = {
    restaurants: "Restaurante",
    branches: "Locales",
    photos: "Galería",
    "menu-items": "Carta",
    promotions: "Promociones",
    reviews: "Reseñas",
  };
  // ==========================================
  // Construir la ruta del recurso administrativo
  // ==========================================
  const rutaAdministrativa = (type) =>
    "/admin/restaurants" +
    (selected ? "/" + selected._id : "") +
    (type === "restaurants" ? "" : "/" + type);
  // ==========================================
  // Preparar opciones con etiquetas legibles
  // ==========================================
  const opcionesConEtiqueta = (values) =>
    values.map((code) => [code, traducirEtiqueta(code)]);
  const days = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];
  // ==========================================
  // Crear un grupo de casillas de selección
  // ==========================================
  function crearCasillas(form, name, title, records, values = []) {
    const group = crearElemento("fieldset", "check-fields");
    group.append(crearElemento("legend", "", title));
    records.forEach(([value, text]) => {
      const wrap = crearElemento("label");
      const input = crearElemento("input");
      input.type = "checkbox";
      input.name = name;
      input.value = value;
      input.checked = values.includes(value);
      wrap.append(input, crearElemento("span", "", text));
      group.append(wrap);
    });
    form.append(group);
  }
  // ==========================================
  // Cargar los restaurantes administrados por la cuenta
  // ==========================================
  async function cargarRestaurantesAdministrados() {
    const token = ++operation;
    mostrarEstado(root, "Cargando administración…");
    try {
      restaurants = await MesaAPI.all(
        "/admin/restaurants",
        {},
        { authenticated: true },
      );
      metadata ||= (await MesaAPI.request("/metadata")).data;
      if (token !== operation) return;
      selected =
        restaurants.find((r) => r._id === selected?._id) || restaurants[0];
      await cargarRecursosDelRestaurante();
    } catch (error) {
      mostrarEstado(root, error.message, cargarRestaurantesAdministrados);
    }
  }
  // ==========================================
  // Cargar los recursos del restaurante seleccionado
  // ==========================================
  async function cargarRecursosDelRestaurante() {
    if (!selected) return mostrarPanelAdministrativo();
    mostrarEstado(root, "Cargando contenido de " + selected.name + "…");
    try {
      const types = ["branches", "photos", "menu-items", "promotions"];
      const loaded = await Promise.all(
        types.map((type) =>
          MesaAPI.all(
            "/admin/restaurants/" + selected._id + "/" + type,
            {},
            { authenticated: true },
          ),
        ),
      );
      resources = Object.fromEntries(types.map((type, i) => [type, loaded[i]]));
      mostrarPanelAdministrativo();
    } catch (error) {
      mostrarEstado(root, error.message, cargarRecursosDelRestaurante);
    }
  }
  // ==========================================
  // Mostrar el panel de administración
  // ==========================================
  function mostrarPanelAdministrativo() {
    root.replaceChildren();
    const toolbar = crearElemento("div", "admin-toolbar");
    const select = crearCampo(
      toolbar,
      "restaurant",
      "Tu restaurante",
      "select",
      selected?._id || "",
      {
        choices: restaurants.map((r) => [
          r._id,
          r.name + " · " + traducirEtiqueta(r.status),
        ]),
      },
    );
    // ==========================================
    // Cargar el contenido del restaurante elegido
    // ==========================================
    const cambiarRestauranteAdministrado = () => {
      selected = restaurants.find((r) => r._id === select.value);
      cargarRecursosDelRestaurante();
    };

    select.addEventListener("change", cambiarRestauranteAdministrado);
    toolbar.append(
      crearBoton("Crear restaurante", () =>
        abrirEditorDeRecurso("restaurants"),
      ),
    );
    root.append(toolbar);
    if (!selected) {
      const empty = crearElemento("div");
      root.append(empty);
      return mostrarEstado(
        empty,
        "Todavía no administras restaurantes. Crea el primero para comenzar.",
      );
    }
    const nav = crearElemento("div", "categories");
    Object.entries(names).forEach(([type, title]) => {
      const b = crearBoton(
        title,
        () => {
          activeType = type;
          mostrarPanelAdministrativo();
        },
        "category",
      );
      b.setAttribute("aria-pressed", String(type === activeType));
      nav.append(b);
    });
    root.append(nav);
    const area = crearElemento("section", "detail-panel");
    area.append(crearElemento("h2", "", names[activeType]));
    root.append(area);
    if (activeType === "restaurants") {
      area.append(
        crearElemento("p", "", selected.shortDescription),
        crearElemento(
          "p",
          "muted",
          "Estado: " + traducirEtiqueta(selected.status),
        ),
        crearBoton("Editar restaurante", () =>
          abrirEditorDeRecurso("restaurants", selected),
        ),
      );
      if (selected.status !== "ARCHIVED")
        area.append(
          crearBoton(
            "Archivar restaurante",
            () => archivarRecurso("restaurants", selected),
            "text-link danger",
          ),
        );
      return;
    }
    if (activeType === "reviews")
      return void mostrarResenasParaAdministrar(area);
    area.append(
      crearBoton(
        "Agregar " +
          {
            branches: "local",
            photos: "foto",
            "menu-items": "plato",
            promotions: "promoción",
          }[activeType],
        () => abrirEditorDeRecurso(activeType),
      ),
    );
    const list = crearElemento("div", "admin-resource-list");
    area.append(list);
    const items = resources[activeType] || [];
    if (!items.length) mostrarEstado(list, "No hay registros todavía.");
    items.forEach((item) => {
      const row = crearElemento("article", "admin-resource");
      row.append(
        crearElemento("strong", "", item.name || item.title),
        crearElemento("span", "tag", traducirEtiqueta(item.status)),
        crearBoton(
          "Editar",
          () => abrirEditorDeRecurso(activeType, item),
          "text-link",
        ),
      );
      if (item.status !== "ARCHIVED")
        row.append(
          crearBoton(
            "Archivar",
            () => archivarRecurso(activeType, item),
            "text-link danger",
          ),
        );
      list.append(row);
    });
  }
  // ==========================================
  // Confirmar y archivar un recurso
  // ==========================================
  async function archivarRecurso(type, item) {
    if (!confirm("¿Archivar " + (item.name || item.title) + "?")) return;
    try {
      await MesaAPI.request(
        type === "restaurants"
          ? "/admin/restaurants/" + item._id
          : rutaAdministrativa(type) + "/" + item._id,
        { method: "DELETE", authenticated: true },
      );
      await cargarRestaurantesAdministrados();
    } catch (error) {
      abrirModal("No se pudo archivar").append(
        crearElemento("p", "is-error", error.message),
      );
    }
  }
  // ==========================================
  // Mostrar reseñas y controles de respuesta
  // ==========================================
  async function mostrarResenasParaAdministrar(area) {
    const rid = selected._id;
    mostrarEstado(area, "Cargando reseñas…");
    try {
      const reviews = await MesaAPI.all("/restaurants/" + rid + "/reviews");
      if (!area.isConnected) return;
      area.replaceChildren(crearElemento("h2", "", "Reseñas de clientes"));
      if (!reviews.length)
        area.append(crearElemento("p", "", "No hay reseñas publicadas."));
      reviews.forEach((review) => {
        const article = crearElemento("article", "review-card");
        article.append(
          crearElemento("h3", "", review.title),
          crearElemento("p", "", review.comment),
          crearElemento(
            "p",
            "muted",
            "Calificación: " + review.ratings.overall + "/5",
          ),
        );
        const form = crearElemento("form", "modal-form");
        const reply = crearCampo(
          form,
          "comment",
          "Respuesta del restaurante",
          "textarea",
          review.adminReply?.comment || "",
          { required: true, minlength: "3", maxlength: "2000" },
        );
        const submit = crearElemento("button", "button", "Guardar respuesta");
        submit.type = "submit";
        const status = crearElemento("p", "auth-feedback");
        status.setAttribute("role", "status");
        form.append(submit, status);
        // ==========================================
        // Publicar o actualizar la respuesta del administrador
        // ==========================================
        const guardarRespuestaDeResena = async (event) => {
          event.preventDefault();
          submit.disabled = true;
          try {
            await MesaAPI.request(
              "/admin/restaurants/" + rid + "/reviews/" + review._id + "/reply",
              {
                method: "PUT",
                authenticated: true,
                body: { comment: reply.value },
              },
            );
            mostrarMensaje(status, "Respuesta guardada.");
          } catch (error) {
            mostrarMensaje(status, error.message, true);
          } finally {
            submit.disabled = false;
          }
        };

        form.addEventListener("submit", guardarRespuestaDeResena);
        article.append(form);
        if (review.adminReply)
          article.append(
            crearBoton(
              "Eliminar respuesta",
              async (event) => {
                event.currentTarget.disabled = true;
                try {
                  await MesaAPI.request(
                    "/admin/restaurants/" +
                      rid +
                      "/reviews/" +
                      review._id +
                      "/reply",
                    { method: "DELETE", authenticated: true },
                  );
                  mostrarResenasParaAdministrar(area);
                } catch (error) {
                  mostrarMensaje(status, error.message, true);
                  event.currentTarget.disabled = false;
                }
              },
              "text-link danger",
            ),
          );
        area.append(article);
      });
    } catch (error) {
      mostrarEstado(area, error.message, () =>
        mostrarResenasParaAdministrar(area),
      );
    }
  }
  // ==========================================
  // Abrir el formulario para agregar o editar un recurso
  // ==========================================
  function abrirEditorDeRecurso(type, item) {
    const content = abrirModal(
      (item ? "Editar " : "Agregar ") + names[type].toLowerCase(),
      "wide-modal",
    );
    const form = crearElemento("form", "modal-form admin-form");
    content.append(form);
    // ==========================================
    // Leer un valor existente o su valor inicial
    // ==========================================
    const obtenerValorDelRecurso = (key, fallback = "") =>
      item?.[key] ?? fallback;
    // ==========================================
    // Agregar un campo de texto al formulario
    // ==========================================
    const crearCampoDeTexto = (name, title, val, options = {}) =>
      crearCampo(form, name, title, "text", val, options);
    const activeBranches = (resources.branches || []).filter(
      (b) => b.status === "ACTIVE",
    );
    const publishedPhotos = (resources.photos || []).filter(
      (p) => p.status === "PUBLISHED",
    );
    const photoOptions = [
      ["", "Sin foto"],
      ...publishedPhotos.map((p) => [p._id, p.title]),
    ];
    let build;
    if (type === "restaurants") {
      // ==========================================
      // Datos generales del restaurante
      // ==========================================
      crearCampoDeTexto("name", "Nombre", obtenerValorDelRecurso("name"), {
        required: true,
        maxlength: "120",
      });
      crearCampoDeTexto(
        "slug",
        "Identificador para el enlace (ejemplo: mi-restaurante)",
        obtenerValorDelRecurso("slug"),
        { required: true, pattern: "[a-z0-9]+(-[a-z0-9]+)*" },
      );
      crearCampoDeTexto(
        "shortDescription",
        "Descripción breve",
        obtenerValorDelRecurso("shortDescription"),
        {
          required: true,
          maxlength: "300",
        },
      );
      crearCampo(
        form,
        "description",
        "Sobre el restaurante (un párrafo por línea)",
        "textarea",
        obtenerValorDelRecurso("description", []).join("\n"),
      );
      crearCampo(
        form,
        "foundedYear",
        "Año de fundación",
        "number",
        obtenerValorDelRecurso("foundedYear"),
        { min: "1500", max: String(new Date().getFullYear()) },
      );
      crearCampo(
        form,
        "email",
        "Correo de contacto",
        "email",
        item?.contact?.email || "",
      );
      crearCampo(
        form,
        "website",
        "Página web",
        "url",
        item?.contact?.website || "",
      );
      crearCasillas(
        form,
        "cuisine",
        "Tipos de cocina",
        opcionesConEtiqueta(metadata.cuisines),
        obtenerValorDelRecurso("cuisineTypes", []),
      );
      crearCampo(
        form,
        "featured",
        "Mostrar como destacado",
        "select",
        String(obtenerValorDelRecurso("featured", false)),
        {
          choices: [
            ["false", "No"],
            ["true", "Sí"],
          ],
        },
      );
      if (item) {
        crearCampo(
          form,
          "mainBranchId",
          "Local principal",
          "select",
          obtenerValorDelRecurso("mainBranchId"),
          {
            choices: [
              ["", "Sin local principal"],
              ...activeBranches.map((b) => [b._id, b.name]),
            ],
          },
        );
        crearCampo(
          form,
          "coverPhotoId",
          "Foto de portada",
          "select",
          obtenerValorDelRecurso("coverPhotoId"),
          { choices: photoOptions },
        );
        crearCampo(
          form,
          "thumbnailPhotoId",
          "Foto de tarjeta",
          "select",
          obtenerValorDelRecurso("thumbnailPhotoId"),
          { choices: photoOptions },
        );
      }
      build = (v, data) => ({
        name: v.name,
        slug: v.slug,
        shortDescription: v.shortDescription,
        description: v.description
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        foundedYear: v.foundedYear ? Number(v.foundedYear) : null,
        contact: {
          ...item?.contact,
          email: v.email || null,
          website: v.website || null,
        },
        cuisineTypes: data.getAll("cuisine"),
        featured: v.featured === "true",
        ...(item && {
          mainBranchId: v.mainBranchId || null,
          coverPhotoId: v.coverPhotoId || null,
          thumbnailPhotoId: v.thumbnailPhotoId || null,
        }),
      });
    } else if (type === "branches") {
      // ==========================================
      // Dirección, horarios y servicios del local
      // ==========================================
      crearCampoDeTexto(
        "name",
        "Nombre del local",
        obtenerValorDelRecurso("name"),
        { required: true },
      );
      crearCampoDeTexto("street", "Dirección", item?.address?.street || "", {
        required: true,
      });
      crearCampoDeTexto(
        "district",
        "Distrito de Lima Metropolitana",
        item?.address?.district || "",
        { required: true },
      );
      crearCampoDeTexto(
        "reference",
        "Referencia",
        item?.address?.reference || "",
      );
      crearCampo(
        form,
        "phone",
        "Teléfono (+51…)",
        "tel",
        item?.contact?.phone || "",
      );
      crearCampo(
        form,
        "whatsapp",
        "WhatsApp (+51…)",
        "tel",
        item?.contact?.whatsapp || "",
      );
      crearCampo(
        form,
        "email",
        "Correo del local",
        "email",
        item?.contact?.email || "",
      );
      crearCampo(
        form,
        "averagePrice",
        "Precio aproximado por persona (S/)",
        "number",
        item ? (item.averagePricePerPersonCents / 100).toFixed(2) : "",
        { required: true, min: "0", step: "0.01" },
      );
      crearCampo(
        form,
        "capacity",
        "Capacidad",
        "number",
        obtenerValorDelRecurso("capacity"),
        {
          min: "1",
          step: "1",
        },
      );
      crearCampo(
        form,
        "latitude",
        "Latitud verificada (opcional)",
        "number",
        item?.location?.coordinates?.[1] ?? "",
        { min: "-90", max: "90", step: "any" },
      );
      crearCampo(
        form,
        "longitude",
        "Longitud verificada (opcional)",
        "number",
        item?.location?.coordinates?.[0] ?? "",
        { min: "-180", max: "180", step: "any" },
      );
      crearCampo(
        form,
        "mapsUrl",
        "Enlace de Google Maps",
        "url",
        item?.googleMaps?.mapsUrl || "",
      );
      crearCasillas(
        form,
        "service",
        "Servicios",
        opcionesConEtiqueta(metadata.services),
        obtenerValorDelRecurso("services", []),
      );
      form.append(
        crearElemento(
          "p",
          "muted",
          "Horarios: escribe 13:00-16:30,20:00-23:00. Deja vacío para cerrado. Para un cierre de madrugada añade +1, por ejemplo 20:00-02:00+1.",
        ),
      );
      days.forEach((day, index) => {
        const existing = item?.openingHours?.find(
          (d) => d.dayOfWeek === index + 1,
        );
        crearCampoDeTexto(
          "day" + (index + 1),
          day,
          existing
            ? existing.closed
              ? ""
              : existing.periods
                  .map(
                    (p) =>
                      p.opens + "-" + p.closes + (p.closesNextDay ? "+1" : ""),
                  )
                  .join(",")
            : "13:00-23:00",
        );
      });
      build = (v, data) => {
        if (Boolean(v.latitude) !== Boolean(v.longitude))
          throw new Error("Completa latitud y longitud, o deja ambas vacías.");
        const openingHours = days.map((day, index) => {
          const input = v["day" + (index + 1)].trim();
          const periods = input
            ? input.split(",").map((text) => {
                const match = text
                  .trim()
                  .match(/^(\d{2}:\d{2})-(\d{2}:\d{2})(\+1)?$/);
                if (!match)
                  throw new Error("Revisa el horario de " + day + ".");
                return {
                  opens: match[1],
                  closes: match[2],
                  closesNextDay: Boolean(match[3]),
                };
              })
            : [];
          return { dayOfWeek: index + 1, closed: !input, periods };
        });
        return {
          name: v.name,
          address: {
            ...item?.address,
            street: v.street,
            district: v.district,
            reference: v.reference || null,
          },
          contact: {
            phone: v.phone || null,
            whatsapp: v.whatsapp || null,
            email: v.email || null,
          },
          averagePricePerPersonCents: Math.round(Number(v.averagePrice) * 100),
          capacity: v.capacity ? Number(v.capacity) : null,
          location: v.latitude
            ? {
                type: "Point",
                coordinates: [Number(v.longitude), Number(v.latitude)],
              }
            : null,
          googleMaps: { ...item?.googleMaps, mapsUrl: v.mapsUrl || null },
          services: data.getAll("service"),
          openingHours,
        };
      };
    } else if (type === "photos") {
      // ==========================================
      // Fotos y etiquetas de la galería
      // ==========================================
      crearCampoDeTexto("title", "Título", obtenerValorDelRecurso("title"), {
        required: true,
      });
      crearCampo(
        form,
        "url",
        "Enlace público de la imagen",
        "url",
        obtenerValorDelRecurso("url"),
        {
          required: true,
        },
      );
      crearCampoDeTexto(
        "altText",
        "Descripción de la imagen",
        obtenerValorDelRecurso("altText"),
      );
      crearCampo(
        form,
        "type",
        "Tipo",
        "select",
        obtenerValorDelRecurso("type", "AMBIENCE"),
        {
          choices: opcionesConEtiqueta(metadata.photoTypes),
        },
      );
      crearCampo(
        form,
        "branchId",
        "Local",
        "select",
        obtenerValorDelRecurso("branchId"),
        {
          choices: [
            ["", "Toda la marca"],
            ...activeBranches.map((b) => [b._id, b.name]),
          ],
        },
      );
      crearCampo(
        form,
        "menuItemId",
        "Plato relacionado",
        "select",
        obtenerValorDelRecurso("menuItemId"),
        {
          choices: [
            ["", "Ninguno"],
            ...(resources["menu-items"] || [])
              .filter((m) => m.status === "ACTIVE")
              .map((m) => [m._id, m.name]),
          ],
        },
      );
      crearCampo(
        form,
        "sortOrder",
        "Orden",
        "number",
        obtenerValorDelRecurso("sortOrder", 0),
        {
          min: "0",
          step: "1",
        },
      );
      form.append(
        crearElemento(
          "p",
          "muted",
          "Usa una URL de imagen HTTPS. La carga de archivos en Vercel requiere un servicio de almacenamiento externo.",
        ),
      );
      build = (v) => ({
        title: v.title,
        url: v.url,
        altText: v.altText || null,
        type: v.type,
        branchId: v.branchId || null,
        menuItemId: v.menuItemId || null,
        sortOrder: Number(v.sortOrder),
      });
    } else if (type === "menu-items") {
      // ==========================================
      // Información y disponibilidad de platos
      // ==========================================
      crearCampoDeTexto(
        "name",
        "Nombre del plato",
        obtenerValorDelRecurso("name"),
        { required: true },
      );
      crearCampo(
        form,
        "description",
        "Descripción",
        "textarea",
        obtenerValorDelRecurso("description"),
      );
      crearCampo(
        form,
        "category",
        "Categoría",
        "select",
        obtenerValorDelRecurso("category", "MAIN"),
        { choices: opcionesConEtiqueta(metadata.menuCategories) },
      );
      crearCampo(
        form,
        "photoId",
        "Foto",
        "select",
        obtenerValorDelRecurso("photoId"),
        {
          choices: photoOptions,
        },
      );
      form.append(
        crearElemento(
          "p",
          "muted",
          "Completa el precio de los locales donde se ofrece. Un precio vacío retira la oferta de ese local.",
        ),
      );
      activeBranches.forEach((b) => {
        const offer = item?.branchOffers.find((o) => o.branchId === b._id);
        crearCampo(
          form,
          "price_" + b._id,
          b.name + " · precio (S/)",
          "number",
          offer ? (offer.priceCents / 100).toFixed(2) : "",
          { min: "0", step: "0.01" },
        );
        crearCampo(
          form,
          "available_" + b._id,
          "Disponible en " + b.name,
          "select",
          String(offer?.available ?? true),
          {
            choices: [
              ["true", "Sí"],
              ["false", "No"],
            ],
          },
        );
      });
      crearCampo(
        form,
        "featured",
        "Sugerir este plato",
        "select",
        String(item?.recommendation?.featured || false),
        {
          choices: [
            ["false", "No"],
            ["true", "Sí"],
          ],
        },
      );
      crearCampo(
        form,
        "recommendation",
        "Etiqueta de sugerencia",
        "select",
        item?.recommendation?.label || "RECOMMENDED",
        { choices: opcionesConEtiqueta(metadata.recommendations) },
      );
      crearCampoDeTexto(
        "allergens",
        "Alérgenos (separados por comas)",
        obtenerValorDelRecurso("allergens", []).join(", "),
      );
      crearCampoDeTexto(
        "dietaryTags",
        "Características alimentarias (separadas por comas)",
        obtenerValorDelRecurso("dietaryTags", []).join(", "),
      );
      crearCampo(
        form,
        "allergenInformationConfirmed",
        "Información de alérgenos confirmada",
        "select",
        String(obtenerValorDelRecurso("allergenInformationConfirmed", false)),
        {
          choices: [
            ["false", "No"],
            ["true", "Sí"],
          ],
        },
      );
      build = (v) => ({
        name: v.name,
        description: v.description || null,
        category: v.category,
        photoId: v.photoId || null,
        branchOffers: activeBranches
          .filter((b) => v["price_" + b._id] !== "")
          .map((b) => ({
            branchId: b._id,
            priceCents: Math.round(Number(v["price_" + b._id]) * 100),
            currency: "PEN",
            available: v["available_" + b._id] === "true",
          })),
        recommendation: {
          ...item?.recommendation,
          featured: v.featured === "true",
          label: v.recommendation,
        },
        allergens: v.allergens
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        dietaryTags: v.dietaryTags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        allergenInformationConfirmed: v.allergenInformationConfirmed === "true",
      });
    } else if (type === "promotions") {
      // ==========================================
      // Vigencia y condiciones de promociones
      // ==========================================
      crearCampoDeTexto("title", "Título", obtenerValorDelRecurso("title"), {
        required: true,
      });
      crearCampo(
        form,
        "description",
        "Descripción",
        "textarea",
        obtenerValorDelRecurso("description"),
      );
      crearCampo(
        form,
        "terms",
        "Condiciones",
        "textarea",
        obtenerValorDelRecurso("terms"),
      );
      crearCampo(
        form,
        "photoId",
        "Foto",
        "select",
        obtenerValorDelRecurso("photoId"),
        {
          choices: photoOptions,
        },
      );
      crearCasillas(
        form,
        "branch",
        "Locales donde aplica",
        activeBranches.map((b) => [b._id, b.name]),
        obtenerValorDelRecurso("branchIds", []),
      );
      crearCampo(
        form,
        "price",
        "Precio promocional (S/)",
        "number",
        item ? (item.priceCents / 100).toFixed(2) : "",
        { required: true, min: "0", step: "0.01" },
      );
      crearCampo(
        form,
        "pricingUnit",
        "Unidad de precio",
        "select",
        obtenerValorDelRecurso("pricingUnit", "PERSON"),
        { choices: opcionesConEtiqueta(["PERSON", "COUPLE", "PACKAGE"]) },
      );
      crearCampo(
        form,
        "peopleCount",
        "Número de personas",
        "number",
        obtenerValorDelRecurso("peopleCount", 1),
        { required: true, min: "1", step: "1" },
      );
      // ==========================================
      // Adaptar la fecha al campo en hora de Lima
      // ==========================================
      const formatearFechaDeLima = (date) =>
        date
          ? new Date(new Date(date).getTime() - 5 * 3600000)
              .toISOString()
              .slice(0, 16)
          : "";
      crearCampo(
        form,
        "startsAt",
        "Inicio (hora de Lima)",
        "datetime-local",
        formatearFechaDeLima(obtenerValorDelRecurso("startsAt")),
        { required: true },
      );
      crearCampo(
        form,
        "endsAt",
        "Fin (hora de Lima)",
        "datetime-local",
        formatearFechaDeLima(obtenerValorDelRecurso("endsAt")),
        { required: true },
      );
      crearCasillas(
        form,
        "day",
        "Días válidos",
        days.map((day, i) => [String(i + 1), day]),
        obtenerValorDelRecurso("validDays", [1, 2, 3, 4, 5, 6, 7]).map(String),
      );
      crearCampoDeTexto(
        "validTimeRanges",
        "Horario promocional (vacío: todo el día)",
        obtenerValorDelRecurso("validTimeRanges", [])
          .map((p) => p.opens + "-" + p.closes + (p.closesNextDay ? "+1" : ""))
          .join(","),
      );
      form.append(
        crearElemento(
          "p",
          "muted",
          "Formato de horario: 13:00-16:30,20:00-23:00. Para madrugada: 20:00-02:00+1.",
        ),
      );
      form.append(
        crearElemento(
          "p",
          "muted",
          "Platos incluidos: indica cantidad, o deja vacío si no se incluye.",
        ),
      );
      (resources["menu-items"] || [])
        .filter((m) => m.status === "ACTIVE")
        .forEach((m) =>
          crearCampo(
            form,
            "qty_" + m._id,
            m.name,
            "number",
            item?.items.find((i) => i.menuItemId === m._id)?.quantity || "",
            { min: "1", max: "100", step: "1" },
          ),
        );
      build = (v, data) => ({
        title: v.title,
        description: v.description || null,
        terms: v.terms || null,
        photoId: v.photoId || null,
        branchIds: data.getAll("branch"),
        priceCents: Math.round(Number(v.price) * 100),
        pricingUnit: v.pricingUnit,
        peopleCount: Number(v.peopleCount),
        startsAt: new Date(v.startsAt + ":00-05:00").toISOString(),
        endsAt: new Date(v.endsAt + ":00-05:00").toISOString(),
        validDays: data.getAll("day").map(Number),
        validTimeRanges: v.validTimeRanges.trim()
          ? v.validTimeRanges.split(",").map((text) => {
              const match = text
                .trim()
                .match(/^(\d{2}:\d{2})-(\d{2}:\d{2})(\+1)?$/);
              if (!match)
                throw new Error("Revisa el formato del horario promocional.");
              return {
                opens: match[1],
                closes: match[2],
                closesNextDay: Boolean(match[3]),
              };
            })
          : [],
        items: (resources["menu-items"] || [])
          .filter((m) => v["qty_" + m._id])
          .map((m) => ({
            menuItemId: m._id,
            quantity: Number(v["qty_" + m._id]),
          })),
      });
    }
    const statuses =
      type === "branches" || type === "menu-items"
        ? ["ACTIVE", "INACTIVE", "ARCHIVED"]
        : ["DRAFT", "PUBLISHED", "ARCHIVED"];
    crearCampo(
      form,
      "status",
      "Estado",
      "select",
      obtenerValorDelRecurso("status", statuses[0]),
      {
        choices: opcionesConEtiqueta(statuses),
      },
    );
    const save = crearElemento("button", "button", "Guardar");
    save.type = "submit";
    const status = crearElemento("p", "auth-feedback");
    status.setAttribute("role", "status");
    form.append(save, status);
    // Solo se envían campos editables. El propietario y el restaurante los valida la API.
    const target =
      type === "restaurants"
        ? "/admin/restaurants" + (item ? "/" + item._id : "")
        : rutaAdministrativa(type) + (item ? "/" + item._id : "");
    // ==========================================
    // Validar y guardar el recurso del restaurante
    // ==========================================
    const guardarRecursoAdministrado = async (event) => {
      event.preventDefault();
      save.disabled = true;
      try {
        const data = new FormData(form);
        const v = Object.fromEntries(data);
        const body = { ...build(v, data), status: v.status };
        const result = await MesaAPI.request(target, {
          method: item ? "PATCH" : "POST",
          authenticated: true,
          body,
        });
        if (type === "restaurants") selected = result.data;
        if (form.isConnected) seleccionar("#modal").close();
        await cargarRestaurantesAdministrados();
      } catch (error) {
        const details = error.details
          ?.filter((d) => d?.field)
          .map((d) => d.field + ": " + d.message)
          .join(". ");
        mostrarMensaje(
          status,
          error.message + (details ? " " + details : ""),
          true,
        );
      } finally {
        save.disabled = false;
      }
    };

    form.addEventListener("submit", guardarRecursoAdministrado);
  }
  // ==========================================
  // Validar la cuenta e iniciar la administración
  // ==========================================
  async function iniciarAdministracion() {
    const user = await MesaAuth.ready;
    if (!user) {
      root.replaceChildren(
        crearElemento("p", "", "Inicia sesión con tu cuenta administradora."),
        crearBoton("Iniciar sesión", () => MesaAuth.open("login")),
      );
      return;
    }
    if (user.role !== "RESTAURANT_ADMIN")
      return mostrarEstado(
        root,
        "Esta sección está disponible para administradores de restaurantes.",
      );
    await cargarRestaurantesAdministrados();
  }
  window.addEventListener("mesa:session", () => {
    if (!MesaAPI.session) {
      operation += 1;
      mostrarEstado(root, "Sesión cerrada.");
    } else if (MesaAPI.session.user.role === "RESTAURANT_ADMIN")
      cargarRestaurantesAdministrados();
  });
  iniciarAdministracion();
})();
