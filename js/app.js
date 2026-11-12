// ==========================================
// Controles comunes de los diálogos y animaciones
// ==========================================

(() => {
  "use strict";
  const { $: seleccionar, modal: abrirModal, element: crearElemento } = MesaUI;
  const dialog = seleccionar("#modal");
  // ==========================================
  // Cerrar el diálogo con el botón de cierre
  // ==========================================
  const cerrarDialogo = () => dialog.close();

  // ==========================================
  // Restaurar el desplazamiento al cerrar el diálogo
  // ==========================================
  const restaurarDesplazamiento = () => {
    document.body.style.overflow = "";
  };

  // ==========================================
  // Controlar el cierre del formulario con Escape
  // ==========================================
  const controlarCancelacion = (event) => {
    if (dialog.classList.contains("register-modal")) event.preventDefault();
  };

  // ==========================================
  // Cerrar el diálogo al pulsar fuera cuando corresponda
  // ==========================================
  const cerrarAlPulsarFuera = (event) => {
    if (dialog.classList.contains("register-modal")) return;
    const r = dialog.getBoundingClientRect();
    if (
      event.target === dialog &&
      (event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom)
    )
      dialog.close();
  };

  // ==========================================
  // Mostrar la información para planear una visita
  // ==========================================
  const mostrarAyudaDeVisita = () => {
    abrirModal("Planea tu visita").append(
      crearElemento(
        "p",
        "modal-description",
        "Consulta restaurantes, horarios y contactos. Las reservas y la disponibilidad de mesas aún no están habilitadas.",
      ),
    );
  };

  // ==========================================
  // Abrir el diálogo asociado al acceso de información
  // ==========================================
  const mostrarInformacionGeneral = (event) => {
    const trigger = event.target.closest("[data-info]");
    if (!trigger) return;
    const [title, description] = info[trigger.dataset.info] || [
      "MesaSpot",
      "Esta función aún no está disponible.",
    ];
    abrirModal(title).append(
      crearElemento("p", "modal-description", description),
    );
  };

  // Eventos de la interfaz.
  seleccionar("#close-modal")?.addEventListener("click", cerrarDialogo);
  dialog?.addEventListener("close", restaurarDesplazamiento);
  // Solo Registrarse exige cierre explícito con la X; los demás modales se conservan.
  dialog?.addEventListener("cancel", controlarCancelacion);
  dialog?.addEventListener("click", cerrarAlPulsarFuera);
  seleccionar("#date-trigger")?.addEventListener("click", mostrarAyudaDeVisita);
  const info = {
    notifications: [
      "Notificaciones",
      "Todavía no hay notificaciones disponibles.",
    ],
    terms: [
      "Términos de servicio",
      "MesaSpot permite descubrir restaurantes y compartir opiniones. Confirma precios y condiciones con cada local.",
    ],
    privacy: [
      "Privacidad",
      "Tu perfil y tus reseñas se guardan en MesaSpot. Tu nombre y avatar aparecen junto a tus opiniones; el correo no se muestra públicamente.",
    ],
    cookies: [
      "Sesión",
      "Puedes cerrar la sesión de este navegador desde Mi perfil.",
    ],
    conditions: [
      "Reservas",
      "Las reservas todavía no están disponibles. Consulta los datos de contacto del restaurante.",
    ],
    support: [
      "Soporte",
      "Consulta la información de contacto de cada restaurante para dudas sobre sus platos y horarios.",
    ],
    join: [
      "Únete como restaurante",
      "Solicita una cuenta de administrador al equipo de MesaSpot para gestionar tu restaurante.",
    ],
    faq: [
      "Preguntas frecuentes",
      "Puedes explorar sin registrarte. Para escribir una reseña necesitas una cuenta de cliente.",
    ],
    favorites: [
      "Restaurantes destacados",
      "Encuentra los restaurantes destacados desde el inicio.",
    ],
    experiences: [
      "Experiencias culinarias",
      "Explora la carta, las fotos y las promociones de cada restaurante.",
    ],
    press: ["MesaSpot", "Descubrimiento gastronómico en Lima Metropolitana."],
  };
  document.addEventListener("click", mostrarInformacionGeneral);
  if (window.AOS && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    AOS.init({ duration: 650, once: true, offset: 45 });
    document.body.classList.add("aos-ready");
  }
})();
