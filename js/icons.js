(() => {
  "use strict";
  // Usamos la misma fábrica para iconos estáticos y para elementos creados desde la API.
  function icon(name) {
    const key = name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
    const definition = window.lucide?.icons[key];
    if (!definition) return document.createElement("span");
    return lucide.createElement(definition, {
      class: "lucide lucide-" + name,
      "data-lucide": name,
      "aria-hidden": "true",
      focusable: "false",
      "stroke-width": 1.8,
    });
  }
  window.MesaIcons = { icon };
  window.lucide?.createIcons({
    attrs: { "aria-hidden": "true", focusable: "false", "stroke-width": 1.8 },
  });
})();
