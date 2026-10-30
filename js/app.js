(() => {
  'use strict';
  const { $, modal, element, state, link, money, detailUrl } = MesaUI;
  const dialog = $('#modal');
  $('#close-modal')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('close', () => { document.body.style.overflow = ''; });
  dialog?.addEventListener('click', event => {
    const r = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)) dialog.close();
  });
  $('#date-trigger')?.addEventListener('click', () => {
    modal('Planea tu visita').append(element('p', 'modal-description', 'Consulta restaurantes, horarios y contactos. Las reservas y la disponibilidad de mesas aún no están habilitadas.'));
  });
  const info = {
    notifications: ['Notificaciones', 'Todavía no hay notificaciones disponibles.'],
    terms: ['Términos de servicio', 'MesaSpot permite descubrir restaurantes y compartir opiniones. Confirma precios y condiciones con cada local.'],
    privacy: ['Privacidad', 'Tu perfil y tus reseñas se guardan en MesaSpot. Tu nombre y avatar aparecen junto a tus opiniones; el correo no se muestra públicamente.'],
    cookies: ['Sesión', 'Puedes cerrar la sesión de este navegador desde Mi perfil.'],
    conditions: ['Reservas', 'Las reservas todavía no están disponibles. Consulta los datos de contacto del restaurante.'],
    support: ['Soporte', 'Consulta la información de contacto de cada restaurante para dudas sobre sus platos y horarios.'],
    join: ['Únete como restaurante', 'Solicita una cuenta de administrador al equipo de MesaSpot para gestionar tu restaurante.'],
    faq: ['Preguntas frecuentes', 'Puedes explorar sin registrarte. Para escribir una reseña necesitas una cuenta de cliente.'],
    favorites: ['Restaurantes destacados', 'Encuentra los restaurantes destacados desde el inicio.'],
    experiences: ['Experiencias culinarias', 'Explora la carta, las fotos y las promociones de cada restaurante.'],
    press: ['MesaSpot', 'Descubrimiento gastronómico en Lima Metropolitana.']
  };
  async function promotions() {
    const content = modal('Promociones de restaurantes', 'wide-modal');
    const list = element('div', 'promo-grid'); content.append(list); state(list, 'Cargando promociones…');
    try {
      const items = await MesaAPI.all('/promotions');
      list.replaceChildren();
      if (!items.length) return state(list, 'No hay promociones publicadas en este momento.');
      items.forEach(p => {
        const article = element('article', 'detail-panel');
        article.append(element('h3', '', p.title), element('p', '', p.description || ''), element('strong', 'price', money(p.priceCents) + ' ' + MesaUI.label(p.pricingUnit)), element('p', 'muted', p.availableNow ? 'Disponible en esta franja horaria' : 'Consulta días, horario y condiciones'), element('p', '', p.terms || ''), link(p.restaurant?.name || 'Ver restaurante', detailUrl({ _id: p.restaurantId }) + '#menu', 'text-link'));
        list.append(article);
      });
    } catch (error) { state(list, error.message, promotions); }
  }
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-info]');
    if (!trigger) return;
    if (trigger.dataset.info === 'promotions') return void promotions();
    const [title, description] = info[trigger.dataset.info] || ['MesaSpot', 'Esta función aún no está disponible.'];
    modal(title).append(element('p', 'modal-description', description));
  });
  if (window.AOS && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    AOS.init({ duration: 650, once: true, offset: 45 });
    document.body.classList.add('aos-ready');
  }
})();
