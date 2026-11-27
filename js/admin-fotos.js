// ==========================================
// Galería, filtros y formulario de fotografías del restaurante
// ==========================================
(() => {
  "use strict";
  const U = MesaAdminUI;

  // ==========================================
  // Mostrar la galería con sus filtros y paginación
  // ==========================================
  function mostrar(contenedor, contexto) {
    let pagina = 1;
    let tipo = "";
    let operacion = 0;
    contenedor.replaceChildren(
      U.cabecera(
        "Galería de fotos",
        "Organiza las imágenes que muestran la esencia de tu restaurante.",
        [
          U.boton("Agregar foto", () => editarFoto(), "plus"),
          U.enlacePublico(contexto),
        ],
      ),
    );
    const filtros = U.crearElemento("div", "owner-filters");
    const local = U.campo(filtros, "filter-branch", "Local", "", {
      opciones: [
        ["", "Todos los locales"],
        ...contexto.locales.map((local) => [local._id, local.name]),
      ],
    });
    const estado = U.campo(filtros, "filter-status", "Estado", "PUBLISHED", {
      opciones: [
        ["", "Todos los estados"],
        ...["PUBLISHED", "DRAFT", "ARCHIVED"].map((codigo) => [
          codigo,
          U.traducir(codigo),
        ]),
      ],
    });
    const categorias = U.crearElemento("div", "owner-tabs");
    categorias.setAttribute("aria-label", "Tipos de fotografía");
    const disposicion = U.crearElemento("div", "owner-gallery-layout");
    const resultados = U.crearElemento("div");
    const editor = U.crearElemento("aside", "owner-photo-editor");
    editor.hidden = true;
    disposicion.append(resultados, editor);
    contenedor.append(filtros, categorias, disposicion);
    local.addEventListener("change", () => {
      pagina = 1;
      cargarFotos();
    });
    estado.addEventListener("change", () => {
      pagina = 1;
      cargarFotos();
    });

    // ==========================================
    // Consultar fotografías y contadores sin mezclar respuestas anteriores
    // ==========================================
    async function cargarFotos() {
      const actual = ++operacion;
      resultados.setAttribute("aria-busy", "true");
      try {
        const consulta = {
          page: pagina,
          limit: 8,
          branchId: local.value,
          status: estado.value,
          type: tipo,
        };
        const [respuesta, resumen] = await Promise.all([
          contexto.peticion("/photos" + MesaAPI.query(consulta)),
          contexto.peticion(
            "/photos/summary" +
              MesaAPI.query({
                branchId: local.value,
                status: estado.value || undefined,
              }),
          ),
        ]);
        if (actual !== operacion || !contexto.vigente()) return;
        categorias.replaceChildren();
        const total = estado.value ? resumen.data.total : null;
        for (const [codigo, titulo] of [
          ["", "Todas"],
          ...contexto.metadata.photoTypes.map((codigo) => [
            codigo,
            U.traducir(codigo),
          ]),
        ]) {
          const cantidad = estado.value
            ? codigo
              ? resumen.data.byType[codigo]
              : total
            : null;
          const control = U.boton(
            titulo + (cantidad === null ? "" : " " + cantidad),
            () => {
              tipo = codigo;
              pagina = 1;
              cargarFotos();
            },
            null,
            "owner-tab",
          );
          control.setAttribute("aria-pressed", String(codigo === tipo));
          categorias.append(control);
        }
        resultados.replaceChildren();
        if (!respuesta.data.length)
          U.mensaje(
            resultados,
            "No hay fotografías en esta selección",
            "Agrega una foto o cambia los filtros para ver otras imágenes.",
          );
        else {
          const galeria = U.crearElemento("div", "owner-photo-grid");
          for (const foto of respuesta.data) galeria.append(crearFoto(foto));
          resultados.append(galeria);
        }
        U.paginar(resultados, respuesta.meta, (elegida) => {
          pagina = elegida;
          cargarFotos();
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
          "No pudimos cargar las fotos",
          error.message,
          U.boton("Volver a intentar", cargarFotos, "rotate-cw"),
        );
      } finally {
        if (actual === operacion) resultados.removeAttribute("aria-busy");
      }
    }

    // ==========================================
    // Construir una fotografía con sus acciones administrativas
    // ==========================================
    function crearFoto(foto) {
      const tarjeta = U.crearElemento("article", "owner-photo");
      const imagen = U.crearElemento("div", "owner-photo-picture");
      imagen.append(U.crearImagen(foto.url, foto.altText || foto.title));
      const acciones = U.crearElemento("div", "owner-photo-actions");
      const editar = U.boton(
        "",
        () => editarFoto(foto),
        "pencil",
        "owner-icon",
      );
      editar.setAttribute("aria-label", "Editar foto: " + foto.title);
      acciones.append(editar);
      if (foto.status !== "ARCHIVED") {
        const archivar = U.boton(
          "",
          () => contexto.archivar("/photos", foto),
          "archive",
          "owner-icon",
        );
        archivar.setAttribute("aria-label", "Archivar foto: " + foto.title);
        acciones.append(archivar);
      }
      imagen.append(acciones);
      const texto = U.crearElemento("div", "owner-photo-description");
      texto.append(
        U.crearElemento("h3", "", foto.title),
        U.crearElemento(
          "p",
          "owner-muted",
          U.traducir(foto.type) +
            " · " +
            (contexto.locales.find((local) => local._id === foto.branchId)
              ?.name || "Todos los locales"),
        ),
        U.insignia(foto.status),
      );
      tarjeta.append(imagen, texto);
      return tarjeta;
    }

    // ==========================================
    // Abrir el editor lateral para agregar o modificar una foto
    // ==========================================
    function editarFoto(foto = {}) {
      if (!U.permitirSalida()) return;
      editor.hidden = false;
      disposicion.classList.add("has-editor");
      const formulario = U.formulario();
      const tarjeta = U.tarjeta(foto._id ? "Editar foto" : "Agregar foto");
      const vista = U.crearElemento("div", "owner-photo-preview");
      vista.append(
        U.crearImagen(
          foto.url,
          foto.altText || "Vista previa de la fotografía",
        ),
      );
      tarjeta.append(vista);
      const url = U.campo(tarjeta, "url", "URL de la imagen", foto.url, {
        tipo: "url",
        required: true,
        ayuda: "Selecciona una imagen ya alojada. Usa una URL HTTP o HTTPS.",
      });
      url.addEventListener("change", () =>
        vista.replaceChildren(
          U.crearImagen(url.value, "Vista previa de la fotografía"),
        ),
      );
      const titulo = U.campo(tarjeta, "title", "Título", foto.title, {
        required: true,
        maxLength: 150,
      });
      const alternativo = U.campo(
        tarjeta,
        "altText",
        "Texto alternativo",
        foto.altText,
        {
          maxLength: 300,
          ayuda: "Describe la imagen para quienes usan lectores de pantalla.",
        },
      );
      const grupo = U.crearElemento("div", "owner-form-grid");
      const tipoFoto = U.campo(grupo, "type", "Tipo", foto.type || "AMBIENCE", {
        required: true,
        opciones: contexto.metadata.photoTypes.map((codigo) => [
          codigo,
          U.traducir(codigo),
        ]),
      });
      const sede = U.campo(grupo, "branchId", "Local", foto.branchId, {
        opciones: [
          ["", "Sin local específico"],
          ...contexto.locales
            .filter(
              (local) =>
                local.status === "ACTIVE" || local._id === foto.branchId,
            )
            .map((local) => [local._id, local.name]),
        ],
      });
      const plato = U.campo(
        grupo,
        "menuItemId",
        "Plato vinculado",
        foto.menuItemId,
        {
          opciones: [
            ["", "Sin plato vinculado"],
            ...contexto.platos
              .filter(
                (plato) =>
                  plato.status === "ACTIVE" || plato._id === foto.menuItemId,
              )
              .map((plato) => [plato._id, plato.name]),
          ],
        },
      );
      const orden = U.campo(grupo, "sortOrder", "Orden", foto.sortOrder || 0, {
        tipo: "number",
        required: true,
        min: 0,
        max: 100000,
        step: 1,
      });
      tarjeta.append(grupo);
      const publicacion = U.campo(
        tarjeta,
        "status",
        "Estado",
        foto.status || "PUBLISHED",
        {
          opciones: ["PUBLISHED", "DRAFT", "ARCHIVED"].map((codigo) => [
            codigo,
            U.traducir(codigo),
          ]),
        },
      );
      formulario.append(tarjeta);
      U.accionesFormulario(formulario, cerrarEditor, "Guardar foto");
      formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        U.guardar(
          formulario,
          () => {
            if (!MesaUI.safeUrl(url.value.trim())) {
              U.errorCampo(url, "Usa una URL HTTP o HTTPS.");
              throw new Error("Revisa la dirección de la fotografía.");
            }
            return {
              title: titulo.value.trim(),
              url: url.value.trim(),
              altText: alternativo.value.trim() || null,
              type: tipoFoto.value,
              branchId: sede.value || null,
              menuItemId: plato.value || null,
              sortOrder: Number(orden.value),
              status: publicacion.value,
            };
          },
          (cuerpo) =>
            contexto.peticion("/photos" + (foto._id ? "/" + foto._id : ""), {
              method: foto._id ? "PATCH" : "POST",
              body: cuerpo,
            }),
          async () => {
            await contexto.actualizar();
            U.confirmarExito(
              "La fotografía se guardó correctamente en tu galería.",
            );
          },
        );
      });
      editor.replaceChildren(formulario);
      editor.scrollIntoView({ block: "nearest", behavior: "auto" });
      url.focus({ preventScroll: true });
    }

    // ==========================================
    // Cerrar el editor conservando la lista y sus filtros
    // ==========================================
    function cerrarEditor() {
      if (!U.permitirSalida()) return;
      editor.hidden = true;
      editor.replaceChildren();
      disposicion.classList.remove("has-editor");
    }

    cargarFotos();
  }

  window.MesaAdminFotos = { mostrar };
})();
