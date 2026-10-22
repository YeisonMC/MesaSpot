# MesaSpot

El detalle de El Asador de Surco está en `pages/el-asador-de-surco.html` y se abre desde la foto o el nombre de su tarjeta. Incluye la pestaña Información y la estructura accesible de Fotos, Menú, Reseñas y Ubicación, cuyos contenidos quedan pendientes. Los datos del perfil están en `data/asador.js`. Todas las direcciones, horarios e información comercial son ficticios.

La página `pages/restaurantes.html` contiene el catálogo de Lima: búsqueda por nombre, distrito, selección múltiple de cocinas, rangos de precios en soles, ordenamiento y paginación de seis tarjetas. Se accede desde «Restaurantes» o «Ver todos los destacados» en el inicio. Sus datos adicionales están en `data/catalog.js`; todos los nombres, precios y valoraciones son ficticios. Las reservas y los modales de cuenta están disponibles en ambas páginas.

Página estática en HTML, CSS y JavaScript basada en la referencia visual proporcionada.

## Abrir

Abre `index.html` directamente en el navegador. No requiere instalar paquetes ni compilar. Necesitas conexión a internet para las imágenes de Unsplash, Google Fonts y AOS 2.3.4 desde jsDelivr.

## Archivos

- `index.html`: estructura semántica y ventanas modales.
- `styles/main.css`: estilos y adaptación a escritorio, laptop, tablet y móvil.
- `data/restaurants.js`: arreglos de categorías, restaurantes y contenido informativo.
- `js/app.js`: búsqueda, filtros, menú móvil, formularios y animaciones.

## Comportamiento

La búsqueda filtra por nombre o cocina y distrito de Lima; las categorías se combinan con ella. «Ver todos los destacados» restablece los filtros. La categoría Internacional y las combinaciones sin coincidencias muestran un estado vacío. Los precios en soles son importes ficticios aproximados por persona. La opción inicial «Lima, Perú» muestra todos los distritos.

Las reservas, el registro y el inicio de sesión son simulaciones sin backend. No se guardan datos personales. Los enlaces sociales llevan a las páginas generales de las plataformas.

AOS: https://github.com/michalsnik/aos. Las animaciones respetan la preferencia de movimiento reducido. Si AOS no está disponible, el contenido permanece visible.
