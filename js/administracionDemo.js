/* Página Resumen del panel de administración: indicadores, tarjeta del restaurante, accesos rápidos y últimas reseñas */

/* Accesos rápidos de la página, con su icono, título y descripción. */
const accesosResumen = [
  { archivo: 'administracionMenu.html', icono: 'utensils', titulo: 'Actualizar carta', descripcion: 'Edita y gestiona tus platos' },
  { archivo: 'administracionFotos.html', icono: 'image', titulo: 'Agregar fotografías', descripcion: 'Sube nuevas fotos de tu restaurante y platos' },
  { archivo: 'administracionPromociones.html', icono: 'ticket', titulo: 'Crear promoción', descripcion: 'Atrae más clientes con una promoción especial' }
];

/* Inicia la página y la carga cuando el panel confirma la sesión. */
function iniciarResumenPanel() {
  dibujarAccesosResumen();
  iniciarPanel(() => cargarResumenPanel());
}

/* Dibuja las tarjetas de accesos rápidos con su icono, texto y flecha. */
function dibujarAccesosResumen() {
  document.getElementById('accesosRapidos').replaceChildren(...accesosResumen.map((acceso) => {
    const enlace = crearEl('a', 'acceso-card');
    enlace.href = acceso.archivo;
    const icono = crearEl('span', 'acceso-icono');
    icono.append(iconoPanel(acceso.icono));
    const texto = crearEl('span', 'acceso-texto');
    texto.append(crearEl('strong', '', acceso.titulo), crearEl('small', 'muted', acceso.descripcion));
    enlace.append(icono, texto, crearEl('span', 'acceso-flecha', '→'));
    return enlace;
  }));
}

/* Carga el resumen del restaurante activo: indicadores, datos principales y reseñas recientes. */
async function cargarResumenPanel() {
  const kpis = document.getElementById('kpisResumen');
  mostrarEstado(kpis, 'cargando', 'Cargando indicadores…');
  const id = nuevaSecuencia('resumen');
  try {
    const [resumen, restaurante] = await Promise.all([pedirApi(rutaRestaurante('/overview')), pedirApi(rutaRestaurante())]);
    if (!esSecuenciaVigente('resumen', id)) return;
    const sede = restaurante.mainBranchId ? await pedirApi(rutaRestaurante(`/branches/${encodeURIComponent(restaurante.mainBranchId)}`)).catch(() => null) : null;
    if (!esSecuenciaVigente('resumen', id)) return;
    pintarIndicadoresResumen(resumen);
    pintarTarjetaRestaurante(restaurante, sede);
    pintarResenasResumen(resumen.recentReviews || []);
    document.getElementById('enlaceEditarRestaurante').replaceChildren(iconoPanel('pencil'), document.createTextNode('Editar información'));
    document.getElementById('enlacePerfilPublico').replaceChildren(iconoPanel('external'), document.createTextNode('Ver perfil público'));
    document.getElementById('enlacePerfilPublico').href = `../restaurantes/restaurante.html?id=${encodeURIComponent(estadoPanel.restauranteId)}`;
  } catch (error) {
    if (esSecuenciaVigente('resumen', id)) mostrarEstado(kpis, 'error', mensajeDeError(error), cargarResumenPanel);
  }
}

/* Dibuja las cuatro tarjetas de indicadores con su icono y su valor. */
function pintarIndicadoresResumen(resumen) {
  const puntuacion = resumen.ratingSummary || {};
  const tieneResenas = Number(puntuacion.reviewCount) > 0;
  const indicadores = [
    { etiqueta: 'Locales activos', valor: String(resumen.counts?.activeBranches ?? 0), icono: 'store' },
    { etiqueta: 'Platos disponibles', valor: String(resumen.counts?.availableDishes ?? 0), icono: 'utensils' },
    { etiqueta: 'Fotos publicadas', valor: String(resumen.counts?.publishedPhotos ?? 0), icono: 'image' },
    { etiqueta: 'Valoración general', valor: tieneResenas ? `${Number(puntuacion.overall).toFixed(1)} / 5` : 'Sin reseñas', sub: tieneResenas ? `${puntuacion.reviewCount} ${puntuacion.reviewCount === 1 ? 'reseña' : 'reseñas'}` : '', icono: 'star' }
  ];
  document.getElementById('kpisResumen').replaceChildren(...indicadores.map((indicador) => {
    const tarjeta = crearEl('article', 'kpi-resumen-card');
    const icono = crearEl('span', 'kpi-icono');
    icono.append(iconoPanel(indicador.icono));
    const texto = crearEl('div', 'kpi-texto');
    texto.append(crearEl('small', 'muted', indicador.etiqueta), crearEl('strong', '', indicador.valor));
    if (indicador.sub) texto.append(crearEl('small', 'muted', indicador.sub));
    tarjeta.append(icono, texto);
    return tarjeta;
  }));
}

/* Dibuja la tarjeta del restaurante: portada, nombre, estado, ubicación, cocinas y precio promedio. */
function pintarTarjetaRestaurante(restaurante, sede) {
  const portada = restaurante.coverPhoto?.url || restaurante.thumbnailPhoto?.url || '';
  if (/^https?:\/\//i.test(portada)) {
    usarImagenConRespaldo(document.getElementById('heroRestaurante'), portada);
    usarImagenConRespaldo(document.getElementById('miniaturaRestaurante'), portada);
  }
  document.getElementById('nombreRestaurante').textContent = restaurante.name || '—';
  const estado = document.getElementById('estadoRestaurante');
  const publicado = restaurante.status === 'PUBLISHED';
  estado.textContent = publicado ? '✓ Publicado' : etiquetaPanel(restaurante.status);
  estado.className = `pill-estado ${publicado ? 'pill-verde' : 'pill-gris'}`;

  const lineas = [];
  const direccion = sede ? [sede.address?.street, sede.address?.district, 'Lima Metropolitana'].filter(Boolean).join(', ') : 'Sin local principal';
  lineas.push(filaMetadato('map-pin', crearEl('span', '', direccion)));
  const cocinas = crearEl('span', 'pills-cocinas');
  (restaurante.cuisineTypes || []).forEach((cocina) => cocinas.append(crearEl('span', 'pill-suave', etiquetaPanel(cocina))));
  lineas.push(filaMetadato('utensils', cocinas.childNodes.length ? cocinas : crearEl('span', 'muted', 'Sin tipos de cocina')));
  if (sede?.averagePricePerPersonCents != null) {
    lineas.push(filaMetadato('ticket', crearEl('span', '', `Precio promedio: ${formatearSoles(sede.averagePricePerPersonCents)} por persona`)));
  }
  document.getElementById('metadatosRestaurante').replaceChildren(...lineas);
}

/* Asigna una imagen a un elemento y vuelve a la imagen de respaldo si no puede cargarse. */
function usarImagenConRespaldo(imagen, url) {
  imagen.onerror = () => { imagen.onerror = null; imagen.src = '../../assets/restaurant-placeholder.svg'; };
  imagen.src = url;
}

/* Crea una fila de metadatos con su icono. */
function filaMetadato(icono, contenido) {
  const fila = crearEl('li', 'metadato');
  const i = crearEl('span', 'metadato-icono');
  i.append(iconoPanel(icono));
  fila.append(i, contenido);
  return fila;
}

/* Dibuja las tres reseñas más recientes con sus estrellas, su texto y su botón de respuesta. */
function pintarResenasResumen(resenas) {
  const contenedor = document.getElementById('ultimasResenas');
  if (!resenas.length) {
    mostrarEstado(contenedor, 'vacio', 'Aún no hay reseñas publicadas.');
    return;
  }
  contenedor.replaceChildren(...resenas.slice(0, 3).map((resena) => {
    const nombre = resena.userId ? `${resena.userId.firstName || ''} ${resena.userId.lastName || ''}`.trim() : 'Cliente';
    const puntos = Math.round(Number(resena.ratings?.overall) || 0);
    const item = crearEl('article', 'resena-resumen');
    const avatar = crearEl('span', 'avatar-resena', (nombre[0] || 'C').toUpperCase());
    const cuerpo = crearEl('div', 'resena-resumen-cuerpo');
    const cabecera = crearEl('div', 'resena-resumen-cabecera');
    const datos = crearEl('div');
    datos.append(crearEl('strong', '', nombre), estrellasResumen(puntos), crearEl('small', 'muted', `${puntos} / 5`));
    const responder = crearEl('a', 'btn btn-outline btn-sm', 'Responder');
    responder.href = 'administracionResenas.html';
    cabecera.append(datos, responder);
    cuerpo.append(cabecera, crearEl('p', 'muted', resena.comment || ''));
    item.append(avatar, cuerpo);
    return item;
  }));
}

/* Dibuja cinco estrellas: las primeras según la puntuación, el resto vacías. */
function estrellasResumen(puntos) {
  const fila = crearEl('span', 'estrellas-resumen');
  fila.setAttribute('aria-label', `${puntos} de 5 estrellas`);
  for (let n = 1; n <= 5; n += 1) {
    fila.append(crearEl('span', n <= puntos ? 'llena' : 'vacia', '★'));
  }
  return fila;
}

document.addEventListener('DOMContentLoaded', iniciarResumenPanel);
