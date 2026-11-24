// ==========================================
// Peticiones a la API y sesión del usuario
// ==========================================

(() => {
  "use strict";
  const key = "mesaspot.session";
  let session = null;
  for (const storage of [sessionStorage, localStorage]) {
    try {
      session = JSON.parse(storage.getItem(key) || "null");
    } catch {
      storage.removeItem(key);
    }
    if (session?.token) break;
  }
  // ==========================================
  // Guardar la sesión y avisar del cambio
  // ==========================================
  function guardarSesion(value, remember = false) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
    session = value;
    if (value)
      (remember ? localStorage : sessionStorage).setItem(
        key,
        JSON.stringify(value),
      );
    window.dispatchEvent(
      new CustomEvent("mesa:session", { detail: value?.user || null }),
    );
  }
  // ==========================================
  // Representar un error de la API
  // ==========================================
  class ErrorDeApi extends Error {
    // ==========================================
    // Crear el error con su estado HTTP y sus detalles
    // ==========================================
    constructor(message, status = 0, details = [], metadata = {}) {
      super(message);
      this.status = status;
      this.details = details;
      this.code = metadata.code || null;
      this.retryAfter = metadata.retryAfter || null;
    }
  }
  // ==========================================
  // Enviar una petición y comprobar la respuesta de la API
  // ==========================================
  async function solicitarApi(
    path,
    { method = "GET", body, signal, authenticated = false } = {},
  ) {
    const form = body instanceof FormData;
    const token = authenticated ? session?.token : undefined;
    let response;
    try {
      response = await fetch(
        `${window.MESA_CONFIG.apiBaseUrl.replace(/\/$/, "")}${path}`,
        {
          method,
          // Evitamos reutilizar respuestas HTTP con cabeceras CORS de otro origen local.
          cache: "no-store",
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(25000)])
            : AbortSignal.timeout(25000),
          headers: {
            ...(body && !form ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body:
            body === undefined ? undefined : form ? body : JSON.stringify(body),
        },
      );
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw new ErrorDeApi(
        "No pudimos conectar con MesaSpot. Revisa tu conexión y que esta página esté permitida en CORS_ORIGINS del backend.",
      );
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      if (response.status === 401 && token && session?.token === token)
        guardarSesion(null);
      throw new ErrorDeApi(
        result?.message || `Error del servidor (${response.status}).`,
        response.status,
        result?.details,
        { code: result?.code, retryAfter: response.headers.get("Retry-After") },
      );
    }
    return result;
  }
  // ==========================================
  // Convertir filtros en parámetros de URL
  // ==========================================
  const crearConsulta = (values) => {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([k, v]) => {
      if (v !== "" && v !== undefined && v !== null) params.set(k, v);
    });
    return params.size ? `?${params}` : "";
  };
  // Recorremos todas las páginas cuando una vista necesita el catálogo completo.
  // ==========================================
  // Recorrer todas las páginas de una consulta
  // ==========================================
  async function obtenerTodasLasPaginas(path, params = {}, options = {}) {
    const records = [];
    let page = 1,
      totalPages = 1;
    do {
      const result = await solicitarApi(
        `${path}${crearConsulta({ ...params, page, limit: 100 })}`,
        options,
      );
      records.push(...result.data);
      totalPages = result.meta?.totalPages || 0;
      page += 1;
    } while (page <= totalPages);
    return records;
  }
  // ==========================================
  // Cerrar la sesión y retirar el token guardado
  // ==========================================
  const cerrarSesion = () => guardarSesion(null);

  // ==========================================
  // Actualizar los datos del usuario en la sesión
  // ==========================================
  function actualizarUsuarioDeSesion(user) {
    if (session?.token)
      guardarSesion({ ...session, user }, Boolean(localStorage.getItem(key)));
  }

  // ==========================================
  // Consultar el perfil autenticado y renovar los datos de sesión
  // ==========================================
  async function consultarUsuarioActual() {
    if (!session?.token) return null;
    const { data } = await solicitarApi("/users/me", { authenticated: true });
    guardarSesion(
      { ...session, user: data },
      Boolean(localStorage.getItem(key)),
    );
    return data;
  }

  window.MesaAPI = {
    request: solicitarApi,
    all: obtenerTodasLasPaginas,
    query: crearConsulta,
    ApiError: ErrorDeApi,
    // ==========================================
    // Consultar la sesión actual
    // ==========================================
    get session() {
      return session;
    },
    saveSession: guardarSesion,
    logout: cerrarSesion,
    updateUser: actualizarUsuarioDeSesion,
    refreshUser: consultarUsuarioActual,
  };
})();
