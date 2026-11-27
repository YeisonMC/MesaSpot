// ==========================================
// Control de rango de precios del catálogo
// ==========================================

(() => {
  "use strict";
  const min = document.querySelector("#price-min");
  const max = document.querySelector("#price-max");
  if (!min || !max) return;
  const track = document.querySelector(".price-range-track");
  const minLabel = document.querySelector("#price-min-label");
  const maxLabel = document.querySelector("#price-max-label");
  // ==========================================
  // Formatear un extremo del rango en soles
  // ==========================================
  const formatearPrecioEnSoles = (value) =>
    new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
      maximumFractionDigits: 0,
    }).format(value);
  // ==========================================
  // Actualizar extremos, etiquetas y pista del rango
  // ==========================================
  function actualizarRangoDePrecios(changed) {
    // Evitamos que los extremos se crucen y convertimos a céntimos solo al consultar la API.
    if (Number(min.value) > Number(max.value)) {
      if (changed === min) min.value = max.value;
      else max.value = min.value;
    }
    const unlimited = max.value === max.max;
    minLabel.textContent = formatearPrecioEnSoles(Number(min.value));
    maxLabel.textContent = unlimited
      ? "Sin límite"
      : formatearPrecioEnSoles(Number(max.value));
    min.setAttribute("aria-valuetext", minLabel.textContent);
    max.setAttribute("aria-valuetext", maxLabel.textContent);
    track.style.setProperty(
      "--range-min",
      (Number(min.value) / Number(min.max)) * 100 + "%",
    );
    track.style.setProperty(
      "--range-max",
      (Number(max.value) / Number(max.max)) * 100 + "%",
    );
  }
  // ==========================================
  // Restablecer los precios iniciales
  // ==========================================
  function restablecerRangoDePrecios() {
    min.value = min.defaultValue;
    max.value = max.defaultValue;
    actualizarRangoDePrecios();
  }
  // ==========================================
  // Actualizar el rango al mover el mínimo
  // ==========================================
  const actualizarPrecioMinimo = () => actualizarRangoDePrecios(min);

  // ==========================================
  // Actualizar el rango al mover el máximo
  // ==========================================
  const actualizarPrecioMaximo = () => actualizarRangoDePrecios(max);

  // ==========================================
  // Restablecer el rango y avisar al catálogo
  // ==========================================
  const restablecerPreciosDesdeBoton = () => {
    restablecerRangoDePrecios();
    max.dispatchEvent(new Event("change", { bubbles: true }));
  };

  // ==========================================
  // Actualizar el rango después de restablecer el formulario
  // ==========================================
  const actualizarPreciosAlRestablecer = () => {
    queueMicrotask(actualizarRangoDePrecios);
  };

  // Eventos de la interfaz.
  min.addEventListener("input", actualizarPrecioMinimo);
  max.addEventListener("input", actualizarPrecioMaximo);
  document
    .querySelector("#reset-price")
    .addEventListener("click", restablecerPreciosDesdeBoton);
  min.form.addEventListener("reset", actualizarPreciosAlRestablecer);
  // ==========================================
  // Obtener los extremos del rango en céntimos
  // ==========================================
  const obtenerFiltrosDePrecio = () => ({
    minPriceCents: Number(min.value) ? Number(min.value) * 100 : undefined,
    maxPriceCents: max.value === max.max ? undefined : Number(max.value) * 100,
  });

  window.MesaPriceRange = {
    reset: restablecerRangoDePrecios,
    params: obtenerFiltrosDePrecio,
  };
  actualizarRangoDePrecios();
})();
