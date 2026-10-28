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
  function saveSession(value, remember = false) {
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
  class ApiError extends Error {
    constructor(message, status = 0, details = []) {
      super(message);
      this.status = status;
      this.details = details;
    }
  }
  async function request(
    path,
    { method = "GET", body, signal, authenticated = false } = {},
  ) {
    const form = body instanceof FormData;
    let response;
    try {
      response = await fetch(
        `${window.MESA_CONFIG.apiBaseUrl.replace(/\/$/, "")}${path}`,
        {
          method,
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(25000)])
            : AbortSignal.timeout(25000),
          headers: {
            ...(body && !form ? { "Content-Type": "application/json" } : {}),
            ...(authenticated && session?.token
              ? { Authorization: `Bearer ${session.token}` }
              : {}),
          },
          body:
            body === undefined ? undefined : form ? body : JSON.stringify(body),
        },
      );
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw new ApiError(
        "No pudimos conectar con MesaSpot. Revisa tu conexión y que esta página esté permitida en CORS_ORIGINS del backend.",
      );
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      if (response.status === 401 && authenticated) saveSession(null);
      throw new ApiError(
        result?.message || `Error del servidor (${response.status}).`,
        response.status,
        result?.details,
      );
    }
    return result;
  }
  const query = (values) => {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([k, v]) => {
      if (v !== "" && v !== undefined && v !== null) params.set(k, v);
    });
    return params.size ? `?${params}` : "";
  };
  // Recorremos todas las páginas cuando una vista necesita el catálogo completo.
  async function all(path, params = {}, options = {}) {
    const records = [];
    let page = 1,
      totalPages = 1;
    do {
      const result = await request(
        `${path}${query({ ...params, page, limit: 100 })}`,
        options,
      );
      records.push(...result.data);
      totalPages = result.meta?.totalPages || 0;
      page += 1;
    } while (page <= totalPages);
    return records;
  }
  window.MesaAPI = {
    request,
    all,
    query,
    ApiError,
    get session() {
      return session;
    },
    saveSession,
    logout: () => saveSession(null),
    // Conserva el tipo de sesión al actualizar los datos del perfil y del avatar.
    updateUser(user) {
      if (session?.token) saveSession({ ...session, user }, Boolean(localStorage.getItem(key)));
    },
    async refreshUser() {
      if (!session?.token) return null;
      const { data } = await request("/users/me", { authenticated: true });
      saveSession(
        { ...session, user: data },
        Boolean(localStorage.getItem(key)),
      );
      return data;
    },
  };
})();
