// ==========================================
// Gestión de promociones del dueño del restaurante
// ==========================================
(() => {
  "use strict";
  const U = MesaAdminUI;
  const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const estados = {
    PUBLISHED: "Publicada",
    DRAFT: "Borrador",
    ARCHIVED: "Archivada",
  };
  const fechaLima = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const partesLima = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  // ==========================================
  // Separar un instante en fecha y hora del calendario de Lima
  // ==========================================
  function separarFecha(valor) {
    const partes = Object.fromEntries(
      partesLima
        .formatToParts(new Date(valor))
        .map((parte) => [parte.type, parte.value]),
    );
    return {
      fecha: partes.year + "-" + partes.month + "-" + partes.day,
      hora: partes.hour + ":" + partes.minute,
    };
  }

  // ==========================================
  // Guardar la fecha local conservando instantes que no fueron editados
  // ==========================================
  function construirInstante(fecha, hora, original) {
    if (original) {
      const anterior = separarFecha(original);
      if (anterior.fecha === fecha && anterior.hora === hora) return original;
    }
    return fecha + "T" + hora + ":00-05:00";
  }

  // ==========================================
  // Resumir los días y horarios de una promoción
  // ==========================================
  function describirHorario(promocion) {
    const seleccionados = [...promocion.validDays].sort((a, b) => a - b);
    const semana =
      seleccionados.length === 7
        ? "Todos los días"
        : seleccionados.map((dia) => dias[dia - 1]).join(", ");
    const horarios = (promocion.validTimeRanges || []).map(
      (periodo) =>
        periodo.opens +
        "–" +
        periodo.closes +
        (periodo.closesNextDay ? " (día siguiente)" : ""),
    );
    return (
      semana +
      " · " +
      (horarios.length ? horarios.join(" / ") : "Sin restricción horaria")
    );
  }

  // ==========================================
  // Mostrar el listado de promociones con estado, local y paginación
  // ==========================================
  function mostrar(contenedor, contexto, seleccion = {}) {
    let pagina = seleccion.pagina || 1;
    let estado = seleccion.estado || "";
    let operacion = 0;
    let abriendo = false;
    contenedor.replaceChildren(
      U.cabecera(
        "Promociones",
        "Publica experiencias y ofertas para tus comensales.",
        [U.enlacePublico(contexto)],
      ),
    );
    const filtros = U.crearElemento("div", "owner-promo-filters");
    const pestanas = U.crearElemento("div", "owner-promo-status");
    pestanas.setAttribute("aria-label", "Filtrar promociones por estado");
    for (const [codigo, titulo] of [
      ["", "Todas"],
      ["PUBLISHED", "Publicadas"],
      ["DRAFT", "Borradores"],
      ["ARCHIVED", "Archivadas"],
    ]) {
      const control = U.boton(
        titulo,
        () => {
          estado = codigo;
          pagina = 1;
          pestanas
            .querySelectorAll("button")
            .forEach((boton) =>
              boton.setAttribute("aria-pressed", String(boton === control)),
            );
          cargarPromociones();
        },
        null,
        "owner-tab",
      );
      control.setAttribute("aria-pressed", String(codigo === estado));
      pestanas.append(control);
    }
    const local = U.campo(
      filtros,
      "promotion-filter-branch",
      "Local",
      seleccion.local || "",
      {
        opciones: [
          ["", "Todos los locales"],
          ...contexto.locales.map((local) => [local._id, local.name]),
        ],
      },
    );
    filtros.prepend(pestanas);
    filtros.append(
      U.boton(
        "Crear promoción",
        () => editar(contenedor, contexto, {}, recordarFiltros()),
        "plus",
      ),
    );
    const resultados = U.crearElemento("div", "owner-promo-results");
    resultados.setAttribute("aria-live", "polite");
    const nota = U.crearElemento(
      "p",
      "owner-help owner-promo-note",
      "Las promociones publicadas se muestran durante su vigencia, días y horarios en restaurantes publicados. Los borradores y las archivadas permanecen privados.",
    );
    contenedor.append(filtros, resultados, nota);
    local.addEventListener("change", () => {
      pagina = 1;
      cargarPromociones();
    });

    // ==========================================
    // Conservar los filtros al volver del editor
    // ==========================================
    function recordarFiltros() {
      return { pagina, estado, local: local.value };
    }

    // ==========================================
    // Obtener la página de promociones del restaurante seleccionado
    // ==========================================
    async function cargarPromociones() {
      const actual = ++operacion;
      resultados.setAttribute("aria-busy", "true");
      try {
        const respuesta = await contexto.peticion(
          "/promotions" +
            MesaAPI.query({
              page: pagina,
              limit: 9,
              status: estado,
              branchId: local.value,
            }),
        );
        if (actual !== operacion || !contexto.vigente()) return;
        if (!respuesta.data.length && pagina > 1) {
          pagina = Math.max(1, respuesta.meta.totalPages);
          return cargarPromociones();
        }
        resultados.replaceChildren();
        if (!respuesta.data.length) {
          U.mensaje(
            resultados,
            "Todavía no hay promociones en esta selección",
            "Crea una experiencia para tus comensales o cambia los filtros para consultar otras promociones.",
            U.boton(
              "Crear promoción",
              () => editar(contenedor, contexto, {}, recordarFiltros()),
              "plus",
            ),
          );
        } else {
          const lista = U.crearElemento("div", "owner-promo-grid");
          for (const promocion of respuesta.data)
            lista.append(crearTarjeta(promocion, contexto, abrirEditor));
          resultados.append(lista);
        }
        U.paginar(resultados, respuesta.meta, (elegida) => {
          pagina = elegida;
          cargarPromociones();
        });
        U.animar(resultados);
      } catch (error) {
        if (
          actual !== operacion ||
          !contexto.vigente() ||
          error.name === "AbortError"
        )
          return;
        U.mensaje(
          resultados,
          "No pudimos cargar las promociones",
          error.message,
          U.boton("Volver a intentar", cargarPromociones, "rotate-cw"),
        );
      } finally {
        if (actual === operacion) resultados.removeAttribute("aria-busy");
      }
    }

    // ==========================================
    // Consultar el detalle actualizado antes de editar una promoción
    // ==========================================
    async function abrirEditor(promocion, boton) {
      if (abriendo || !U.permitirSalida()) return;
      abriendo = true;
      boton.disabled = true;
      try {
        const respuesta = await contexto.peticion(
          "/promotions/" + encodeURIComponent(promocion._id),
        );
        if (contexto.vigente() && resultados.isConnected)
          editar(contenedor, contexto, respuesta.data, recordarFiltros());
      } catch (error) {
        if (!contexto.vigente() || !resultados.isConnected) return;
        const contenido = MesaUI.modal(
          "No se pudo abrir la promoción",
          "owner-notice",
        );
        contenido.append(U.crearElemento("p", "", error.message));
      } finally {
        abriendo = false;
        boton.disabled = false;
      }
    }

    cargarPromociones();
  }

  // ==========================================
  // Construir una tarjeta con imagen, precio y condiciones de vigencia
  // ==========================================
  function crearTarjeta(promocion, contexto, abrirEditor) {
    const tarjeta = U.crearElemento("article", "owner-promotion owner-card");
    const imagen = U.crearElemento("div", "owner-promo-picture");
    const foto = contexto.fotos.find((foto) => foto._id === promocion.photoId);
    imagen.append(U.crearImagen(foto?.url, foto?.altText || promocion.title));
    imagen.append(
      U.crearElemento(
        "span",
        "owner-badge owner-promo-badge " +
          (promocion.status === "PUBLISHED"
            ? "positive"
            : promocion.status === "DRAFT"
              ? "draft"
              : "neutral"),
        estados[promocion.status],
      ),
    );
    const cuerpo = U.crearElemento("div", "owner-promo-body");
    const titulo = U.crearElemento("div", "owner-promo-title");
    titulo.append(U.crearElemento("h2", "", promocion.title));
    if (promocion.featured) {
      const destacado = U.crearElemento("span", "owner-tag", "Destacada");
      destacado.prepend(MesaIcons.icon("star"));
      titulo.append(destacado);
    }
    const precio = U.crearElemento("p", "owner-promo-price");
    precio.append(
      U.crearElemento("strong", "owner-price", U.dinero(promocion.priceCents)),
      U.crearElemento("span", "owner-muted", U.traducir(promocion.pricingUnit)),
    );
    cuerpo.append(
      titulo,
      precio,
      U.crearElemento(
        "p",
        "owner-promo-description",
        promocion.description || "Sin descripción.",
      ),
    );
    const datos = U.crearElemento("ul", "owner-promo-meta");
    const locales = promocion.branchIds.map(
      (id) =>
        contexto.locales.find((local) => local._id === id)?.name ||
        "Local no disponible",
    );
    for (const [icono, texto] of [
      ["map-pin", locales.join(", ")],
      [
        "calendar-days",
        fechaLima.format(new Date(promocion.startsAt)) +
          " – " +
          fechaLima.format(new Date(promocion.endsAt)),
      ],
      ["clock", describirHorario(promocion)],
    ]) {
      const fila = U.crearElemento("li");
      fila.append(MesaIcons.icon(icono), U.crearElemento("span", "", texto));
      datos.append(fila);
    }
    cuerpo.append(datos);
    if (promocion.status === "PUBLISHED") {
      const ahora = Date.now();
      const disponibilidad =
        ahora < new Date(promocion.startsAt).getTime()
          ? "Próximamente"
          : ahora >= new Date(promocion.endsAt).getTime()
            ? "Vigencia finalizada"
            : promocion.availableNow
              ? "Disponible ahora"
              : "Fuera del horario actual";
      cuerpo.append(
        U.crearElemento(
          "p",
          "owner-help owner-promo-availability",
          disponibilidad,
        ),
      );
    }
    const acciones = U.crearElemento("div", "owner-promo-actions");
    const editar = U.boton(
      "Editar",
      (evento) => abrirEditor(promocion, evento.currentTarget),
      "pencil",
      "owner-button secondary",
    );
    editar.setAttribute("aria-label", "Editar promoción: " + promocion.title);
    acciones.append(editar);
    if (promocion.status !== "ARCHIVED") {
      const archivar = U.boton(
        "Archivar",
        () => contexto.archivar("/promotions", promocion),
        "archive",
        "owner-button secondary",
      );
      archivar.setAttribute(
        "aria-label",
        "Archivar promoción: " + promocion.title,
      );
      acciones.append(archivar);
    }
    cuerpo.append(acciones);
    tarjeta.append(imagen, cuerpo);
    return tarjeta;
  }

  // ==========================================
  // Crear un grupo de opciones con un mensaje accesible de validación
  // ==========================================
  function crearGrupo(titulo, nombre) {
    const grupo = U.crearElemento("fieldset", "owner-promo-group");
    grupo.tabIndex = -1;
    grupo.append(U.crearElemento("legend", "", titulo));
    const error = U.crearElemento("small", "owner-field-error");
    error.id = "promotion-error-" + nombre;
    grupo.setAttribute("aria-describedby", error.id);
    grupo.append(error);
    return grupo;
  }

  // ==========================================
  // Señalar un grupo incompleto antes de enviar el formulario
  // ==========================================
  function invalidarGrupo(grupo, mensaje) {
    grupo.setAttribute("aria-invalid", "true");
    grupo.querySelector(".owner-field-error").textContent = mensaje;
    throw new Error(mensaje);
  }

  // ==========================================
  // Seleccionar locales manteniendo visibles las referencias inactivas
  // ==========================================
  function crearSelectorLocales(contenedor, contexto, promocion, cambiar) {
    const grupo = crearGrupo("Locales *", "locales");
    const desplegable = U.crearElemento("details", "owner-promo-locals");
    const resumen = U.crearElemento("summary");
    const opciones = U.crearElemento("div", "owner-promo-local-options");
    const referencias = new Set(promocion.branchIds || []);
    const locales = contexto.locales.filter(
      (local) => local.status === "ACTIVE" || referencias.has(local._id),
    );
    for (const id of referencias)
      if (!locales.some((local) => local._id === id))
        locales.push({
          _id: id,
          name: "Local no disponible",
          status: "ARCHIVED",
        });
    const entradas = locales.map((local) => ({
      local,
      entrada: U.casilla(
        opciones,
        "branchIds",
        local.name + (local.status !== "ACTIVE" ? " (inactivo)" : ""),
        referencias.has(local._id),
      ),
    }));
    desplegable.append(resumen, opciones);
    grupo.prepend(desplegable);
    // Mantener el legend como primer hijo conserva la semántica del fieldset.
    grupo.prepend(grupo.querySelector("legend"));
    if (!locales.length)
      grupo.append(
        U.crearElemento(
          "p",
          "owner-help",
          "Agrega un local activo desde Locales para crear promociones.",
        ),
      );
    contenedor.append(grupo);

    // ==========================================
    // Leer los locales seleccionados para validar sus platos
    // ==========================================
    function seleccionados() {
      return entradas
        .filter((registro) => registro.entrada.checked)
        .map((registro) => registro.local);
    }

    // ==========================================
    // Refrescar el resumen del selector de locales
    // ==========================================
    function actualizarResumen() {
      resumen.replaceChildren();
      const elegidos = seleccionados();
      if (!elegidos.length)
        resumen.append(
          U.crearElemento("span", "owner-muted", "Selecciona los locales"),
        );
      else
        for (const local of elegidos)
          resumen.append(U.crearElemento("span", "owner-tag", local.name));
      resumen.append(MesaIcons.icon("chevron-down"));
    }

    entradas.forEach((registro) =>
      registro.entrada.addEventListener("change", () => {
        actualizarResumen();
        cambiar();
      }),
    );
    actualizarResumen();
    return { seleccionados, grupo };
  }

  // ==========================================
  // Comprobar la disponibilidad de un plato en todos los locales elegidos
  // ==========================================
  function platoCompatible(plato, locales) {
    return (
      plato?.status === "ACTIVE" &&
      locales.every((local) =>
        plato.branchOffers.some(
          (oferta) => oferta.branchId === local._id && oferta.available,
        ),
      )
    );
  }

  // ==========================================
  // Construir el editor de platos incluidos con cantidades independientes
  // ==========================================
  function crearPlatosIncluidos(contenedor, contexto, iniciales, leerLocales) {
    const tarjeta = U.tarjeta("Platos incluidos");
    const filas = U.crearElemento("div", "owner-promo-items");
    const registros = [];
    const aviso = U.crearElemento("p", "owner-help");
    const agregar = U.boton(
      "Agregar plato",
      () => {
        agregarFila({});
        U.estado.cambios = true;
      },
      "plus",
      "owner-button secondary",
    );
    tarjeta.append(
      U.crearElemento(
        "p",
        "owner-help",
        "Los platos deben estar disponibles en todos los locales seleccionados.",
      ),
      filas,
      aviso,
      agregar,
    );
    contenedor.append(tarjeta);

    // ==========================================
    // Actualizar las opciones sin retirar selecciones que necesitan corrección
    // ==========================================
    function actualizar() {
      const locales = leerLocales();
      const disponibles = contexto.platos.filter((plato) =>
        platoCompatible(plato, locales),
      );
      for (const [indice, registro] of registros.entries()) {
        const elegido = registro.plato.value;
        const opciones = [
          ["", "Selecciona un plato"],
          ...disponibles.map((plato) => [plato._id, plato.name]),
        ];
        if (elegido && !disponibles.some((plato) => plato._id === elegido))
          opciones.push([
            elegido,
            (contexto.platos.find((plato) => plato._id === elegido)?.name ||
              "Plato no disponible") + " (revisar disponibilidad)",
          ]);
        registro.plato.replaceChildren();
        for (const [id, titulo] of opciones) {
          const opcion = U.crearElemento("option", "", titulo);
          opcion.value = id;
          registro.plato.append(opcion);
        }
        registro.plato.value = elegido;
        registro.plato.name = "items." + indice + ".menuItemId";
        registro.cantidad.name = "items." + indice + ".quantity";
      }
      agregar.disabled = registros.length >= 100 || !disponibles.length;
      aviso.textContent = registros.length
        ? "Hasta 100 platos, con cantidades de 1 a 100."
        : disponibles.length
          ? "Puedes agregar platos de tu carta a esta experiencia."
          : "No hay platos disponibles para los locales seleccionados. Revisa tu carta o cambia los locales.";
    }

    // ==========================================
    // Añadir una fila editable de plato y cantidad
    // ==========================================
    function agregarFila(item) {
      if (registros.length >= 100) return;
      const fila = U.crearElemento("div", "owner-promo-item-row");
      const imagen = U.crearElemento("div", "owner-promo-item-photo");
      const plato = U.campo(fila, "", "Plato", "", {
        required: true,
        opciones: [[item.menuItemId || "", "Selecciona un plato"]],
      });
      plato.value = item.menuItemId || "";
      const cantidad = U.campo(fila, "", "Cantidad", item.quantity || 1, {
        tipo: "number",
        required: true,
        min: 1,
        max: 100,
        step: 1,
      });
      const registro = { fila, plato, cantidad };
      const quitar = U.boton(
        "",
        () => {
          registros.splice(registros.indexOf(registro), 1);
          fila.remove();
          actualizar();
          U.estado.cambios = true;
        },
        "trash-2",
        "owner-icon owner-promo-remove",
      );
      quitar.setAttribute("aria-label", "Quitar plato incluido");
      fila.prepend(imagen);
      fila.append(quitar);
      plato.addEventListener("change", actualizarImagen);

      // ==========================================
      // Mostrar la fotografía del plato elegido en la fila
      // ==========================================
      function actualizarImagen() {
        const elegido = contexto.platos.find(
          (item) => item._id === plato.value,
        );
        const foto = contexto.fotos.find(
          (foto) => foto._id === elegido?.photoId,
        );
        imagen.replaceChildren(U.crearImagen(foto?.url, ""));
        quitar.setAttribute(
          "aria-label",
          "Quitar plato: " + (elegido?.name || "sin seleccionar"),
        );
      }

      registros.push(registro);
      filas.append(fila);
      actualizar();
      actualizarImagen();
    }

    // ==========================================
    // Validar y serializar los platos incluidos en la promoción
    // ==========================================
    function leer() {
      const usados = new Set();
      return registros.map((registro) => {
        const plato = contexto.platos.find(
          (plato) => plato._id === registro.plato.value,
        );
        const mensaje = usados.has(registro.plato.value)
          ? "El plato ya está incluido. Ajusta su cantidad en la primera fila."
          : !platoCompatible(plato, leerLocales())
            ? "El plato debe estar activo y disponible en todos los locales seleccionados."
            : "";
        if (mensaje) {
          U.errorCampo(registro.plato, mensaje);
          throw new Error(mensaje);
        }
        usados.add(registro.plato.value);
        return {
          menuItemId: registro.plato.value,
          quantity: Number(registro.cantidad.value),
        };
      });
    }

    iniciales.forEach(agregarFila);
    actualizar();
    return { actualizar, leer };
  }

  // ==========================================
  // Editar hasta cinco horarios y su posible cierre al día siguiente
  // ==========================================
  function crearHorarios(contenedor, iniciales) {
    const limitar = U.casilla(
      contenedor,
      "limitHours",
      "Aplicar horarios específicos",
      iniciales.length > 0,
    );
    const lista = U.crearElemento("div", "owner-promo-periods");
    const registros = [];
    const agregar = U.boton(
      "Agregar horario",
      () => {
        agregarFila({ opens: "12:00", closes: "16:00" });
        U.estado.cambios = true;
      },
      "plus",
      "owner-button secondary",
    );
    const ayuda = U.crearElemento(
      "p",
      "owner-help",
      "Hora de Lima (GMT−5). Sin horarios específicos, se aplica todo el día dentro de la vigencia y los días elegidos.",
    );
    contenedor.append(lista, agregar, ayuda);

    // ==========================================
    // Actualizar índices y controles al cambiar los horarios
    // ==========================================
    function actualizar() {
      lista.hidden = agregar.hidden = !limitar.checked;
      agregar.disabled = registros.length >= 5;
      for (const [indice, registro] of registros.entries()) {
        registro.inicio.name = "validTimeRanges." + indice + ".opens";
        registro.fin.name = "validTimeRanges." + indice + ".closes";
        registro.diaSiguiente.name =
          "validTimeRanges." + indice + ".closesNextDay";
        [registro.inicio, registro.fin, registro.diaSiguiente].forEach(
          (entrada) => {
            entrada.disabled = !limitar.checked;
          },
        );
      }
    }

    // ==========================================
    // Añadir los controles de un periodo horario
    // ==========================================
    function agregarFila(periodo) {
      if (registros.length >= 5) return;
      const fila = U.crearElemento("div", "owner-promo-period-row");
      const inicio = U.campo(fila, "", "Desde", periodo.opens, {
        tipo: "time",
        required: true,
        step: 60,
      });
      const fin = U.campo(fila, "", "Hasta", periodo.closes, {
        tipo: "time",
        required: true,
        step: 60,
      });
      const diaSiguiente = U.casilla(
        fila,
        "",
        "Termina al día siguiente",
        periodo.closesNextDay,
      );
      const registro = { inicio, fin, diaSiguiente };
      const quitar = U.boton(
        "",
        () => {
          registros.splice(registros.indexOf(registro), 1);
          fila.remove();
          actualizar();
          U.estado.cambios = true;
        },
        "trash-2",
        "owner-icon owner-promo-remove",
      );
      quitar.setAttribute("aria-label", "Quitar horario");
      fila.append(quitar);
      lista.append(fila);
      registros.push(registro);
      actualizar();
    }

    // ==========================================
    // Validar los periodos antes de enviarlos al backend
    // ==========================================
    function leer() {
      if (!limitar.checked) return [];
      if (!registros.length)
        throw new Error(
          "Agrega al menos un horario o desactiva los horarios específicos.",
        );
      return registros.map((registro) => {
        if (
          !registro.diaSiguiente.checked &&
          registro.inicio.value >= registro.fin.value
        ) {
          U.errorCampo(
            registro.fin,
            "El cierre debe ser posterior al inicio. Si cruza medianoche, marca el día siguiente.",
          );
          throw new Error("Revisa el horario de la promoción.");
        }
        return {
          opens: registro.inicio.value,
          closes: registro.fin.value,
          closesNextDay: registro.diaSiguiente.checked,
        };
      });
    }

    iniciales.forEach(agregarFila);
    limitar.addEventListener("change", () => {
      if (limitar.checked && !registros.length)
        agregarFila({ opens: "12:00", closes: "16:00" });
      actualizar();
    });
    actualizar();
    return { leer };
  }

  // ==========================================
  // Crear o editar la promoción con todos sus campos operativos
  // ==========================================
  function editar(contenedor, contexto, promocion = {}, seleccion = {}) {
    if (!U.permitirSalida()) return;
    // ==========================================
    // Volver al listado después de comprobar cambios pendientes
    // ==========================================
    const volver = () => {
      if (U.permitirSalida()) mostrar(contenedor, contexto, seleccion);
    };
    contenedor.replaceChildren(
      U.boton(
        "Volver a promociones",
        volver,
        "arrow-left",
        "owner-button owner-promo-return",
      ),
      U.cabecera(
        promocion._id ? "Editar promoción" : "Crear promoción",
        "Prepara una experiencia para tus comensales. Los campos con * son obligatorios.",
        [U.enlacePublico(contexto)],
      ),
    );
    const formulario = U.formulario("owner-columns owner-promo-form");
    const principal = U.crearElemento("div", "owner-stack");
    const lateral = U.crearElemento("div", "owner-stack");
    const informacion = U.tarjeta("Información de la promoción");
    const titulo = U.campo(informacion, "title", "Título", promocion.title, {
      required: true,
      maxLength: 150,
    });
    const descripcion = U.campo(
      informacion,
      "description",
      "Descripción",
      promocion.description,
      { tipo: "textarea", maxLength: 1500, rows: 3 },
    );
    let platos;
    const locales = crearSelectorLocales(informacion, contexto, promocion, () =>
      platos?.actualizar(),
    );
    principal.append(informacion);
    platos = crearPlatosIncluidos(
      principal,
      contexto,
      promocion.items || [],
      locales.seleccionados,
    );
    const vigencia = U.tarjeta("Vigencia");
    const fechas = U.crearElemento("div", "owner-promo-dates");
    const inicio = separarFecha(promocion.startsAt || new Date());
    const fin = separarFecha(
      promocion.endsAt || new Date(Date.now() + 30 * 86400000),
    );
    const fechaInicio = U.campo(
      fechas,
      "startDate",
      "Fecha de inicio",
      inicio.fecha,
      { tipo: "date", required: true },
    );
    const horaInicio = U.campo(
      fechas,
      "startTime",
      "Hora de inicio",
      promocion.startsAt ? inicio.hora : "00:00",
      { tipo: "time", required: true, step: 60 },
    );
    const fechaFin = U.campo(fechas, "endDate", "Fecha de fin", fin.fecha, {
      tipo: "date",
      required: true,
    });
    const horaFin = U.campo(
      fechas,
      "endTime",
      "Hora de fin",
      promocion.endsAt ? fin.hora : "23:59",
      { tipo: "time", required: true, step: 60 },
    );
    vigencia.append(fechas);
    const semana = crearGrupo("Días de la semana *", "semana");
    const opcionesDias = U.crearElemento("div", "owner-promo-weekdays");
    const casillasDias = dias.map((dia, indice) =>
      U.casilla(
        opcionesDias,
        "validDays",
        dia,
        promocion.validDays ? promocion.validDays.includes(indice + 1) : true,
      ),
    );
    semana.prepend(opcionesDias);
    semana.prepend(semana.querySelector("legend"));
    vigencia.append(semana);
    const horarios = crearHorarios(
      vigencia,
      promocion._id
        ? promocion.validTimeRanges || []
        : [{ opens: "12:00", closes: "16:00", closesNextDay: false }],
    );
    const condiciones = U.tarjeta("Condiciones");
    const terminos = U.campo(
      condiciones,
      "terms",
      "Términos de la promoción",
      promocion.terms,
      { tipo: "textarea", rows: 3, maxLength: 2000 },
    );
    principal.append(vigencia, condiciones);
    const fotografia = U.tarjeta("Fotografía", "owner-promo-photo");
    const foto = MesaAdminRestaurante.selectorImagen(
      fotografia,
      contexto,
      "photoId",
      "Imagen de la promoción",
      promocion.photoId,
    );
    const experiencia = U.tarjeta("Precio de la experiencia");
    const importes = U.crearElemento("div", "owner-form-grid");
    const precio = U.campo(
      importes,
      "priceCents",
      "Precio (S/)",
      promocion.priceCents === undefined
        ? ""
        : (promocion.priceCents / 100).toFixed(2),
      { tipo: "number", required: true, min: 0, max: 1000000, step: "0.01" },
    );
    const unidad = U.campo(
      importes,
      "pricingUnit",
      "Unidad",
      promocion.pricingUnit || "PERSON",
      {
        required: true,
        opciones: [
          ["PERSON", "Por persona"],
          ["COUPLE", "Por pareja"],
          ["PACKAGE", "Por paquete"],
        ],
      },
    );
    const personas = U.campo(
      importes,
      "peopleCount",
      "Número de personas",
      promocion.peopleCount || 1,
      { tipo: "number", required: true, min: 1, max: 100, step: 1 },
    );
    const moneda = U.campo(importes, "currency", "Moneda", "PEN", {
      opciones: [["PEN", "Soles (PEN)"]],
    });
    moneda.disabled = true;
    experiencia.append(importes);
    const publicacion = U.tarjeta("Publicación");
    const estado = U.campo(
      publicacion,
      "status",
      "Estado",
      promocion.status || "DRAFT",
      { required: true, opciones: Object.entries(estados) },
    );
    const destacar = U.casilla(
      publicacion,
      "featured",
      "Promoción destacada",
      promocion.featured,
      "owner-switch",
    );
    publicacion.append(
      U.crearElemento(
        "p",
        "owner-help",
        "Se mostrará con mayor visibilidad en tu restaurante.",
      ),
    );
    if (promocion._id && promocion.status !== "ARCHIVED")
      publicacion.append(
        U.boton(
          "Archivar promoción",
          () => contexto.archivar("/promotions", promocion),
          "archive",
          "owner-button danger",
        ),
      );
    lateral.append(fotografia, experiencia, publicacion);
    formulario.append(principal, lateral);
    U.accionesFormulario(formulario, volver, "Guardar promoción");

    // ==========================================
    // Mantener la cantidad de personas coherente con la unidad de precio
    // ==========================================
    function actualizarPersonas() {
      personas.readOnly = unidad.value !== "PACKAGE";
      if (unidad.value === "PERSON") personas.value = 1;
      if (unidad.value === "COUPLE") personas.value = 2;
    }

    // ==========================================
    // Construir un cuerpo compatible con el contrato de promociones
    // ==========================================
    function construirCuerpo() {
      const elegidos = locales.seleccionados();
      if (!elegidos.length)
        invalidarGrupo(
          locales.grupo,
          "Selecciona al menos un local para la promoción.",
        );
      if (elegidos.some((local) => local.status !== "ACTIVE"))
        invalidarGrupo(
          locales.grupo,
          "Retira los locales inactivos o reactívalos desde Locales antes de guardar.",
        );
      const validDays = casillasDias.flatMap((entrada, indice) =>
        entrada.checked ? [indice + 1] : [],
      );
      if (!validDays.length)
        invalidarGrupo(semana, "Selecciona al menos un día de la semana.");
      const startsAt = construirInstante(
        fechaInicio.value,
        horaInicio.value,
        promocion.startsAt,
      );
      const endsAt = construirInstante(
        fechaFin.value,
        horaFin.value,
        promocion.endsAt,
      );
      if (!(new Date(endsAt) > new Date(startsAt))) {
        U.errorCampo(
          fechaFin,
          "El fin debe ser posterior al inicio de la promoción.",
        );
        U.errorCampo(horaFin, "Revisa la fecha y hora de fin.");
        throw new Error(
          "La fecha y hora de fin deben ser posteriores al inicio.",
        );
      }
      return {
        title: titulo.value.trim(),
        description: descripcion.value.trim() || null,
        branchIds: elegidos.map((local) => local._id),
        items: platos.leer(),
        photoId: foto.value || null,
        priceCents: Math.round(Number(precio.value) * 100),
        pricingUnit: unidad.value,
        peopleCount: Number(personas.value),
        currency: "PEN",
        startsAt,
        endsAt,
        timezone: "America/Lima",
        validDays,
        validTimeRanges: horarios.leer(),
        terms: terminos.value.trim() || null,
        featured: destacar.checked,
        status: estado.value,
      };
    }

    unidad.addEventListener("change", actualizarPersonas);
    actualizarPersonas();
    formulario.addEventListener("submit", (evento) => {
      evento.preventDefault();
      U.guardar(
        formulario,
        construirCuerpo,
        (cuerpo) =>
          contexto.peticion(
            "/promotions" +
              (promocion._id ? "/" + encodeURIComponent(promocion._id) : ""),
            { method: promocion._id ? "PATCH" : "POST", body: cuerpo },
          ),
        async () => {
          await contexto.actualizar();
          U.confirmarExito(
            promocion._id
              ? "La promoción se actualizó correctamente."
              : "La promoción se creó correctamente.",
          );
        },
      );
    });
    contenedor.append(formulario);
    U.animar(contenedor);
    titulo.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  window.MesaAdminPromociones = { mostrar, editar };
})();
