// ==========================================
// Reservas de la cuenta en el perfil
// ==========================================

(() => {
  "use strict";
  const {
    element: crearElemento,
    button: crearBoton,
    image: crearImagen,
    link: crearEnlace,
    money: mostrarImporte,
    pageUrl: rutaDePagina,
    state: mostrarEstado,
    paginate: mostrarPaginacion,
  } = MesaUI;
  const { icon: crearIcono } = MesaIcons;
  const grupos = [
    ["UPCOMING", "Próximas", "calendar-days"],
    ["PAST", "Historial", "history"],
  ];
  const zona = { timeZone: "America/Lima" };
  const fechaDeLima = new Intl.DateTimeFormat("es-PE", {
    ...zona,
    dateStyle: "medium",
  });
  const horaDeLima = new Intl.DateTimeFormat("es-PE", {
    ...zona,
    timeStyle: "short",
  });

  // ==========================================
  // Construir el resumen desplegable de una reserva
  // ==========================================
  function crearDetalleDeReserva(reserva) {
    const detalle = crearElemento("details", "reservation-details");
    const control = crearElemento("summary", "", "Ver detalles");
    control.setAttribute(
      "aria-label",
      `Detalles de la reserva ${reserva.code}`,
    );
    control.append(crearIcono("chevron-down"));
    const datos = crearElemento("dl", "reservation-fields");
    const campos = [
      ["Código de reserva", reserva.code],
      [
        "Dirección",
        [reserva.branch?.street, reserva.branch?.district]
          .filter(Boolean)
          .join(", "),
      ],
      ["Teléfono de contacto", reserva.contactPhone],
      ["Correo de confirmación", reserva.contactEmail],
      ["Total de la reserva", mostrarImporte(reserva.pricing?.totalCents)],
      ["Adelanto sin verificar", mostrarImporte(reserva.pricing?.advanceCents)],
      ["Saldo pendiente", mostrarImporte(reserva.pricing?.balanceDueCents)],
    ];
    for (const [etiqueta, valor] of campos) {
      if (!valor) continue;
      const campo = crearElemento("div");
      campo.append(
        crearElemento("dt", "", etiqueta),
        crearElemento("dd", "", valor),
      );
      datos.append(campo);
    }
    detalle.append(control, datos);
    return detalle;
  }

  // ==========================================
  // Mostrar el restaurante, la mesa y el turno confirmados
  // ==========================================
  function crearTarjetaDeReserva(reserva) {
    const tarjeta = crearElemento("article", "reservation-card");
    const cabecera = crearElemento("div", "reservation-card-header");
    const restaurante = crearElemento("div", "reservation-restaurant");
    restaurante.append(
      crearElemento("h2", "", reserva.restaurant?.name || "Restaurante"),
      crearElemento("p", "", reserva.branch?.name || "Sede de la reserva"),
    );
    const cancelada = reserva.status === "CANCELLED";
    const estado = crearElemento("span", "reservation-status", cancelada ? "Cancelada" : "Confirmada");
    estado.classList.toggle("reservation-status--cancelled", cancelada);
    estado.prepend(crearIcono(cancelada ? "circle-x" : "circle-check"));
    cabecera.append(
      crearImagen(
        reserva.restaurant?.thumbnailUrl,
        "",
        "reservation-thumbnail",
      ),
      restaurante,
      estado,
    );

    const turno = new Date(reserva.startsAt);
    const datos = crearElemento("ul", "reservation-overview");
    const campos = [
      ["calendar-days", fechaDeLima.format(turno)],
      ["clock", horaDeLima.format(turno)],
      [
        "users",
        reserva.partySize === 1 ? "1 persona" : `${reserva.partySize} personas`,
      ],
      ["armchair", `Mesa ${reserva.tableNumber}`],
    ];
    for (const [icono, valor] of campos) {
      const item = crearElemento("li", "", valor);
      item.prepend(crearIcono(icono));
      datos.append(item);
    }
    tarjeta.append(cabecera, datos, crearDetalleDeReserva(reserva));
    return tarjeta;
  }

  // ==========================================
  // Mostrar el mensaje cuando el filtro no tiene reservas
  // ==========================================
  function mostrarReservasVacias(contenedor, grupo) {
    const vacio = crearElemento("div", "reservations-empty");
    const proximas = grupo === "UPCOMING";
    vacio.append(
      crearIcono(proximas ? "calendar-days" : "history"),
      crearElemento(
        "h2",
        "",
        proximas
          ? "No tienes reservas próximas"
          : "Todavía no tienes reservas anteriores",
      ),
    );
    if (proximas) {
      const enlace = crearEnlace(
        "Explorar restaurantes",
        rutaDePagina("restaurantes.html"),
        "button",
      );
      enlace.append(crearIcono("arrow-right"));
      vacio.append(enlace);
    }
    contenedor.append(vacio);
  }

  // ==========================================
  // Cargar las reservas privadas con filtros y paginación
  // ==========================================
  function mostrarReservas(panel) {
    let grupo = "UPCOMING";
    let peticion;
    const filtros = crearElemento("div", "reservation-filters");
    filtros.setAttribute("role", "group");
    filtros.setAttribute("aria-label", "Filtrar reservas");
    const lista = crearElemento("div", "reservation-list");
    const paginas = crearElemento("nav", "reservation-pages");
    paginas.setAttribute("aria-label", "Páginas de mis reservas");
    panel.append(filtros, lista, paginas);

    // ==========================================
    // Consultar una página y descartar respuestas de otro filtro
    // ==========================================
    async function cargarPagina(pagina) {
      peticion?.abort();
      const controlador = new AbortController();
      peticion = controlador;
      const { signal } = controlador;
      paginas.hidden = true;
      mostrarEstado(lista, "Cargando tus reservas…");

      try {
        const consulta = MesaAPI.query({ view: grupo, page: pagina, limit: 6 });
        const { data: reservas, meta } = await MesaAPI.request(
          `/users/me/reservations${consulta}`,
          {
            authenticated: true,
            signal,
          },
        );
        if (signal.aborted || !panel.isConnected) return;
        lista.replaceChildren();
        if (!reservas.length) {
          mostrarReservasVacias(lista, grupo);
          return;
        }
        const animar =
          window.AOS && !matchMedia("(prefers-reduced-motion: reduce)").matches;
        for (const reserva of reservas) {
          const tarjeta = crearTarjetaDeReserva(reserva);
          if (animar) {
            tarjeta.dataset.aos = "fade-up";
            tarjeta.dataset.aosDuration = "350";
            tarjeta.dataset.aosOffset = "0";
          }
          lista.append(tarjeta);
        }
        if (animar) window.AOS.refreshHard();
        mostrarPaginacion(paginas, meta.page, meta.totalPages, cargarPagina);
      } catch {
        if (signal.aborted || !panel.isConnected) return;
        mostrarEstado(lista, "No pudimos cargar tus reservas.", () =>
          cargarPagina(pagina),
        );
      }
    }

    // ==========================================
    // Cambiar entre próximas reservas e historial
    // ==========================================
    function cambiarGrupo(evento) {
      const elegido = evento.currentTarget.dataset.grupo;
      if (elegido === grupo) return;
      grupo = elegido;
      for (const boton of filtros.children) {
        boton.setAttribute(
          "aria-pressed",
          String(boton.dataset.grupo === grupo),
        );
      }
      cargarPagina(1);
    }

    for (const [valor, etiqueta, icono] of grupos) {
      const boton = crearBoton(etiqueta, cambiarGrupo, "reservation-filter");
      boton.dataset.grupo = valor;
      boton.setAttribute("aria-pressed", String(valor === grupo));
      boton.prepend(crearIcono(icono));
      filtros.append(boton);
    }
    cargarPagina(1);
  }

  window.MesaReservas = { mostrar: mostrarReservas };
})();
