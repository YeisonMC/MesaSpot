(() => {
  "use strict";
  const { $, element, button, field, label, state, feedback, modal } = MesaUI;
  const root = $("#admin-workspace");
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
  const path = (type) =>
    "/admin/restaurants" +
    (selected ? "/" + selected._id : "") +
    (type === "restaurants" ? "" : "/" + type);
  const choices = (values) => values.map((code) => [code, label(code)]);
  const days = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];
  function checkboxes(form, name, title, records, values = []) {
    const group = element("fieldset", "check-fields");
    group.append(element("legend", "", title));
    records.forEach(([value, text]) => {
      const wrap = element("label");
      const input = element("input");
      input.type = "checkbox";
      input.name = name;
      input.value = value;
      input.checked = values.includes(value);
      wrap.append(input, element("span", "", text));
      group.append(wrap);
    });
    form.append(group);
  }
  async function loadRestaurants() {
    const token = ++operation;
    state(root, "Cargando administración…");
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
      await loadWorkspace();
    } catch (error) {
      state(root, error.message, loadRestaurants);
    }
  }
  async function loadWorkspace() {
    if (!selected) return render();
    state(root, "Cargando contenido de " + selected.name + "…");
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
      render();
    } catch (error) {
      state(root, error.message, loadWorkspace);
    }
  }
  function render() {
    root.replaceChildren();
    const toolbar = element("div", "admin-toolbar");
    const select = field(
      toolbar,
      "restaurant",
      "Tu restaurante",
      "select",
      selected?._id || "",
      {
        choices: restaurants.map((r) => [
          r._id,
          r.name + " · " + label(r.status),
        ]),
      },
    );
    select.addEventListener("change", () => {
      selected = restaurants.find((r) => r._id === select.value);
      loadWorkspace();
    });
    toolbar.append(button("Crear restaurante", () => edit("restaurants")));
    root.append(toolbar);
    if (!selected) {
      const empty = element("div");
      root.append(empty);
      return state(
        empty,
        "Todavía no administras restaurantes. Crea el primero para comenzar.",
      );
    }
    const nav = element("div", "categories");
    Object.entries(names).forEach(([type, title]) => {
      const b = button(
        title,
        () => {
          activeType = type;
          render();
        },
        "category",
      );
      b.setAttribute("aria-pressed", String(type === activeType));
      nav.append(b);
    });
    root.append(nav);
    const area = element("section", "detail-panel");
    area.append(element("h2", "", names[activeType]));
    root.append(area);
    if (activeType === "restaurants") {
      area.append(
        element("p", "", selected.shortDescription),
        element("p", "muted", "Estado: " + label(selected.status)),
        button("Editar restaurante", () => edit("restaurants", selected)),
      );
      if (selected.status !== "ARCHIVED")
        area.append(
          button(
            "Archivar restaurante",
            () => archive("restaurants", selected),
            "text-link danger",
          ),
        );
      return;
    }
    if (activeType === "reviews") return void renderReviews(area);
    area.append(
      button(
        "Agregar " +
          {
            branches: "local",
            photos: "foto",
            "menu-items": "plato",
            promotions: "promoción",
          }[activeType],
        () => edit(activeType),
      ),
    );
    const list = element("div", "admin-resource-list");
    area.append(list);
    const items = resources[activeType] || [];
    if (!items.length) state(list, "No hay registros todavía.");
    items.forEach((item) => {
      const row = element("article", "admin-resource");
      row.append(
        element("strong", "", item.name || item.title),
        element("span", "tag", label(item.status)),
        button("Editar", () => edit(activeType, item), "text-link"),
      );
      if (item.status !== "ARCHIVED")
        row.append(
          button(
            "Archivar",
            () => archive(activeType, item),
            "text-link danger",
          ),
        );
      list.append(row);
    });
  }
  async function archive(type, item) {
    if (!confirm("¿Archivar " + (item.name || item.title) + "?")) return;
    try {
      await MesaAPI.request(
        type === "restaurants"
          ? "/admin/restaurants/" + item._id
          : path(type) + "/" + item._id,
        { method: "DELETE", authenticated: true },
      );
      await loadRestaurants();
    } catch (error) {
      modal("No se pudo archivar").append(
        element("p", "is-error", error.message),
      );
    }
  }
  async function renderReviews(area) {
    const rid = selected._id;
    state(area, "Cargando reseñas…");
    try {
      const reviews = await MesaAPI.all("/restaurants/" + rid + "/reviews");
      if (!area.isConnected) return;
      area.replaceChildren(element("h2", "", "Reseñas de clientes"));
      if (!reviews.length)
        area.append(element("p", "", "No hay reseñas publicadas."));
      reviews.forEach((review) => {
        const article = element("article", "review-card");
        article.append(
          element("h3", "", review.title),
          element("p", "", review.comment),
          element(
            "p",
            "muted",
            "Calificación: " + review.ratings.overall + "/5",
          ),
        );
        const form = element("form", "modal-form");
        const reply = field(
          form,
          "comment",
          "Respuesta del restaurante",
          "textarea",
          review.adminReply?.comment || "",
          { required: true, minlength: "3", maxlength: "2000" },
        );
        const submit = element("button", "button", "Guardar respuesta");
        submit.type = "submit";
        const status = element("p", "auth-feedback");
        status.setAttribute("role", "status");
        form.append(submit, status);
        form.addEventListener("submit", async (event) => {
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
            feedback(status, "Respuesta guardada.");
          } catch (error) {
            feedback(status, error.message, true);
          } finally {
            submit.disabled = false;
          }
        });
        article.append(form);
        if (review.adminReply)
          article.append(
            button(
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
                  renderReviews(area);
                } catch (error) {
                  feedback(status, error.message, true);
                  event.currentTarget.disabled = false;
                }
              },
              "text-link danger",
            ),
          );
        area.append(article);
      });
    } catch (error) {
      state(area, error.message, () => renderReviews(area));
    }
  }
  function edit(type, item) {
    const content = modal(
      (item ? "Editar " : "Agregar ") + names[type].toLowerCase(),
      "wide-modal",
    );
    const form = element("form", "modal-form admin-form");
    content.append(form);
    const value = (key, fallback = "") => item?.[key] ?? fallback;
    const text = (name, title, val, options = {}) =>
      field(form, name, title, "text", val, options);
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
      text("name", "Nombre", value("name"), {
        required: true,
        maxlength: "120",
      });
      text(
        "slug",
        "Identificador para el enlace (ejemplo: mi-restaurante)",
        value("slug"),
        { required: true, pattern: "[a-z0-9]+(-[a-z0-9]+)*" },
      );
      text("shortDescription", "Descripción breve", value("shortDescription"), {
        required: true,
        maxlength: "300",
      });
      field(
        form,
        "description",
        "Sobre el restaurante (un párrafo por línea)",
        "textarea",
        value("description", []).join("\n"),
      );
      field(
        form,
        "foundedYear",
        "Año de fundación",
        "number",
        value("foundedYear"),
        { min: "1500", max: String(new Date().getFullYear()) },
      );
      field(
        form,
        "email",
        "Correo de contacto",
        "email",
        item?.contact?.email || "",
      );
      field(form, "website", "Página web", "url", item?.contact?.website || "");
      checkboxes(
        form,
        "cuisine",
        "Tipos de cocina",
        choices(metadata.cuisines),
        value("cuisineTypes", []),
      );
      field(
        form,
        "featured",
        "Mostrar como destacado",
        "select",
        String(value("featured", false)),
        {
          choices: [
            ["false", "No"],
            ["true", "Sí"],
          ],
        },
      );
      if (item) {
        field(
          form,
          "mainBranchId",
          "Local principal",
          "select",
          value("mainBranchId"),
          {
            choices: [
              ["", "Sin local principal"],
              ...activeBranches.map((b) => [b._id, b.name]),
            ],
          },
        );
        field(
          form,
          "coverPhotoId",
          "Foto de portada",
          "select",
          value("coverPhotoId"),
          { choices: photoOptions },
        );
        field(
          form,
          "thumbnailPhotoId",
          "Foto de tarjeta",
          "select",
          value("thumbnailPhotoId"),
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
      text("name", "Nombre del local", value("name"), { required: true });
      text("street", "Dirección", item?.address?.street || "", {
        required: true,
      });
      text(
        "district",
        "Distrito de Lima Metropolitana",
        item?.address?.district || "",
        { required: true },
      );
      text("reference", "Referencia", item?.address?.reference || "");
      field(
        form,
        "phone",
        "Teléfono (+51…)",
        "tel",
        item?.contact?.phone || "",
      );
      field(
        form,
        "whatsapp",
        "WhatsApp (+51…)",
        "tel",
        item?.contact?.whatsapp || "",
      );
      field(
        form,
        "email",
        "Correo del local",
        "email",
        item?.contact?.email || "",
      );
      field(
        form,
        "averagePrice",
        "Precio aproximado por persona (S/)",
        "number",
        item ? (item.averagePricePerPersonCents / 100).toFixed(2) : "",
        { required: true, min: "0", step: "0.01" },
      );
      field(form, "capacity", "Capacidad", "number", value("capacity"), {
        min: "1",
        step: "1",
      });
      field(
        form,
        "latitude",
        "Latitud verificada (opcional)",
        "number",
        item?.location?.coordinates?.[1] ?? "",
        { min: "-90", max: "90", step: "any" },
      );
      field(
        form,
        "longitude",
        "Longitud verificada (opcional)",
        "number",
        item?.location?.coordinates?.[0] ?? "",
        { min: "-180", max: "180", step: "any" },
      );
      field(
        form,
        "mapsUrl",
        "Enlace de Google Maps",
        "url",
        item?.googleMaps?.mapsUrl || "",
      );
      checkboxes(
        form,
        "service",
        "Servicios",
        choices(metadata.services),
        value("services", []),
      );
      form.append(
        element(
          "p",
          "muted",
          "Horarios: escribe 13:00-16:30,20:00-23:00. Deja vacío para cerrado. Para un cierre de madrugada añade +1, por ejemplo 20:00-02:00+1.",
        ),
      );
      days.forEach((day, index) => {
        const existing = item?.openingHours?.find(
          (d) => d.dayOfWeek === index + 1,
        );
        text(
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
      text("title", "Título", value("title"), { required: true });
      field(form, "url", "Enlace público de la imagen", "url", value("url"), {
        required: true,
      });
      text("altText", "Descripción de la imagen", value("altText"));
      field(form, "type", "Tipo", "select", value("type", "AMBIENCE"), {
        choices: choices(metadata.photoTypes),
      });
      field(form, "branchId", "Local", "select", value("branchId"), {
        choices: [
          ["", "Toda la marca"],
          ...activeBranches.map((b) => [b._id, b.name]),
        ],
      });
      field(
        form,
        "menuItemId",
        "Plato relacionado",
        "select",
        value("menuItemId"),
        {
          choices: [
            ["", "Ninguno"],
            ...(resources["menu-items"] || [])
              .filter((m) => m.status === "ACTIVE")
              .map((m) => [m._id, m.name]),
          ],
        },
      );
      field(form, "sortOrder", "Orden", "number", value("sortOrder", 0), {
        min: "0",
        step: "1",
      });
      form.append(
        element(
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
      text("name", "Nombre del plato", value("name"), { required: true });
      field(
        form,
        "description",
        "Descripción",
        "textarea",
        value("description"),
      );
      field(
        form,
        "category",
        "Categoría",
        "select",
        value("category", "MAIN"),
        { choices: choices(metadata.menuCategories) },
      );
      field(form, "photoId", "Foto", "select", value("photoId"), {
        choices: photoOptions,
      });
      form.append(
        element(
          "p",
          "muted",
          "Completa el precio de los locales donde se ofrece. Un precio vacío retira la oferta de ese local.",
        ),
      );
      activeBranches.forEach((b) => {
        const offer = item?.branchOffers.find((o) => o.branchId === b._id);
        field(
          form,
          "price_" + b._id,
          b.name + " · precio (S/)",
          "number",
          offer ? (offer.priceCents / 100).toFixed(2) : "",
          { min: "0", step: "0.01" },
        );
        field(
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
      field(
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
      field(
        form,
        "recommendation",
        "Etiqueta de sugerencia",
        "select",
        item?.recommendation?.label || "RECOMMENDED",
        { choices: choices(metadata.recommendations) },
      );
      text(
        "allergens",
        "Alérgenos (separados por comas)",
        value("allergens", []).join(", "),
      );
      text(
        "dietaryTags",
        "Características alimentarias (separadas por comas)",
        value("dietaryTags", []).join(", "),
      );
      field(
        form,
        "allergenInformationConfirmed",
        "Información de alérgenos confirmada",
        "select",
        String(value("allergenInformationConfirmed", false)),
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
      text("title", "Título", value("title"), { required: true });
      field(
        form,
        "description",
        "Descripción",
        "textarea",
        value("description"),
      );
      field(form, "terms", "Condiciones", "textarea", value("terms"));
      field(form, "photoId", "Foto", "select", value("photoId"), {
        choices: photoOptions,
      });
      checkboxes(
        form,
        "branch",
        "Locales donde aplica",
        activeBranches.map((b) => [b._id, b.name]),
        value("branchIds", []),
      );
      field(
        form,
        "price",
        "Precio promocional (S/)",
        "number",
        item ? (item.priceCents / 100).toFixed(2) : "",
        { required: true, min: "0", step: "0.01" },
      );
      field(
        form,
        "pricingUnit",
        "Unidad de precio",
        "select",
        value("pricingUnit", "PERSON"),
        { choices: choices(["PERSON", "COUPLE", "PACKAGE"]) },
      );
      field(
        form,
        "peopleCount",
        "Número de personas",
        "number",
        value("peopleCount", 1),
        { required: true, min: "1", step: "1" },
      );
      const lima = (date) =>
        date
          ? new Date(new Date(date).getTime() - 5 * 3600000)
              .toISOString()
              .slice(0, 16)
          : "";
      field(
        form,
        "startsAt",
        "Inicio (hora de Lima)",
        "datetime-local",
        lima(value("startsAt")),
        { required: true },
      );
      field(
        form,
        "endsAt",
        "Fin (hora de Lima)",
        "datetime-local",
        lima(value("endsAt")),
        { required: true },
      );
      checkboxes(
        form,
        "day",
        "Días válidos",
        days.map((day, i) => [String(i + 1), day]),
        value("validDays", [1, 2, 3, 4, 5, 6, 7]).map(String),
      );
      text(
        "validTimeRanges",
        "Horario promocional (vacío: todo el día)",
        value("validTimeRanges", [])
          .map((p) => p.opens + "-" + p.closes + (p.closesNextDay ? "+1" : ""))
          .join(","),
      );
      form.append(
        element(
          "p",
          "muted",
          "Formato de horario: 13:00-16:30,20:00-23:00. Para madrugada: 20:00-02:00+1.",
        ),
      );
      form.append(
        element(
          "p",
          "muted",
          "Platos incluidos: indica cantidad, o deja vacío si no se incluye.",
        ),
      );
      (resources["menu-items"] || [])
        .filter((m) => m.status === "ACTIVE")
        .forEach((m) =>
          field(
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
    field(form, "status", "Estado", "select", value("status", statuses[0]), {
      choices: choices(statuses),
    });
    const save = element("button", "button", "Guardar");
    save.type = "submit";
    const status = element("p", "auth-feedback");
    status.setAttribute("role", "status");
    form.append(save, status);
    // Solo se envían campos editables. El propietario y el restaurante los valida la API.
    const target =
      type === "restaurants"
        ? "/admin/restaurants" + (item ? "/" + item._id : "")
        : path(type) + (item ? "/" + item._id : "");
    form.addEventListener("submit", async (event) => {
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
        if (form.isConnected) $("#modal").close();
        await loadRestaurants();
      } catch (error) {
        const details = error.details
          ?.filter((d) => d?.field)
          .map((d) => d.field + ": " + d.message)
          .join(". ");
        feedback(status, error.message + (details ? " " + details : ""), true);
      } finally {
        save.disabled = false;
      }
    });
  }
  async function init() {
    const user = await MesaAuth.ready;
    if (!user) {
      root.replaceChildren(
        element("p", "", "Inicia sesión con tu cuenta administradora."),
        button("Iniciar sesión", () => MesaAuth.open("login")),
      );
      return;
    }
    if (user.role !== "RESTAURANT_ADMIN")
      return state(
        root,
        "Esta sección está disponible para administradores de restaurantes.",
      );
    await loadRestaurants();
  }
  window.addEventListener("mesa:session", () => {
    if (!MesaAPI.session) {
      operation += 1;
      state(root, "Sesión cerrada.");
    } else if (MesaAPI.session.user.role === "RESTAURANT_ADMIN")
      loadRestaurants();
  });
  init();
})();
