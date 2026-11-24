
// ==========================================
// Reservas de MesaSpot
// Restaurante, sedes, disponibilidad y reservas
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
    telefono: seleccionar("#rv-telefono"),
    correo: seleccionar("#rv-correo"),
    terminos: seleccionar("#tyc"),

    mesas: seleccionar(".rv-mesas"),

    resumenFecha: seleccionar("#rv-resumen-fecha"),
    resumenHora: seleccionar("#rv-resumen-hora"),
    resumenPersonas: seleccionar("#rv-resumen-personas"),
    adelanto: seleccionar("#rv-adelanto"),
    porcentaje: seleccionar("#rv-porcentaje"),

    botonNext1: seleccionar("#next1"),
    botonBack1: seleccionar("#back1"),
    botonNext3: seleccionar("#next3"),
    botonBack2: seleccionar("#back2"),
    botonConfirmar: seleccionar("#confirmReservation"),

    errorReserva: seleccionar("#rv-error-reserva"),
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
  let availabilityLoading = false;
  let submitting = false;

  // ==========================================
  // Utilidades
  // ==========================================

  function cambiarPaso(id) {
    const paso = document.getElementById(id);

    if (paso) {
      paso.checked = true;
    }
  }

  function mostrarError(texto) {
    if (!elementos.errorReserva) return;

    elementos.errorReserva.textContent = texto;
    elementos.errorReserva.hidden = !texto;
  }

  function limpiarError() {
    mostrarError("");
  }

  // ==========================================
  // Obtener la fecha del calendario de reservas en Lima
  // ==========================================
  function obtenerFechaLocal() {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function formatearDireccion(branch) {
    return branch?.address
      ? [
          branch.address.street,
          branch.address.district,
          branch.address.province,
        ].filter(Boolean).join(", ")
      : "Dirección pendiente";
  }

  function formatearFecha(fecha) {
    if (!fecha) return "Por seleccionar";

    const date = new Date(`${fecha}T12:00:00`);

    return date.toLocaleDateString("es-PE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function obtenerMetodoPago() {
    const seleccionado = seleccionar(
      ".rv-met-in:checked"
    );

    return seleccionado?.value || "YAPE";
  }

  function nombreMetodoPago(metodo) {
    const nombres = {
      YAPE: "Yape",
      PLIN: "Plin",
      CARD: "Tarjeta",
      BANK_TRANSFER: "Transferencia bancaria",
    };

    return nombres[metodo] || metodo;
  }

  function obtenerMesaSeleccionada() {
    const input = seleccionar(".rv-mesa-in:checked");

    if (!input) return null;

    return Number(input.id.replace("m", ""));
  }

  function obtenerDatosMesa(numero) {
    return availability?.tables?.find(
      (table) => Number(table.number) === Number(numero)
    );
  }

  function mesaDisponibleParaReserva() {
    const numero = obtenerMesaSeleccionada();

    if (!numero || !availability || !availability.enabled) {
      return false;
    }

    const mesa = obtenerDatosMesa(numero);

    if (!mesa) return false;

    const partySize = Number(elementos.personas.value);

    if (mesa.capacity < partySize) return false;

    const horario = availability.slots?.find(
      (slot) => slot.time === elementos.hora.value
    );

    if (!horario) return false;

    return horario.availableTableNumbers.some(
      (number) => Number(number) === numero
    );
  }

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
  // Información del restaurante
  // ==========================================

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

    elementos.direccion.textContent =
      formatearDireccion(selectedBranch);

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
  // Actualizar resumen de reserva
  // ==========================================

  function actualizarResumen() {
    const fecha = elementos.fecha.value;
    const hora = elementos.hora.value;
    const personas = Number(elementos.personas.value || 1);

    elementos.resumenFecha.textContent =
      formatearFecha(fecha);

    elementos.resumenHora.textContent =
      hora || "Por seleccionar";

    elementos.resumenPersonas.textContent =
      `${personas} personas`;

    const panelPago = seleccionar(
      "#panel3 .rv-cols > aside.rv-sum"
    );

    if (!panelPago) return;

    const filas = panelPago.querySelectorAll(
      ":scope > .rv-row"
    );

    const filasTotales = panelPago.querySelectorAll(
      ".rv-total.rv-total-col .rv-row"
    );

    const totalElemento = seleccionar("#rv-total-reserva");
    const adelantoElemento = seleccionar("#rv-pago-adelanto");
    const saldoElemento = seleccionar("#rv-pago-saldo");
    const adelantoLabel = seleccionar("#rv-pago-adelanto-label");

    const pagoFecha = seleccionar("#rv-pago-fecha");
    const pagoHora = seleccionar("#rv-pago-hora");
    const pagoPersonas = seleccionar("#rv-pago-personas");

    if (pagoFecha) {
      pagoFecha.textContent = formatearFecha(fecha);
    }

    if (pagoHora) {
      pagoHora.textContent = hora || "Por seleccionar";
    }

    if (pagoPersonas) {
      pagoPersonas.textContent = `${personas} personas`;
    }

    if (filas[0]) {
      filas[0].lastElementChild.textContent =
        formatearFecha(fecha);
    }

    if (filas[1]) {
      filas[1].lastElementChild.textContent =
        hora || "Por seleccionar";
    }

    if (filas[2]) {
      filas[2].lastElementChild.textContent =
        `${personas} personas`;
    }

    function limpiarImportes() {
      elementos.adelanto.textContent = "Por calcular";
      elementos.porcentaje.textContent = "";

      if (filas[3]) {
        filas[3].lastElementChild.textContent = "Por calcular";
      }

      if (filasTotales[0]) {
        filasTotales[0].lastElementChild.textContent =
          "Por calcular";
      }

      if (filasTotales[1]) {
        filasTotales[1].lastElementChild.textContent =
          "Por calcular";
      }

      if (totalElemento) totalElemento.textContent = "Por calcular";
      if (adelantoElemento) adelantoElemento.textContent = "Por calcular";
      if (saldoElemento) saldoElemento.textContent = "Por calcular";
    }

    if (!availability || !availability.enabled) {
      limpiarImportes();
      return;
    }

    const precioPersona = Number(
      availability.pricePerPersonCents
    );

    const porcentajeAdelanto = Number(
      availability.advancePercent
    );

    if (
      !Number.isFinite(precioPersona) ||
      !Number.isFinite(porcentajeAdelanto)
    ) {
      limpiarImportes();
      return;
    }

    const total = precioPersona * personas;

    const adelanto = Math.round(
      total * porcentajeAdelanto / 100
    );

    const saldo = total - adelanto;

    elementos.adelanto.textContent =
      MesaUI.money(adelanto);

    elementos.porcentaje.textContent =
      `(${porcentajeAdelanto}% del total)`;

    if (filas[3]) {
      filas[3].lastElementChild.textContent =
        MesaUI.money(total);
    }

    if (filasTotales[0]) {
      filasTotales[0].firstElementChild.textContent =
        `Adelanto (${porcentajeAdelanto}%)`;

      filasTotales[0].lastElementChild.textContent =
        MesaUI.money(adelanto);
    }

    if (filasTotales[1]) {
      filasTotales[1].lastElementChild.textContent =
        MesaUI.money(saldo);
    }

    if (totalElemento) {
      totalElemento.textContent = MesaUI.money(total);
    }

    if (adelantoElemento) {
      adelantoElemento.textContent = MesaUI.money(adelanto);
    }

    if (saldoElemento) {
      saldoElemento.textContent = MesaUI.money(saldo);
    }

    if (adelantoLabel) {
      adelantoLabel.textContent =
        `Adelanto (${porcentajeAdelanto}%)`;
    }
  }

  // ==========================================
  // Actualizar mesas según disponibilidad
  // ==========================================

  function actualizarMesas() {
    if (!availability || !availability.enabled) return;

    const partySize = Number(elementos.personas.value || 1);

    const selectedSlot = availability.slots?.find(
      (slot) => slot.time === elementos.hora.value
    );

    let availableNumbers = null;

    if (selectedSlot) {
      availableNumbers = selectedSlot.availableTableNumbers;
    } else if (elementos.fecha.value) {
      availableNumbers = [
        ...new Set(
          (availability.slots || []).flatMap(
            (slot) => slot.availableTableNumbers
          )
        )
      ];
    }

    let mesasDisponibles = 0;

    availability.tables.forEach((table) => {
      const input = document.getElementById(`m${table.number}`);

      if (!input) return;

      const label = document.querySelector(
        `label[for="m${table.number}"]`
      );

      const available =
        table.capacity >= partySize &&
        (
          availableNumbers === null ||
          availableNumbers.some(
            (number) => Number(number) === Number(table.number)
          )
        );

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

    if (selectedTableNumber !== null) {
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
    } else if (elementos.fecha.value && !selectedTableNumber) {
      mostrarMensaje(
        "Selecciona una mesa disponible. Si cambiaste la fecha u hora, vuelve al paso anterior."
      );
    } else {
      mostrarMensaje("");
    }
  }

  // ==========================================
  // Actualizar horarios disponibles
  // ==========================================

  function actualizarHorarios() {
    const previousTime = elementos.hora.value;
    const partySize = Number(elementos.personas.value || 1);

    elementos.hora.replaceChildren();

    const placeholder = document.createElement("option");

    placeholder.value = "";
    placeholder.textContent = "Selecciona un horario";

    elementos.hora.append(placeholder);

    const tables = availability?.tables || [];
    const slots = (availability?.slots || []).filter((slot) =>
      slot.availableTableNumbers.some((number) => {
        const table = tables.find(
          (item) => Number(item.number) === Number(number)
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
    } else {
      elementos.hora.value = "";
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

    availabilityLoading = true;
    availability = null;

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

        const option = document.createElement("option");

        option.value = "";
        option.textContent = "No disponible";

        elementos.hora.append(option);
        elementos.hora.disabled = true;

        document.querySelectorAll(".rv-mesa-in").forEach((input) => {
          input.checked = false;
          input.disabled = true;
        });

        document.querySelectorAll(".rv-mesa").forEach((label) => {
          label.classList.add("occ");
        });

        selectedTableNumber = null;

        actualizarResumen();
        return;
      }

      elementos.hora.disabled = false;

      // Habilitar las mesas que existen en el plano.
      document.querySelectorAll(".rv-mesa-in").forEach((input) => {
        input.disabled = false;
      });

      actualizarHorarios();
      actualizarMesas();
      actualizarResumen();

      if (date && !data.slots.length) {
        mostrarMensaje(
          "No hay horarios disponibles para esta fecha. Prueba con otro día."
        );
      }

    } catch (error) {
      if (requestNumber !== availabilityRequest) return;

      console.error(
        "Error al consultar disponibilidad:",
        error
      );

      if (error.status === 401) {
        mostrarMensaje(
          "Tu sesión ha expirado. Inicia sesión nuevamente."
        );

        MesaAuth.open("login");
        return;
      }

      mostrarMensaje(
        error.message || "No pudimos consultar la disponibilidad."
      );

    } finally {
      if (requestNumber === availabilityRequest) {
        availabilityLoading = false;
      }
    }
  }

  // ==========================================
  // Validación del paso 1
  // ==========================================

  function validarPaso1() {
    const numero = obtenerMesaSeleccionada();

    if (!numero) {
      mostrarMensaje("Debes seleccionar una mesa para continuar.");
      return false;
    }

    const input = document.getElementById(`m${numero}`);

    if (!input || input.disabled) {
      mostrarMensaje("La mesa seleccionada no está disponible.");
      return false;
    }

    selectedTableNumber = numero;

    mostrarMensaje("");

    return true;
  }

  // ==========================================
  // Validación de datos del paso 2
  // ==========================================

  function validarTelefono() {
    const telefono = elementos.telefono.value.trim();

    const limpio = telefono.replace(/[\s-]/g, "");

    const valido = /^(9\d{8}|\+519\d{8})$/.test(limpio);

    elementos.telefono.setCustomValidity(
      valido
        ? ""
        : "Ingresa un teléfono válido de Perú: 9 dígitos o +51 seguido de 9 dígitos."
    );

    return valido;
  }

  function validarPaso2() {
    limpiarError();

    const campos = [
      elementos.fecha,
      elementos.hora,
      elementos.personas,
      elementos.telefono,
      elementos.correo,
      elementos.terminos,
    ];

    for (const campo of campos) {
      if (!campo.checkValidity()) {
        campo.reportValidity();
        return false;
      }
    }

    if (elementos.fecha.value < obtenerFechaLocal()) {
      elementos.fecha.setCustomValidity(
        "Selecciona una fecha igual o posterior a hoy."
      );

      elementos.fecha.reportValidity();
      elementos.fecha.setCustomValidity("");

      return false;
    }

    if (!validarTelefono()) {
      elementos.telefono.reportValidity();
      return false;
    }

    if (availabilityLoading) {
      mostrarError(
        "Espera un momento mientras consultamos la disponibilidad."
      );

      return false;
    }

    if (!availability || !availability.enabled) {
      mostrarError(
        "No hay disponibilidad habilitada para esta sede."
      );

      return false;
    }

    if (!mesaDisponibleParaReserva()) {
      mostrarError(
        "La mesa seleccionada ya no está disponible para esa fecha, hora o cantidad de personas. Regresa al paso anterior y selecciona otra mesa."
      );

      return false;
    }

    return true;
  }

  // ==========================================
  // Mostrar confirmación del backend
  // ==========================================

  function mostrarConfirmacion(reserva) {
    const restaurante = reserva.restaurant || {};
    const branch = reserva.branch || {};
    const pricing = reserva.pricing || {};
    const payment = reserva.payment || {};

    const ponerTexto = (selector, valor, alternativo = "--") => {
      const elemento = seleccionar(selector);

      if (elemento) {
        elemento.textContent = valor ?? alternativo;
      }
    };

    ponerTexto(
      "#rv-confirmacion-restaurante",
      restaurante.name || restaurant.name
    );

    ponerTexto(
      "#rv-confirmacion-sede",
      branch.name || selectedBranch?.name
    );

    ponerTexto(
      "#rv-confirmacion-direccion",
      [branch.street, branch.district].filter(Boolean).join(", ") ||
      formatearDireccion(selectedBranch)
    );

    const imagenConfirmacion = seleccionar(
      "#rv-confirmacion-img"
    );

    if (imagenConfirmacion) {
      imagenConfirmacion.src =
        restaurante.thumbnailUrl ||
        elementos.imagen.src;

      imagenConfirmacion.alt =
        restaurante.name || restaurant.name;
    }

    ponerTexto(
      "#rv-confirmacion-fecha",
      formatearFecha(reserva.date)
    );

    ponerTexto(
      "#rv-confirmacion-hora",
      reserva.time
    );

    ponerTexto(
      "#rv-confirmacion-personas",
      `${reserva.partySize} personas`
    );

    ponerTexto(
      "#rv-confirmacion-mesa",
      `Mesa ${reserva.tableNumber}`
    );

    ponerTexto(
      "#rv-confirmacion-metodo",
      nombreMetodoPago(payment.method)
    );

    ponerTexto(
      "#rv-confirmacion-pago",
      payment.status === "NOT_VERIFIED"
        ? "Adelanto sin verificar"
        : payment.status
    );

    ponerTexto(
      "#rv-confirmacion-total",
      pricing.totalCents != null
        ? MesaUI.money(pricing.totalCents)
        : "--"
    );

    ponerTexto(
      "#rv-confirmacion-adelanto",
      pricing.advanceCents != null
        ? MesaUI.money(pricing.advanceCents)
        : "--"
    );

    ponerTexto(
      "#rv-confirmacion-saldo",
      pricing.balanceDueCents != null
        ? MesaUI.money(pricing.balanceDueCents)
        : "--"
    );

    ponerTexto(
      "#rv-confirmacion-codigo",
      reserva.code
    );

    const mensajesCorreo = {
      SENT: "Enviamos la confirmación a tu correo.",
      PENDING: "El correo de confirmación está en proceso.",
      DISABLED: "Puedes consultar tu código en Mis reservas.",
      FAILED: "El correo no pudo enviarse. Tu reserva está confirmada.",
    };

    ponerTexto(
      "#rv-confirmacion-correo",
      mensajesCorreo[reserva.confirmationEmailStatus] ||
      "Tu reserva ha sido registrada correctamente."
    );

    cambiarPaso("p4");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // ==========================================
  // Registrar reserva en el backend
  // ==========================================

  async function confirmarReserva() {
    if (submitting) return;

    limpiarError();

    if (!validarPaso2()) {
      cambiarPaso("p2");
      return;
    }

    if (availabilityLoading) {
      mostrarError(
        "Espera a que termine la consulta de disponibilidad."
      );

      return;
    }

    const metodo = obtenerMetodoPago();

    const payload = {
      date: elementos.fecha.value,
      time: elementos.hora.value,
      tableNumber: obtenerMesaSeleccionada(),
      partySize: Number(elementos.personas.value),
      contactPhone: elementos.telefono.value.trim(),
      contactEmail: elementos.correo.value.trim(),
      paymentMethod: metodo,
      termsAccepted: elementos.terminos.checked,
    };

    const boton = elementos.botonConfirmar;

    submitting = true;
    boton.disabled = true;
    boton.textContent = "Registrando reserva...";

    try {
      await MesaAuth.ready;

      if (!MesaAPI.session?.user) {
        mostrarError(
          "Debes iniciar sesión para registrar tu reserva."
        );

        MesaAuth.open("login");
        return;
      }

      const path =
        "/restaurants/" +
        encodeURIComponent(restaurantId) +
        "/branches/" +
        encodeURIComponent(selectedBranch._id) +
        "/reservations";

      const respuesta = await MesaAPI.request(path, {
        method: "POST",
        authenticated: true,
        body: payload,
      });

      const reserva = respuesta.data || respuesta;

      if (!reserva.code || !reserva._id) {
        throw new Error(
          "El servidor no devolvió los datos esperados de la reserva."
        );
      }


      mostrarConfirmacion(reserva);

    } catch (error) {
      console.error("Error al registrar la reserva:", error);

      if (error.status === 401) {
        mostrarError(
          "Tu sesión ha expirado. Inicia sesión para continuar."
        );

        MesaAuth.open("login");

      } else if (error.status === 409) {
        mostrarError(
          "La disponibilidad cambió mientras realizabas la reserva. Estamos actualizando los horarios. Regresa y selecciona otra mesa u horario."
        );

        await cargarDisponibilidad(elementos.fecha.value);

        cambiarPaso("p2");

      } else if (error.status === 400) {
        const detalles = Array.isArray(error.details)
          ? error.details.join(" ")
          : "";

        mostrarError(
          [error.message, detalles].filter(Boolean).join(" ") ||
          "Revisa los datos ingresados e inténtalo nuevamente."
        );

      } else {
        mostrarError(
          error.message ||
          "No pudimos registrar la reserva. Puedes intentarlo nuevamente."
        );
      }

    } finally {
      submitting = false;

      boton.disabled = false;
      boton.textContent = "Confirmar reserva";
    }
  }

  // ==========================================
  // Navegación entre pasos
  // ==========================================

  elementos.botonNext1.addEventListener("click", () => {
    if (!validarPaso1()) return;

    limpiarError();
    cambiarPaso("p2");
  });

  elementos.botonBack1.addEventListener("click", () => {
    cambiarPaso("p1");
  });

  elementos.botonNext3.addEventListener("click", () => {
    if (!validarPaso2()) return;

    limpiarError();
    actualizarResumen();
    cambiarPaso("p3");
  });

  elementos.botonBack2.addEventListener("click", () => {
    limpiarError();
    cambiarPaso("p2");
  });

  elementos.botonConfirmar.addEventListener(
    "click",
    confirmarReserva
  );

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

    actualizarResumen();

    cargarDisponibilidad(elementos.fecha.value);
  });

  // ==========================================
  // Eventos de fecha, hora y personas
  // ==========================================

  elementos.fecha.min = obtenerFechaLocal();

  elementos.fecha.addEventListener("change", () => {
    limpiarError();

    elementos.hora.value = "";

    cargarDisponibilidad(elementos.fecha.value);
    actualizarResumen();
  });

  elementos.hora.addEventListener("change", () => {
    limpiarError();

    selectedTableNumber = obtenerMesaSeleccionada();

    actualizarMesas();
    actualizarResumen();
  });

  elementos.personas.addEventListener("change", () => {
    limpiarError();

    selectedTableNumber = obtenerMesaSeleccionada();

    if (availability) {
      actualizarHorarios();
      actualizarMesas();
    }

    actualizarResumen();
  });

  elementos.telefono.addEventListener("input", () => {
    elementos.telefono.setCustomValidity("");
    limpiarError();
  });

  elementos.correo.addEventListener("input", limpiarError);

  elementos.terminos.addEventListener("change", limpiarError);

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
      if (
        !restaurantId ||
        !/^[a-f0-9]{24}$/i.test(restaurantId)
      ) {
        throw new Error(
          "No se recibió un identificador válido del restaurante."
        );
      }

      const { data } = await MesaAPI.request(
        "/restaurants/" + encodeURIComponent(restaurantId)
      );

      restaurant = data;

      const resultadoSedes = await MesaAPI.all(
        "/restaurants/" +
        encodeURIComponent(restaurantId) +
        "/branches"
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

      actualizarResumen();

    } catch (error) {
      console.error(
        "Error al cargar los datos de la reserva:",
        error
      );

      elementos.nombre.textContent =
        "No se pudo cargar el restaurante";

      elementos.direccion.textContent = error.message;

      elementos.contenedorSede.hidden = true;
    }
  }

  cargarDatosIniciales();

})();
