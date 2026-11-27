// ==========================================
// Favoritos de la cuenta en tarjetas, ficha y perfil
// ==========================================

(() => {
  "use strict";
  const ruta = "/users/me/favorites";
  const aviso = MesaUI.element("p", "favorites-feedback");
  aviso.setAttribute("role", "status");
  document.body.append(aviso);

  let cuenta = null;
  let favoritoPendiente = null;
  let temporizador;

  // ==========================================
  // Mostrar el estado de un corazón
  // ==========================================
  function actualizarCorazon(boton) {
    const id = boton.dataset.favorito;
    const guardado = cuenta?.restaurantes.has(id) ?? false;
    const ocupado = cuenta?.operaciones.has(id) ?? false;
    boton.setAttribute("aria-pressed", String(guardado));
    boton.setAttribute("aria-disabled", String(ocupado));
    boton.title = guardado ? "Quitar de favoritos" : "Guardar en favoritos";
  }

  // ==========================================
  // Sincronizar los corazones visibles de la página
  // ==========================================
  function actualizarCorazones() {
    document.querySelectorAll("[data-favorito]").forEach(actualizarCorazon);
  }

  // ==========================================
  // Anunciar el resultado de guardar o quitar un favorito
  // ==========================================
  function anunciar(mensaje) {
    clearTimeout(temporizador);
    aviso.textContent = mensaje;
    temporizador = setTimeout(() => aviso.replaceChildren(), 4500);
  }

  // ==========================================
  // Cargar los favoritos sin duplicar peticiones de la misma cuenta
  // ==========================================
  async function cargarFavoritos(estado) {
    if (estado.cargado) return;
    estado.carga ??= MesaAPI.all(
      ruta,
      {},
      {
        authenticated: true,
        signal: estado.controlador.signal,
      },
    )
      .then((restaurantes) => {
        if (estado !== cuenta) return;
        estado.restaurantes = new Map(
          restaurantes.map((item) => [item._id, item]),
        );
        estado.cargado = true;
        actualizarCorazones();
      })
      .finally(() => {
        estado.carga = null;
      });
    await estado.carga;
  }

  // ==========================================
  // Cambiar de cuenta y recuperar la acción solicitada antes de entrar
  // ==========================================
  function actualizarCuenta(usuario) {
    if ((usuario?._id ?? null) === (cuenta?.id ?? null)) return;
    cuenta?.controlador.abort();
    cuenta = usuario
      ? {
          id: usuario._id,
          restaurantes: new Map(),
          operaciones: new Set(),
          controlador: new AbortController(),
          carga: null,
          cargado: false,
        }
      : null;
    aviso.replaceChildren();
    actualizarCorazones();
    if (!cuenta) return;
    const restaurante = favoritoPendiente;
    favoritoPendiente = null;
    if (restaurante) alternarFavorito(restaurante, true);
    else cargarFavoritos(cuenta).catch(() => {});
  }

  // ==========================================
  // Guardar o quitar un restaurante con confirmación de la API
  // ==========================================
  async function alternarFavorito(restaurante, soloGuardar = false) {
    await sesionPreparada;
    const estado = cuenta;
    if (!estado) {
      favoritoPendiente = restaurante;
      MesaAuth.open("login");
      return;
    }

    const id = restaurante._id;
    if (estado.operaciones.has(id)) return;
    estado.operaciones.add(id);
    actualizarCorazones();
    try {
      await cargarFavoritos(estado);
      if (estado !== cuenta) return;
      const guardado = estado.restaurantes.has(id);
      if (soloGuardar && guardado) {
        anunciar("Este restaurante ya está en tus favoritos.");
        return;
      }
      const { data } = await MesaAPI.request(
        `${ruta}/${encodeURIComponent(id)}`,
        {
          method: guardado ? "DELETE" : "PUT",
          authenticated: true,
          signal: estado.controlador.signal,
        },
      );
      if (estado !== cuenta) return;
      if (guardado) estado.restaurantes.delete(id);
      else estado.restaurantes.set(id, data);
      anunciar(
        guardado
          ? "Restaurante quitado de tus favoritos."
          : "Restaurante guardado en tus favoritos.",
      );
      window.dispatchEvent(
        new CustomEvent("mesa:favoritos", {
          detail: [...estado.restaurantes.values()],
        }),
      );
    } catch (error) {
      if (estado === cuenta) anunciar(error.message);
      else if (!cuenta && error.status === 401)
        anunciar("Vuelve a iniciar sesión para guardar tus favoritos.");
    } finally {
      estado.operaciones.delete(id);
      if (estado === cuenta) actualizarCorazones();
    }
  }

  // ==========================================
  // Crear un botón de favoritos con el icono Lucide
  // ==========================================
  function crearBotonFavorito(restaurante, variante = "card") {
    const boton = MesaUI.element(
      "button",
      `favorite-button favorite-button--${variante}`,
    );
    boton.type = "button";
    boton.dataset.favorito = restaurante._id;
    boton.setAttribute("aria-label", `Favorito: ${restaurante.name}`);
    boton.append(MesaIcons.icon("heart"));
    boton.addEventListener("click", () => alternarFavorito(restaurante));
    actualizarCorazon(boton);
    return boton;
  }

  // ==========================================
  // Obtener los datos de las tarjetas de Favoritos
  // ==========================================
  async function listarFavoritos() {
    await sesionPreparada;
    const estado = cuenta;
    if (!estado) return [];
    await cargarFavoritos(estado);
    return estado === cuenta ? [...estado.restaurantes.values()] : [];
  }

  const sesionPreparada = MesaAuth.ready.then(actualizarCuenta);
  window.addEventListener("mesa:session", (evento) =>
    actualizarCuenta(evento.detail),
  );
  document.querySelector("#modal")?.addEventListener("close", () => {
    favoritoPendiente = null;
  });
  window.MesaFavoritos = {
    crearBoton: crearBotonFavorito,
    listar: listarFavoritos,
  };
})();
