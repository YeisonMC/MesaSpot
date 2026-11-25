// ==========================================
// Promociones públicas conectadas a la API
// ==========================================

(() => {
  "use strict";
  // Promociones: consulta el catálogo publicado, resuelve restaurantes, locales y fotos,
  // y aplica búsqueda, filtros, orden y paginación en el navegador sobre el catálogo completo.
  const formulario = document.querySelector("#promo-filters");
  const lista = document.querySelector("#promo-cards");
  if (!formulario || !lista) return;
  const vacio = document.querySelector("#promo-empty");
  const contador = document.querySelector("#promo-count");
  const paginacion = document.querySelector("#promo-pagination");

  const PROMOCIONES_POR_PAGINA = 12;
  const NOMBRES_DE_DIAS = [
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
  ];
  // Los precios de la API están en céntimos: 4000 equivale a S/ 40.00.
  const rangosDePrecio = {
    "": [0, Infinity],
    low: [0, 4000],
    mid: [4001, 7000],
    high: [7001, Infinity],
  };
  // Criolla también incluye el código anterior del catálogo.
  const tiposEquivalentes = { CRIOLLA: ["CRIOLLA", "PERUANA_TRADICIONAL"] };
  const formatoDeFecha = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  });

  let catalogo = [];
  let paginaActual = 1;
  let cargaDelCatalogo = 0;
  let operacionDeLista = 0;
  let operacionDeDetalle = 0;
  let cargaDePlatos = null;
  const contextosDeRestaurante = new Map();
  const fotosDePromocion = new Map();
  const platosDeRestaurante = new Map();

  // ==========================================
  // Normalizar texto para buscar sin tildes ni mayúsculas
  // ==========================================
  const normalizarTexto = (texto) =>
    String(texto ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  // ==========================================
  // Leer el valor actual de un control de filtro
  // ==========================================
  const valorDeFiltro = (nombre) => formulario.elements[nombre]?.value ?? "";

  // ==========================================
  // Saber si una casilla de filtro está marcada
  // ==========================================
  const filtroMarcado = (nombre) =>
    Boolean(formulario.elements[nombre]?.checked);

  // ==========================================
  // Cargar una vez el restaurante y todos sus locales activos
  // ==========================================
  function consultarContextoDeRestaurante(restauranteId) {
    if (!contextosDeRestaurante.has(restauranteId)) {
      const base = "/restaurants/" + encodeURIComponent(restauranteId);
      const carga = Promise.all([
        MesaAPI.request(base),
        MesaAPI.all(base + "/branches"),
      ])
        .then(([respuesta, locales]) => ({
          restaurante: respuesta.data,
          locales,
        }))
        .catch((error) => {
          contextosDeRestaurante.delete(restauranteId);
          throw error;
        });
      contextosDeRestaurante.set(restauranteId, carga);
    }
    return contextosDeRestaurante.get(restauranteId);
  }

  // ==========================================
  // Obtener una fotografía pública por su ID, sin repetir consultas
  // ==========================================
  function consultarFotoPorId(restauranteId, fotoId) {
    if (!fotoId) return Promise.resolve(null);
    const clave = restauranteId + "/" + fotoId;
    if (!fotosDePromocion.has(clave)) {
      const ruta =
        "/restaurants/" +
        encodeURIComponent(restauranteId) +
        "/photos/" +
        encodeURIComponent(fotoId);
      // Una foto retirada o con error no debe impedir mostrar la promoción.
      fotosDePromocion.set(
        clave,
        MesaAPI.request(ruta)
          .then((respuesta) => respuesta.data)
          .catch(() => null),
      );
    }
    return fotosDePromocion.get(clave);
  }

  // ==========================================
  // Obtener la fotografía propia de la promoción
  // ==========================================
  const consultarFotoDePromocion = (datos) =>
    consultarFotoPorId(datos.promocion.restaurantId, datos.promocion.photoId);

  // ==========================================
  // Cargar una vez la carta activa de un restaurante
  // ==========================================
  function consultarPlatosDeRestaurante(restauranteId) {
    if (!platosDeRestaurante.has(restauranteId)) {
      platosDeRestaurante.set(
        restauranteId,
        MesaAPI.all(
          "/restaurants/" + encodeURIComponent(restauranteId) + "/menu-items",
        ).catch((error) => {
          platosDeRestaurante.delete(restauranteId);
          throw error;
        }),
      );
    }
    return platosDeRestaurante.get(restauranteId);
  }

  // ==========================================
  // Buscar la foto del primer plato incluido que tenga una
  // ==========================================
  async function consultarFotoDeUnPlatoIncluido(datos) {
    const { promocion } = datos;
    if (!(promocion.items || []).length) return null;
    let platos;
    try {
      platos = await consultarPlatosDeRestaurante(promocion.restaurantId);
    } catch {
      return null;
    }
    for (const item of promocion.items) {
      const plato = platos.find((p) => p._id === item.menuItemId);
      if (!plato?.photoId) continue;
      const foto = await consultarFotoPorId(
        promocion.restaurantId,
        plato.photoId,
      );
      if (foto?.url) return foto;
    }
    return null;
  }

  // ==========================================
  // Elegir la foto de la tarjeta: promoción, plato, miniatura o portada
  // ==========================================
  async function elegirFotoDePromocion(datos) {
    const propia = await consultarFotoDePromocion(datos);
    if (propia?.url) return propia;
    const deUnPlato = await consultarFotoDeUnPlatoIncluido(datos);
    if (deUnPlato?.url) return deUnPlato;
    return (
      datos.restaurante.thumbnailPhoto || datos.restaurante.coverPhoto || null
    );
  }

  // ==========================================
  // Preparar los datos de una promoción con su restaurante y sus locales
  // ==========================================
  function prepararDatosDePromocion(promocion, contexto, posicion) {
    const restaurante = contexto?.restaurante || promocion.restaurant || {};
    const locales = (contexto?.locales || []).filter((local) =>
      (promocion.branchIds || []).includes(local._id),
    );
    return {
      promocion,
      restaurante,
      nombre: promocion.restaurant?.name || restaurante.name || "Restaurante",
      locales,
      distritos: [
        ...new Set(
          locales.map((local) => local.address?.district).filter(Boolean),
        ),
      ],
      tipos: (restaurante.cuisineTypes || []).map((tipo) =>
        String(tipo).toUpperCase(),
      ),
      platos: [],
      textoDeBusqueda: null,
      foto: null,
      posicion,
    };
  }

  // ==========================================
  // Consultar el catálogo completo y preparar sus datos
  // ==========================================
  async function cargarCatalogoDePromociones() {
    const carga = ++cargaDelCatalogo;
    contextosDeRestaurante.clear();
    fotosDePromocion.clear();
    platosDeRestaurante.clear();
    cargaDePlatos = null;
    vacio.hidden = true;
    paginacion.hidden = true;
    contador.textContent = "";
    MesaUI.state(lista, "Cargando promociones…");
    try {
      const promociones = await MesaAPI.all("/promotions");
      const restaurantes = [
        ...new Set(promociones.map((promocion) => promocion.restaurantId)),
      ];
      const contextos = new Map();
      const resultados = await Promise.allSettled(
        restaurantes.map(async (restauranteId) =>
          contextos.set(
            restauranteId,
            await consultarContextoDeRestaurante(restauranteId),
          ),
        ),
      );
      if (carga !== cargaDelCatalogo) return;
      const fallidos = resultados.filter((r) => r.status === "rejected");
      // Si ningún restaurante respondió, el problema es de conexión: se ofrece reintentar.
      if (restaurantes.length && fallidos.length === restaurantes.length)
        throw fallidos[0].reason;
      catalogo = promociones.map((promocion, posicion) =>
        prepararDatosDePromocion(
          promocion,
          contextos.get(promocion.restaurantId),
          posicion,
        ),
      );
      paginaActual = 1;
      llenarDistritos();
      await mostrarPromociones();
    } catch (error) {
      if (carga !== cargaDelCatalogo) return;
      catalogo = [];
      MesaUI.state(
        lista,
        error.message || "No pudimos cargar las promociones.",
        cargarCatalogoDePromociones,
      );
    }
  }

  // ==========================================
  // Llenar el filtro de distritos con los locales de las promociones
  // ==========================================
  function llenarDistritos() {
    const selector = formulario.elements.district;
    const seleccionado = selector.value;
    const distritos = [...new Set(catalogo.flatMap((d) => d.distritos))].sort(
      (a, b) => a.localeCompare(b, "es"),
    );
    [...selector.options].slice(1).forEach((opcion) => opcion.remove());
    distritos.forEach((distrito) => {
      const opcion = MesaUI.element("option", "", distrito);
      opcion.value = distrito;
      selector.append(opcion);
    });
    selector.value = distritos.includes(seleccionado) ? seleccionado : "";
  }

  // ==========================================
  // Llenar el filtro de tipos de comida con los códigos de /metadata
  // ==========================================
  async function cargarTiposDeComida() {
    const selector = formulario.elements.type;
    try {
      const respuesta = await MesaAPI.request("/metadata");
      const codigos = (respuesta.data?.foodTypes || [])
        .map((tipo) => (typeof tipo === "string" ? tipo : tipo?.code))
        .filter(Boolean);
      // Si el catálogo no llega, se conservan las opciones escritas en el HTML.
      if (!codigos.length) return;
      const seleccionado = selector.value.toUpperCase();
      [...selector.options].slice(1).forEach((opcion) => opcion.remove());
      codigos
        .map((codigo) => ({ codigo, etiqueta: MesaUI.label(codigo) }))
        .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"))
        .forEach(({ codigo, etiqueta }) => {
          const opcion = MesaUI.element("option", "", etiqueta);
          opcion.value = codigo;
          selector.append(opcion);
        });
      selector.value = codigos.includes(seleccionado) ? seleccionado : "";
    } catch {
      // Sin /metadata el filtro sigue funcionando con las opciones del HTML.
    }
  }

  // ==========================================
  // Cargar los nombres de platos para poder buscar por ellos
  // ==========================================
  function cargarPlatosParaBuscar() {
    if (cargaDePlatos) return cargaDePlatos;
    const catalogoActual = catalogo;
    const restaurantes = [
      ...new Set(catalogoActual.map((d) => d.promocion.restaurantId)),
    ];
    cargaDePlatos = Promise.allSettled(
      restaurantes.map(async (restauranteId) => {
        const platos = await consultarPlatosDeRestaurante(restauranteId);
        const nombres = new Map(platos.map((plato) => [plato._id, plato.name]));
        catalogoActual
          .filter((d) => d.promocion.restaurantId === restauranteId)
          .forEach((datos) => {
            datos.platos = (datos.promocion.items || [])
              .map((item) => nombres.get(item.menuItemId))
              .filter(Boolean);
            datos.textoDeBusqueda = null;
          });
      }),
    ).then(() => {
      if (catalogoActual === catalogo && valorDeFiltro("query").trim())
        mostrarPromociones();
    });
    return cargaDePlatos;
  }

  // ==========================================
  // Obtener el texto donde buscar una promoción
  // ==========================================
  function obtenerTextoDeBusqueda(datos) {
    datos.textoDeBusqueda ??= normalizarTexto(
      [
        datos.promocion.title,
        datos.promocion.description,
        datos.promocion.terms,
        datos.nombre,
        ...datos.distritos,
        ...datos.platos,
      ].join(" "),
    );
    return datos.textoDeBusqueda;
  }

  // ==========================================
  // Filtrar y ordenar el catálogo completo
  // ==========================================
  function obtenerPromocionesFiltradas() {
    const consulta = normalizarTexto(valorDeFiltro("query").trim());
    const distrito = valorDeFiltro("district");
    const tipo = valorDeFiltro("type").toUpperCase();
    const tiposAceptados = tipo ? tiposEquivalentes[tipo] || [tipo] : null;
    const [minimo, maximo] =
      rangosDePrecio[valorDeFiltro("price")] || rangosDePrecio[""];
    const orden = valorDeFiltro("sort");
    const soloDisponibles = filtroMarcado("available");
    const soloDestacadas = filtroMarcado("featured");
    return catalogo
      .filter((datos) => {
        const precio = Number(datos.promocion.priceCents);
        return (
          (!consulta || obtenerTextoDeBusqueda(datos).includes(consulta)) &&
          (!distrito || datos.distritos.includes(distrito)) &&
          (!tiposAceptados ||
            datos.tipos.some((t) => tiposAceptados.includes(t))) &&
          precio >= minimo &&
          precio <= maximo &&
          (!soloDisponibles || datos.promocion.availableNow) &&
          (!soloDestacadas || datos.promocion.featured)
        );
      })
      .sort((a, b) => {
        if (orden === "price-asc")
          return a.promocion.priceCents - b.promocion.priceCents;
        if (orden === "price-desc")
          return b.promocion.priceCents - a.promocion.priceCents;
        if (orden === "featured" && a.promocion.featured !== b.promocion.featured)
          return a.promocion.featured ? -1 : 1;
        // El catálogo llega de la API del más reciente al más antiguo.
        return a.posicion - b.posicion;
      });
  }

  // ==========================================
  // Describir los días en que aplica una promoción
  // ==========================================
  function describirDias(dias) {
    const ordenados = [...new Set(dias || [])]
      .filter((dia) => dia >= 1 && dia <= 7)
      .sort((a, b) => a - b);
    if (!ordenados.length) return "";
    if (ordenados.length === 7) return "Todos los días";
    const nombres = ordenados.map((dia) => NOMBRES_DE_DIAS[dia - 1]);
    const consecutivos =
      ordenados[ordenados.length - 1] - ordenados[0] === ordenados.length - 1;
    let texto;
    if (consecutivos && nombres.length >= 3)
      texto = nombres[0] + " a " + nombres[nombres.length - 1];
    else if (nombres.length === 1) texto = nombres[0];
    else
      texto =
        nombres.slice(0, -1).join(", ") + " y " + nombres[nombres.length - 1];
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  // ==========================================
  // Describir los horarios en que aplica una promoción
  // ==========================================
  function describirHorarios(rangos) {
    return (rangos || [])
      .map(
        (rango) =>
          `${rango.opens}–${rango.closes}${rango.closesNextDay ? " (día siguiente)" : ""}`,
      )
      .join(", ");
  }

  // ==========================================
  // Describir días y horarios en una sola línea
  // ==========================================
  function describirDiasYHorarios(promocion) {
    return [
      describirDias(promocion.validDays),
      describirHorarios(promocion.validTimeRanges),
    ]
      .filter(Boolean)
      .join(", ");
  }

  // ==========================================
  // Describir la vigencia con fechas de Lima
  // ==========================================
  function describirVigencia(promocion) {
    const inicio = new Date(promocion.startsAt);
    // endsAt es exclusivo: el último día vigente es el anterior a ese instante.
    const fin = new Date(new Date(promocion.endsAt).getTime() - 1);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()))
      return "";
    return inicio > new Date()
      ? `Desde el ${formatoDeFecha.format(inicio)} hasta el ${formatoDeFecha.format(fin)}`
      : `Vigente hasta el ${formatoDeFecha.format(fin)}`;
  }

  // ==========================================
  // Crear el texto de disponibilidad actual
  // ==========================================
  function crearEstadoDeDisponibilidad(promocion) {
    const disponible = Boolean(promocion.availableNow);
    return MesaUI.element(
      "p",
      "promo-card__status" + (disponible ? " promo-card__status--on" : ""),
      disponible ? "Disponible ahora" : "No disponible ahora",
    );
  }

  // ==========================================
  // Crear una línea con icono para la tarjeta
  // ==========================================
  function crearLineaConIcono(clase, icono, texto) {
    const linea = MesaUI.element("p", clase, texto);
    linea.prepend(MesaIcons.icon(icono));
    return linea;
  }

  // ==========================================
  // Crear la tarjeta pública de una promoción con datos de la API
  // ==========================================
  function crearTarjetaDePromocion(datos) {
    const { promocion, distritos, foto } = datos;
    const tarjeta = MesaUI.element("article", "promo-card");
    const visual = MesaUI.element("div", "promo-card__image");
    visual.append(MesaUI.image(foto?.url, foto?.altText || promocion.title));
    if (promocion.featured)
      visual.append(MesaUI.element("span", "promo-card__badge", "Destacada"));
    // El corazón guarda el restaurante: la API no tiene promociones favoritas.
    if (window.MesaFavoritos) {
      const corazon = MesaFavoritos.crearBoton({
        _id: promocion.restaurantId,
        name: datos.nombre,
      });
      corazon.setAttribute(
        "aria-label",
        `Guardar el restaurante ${datos.nombre} en favoritos`,
      );
      visual.append(corazon);
    }
    const cuerpo = MesaUI.element("div", "promo-card__body");
    cuerpo.append(
      MesaUI.element("p", "promo-card__restaurant", datos.nombre),
      crearLineaConIcono(
        "promo-card__location",
        "map-pin",
        distritos.join(" · ") || "Local por confirmar",
      ),
      MesaUI.element("h3", "promo-card__title", promocion.title),
    );
    if (promocion.description)
      cuerpo.append(
        MesaUI.element("p", "promo-card__text", promocion.description),
      );
    const horario = describirDiasYHorarios(promocion);
    if (horario)
      cuerpo.append(crearLineaConIcono("promo-card__schedule", "clock", horario));
    const vigencia = describirVigencia(promocion);
    if (vigencia)
      cuerpo.append(
        crearLineaConIcono("promo-card__schedule", "calendar", vigencia),
      );
    cuerpo.append(
      crearEstadoDeDisponibilidad(promocion),
      MesaUI.element(
        "p",
        "promo-card__price",
        MesaUI.money(promocion.priceCents) +
          " " +
          MesaUI.label(promocion.pricingUnit),
      ),
    );
    if (promocion.terms)
      cuerpo.append(MesaUI.element("p", "promo-card__terms", promocion.terms));
    const acciones = MesaUI.element("div", "promo-card__actions");
    const enlace = MesaUI.link(
      "Ver restaurante",
      MesaUI.detailUrl({ _id: promocion.restaurantId }),
      "promo-card__link",
    );
    enlace.append(MesaIcons.icon("arrow-right"));
    acciones.append(
      MesaUI.button(
        "Ver detalle",
        () => abrirDetalleDePromocion(datos),
        "promo-card__more",
      ),
      enlace,
    );
    cuerpo.append(acciones);
    tarjeta.append(visual, cuerpo);
    return tarjeta;
  }

  // ==========================================
  // Mostrar la página actual del resultado filtrado
  // ==========================================
  async function mostrarPromociones() {
    const operacion = ++operacionDeLista;
    const filtradas = obtenerPromocionesFiltradas();
    contador.textContent =
      filtradas.length +
      (filtradas.length === 1
        ? " promoción encontrada"
        : " promociones encontradas");
    if (!catalogo.length) {
      vacio.hidden = true;
      paginacion.hidden = true;
      MesaUI.state(lista, "Todavía no hay promociones vigentes.");
      return;
    }
    if (!filtradas.length) {
      lista.replaceChildren();
      vacio.hidden = false;
      paginacion.hidden = true;
      return;
    }
    vacio.hidden = true;
    const totalDePaginas = Math.ceil(filtradas.length / PROMOCIONES_POR_PAGINA);
    paginaActual = Math.min(Math.max(paginaActual, 1), totalDePaginas);
    const inicio = (paginaActual - 1) * PROMOCIONES_POR_PAGINA;
    const pagina = filtradas.slice(inicio, inicio + PROMOCIONES_POR_PAGINA);
    // Las fotos se consultan solo para las tarjetas de la página visible.
    // Orden: foto de la promoción, foto de un plato incluido, miniatura o portada.
    await Promise.all(
      pagina.map(async (datos) => {
        datos.foto = await elegirFotoDePromocion(datos);
      }),
    );
    // Si el usuario cambió de filtro mientras llegaban las fotos, esta respuesta ya no sirve.
    if (operacion !== operacionDeLista) return;
    lista.replaceChildren(...pagina.map(crearTarjetaDePromocion));
    MesaUI.paginate(paginacion, paginaActual, totalDePaginas, irAPagina);
  }

  // ==========================================
  // Cambiar de página y volver al inicio del listado
  // ==========================================
  function irAPagina(pagina) {
    paginaActual = pagina;
    mostrarPromociones();
    document.querySelector(".promotions-main")?.scrollIntoView({
      block: "start",
    });
  }

  // ==========================================
  // Consultar el detalle de una promoción y sus platos incluidos
  // ==========================================
  async function consultarDetalleDePromocion(datos) {
    const base =
      "/restaurants/" + encodeURIComponent(datos.promocion.restaurantId);
    const respuesta = await MesaAPI.request(
      base + "/promotions/" + encodeURIComponent(datos.promocion._id),
    );
    const promocion = respuesta.data;
    const [contexto, platos] = await Promise.all([
      consultarContextoDeRestaurante(datos.promocion.restaurantId).catch(
        () => null,
      ),
      Promise.all(
        (promocion.items || []).map(async (item) => {
          try {
            const respuestaPlato = await MesaAPI.request(
              base + "/menu-items/" + encodeURIComponent(item.menuItemId),
            );
            return { plato: respuestaPlato.data, cantidad: item.quantity };
          } catch (error) {
            // Un plato retirado no impide mostrar el resto de la promoción.
            if (error.status === 404)
              return { plato: null, cantidad: item.quantity };
            throw error;
          }
        }),
      ),
    ]);
    return {
      promocion,
      restaurante: contexto?.restaurante || datos.restaurante,
      locales: (contexto?.locales || datos.locales).filter((local) =>
        (promocion.branchIds || []).includes(local._id),
      ),
      platos,
    };
  }

  // ==========================================
  // Crear una sección con título dentro del detalle
  // ==========================================
  function crearSeccionDeDetalle(titulo, ...contenido) {
    const seccion = MesaUI.element("section", "promo-detail__section");
    seccion.append(MesaUI.element("h3", "", titulo), ...contenido);
    return seccion;
  }

  // ==========================================
  // Crear una lista de textos para el detalle
  // ==========================================
  function crearListaDeDetalle(textos) {
    const elementos = MesaUI.element("ul", "promo-detail__list");
    textos.forEach((texto) =>
      elementos.append(MesaUI.element("li", "", texto)),
    );
    return elementos;
  }

  // ==========================================
  // Mostrar el detalle completo dentro del diálogo
  // ==========================================
  function mostrarDetalleDePromocion(contenido, datos, detalle) {
    const { promocion, restaurante, locales, platos } = detalle;
    const nombre = promocion.restaurant?.name || restaurante.name || datos.nombre;
    const caja = MesaUI.element("div", "promo-detail");
    if (datos.foto?.url)
      caja.append(
        MesaUI.image(
          datos.foto.url,
          datos.foto.altText || promocion.title,
          "promo-detail__image",
        ),
      );
    const personas = promocion.peopleCount
      ? ` · ${promocion.peopleCount} ${promocion.peopleCount === 1 ? "persona" : "personas"}`
      : "";
    caja.append(
      MesaUI.element("p", "promo-card__restaurant", nombre),
      MesaUI.element(
        "p",
        "promo-card__price",
        MesaUI.money(promocion.priceCents) +
          " " +
          MesaUI.label(promocion.pricingUnit) +
          personas,
      ),
      crearEstadoDeDisponibilidad(promocion),
    );
    if (promocion.description)
      caja.append(
        MesaUI.element("p", "modal-description", promocion.description),
      );
    caja.append(
      crearSeccionDeDetalle(
        "Dónde aplica",
        crearListaDeDetalle(
          locales.length
            ? locales.map((local) => {
                const direccion = [local.address?.street, local.address?.district]
                  .filter(Boolean)
                  .join(", ");
                return direccion ? `${local.name}: ${direccion}` : local.name;
              })
            : ["Locales por confirmar"],
        ),
      ),
    );
    if (platos.length)
      caja.append(
        crearSeccionDeDetalle(
          "Incluye",
          crearListaDeDetalle(
            platos.map(({ plato, cantidad }) =>
              plato
                ? `${cantidad} × ${plato.name}`
                : `${cantidad} × Plato no disponible actualmente`,
            ),
          ),
        ),
      );
    const horario = describirDiasYHorarios(promocion);
    const vigencia = describirVigencia(promocion);
    caja.append(
      crearSeccionDeDetalle(
        "Vigencia y horario",
        crearListaDeDetalle([vigencia, horario].filter(Boolean)),
      ),
    );
    if (promocion.terms)
      caja.append(
        crearSeccionDeDetalle(
          "Condiciones",
          MesaUI.element("p", "modal-description", promocion.terms),
        ),
      );
    caja.append(
      MesaUI.element(
        "p",
        "promo-card__terms",
        "Confirma el precio y las condiciones con el restaurante: la reserva no aplica automáticamente esta promoción.",
      ),
    );
    const enlace = MesaUI.link(
      "Ver restaurante",
      MesaUI.detailUrl({ _id: promocion.restaurantId }),
      "button",
    );
    enlace.append(MesaIcons.icon("arrow-right"));
    caja.append(enlace);
    contenido.replaceChildren(contenido.firstElementChild, caja);
  }

  // ==========================================
  // Abrir el detalle de una promoción en un diálogo
  // ==========================================
  async function abrirDetalleDePromocion(datos) {
    const operacion = ++operacionDeDetalle;
    const contenido = MesaUI.modal(datos.promocion.title, "wide-modal");
    const titulo = contenido.firstElementChild;
    contenido.append(
      MesaUI.element("p", "modal-description", "Cargando detalle…"),
    );
    // El diálogo se reutiliza: si se abrió otro contenido, esta respuesta se descarta.
    const sigueAbierto = () =>
      operacion === operacionDeDetalle && titulo.isConnected;
    try {
      const detalle = await consultarDetalleDePromocion(datos);
      if (sigueAbierto()) mostrarDetalleDePromocion(contenido, datos, detalle);
    } catch (error) {
      if (!sigueAbierto()) return;
      const noDisponible = error.status === 404;
      const estado = MesaUI.element("div");
      contenido.replaceChildren(titulo, estado);
      MesaUI.state(
        estado,
        noDisponible
          ? "Esta promoción ya no está disponible."
          : error.message || "No pudimos cargar el detalle.",
        noDisponible ? undefined : () => abrirDetalleDePromocion(datos),
      );
    }
  }

  // ==========================================
  // Aplicar los filtros desde el primer resultado
  // ==========================================
  const aplicarFiltrosDePromociones = (event) => {
    paginaActual = 1;
    // Al buscar por primera vez se cargan los nombres de los platos incluidos.
    if (event?.target?.name === "query" && valorDeFiltro("query").trim())
      cargarPlatosParaBuscar();
    mostrarPromociones();
  };

  // ==========================================
  // Evitar que el formulario recargue la página
  // ==========================================
  const evitarEnvioDeFiltros = (event) => event.preventDefault();

  // ==========================================
  // Restablecer los filtros y volver a mostrar las promociones
  // ==========================================
  const restablecerFiltrosDePromociones = () => {
    formulario.reset();
    aplicarFiltrosDePromociones();
  };

  // ==========================================
  // Ocultar la imagen decorativa del hero si no carga
  // ==========================================
  function revisarImagenDelHero() {
    const imagen = document.querySelector(".promo-hero__art img");
    if (!imagen) return;
    const ocultar = () => {
      imagen.hidden = true;
    };
    imagen.addEventListener("error", ocultar, { once: true });
    if (imagen.complete && imagen.naturalWidth === 0) ocultar();
  }

  // Eventos de la interfaz.
  formulario.addEventListener("input", aplicarFiltrosDePromociones);
  formulario.addEventListener("change", aplicarFiltrosDePromociones);
  formulario.addEventListener("submit", evitarEnvioDeFiltros);
  document
    .querySelector("#promo-reset")
    ?.addEventListener("click", restablecerFiltrosDePromociones);
  revisarImagenDelHero();
  cargarTiposDeComida();
  cargarCatalogoDePromociones();
})();
