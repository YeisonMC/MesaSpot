# MesaSpot — frontend conectado a MongoDB mediante la API

Frontend en HTML, CSS y JavaScript. Conserva el diseño original y consume el backend desplegado en https://mesaspot-backend.vercel.app/api. No necesita compilación.

## Abrir y configurar

1. Abre esta carpeta con VS Code y usa Live Server, o un servidor HTTP estático.
2. Accede mediante http://127.0.0.1:5500 o http://localhost:5500. No abras el HTML con file://.
3. La URL de la API se configura únicamente en `js/config.js`.
4. En Vercel, `CORS_ORIGINS` del **backend** debe incluir el origen exacto del frontend. Ejemplo: `http://127.0.0.1:5500,http://localhost:5500,https://tu-frontend.vercel.app`. Sin barra final ni /api.
5. Al cambiar CORS_ORIGINS, genera un nuevo despliegue del backend.

No hay contraseñas de MongoDB, JWT_SECRET ni claves de servicios en este frontend.

## Funciones conectadas

- Inicio y catálogo: datos reales de la API, búsquedas, cocinas, distrito, precio, ordenamiento y paginación de seis tarjetas en el catálogo.
- Las tarjetas abren `pages/restaurante.html?id=OBJECT_ID`. Ya no están limitadas a El Asador.
- El enlace antiguo `pages/el-asador-de-surco.html` sigue funcionando mediante su slug.
- Detalle: información, locales, horarios partidos, servicios, capacidad, contacto y fotos.
- Galería: filtro por local/tipo y ampliación de imágenes.
- Carta: categorías, precios y disponibilidad por local, sugerencias, alérgenos y promociones.
- Promociones: campaña, días y franjas en hora de Lima. También se consultan desde el menú Promociones.
- Reseñas: nombre y avatar, puntuaciones, paginación, publicación, edición y retiro de la reseña propia.
- Login y registro reales; el registro público crea CLIENT. El formulario separa nombre y apellidos.
- Perfil: editar nombre, apellidos, teléfono y URL de avatar; enlaces a las reseñas propias.
- Sesión validada con /users/me. Se guarda en sessionStorage; «Mantener mi sesión» utiliza localStorage. El logout retira el token; un 401 de una operación privada cierra la sesión.
- Administración: disponible para RESTAURANT_ADMIN desde la cabecera o `pages/administracion.html`. Incluye crear/editar/archivar restaurantes, locales, fotos, carta y promociones, así como responder reseñas.
- Estados visibles de carga, vacío y error, con reintento; no se sustituyen fallos por restaurantes ficticios.

Las restricciones de propiedad se comprueban en la API; ocultar botones en el navegador no reemplaza los permisos del servidor.

## Fotos y mapas

Vercel no conserva cargas en el disco del backend. En esta integración se utilizan **URLs públicas HTTP/HTTPS** para galería y avatar. No se llama al endpoint local de subida. Para seleccionar archivos del equipo y conservarlos será necesario integrar almacenamiento externo en el backend.

El mapa solo se muestra cuando el local tiene coordenadas verificadas. Si solo tiene un enlace de Google Maps, se ofrece ese enlace. No se inventan coordenadas para una dirección pendiente.

## Lo que todavía no tiene backend

Reservas, disponibilidad de mesas, pagos, notificaciones, recuperación de contraseña y acceso con Google no están implementados. El frontend no simula reservas ni muestra confirmaciones de operaciones inexistentes. «Consultar contacto» lleva a los datos del local.

Los datos que devuelve el seed son de demostración: imágenes placeholder, direcciones y datos comerciales pendientes de verificación. Tener tres reseñas no significa que sean visitas verificadas.

## Administración

1. Inicia sesión con una cuenta administradora ya creada en el backend.
2. Abre **Administrar** y elige el restaurante.
3. Crea un restaurante como borrador, agrega locales y fotos y edita la portada/local principal antes de publicarlo.
4. Los precios se escriben en soles; el código los convierte a céntimos enteros antes de enviarlos.
5. Un local admite un horario por día con varios periodos: `13:00-16:30,20:00-23:00`. Vacío significa cerrado; `20:00-02:00+1` cierra al día siguiente.
6. Las fechas y horarios promocionales se interpretan en America/Lima.
7. Archivar conserva el documento. Si está vinculado, el servidor devuelve 409 e indica retirar las referencias. Se puede restaurar desde Editar cambiando el estado.
8. Solo se puede responder a reseñas de clientes; no se modifican sus calificaciones.

## Estructura

- `js/config.js`: dominio de la API, sin secretos.
- `js/api.js`: peticiones fetch, errores, timeout, autenticación y recorrido de páginas.
- `js/ui.js`: componentes DOM compartidos, moneda, enlaces y validación de URLs.
- `js/app.js`: navegación, diálogo y contenido informativo.
- `js/auth.js`: login, registro, sesión y perfil.
- `js/restaurants.js`: inicio y catálogo.
- `js/restaurant-detail.js`: detalle genérico y reseñas.
- `js/admin.js`: formularios administrativos.
- `styles/integration.css`: estilos de los nuevos componentes y estados.
- `assets/restaurant-placeholder.svg`: imagen local de respaldo.
- `tests/integration.test.js`: pruebas DOM con API controlada.
- `data/`: archivos históricos de la maqueta, conservados como referencia; las páginas ya no los cargan.

Los valores de la API se insertan usando textContent y nodos DOM; no se interpreta HTML de comentarios, nombres ni formularios. Las URLs externas se validan y abren con protección de navegación.

## Pruebas

Solo necesitas Node.js 22 o superior para ejecutar las pruebas opcionales:

```powershell
npm install
npm test
```

No se necesitan paquetes para servir la página. jsdom se usa únicamente como herramienta de pruebas.

Se verificaron nueve escenarios: catálogo seguro, filtros/errores/reintento, login/perfil/logout, registro, detalle y reseñas, acceso administrativo, precios de platos, paginación y horarios de locales. Se usa una API controlada y no se escriben datos en Atlas.

También se verificó en navegador la API publicada: catálogo, detalle, carta, promociones, reseñas y acceso del administrador de demostración. Los formularios de escritura se probaron con datos aislados.

## Publicar

Publica la carpeta como sitio estático. El frontend no necesita variables secretas ni un proceso de build. Ajusta js/config.js si cambia el backend y autoriza el dominio definitivo en CORS_ORIGINS del backend. No publiques node_modules.

No se ha desplegado esta versión del frontend ni se han enviado cambios a un repositorio remoto automáticamente.

