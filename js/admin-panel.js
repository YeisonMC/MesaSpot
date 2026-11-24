// ==========================================
// Navegación y acceso al panel del dueño del restaurante
// ==========================================
(() => {
  "use strict";
  const U = MesaAdminUI;
  const pantalla = document.querySelector("#owner-screen");
  const selector = document.querySelector("#owner-selector");
  const navegacion = document.querySelector("#owner-navigation");
  const cuenta = document.querySelector("#owner-account");
  const menu = document.querySelector("#owner-menu");
  const fondo = document.querySelector("#owner-backdrop");
  const lateral = document.querySelector("#owner-sidebar");
  const movil = matchMedia("(max-width: 900px)");
  const parametros = new URLSearchParams(location.search);
  const promocionAnterior =
    parametros.get("vista") === "clasica" &&
    parametros.get("seccion") === "promotions";
  const clasico = parametros.get("vista") === "clasica" && !promocionAnterior;
  const vistas = {
    restaurante: MesaAdminRestaurante,
    locales: MesaAdminLocales,
    resenas: MesaAdminResenas,
    reservas: MesaAdminReservas,
    fotos: MesaAdminFotos,
    platos: MesaAdminPlatos,
    promociones: MesaAdminPromociones,
  };
  let restaurantes = [],
    contexto,
    controlador,
    operacion = 0,
    comprobada = false;
  let vista = Object.hasOwn(vistas, location.hash.slice(1))
    ? location.hash.slice(1)
    : promocionAnterior
      ? "promociones"
      : "restaurante";

  // ==========================================
  // Abrir y cerrar el menú lateral en dispositivos pequeños
  // ==========================================
  function alternarMenu(abrir) {
    const visible = abrir && movil.matches;
    lateral.classList.toggle("is-open", visible);
    fondo.hidden = !visible;
    menu.setAttribute("aria-expanded", String(visible));
    menu.setAttribute(
      "aria-label",
      visible ? "Cerrar menú administrativo" : "Abrir menú administrativo",
    );
    lateral.inert = movil.matches && !visible;
    document.querySelector("#owner-content").inert = visible;
    document.body.classList.toggle("owner-menu-open", visible);
    if (visible) lateral.querySelector("a, button, select")?.focus();
  }

  // ==========================================
  // Construir el menú conservando las herramientas existentes
  // ==========================================
  function mostrarNavegacion() {
    navegacion.replaceChildren();
    const enlaces = [
      ["Resumen", "layout-dashboard", null],
      ["Restaurante", "store", "restaurante"],
      ["Locales", "map-pin", "locales"],
      ["Fotos", "images", "fotos"],
      ["Platos", "utensils", "platos"],
      ["Promociones", "badge-percent", "promociones"],
      ["Reseñas", "message-square", "resenas"],
      ["Reservas", "calendar-days", "reservas"],
    ];
    for (const [titulo, icono, destino] of enlaces) {
      const enlace = U.crearElemento(
        destino ? "a" : "button",
        "owner-nav-item",
      );
      enlace.append(MesaIcons.icon(icono), U.crearElemento("span", "", titulo));
      if (!destino) {
        enlace.type = "button";
        enlace.disabled = true;
        enlace.append(U.crearElemento("small", "", "Próximo bloque"));
      } else if (Object.hasOwn(vistas, destino)) {
        enlace.href =
          "administracion.html" +
          MesaAPI.query({ restaurante: contexto?.restaurante?._id }) +
          "#" +
          destino;
        if (!clasico)
          enlace.addEventListener("click", (evento) => {
            evento.preventDefault();
            if (U.permitirSalida()) {
              location.hash = destino;
              alternarMenu(false);
            }
          });
        if (!clasico && destino === vista)
          enlace.setAttribute("aria-current", "page");
      } else {
        enlace.href =
          "administracion.html" +
          MesaAPI.query({
            vista: "clasica",
            seccion: destino,
            restaurante: contexto?.restaurante?._id,
          });
        enlace.addEventListener("click", (evento) => {
          if (!U.permitirSalida()) evento.preventDefault();
        });
        if (clasico && parametros.get("seccion") === destino)
          enlace.setAttribute("aria-current", "page");
      }
      navegacion.append(enlace);
    }
  }

  // ==========================================
  // Mostrar identidad y cierre de sesión de la cuenta actual
  // ==========================================
  function mostrarCuenta(usuario) {
    cuenta.replaceChildren();
    if (!usuario) return;
    const avatar = usuario.avatarUrl
      ? U.crearImagen(usuario.avatarUrl, "", "owner-avatar")
      : U.crearElemento(
          "span",
          "owner-avatar",
          (usuario.firstName || "U").slice(0, 1),
        );
    const identidad = U.crearElemento("div");
    identidad.append(
      U.crearElemento("strong", "", usuario.firstName + " " + usuario.lastName),
      U.crearElemento("small", "owner-muted", "Cuenta del restaurante"),
    );
    const salir = U.boton(
      "",
      () => {
        if (U.permitirSalida()) MesaAPI.logout();
      },
      "log-out",
      "owner-icon",
    );
    salir.setAttribute("aria-label", "Cerrar sesión");
    cuenta.append(avatar, identidad, salir);
  }

  // ==========================================
  // Elegir un negocio sin mezclar contenido entre restaurantes
  // ==========================================
  function mostrarSelector(elegido) {
    selector.replaceChildren();
    const eleccion = U.campo(
      selector,
      "restaurant",
      "Tu restaurante",
      elegido?._id || "",
      {
        opciones: restaurantes.length
          ? restaurantes.map((restaurante) => [
              restaurante._id,
              restaurante.name,
            ])
          : [["", "Sin restaurante"]],
      },
    );
    eleccion.addEventListener("change", () => {
      if (!U.permitirSalida()) {
        eleccion.value = elegido?._id || "";
        return;
      }
      if (clasico) {
        location.href =
          "administracion.html" +
          MesaAPI.query({ restaurante: eleccion.value }) +
          "#restaurante";
        return;
      }
      cargarRestaurante(eleccion.value);
      alternarMenu(false);
    });
    const crear = U.boton(
      "Crear restaurante",
      () => {
        if (!U.permitirSalida()) return;
        if (clasico) {
          location.href = "administracion.html?crear=1";
          return;
        }
        vista = "restaurante";
        history.replaceState(null, "", "administracion.html#restaurante");
        cargarRestaurante(null);
      },
      "plus",
      "owner-button owner-create",
    );
    selector.append(crear);
  }

  // ==========================================
  // Consultar un negocio y los catálogos necesarios para los formularios
  // ==========================================
  async function cargarRestaurante(id) {
    controlador?.abort();
    controlador = new AbortController();
    const signal = controlador.signal;
    const actual = ++operacion;
    pantalla.setAttribute("aria-busy", "true");
    if (!clasico)
      pantalla.replaceChildren(
        U.crearElemento(
          "p",
          "owner-loading",
          "Cargando información del restaurante…",
        ),
      );
    try {
      const base =
        "/admin/restaurants" + (id ? "/" + encodeURIComponent(id) : "");
      const opciones = { authenticated: true, signal };
      const resultados = await Promise.all([
        MesaAPI.request("/metadata", { signal }),
        id ? MesaAPI.request(base, opciones) : Promise.resolve({ data: null }),
        id
          ? MesaAPI.all(base + "/branches", {}, opciones)
          : Promise.resolve([]),
        id ? MesaAPI.all(base + "/photos", {}, opciones) : Promise.resolve([]),
        id
          ? MesaAPI.all(base + "/menu-items", {}, opciones)
          : Promise.resolve([]),
      ]);
      if (actual !== operacion) return;
      contexto = {
        metadata: resultados[0].data,
        restaurante: resultados[1].data,
        locales: resultados[2],
        fotos: resultados[3],
        platos: resultados[4],
        vigente: () => actual === operacion && !signal.aborted,
        // Cada petición conserva el restaurante y la sesión del contexto de origen.
        peticion: (ruta, opciones = {}) =>
          MesaAPI.request(base + ruta, {
            ...opciones,
            authenticated: true,
            signal,
          }),
        actualizar: async (nuevoId) => {
          const lista = await cargarLista();
          if (actual !== operacion) return;
          restaurantes = lista;
          await cargarRestaurante(nuevoId || id);
        },
        archivar: (recurso, registro) =>
          archivarRecurso(contexto, recurso, registro),
      };
      mostrarSelector(contexto.restaurante);
      mostrarNavegacion();
      if (!clasico) {
        const url = new URL(location.href);
        if (id) url.searchParams.set("restaurante", id);
        else url.searchParams.delete("restaurante");
        url.searchParams.delete("crear");
        if (promocionAnterior) {
          url.searchParams.delete("vista");
          url.searchParams.delete("seccion");
          url.hash = vista;
        }
        history.replaceState(null, "", url);
        if (id) vistas[vista].mostrar(pantalla, contexto);
        else MesaAdminRestaurante.editar(pantalla, contexto);
        document.querySelector("#owner-content").focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    } catch (error) {
      if (actual !== operacion || signal.aborted) return;
      U.mensaje(
        pantalla,
        "No pudimos cargar el restaurante",
        error.message,
        U.boton("Volver a intentar", () => cargarRestaurante(id), "rotate-cw"),
      );
    } finally {
      if (actual === operacion) pantalla.removeAttribute("aria-busy");
    }
  }

  // ==========================================
  // Archivar un recurso con confirmación y gestión de referencias
  // ==========================================
  async function archivarRecurso(origen, recurso, registro) {
    if (U.estado.guardando) return;
    if (
      !window.confirm(
        "¿Archivar «" +
          (registro.name || registro.title) +
          "»? Dejará de mostrarse públicamente.",
      )
    )
      return;
    if (!U.permitirSalida()) return;
    U.estado.guardando = true;
    try {
      await origen.peticion(recurso + (recurso ? "/" + registro._id : ""), {
        method: "DELETE",
      });
      U.estado.cambios = false;
      await origen.actualizar();
      U.confirmarExito("El recurso se archivó correctamente.");
    } catch (error) {
      if (!origen.vigente()) return;
      const contenido = MesaUI.modal("No se pudo archivar", "owner-notice");
      contenido.append(U.crearElemento("p", "", error.message));
      if (error.status === 409)
        contenido.append(
          U.crearElemento(
            "p",
            "owner-muted",
            "Retira primero sus vínculos con portada, miniatura, locales, platos o promociones, según corresponda.",
          ),
        );
    } finally {
      U.estado.guardando = false;
    }
  }

  // ==========================================
  // Cargar únicamente los restaurantes vinculados al propietario
  // ==========================================
  async function cargarLista() {
    return MesaAPI.all("/admin/restaurants", {}, { authenticated: true });
  }

  // ==========================================
  // Comprobar el rol antes de mostrar información del negocio
  // ==========================================
  async function iniciarPanel() {
    const usuario = await MesaAuth.ready;
    comprobada = true;
    await actualizarAcceso(usuario);
  }

  // ==========================================
  // Limpiar los datos privados al salir o cambiar de cuenta
  // ==========================================
  async function actualizarAcceso(usuario) {
    const actual = ++operacion;
    controlador?.abort();
    contexto = null;
    U.estado.cambios = false;
    mostrarCuenta(usuario);
    if (!usuario || usuario.role !== "RESTAURANT_ADMIN") {
      pantalla.hidden = false;
      document.querySelector("#owner-legacy").hidden = true;
      selector.replaceChildren();
      navegacion.replaceChildren();
      pantalla.removeAttribute("aria-busy");
      U.mensaje(
        pantalla,
        usuario
          ? "Esta cuenta no administra restaurantes"
          : "Tu restaurante, en un solo lugar",
        usuario
          ? "Ingresa con una cuenta de dueño de restaurante para acceder a este panel."
          : "Inicia sesión con tu cuenta administradora para gestionar tu negocio.",
        U.boton("Iniciar sesión", () => MesaAuth.open("login"), "log-in"),
      );
      return;
    }
    pantalla.hidden = clasico;
    document.querySelector("#owner-legacy").hidden = !clasico;
    try {
      const lista = await cargarLista();
      if (actual !== operacion) return;
      restaurantes = lista;
      const elegido =
        restaurantes.find(
          (restaurante) => restaurante._id === parametros.get("restaurante"),
        ) || restaurantes[0];
      await cargarRestaurante(parametros.has("crear") ? null : elegido?._id);
    } catch (error) {
      if (actual !== operacion) return;
      pantalla.hidden = false;
      U.mensaje(
        pantalla,
        "No pudimos cargar tus restaurantes",
        error.message,
        U.boton(
          "Volver a intentar",
          () => actualizarAcceso(MesaAPI.session?.user),
          "rotate-cw",
        ),
      );
    }
  }

  // ==========================================
  // Actualizar la sección al navegar por el panel
  // ==========================================
  function cambiarVista() {
    const siguiente = location.hash.slice(1);
    if (clasico || !Object.hasOwn(vistas, siguiente) || siguiente === vista)
      return;
    if (!U.permitirSalida()) {
      history.replaceState(null, "", "#" + vista);
      return;
    }
    vista = siguiente;
    mostrarNavegacion();
    if (contexto?.restaurante) cargarRestaurante(contexto.restaurante._id);
    else if (contexto) MesaAdminRestaurante.editar(pantalla, contexto);
  }

  // ==========================================
  // Mantener el foco dentro del menú móvil cuando está abierto
  // ==========================================
  function controlarTeclado(evento) {
    if (!lateral.classList.contains("is-open")) return;
    if (evento.key === "Escape") {
      alternarMenu(false);
      menu.focus();
    }
    if (evento.key !== "Tab") return;
    const controles = [
      ...lateral.querySelectorAll("a[href], button:not(:disabled), select"),
    ];
    const primero = controles[0],
      ultimo = controles.at(-1);
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  menu.addEventListener("click", () =>
    alternarMenu(menu.getAttribute("aria-expanded") !== "true"),
  );
  fondo.addEventListener("click", () => {
    alternarMenu(false);
    menu.focus();
  });
  movil.addEventListener("change", () => alternarMenu(false));
  document.addEventListener("keydown", controlarTeclado);
  window.addEventListener("hashchange", cambiarVista);
  window.addEventListener("mesa:session", (evento) => {
    if (comprobada) actualizarAcceso(evento.detail);
  });
  window.addEventListener("beforeunload", (evento) => {
    if (U.estado.cambios || U.estado.guardando) {
      evento.preventDefault();
      evento.returnValue = "";
    }
  });
  alternarMenu(false);
  iniciarPanel();
})();
