// ==========================================
// Reseñas de comensales: métricas, listado, distribución y respuestas del restaurante
// ==========================================
(() => {
  "use strict";
  const U = MesaAdminUI;
  const MESES_ABREVIADOS = [
    "ene.", "feb.", "mar.", "abr.", "may.", "jun.",
    "jul.", "ago.", "sept.", "oct.", "nov.", "dic.",
  ];
  const ORDENES = [
    ["recent", "Más recientes"],
    ["highest", "Mejor calificadas"],
    ["lowest", "Peor calificadas"],
  ];
  const RUBROS = [
    ["food", "Comida"],
    ["service", "Servicio"],
    ["ambience", "Ambiente"],
  ];
  const RESENAS_POR_PAGINA = 10;
  const MINIMO_RESPUESTA = 3;
  const MAXIMO_RESPUESTA = 2000;

  // ==========================================
  // Volver a dibujar los iconos Lucide presentes en el DOM tras renderizar
  // ==========================================
  function refrescarIconos() {
    window.lucide?.createIcons({
      attrs: { "aria-hidden": "true", focusable: "false", "stroke-width": 1.8 },
    });
  }

  // ==========================================
  // Crear un icono Lucide con data-lucide (parámetro: nombre del icono)
  // ==========================================
  function crearIcono(nombre) {
    return MesaIcons.icon(nombre);
  }

  // ==========================================
  // Dar formato de un decimal a un promedio o mostrar un guion si no existe (parámetro: número o null)
  // ==========================================
  function formatearPromedio(valor) {
    return typeof valor === "number" ? valor.toFixed(1) : "—";
  }

  // ==========================================
  // Convertir una fecha ISO en "17 de ene. de 2025" usando partes UTC (parámetro: fecha ISO)
  // ==========================================
  function formatearFechaVisita(fechaIso) {
    const fecha = new Date(fechaIso);
    if (Number.isNaN(fecha.getTime())) return "fecha no disponible";
    return (
      fecha.getUTCDate() +
      " de " +
      MESES_ABREVIADOS[fecha.getUTCMonth()] +
      " de " +
      fecha.getUTCFullYear()
    );
  }

  // ==========================================
  // Obtener el nombre corto del autor, por ejemplo "Carlos G." (parámetro: usuario o null)
  // ==========================================
  function obtenerNombreAutor(usuario) {
    if (!usuario) return "Comensal";
    const inicial = usuario.lastName ? " " + usuario.lastName.trim().charAt(0) + "." : "";
    return (usuario.firstName || "Comensal").trim() + inicial;
  }

  // ==========================================
  // Crear el avatar circular con la inicial o la foto del autor (parámetro: usuario o null)
  // ==========================================
  function crearAvatarAutor(usuario) {
    if (usuario?.avatarUrl)
      return U.crearImagen(usuario.avatarUrl, "", "owner-resena-avatar");
    return U.crearElemento(
      "span",
      "owner-resena-avatar",
      (usuario?.firstName || "C").trim().charAt(0).toUpperCase(),
    );
  }

  // ==========================================
  // Crear cinco estrellas, rellenando las que correspondan (parámetro: calificación de 1 a 5)
  // ==========================================
  function crearEstrellas(calificacion) {
    const entero = Math.round(calificacion || 0);
    const grupo = U.crearElemento("span", "owner-resena-estrellas");
    grupo.setAttribute("role", "img");
    grupo.setAttribute("aria-label", entero + " de 5 estrellas");
    for (let posicion = 1; posicion <= 5; posicion++) {
      const estrella = U.crearElemento(
        "span",
        "owner-resena-estrella" + (posicion <= entero ? " is-on" : ""),
      );
      estrella.append(crearIcono("star"));
      grupo.append(estrella);
    }
    return grupo;
  }

  // ==========================================
  // Construir una tarjeta métrica (parámetros: icono, título, valor y si es la destacada)
  // ==========================================
  function crearTarjetaMetrica(icono, titulo, valor, destacada = false) {
    const tarjeta = U.crearElemento(
      "article",
      "owner-metrica" + (destacada ? " is-destacada" : ""),
    );
    const cifra = U.crearElemento("strong", "owner-metrica-valor", valor);
    if (destacada) cifra.append(U.crearElemento("span", "owner-metrica-total", " / 5"));
    const texto = U.crearElemento("div", "owner-metrica-texto");
    texto.append(
      ...(destacada
        ? [cifra, U.crearElemento("span", "", titulo)]
        : [U.crearElemento("span", "", titulo), cifra]),
    );
    const marco = U.crearElemento("span", "owner-metrica-icono");
    marco.append(crearIcono(icono));
    tarjeta.append(marco, texto);
    return tarjeta;
  }

  // ==========================================
  // Dibujar las cuatro tarjetas métricas (parámetros: contenedor y resumen de la API o null)
  // ==========================================
  function renderizarMetricas(contenedor, resumen) {
    contenedor.replaceChildren(
      crearTarjetaMetrica("star", "Puntuación general", formatearPromedio(resumen?.overall), true),
      crearTarjetaMetrica("utensils", "Comida", formatearPromedio(resumen?.food)),
      crearTarjetaMetrica("user", "Servicio", formatearPromedio(resumen?.service)),
      crearTarjetaMetrica("armchair", "Ambiente", formatearPromedio(resumen?.ambience)),
    );
    refrescarIconos();
  }

  // ==========================================
  // Dibujar la distribución de calificaciones de 5 a 1 estrellas (parámetros: contenedor y resumen)
  // ==========================================
  function renderizarDistribucion(contenedor, resumen) {
    const distribucion = resumen?.distribution || {};
    const total =
      resumen?.reviewCount ||
      Object.values(distribucion).reduce((suma, cantidad) => suma + cantidad, 0);
    const lista = U.crearElemento("ul", "owner-distribucion");
    for (let estrellas = 5; estrellas >= 1; estrellas--) {
      const cantidad = distribucion[estrellas] || 0;
      const porcentaje = total ? (cantidad / total) * 100 : 0;
      const fila = U.crearElemento("li", "owner-distribucion-fila");
      const barra = U.crearElemento("span", "owner-barra");
      barra.setAttribute("role", "img");
      barra.setAttribute("aria-label", porcentaje.toFixed(1) + "%");
      barra.style.setProperty("--porcentaje", porcentaje.toFixed(1) + "%");
      fila.append(
        U.crearElemento("span", "", estrellas + (estrellas === 1 ? " estrella" : " estrellas")),
        barra,
        U.crearElemento("span", "owner-distribucion-cifra", cantidad + " (" + porcentaje.toFixed(1) + "%)"),
      );
      lista.append(fila);
    }
    contenedor.replaceChildren(U.crearElemento("h2", "", "Distribución de calificaciones"), lista);
  }

  // ==========================================
  // Mostrar la vista de reseñas (parámetros: contenedor de pantalla y contexto del restaurante)
  // ==========================================
  function mostrar(contenedor, contexto) {
    const estado = { pagina: 1, orden: "recent", resenas: [], idRespondiendo: null };
    let operacion = 0;
    const raiz = U.crearElemento("div", "owner-resenas");
    const metricas = U.crearElemento("div", "owner-resenas-metricas");
    const disposicion = U.crearElemento("div", "owner-resenas-layout");
    const principal = U.crearElemento("section", "owner-card owner-resenas-principal");
    const lateral = U.crearElemento("aside", "owner-resenas-lateral");
    const cuadroDistribucion = U.crearElemento("section", "owner-card owner-resenas-distribucion");
    const cuadroRespuesta = U.crearElemento("section", "owner-card owner-resenas-respuesta");
    cuadroRespuesta.hidden = true;
    lateral.append(cuadroDistribucion, cuadroRespuesta);
    disposicion.append(principal, lateral);
    raiz.append(metricas, disposicion);
    contenedor.replaceChildren(
      U.cabecera("Reseñas de comensales", "Conoce sus opiniones y responde desde tu restaurante", [
        U.enlacePublico(contexto),
      ]),
      raiz,
    );
    renderizarMetricas(metricas, null);
    cargarResenas(true);

    // ==========================================
    // Consultar resumen y página de reseñas sin mezclar respuestas antiguas (parámetro: si carga también el resumen)
    // ==========================================
    async function cargarResenas(incluirResumen = false) {
      const actual = ++operacion;
      principal.setAttribute("aria-busy", "true");
      try {
        const consulta = MesaAPI.query({
          page: estado.pagina,
          limit: RESENAS_POR_PAGINA,
          sort: estado.orden,
        });
        const [respuesta, resumen] = await Promise.all([
          contexto.peticion("/reviews" + consulta),
          incluirResumen ? contexto.peticion("/reviews/summary") : Promise.resolve(null),
        ]);
        if (actual !== operacion || !contexto.vigente()) return;
        if (resumen) {
          renderizarMetricas(metricas, resumen.data);
          renderizarDistribucion(cuadroDistribucion, resumen.data);
        }
        estado.resenas = respuesta.data;
        estado.meta = respuesta.meta;
        renderizarResenas();
      } catch (error) {
        if (actual !== operacion || !contexto.vigente() || error.name === "AbortError") return;
        U.mensaje(
          principal,
          "No pudimos cargar las reseñas",
          error.message,
          U.boton("Volver a intentar", () => cargarResenas(true), "rotate-cw"),
        );
      } finally {
        if (actual === operacion) principal.removeAttribute("aria-busy");
      }
    }

    // ==========================================
    // Dibujar cabecera, selector de orden, tarjetas de reseñas y paginación
    // ==========================================
    function renderizarResenas() {
      const total = estado.meta?.total ?? estado.resenas.length;
      const cabecera = U.crearElemento("header", "owner-resenas-cabecera");
      cabecera.append(
        U.crearElemento("h2", "", total + (total === 1 ? " reseña" : " reseñas")),
        crearSelectorOrden(),
      );
      principal.replaceChildren(cabecera);
      if (!estado.resenas.length) {
        const vacio = U.crearElemento("div");
        U.mensaje(
          vacio,
          "Aún no hay reseñas",
          "Cuando tus comensales publiquen sus opiniones, las verás aquí para responderlas.",
        );
        principal.append(vacio);
      } else {
        const lista = U.crearElemento("div", "owner-resenas-lista");
        lista.append(...estado.resenas.map(crearTarjetaResena));
        principal.append(lista);
      }
      if (estado.meta)
        U.paginar(principal, estado.meta, (pagina) => {
          estado.pagina = pagina;
          cargarResenas();
          principal.scrollIntoView({ block: "start", behavior: "auto" });
        });
      refrescarIconos();
    }

    // ==========================================
    // Crear el selector de orden del listado
    // ==========================================
    function crearSelectorOrden() {
      const envoltura = U.crearElemento("div", "owner-resenas-orden");
      const selector = U.crearElemento("select");
      selector.setAttribute("aria-label", "Ordenar reseñas");
      for (const [codigo, texto] of ORDENES) {
        const opcion = U.crearElemento("option", "", texto);
        opcion.value = codigo;
        selector.append(opcion);
      }
      selector.value = estado.orden;
      selector.addEventListener("change", () => cambiarOrden(selector.value));
      envoltura.append(selector, crearIcono("chevron-down"));
      return envoltura;
    }

    // ==========================================
    // Aplicar un nuevo orden y volver a la primera página (parámetro: código de orden)
    // ==========================================
    function cambiarOrden(codigo) {
      estado.orden = codigo;
      estado.pagina = 1;
      cargarResenas();
    }

    // ==========================================
    // Construir la tarjeta de una reseña con su respuesta si existe (parámetro: reseña)
    // ==========================================
    function crearTarjetaResena(resena) {
      const tarjeta = U.crearElemento(
        "article",
        "owner-resena" + (resena._id === estado.idRespondiendo ? " is-respondiendo" : ""),
      );
      tarjeta.dataset.id = resena._id;
      const cabecera = U.crearElemento("div", "owner-resena-cabecera");
      cabecera.append(
        U.crearElemento("strong", "", obtenerNombreAutor(resena.user)),
        crearEstrellas(resena.ratings?.overall),
      );
      const cuerpo = U.crearElemento("div", "owner-resena-cuerpo");
      cuerpo.append(
        cabecera,
        U.crearElemento("h3", "", resena.title),
        U.crearElemento("p", "owner-resena-comentario", resena.comment),
        crearDetallesResena(resena),
      );
      if (resena.adminReply) cuerpo.append(crearBloqueRespuesta(resena));
      tarjeta.append(crearAvatarAutor(resena.user), cuerpo);
      if (!resena.adminReply) {
        const responder = U.boton(
          "Responder",
          () => abrirCuadroRespuesta(resena),
          null,
          "owner-button secondary owner-resena-responder",
        );
        responder.setAttribute("aria-label", "Responder a " + obtenerNombreAutor(resena.user));
        tarjeta.append(responder);
      }
      return tarjeta;
    }

    // ==========================================
    // Crear la fecha de visita y las etiquetas de puntuación por rubro (parámetro: reseña)
    // ==========================================
    function crearDetallesResena(resena) {
      const detalles = U.crearElemento("div", "owner-resena-detalles");
      const fecha = U.crearElemento("span", "owner-resena-fecha");
      fecha.append(
        crearIcono("calendar"),
        U.crearElemento("span", "", "Visitó el " + formatearFechaVisita(resena.visitedAt)),
      );
      detalles.append(fecha, U.crearElemento("span", "owner-resena-separador"));
      for (const [clave, titulo] of RUBROS)
        if (resena.ratings?.[clave] !== undefined)
          detalles.append(
            U.crearElemento("span", "owner-chip-puntuacion", titulo + ": " + resena.ratings[clave]),
          );
      return detalles;
    }

    // ==========================================
    // Crear el bloque "Respuesta de [restaurante]" con sus acciones (parámetro: reseña con respuesta)
    // ==========================================
    function crearBloqueRespuesta(resena) {
      const bloque = U.crearElemento("div", "owner-resena-respuesta");
      const acciones = U.crearElemento("div", "owner-actions");
      acciones.append(
        U.boton("Editar respuesta", () => editarRespuestaResena(resena), "pencil", "owner-button secondary"),
        U.boton("Retirar respuesta", () => retirarRespuestaResena(resena), "x", "owner-button secondary"),
      );
      bloque.append(
        U.crearElemento("strong", "", "Respuesta de " + (contexto.restaurante?.name || "tu restaurante")),
        U.crearElemento("p", "", resena.adminReply.comment),
        acciones,
      );
      return bloque;
    }

    // ==========================================
    // Abrir el cuadro de respuesta para el comensal seleccionado y enfocar el campo de texto (parámetro: reseña)
    // ==========================================
    function abrirCuadroRespuesta(resena) {
      if (!U.permitirSalida()) return;
      const esEdicion = Boolean(resena.adminReply);
      const nombre = (resena.user?.firstName || "Comensal").trim();
      const formulario = U.formulario("owner-resenas-formulario");
      const entrada = U.campo(
        formulario,
        "comment",
        "Tu respuesta a " + nombre,
        resena.adminReply?.comment || "",
        {
          tipo: "textarea",
          required: true,
          minLength: MINIMO_RESPUESTA,
          maxLength: MAXIMO_RESPUESTA,
          rows: 5,
          clase: "owner-resenas-campo",
        },
      );
      const contador = U.crearElemento("small", "owner-resenas-contador");
      formulario.append(contador);
      entrada.addEventListener("input", () => actualizarContador(entrada, contador));
      actualizarContador(entrada, contador);
      U.accionesFormulario(
        formulario,
        cerrarCuadroRespuesta,
        esEdicion ? "Guardar respuesta" : "Publicar respuesta",
      );
      formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        publicarRespuestaResena(resena, formulario, entrada, esEdicion);
      });
      cuadroRespuesta.replaceChildren(
        U.crearElemento("h2", "", (esEdicion ? "Editar respuesta a " : "Responder a ") + nombre),
        formulario,
      );
      cuadroRespuesta.hidden = false;
      estado.idRespondiendo = resena._id;
      marcarResenaSeleccionada();
      refrescarIconos();
      if (!matchMedia("(max-width: 1100px)").matches)
        cuadroRespuesta.scrollIntoView({ block: "nearest", behavior: "auto" });
      entrada.focus({ preventScroll: true });
    }

    // ==========================================
    // Mostrar cuántos caracteres lleva la respuesta (parámetros: campo de texto y elemento contador)
    // ==========================================
    function actualizarContador(entrada, contador) {
      contador.textContent = entrada.value.length + "/" + MAXIMO_RESPUESTA;
    }

    // ==========================================
    // Resaltar en la lista la reseña que se está respondiendo
    // ==========================================
    function marcarResenaSeleccionada() {
      for (const tarjeta of principal.querySelectorAll(".owner-resena"))
        tarjeta.classList.toggle("is-respondiendo", tarjeta.dataset.id === estado.idRespondiendo);
    }

    // ==========================================
    // Ocultar el cuadro de respuesta pidiendo confirmar si hay texto sin guardar
    // ==========================================
    function cerrarCuadroRespuesta() {
      if (!U.permitirSalida()) return;
      ocultarCuadroRespuesta();
    }

    // ==========================================
    // Ocultar y vaciar el cuadro de respuesta sin pedir confirmación
    // ==========================================
    function ocultarCuadroRespuesta() {
      cuadroRespuesta.hidden = true;
      cuadroRespuesta.replaceChildren();
      estado.idRespondiendo = null;
      marcarResenaSeleccionada();
    }

    // ==========================================
    // Enviar la respuesta al servidor y actualizar la reseña (parámetros: reseña, formulario, campo y si es edición)
    // ==========================================
    function publicarRespuestaResena(resena, formulario, entrada, esEdicion) {
      U.guardar(
        formulario,
        () => {
          const texto = entrada.value.trim();
          if (texto.length < MINIMO_RESPUESTA) {
            U.errorCampo(entrada, "Escribe al menos " + MINIMO_RESPUESTA + " caracteres.");
            throw new Error("Tu respuesta es demasiado corta.");
          }
          return { comment: texto };
        },
        (cuerpo) =>
          contexto.peticion("/reviews/" + resena._id + "/reply", { method: "PUT", body: cuerpo }),
        (resenaActualizada) => {
          resena.adminReply = resenaActualizada.adminReply;
          ocultarCuadroRespuesta();
          renderizarResenas();
          U.confirmarExito(
            esEdicion
              ? "La respuesta se actualizó correctamente."
              : "La respuesta se publicó correctamente.",
          );
        },
      );
    }

    // ==========================================
    // Abrir el cuadro con el texto de una respuesta publicada para modificarla (parámetro: reseña)
    // ==========================================
    function editarRespuestaResena(resena) {
      abrirCuadroRespuesta(resena);
    }

    // ==========================================
    // Retirar la respuesta publicada y devolver el botón Responder (parámetro: reseña)
    // ==========================================
    async function retirarRespuestaResena(resena) {
      if (U.estado.guardando) return;
      const nombre = obtenerNombreAutor(resena.user);
      if (!window.confirm("¿Retirar tu respuesta a " + nombre + "? Dejará de mostrarse públicamente."))
        return;
      U.estado.guardando = true;
      try {
        const resultado = await contexto.peticion("/reviews/" + resena._id + "/reply", {
          method: "DELETE",
        });
        if (!contexto.vigente()) return;
        resena.adminReply = resultado.data?.adminReply ?? null;
        if (estado.idRespondiendo === resena._id) {
          U.estado.cambios = false;
          ocultarCuadroRespuesta();
        }
        renderizarResenas();
        U.confirmarExito("La respuesta se retiró. Ya puedes responder de nuevo esta reseña.");
      } catch (error) {
        if (!contexto.vigente()) return;
        const contenido = MesaUI.modal("No se pudo retirar la respuesta", "owner-notice");
        contenido.append(U.crearElemento("p", "", error.message));
      } finally {
        U.estado.guardando = false;
      }
    }
  }

  window.MesaAdminResenas = { mostrar };
})();
