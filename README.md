# MesaSpot

Frontend estático en HTML, CSS y JavaScript para descubrir restaurantes de Lima Metropolitana. Consume la API `https://mesaspot-backend.vercel.app/api` y no requiere Node.js, npm ni compilación para publicarse.

## Ramas y trabajo en equipo

| Rama | Propósito |
| --- | --- |
| `main` | Versión estable del sitio lista para publicar. |
| `develop` | Integración del trabajo de todo el equipo. |
| `test` | Frontend acompañado de pruebas automatizadas y dependencias de desarrollo. |
| `feature/nombre-del-cambio` | Un cambio concreto, creado desde `develop`. |
| `feature/perfil-cliente` y `feature/redisenar-resenas` | Avances anteriores conservados con sus commits originales, ya integrados en las ramas principales. |

No se crean ramas `develop/...` ni una rama llamada únicamente `feature`: Git no permite que convivan con `develop` y `feature/...`, respectivamente. El mismo flujo se aplica a todos los integrantes.

Para iniciar un trabajo nuevo, con el directorio de trabajo limpio:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c feature/nombre-del-cambio
```

Publica la rama y abre un pull request hacia `develop`:

```bash
git push -u origin feature/nombre-del-cambio
```

### Validar y publicar cambios

1. El equipo integra los cambios mediante pull requests de `feature/...` hacia `develop`.
2. Actualiza `test` incorporando `develop`; ejecuta allí las pruebas descritas en `tests/README.md`.
3. Si aparece un fallo del producto, corrígelo en una rama `feature/...` desde `develop` e incorpora la corrección por el mismo flujo.
4. Cuando las pruebas pasen, abre un pull request de `develop` hacia `main`.

**No integres `test` hacia `develop` ni `main`**: volverían a aparecer las herramientas y archivos de pruebas. La rama `test` es permanente y recibe cambios desde `develop`; sus herramientas se mantienen únicamente allí. Evita eliminarla automáticamente al cerrar pull requests.

`main` y `develop` conservan páginas, estilos, scripts, imágenes y la documentación/licencia necesaria. No incluyen `tests/`, `.tests/`, `package.json`, `package-lock.json` ni `.gitignore`. Las exclusiones de `.git/info/exclude` son locales y no se comparten al clonar; evita colocar secretos, dependencias o herramientas en estas ramas y revisa `git status` antes de confirmar cambios.

## Abrir y configurar

1. Abre el proyecto con Live Server o cualquier servidor HTTP estático; no abras las páginas mediante `file://`.
2. Configura el dominio del backend en `js/config.js`. No añadas claves privadas al frontend.
3. En el backend, `CORS_ORIGINS` debe incluir el origen exacto del frontend, sin barra final ni `/api`. Después de cambiarlo, vuelve a desplegar el backend.
4. Publica `main` como sitio estático, sin comando de compilación ni instalación npm.

## Funcionalidades

- Catálogo con nombre, distrito, tipo de comida, rango de precios en soles, orden y paginación.
- Tipos de comida: Criolla, Chifa, Pollería, Makis, Mariscos, Carnes, Desayunos y Cafeterías. La selección múltiple combina categorías mediante OR.
- Ficha genérica `pages/restaurante.html?id=OBJECT_ID`, con información, locales, horarios, servicios, galería, platos, promociones, reseñas y ubicación. El enlace histórico de El Asador de Surco sigue disponible.
- Galería con filtros, visor Swiper, miniaturas, teclado y gestos táctiles.
- Reseñas con comida, servicio y ambiente, validaciones y modal de confirmación. Solo `CLIENT` puede publicar; la verificación de visita depende de la API.
- Login, registro, sesión, avatar y perfil de cliente, edición de nombres, apellidos y celular, y listado de reseñas propias.
- Subida de avatar a Cloudinary mediante firma del backend. Las credenciales se configuran exclusivamente en el backend.
- Administración de restaurantes, locales, fotografías, platos y promociones para `RESTAURANT_ADMIN`, con permisos comprobados en el servidor.
- Navbar responsive compartido, estados de carga/error, navegación por teclado y respeto al movimiento reducido.

Reservas, pagos, favoritos y notificaciones siguen pendientes. No se simulan confirmaciones de operaciones inexistentes. Las fotografías y los datos comerciales de demostración son referenciales.

## Archivos principales

- `index.html` y `pages/`: pantallas del sitio.
- `styles/`: estilos compartidos y específicos de cada pantalla.
- `js/api.js` y `js/config.js`: acceso y configuración de la API.
- `js/auth.js`, `js/profile.js`: sesión y perfil.
- `js/restaurants.js`, `js/restaurant-detail.js`, `js/restaurant-tabs.js`: catálogo y ficha.
- `js/gallery.js`, `js/reviews.js`, `js/admin.js`: galería, reseñas y administración.
- `js/navbar.js`, `js/ui.js`, `js/icons.js`: navegación, componentes e iconos.
- `assets/`: recursos estáticos, incluida la imagen de respaldo.
- `vendor/`: Lucide de producción y su licencia.

Los datos de la API se insertan mediante nodos DOM y `textContent`; las URLs externas se validan. Los precios se reciben y envían en céntimos y se presentan en soles.

## Bibliotecas del navegador

Se conserva **`vendor/lucide-1.61.0.min.js`** porque las seis páginas lo cargan y `js/icons.js` utiliza sus funciones para generar iconos estáticos y dinámicos. Es una dependencia del sitio en ejecución, no una herramienta de pruebas. Su copia local fija la versión y permite cargar los iconos sin depender de un CDN. `vendor/lucide-LICENSE.txt` conserva la licencia de distribución. No se necesita `package.json` para ejecutar esta copia en el navegador.

AOS 2.3.4 y Swiper 12.0.3 se cargan desde CDN donde se necesitan. El visor mantiene navegación básica si Swiper no está disponible.

- [Lucide: instalación y versiones fijas](https://lucide.dev/guide/lucide/getting-started)
- [Swiper desde CDN](https://swiperjs.com/get-started#use-swiper-from-cdn)
- [AOS](https://github.com/michalsnik/aos)
