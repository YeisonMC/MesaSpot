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
- `js/restaurant-detail.js`: controlador de la ficha genérica.
- `js/reviews.js`: listado, sesión, formulario modal y confirmación de reseñas.
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

Se verificaron once escenarios: catálogo seguro, filtros/errores/reintento, login/perfil/logout, registro, detalle y reseñas, acceso administrativo, precios de platos, paginación y horarios de locales. Se usa una API controlada y no se escriben datos en Atlas.

También se verificó en navegador la API publicada: catálogo, detalle, carta, promociones, reseñas y acceso del administrador de demostración. Los formularios de escritura se probaron con datos aislados.

## Publicar

Publica la carpeta como sitio estático. El frontend no necesita variables secretas ni un proceso de build. Ajusta js/config.js si cambia el backend y autoriza el dominio definitivo en CORS_ORIGINS del backend. No publiques node_modules.

No se ha desplegado esta versión del frontend ni se han enviado cambios a un repositorio remoto automáticamente.


## Tarjetas, precios e iconos

Las tarjetas comparten un diseño flexible, con etiquetas que pueden ocupar varias líneas y una acción de ancho completo. El filtro de precios utiliza dos controles nativos de rango (mínimo y máximo), compatibles con teclado. Los valores se muestran en soles y se convierten a céntimos al consultar la API. El extremo derecho del máximo significa «Sin límite». Se actualiza el texto al deslizar y se consulta al terminar el movimiento; Restablecer elimina los límites.

Los iconos utilizan Lucide 1.61.0, fijado en package.json. Se incluye una copia local de producción en vendor/lucide-1.61.0.min.js y su licencia ISC en vendor/lucide-LICENSE.txt, por lo que no depende de un CDN. js/icons.js inicializa los iconos estáticos y proporciona la fábrica para tarjetas, paginación, reseñas, sesión y otros componentes dinámicos. Los SVG de iconos se generan mediante Lucide; la ilustración SVG de respaldo de fotografías permanece como imagen.

Las pruebas adicionales verifican los límites de precio, su conversión, el restablecimiento y la generación de iconos.

## Ficha completa y galería con Swiper

La ficha de El Asador de Surco se completó como demostración: descripción en tres párrafos, tres sedes, horarios con dos turnos, servicios, capacidad, contacto de muestra, carta descriptiva y diez fotografías referenciales. Las cuentas y las tres reseñas originales se conservan. Los datos se guardan en la API; no son una sustitución local del catálogo.

La galería sigue la composición de referencia: cabecera y filtros, resumen lateral y un mosaico con tres fotos grandes y cinco secundarias. «Ver las 10 fotos» amplía el mosaico. El resumen utiliza «Plato destacado», porque el backend todavía no mide visualizaciones.

Al pulsar una foto:
- Se abre un diálogo a pantalla completa desde esa misma imagen.
- Swiper 12.0.3 se carga mediante CDN, con flechas, teclado y gestos táctiles.
- El visor incluye contador, título, descripción y una tira de miniaturas sincronizadas.
- Escape y el botón de cierre restauran el foco y el desplazamiento de la página.
- Si falla el CDN, continúa disponible una navegación básica con flechas y miniaturas.
- Las animaciones respetan la preferencia de movimiento reducido.

Nuevos archivos: `js/gallery.js` y `styles/gallery.css`. La lógica de la ficha se encuentra en `js/restaurant-detail.js`, con comentarios de los bloques en español. AOS 2.3.4 se conserva y se actualiza al cambiar pestañas o categorías.

Las fotos proceden de Unsplash y son referenciales; las sedes, el teléfono de muestra y los dominios `.example` no representan contactos comerciales verificados. No se añadieron reseñas ficticias para imitar las cantidades de la referencia.

Se verificaron 13 pruebas automáticas y el visor real en navegador. La actualización de los datos se ejecutó con `scripts/complete-demo-profile.js` del backend; creó un respaldo previo en `mesaspot-profile-backups` del área de trabajo. No vuelvas a ejecutar ese script sobre contenido ya personalizado: actualiza directamente desde Administrar.

Referencias:
- [Swiper desde CDN](https://swiperjs.com/get-started#use-swiper-from-cdn)
- [AOS en GitHub](https://github.com/michalsnik/aos)

## Pestañas Platos y Ubicación

`js/restaurant-tabs.js` renderiza ambos paneles con datos reales de la API; `styles/restaurant-tabs.css` define los diseños para móvil, laptop y escritorio. Se carga en la ficha genérica y en la dirección antigua de El Asador de Surco. La pestaña «Menú» ahora se llama «Platos»; se conserva `#menu` para no romper enlaces existentes.

- **Platos:** promociones destacadas vigentes del local, carta filtrable por categoría y hasta tres sugerencias según `recommendation.featured` y `sortOrder`. Los precios usan PEN y céntimos recibidos de la API. Las tarjetas normales no tienen botón de detalles.
- **Ver detalles:** solo aparece en promociones destacadas. Por ahora muestra un aviso de próxima disponibilidad; el contenido completo se implementará en otro avance.
- **Ubicación:** Google Maps junto a dirección y contacto, con acciones para obtener indicaciones y compartir el enlace. El selector de local actualiza también la carta, la galería y la información de la ficha. Los horarios permanecen únicamente en Información.
- **Mapa:** usa coordenadas si existen, o busca la dirección publicada como referencia. No agrega coordenadas inventadas. Los datos comerciales de esta demostración siguen siendo ficticios.
- **Accesibilidad:** categorías y locales operables con teclado, imágenes con texto alternativo, enlaces de contacto seguros y animaciones AOS que respetan movimiento reducido.

No fue necesario modificar el backend: ya expone `promotions.featured`, `items`, `pricingUnit`, `peopleCount`, recomendaciones de platos, fotos y datos de cada sede. No se modificaron registros en Atlas para este rediseño.

La suite actual contiene 16 pruebas, incluyendo promociones vigentes, categorías, cambio de local, contacto, coordenadas y estados vacíos.

## Reseñas y formulario modal

`js/reviews.js` y `styles/reviews.css` implementan el resumen de valoraciones, listado con ordenación, carga de tres opiniones por página, tarjetas de sesión y políticas. Las tarjetas usan nombres e iniciales del perfil; la insignia de visita verificada solo aparece cuando la API confirma `verifiedVisit`.

- Sin sesión se muestra **Iniciar sesión**. Un cliente (`CLIENT`) puede **Escribir una reseña**, o editar y retirar la suya si ya publicó una. Un administrador (`RESTAURANT_ADMIN`) recibe un mensaje explicativo y no ve el formulario.
- El modal solicita local y fecha de visita, tres calificaciones obligatorias de 1 a 5 (comida, servicio y ambiente) y comentario de 10 a 5000 caracteres y máximo 500 palabras. El título se obtiene de las primeras palabras del comentario. No se envían autor, verificación ni puntuación general desde el navegador.
- El contador se actualiza al escribir. No se permiten fechas futuras; el límite también se valida en el backend. Los errores conservan el texto para poder reintentar.
- **¡Reseña publicada!** solo aparece tras una escritura exitosa. Un fallo posterior al refrescar el listado no invita a volver a publicar una reseña que ya se guardó.
- Los controles de estrellas son radios nativos utilizables con teclado. El diseño se adapta a móvil, laptop y escritorio, con iconos Lucide y AOS respetando movimiento reducido.

**Despliegue requerido:** integra y despliega primero la rama `develop/redisenar-resenas` del backend. Su validador acepta las tres calificaciones y calcula el promedio general. El backend antiguo exige cinco campos y rechazará el nuevo formulario. No se han enviado ramas a GitHub ni se ha desplegado automáticamente.

Se crearon ambas ramas `develop/redisenar-resenas`. La cuenta de demostración para verificar el flujo tiene correo `resenas.prueba@example.com` y rol `CLIENT`; la contraseña se entrega por el chat y no se guarda en este repositorio. La cuenta de Atlas empieza sin reseñas; las publicaciones de comprobación se hicieron únicamente en una base local temporal.

La suite del frontend contiene 20 pruebas. Incluye sesión y roles, publicación y edición, validación de tres criterios, palabras y fecha, conservación de datos ante errores, ordenación y carga adicional.

## Perfil de cliente y menú de cuenta

Rama del avance: `develop/perfil-cliente` en frontend y backend. La pantalla `pages/perfil.html` usa `js/profile.js` y `styles/profile.css`, con comentarios en español. Permite modificar nombres, apellidos y celular peruano opcional de 9 dígitos; el correo es de solo lectura. Al guardar correctamente muestra **¡Cambios guardados!** y actualiza el header y la sesión.

- El header compartido muestra un avatar circular y solo el nombre. Su desplegable incluye **Mi perfil** y **Cerrar sesión**, se cierra con Escape o al pulsar fuera y respeta movimiento reducido. Si no hay avatar, usa iniciales.
- **Mi perfil** abre la nueva página para `CLIENT`. Las cuentas administrativas conservan el editor previo y su acceso a Administrar. La pantalla de cliente está protegida por sesión y rol.
- **Mis reseñas** consulta `/users/me/reviews` y muestra solo las opiniones del usuario, con enlaces al restaurante para editar o retirarlas. **Ayuda** contiene preguntas frecuentes. Reservas, favoritos y métodos de pago quedan deshabilitados como pendientes; no existen Inicio, Preferencias ni etiqueta Consumidor en la navegación de cuenta.
- La foto se elige mediante un archivo JPG, PNG o WebP de hasta 5 MB. Elegirla muestra una vista previa local; Cancelar revierte los cambios y no sube el archivo.
- Al guardar se solicita `POST /users/me/avatar/signature`, se envía la imagen directamente a Cloudinary sin el token de MesaSpot y se guarda el `avatarPublicId` mediante `PATCH /users/me`. El backend verifica la imagen antes de aceptar su URL. Las claves privadas permanecen en el backend.
- Para probar la foto real, completa `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` en `.env` y en Vercel, y despliega el backend actualizado. Las variables se dejaron vacías para que el propietario las reemplace. Sin ellas se pueden guardar los datos personales, pero la foto devuelve un mensaje de configuración pendiente.
- Los errores conservan el formulario. Si la subida fue exitosa y falla el guardado, el reintento reutiliza el recurso ya subido. No se eliminan imágenes anteriores automáticamente.

No se añadió AOS a este formulario: el menú usa una animación CSS breve y las actualizaciones mantienen el foco de edición. Los iconos son Lucide. El diseño tiene variantes para móvil, laptop y escritorio.

Se verificaron 26 pruebas del frontend y la suite del backend, con Cloudinary simulado y MongoDB temporal. La subida real a Cloudinary queda pendiente de configurar credenciales. No se modificaron cuentas de Atlas durante estas pruebas.

## Tipo de comida y navbar responsive

Rama: `feature/tipos-comida-navbar`. En Restaurantes el filtro **Tipo de comida** presenta exactamente Criolla, Chifa, Pollería, Makis, Mariscos, Carnes, Desayunos y Cafeterías. La selección múltiple sigue una lógica OR y se combina con nombre, distrito y precios. Criolla reconoce el código histórico `PERUANA_TRADICIONAL`; las demás opciones tienen códigos propios y no se infieren por nombre del restaurante.

`js/navbar.js` y `styles/navbar.css` comparten el navbar en las seis páginas. Se implementa con HTML, CSS y JS, sin frameworks nuevos. Hasta 1024 px muestra un botón de menú de 44 px y un panel con navegación y accesos de sesión. Se cierra con Escape, al elegir una opción, al pulsar fuera y al cambiar de ancho o sesión. El estado `aria-expanded`, los iconos y la visibilidad accesible se mantienen sincronizados. Los usuarios conectados conservan avatar y menú de cuenta; los administradores mantienen acceso a Administrar. Se respeta movimiento reducido.

Los cinco restaurantes de muestra se reclasificaron en Atlas para que coincidan con los filtros; El Asador de Surco se conserva. El backend incorpora los códigos nuevos y debe desplegarse para que el formulario administrativo los acepte. No se recrearon restaurantes ni se modificaron sus recursos.

`/tests/` y `/.tests/` están incluidos en `.gitignore`, y los archivos previamente versionados se retiraron del índice de Git conservando las copias locales. Así dejan de subirse en próximos commits. `npm test` sigue siendo una herramienta local: un clon nuevo no tendrá estos archivos. Se verificaron 28 pruebas de frontend.

