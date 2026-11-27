// ==========================================
// Vista "Resumen" del panel del propietario
// ==========================================
(() => {
  "use strict";
  const U = MesaAdminUI;
  const el = U.crearElemento;
  const ir = (destino) => () => {
    location.hash = destino;
  };

  // ==========================================
  // Dibujar un ícono dentro de un contenedor suave
  // ==========================================
  function icono(nombre, clase = "res-icono") {
    const caja = el("span", clase);
    caja.append(MesaIcons.icon(nombre));
    return caja;
  }

  // ==========================================
  // Dibujar cinco estrellas según la puntuación
  // ==========================================
  function estrellas(puntos) {
    const fila = el("span", "res-estrellas");
    fila.setAttribute("aria-label", puntos + " de 5 estrellas");
    for (let n = 1; n <= 5; n += 1)
      fila.append(el("span", n <= puntos ? "on" : "off", "★"));
    return fila;
  }

  // ==========================================
  // Fila de indicadores
  // ==========================================
  function indicadores(datos) {
    const v = datos.ratingSummary || {};
    const hay = Number(v.reviewCount) > 0;
    const lista = [
      ["Locales activos", String(datos.counts?.activeBranches ?? 0), "store"],
      ["Platos disponibles", String(datos.counts?.availableDishes ?? 0), "utensils"],
      ["Fotos publicadas", String(datos.counts?.publishedPhotos ?? 0), "image"],
      [
        "Valoración general",
        hay ? Number(v.overall).toFixed(1) + " / 5" : "Sin reseñas",
        "star",
        hay
          ? v.reviewCount + (v.reviewCount === 1 ? " reseña" : " reseñas")
          : "",
      ],
    ];
    const grid = el("div", "res-kpis");
    for (const [etiqueta, valor, ic, sub] of lista) {
      const tarjeta = el("article", "res-kpi");
      const texto = el("div");
      texto.append(el("small", "owner-muted", etiqueta), el("strong", "", valor));
      if (sub) texto.append(el("small", "owner-muted", sub));
      tarjeta.append(icono(ic), texto);
      grid.append(tarjeta);
    }
    return grid;
  }

  // ==========================================
  // Fila de metadatos con ícono
  // ==========================================
  function metadato(ic, contenido) {
    const fila = el("li", "res-meta");
    fila.append(icono(ic, "res-meta-icono"), contenido);
    return fila;
  }

  // ==========================================
  // Tarjeta "Tu restaurante"
  // ==========================================
  function tarjetaRestaurante(r, contexto, contenedor) {
    const tarjeta = U.tarjeta("Tu restaurante", "res-restaurante");
    const portada = r.coverPhoto?.url || r.thumbnailPhoto?.url;
    tarjeta.append(U.crearImagen(portada, r.name, "res-hero"));

    const titulo = el("div", "res-titulo");
    titulo.append(el("h3", "", r.name), U.insignia(r.status));
    tarjeta.append(titulo);

    const sede = r.mainBranch;
    const a = sede?.address || {};
    const direccion = [a.street, a.district, "Lima Metropolitana"]
      .filter(Boolean)
      .join(", ");
    const cocinas = el("span", "res-pills");
    (r.cuisineTypes || []).forEach((c) =>
      cocinas.append(el("span", "res-pill", U.traducir(c))),
    );
    const lista = el("ul", "res-metas");
    lista.append(
      metadato("map-pin", el("span", "", sede ? direccion : "Sin local principal")),
      metadato(
        "utensils",
        cocinas.childNodes.length ? cocinas : el("span", "owner-muted", "Sin tipos de cocina"),
      ),
    );
    if (sede?.averagePricePerPersonCents != null)
      lista.append(
        metadato(
          "banknote",
          el("span", "", "Precio promedio: " + U.dinero(sede.averagePricePerPersonCents) + " por persona"),
        ),
      );
    tarjeta.append(lista);

    const acciones = el("div", "res-acciones");
    const editar = U.boton("Editar información", ir("restaurante"), "pencil");
    const perfil = el("a", "owner-button secondary", "Ver perfil público");
    perfil.prepend(MesaIcons.icon("external-link"));
    if (r.status === "PUBLISHED") {
      perfil.href = MesaUI.detailUrl(r);
      perfil.target = "_blank";
      perfil.rel = "noopener noreferrer";
    } else {
      perfil.setAttribute("aria-disabled", "true");
      perfil.title = "Publica el restaurante para consultar su perfil público.";
    }
    acciones.append(editar, perfil);
    tarjeta.append(acciones);
    return tarjeta;
  }

  // ==========================================
  // Accesos rápidos
  // ==========================================
  function accesos() {
    const lista = [
      ["platos", "utensils", "Actualizar carta", "Edita y gestiona tus platos"],
      ["fotos", "image-plus", "Agregar fotografías", "Sube nuevas fotos de tu restaurante y platos"],
      ["promociones", "ticket", "Crear promoción", "Atrae más clientes con una promoción especial"],
    ];
    const grid = el("div", "res-accesos");
    for (const [destino, ic, titulo, desc] of lista) {
      const a = el("a", "res-acceso");
      a.href = "#" + destino;
      const texto = el("span", "res-acceso-texto");
      texto.append(el("strong", "", titulo), el("small", "owner-muted", desc));
      a.append(icono(ic), texto, el("span", "res-flecha", "→"));
      grid.append(a);
    }
    return grid;
  }

  // ==========================================
  // Tarjeta "Últimas reseñas"
  // ==========================================
  function tarjetaResenas(resenas) {
    const tarjeta = U.tarjeta("Últimas reseñas", "res-resenas");
    if (!resenas.length) {
      tarjeta.append(el("p", "owner-muted", "Aún no hay reseñas publicadas."));
    }
    const lista = el("div", "res-resenas-lista");
    for (const x of resenas.slice(0, 3)) {
      const u = x.userId;
      const nombre = u
        ? (u.firstName || "") + " " + (u.lastName ? u.lastName[0] + "." : "")
        : "Cliente";
      const puntos = Math.round(Number(x.ratings?.overall) || 0);
      const item = el("article", "res-resena");
      const avatar = u?.avatarUrl
        ? U.crearImagen(u.avatarUrl, "", "res-avatar")
        : el("span", "res-avatar", (nombre.trim()[0] || "C").toUpperCase());
      const cuerpo = el("div", "res-resena-cuerpo");
      const cab = el("div", "res-resena-cab");
      const quien = el("div");
      const linea = el("div", "res-resena-linea");
      linea.append(estrellas(puntos), el("small", "owner-muted", puntos + " / 5"));
      quien.append(el("strong", "", nombre.trim()), linea);
      cab.append(quien, U.boton("Responder", ir("resenas"), null, "owner-button secondary res-responder"));
      cuerpo.append(cab, el("p", "owner-muted", x.comment || ""));
      item.append(avatar, cuerpo);
      lista.append(item);
    }
    tarjeta.append(lista);
    const pie = el("a", "res-ver-todas", "Ver todas las reseñas →");
    pie.href = "#resenas";
    tarjeta.append(pie);
    return tarjeta;
  }

  // ==========================================
  // Mostrar la vista completa
  // ==========================================
  async function mostrar(contenedor, contexto) {
    if (!contexto.restaurante) return MesaAdminRestaurante.editar(contenedor, contexto);
    contenedor.replaceChildren(
      el("p", "owner-loading", "Cargando resumen…"),
    );
    try {
      const { data } = await contexto.peticion("/overview");
      if (!contexto.vigente()) return;
      const restaurante = data.restaurant || contexto.restaurante;
      const columnas = el("div", "res-columnas");
      const izq = el("div", "owner-stack");
      izq.append(tarjetaRestaurante(restaurante, contexto, contenedor), accesos());
      columnas.append(izq, tarjetaResenas(data.recentReviews || []));
      contenedor.replaceChildren(
        U.cabecera("Resumen", "Así se muestra tu restaurante en MesaSpot"),
        indicadores(data),
        columnas,
      );
    } catch (error) {
      if (!contexto.vigente()) return;
      U.mensaje(
        contenedor,
        "No pudimos cargar el resumen",
        error.message,
        U.boton("Volver a intentar", () => mostrar(contenedor, contexto), "rotate-cw"),
      );
    }
  }

  window.MesaAdminResumen = { mostrar };
})();
