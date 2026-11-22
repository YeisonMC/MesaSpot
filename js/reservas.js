
// ==========================================
// Reservas de MesaSpot
// Restaurante, locales y disponibilidad real
// ==========================================

(() => {
  "use strict";

  const seleccionar = (selector) => document.querySelector(selector);

  const elementos = {
    nombre: seleccionar("#rv-rest-nombre"),
    imagen: seleccionar("#rv-rest-img"),
    rating: seleccionar("#rv-rest-rating"),
    resenas: seleccionar("#rv-rest-resenas"),
    tipo: seleccionar("#rv-rest-tipo"),
    direccion: seleccionar("#rv-rest-direccion"),
    precio: seleccionar("#rv-rest-precio"),
    contenedorSede: seleccionar("#rv-sede-contenedor"),
    sede: seleccionar("#rv-sede"),
    fecha: seleccionar("#rv-fecha"),
    hora: seleccionar("#rv-hora"),
    personas: seleccionar("#rv-personas"),
    mesas: seleccionar(".rv-mesas"),
  };

  const parametros = new URLSearchParams(window.location.search);
  const restaurantId = parametros.get("restaurantId");
  const branchId = parametros.get("branchId");

  let restaurant = null;
  let branches = [];
  let selectedBranch = null;
  let availability = null;
  let selectedTableNumber = null;
  let availabilityRequest = 0;
  let initialized = false;

  // ==========================================
  // Mensajes de disponibilidad
  // ==========================================

  const mensaje = document.createElement("p");
  mensaje.className = "rv-availability-message";
  mensaje.setAttribute("role", "status");
  mensaje.setAttribute("aria-live", "polite");

  elementos.mesas?.append(mensaje);

  function mostrarMensaje(texto) {
    mensaje.textContent = texto;
    mensaje.hidden = !texto;
  }

  // ==========================================
  // Formatear información del local
  // ==========================================

  function formatearDireccion(branch) {
    return branch?.address
      ? [
          branch.address.street,
          branch.address.district,
          branch.address.province,
        ].filter(Boolean).join(", ")
      : "Dirección pendiente";
  }

  function mostrarRestaurante() {
    elementos.nombre.textContent = restaurant.name;

    elementos.imagen.src =
      restaurant.thumbnailPhoto?.url ||
      restaurant.coverPhoto?.url ||
      "../../assets/restaurant-placeholder.svg";

    elementos.imagen.alt = restaurant.name;

    const rating = restaurant.ratingSummary;

    elementos.rating.textContent = rating?.overall
      ? rating.overall.toFixed(1)
      : "Sin valoración";

    elementos.resenas.textContent = rating?.reviewCount
      ? `${rating.reviewCount} reseñas`
      : "Sin reseñas";

    elementos.tipo.textContent = (restaurant.cuisineTypes || [])
      .map((tipo) => MesaUI.label(tipo))
      .join(", ") || "Tipo de comida por confirmar";

    mostrarLocalSeleccionado();
  }

  function mostrarLocalSeleccionado() {
    if (!selectedBranch) return;

    elementos.direccion.textContent = formatearDireccion(selectedBranch);

    elementos.precio.textContent =
      selectedBranch.averagePricePerPersonCents != null
        ? `${MesaUI.money(selectedBranch.averagePricePerPersonCents)} aprox. por persona`
        : "Precio por confirmar";
  }

  // ==========================================
  // Mostrar las sedes
  // ==========================================

  function mostrarSedes() {
    elementos.sede.replaceChildren();

    branches.forEach((branch) => {
      const option = document.createElement("option");
      option.value = branch._id;
      option.textContent = branch.name;
      elementos.sede.append(option);
    });

    elementos.contenedorSede.hidden = branches.length <= 1;
    elementos.sede.value = selectedBranch?._id || "";
  }

  // ==========================================
  // Obtener la mesa seleccionada
  // ==========================================

  function obtenerMesaSeleccionada() {
    const input = document.querySelector(
      ".rv-mesa-in:checked"
    );

    return input ? Number(input.value) : null;
  }

  // ==========================================
  // Mostrar mesas según disponibilidad
  // ==========================================

  function actualizarMesas() {
    if (!availability) return;

    const partySize = Number(elementos.personas.value || 1);
    const selectedSlot = availability.slots.find(
      (slot) => slot.time === elementos.hora.value
    );

    const availableNumbers = selectedSlot
      ? selectedSlot.availableTableNumbers
      : elementos.fecha.value
        ? [
            ...new Set(
              availability.slots.flatMap(
                (slot) => slot.availableTableNumbers
              )
            )
          ]
        : null;

    let mesasDisponibles = 0;

    availability.tables.forEach((table) => {
      const input = document.getElementById(`m${table.number}`);

      if (!input) return;

      const label = document.querySelector(
        `label[for="m${table.number}"]`
      );

      const available =
        table.capacity >= partySize &&
        (!availableNumbers ||
          availableNumbers.includes(table.number));

      input.disabled = !available;

      if (label) {
        label.classList.toggle("occ", !available);
        label.setAttribute(
          "aria-label",
          `Mesa ${table.number}, capacidad ${table.capacity} personas` +
          (available ? ", disponible" : ", no disponible")
        );
      }

      if (available) mesasDisponibles++;

      if (!available && input.checked) {
        input.checked = false;
        selectedTableNumber = null;
      }
    });

    if (selectedTableNumber) {
      const input = document.getElementById(
        `m${selectedTableNumber}`
      );

      if (!input || input.disabled) {
        selectedTableNumber = null;
      }
    }

    if (selectedSlot && !mesasDisponibles) {
      mostrarMensaje(
        "No hay mesas disponibles para esa hora y cantidad de personas."
      );
    } else if (selectedTableNumber === null && elementos.fecha.value) {
      mostrarMensaje(
        "Selecciona una mesa disponible. Si cambiaste la fecha u hora, vuelve al paso anterior."
      );
    } else {
      mostrarMensaje("");
    }
  }

  // ==========================================
  // Mostrar horarios disponibles
  // ==========================================

  function actualizarHorarios() {
    const previousTime = elementos.hora.value;
    const partySize = Number(elementos.personas.value || 1);

    elementos.hora.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Selecciona un horario";
    elementos.hora.append(placeholder);

    const tables = availability.tables;

    const slots = availability.slots.filter((slot) =>
      slot.availableTableNumbers.some((number) => {
        const table = tables.find(
          (item) => item.number === number
        );

        return table && table.capacity >= partySize;
      })
    );

    slots.forEach((slot) => {
      const option = document.createElement("option");
      option.value = slot.time;
      option.textContent = slot.time;
      elementos.hora.append(option);
    });

    if (slots.some((slot) => slot.time === previousTime)) {
      elementos.hora.value = previousTime;
    }

    if (!slots.length) {
      placeholder.textContent =
        "No hay horarios disponibles para esta fecha";
    }
  }

  // ==========================================
  // Consultar disponibilidad en el backend
  // ==========================================

  async function cargarDisponibilidad(date = "") {
    if (!selectedBranch) return;

    const requestNumber = ++availabilityRequest;

    try {
      await MesaAuth.ready;

      if (!MesaAPI.session?.user) {
        mostrarMensaje(
          "Inicia sesión para consultar la disponibilidad."
        );

        MesaAuth.open("login");
        return;
      }

      mostrarMensaje("Consultando disponibilidad...");

      const path =
        "/restaurants/" +
        encodeURIComponent(restaurantId) +
        "/branches/" +
        encodeURIComponent(selectedBranch._id) +
        "/reservation-availability" +
        (date ? MesaAPI.query({ date }) : "");

      const { data } = await MesaAPI.request(path, {
        authenticated: true,
      });

      if (requestNumber !== availabilityRequest) return;

      availability = data;

      if (!data.enabled) {
        availability = null;
        mostrarMensaje(
          "Este local todavía no admite reservas. Selecciona otra sede o inténtalo más tarde."
        );

        elementos.hora.replaceChildren();
        elementos.hora.disabled = true;

        document.querySelectorAll(".rv-mesa-in").forEach((input) => {
          input.checked = false;
          input.disabled = true;
        });

        document.querySelectorAll(".rv-mesa").forEach((label) => {
          label.classList.add("occ");
        });

        return;
      }

      elementos.hora.disabled = false;

      actualizarHorarios();
      actualizarMesas();

      if (date && !data.slots.length) {
        mostrarMensaje(
          "No hay horarios disponibles para esta fecha. Prueba con otro día."
        );
      }
    } catch (error) {
      if (requestNumber !== availabilityRequest) return;

      console.error("Error al consultar disponibilidad:", error);

      if (error.status === 401) {
        mostrarMensaje("Tu sesión ha expirado. Inicia sesión nuevamente.");
        MesaAuth.open("login");
        return;
      }

      mostrarMensaje(
        error.message || "No pudimos consultar la disponibilidad."
      );
    }
  }

  // ==========================================
  // Cambiar de sede
  // ==========================================

  elementos.sede.addEventListener("change", () => {
    selectedBranch =
      branches.find(
        (branch) => branch._id === elementos.sede.value
      ) || null;

    mostrarLocalSeleccionado();

    availability = null;
    selectedTableNumber = null;
    elementos.hora.replaceChildren();

    document.querySelectorAll(".rv-mesa-in").forEach((input) => {
      input.checked = false;
      input.disabled = false;
    });

    document.querySelectorAll(".rv-mesa").forEach((label) => {
      label.classList.remove("occ");
    });

    cargarDisponibilidad(elementos.fecha.value);
  });

  // ==========================================
  // Eventos de fecha, hora y personas
  // ==========================================

  elementos.fecha.addEventListener("change", () => {
    elementos.hora.value = "";
    selectedTableNumber = obtenerMesaSeleccionada();
    cargarDisponibilidad(elementos.fecha.value);
  });

  elementos.hora.addEventListener("change", actualizarMesas);

  elementos.personas.addEventListener("change", () => {
    if (availability) {
      actualizarHorarios();
      actualizarMesas();
    }
  });

  elementos.mesas.addEventListener("change", (event) => {
    if (event.target.matches(".rv-mesa-in")) {
      selectedTableNumber = obtenerMesaSeleccionada();
      mostrarMensaje("");
    }
  });

  // ==========================================
  // Actualizar disponibilidad al iniciar sesión
  // ==========================================

  window.addEventListener("mesa:session", () => {
    if (initialized && MesaAPI.session?.user) {
      cargarDisponibilidad(elementos.fecha.value);
    }
  });

  // ==========================================
  // Cargar restaurante y sedes
  // ==========================================

  async function cargarDatosIniciales() {
    try {
      if (!restaurantId || !/^[a-f0-9]{24}$/i.test(restaurantId)) {
        throw new Error(
          "No se recibió un identificador válido del restaurante."
        );
      }

      const { data } = await MesaAPI.request(
        "/restaurants/" + encodeURIComponent(restaurantId)
      );

      restaurant = data;

      const resultadoSedes = await MesaAPI.all(
        "/restaurants/" + encodeURIComponent(restaurantId) + "/branches"
      );

      branches = resultadoSedes || [];

      if (!branches.length) {
        throw new Error(
          "Este restaurante todavía no tiene locales disponibles."
        );
      }

      selectedBranch =
        branches.find((branch) => branch._id === branchId) ||
        branches.find(
          (branch) => branch._id === restaurant.mainBranchId
        ) ||
        branches[0];

      mostrarRestaurante();
      mostrarSedes();

      initialized = true;

      await cargarDisponibilidad(elementos.fecha.value);
    } catch (error) {
      console.error("Error al cargar los datos de la reserva:", error);

      elementos.nombre.textContent =
        "No se pudo cargar el restaurante";

      elementos.direccion.textContent = error.message;
      elementos.contenedorSede.hidden = true;
    }
  }

  cargarDatosIniciales();
})();