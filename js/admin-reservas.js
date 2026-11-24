// ==========================================
// Reservas del propietario: listado del día, mesas y disponibilidad, y detalle de la reserva
// ==========================================
(() => {
  "use strict";
  const U = MesaAdminUI;
  const ZONA_HORARIA = "America/Lima";
  const RESERVAS_POR_PAGINA = 12;
  const PAUSA_BUSQUEDA_MS = 300;
  const CAPACIDAD_MINIMA = 1;
  const CAPACIDAD_MAXIMA = 100;
  const ESTADOS_RESERVA = {
    CONFIRMED: ["Confirmada", "is-confirmada", "circle-check"],
    CANCELLED: ["Cancelada", "is-cancelada", "circle-x"],
  };
  const PESTANAS = [
    ["", "Todas", "total"],
    ["CONFIRMED", "Confirmadas", "confirmed"],
    ["CANCELLED", "Canceladas", "cancelled"],
  ];
  const METODOS_PAGO = {
    YAPE: "Yape",
    PLIN: "Plin",
    CARD: "Tarjeta",
    BANK_TRANSFER: "Transferencia bancaria",
  };

  // ==========================================
  // Volver a dibujar los iconos Lucide presentes en el DOM tras renderizar
  // ==========================================
  function refrescarIconos() {
    window.lucide?.createIcons({
      attrs: { "aria-hidden": "true", focusable: "false", "stroke-width": 1.8 },
    });
  }

  // ==========================================
  // Obtener la fecha de hoy en Lima con formato AAAA-MM-DD
  // ==========================================
  function obtenerFechaHoyEnLima() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(new Date());
  }

  // ==========================================
  // Convertir AAAA-MM-DD en una fecha legible sin desfase horario (parámetro: fecha ISO)
  // ==========================================
  function formatearFechaVisita(fechaIso) {
    const [anio, mes, dia] = String(fechaIso || "").split("-").map(Number);
    if (!anio || !mes || !dia) return "Todas las fechas";
    return new Intl.DateTimeFormat("es-PE", {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(Date.UTC(anio, mes - 1, dia)));
  }

  // ==========================================
  // Dar formato de fecha y hora de Lima a un instante ISO (parámetro: fecha ISO)
  // ==========================================
  function formatearInstante(fechaIso) {
    const fecha = new Date(fechaIso);
    if (Number.isNaN(fecha.getTime())) return "—";
    return new Intl.DateTimeFormat("es-PE", {
      timeZone: ZONA_HORARIA,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(fecha);
  }

  // ==========================================
  // Obtener el nombre del comensal o un texto neutro si su cuenta ya no existe (parámetro: reserva)
  // ==========================================
  function obtenerNombreCliente(reserva) {
    const usuario = reserva.userId;
    if (!usuario || typeof usuario !== "object") return "Cliente";
    return [usuario.firstName, usuario.lastName].filter(Boolean).join(" ") || "Cliente";
  }

  // ==========================================
  // Crear la insignia de estado de una reserva (parámetro: código de estado)
  // ==========================================
  function crearInsigniaEstado(codigo) {
    const [texto, clase, icono] = ESTADOS_RESERVA[codigo] || [codigo, "", "circle"];
    const insignia = U.crearElemento("span", "owner-reserva-estado " + clase);
    insignia.append(MesaIcons.icon(icono), U.crearElemento("span", "", texto));
    return insignia;
  }

  // ==========================================
  // Crear un dato con valor y etiqueta pequeña (parámetros: valor, etiqueta y clase extra)
  // ==========================================
  function crearDato(valor, etiqueta, clase = "") {
    const dato = U.crearElemento("div", "owner-reserva-dato " + clase);
    dato.append(U.crearElemento("strong", "", valor), U.crearElemento("small", "", etiqueta));
    return dato;
  }

  // ==========================================
  // Construir la vista de Reservas dentro de la pantalla (parámetros: contenedor y contexto del restaurante)
  // ==========================================
  function mostrar(contenedor, contexto) {
    const locales = (contexto.locales || []).filter((local) => local.status === "ACTIVE");
    const raiz = U.crearElemento("div", "owner-reservas");
    contenedor.replaceChildren(
      U.cabecera("Reservas", "Consulta las reservas de tus comensales y la ocupación de tus mesas", [
        U.enlacePublico(contexto),
      ]),
      raiz,
    );
    if (!locales.length) {
      const vacio = U.crearElemento("div");
      U.mensaje(
        vacio,
        "Aún no tienes locales activos",
        "Crea o activa un local con mesas configuradas para recibir y gestionar reservas.",
      );
      raiz.append(vacio);
      refrescarIconos();
      return;
    }

    const principal = locales.find((local) => local._id === contexto.restaurante?.mainBranchId);
    const estado = {
      estadoReserva: "",
      codigo: "",
      fecha: obtenerFechaHoyEnLima(),
      localId: (principal || locales[0])._id,
      pagina: 1,
      reservas: [],
      meta: null,
      codigoDetalle: null,
      disponibilidad: null,
      turno: "",
      editandoMesas: false,
    };
    let operacionReservas = 0,
      operacionMesas = 0,
      temporizador,
      botonDetalle = null;

    const tarjetaFiltros = U.crearElemento("section", "owner-card owner-reservas-filtros");
    const tarjetaReservas = U.crearElemento("section", "owner-card owner-reservas-dia");
    const tarjetaMesas = U.crearElemento("section", "owner-card owner-reservas-mesas");
    const tarjetaDetalle = U.crearElemento("section", "owner-card owner-reserva-detalle");
    tarjetaDetalle.hidden = true;
    tarjetaDetalle.tabIndex = -1;
    tarjetaDetalle.setAttribute("aria-label", "Detalle de la reserva");
    const columnaPrincipal = U.crearElemento("div", "owner-reservas-columna");
    const columnaLateral = U.crearElemento("div", "owner-reservas-columna");
    columnaPrincipal.append(tarjetaReservas);
    columnaLateral.append(tarjetaDetalle, tarjetaMesas);
    const disposicion = U.crearElemento("div", "owner-reservas-layout");
    disposicion.append(columnaPrincipal, columnaLateral);
    raiz.append(tarjetaFiltros, disposicion);

    const contenedorPestanas = U.crearElemento("div", "owner-reservas-pestanas");
    contenedorPestanas.setAttribute("role", "tablist");
    contenedorPestanas.setAttribute("aria-label", "Estado de la reserva");
    // Los controles se ordenan igual para navegación visual y con teclado.
    const campoCodigo = U.campo(tarjetaFiltros, "codigo", "Código de reserva (todos los locales y fechas)", "", {
      tipo: "search",
      maxLength: 100,
    });
    campoCodigo.placeholder = "Ej. MS-A1B2C3";
    const campoFecha = U.campo(tarjetaFiltros, "fecha", "Fecha de visita", estado.fecha, {
      tipo: "date",
    });
    const campoLocal = U.campo(tarjetaFiltros, "local", "Local", estado.localId, {
      opciones: locales.map((local) => [local._id, local.name]),
    });
    const filtros = [campoLocal, campoFecha, campoCodigo];
    for (const [indice, icono] of ["map-pin", "calendar", "search"].entries()) {
      const campo = filtros[indice].closest(".owner-field");
      if (!campo) continue;
      const simbolo = MesaIcons.icon(icono);
      simbolo.classList.add("owner-filtro-icono");
      campo.append(simbolo);
      tarjetaFiltros.append(campo);
    }
    tarjetaFiltros.append(contenedorPestanas);
    campoCodigo.addEventListener("input", () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => filtrarReservasPorCodigo(campoCodigo.value), PAUSA_BUSQUEDA_MS);
    });
    campoFecha.addEventListener("change", () => cambiarFecha(campoFecha.value));
    campoLocal.addEventListener("change", () => cambiarLocal(campoLocal.value));

    renderizarPestanas(null);
    tarjetaReservas.append(U.crearElemento("p", "owner-muted", "Cargando reservas…"));
    tarjetaMesas.append(U.crearElemento("p", "owner-muted", "Cargando mesas…"));
    cargarReservas();
    cargarDisponibilidad();

    // ==========================================
    // Dibujar las pestañas Todas, Confirmadas y Canceladas con sus contadores (parámetro: contadores o null)
    // ==========================================
    function renderizarPestanas(contadores) {
      contenedorPestanas.replaceChildren(
        ...PESTANAS.map(([codigo, texto, clave]) => {
          const pestana = U.crearElemento("button", "owner-reservas-pestana");
          pestana.type = "button";
          pestana.setAttribute("role", "tab");
          pestana.setAttribute("aria-selected", String(estado.estadoReserva === codigo));
          pestana.append(
            U.crearElemento("span", "", texto),
            U.crearElemento("b", "", contadores ? String(contadores[clave] ?? 0) : "–"),
          );
          pestana.addEventListener("click", () => filtrarReservasPorEstado(codigo));
          return pestana;
        }),
      );
    }

    // ==========================================
    // Filtrar las reservas por su estado y volver a la primera página (parámetro: código de estado o vacío)
    // ==========================================
    function filtrarReservasPorEstado(codigoEstado) {
      if (estado.estadoReserva === codigoEstado) return;
      estado.estadoReserva = codigoEstado;
      estado.pagina = 1;
      cargarReservas();
    }

    // ==========================================
    // Filtrar las reservas por código de reserva en tiempo real (parámetro: texto escrito)
    // ==========================================
    function filtrarReservasPorCodigo(texto) {
      const codigo = texto.trim();
      if (codigo === estado.codigo) return;
      estado.codigo = codigo;
      estado.pagina = 1;
      cargarReservas();
    }

    // ==========================================
    // Aplicar una nueva fecha de visita a reservas y mesas (parámetro: fecha AAAA-MM-DD o vacío)
    // ==========================================
    function cambiarFecha(fecha) {
      estado.fecha = fecha;
      estado.pagina = 1;
      estado.turno = "";
      cargarReservas();
      cargarDisponibilidad();
    }

    // ==========================================
    // Cambiar de local y recargar reservas y mesas (parámetro: identificador del local)
    // ==========================================
    function cambiarLocal(localId) {
      estado.localId = localId;
      estado.editandoMesas = false;
      estado.pagina = 1;
      estado.turno = "";
      cargarReservas();
      cargarDisponibilidad();
    }

    // ==========================================
    // Consultar las reservas filtradas y sus contadores sin mezclar respuestas antiguas
    // ==========================================
    async function cargarReservas() {
      const actual = ++operacionReservas;
      tarjetaReservas.setAttribute("aria-busy", "true");
      try {
        const consulta = MesaAPI.query({
          page: estado.pagina,
          limit: RESERVAS_POR_PAGINA,
          date: estado.codigo ? undefined : estado.fecha,
          branchId: estado.codigo ? undefined : estado.localId,
          status: estado.estadoReserva,
          q: estado.codigo,
        });
        const respuesta = await contexto.peticion("/reservations" + consulta);
        if (actual !== operacionReservas || !contexto.vigente()) return;
        estado.reservas = respuesta.data;
        estado.meta = respuesta.meta;
        renderizarPestanas(respuesta.meta?.counts);
        renderizarReservasDelDia();
        if (
          estado.codigoDetalle &&
          !estado.reservas.some((reserva) => reserva.code === estado.codigoDetalle)
        )
          ocultarDetalleReserva();
      } catch (error) {
        if (actual !== operacionReservas || !contexto.vigente() || error.name === "AbortError") return;
        U.mensaje(
          tarjetaReservas,
          "No pudimos cargar las reservas",
          error.message,
          U.boton("Volver a intentar", cargarReservas, "rotate-cw"),
        );
        refrescarIconos();
      } finally {
        if (actual === operacionReservas) tarjetaReservas.removeAttribute("aria-busy");
      }
    }

    // ==========================================
    // Dibujar el bloque Reservas del día con sus filas y su paginación
    // ==========================================
    function renderizarReservasDelDia() {
      const titulo = U.crearElemento("header", "owner-reservas-titulo");
      const texto = U.crearElemento("div");
      texto.append(
        U.crearElemento("h2", "", estado.codigo ? "Resultados por código" : "Reservas del día"),
        U.crearElemento("small", "owner-muted", estado.codigo ? "Todos los locales y fechas" : formatearFechaVisita(estado.fecha)),
      );
      titulo.append(texto);
      tarjetaReservas.replaceChildren(titulo);
      if (!estado.reservas.length) {
        const vacio = U.crearElemento("div");
        const filtrado = estado.codigo || estado.estadoReserva;
        U.mensaje(
          vacio,
          filtrado ? "Sin resultados con estos filtros" : "No hay reservas para esta fecha",
          filtrado
            ? "Revisa el código, la fecha o el estado de la reserva."
            : "Elige otra fecha o busca por código en todos los locales.",
        );
        tarjetaReservas.append(vacio);
      } else {
        const lista = U.crearElemento("div", "owner-reservas-lista");
        lista.append(...estado.reservas.map(crearFilaReserva));
        tarjetaReservas.append(lista);
      }
      if (estado.meta?.total)
        U.paginar(tarjetaReservas, estado.meta, (pagina) => {
          estado.pagina = pagina;
          cargarReservas();
          tarjetaReservas.scrollIntoView({ block: "start", behavior: "auto" });
        });
      refrescarIconos();
    }

    // ==========================================
    // Construir la fila de una reserva con su botón Ver detalle (parámetro: reserva)
    // ==========================================
    function crearFilaReserva(reserva) {
      const fila = U.crearElemento(
        "article",
        "owner-reserva-fila" + (reserva.code === estado.codigoDetalle ? " is-seleccionada" : ""),
      );
      fila.dataset.codigo = reserva.code;
      const ver = U.boton(
        "Ver detalle",
        () => {
          botonDetalle = ver;
          mostrarDetalleReserva(reserva.code);
        },
        "eye",
        "owner-button secondary",
      );
      ver.setAttribute("aria-label", "Ver detalle de la reserva " + reserva.code);
      fila.append(
        crearDato(reserva.code, "Código", "owner-reserva-codigo is-ancho"),
        crearDato(reserva.time, "Hora"),
        crearDato(String(reserva.partySize), "Personas"),
        crearDato(String(reserva.tableNumber), "Mesa"),
        crearInsigniaEstado(reserva.status),
        ver,
      );
      return fila;
    }

    // ==========================================
    // Marcar en la lista la reserva cuyo detalle está abierto
    // ==========================================
    function marcarReservaSeleccionada() {
      for (const fila of tarjetaReservas.querySelectorAll(".owner-reserva-fila"))
        fila.classList.toggle("is-seleccionada", fila.dataset.codigo === estado.codigoDetalle);
    }

    // ==========================================
    // Mostrar el panel de detalle correspondiente a la reserva seleccionada por su código
    // ==========================================
    function mostrarDetalleReserva(codigoReserva) {
      const reserva = estado.reservas.find((item) => item.code === codigoReserva);
      if (!reserva) return;
      estado.codigoDetalle = codigoReserva;
      renderizarDetalleReserva(reserva);
      tarjetaDetalle.hidden = false;
      disposicion.classList.add("has-detalle");
      marcarReservaSeleccionada();
      tarjetaDetalle.scrollIntoView({ block: "nearest", behavior: "auto" });
      tarjetaDetalle.focus({ preventScroll: true });
    }

    // ==========================================
    // Ocultar y vaciar el panel de detalle devolviendo el foco al botón de origen
    // ==========================================
    function ocultarDetalleReserva() {
      const volverA = botonDetalle?.isConnected ? botonDetalle : null;
      estado.codigoDetalle = null;
      botonDetalle = null;
      tarjetaDetalle.hidden = true;
      tarjetaDetalle.replaceChildren();
      disposicion.classList.remove("has-detalle");
      marcarReservaSeleccionada();
      volverA?.focus({ preventScroll: true });
    }

    // ==========================================
    // Agregar un par término-valor a la lista de detalle (parámetros: lista, etiqueta, valor o nodo y clase extra)
    // ==========================================
    function agregarDatoDetalle(lista, etiqueta, valor, clase = "", icono = "") {
      const grupo = U.crearElemento("div", clase);
      const descripcion = U.crearElemento("dd");
      if (valor instanceof Node) descripcion.append(valor);
      else descripcion.textContent = valor ?? "—";
      const termino = U.crearElemento("dt", "", etiqueta);
      if (icono) termino.prepend(MesaIcons.icon(icono));
      grupo.append(termino, descripcion);
      lista.append(grupo);
    }

    // ==========================================
    // Crear un enlace de teléfono o correo para atender al comensal (parámetros: protocolo y valor)
    // ==========================================
    function crearEnlaceContacto(protocolo, valor) {
      if (!valor) return "—";
      const enlace = U.crearElemento("a", "", valor);
      enlace.href = protocolo + ":" + valor;
      return enlace;
    }

    // ==========================================
    // Dibujar los datos completos de la reserva en el panel de detalle (parámetro: reserva)
    // ==========================================
    function renderizarDetalleReserva(reserva) {
      const cabecera = U.crearElemento("header", "owner-reservas-titulo");
      cabecera.append(
        U.crearElemento("h2", "", "Detalle de la reserva"),
        U.boton("Cerrar", ocultarDetalleReserva, "x", "owner-button secondary"),
      );
      const lista = U.crearElemento("dl");
      const precio = reserva.pricing || {};
      const local = reserva.branch || {};
      const banda = U.crearElemento("div", "owner-reserva-banda");
      banda.append(MesaIcons.icon("calendar-check"), U.crearElemento("strong", "", reserva.code), crearInsigniaEstado(reserva.status));
      agregarDatoDetalle(lista, "Cliente", obtenerNombreCliente(reserva), "is-ancho", "user");
      agregarDatoDetalle(lista, "Correo", crearEnlaceContacto("mailto", reserva.contactEmail), "", "mail");
      agregarDatoDetalle(lista, "Teléfono", crearEnlaceContacto("tel", reserva.contactPhone), "", "phone");
      agregarDatoDetalle(lista, "Fecha de visita", formatearFechaVisita(reserva.date), "", "calendar");
      const salida = reserva.endsAt && new Intl.DateTimeFormat("es-PE", {
        timeZone: ZONA_HORARIA, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
      }).format(new Date(reserva.endsAt));
      agregarDatoDetalle(lista, "Hora", salida ? reserva.time + " – " + salida : reserva.time, "", "clock");
      agregarDatoDetalle(lista, "Mesa", String(reserva.tableNumber), "", "armchair");
      agregarDatoDetalle(lista, "Personas", String(reserva.partySize), "", "users");
      agregarDatoDetalle(
        lista,
        "Local",
        [local.name, local.street, local.district].filter(Boolean).join(" · ") || "—",
        "is-ancho owner-detalle-separador", "map-pin",
      );
      agregarDatoDetalle(lista, "Reserva registrada", formatearInstante(reserva.createdAt), "is-ancho", "history");
      agregarDatoDetalle(lista, "Total de la reserva", U.dinero(precio.totalCents), "", "receipt");
      agregarDatoDetalle(lista, "Saldo pendiente", U.dinero(precio.balanceDueCents), "", "wallet");
      agregarDatoDetalle(
        lista,
        "Adelanto informativo" + (precio.advancePercent ? " (" + precio.advancePercent + " %)" : ""),
        U.dinero(precio.advanceCents),
      );
      agregarDatoDetalle(
        lista,
        "Método de pago",
        (METODOS_PAGO[reserva.payment?.method] || "No informado") + " · pago sin verificar",
        "is-ancho",
      );

      if (reserva.status === "CANCELLED") {
        agregarDatoDetalle(lista, "Cancelada el", formatearInstante(reserva.cancelledAt), "is-ancho");
        agregarDatoDetalle(lista, "Motivo de cancelación", reserva.cancellationReason || "Sin motivo indicado", "is-ancho");
      }
      tarjetaDetalle.replaceChildren(cabecera, banda, lista);
      refrescarIconos();
    }

    // ==========================================
    // Consultar mesas y turnos del local para la fecha elegida sin mezclar respuestas antiguas
    // ==========================================
    async function cargarDisponibilidad() {
      const actual = ++operacionMesas;
      tarjetaMesas.setAttribute("aria-busy", "true");
      try {
        const consulta = MesaAPI.query({ date: estado.fecha });
        const respuesta = await contexto.peticion(
          "/branches/" + encodeURIComponent(estado.localId) + "/reservation-availability" + consulta,
        );
        if (actual !== operacionMesas || !contexto.vigente()) return;
        estado.disponibilidad = respuesta.data;
        if (!estado.disponibilidad.slots.some((turno) => turno.time === estado.turno))
          estado.turno = elegirTurnoInicial(estado.disponibilidad.slots);
        renderizarMesas();
      } catch (error) {
        if (actual !== operacionMesas || !contexto.vigente() || error.name === "AbortError") return;
        U.mensaje(
          tarjetaMesas,
          "No pudimos cargar las mesas",
          error.message,
          U.boton("Volver a intentar", cargarDisponibilidad, "rotate-cw"),
        );
        refrescarIconos();
      } finally {
        if (actual === operacionMesas) tarjetaMesas.removeAttribute("aria-busy");
      }
    }

    // ==========================================
    // Elegir el turno en curso o el siguiente; si no hay, el primero del día (parámetro: lista de turnos)
    // ==========================================
    function elegirTurnoInicial(turnos) {
      const ahora = Date.now();
      const vigente = turnos.find((turno) => new Date(turno.endsAt).getTime() > ahora);
      return (vigente || turnos[0])?.time || "";
    }

    // ==========================================
    // Calcular si una mesa está ocupada en el turno elegido (parámetro: número de mesa)
    // ==========================================
    function calcularEstadoMesa(numeroMesa) {
      const turno = estado.disponibilidad?.slots.find((item) => item.time === estado.turno);
      if (!turno) return null;
      return turno.availableTableNumbers.includes(numeroMesa) ? "disponible" : "ocupada";
    }

    // ==========================================
    // Activar los controles de capacidad del local seleccionado
    // ==========================================
    function alternarEdicionDeMesas() {
      estado.editandoMesas = !estado.editandoMesas;
      renderizarMesas();
      tarjetaMesas.querySelector("[data-configurar-mesas]")?.focus();
    }

    // ==========================================
    // Dibujar el bloque Mesas y disponibilidad con turno, resumen y mesas
    // ==========================================
    function renderizarMesas() {
      const datos = estado.disponibilidad;
      const titulo = U.crearElemento("header", "owner-reservas-titulo");
      titulo.append(U.crearElemento("h2", "", "Mesas y disponibilidad"));
      tarjetaMesas.replaceChildren(titulo);
      if (!datos?.enabled || !datos.tables.length) {
        const vacio = U.crearElemento("div");
        U.mensaje(
          vacio,
          "Este local no tiene mesas configuradas",
          "Configura las mesas del local desde la sección Locales para habilitar reservas.",
        );
        tarjetaMesas.append(vacio);
        refrescarIconos();
        return;
      }
      const configurar = U.boton(
        estado.editandoMesas ? "Terminar edición" : "Configurar mesas",
        alternarEdicionDeMesas, estado.editandoMesas ? "check" : "settings", "owner-button secondary",
      );
      configurar.dataset.configurarMesas = "";
      configurar.setAttribute("aria-expanded", String(estado.editandoMesas));
      configurar.setAttribute("aria-controls", "owner-mesas-grilla");
      titulo.append(configurar);
      const controles = U.crearElemento("div", "owner-mesas-controles");
      const turnos = datos.slots;
      const selectorTurno = U.campo(controles, "turno", "Turno", estado.turno, {
        opciones: turnos.length
          ? turnos.map((turno) => [turno.time, turno.time + " · " + turno.availableTableNumbers.length + " libres"])
          : [["", estado.fecha ? "Sin turnos para esta fecha" : "Elige una fecha"]],
      });
      selectorTurno.disabled = !turnos.length;
      selectorTurno.addEventListener("change", () => {
        estado.turno = selectorTurno.value;
        renderizarMesas();
      });
      const ocupadas = datos.tables.filter((mesa) => calcularEstadoMesa(mesa.number) === "ocupada").length;
      const resumen = U.crearElemento(
        "p",
        "owner-mesas-resumen owner-muted",
        turnos.length
          ? ocupadas + " de " + datos.tables.length + " mesas ocupadas en este turno"
          : datos.tables.length + " mesas configuradas",
      );
      const grilla = U.crearElemento("div", "owner-mesas-grilla");
      grilla.id = "owner-mesas-grilla";
      grilla.append(...datos.tables.map(crearTarjetaMesa));
      const nota = U.crearElemento("p", "owner-mesas-nota");
      nota.append(MesaIcons.icon("info"), document.createTextNode(
        estado.editandoMesas ? "Guarda la capacidad de cada mesa para aplicar el cambio." : "Una reserva cancelada libera la mesa.",
      ));
      const local = locales.find((item) => item._id === estado.localId);
      if (local) resumen.prepend(local.name + " · " + formatearFechaVisita(estado.fecha) + " · ");
      tarjetaMesas.append(controles, resumen, grilla, nota);
      refrescarIconos();
    }

    // ==========================================
    // Construir la tarjeta de una mesa con su estado y su capacidad editable (parámetro: mesa con número y capacidad)
    // ==========================================
    function crearTarjetaMesa(mesa) {
      const situacion = calcularEstadoMesa(mesa.number);
      const tarjeta = U.crearElemento("article", "owner-mesa" + (situacion === "ocupada" ? " is-ocupada" : ""));
      const cabecera = U.crearElemento("header");
      cabecera.append(U.crearElemento("h3", "", "Mesa " + mesa.number));
      if (situacion) {
        const insignia = U.crearElemento(
          "span",
          "owner-reserva-estado " + (situacion === "ocupada" ? "is-cancelada" : "is-confirmada"),
          situacion === "ocupada" ? "Ocupada" : "Disponible",
        );
        cabecera.append(insignia);
      }
      tarjeta.classList.toggle("is-disponible", situacion === "disponible");
      tarjeta.append(MesaIcons.icon("armchair"), cabecera);
      if (!estado.editandoMesas) {
        tarjeta.append(U.crearElemento("small", "owner-muted", "Capacidad: " + mesa.capacity));
        return tarjeta;
      }
      const capacidad = U.crearElemento("div", "owner-mesa-capacidad");
      const entrada = U.crearElemento("input");
      entrada.type = "number";
      entrada.id = "capacidad-mesa-" + mesa.number;
      entrada.min = CAPACIDAD_MINIMA;
      entrada.max = CAPACIDAD_MAXIMA;
      entrada.step = 1;
      entrada.value = mesa.capacity;
      const etiqueta = U.crearElemento("label", "", "Capacidad");
      etiqueta.htmlFor = entrada.id;
      capacidad.append(etiqueta, entrada);
      const guardar = U.boton("Guardar", null, "check", "owner-button secondary");
      guardar.disabled = true;
      entrada.addEventListener("input", () => {
        const valor = Number(entrada.value);
        guardar.disabled = !Number.isInteger(valor) || valor === mesa.capacity;
      });
      guardar.addEventListener("click", () =>
        actualizarCapacidadMesa(mesa.number, Number(entrada.value), entrada, guardar),
      );
      tarjeta.append(capacidad, guardar);
      return tarjeta;
    }

    // ==========================================
    // Guardar la nueva capacidad de una mesa conservando las demás (parámetros: número, capacidad, campo y botón)
    // ==========================================
    async function actualizarCapacidadMesa(numeroMesa, capacidad, entrada, boton) {
      if (U.estado.guardando) return;
      const datos = estado.disponibilidad;
      if (!Number.isInteger(capacidad) || capacidad < CAPACIDAD_MINIMA || capacidad > CAPACIDAD_MAXIMA) {
        entrada.setAttribute("aria-invalid", "true");
        entrada.focus();
        return;
      }
      if (datos.pricePerPersonCents === null || datos.pricePerPersonCents === undefined) {
        const aviso = MesaUI.modal("No se pudo guardar la capacidad", "owner-notice");
        aviso.append(
          U.crearElemento("p", "", "Define primero el precio por persona de las reservas en la sección Locales."),
        );
        return;
      }
      entrada.removeAttribute("aria-invalid");
      U.estado.guardando = true;
      boton.disabled = true;
      try {
        const localId = estado.localId;
        const respuesta = await contexto.peticion("/branches/" + encodeURIComponent(localId), {
          method: "PATCH",
          body: {
            reservationSettings: {
              pricePerPersonCents: datos.pricePerPersonCents,
              tables: datos.tables.map((mesa) => ({
                number: mesa.number,
                capacity: mesa.number === numeroMesa ? capacidad : mesa.capacity,
              })),
            },
          },
        });
        if (!contexto.vigente()) return;
        const local = contexto.locales.find((item) => item._id === localId);
        if (local && respuesta.data) local.reservationSettings = respuesta.data.reservationSettings;
        if (estado.localId !== localId) return;
        await cargarDisponibilidad();
        if (contexto.vigente() && estado.localId === localId)
          U.confirmarExito("La capacidad de la mesa " + numeroMesa + " se actualizó correctamente.");
      } catch (error) {
        if (!contexto.vigente()) return;
        boton.disabled = false;
        const aviso = MesaUI.modal("No se pudo guardar la capacidad", "owner-notice");
        aviso.append(U.crearElemento("p", "", error.message));
      } finally {
        U.estado.guardando = false;
      }
    }
  }

  window.MesaAdminReservas = { mostrar };
})();
