// ==========================================
// Locales del restaurante: listado, panel de edición, horarios y servicios
// ==========================================
(() => {
  "use strict";
  const U = MesaAdminUI;
  const DIAS_SEMANA = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];
  const MAXIMO_TURNOS = 5;
  const TURNO_PREDETERMINADO = { opens: "13:00", closes: "23:00", closesNextDay: false };
  const REGEX_TELEFONO = /^\+[1-9]\d{6,14}$/;
  const DISTRITOS_LIMA = [
    "Ancón", "Ate", "Barranco", "Breña", "Carabayllo", "Chaclacayo", "Chorrillos",
    "Cieneguilla", "Comas", "El Agustino", "Independencia", "Jesús María", "La Molina",
    "La Victoria", "Lima", "Lince", "Los Olivos", "Lurigancho-Chosica", "Lurín",
    "Magdalena del Mar", "Miraflores", "Pachacámac", "Pucusana", "Pueblo Libre",
    "Puente Piedra", "Punta Hermosa", "Punta Negra", "Rímac", "San Bartolo", "San Borja",
    "San Isidro", "San Juan de Lurigancho", "San Juan de Miraflores", "San Luis",
    "San Martín de Porres", "San Miguel", "Santa Anita", "Santa María del Mar",
    "Santa Rosa", "Santiago de Surco", "Surquillo", "Villa El Salvador",
    "Villa María del Triunfo",
  ];

  // ==========================================
  // Volver a dibujar los iconos Lucide presentes en el DOM tras renderizar
  // ==========================================
  function refrescarIconos() {
    window.lucide?.createIcons({
      attrs: { "aria-hidden": "true", focusable: "false", "stroke-width": 1.8 },
    });
  }

  // ==========================================
  // Crear un icono Lucide a partir de su nombre (parámetro: nombre del icono)
  // ==========================================
  function crearIcono(nombre) {
    return MesaIcons.icon(nombre);
  }

  // ==========================================
  // Cerrar todos los menús de acciones abiertos (parámetro: menú a conservar abierto)
  // ==========================================
  function cerrarMenusAbiertos(excepto = null) {
    for (const menu of document.querySelectorAll(".owner-local-menu")) {
      if (menu === excepto) continue;
      menu.querySelector("[aria-expanded]")?.setAttribute("aria-expanded", "false");
      menu.querySelector(".owner-local-menu-list")?.setAttribute("hidden", "");
    }
  }

  // ==========================================
  // Colocar un icono dentro de un campo de texto (parámetros: entrada y nombre del icono)
  // ==========================================
  function envolverConIcono(entrada, nombreIcono) {
    const envoltura = U.crearElemento("div", "owner-input-icon");
    entrada.replaceWith(envoltura);
    envoltura.append(crearIcono(nombreIcono), entrada);
  }

  // ==========================================
  // Quitar espacios y signos de un teléfono para enviarlo en formato internacional
  // ==========================================
  function leerTelefono(entrada) {
    const valor = entrada.value.replace(/[\s\-()]/g, "");
    if (!valor) return null;
    if (!REGEX_TELEFONO.test(valor)) {
      irAPestanaDelCampo(entrada);
      U.errorCampo(entrada, "Usa formato internacional, por ejemplo +51987654321.");
      throw new Error("Revisa los teléfonos del local.");
    }
    return valor;
  }

  // ==========================================
  // Construir la dirección de Google Maps a partir de coordenadas
  // ==========================================
  function construirUrlMapa(latitud, longitud) {
    return "https://www.google.com/maps?q=" + latitud + "," + longitud;
  }

  // ==========================================
  // Convertir un texto numérico en coordenada válida o null (parámetros: texto y límite absoluto)
  // ==========================================
  function leerCoordenada(texto, limite) {
    if (String(texto).trim() === "") return null;
    const numero = Number(texto);
    return Number.isFinite(numero) && Math.abs(numero) <= limite ? numero : null;
  }

  // ==========================================
  // Mostrar la pestaña del formulario que contiene un campo (parámetro: campo)
  // ==========================================
  function irAPestanaDelCampo(entrada) {
    const panelPestana = entrada.closest("[role='tabpanel']");
    const raiz = entrada.closest(".owner-locales-panel");
    if (panelPestana && raiz) cambiarPestanaFormulario(raiz, panelPestana.dataset.pestana);
  }

  // ==========================================
  // Activar una pestaña del panel y ocultar la otra (parámetros: panel raíz y nombre de pestaña)
  // ==========================================
  function cambiarPestanaFormulario(raiz, nombre) {
    for (const pestana of raiz.querySelectorAll("[role='tab']")) {
      const activa = pestana.dataset.pestana === nombre;
      pestana.setAttribute("aria-selected", String(activa));
      pestana.tabIndex = activa ? 0 : -1;
    }
    for (const panelPestana of raiz.querySelectorAll("[role='tabpanel']"))
      panelPestana.hidden = panelPestana.dataset.pestana !== nombre;
  }

  // ==========================================
  // Crear la barra de pestañas del panel (parámetro: panel raíz)
  // ==========================================
  function crearBarraPestanas(raiz) {
    const barra = U.crearElemento("div", "owner-form-tabs");
    barra.setAttribute("role", "tablist");
    barra.setAttribute("aria-label", "Secciones del local");
    const definiciones = [
      ["datos", "Datos y ubicación"],
      ["horarios", "Horarios y servicios"],
    ];
    for (const [nombre, titulo] of definiciones) {
      const pestana = U.crearElemento("button", "owner-form-tab", titulo);
      pestana.type = "button";
      pestana.id = "owner-local-tab-" + nombre;
      pestana.dataset.pestana = nombre;
      pestana.setAttribute("role", "tab");
      pestana.setAttribute("aria-controls", "owner-local-panel-" + nombre);
      pestana.addEventListener("click", () => cambiarPestanaFormulario(raiz, nombre));
      pestana.addEventListener("keydown", (evento) => {
        if (!["ArrowLeft", "ArrowRight"].includes(evento.key)) return;
        const otra = definiciones.find(([codigo]) => codigo !== nombre)[0];
        cambiarPestanaFormulario(raiz, otra);
        raiz.querySelector("#owner-local-tab-" + otra).focus();
      });
      barra.append(pestana);
    }
    return barra;
  }

  // ==========================================
  // Crear el contenedor de una pestaña (parámetro: nombre de la pestaña)
  // ==========================================
  function crearPanelPestana(nombre) {
    const panelPestana = U.crearElemento("div", "owner-locales-tabpanel");
    panelPestana.id = "owner-local-panel-" + nombre;
    panelPestana.dataset.pestana = nombre;
    panelPestana.setAttribute("role", "tabpanel");
    panelPestana.setAttribute("aria-labelledby", "owner-local-tab-" + nombre);
    return panelPestana;
  }

  // ==========================================
  // Crear una sección con título dentro de una pestaña (parámetros: contenedor y título)
  // ==========================================
  function crearSeccion(contenedor, titulo) {
    const seccion = U.crearElemento("section", "owner-locales-section");
    seccion.append(U.crearElemento("h3", "", titulo));
    const rejilla = U.crearElemento("div", "owner-locales-grid");
    seccion.append(rejilla);
    contenedor.append(seccion);
    return rejilla;
  }

  // ==========================================
  // Crear un campo con ancho de rejilla (parámetros: rejilla, nombre, etiqueta, valor, columnas y opciones)
  // ==========================================
  function crearCampoLocal(rejilla, nombre, etiqueta, valor, columnas, opciones = {}) {
    return U.campo(rejilla, nombre, etiqueta, valor, {
      ...opciones,
      clase: "owner-span-" + columnas,
    });
  }

  // ==========================================
  // Obtener el horario de un día de la semana desde un local (parámetros: local y día 1-7)
  // ==========================================
  function obtenerHorarioDia(local, dia) {
    const existente = local.openingHours?.find((horario) => horario.dayOfWeek === dia);
    if (existente) return existente;
    return { dayOfWeek: dia, closed: false, periods: [{ ...TURNO_PREDETERMINADO }] };
  }

  // ==========================================
  // Dibujar el mapa de Google o un aviso si faltan coordenadas (parámetros: contenedor, latitud, longitud)
  // ==========================================
  function actualizarMapa(contenedor, latitud, longitud) {
    contenedor.replaceChildren();
    if (latitud === null || longitud === null) {
      contenedor.classList.add("is-empty");
      contenedor.append(
        crearIcono("map-pin"),
        U.crearElemento("p", "", "Ingresa latitud y longitud para ver el mapa."),
      );
      refrescarIconos();
      return;
    }
    contenedor.classList.remove("is-empty");
    const marco = U.crearElemento("iframe");
    marco.title = "Mapa con la ubicación del local";
    marco.loading = "lazy";
    marco.referrerPolicy = "no-referrer-when-downgrade";
    marco.src = construirUrlMapa(latitud, longitud) + "&z=17&output=embed";
    contenedor.append(marco);
  }

  // ==========================================
  // Construir los campos de la pestaña "Datos y ubicación" (parámetros: contenedor, local y objeto de campos)
  // ==========================================
  function construirPestanaDatos(contenedor, local, campos) {
    const direccion = local.address || {};
    const contacto = local.contact || {};
    const coordenadas = local.location?.coordinates || [];
    const opcionesEstado = [
      ["ACTIVE", U.traducir("ACTIVE")],
      ["INACTIVE", U.traducir("INACTIVE")],
    ];
    if (local.status === "ARCHIVED")
      opcionesEstado.push(["ARCHIVED", U.traducir("ARCHIVED")]);
    const distritos = DISTRITOS_LIMA.includes(direccion.district) || !direccion.district
      ? DISTRITOS_LIMA
      : [direccion.district, ...DISTRITOS_LIMA];

    const generales = crearSeccion(contenedor, "Datos generales");
    campos.nombre = crearCampoLocal(generales, "name", "Nombre del local", local.name, 4, {
      required: true,
      maxLength: 120,
    });
    campos.estado = crearCampoLocal(generales, "status", "Estado", local.status || "ACTIVE", 2, {
      required: true,
      opciones: opcionesEstado,
    });
    campos.calle = crearCampoLocal(generales, "address.street", "Dirección", direccion.street, 6, {
      required: true,
      maxLength: 250,
    });
    campos.referencia = crearCampoLocal(
      generales,
      "address.reference",
      "Referencia",
      direccion.reference,
      6,
      { maxLength: 300 },
    );
    campos.distrito = crearCampoLocal(
      generales,
      "address.district",
      "Distrito",
      direccion.district || "Miraflores",
      2,
      { required: true, opciones: distritos.map((distrito) => [distrito, distrito]) },
    );
    campos.provincia = crearCampoLocal(generales, "address.province", "Provincia", "Lima", 2, {
      required: true,
      opciones: [["Lima", "Lima"]],
    });
    campos.departamento = crearCampoLocal(
      generales,
      "address.department",
      "Departamento",
      "Lima",
      2,
      { required: true, opciones: [["Lima", "Lima"]] },
    );
    campos.pais = crearCampoLocal(generales, "address.countryCode", "País", "PE", 3, {
      required: true,
      opciones: [["PE", "Perú"]],
    });
    campos.ubigeo = crearCampoLocal(
      generales,
      "address.ubigeo",
      "Código ubigeo",
      direccion.ubigeo,
      3,
      { required: true, pattern: "\\d{6}", maxLength: 6 },
    );
    campos.ubigeo.inputMode = "numeric";

    const seccionContacto = crearSeccion(contenedor, "Contacto");
    campos.telefono = crearCampoLocal(seccionContacto, "contact.phone", "Teléfono", contacto.phone, 2, {
      tipo: "tel",
    });
    campos.whatsapp = crearCampoLocal(
      seccionContacto,
      "contact.whatsapp",
      "WhatsApp",
      contacto.whatsapp,
      2,
      { tipo: "tel" },
    );
    campos.correo = crearCampoLocal(
      seccionContacto,
      "contact.email",
      "Correo electrónico",
      contacto.email,
      2,
      { tipo: "email" },
    );
    envolverConIcono(campos.telefono, "phone");
    envolverConIcono(campos.whatsapp, "message-circle");
    envolverConIcono(campos.correo, "mail");

    const ubicacion = crearSeccion(contenedor, "Ubicación");
    ubicacion.classList.add("owner-locales-location");
    const mapa = U.crearElemento("div", "owner-locales-map");
    const columna = U.crearElemento("div", "owner-locales-coordinates");
    ubicacion.append(mapa, columna);
    campos.latitud = U.campo(columna, "location.coordinates.1", "Latitud", coordenadas[1] ?? "", {
      tipo: "number",
      required: true,
      min: -90,
      max: 90,
      step: "any",
      clase: "owner-span-half",
    });
    campos.longitud = U.campo(
      columna,
      "location.coordinates.0",
      "Longitud",
      coordenadas[0] ?? "",
      { tipo: "number", required: true, min: -180, max: 180, step: "any", clase: "owner-span-half" },
    );
    campos.urlMapa = U.campo(
      columna,
      "googleMaps.mapsUrl",
      "URL de Google Maps",
      local.googleMaps?.mapsUrl || "",
      { tipo: "url", required: true, clase: "owner-span-full" },
    );
    campos.placeId = U.campo(
      columna,
      "googleMaps.placeId",
      "Place ID (opcional)",
      local.googleMaps?.placeId || "",
      { maxLength: 200, clase: "owner-span-full" },
    );

    // Actualiza el mapa y la URL automática cuando cambian las coordenadas
    let ultimaUrlAutomatica = coordenadas.length
      ? construirUrlMapa(coordenadas[1], coordenadas[0])
      : "";
    function sincronizarCoordenadas() {
      const latitud = leerCoordenada(campos.latitud.value, 90);
      const longitud = leerCoordenada(campos.longitud.value, 180);
      actualizarMapa(mapa, latitud, longitud);
      if (latitud === null || longitud === null) return;
      const urlNueva = construirUrlMapa(latitud, longitud);
      const sinPersonalizar =
        !campos.urlMapa.value.trim() || campos.urlMapa.value === ultimaUrlAutomatica;
      if (sinPersonalizar) campos.urlMapa.value = urlNueva;
      ultimaUrlAutomatica = urlNueva;
    }
    campos.latitud.addEventListener("change", sincronizarCoordenadas);
    campos.longitud.addEventListener("change", sincronizarCoordenadas);
    actualizarMapa(
      mapa,
      leerCoordenada(coordenadas[1] ?? "", 90),
      leerCoordenada(coordenadas[0] ?? "", 180),
    );
  }

  // ==========================================
  // Crear una fila editable de turno dentro de un día (parámetros: día, turno y funciones de control)
  // ==========================================
  function crearFilaTurno(nombreDia, turno, alQuitar, deshabilitado) {
    const fila = U.crearElemento("div", "owner-turno");
    const apertura = U.crearElemento("input");
    const cierre = U.crearElemento("input");
    for (const [entrada, texto, valor] of [
      [apertura, "Apertura", turno.opens],
      [cierre, "Cierre", turno.closes],
    ]) {
      entrada.type = "time";
      entrada.required = true;
      entrada.value = valor;
      entrada.disabled = deshabilitado;
      entrada.setAttribute("aria-label", texto + " del " + nombreDia.toLowerCase());
    }
    apertura.dataset.campo = "opens";
    cierre.dataset.campo = "closes";
    const siguiente = U.crearElemento("label", "owner-turno-next");
    const casilla = U.crearElemento("input");
    casilla.type = "checkbox";
    casilla.dataset.campo = "closesNextDay";
    casilla.checked = Boolean(turno.closesNextDay);
    casilla.disabled = deshabilitado;
    siguiente.append(casilla, U.crearElemento("span", "", "Cierra al día siguiente"));
    const quitar = U.boton("", alQuitar, "x", "owner-icon owner-turno-remove");
    quitar.setAttribute("aria-label", "Quitar turno del " + nombreDia.toLowerCase());
    fila.append(apertura, U.crearElemento("span", "", "a"), cierre, siguiente, quitar);
    return fila;
  }

  // ==========================================
  // Construir la fila de un día con su interruptor y turnos (parámetros: índice del día y su horario)
  // ==========================================
  function crearFilaDia(indice, horario) {
    const nombreDia = DIAS_SEMANA[indice];
    const fila = U.crearElemento("div", "owner-dia");
    fila.dataset.dia = String(indice + 1);
    const cabecera = U.crearElemento("div", "owner-dia-header");
    const turnos = U.crearElemento("div", "owner-turnos");
    const agregar = U.boton("Agregar turno", null, "plus", "owner-button secondary owner-turno-add");
    cabecera.append(U.crearElemento("strong", "", nombreDia), agregar);
    const interruptor = U.casilla(
      cabecera,
      "abierto-" + (indice + 1),
      horario.closed ? "Cerrado" : "Abierto",
      !horario.closed,
      "owner-switch owner-dia-switch",
    );
    interruptor.setAttribute("aria-label", nombreDia + ": abierto");

    // Habilita o deshabilita los turnos según el interruptor y el máximo permitido
    function actualizarDia() {
      const abierto = interruptor.checked;
      cabecera.querySelector(".owner-check span").textContent = abierto ? "Abierto" : "Cerrado";
      turnos.hidden = !abierto;
      agregar.hidden = !abierto;
      for (const entrada of turnos.querySelectorAll("input")) entrada.disabled = !abierto;
      agregar.disabled = turnos.children.length >= MAXIMO_TURNOS;
      for (const quitar of turnos.querySelectorAll(".owner-turno-remove"))
        quitar.hidden = turnos.children.length <= 1;
    }

    // Añade un turno nuevo (o uno existente) al día
    function agregarTurno(turno = TURNO_PREDETERMINADO) {
      const filaTurno = crearFilaTurno(
        nombreDia,
        turno,
        () => {
          filaTurno.remove();
          actualizarDia();
        },
        !interruptor.checked,
      );
      turnos.append(filaTurno);
      refrescarIconos();
      actualizarDia();
    }

    for (const turno of horario.periods.length ? horario.periods : [TURNO_PREDETERMINADO])
      agregarTurno(turno);
    agregar.addEventListener("click", () => agregarTurno());
    interruptor.addEventListener("change", actualizarDia);
    actualizarDia();
    fila.append(cabecera, turnos);
    return fila;
  }

  // ==========================================
  // Construir la pestaña "Horarios y servicios" (parámetros: contenedor, local, contexto y objeto de campos)
  // ==========================================
  function construirPestanaHorarios(contenedor, local, contexto, campos) {
    const seccionHorario = crearSeccion(contenedor, "Horario semanal");
    seccionHorario.classList.remove("owner-locales-grid");
    seccionHorario.classList.add("owner-dias");
    for (let indice = 0; indice < DIAS_SEMANA.length; indice++)
      seccionHorario.append(crearFilaDia(indice, obtenerHorarioDia(local, indice + 1)));

    const seccionServicios = crearSeccion(contenedor, "Servicios");
    seccionServicios.classList.remove("owner-locales-grid");
    const grupo = U.crearElemento("div", "owner-food-types owner-servicios");
    campos.servicios = [];
    for (const codigo of contexto.metadata.services) {
      const entrada = U.casilla(
        grupo,
        "services",
        U.traducir(codigo),
        Boolean(local.services?.includes(codigo)),
        "owner-service-chip",
      );
      entrada.value = codigo;
      campos.servicios.push(entrada);
    }
    seccionServicios.append(grupo);

    const seccionPrecio = crearSeccion(contenedor, "Capacidad y precio");
    campos.precio = crearCampoLocal(
      seccionPrecio,
      "averagePricePerPersonCents",
      "Precio aproximado por persona (S/)",
      local.averagePricePerPersonCents === undefined
        ? ""
        : (local.averagePricePerPersonCents / 100).toFixed(2),
      3,
      { tipo: "number", required: true, min: 0, step: "0.01" },
    );
    campos.aforo = crearCampoLocal(seccionPrecio, "capacity", "Aforo", local.capacity ?? "", 3, {
      tipo: "number",
      min: 1,
      max: 10000,
      step: 1,
    });
  }

  // ==========================================
  // Leer los turnos de cada día del formulario (parámetro: panel de horarios)
  // ==========================================
  function leerHorarioSemanal(panelHorarios) {
    return [...panelHorarios.querySelectorAll(".owner-dia")].map((fila) => {
      const dia = Number(fila.dataset.dia);
      const abierto = fila.querySelector(".owner-dia-header input").checked;
      if (!abierto) return { dayOfWeek: dia, closed: true, periods: [] };
      const periodos = [...fila.querySelectorAll(".owner-turno")].map((turno) => {
        const apertura = turno.querySelector("[data-campo='opens']");
        const cierre = turno.querySelector("[data-campo='closes']");
        const siguienteDia = turno.querySelector("[data-campo='closesNextDay']").checked;
        if (!siguienteDia && apertura.value >= cierre.value) {
          irAPestanaDelCampo(cierre);
          U.errorCampo(cierre, "El cierre debe ser posterior a la apertura.");
          throw new Error("Revisa el horario de " + DIAS_SEMANA[dia - 1] + ".");
        }
        return { opens: apertura.value, closes: cierre.value, closesNextDay: siguienteDia };
      });
      return { dayOfWeek: dia, closed: false, periods: periodos };
    });
  }

  // ==========================================
  // Armar el cuerpo que recibe la API (parámetros: campos del formulario y panel de horarios)
  // ==========================================
  function construirCuerpoLocal(campos, panelHorarios) {
    const latitud = leerCoordenada(campos.latitud.value, 90);
    const longitud = leerCoordenada(campos.longitud.value, 180);
    const urlMapa = MesaUI.safeUrl(campos.urlMapa.value.trim());
    if (!urlMapa) {
      irAPestanaDelCampo(campos.urlMapa);
      U.errorCampo(campos.urlMapa, "Usa una URL HTTP o HTTPS.");
      throw new Error("Revisa el enlace de Google Maps.");
    }
    return {
      name: campos.nombre.value.trim(),
      status: campos.estado.value,
      address: {
        street: campos.calle.value.trim(),
        reference: campos.referencia.value.trim() || null,
        district: campos.distrito.value,
        province: campos.provincia.value,
        department: campos.departamento.value,
        countryCode: campos.pais.value,
        ubigeo: campos.ubigeo.value.trim(),
      },
      contact: {
        phone: leerTelefono(campos.telefono),
        whatsapp: leerTelefono(campos.whatsapp),
        email: campos.correo.value.trim() || null,
      },
      location: { type: "Point", coordinates: [longitud, latitud] },
      googleMaps: { placeId: campos.placeId.value.trim() || null, mapsUrl: urlMapa },
      services: campos.servicios.filter((entrada) => entrada.checked).map((entrada) => entrada.value),
      averagePricePerPersonCents: Math.round(Number(campos.precio.value) * 100),
      capacity: campos.aforo.value ? Number(campos.aforo.value) : null,
      openingHours: leerHorarioSemanal(panelHorarios),
    };
  }

  // ==========================================
  // Mostrar la vista de locales (parámetros: contenedor de pantalla y contexto del restaurante)
  // ==========================================
  function mostrar(contenedor, contexto) {
    const locales = contexto.locales.filter((local) => local.status !== "ARCHIVED");
    const seleccion = { idLocal: null };
    const disposicion = U.crearElemento("div", "owner-locales-layout");
    const columna = U.crearElemento("div", "owner-locales-list-column");
    const lista = U.crearElemento("div", "owner-locales-list");
    const panel = U.crearElemento("aside", "owner-locales-panel");
    panel.hidden = true;
    columna.append(U.boton("Agregar local", () => abrirPanelEditarLocal(), "plus"), lista);
    disposicion.append(columna, panel);
    contenedor.replaceChildren(
      U.cabecera("Locales", "Gestiona tus sedes y sus datos de atención", [
        U.enlacePublico(contexto),
      ]),
      disposicion,
    );
    renderizarListaLocales();

    // ==========================================
    // Dibujar las tarjetas de los locales o el estado vacío
    // ==========================================
    function renderizarListaLocales() {
      if (!locales.length) {
        U.mensaje(
          lista,
          "Aún no tienes locales",
          "Agrega tu primera sede para mostrar su dirección, horarios y servicios.",
        );
        return;
      }
      lista.replaceChildren(...locales.map(crearTarjetaLocal));
      refrescarIconos();
    }

    // ==========================================
    // Resaltar en la lista el local que se está editando
    // ==========================================
    function marcarLocalSeleccionado() {
      for (const tarjeta of lista.querySelectorAll(".owner-local-card"))
        tarjeta.classList.toggle("is-selected", tarjeta.dataset.id === seleccion.idLocal);
    }

    // ==========================================
    // Buscar la mejor foto publicada de un local (parámetro: local)
    // ==========================================
    function obtenerFotoLocal(local) {
      const fotos = contexto.fotos
        .filter((foto) => foto.branchId === local._id && foto.status === "PUBLISHED")
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      return fotos[0] || contexto.restaurante?.thumbnailPhoto || null;
    }

    // ==========================================
    // Construir una insignia con icono (parámetros: texto, icono y variante visual)
    // ==========================================
    function crearInsignia(texto, icono, variante) {
      const insignia = U.crearElemento("span", "owner-badge has-icon " + variante);
      insignia.append(crearIcono(icono), U.crearElemento("span", "", texto));
      return insignia;
    }

    // ==========================================
    // Construir la tarjeta de un local (parámetro: local)
    // ==========================================
    function crearTarjetaLocal(local) {
      const esPrincipal = String(contexto.restaurante?.mainBranchId) === String(local._id);
      const foto = obtenerFotoLocal(local);
      const tarjeta = U.crearElemento("article", "owner-local-card");
      tarjeta.dataset.id = local._id;
      const imagen = U.crearImagen(foto?.url, foto?.altText || "Fachada de " + local.name);
      const insignias = U.crearElemento("div", "owner-local-badges");
      if (esPrincipal) insignias.append(crearInsignia("Principal", "star", "main"));
      insignias.append(
        local.status === "ACTIVE"
          ? crearInsignia(U.traducir("ACTIVE"), "check", "positive")
          : crearInsignia(U.traducir(local.status), "circle-off", "neutral"),
      );
      const editar = U.boton(
        "Editar local",
        () => abrirPanelEditarLocal(local),
        "pencil",
        "owner-button secondary owner-local-edit",
      );
      editar.setAttribute("aria-label", "Editar local " + local.name);
      const acciones = U.crearElemento("div", "owner-local-actions");
      acciones.append(editar, crearMenuLocal(local, esPrincipal));
      const fila = U.crearElemento("div", "owner-local-row");
      fila.append(insignias, acciones);
      const direccion = U.crearElemento("p", "owner-local-address");
      direccion.append(
        crearIcono("map-pin"),
        U.crearElemento("span", "", local.address?.street || "Sin dirección"),
      );
      const cuerpo = U.crearElemento("div", "owner-local-body");
      cuerpo.append(U.crearElemento("h3", "", local.name), fila, direccion);
      tarjeta.append(imagen, cuerpo);
      return tarjeta;
    }

    // ==========================================
    // Construir el menú de acciones de un local (parámetros: local y si es el principal)
    // ==========================================
    function crearMenuLocal(local, esPrincipal) {
      const menu = U.crearElemento("div", "owner-local-menu");
      const disparador = U.boton("", null, "ellipsis-vertical", "owner-icon");
      disparador.setAttribute("aria-label", "Más acciones de " + local.name);
      disparador.setAttribute("aria-haspopup", "true");
      disparador.setAttribute("aria-expanded", "false");
      const opciones = U.crearElemento("div", "owner-local-menu-list");
      opciones.hidden = true;
      if (local.status === "ACTIVE" && !esPrincipal)
        opciones.append(
          U.boton(
            "Establecer como principal",
            () => {
              cerrarMenusAbiertos();
              establecerComoPrincipal(local);
            },
            "star",
            "owner-local-menu-item",
          ),
        );
      opciones.append(
        U.boton(
          "Archivar local",
          () => {
            cerrarMenusAbiertos();
            contexto.archivar("/branches", local);
          },
          "archive",
          "owner-local-menu-item danger",
        ),
      );
      disparador.addEventListener("click", (evento) => {
        evento.stopPropagation();
        const abrir = disparador.getAttribute("aria-expanded") !== "true";
        cerrarMenusAbiertos(menu);
        disparador.setAttribute("aria-expanded", String(abrir));
        opciones.hidden = !abrir;
      });
      menu.append(disparador, opciones);
      return menu;
    }

    // ==========================================
    // Definir un local como principal del restaurante (parámetro: local activo)
    // ==========================================
    async function establecerComoPrincipal(local) {
      if (U.estado.guardando || !U.permitirSalida()) return;
      U.estado.guardando = true;
      try {
        await contexto.peticion("", { method: "PATCH", body: { mainBranchId: local._id } });
        await contexto.actualizar();
        U.confirmarExito("«" + local.name + "» ahora es tu local principal.");
      } catch (error) {
        if (!contexto.vigente()) return;
        const contenido = MesaUI.modal("No se pudo cambiar el local principal", "owner-notice");
        contenido.append(U.crearElemento("p", "", error.message));
      } finally {
        U.estado.guardando = false;
      }
    }

    // ==========================================
    // Mostrar el panel lateral y cargar los datos del local (parámetro: local, vacío para crear uno nuevo)
    // ==========================================
    function abrirPanelEditarLocal(local = {}) {
      if (!U.permitirSalida()) return;
      seleccion.idLocal = local._id || null;
      marcarLocalSeleccionado();
      const campos = {};
      const formulario = U.formulario("owner-locales-form");
      const panelDatos = crearPanelPestana("datos");
      const panelHorarios = crearPanelPestana("horarios");
      construirPestanaDatos(panelDatos, local, campos);
      construirPestanaHorarios(panelHorarios, local, contexto, campos);
      formulario.append(panelDatos, panelHorarios);
      U.accionesFormulario(formulario, cerrarPanelLocal, "Guardar local");

      const tarjeta = U.tarjeta("", "owner-locales-card");
      const cabecera = U.crearElemento("header", "owner-locales-panel-header");
      const cerrar = U.boton("", cerrarPanelLocal, "x", "owner-icon owner-locales-close");
      cerrar.setAttribute("aria-label", "Cerrar panel de edición");
      cabecera.append(
        U.crearElemento("h2", "", local._id ? "Editar local" : "Agregar local"),
        cerrar,
      );
      tarjeta.append(cabecera, crearBarraPestanas(panel), formulario);
      panel.replaceChildren(tarjeta);
      cambiarPestanaFormulario(panel, "datos");
      alternarPanel(true);

      // Al fallar la validación nativa se muestra la pestaña que contiene el campo
      formulario.addEventListener(
        "invalid",
        (evento) => {
          const primero = [...formulario.elements].find(
            (entrada) => entrada.willValidate && !entrada.validity.valid,
          );
          if (evento.target === primero) irAPestanaDelCampo(primero);
        },
        true,
      );
      formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        U.guardar(
          formulario,
          () => construirCuerpoLocal(campos, panelHorarios),
          (cuerpo) =>
            contexto.peticion("/branches" + (local._id ? "/" + local._id : ""), {
              method: local._id ? "PATCH" : "POST",
              body: cuerpo,
            }),
          async () => {
            await contexto.actualizar();
            U.confirmarExito("El local se guardó correctamente.");
          },
        );
      });
      refrescarIconos();
      panel.scrollIntoView({ block: "nearest", behavior: "auto" });
      campos.nombre.focus({ preventScroll: true });
    }

    // ==========================================
    // Ocultar el panel lateral conservando la lista de locales
    // ==========================================
    function cerrarPanelLocal() {
      if (!U.permitirSalida()) return;
      seleccion.idLocal = null;
      marcarLocalSeleccionado();
      panel.replaceChildren();
      alternarPanel(false);
    }

    // ==========================================
    // Mostrar u ocultar el panel y ajustar la distribución (parámetro: true para mostrar)
    // ==========================================
    function alternarPanel(visible) {
      panel.hidden = !visible;
      disposicion.classList.toggle("has-panel", visible);
    }
  }

  // ==========================================
  // Registrar una sola vez el cierre de menús al hacer clic fuera o presionar Escape
  // ==========================================
  function registrarCierreDeMenus() {
    document.addEventListener("click", () => cerrarMenusAbiertos());
    document.addEventListener("keydown", (evento) => {
      if (evento.key === "Escape") cerrarMenusAbiertos();
    });
  }

  registrarCierreDeMenus();

  window.MesaAdminLocales = { mostrar };
})();
