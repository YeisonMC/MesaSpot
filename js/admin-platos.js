// ==========================================
// Carta del restaurante y edición de precios por local
// ==========================================
(() => {
  "use strict";
  const U = MesaAdminUI;

  // ==========================================
  // Mostrar platos con filtros, sugerencias y paginación
  // ==========================================
  function mostrar(contenedor, contexto) {
    let pagina = 1,
      categoria = "",
      operacion = 0,
      demora;
    contenedor.replaceChildren(
      U.cabecera("Platos", "Administra tu carta y los precios de cada local.", [
        U.boton("Agregar plato", () => editar(contenedor, contexto), "plus"),
        U.enlacePublico(contexto),
      ]),
    );
    const filtros = U.crearElemento("div", "owner-filters");
    const busqueda = U.campo(filtros, "filter-q", "Buscar plato", "", {
      tipo: "search",
      maxLength: 150,
    });
    busqueda.placeholder = "Buscar por nombre…";
    const local = U.campo(filtros, "filter-local", "Local", "", {
      opciones: [
        ["", "Todos los locales"],
        ...contexto.locales.map((local) => [local._id, local.name]),
      ],
    });
    const estado = U.campo(filtros, "filter-status", "Estado", "ACTIVE", {
      opciones: [
        ["", "Todos los estados"],
        ...["ACTIVE", "INACTIVE", "ARCHIVED"].map((codigo) => [
          codigo,
          U.traducir(codigo),
        ]),
      ],
    });
    const disponibilidad = U.campo(
      filtros,
      "filter-available",
      "Disponibilidad",
      "",
      {
        opciones: [
          ["", "Todas"],
          ["true", "Disponibles"],
          ["false", "No disponibles"],
        ],
      },
    );
    const categorias = U.crearElemento("div", "owner-tabs");
    categorias.setAttribute("aria-label", "Categorías de platos");
    for (const [codigo, titulo] of [
      ["", "Todos"],
      ...contexto.metadata.menuCategories.map((codigo) => [
        codigo,
        U.traducir(codigo),
      ]),
    ]) {
      const control = U.boton(
        titulo,
        () => {
          categoria = codigo;
          pagina = 1;
          categorias
            .querySelectorAll("button")
            .forEach((boton) =>
              boton.setAttribute("aria-pressed", String(boton === control)),
            );
          cargarPlatos();
        },
        null,
        "owner-tab",
      );
      control.setAttribute("aria-pressed", String(!codigo));
      categorias.append(control);
    }
    const resultados = U.crearElemento("div");
    contenedor.append(filtros, categorias, resultados);
    busqueda.addEventListener("input", () => {
      clearTimeout(demora);
      demora = setTimeout(() => {
        pagina = 1;
        cargarPlatos();
      }, 300);
    });
    [local, estado, disponibilidad].forEach((entrada) =>
      entrada.addEventListener("change", () => {
        pagina = 1;
        cargarPlatos();
      }),
    );

    // ==========================================
    // Obtener la página de platos que coincide con los filtros
    // ==========================================
    async function cargarPlatos() {
      const actual = ++operacion;
      resultados.setAttribute("aria-busy", "true");
      try {
        const respuesta = await contexto.peticion(
          "/menu-items" +
            MesaAPI.query({
              page: pagina,
              limit: 8,
              q: busqueda.value.trim(),
              category: categoria,
              branchId: local.value,
              status: estado.value,
              available: disponibilidad.value,
            }),
        );
        if (actual !== operacion || !contexto.vigente()) return;
        resultados.replaceChildren();
        const sugeridos = respuesta.data.filter(
          (plato) => plato.recommendation?.featured,
        );
        const regulares = respuesta.data.filter(
          (plato) => !plato.recommendation?.featured,
        );
        for (const [titulo, platos, clase] of [
          ["Sugeridos por la casa", sugeridos, "featured"],
          [sugeridos.length ? "Nuestra carta" : "", regulares, ""],
        ]) {
          if (!platos.length) continue;
          if (titulo)
            resultados.append(
              U.crearElemento("h2", "owner-section-title", titulo),
            );
          const lista = U.crearElemento("div", "owner-dish-grid " + clase);
          platos.forEach((plato) =>
            lista.append(
              crearPlato(plato, contexto, local.value, () =>
                editar(contenedor, contexto, plato),
              ),
            ),
          );
          resultados.append(lista);
        }
        if (!respuesta.data.length)
          U.mensaje(
            resultados,
            "No encontramos platos",
            "Prueba otros filtros o agrega el primer plato de tu carta.",
          );
        U.paginar(resultados, respuesta.meta, (elegida) => {
          pagina = elegida;
          cargarPlatos();
        });
        U.animar(resultados);
      } catch (error) {
        if (
          !contexto.vigente() ||
          actual !== operacion ||
          error.name === "AbortError"
        )
          return;
        U.mensaje(
          resultados,
          "No pudimos cargar la carta",
          error.message,
          U.boton("Volver a intentar", cargarPlatos, "rotate-cw"),
        );
      } finally {
        if (actual === operacion) resultados.removeAttribute("aria-busy");
      }
    }

    cargarPlatos();
  }

  // ==========================================
  // Construir una tarjeta de plato sin perder sus ofertas por local
  // ==========================================
  function crearPlato(plato, contexto, localId, abrirEditor) {
    const tarjeta = U.crearElemento("article", "owner-dish");
    const foto = contexto.fotos.find((foto) => foto._id === plato.photoId);
    tarjeta.append(U.crearImagen(foto?.url, foto?.altText || plato.name));
    const contenido = U.crearElemento("div", "owner-dish-description");
    const ofertas = plato.branchOffers.filter(
      (oferta) => !localId || oferta.branchId === localId,
    );
    const disponible =
      plato.status === "ACTIVE" && ofertas.some((oferta) => oferta.available);
    const etiqueta = U.crearElemento(
      "span",
      "owner-badge " + (disponible ? "positive" : "neutral"),
      disponible
        ? "Disponible"
        : plato.status === "ACTIVE"
          ? "No disponible"
          : U.traducir(plato.status),
    );
    if (plato.recommendation?.featured) {
      const sugerencia = U.crearElemento(
        "span",
        "owner-tag",
        U.traducir(plato.recommendation.label || "FEATURED"),
      );
      sugerencia.prepend(MesaIcons.icon("chef-hat"));
      contenido.append(sugerencia);
    }
    contenido.append(
      U.crearElemento("h3", "", plato.name),
      U.crearElemento(
        "p",
        "owner-muted owner-clamp",
        plato.description || "Sin descripción",
      ),
      etiqueta,
    );
    const precios = ofertas.map((oferta) => oferta.priceCents);
    const minimo = precios.length ? Math.min(...precios) : null;
    const maximo = precios.length ? Math.max(...precios) : null;
    contenido.append(
      U.crearElemento(
        "strong",
        "owner-price",
        minimo === null
          ? "Sin precio"
          : (minimo !== maximo ? "Desde " : "") + U.dinero(minimo),
      ),
    );
    const pie = U.crearElemento("div", "owner-dish-footer");
    const sedes = U.crearElemento(
      "span",
      "owner-tag",
      localId
        ? contexto.locales.find((local) => local._id === localId)?.name
        : plato.branchOffers.length +
            (plato.branchOffers.length === 1 ? " local" : " locales"),
    );
    sedes.prepend(MesaIcons.icon("map-pin"));
    const acciones = U.crearElemento("div", "owner-actions");
    const editar = U.boton("", abrirEditor, "pencil", "owner-icon");
    editar.setAttribute("aria-label", "Editar plato: " + plato.name);
    acciones.append(editar);
    if (plato.status !== "ARCHIVED") {
      const archivar = U.boton(
        "",
        () => contexto.archivar("/menu-items", plato),
        "archive",
        "owner-icon",
      );
      archivar.setAttribute("aria-label", "Archivar plato: " + plato.name);
      acciones.append(archivar);
    }
    pie.append(sedes, acciones);
    contenido.append(pie);
    tarjeta.append(contenido);
    return tarjeta;
  }

  // ==========================================
  // Convertir etiquetas separadas por comas en una lista válida
  // ==========================================
  function leerEtiquetas(entrada, maximo, longitud) {
    const valores = [
      ...new Set(
        entrada.value
          .split(",")
          .map((valor) => valor.trim())
          .filter(Boolean),
      ),
    ];
    if (
      valores.length > maximo ||
      valores.some((valor) => valor.length > longitud)
    )
      throw new Error(
        "Revisa " +
          entrada.labels[0].textContent.toLowerCase() +
          ": hasta " +
          maximo +
          " etiquetas de " +
          longitud +
          " caracteres.",
      );
    return valores;
  }

  // ==========================================
  // Editar información, alérgenos y ofertas completas del plato
  // ==========================================
  function editar(contenedor, contexto, plato = {}) {
    contenedor.replaceChildren(
      U.cabecera(
        plato._id ? "Editar plato" : "Agregar plato",
        contexto.restaurante.name +
          " · Información y disponibilidad por local.",
        [
          U.boton(
            "Volver a platos",
            () => {
              if (U.permitirSalida()) mostrar(contenedor, contexto);
            },
            "arrow-left",
            "owner-button secondary",
          ),
          U.enlacePublico(contexto),
        ],
      ),
    );
    const formulario = U.formulario("owner-columns");
    const principal = U.crearElemento("div", "owner-stack");
    const lateral = U.crearElemento("div", "owner-stack");
    const informacion = U.tarjeta("Información del plato");
    const grupo = U.crearElemento("div", "owner-form-grid");
    const nombre = U.campo(grupo, "name", "Nombre", plato.name, {
      required: true,
      maxLength: 150,
    });
    const categoria = U.campo(
      grupo,
      "category",
      "Categoría",
      plato.category || "MAIN",
      {
        required: true,
        opciones: contexto.metadata.menuCategories.map((codigo) => [
          codigo,
          U.traducir(codigo),
        ]),
      },
    );
    informacion.append(grupo);
    const descripcion = U.campo(
      informacion,
      "description",
      "Descripción",
      plato.description,
      { tipo: "textarea", rows: 4, maxLength: 1500 },
    );
    const etiquetas = U.campo(
      informacion,
      "dietaryTags",
      "Etiquetas alimentarias",
      plato.dietaryTags?.join(", "),
      { ayuda: "Separa con comas. Ejemplo: Vegetariano, Sin picante." },
    );
    const precios = U.tarjeta("Precio y disponibilidad por local");
    precios.append(
      U.crearElemento(
        "p",
        "owner-muted",
        "Selecciona los locales donde se ofrece el plato e indica su precio en soles.",
      ),
    );
    const tabla = U.crearElemento("div", "owner-offers");
    const ofertas = [];
    for (const local of contexto.locales.filter(
      (local) =>
        local.status === "ACTIVE" ||
        plato.branchOffers?.some((oferta) => oferta.branchId === local._id),
    )) {
      const oferta = plato.branchOffers?.find(
        (oferta) => oferta.branchId === local._id,
      );
      const fila = U.crearElemento("div", "owner-offer-row");
      const incluido = U.casilla(
        fila,
        "offer." + local._id,
        local.name + (local.status !== "ACTIVE" ? " (local inactivo)" : ""),
        Boolean(oferta),
      );
      const indice = ofertas.length;
      const precio = U.campo(
        fila,
        "branchOffers." + indice + ".priceCents",
        "Precio (S/)",
        oferta ? (oferta.priceCents / 100).toFixed(2) : "",
        { tipo: "number", min: 0, max: 1000000, step: "0.01" },
      );
      const disponible = U.casilla(
        fila,
        "available." + local._id,
        "Disponible",
        oferta?.available ?? true,
      );
      // Los locales no seleccionados no exigen precio ni envían una oferta vacía.
      precio.disabled = disponible.disabled = !incluido.checked;
      precio.required = incluido.checked;
      incluido.addEventListener("change", () => {
        precio.disabled = disponible.disabled = !incluido.checked;
        precio.required = incluido.checked;
      });
      ofertas.push({ local, incluido, precio, disponible });
      tabla.append(fila);
    }
    if (!ofertas.length)
      precios.append(
        U.crearElemento(
          "p",
          "owner-muted",
          "Crea un local activo desde Locales antes de guardar tu primer plato.",
        ),
      );
    precios.append(tabla);
    const alergenos = U.tarjeta("Información de alérgenos");
    const confirmado = U.casilla(
      alergenos,
      "allergenInformationConfirmed",
      "Información confirmada",
      plato.allergenInformationConfirmed,
    );
    alergenos.append(
      U.crearElemento(
        "p",
        "owner-help",
        "Confirma la información con tu equipo antes de marcarla.",
      ),
    );
    const ingredientes = U.campo(
      alergenos,
      "allergens",
      "Alérgenos",
      plato.allergens?.join(", "),
      { ayuda: "Separa con comas. Ejemplo: Leche, Gluten, Soya." },
    );
    principal.append(informacion, precios, alergenos);
    const fotografia = U.tarjeta("Fotografía");
    const foto = MesaAdminRestaurante.selectorImagen(
      fotografia,
      contexto,
      "photoId",
      "Imagen del plato",
      plato.photoId,
    );
    const recomendacion = U.tarjeta("Recomendación");
    const destacar = U.casilla(
      recomendacion,
      "recommendation.featured",
      "Mostrar en sugerencias",
      plato.recommendation?.featured,
      "owner-switch",
    );
    const etiqueta = U.campo(
      recomendacion,
      "recommendation.label",
      "Etiqueta",
      plato.recommendation?.label || "RECOMMENDED",
      {
        opciones: contexto.metadata.recommendations.map((codigo) => [
          codigo,
          U.traducir(codigo),
        ]),
      },
    );
    const orden = U.campo(
      recomendacion,
      "recommendation.sortOrder",
      "Orden",
      plato.recommendation?.sortOrder || 0,
      { tipo: "number", min: 0, step: 1, required: true },
    );
    const publicacion = U.tarjeta("Estado");
    const estado = U.campo(
      publicacion,
      "status",
      "Estado del plato",
      plato.status || "ACTIVE",
      {
        opciones: ["ACTIVE", "INACTIVE", "ARCHIVED"].map((codigo) => [
          codigo,
          U.traducir(codigo),
        ]),
      },
    );
    if (plato._id && plato.status !== "ARCHIVED")
      publicacion.append(
        U.boton(
          "Archivar plato",
          () => contexto.archivar("/menu-items", plato),
          "archive",
          "owner-button danger",
        ),
      );
    lateral.append(fotografia, recomendacion, publicacion);
    formulario.append(principal, lateral);
    U.accionesFormulario(formulario, () => {
      if (U.permitirSalida()) mostrar(contenedor, contexto);
    });
    formulario.addEventListener("submit", (evento) => {
      evento.preventDefault();
      U.guardar(
        formulario,
        () => {
          const elegidas = ofertas.filter((oferta) => oferta.incluido.checked);
          if (!elegidas.length)
            throw new Error(
              "Selecciona al menos un local y su precio para guardar el plato.",
            );
          if (elegidas.some((oferta) => oferta.local.status !== "ACTIVE"))
            throw new Error(
              "Retira la oferta del local inactivo o reactiva ese local antes de guardar.",
            );
          return {
            name: nombre.value.trim(),
            category: categoria.value,
            description: descripcion.value.trim() || null,
            dietaryTags: leerEtiquetas(etiquetas, 20, 50),
            allergens: leerEtiquetas(ingredientes, 30, 80),
            allergenInformationConfirmed: confirmado.checked,
            photoId: foto.value || null,
            branchOffers: elegidas.map((oferta) => ({
              branchId: oferta.local._id,
              priceCents: Math.round(Number(oferta.precio.value) * 100),
              currency: "PEN",
              available: oferta.disponible.checked,
            })),
            recommendation: {
              featured: destacar.checked,
              label: etiqueta.value,
              sortOrder: Number(orden.value),
            },
            status: estado.value,
          };
        },
        (cuerpo) =>
          contexto.peticion(
            "/menu-items" + (plato._id ? "/" + plato._id : ""),
            { method: plato._id ? "PATCH" : "POST", body: cuerpo },
          ),
        async () => {
          await contexto.actualizar();
          U.confirmarExito(
            "El plato y sus precios por local se guardaron correctamente.",
          );
        },
      );
    });
    contenedor.append(formulario);
    U.animar(contenedor);
    nombre.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  window.MesaAdminPlatos = { mostrar, editar };
})();
