// ==========================================
// Asistente público del cliente de MesaSpot
// ==========================================
(() => {
  "use strict";
  if (document.body.dataset.page?.startsWith("admin") || document.querySelector("#mesa-assistant")) return;
  if (!window.MesaUI || !window.MesaAPI || !window.MesaIcons) return;

  const { element: crearElemento, button: crearBoton, label: traducirEtiqueta, card: crearTarjeta } = MesaUI;
  const claveConversacion = "mesaspot.assistant.v1";
  const claveAviso = "mesaspot.assistant.hint";
  const claveEspera = "mesaspot.assistant.wait";
  const tiposComida = ["CRIOLLA", "CARNES", "DESAYUNOS", "CHIFA", "POLLERIA", "MAKIS", "MARISCOS", "CAFETERIAS"];
  const distritos = ["Santiago de Surco", "Miraflores", "San Isidro", "Barranco", "San Miguel", "Jesús María", "Pueblo Libre", "Surquillo"];
  const vistaMovil = matchMedia("(max-width: 600px)");
  const movimientoReducido = matchMedia("(prefers-reduced-motion: reduce)");
  const raiz = crearElemento("div", "assistant-root");
  raiz.id = "mesa-assistant";
  const panel = crearElemento("section", "assistant-panel");
  panel.id = "assistant-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-labelledby", "assistant-title");
  panel.setAttribute("aria-modal", "false");
  const contenido = crearElemento("div", "assistant-content");
  const bienvenida = crearElemento("div", "assistant-welcome");
  const conversacion = crearElemento("div", "assistant-conversation");
  conversacion.setAttribute("role", "log");
  conversacion.setAttribute("aria-label", "Conversación con el asistente");
  // Un anuncio breve evita que el lector de pantalla vuelva a leer todas las tarjetas.
  conversacion.setAttribute("aria-live", "off");
  const anuncio = crearElemento("p", "assistant-sr-only");
  anuncio.setAttribute("role", "status");
  anuncio.setAttribute("aria-live", "polite");
  const sugerencias = crearElemento("div", "assistant-suggestions");
  const estado = crearElemento("div", "assistant-feedback");
  estado.hidden = true;
  const formulario = crearElemento("form", "assistant-form");
  const entrada = crearElemento("textarea", "assistant-input");
  const enviar = crearBotonConIcono("Enviar mensaje", "arrow-up", "assistant-send");
  const lanzador = crearBotonConIcono("Abrir asistente de MesaSpot", "bot", "assistant-launcher");
  const aviso = crearElemento("aside", "assistant-hint");
  const historial = [];
  const elementosInertes = new Map();
  let abierto = false;
  let ocupado = false;
  let controlador = null;
  let temporizadorAviso;
  let temporizadorEspera;
  let esperarHasta = Number(leerAlmacenamiento(claveEspera)) || 0;
  let ultimaConsulta = "";

  // ==========================================
  // Leer datos temporales sin depender del permiso de almacenamiento
  // ==========================================
  function leerAlmacenamiento(clave) {
    try { return sessionStorage.getItem(clave); } catch { return null; }
  }

  // ==========================================
  // Guardar únicamente datos públicos de la conversación en esta pestaña
  // ==========================================
  function guardarAlmacenamiento(clave, valor) {
    try {
      if (valor === null) sessionStorage.removeItem(clave);
      else sessionStorage.setItem(clave, valor);
    } catch { /* El chat también funciona cuando el navegador bloquea sessionStorage. */ }
  }

  // ==========================================
  // Crear un control accesible con un icono Lucide centrado
  // ==========================================
  function crearBotonConIcono(etiqueta, icono, clase, accion) {
    const boton = crearBoton("", accion, clase);
    boton.setAttribute("aria-label", etiqueta);
    boton.title = etiqueta;
    boton.append(MesaIcons.icon(icono));
    return boton;
  }

  // ==========================================
  // Construir la ventana flotante, la bienvenida y el formulario
  // ==========================================
  function construirInterfaz() {
    const cabecera = crearElemento("header", "assistant-header");
    const simbolo = crearElemento("span", "assistant-mark");
    simbolo.append(MesaIcons.icon("bot"));
    const identidad = crearElemento("div", "assistant-identity");
    const titulo = crearElemento("h2", "", "Asistente de MesaSpot");
    titulo.id = "assistant-title";
    titulo.tabIndex = -1;
    identidad.append(titulo, crearElemento("p", "", "Asistente IA · Encuentra dónde comer"));
    const nuevo = crearBotonConIcono("Nueva conversación", "message-square-plus", "assistant-icon-button", reiniciarConversacion);
    const cerrar = crearBotonConIcono("Cerrar asistente", "x", "assistant-icon-button", cerrarAsistente);
    cabecera.append(simbolo, identidad, nuevo, cerrar);

    const insignia = crearElemento("div", "assistant-welcome-mark");
    insignia.append(MesaIcons.icon("bot"));
    bienvenida.append(insignia, crearElemento("h3", "", "¿Qué te gustaría comer hoy?"),
      crearElemento("p", "", "Encuentra restaurantes, platos y promociones de MesaSpot."));
    const accesos = crearElemento("div", "assistant-starts");
    for (const [texto, icono, accion] of [
      ["¿Qué promociones hay?", "tag", consultarPromociones],
      ["Explorar tipos de comida", "utensils", elegirTipoDeComida],
      ["Elegir una zona", "map-pin", elegirZona]
    ]) {
      const boton = crearBoton(texto, accion, "assistant-start");
      boton.prepend(MesaIcons.icon(icono));
      boton.append(MesaIcons.icon("arrow-right"));
      accesos.append(boton);
    }
    bienvenida.append(accesos, crearElemento("p", "assistant-welcome-help", "Elige una opción o escribe lo que buscas."));
    contenido.append(bienvenida, conversacion, sugerencias, estado);
    contenido.tabIndex = 0;
    contenido.setAttribute("aria-label", "Mensajes y resultados del asistente");

    entrada.id = "assistant-message";
    entrada.name = "message";
    entrada.rows = 1;
    entrada.maxLength = 600;
    entrada.placeholder = "Escribe tu pregunta…";
    entrada.setAttribute("aria-label", "Tu pregunta para MesaSpot");
    entrada.setAttribute("aria-describedby", "assistant-composer-help");
    const fila = crearElemento("div", "assistant-compose-row");
    enviar.type = "submit";
    fila.append(entrada, enviar);
    const ayuda = crearElemento("p", "assistant-composer-help", "Respuestas basadas en el catálogo de MesaSpot.");
    ayuda.id = "assistant-composer-help";
    formulario.append(fila, ayuda);
    formulario.addEventListener("submit", enviarFormulario);
    entrada.addEventListener("input", actualizarEntrada);
    entrada.addEventListener("keydown", controlarEnvioConTeclado);
    panel.append(cabecera, contenido, formulario, anuncio);
    lanzador.setAttribute("aria-controls", panel.id);
    lanzador.setAttribute("aria-expanded", "false");
    lanzador.addEventListener("click", alternarAsistente);

    const textoAviso = crearBoton("", abrirAsistente, "assistant-hint-content");
    textoAviso.append(crearElemento("strong", "", "¿No sabes dónde comer?"),
      crearElemento("span", "", "Te ayudo a encontrar opciones."));
    aviso.append(textoAviso, crearBotonConIcono("Descartar invitación del asistente", "x", "assistant-icon-button", descartarAviso));
    aviso.hidden = true;
    raiz.append(aviso, panel, lanzador);
    document.body.append(raiz);
    recuperarConversacion();
    actualizarEntrada();
    if (Date.now() < esperarHasta) programarFinDeEspera();
    if (!leerAlmacenamiento(claveAviso)) temporizadorAviso = setTimeout(mostrarAviso, 5000);
  }

  // ==========================================
  // Abrir y cerrar sin exigir una cuenta ni interrumpir la navegación
  // ==========================================
  function alternarAsistente() {
    if (abierto) cerrarAsistente();
    else abrirAsistente();
  }

  // ==========================================
  // Abrir el chat y preparar el foco y las animaciones de entrada
  // ==========================================
  function abrirAsistente() {
    if (abierto) return;
    abierto = true;
    panel.hidden = false;
    raiz.classList.add("assistant-is-open");
    lanzador.setAttribute("aria-expanded", "true");
    lanzador.setAttribute("aria-label", "Cerrar asistente de MesaSpot");
    lanzador.title = "Cerrar asistente de MesaSpot";
    lanzador.replaceChildren(MesaIcons.icon("x"));
    descartarAviso();
    adaptarVista();
    (vistaMovil.matches ? panel.querySelector("#assistant-title") : entrada).focus({ preventScroll: true });
    if (window.AOS && !movimientoReducido.matches && !bienvenida.hidden) {
      bienvenida.setAttribute("data-aos", "fade-up");
      bienvenida.setAttribute("data-aos-duration", "250");
      bienvenida.setAttribute("data-aos-offset", "0");
      bienvenida.setAttribute("data-aos-once", "true");
      AOS.refreshHard();
    }
    desplazarConversacion(true);
  }

  // ==========================================
  // Cerrar conservando la consulta pendiente y el historial de esta pestaña
  // ==========================================
  function cerrarAsistente() {
    abierto = false;
    panel.hidden = true;
    raiz.classList.remove("assistant-is-open");
    lanzador.setAttribute("aria-expanded", "false");
    lanzador.setAttribute("aria-label", "Abrir asistente de MesaSpot");
    lanzador.title = "Abrir asistente de MesaSpot";
    lanzador.replaceChildren(MesaIcons.icon("bot"));
    adaptarVista();
    lanzador.focus({ preventScroll: true });
  }

  // ==========================================
  // Adaptar el chat al teclado móvil y aislar el fondo solo en pantallas pequeñas
  // ==========================================
  function adaptarVista() {
    const modal = abierto && vistaMovil.matches;
    panel.setAttribute("aria-modal", String(modal));
    document.body.classList.toggle("assistant-mobile-open", modal);
    if (modal) {
      for (const elemento of document.body.children) {
        if (elemento === raiz || elemento.matches("dialog, script, style, link") || elementosInertes.has(elemento)) continue;
        elementosInertes.set(elemento, elemento.inert);
        elemento.inert = true;
      }
    } else {
      for (const [elemento, anterior] of elementosInertes) elemento.inert = anterior;
      elementosInertes.clear();
    }
    const ventana = window.visualViewport;
    raiz.style.setProperty("--assistant-viewport-height", `${ventana?.height || window.innerHeight}px`);
    raiz.style.setProperty("--assistant-viewport-top", `${ventana?.offsetTop || 0}px`);
  }

  // ==========================================
  // Controlar Escape y mantener el foco dentro del chat móvil
  // ==========================================
  function controlarTeclado(evento) {
    if (!abierto || document.querySelector("dialog[open]")) return;
    if (evento.key === "Escape") { evento.preventDefault(); cerrarAsistente(); return; }
    if (evento.key !== "Tab" || !vistaMovil.matches) return;
    const controles = [...panel.querySelectorAll("button:not(:disabled), a[href], textarea, [tabindex='0']")]
      .filter(elemento => !elemento.closest("[hidden]"));
    const primero = controles[0];
    const ultimo = controles.at(-1);
    if (evento.shiftKey && (document.activeElement === primero || !panel.contains(document.activeElement))) {
      evento.preventDefault(); ultimo?.focus();
    } else if (!evento.shiftKey && (document.activeElement === ultimo || !panel.contains(document.activeElement))) {
      evento.preventDefault(); primero?.focus();
    }
  }

  // ==========================================
  // Mostrar una invitación discreta una sola vez por pestaña
  // ==========================================
  function mostrarAviso() {
    if (!abierto && !leerAlmacenamiento(claveAviso)) aviso.hidden = false;
  }

  // ==========================================
  // Descartar la invitación sin cerrar ni borrar conversaciones
  // ==========================================
  function descartarAviso() {
    clearTimeout(temporizadorAviso);
    aviso.hidden = true;
    guardarAlmacenamiento(claveAviso, "1");
  }

  // ==========================================
  // Preparar sugerencias locales que no consumen la cuota de Gemini
  // ==========================================
  function mostrarOpciones(texto, opciones) {
    if (ocupado) return;
    bienvenida.hidden = true;
    sugerencias.replaceChildren(crearElemento("p", "assistant-options-title", texto));
    const lista = crearElemento("div", "assistant-chips");
    for (const [etiqueta, accion] of opciones) lista.append(crearBoton(etiqueta, accion, "assistant-chip"));
    sugerencias.append(lista);
    anuncio.textContent = texto;
    desplazarConversacion();
    lista.querySelector("button")?.focus({ preventScroll: true });
  }

  // ==========================================
  // Consultar promociones sin imponer una comida o un distrito inicial
  // ==========================================
  function consultarPromociones() {
    enviarConsulta("¿Qué promociones vigentes hay?");
  }

  // ==========================================
  // Elegir una categoría antes de buscar restaurantes
  // ==========================================
  function elegirTipoDeComida() {
    mostrarOpciones("¿Qué tipo de comida te gustaría explorar?", [
      ...tiposComida.map(codigo => [traducirEtiqueta(codigo), () => enviarConsulta(historial.length
        ? `Ajusta la búsqueda anterior al tipo de comida ${traducirEtiqueta(codigo)}.`
        : `Busca restaurantes de ${traducirEtiqueta(codigo)}.`)]),
      ["Buscar un plato", pedirNombreDelPlato]
    ]);
  }

  // ==========================================
  // Permitir escribir un plato específico sin limitarse a una categoría
  // ==========================================
  function pedirNombreDelPlato() {
    sugerencias.replaceChildren(crearElemento("p", "assistant-options-title", "¿Qué plato te gustaría encontrar? Escríbelo abajo."));
    entrada.focus({ preventScroll: true });
  }

  // ==========================================
  // Ofrecer distritos y permitir escribir cualquier otra zona
  // ==========================================
  function elegirZona() {
    mostrarOpciones("¿En qué distrito te gustaría comer?", [
      ...distritos.map(distrito => [distrito, () => enviarConsulta(historial.length
        ? `Ajusta la búsqueda anterior al distrito de ${distrito}.` : `Busca restaurantes en ${distrito}.`)]),
      ["Otro distrito", escribirOtraZona]
    ]);
  }

  // ==========================================
  // Solicitar una zona que no aparezca entre las opciones rápidas
  // ==========================================
  function escribirOtraZona() {
    sugerencias.replaceChildren(crearElemento("p", "assistant-options-title", "Escribe el distrito donde quieres buscar restaurantes."));
    entrada.focus({ preventScroll: true });
  }

  // ==========================================
  // Ajustar el campo de escritura y evitar envíos vacíos o duplicados
  // ==========================================
  function actualizarEntrada() {
    entrada.style.height = "auto";
    entrada.style.height = `${Math.max(44, Math.min(entrada.scrollHeight, 112))}px`;
    enviar.disabled = ocupado || !entrada.value.trim() || Date.now() < esperarHasta;
    panel.querySelectorAll(".assistant-start, .assistant-chip").forEach(boton => {
      boton.disabled = ocupado || Date.now() < esperarHasta;
    });
  }

  // ==========================================
  // Enviar con Enter y conservar Shift más Enter para escribir otra línea
  // ==========================================
  function controlarEnvioConTeclado(evento) {
    if (evento.key === "Enter" && !evento.shiftKey && !evento.isComposing) {
      evento.preventDefault();
      formulario.requestSubmit();
    }
  }

  // ==========================================
  // Procesar el formulario sin recargar la página
  // ==========================================
  function enviarFormulario(evento) {
    evento.preventDefault();
    enviarConsulta(entrada.value);
  }

  // ==========================================
  // Preparar el historial dentro de los límites de la API
  // ==========================================
  function prepararHistorial() {
    const entradas = [];
    let disponibles = 3600;
    for (const mensaje of historial.slice(-6).reverse()) {
      const texto = mensaje.texto.slice(0, Math.min(1200, disponibles));
      if (!texto) break;
      entradas.unshift({ role: mensaje.rol, content: texto });
      disponibles -= texto.length;
    }
    return entradas;
  }

  // ==========================================
  // Consultar la API pública una sola vez y presentar resultados verificables
  // ==========================================
  async function enviarConsulta(valor) {
    const texto = valor.trim();
    if (!texto || ocupado || Date.now() < esperarHasta) return;
    if (texto.length > 600) { mostrarError("Tu pregunta debe tener como máximo 600 caracteres."); return; }
    const contexto = prepararHistorial();
    ultimaConsulta = texto;
    const mensajeUsuario = { rol: "user", texto };
    historial.push(mensajeUsuario);
    representarMensaje(mensajeUsuario);
    bienvenida.hidden = true;
    sugerencias.replaceChildren();
    estado.hidden = true;
    entrada.value = "";
    ocupado = true;
    controlador = new AbortController();
    const operacion = controlador;
    const esperando = crearElemento("p", "assistant-thinking", "Buscando opciones en MesaSpot");
    esperando.append(crearElemento("span", "assistant-dots", "…"));
    conversacion.append(esperando);
    conversacion.setAttribute("aria-busy", "true");
    anuncio.textContent = "Consultando el catálogo de MesaSpot.";
    actualizarEntrada();
    desplazarConversacion();
    guardarConversacion();
    try {
      const { data } = await MesaAPI.request("/assistant/chat", {
        method: "POST", body: { message: texto, history: contexto }, signal: operacion.signal
      });
      if (controlador !== operacion) return;
      if (!data || typeof data.reply !== "string") throw new Error("La respuesta del asistente no es válida. Intenta más tarde.");
      const mensaje = { rol: "assistant", texto: data.reply.slice(0, 12000), datos: normalizarResultados(data), fecha: Date.now() };
      historial.push(mensaje);
      representarMensaje(mensaje);
      anuncio.textContent = "Respuesta disponible. Puedes revisar las opciones o ajustar tu búsqueda.";
      ofrecerSeguimiento(mensaje.datos);
    } catch (error) {
      if (controlador !== operacion) return;
      // Las consultas fallidas se muestran, pero no se reenvían como contexto al modelo.
      const posicion = historial.indexOf(mensajeUsuario);
      if (posicion !== -1) historial.splice(posicion, 1);
      if (error.status === 429) {
        const segundos = Number(error.retryAfter);
        esperarHasta = Date.now() + (Number.isFinite(segundos) && segundos > 0 ? segundos : 60) * 1000;
        guardarAlmacenamiento(claveEspera, String(esperarHasta));
        programarFinDeEspera();
      }
      mostrarError(error.status === 429 ? "Alcanzamos el límite de consultas. Intenta más tarde."
        : error.code === "ASSISTANT_NOT_CONFIGURED" ? "El asistente todavía no está disponible. Puedes seguir explorando los restaurantes."
          : error.message || "No pudimos conectar con el asistente. Intenta nuevamente.");
    } finally {
      esperando.remove();
      if (controlador === operacion) {
        ocupado = false;
        controlador = null;
        conversacion.setAttribute("aria-busy", "false");
        actualizarEntrada();
        guardarConversacion();
        desplazarConversacion(true);
      }
    }
  }

  // ==========================================
  // Conservar solo resultados públicos y limitar el contenido almacenado
  // ==========================================
  function normalizarResultados(datos) {
    const resultado = { restaurants: [], promotions: [], menuItems: [], hasMore: Boolean(datos.hasMore) };
    for (const campo of ["restaurants", "promotions", "menuItems"]) {
      resultado[campo] = Array.isArray(datos[campo]) ? datos[campo].slice(0, 6).filter(validarResultado) : [];
    }
    return resultado;
  }

  // ==========================================
  // Comprobar referencias antes de construir enlaces de navegación
  // ==========================================
  function validarResultado(elemento) {
    const restaurante = elemento?.restaurant || elemento;
    return Boolean(elemento && /^[a-f\d]{24}$/i.test(elemento._id || "") &&
      /^[a-f\d]{24}$/i.test(restaurante._id || "") && typeof restaurante.name === "string" && Array.isArray(elemento.branches));
  }

  // ==========================================
  // Mostrar texto seguro y reutilizar las tarjetas existentes del catálogo
  // ==========================================
  function representarMensaje(mensaje) {
    const bloque = crearElemento("div", `assistant-message assistant-message--${mensaje.rol}`);
    const datos = mensaje.datos;
    const hayResultados = datos && [...datos.restaurants, ...datos.menuItems, ...datos.promotions].length > 0;
    bloque.append(crearElemento("p", "assistant-bubble", hayResultados ? mensaje.texto.split("\n")[0] : mensaje.texto));
    if (hayResultados) {
      const lista = crearElemento("div", "assistant-results");
      lista.setAttribute("role", "list");
      const elementos = [
        ...datos.restaurants.map(elemento => [elemento, "restaurant"]),
        ...datos.menuItems.map(elemento => [elemento, "dish"]),
        ...datos.promotions.map(elemento => [elemento, "promotion"])
      ];
      for (const [indice, [elemento, tipo]] of elementos.entries()) {
        const tarjeta = crearTarjetaDeResultado(elemento, tipo);
        tarjeta.hidden = indice >= 2;
        lista.append(tarjeta);
      }
      bloque.append(lista);
      if (elementos.length > 2) {
        const mas = crearBoton(`Ver ${elementos.length - 2} opciones más`, () => {
          lista.querySelectorAll("[hidden]").forEach(elemento => { elemento.hidden = false; });
          mas.remove();
        }, "assistant-chip assistant-more");
        bloque.append(mas);
      }
      if (datos.hasMore) bloque.append(crearElemento("p", "assistant-results-note", "Hay más coincidencias. Puedes precisar el distrito o presupuesto."));
      const fecha = new Date(mensaje.fecha);
      if (!Number.isNaN(fecha.getTime())) bloque.append(crearElemento("p", "assistant-results-note",
        `Consultado: ${fecha.toLocaleString("es-PE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}. La disponibilidad puede cambiar.`));
    }
    conversacion.append(bloque);
  }

  // ==========================================
  // Adaptar datos de restaurante, plato o promoción sin cambiar la tarjeta compartida
  // ==========================================
  function crearTarjetaDeResultado(elemento, tipo) {
    const restaurante = elemento.restaurant || elemento;
    const ofertas = (elemento.branchOffers || []).filter(oferta => oferta.available && Number.isInteger(oferta.priceCents));
    const oferta = ofertas.toSorted((a, b) => a.priceCents - b.priceCents)[0];
    const locales = elemento.branches;
    const local = tipo === "dish" ? locales.find(sede => sede._id === oferta?.branchId)
      : locales.toSorted((a, b) => a.averagePricePerPersonCents - b.averagePricePerPersonCents)[0];
    const precio = tipo === "promotion" ? elemento.priceCents : tipo === "dish" ? oferta?.priceCents : local?.averagePricePerPersonCents;
    const tarjeta = crearTarjeta({
      ...restaurante, thumbnail: elemento.image, cuisineTypes: restaurante.cuisineTypes || [],
      displayBranch: { address: local?.address, averagePricePerPersonCents: precio }
    });
    tarjeta.classList.add("assistant-result-card");
    tarjeta.setAttribute("role", "listitem");
    // El endpoint del chat no devuelve valoraciones: no presentamos un promedio inventado.
    tarjeta.querySelector(".rating")?.remove();
    const cuerpo = tarjeta.querySelector(".card-body");
    const meta = tarjeta.querySelector(".card-meta");
    if (tipo !== "restaurant") {
      tarjeta.querySelector("h3 a").textContent = elemento.title || elemento.name;
      cuerpo.insertBefore(crearElemento("p", "assistant-card-venue", `En ${restaurante.name}`), meta);
    }
    if (tipo === "promotion") {
      tarjeta.querySelector(".card-cuisines").replaceChildren(crearElemento("span", "tag", "Promoción"));
      cuerpo.insertBefore(crearElemento("p", "assistant-price-caption", traducirEtiqueta(elemento.pricingUnit)), meta.nextSibling);
      const horarios = crearElemento("p", "assistant-card-note");
      const dias = (elemento.validDays || []).map(dia => ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][dia]).filter(Boolean).join(", ");
      const periodos = (elemento.validTimeRanges || []).map(periodo => `${periodo.opens}–${periodo.closes}${periodo.closesNextDay ? " (+1 día)" : ""}`).join(" / ");
      horarios.textContent = [dias, periodos].filter(Boolean).join(" · ");
      const fin = new Date(new Date(elemento.endsAt).getTime() - 1);
      const vigencia = Number.isNaN(fin.getTime()) ? "" : `Válida hasta el ${fin.toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "long", year: "numeric" })}.`;
      cuerpo.insertBefore(horarios, tarjeta.querySelector(".reserve"));
      cuerpo.insertBefore(crearElemento("p", "assistant-card-note", `${vigencia} ${elemento.availableNow ? "Disponible en este horario." : "Consulta sus días y horarios de uso."}`), tarjeta.querySelector(".reserve"));
      if (elemento.terms) {
        const condiciones = crearElemento("details", "assistant-terms");
        condiciones.append(crearElemento("summary", "", "Ver condiciones"), crearElemento("p", "", elemento.terms));
        cuerpo.insertBefore(condiciones, tarjeta.querySelector(".reserve"));
      }
    } else cuerpo.insertBefore(crearElemento("p", "assistant-price-caption", tipo === "dish" ? "Precio del plato" : "Consumo promedio por persona"), meta.nextSibling);
    tarjeta.querySelectorAll("a").forEach(enlace => enlace.addEventListener("click", guardarConversacion));
    return tarjeta;
  }

  // ==========================================
  // Ofrecer ajustes generales sin fijar un ingrediente ni una ubicación
  // ==========================================
  function ofrecerSeguimiento(datos) {
    const total = datos.restaurants.length + datos.menuItems.length + datos.promotions.length;
    sugerencias.replaceChildren();
    const opciones = crearElemento("div", "assistant-chips");
    opciones.append(crearBoton("Elegir otra zona", elegirZona, "assistant-chip"),
      crearBoton("Explorar otra comida", elegirTipoDeComida, "assistant-chip"));
    if (total) opciones.append(crearBoton("Indicar presupuesto", pedirPresupuesto, "assistant-chip"));
    sugerencias.append(opciones);
  }

  // ==========================================
  // Solicitar un presupuesto abierto en soles
  // ==========================================
  function pedirPresupuesto() {
    sugerencias.replaceChildren(crearElemento("p", "assistant-options-title", "¿Cuál es tu presupuesto máximo en soles? Escríbelo para ajustar la búsqueda."));
    entrada.focus({ preventScroll: true });
  }

  // ==========================================
  // Presentar fallos y permitir un reintento exclusivamente manual
  // ==========================================
  function mostrarError(mensaje) {
    estado.hidden = false;
    const texto = crearElemento("p", "", mensaje);
    texto.prepend(MesaIcons.icon("circle-alert"));
    estado.replaceChildren(texto, crearBoton("Reintentar consulta", reintentarConsulta, "assistant-chip"));
    const boton = estado.querySelector("button");
    boton.disabled = ocupado || Date.now() < esperarHasta;
    anuncio.textContent = mensaje;
  }

  // ==========================================
  // Repetir una consulta solo cuando el usuario lo solicita
  // ==========================================
  function reintentarConsulta() {
    if (ultimaConsulta) enviarConsulta(ultimaConsulta);
    else entrada.focus({ preventScroll: true });
  }

  // ==========================================
  // Rehabilitar los controles tras la espera sin realizar peticiones automáticas
  // ==========================================
  function programarFinDeEspera() {
    clearTimeout(temporizadorEspera);
    const restante = esperarHasta - Date.now();
    if (restante > 0) {
      temporizadorEspera = setTimeout(programarFinDeEspera, Math.min(restante + 50, 2147483647));
      return;
    }
    guardarAlmacenamiento(claveEspera, null);
    actualizarEntrada();
    estado.querySelectorAll("button").forEach(boton => { boton.disabled = ocupado; });
  }

  // ==========================================
  // Desplazar solo los mensajes del chat, sin mover la página del restaurante
  // ==========================================
  function desplazarConversacion(haciaRespuesta = false) {
    if (!abierto) return;
    requestAnimationFrame(() => {
      const ultima = [...conversacion.querySelectorAll(".assistant-message--assistant")].at(-1);
      if (haciaRespuesta && ultima) contenido.scrollTop += ultima.getBoundingClientRect().top - contenido.getBoundingClientRect().top - 12;
      else contenido.scrollTop = contenido.scrollHeight;
    });
  }

  // ==========================================
  // Conservar una conversación breve al navegar entre páginas del cliente
  // ==========================================
  function guardarConversacion() {
    if (historial.length > 12) historial.splice(0, historial.length - 12);
    guardarAlmacenamiento(claveConversacion, JSON.stringify({ fecha: Date.now(), mensajes: historial }));
  }

  // ==========================================
  // Recuperar datos de la pestaña validando su estructura y antigüedad
  // ==========================================
  function recuperarConversacion() {
    try {
      const guardado = JSON.parse(leerAlmacenamiento(claveConversacion) || "null");
      if (!guardado || !Array.isArray(guardado.mensajes) || Date.now() - guardado.fecha > 4 * 60 * 60 * 1000) return;
      for (const dato of guardado.mensajes.slice(-12)) {
        if (!["user", "assistant"].includes(dato?.rol) || typeof dato.texto !== "string") continue;
        const mensaje = { rol: dato.rol, texto: dato.texto.slice(0, dato.rol === "user" ? 600 : 12000), fecha: dato.fecha };
        if (dato.rol === "assistant" && dato.datos) mensaje.datos = normalizarResultados(dato.datos);
        historial.push(mensaje);
        representarMensaje(mensaje);
      }
      bienvenida.hidden = historial.length > 0;
      if (Date.now() < esperarHasta) {
        mostrarError("Alcanzamos el límite de consultas. Intenta más tarde.");
        programarFinDeEspera();
      }
    } catch { guardarAlmacenamiento(claveConversacion, null); }
  }

  // ==========================================
  // Iniciar otra conversación conservando los límites de la cuota gratuita
  // ==========================================
  function reiniciarConversacion() {
    controlador?.abort();
    controlador = null;
    ocupado = false;
    historial.length = 0;
    ultimaConsulta = "";
    entrada.value = "";
    conversacion.replaceChildren();
    conversacion.setAttribute("aria-busy", "false");
    sugerencias.replaceChildren();
    estado.hidden = true;
    bienvenida.hidden = false;
    guardarAlmacenamiento(claveConversacion, null);
    actualizarEntrada();
    anuncio.textContent = "Nueva conversación preparada.";
    entrada.focus({ preventScroll: true });
  }

  construirInterfaz();
  document.addEventListener("keydown", controlarTeclado);
  vistaMovil.addEventListener("change", adaptarVista);
  window.visualViewport?.addEventListener("resize", adaptarVista);
  window.visualViewport?.addEventListener("scroll", adaptarVista);
  window.addEventListener("pagehide", guardarConversacion);
})();
