# SPEC.md — MesaSpot

## 1. Propósito del documento

Este documento describe el producto, las decisiones técnicas y los criterios de diseño y colaboración de **MesaSpot**, como parte de la documentación académica del proyecto. Su objetivo es mantener coherencia entre las pantallas y los avances del equipo.

## 2. Datos del proyecto

| Dato | Definición |
| --- | --- |
| Startup | MesaSpot |
| Ámbito | Restaurantes de Lima Metropolitana, Perú |
| Producto | Plataforma web para descubrir y promocionar restaurantes y consultar su oferta gastronómica |
| Diseño de referencia | Figma de MesaSpot; enlace pendiente de reemplazar por el responsable |
| Herramienta de asistencia | Codex, con revisión y ajustes de cada integrante |
| Frontend | HTML5, CSS3 y JavaScript, sin framework de interfaz ni compilación |
| Bibliotecas de interfaz | Lucide, AOS y Swiper donde corresponde |
| Backend | API REST independiente con Node.js, Express y MongoDB mediante Mongoose |
| Moneda y contexto horario | Sol peruano (`PEN`, `S/`) y `America/Lima` |
| Repositorio del frontend | https://github.com/YeisonMC/MesaSpot |
| Repositorio del backend | https://github.com/YeisonMC/mesaspot-backend |
| API configurada | `https://mesaspot-backend.vercel.app/api` |

**URL de Figma para completar:** `REEMPLAZAR_POR_URL_DEL_FIGMA_DE_MESASPOT`.

Este marcador no corresponde a un archivo consultado. Al sustituirlo, se podrán registrar los frames de escritorio y móvil de cada pantalla sin inventar enlaces ni identificadores.

## 3. Startup, usuarios y alcance

MesaSpot ayuda a las personas a encontrar restaurantes de Lima, comparar tipos de comida y precios aproximados, conocer sus locales, fotografías, platos, promociones, ubicación y opiniones. Para los restaurantes, ofrece un espacio de promoción y administración de su información.

### 3.1. Usuarios

- **Visitante:** explora el catálogo y las fichas públicas sin iniciar sesión.
- **Cliente (`CLIENT`):** además de explorar, puede gestionar sus nombres, apellidos, celular y avatar, consultar sus reseñas y publicar o gestionar su propia opinión según las reglas de la API.
- **Administrador de restaurante (`RESTAURANT_ADMIN`):** gestiona los restaurantes y recursos sobre los que tiene permisos. No publica reseñas como cliente. El backend comprueba el rol y la propiedad de los recursos.

Los nombres de roles anteriores son los códigos del sistema; los textos de la interfaz pueden expresarse en español sin modificar esos códigos.

### 3.2. Funcionalidades disponibles

| Área | Comportamiento implementado |
| --- | --- |
| Inicio | Presentación de MesaSpot, búsqueda, categorías y tarjetas obtenidas de la API. |
| Restaurantes | Filtros por nombre, distrito, tipo de comida y precio; ordenación y paginación. |
| Información | Descripción, servicios, locales, horarios, contactos y resumen del restaurante. |
| Fotos | Galería por categorías y local, mosaico y visor ampliado con navegación y miniaturas. |
| Platos | Carta por categorías, precios, disponibilidad, sugerencias y promociones destacadas. |
| Reseñas | Resumen de puntuaciones, listado, ordenación y formulario modal para comida, servicio, ambiente y comentario. |
| Ubicación | Google Maps y datos de dirección y contacto del local seleccionado. |
| Acceso | Registro e inicio de sesión conectados al backend mediante formularios modales. |
| Perfil | Edición de datos del cliente, avatar, reseñas propias y ayuda sencilla. |
| Administración | Gestión de restaurantes, locales, fotografías, platos y promociones, y respuesta a reseñas. |

El filtro **Tipo de comida** incluye Criolla, Chifa, Pollería, Makis, Mariscos, Carnes, Desayunos y Cafeterías. La selección de varios tipos funciona como OR y se combina con los demás filtros.

Las reseñas requieren tres calificaciones de 1 a 5. El comentario admite de 10 a 5000 caracteres y un máximo de 500 palabras; no se permiten visitas con fecha futura. La puntuación general se calcula en el backend. Solo se muestra una confirmación de publicación después de una respuesta exitosa, y solo se identifica una visita como verificada cuando la API lo confirma.

### 3.3. Funcionalidades pendientes

Reservas reales, disponibilidad de mesas, favoritos, pagos, notificaciones, recuperación de contraseña y acceso con Google no forman parte de lo implementado actualmente. Las opciones pendientes deben mantenerse identificadas o deshabilitadas; no deben aparentar una operación completada.

El botón **Ver detalles** está reservado a promociones destacadas. Su experiencia completa sigue pendiente. Las fotografías y los datos comerciales de demostración no deben presentarse como información comercial verificada.

## 4. Figma y coherencia visual

El diseño de MesaSpot parte de Figma. Al implementar o rediseñar una pantalla, el integrante identifica su frame y contrasta composición, jerarquía, espaciados, estados y adaptación móvil con el producto existente.

- Utilizar únicamente el Figma de MesaSpot como referencia del producto; no trasladar la identidad visual de las startups de ejemplo.
- Mantener los colores y tipografías existentes del proyecto. Una diferencia con el frame debe revisarse y documentarse antes de cambiar la identidad compartida.
- Comparar escritorio y móvil. Cuando Figma no detalle un tamaño intermedio, adaptar el contenido con Grid, Flexbox y media queries conservando la jerarquía visual.
- Reutilizar navbar, menú de cuenta, botones, campos, tarjetas, paneles y diálogos existentes.
- Las diferencias visuales y los cambios de alcance se coordinan con el equipo. Consultar Figma no implica modificarlo automáticamente.
- No afirmar que se revisó un frame o se alcanzó una coincidencia visual si esa comprobación no se realizó.

Los estados y modales se implementan dentro de la pantalla correspondiente; no requieren un archivo HTML independiente.

## 5. Tecnologías y responsabilidades

### Frontend

- **HTML:** estructura semántica, formularios, navegación y contenido accesible.
- **CSS:** estilos compartidos y por funcionalidad; variables CSS, Grid, Flexbox y diseño responsive.
- **JavaScript:** consumo de API con `fetch`, autenticación, filtros, renderizado, validación, diálogos, galería e interacciones.
- **Lucide 1.61.0:** iconos apropiados para cada acción. Se carga la copia local `vendor/lucide-1.61.0.min.js`, junto con su licencia. Los SVG generados por Lucide son parte de su funcionamiento; no se sustituyen por iconos dibujados manualmente.
- **AOS 2.3.4:** animaciones discretas donde ayuden a la presentación, respetando movimiento reducido. No se requiere animar todas las pantallas o formularios.
- **Swiper 12.0.3:** visor de fotografías con flechas, gestos, teclado y miniaturas; carga desde CDN. Conservar la navegación básica disponible cuando la biblioteca no se cargue.

Las versiones deben permanecer fijadas. No añadir frameworks o bibliotecas nuevas sin una necesidad acordada. La copia local de Lucide es una dependencia del navegador y permanece en `main` y `develop`; no depende de instalar npm para publicar el sitio.

### Backend y servicios

La API Express se mantiene en otro repositorio y MongoDB almacena los datos. Cloudinary aloja los avatares mediante subida firmada por el backend; sus credenciales privadas nunca se incluyen en el frontend. Google Maps se utiliza para la ubicación y las indicaciones, sin inventar coordenadas verificadas.

El frontend se sirve mediante HTTP, por ejemplo con Live Server, o como sitio estático. No se abre mediante `file://`. Su publicación no necesita un proceso Node.js ni un comando de compilación. Node.js y npm se utilizan en el backend y en las herramientas de pruebas de la rama `test`.

## 6. Identidad visual: variables y tipografías

**Reutilizar los tokens ya definidos en `:root` de `styles/main.css`.** Para componentes nuevos, usar `var(...)` en lugar de crear una paleta paralela o repetir los valores hexadecimales. No redefinir los mismos tokens en cada hoja específica.

| Variable existente | Valor | Uso |
| --- | --- | --- |
| `--accent` | `#c95830` | Acento y acciones principales. |
| `--accent-dark` | `#aa4321` | Variante oscura del acento. |
| `--ink` | `#2c2825` | Texto principal. |
| `--muted` | `#918983` | Texto secundario; revisar contraste según tamaño y fondo. |
| `--paper` | `#faf8f5` | Fondo general. |
| `--line` | `#ece6e1` | Bordes y separadores. |
| `--soft` | `#fdf1eb` | Superficies suaves de énfasis. |
| `--radius` | `17px` | Radio compartido. |
| `--body` | `"DM Sans", sans-serif` | Texto y controles. |
| `--heading` | `"Outfit", sans-serif` | Encabezados e identidad de marca. |

DM Sans y Outfit se cargan actualmente mediante Google Fonts. La cabecera principal de la ficha tiene una excepción existente: `Georgia, serif`, definida en `styles/restaurant-detail.css`. No extender esa excepción a otras pantallas ni sustituir las fuentes compartidas sin revisar su impacto.

Si hace falta un token adicional, definir su propósito y revisar su impacto en las demás pantallas. Los estilos específicos deben limitarse a su componente o página, evitando sobrescribir selectores globales para solucionar un caso particular.

## 7. Organización de carpetas

La estructura funcional acordada conserva los nombres de los HTML y agrupa las páginas dentro de `pages/`:

```text
MesaSpot/
├── SPEC.md
├── README.md
├── index.html
├── pages/
│   ├── restaurantes/
│   │   ├── restaurantes.html
│   │   └── restaurante.html
│   ├── perfil/
│   │   └── perfil.html
│   └── administracion/
│       └── administracion.html
├── styles/
│   ├── main.css
│   ├── integration.css
│   ├── auth.css
│   ├── navbar.css
│   ├── restaurants.css
│   ├── restaurant-detail.css
│   ├── restaurant-tabs.css
│   ├── gallery.css
│   ├── reviews.css
│   └── profile.css
├── js/
│   ├── config.js
│   ├── api.js
│   ├── ui.js
│   ├── icons.js
│   ├── navbar.js
│   ├── app.js
│   ├── auth.js
│   ├── restaurants.js
│   ├── price-range.js
│   ├── restaurant-detail.js
│   ├── restaurant-tabs.js
│   ├── gallery.js
│   ├── reviews.js
│   ├── profile.js
│   └── admin.js
├── assets/
│   └── restaurant-placeholder.svg
└── vendor/
    ├── lucide-1.61.0.min.js
    └── lucide-LICENSE.txt
```

La estructura agrupada de `pages/` está integrada en `main` y `develop`. Se retiró `el-asador-de-surco.html` porque los enlaces del catálogo y las reseñas utilizan la ficha genérica por ID.

- `main.css` contiene los estilos base y tokens; las demás hojas agrupan estilos por funcionalidad. No se impone un CSS único.
- `api.js` centraliza peticiones y sesión; `config.js` contiene la URL pública del backend.
- `ui.js` concentra utilidades y enlaces compartidos. En la estructura reorganizada, `pageUrl` resuelve los destinos desde la raíz del sitio.
- `app.js` contiene interacciones generales; los scripts de catálogo, ficha, perfil y administración mantienen responsabilidades propias.
- `assets/` contiene recursos estáticos locales. Las imágenes del catálogo pueden venir de URLs de la API; no se requiere duplicarlas todas en esta carpeta.
- Los nombres de carpetas y archivos usan minúsculas, sin tildes ni espacios. No renombrar todas las páginas como `index.html` ni crear una página por restaurante.

La rama `test` añade `tests/`, `package.json`, `package-lock.json` y `.gitignore`. Esas herramientas no forman parte de las ramas de publicación. `node_modules/` es local y nunca se versiona.

## 8. Navegación y datos

El recorrido principal va de **Inicio → Restaurantes → Ficha del restaurante**. La ficha reúne Información, Fotos, Platos, Reseñas y Ubicación como pestañas de una misma página. El inicio de sesión y el registro son modales; no requieren archivos `login.html` o `signup.html` nuevos.

Una cuenta cliente accede a Mi perfil desde el menú de avatar. Allí consulta sus datos y reseñas. La cuenta administradora conserva su acceso a Administración. Todos los restaurantes comparten `restaurante.html?id=...`; el ID determina los datos consultados.

En la estructura agrupada:

- Desde la portada, el catálogo se enlaza con `pages/restaurantes/restaurantes.html`.
- Los HTML en `pages/<grupo>/` cargan recursos con `../../styles/`, `../../js/`, `../../assets/` y `../../vendor/`.
- La vuelta al inicio utiliza `../../index.html`; entre grupos se emplean rutas relativas coherentes o la utilidad compartida.
- Un cambio de carpeta requiere actualizar enlaces HTML, navegación generada en JS, accesos del perfil, recursos y pruebas.

Los datos del producto proceden de la API. Mantener estados de carga, vacío y error con reintento; no sustituir una caída del backend por datos ficticios. Usar soles en pantalla y convertir los importes a céntimos para el contrato de la API.

Los permisos se validan en el servidor, aunque la interfaz oculte acciones según el rol. Insertar nombres, comentarios y otros datos mediante nodos DOM y `textContent`, validar URLs y no colocar secretos de MongoDB, JWT o Cloudinary en el cliente.

## 9. Criterios de implementación

- HTML con `lang="es"`, `meta viewport`, jerarquía de encabezados, estructura semántica y un título principal identificable.
- Enlaces `<a>` para navegar; botones `<button>` para abrir modales, filtrar o ejecutar acciones. Formularios con etiquetas asociadas, `name`, tipos adecuados y validación HTML y JS según el caso.
- CSS con clases claras, reutilización de componentes y separación por funcionalidad. Conservar las convenciones existentes, sin imponer una reescritura general del proyecto.
- JS separado de los HTML, usando eventos y funciones con responsabilidades claras. **Agregar comentarios en español en los bloques importantes**, explicando su propósito y las decisiones relevantes sin comentar cada línea obvia.
- Mantener la inicialización de Lucide en elementos estáticos y contenido generado dinámicamente. Usar iconos reconocibles y nombres accesibles en botones que solo muestran un icono.
- En animaciones AOS y transiciones CSS, respetar `prefers-reduced-motion`. El contenido y las acciones deben seguir siendo utilizables si una animación no se ejecuta.
- No mostrar éxito antes de confirmar la escritura en la API. Mantener los datos ingresados ante un fallo para permitir reintentar.
- Las modificaciones compartidas deben revisarse contra otras pantallas para evitar regresiones; no eliminar recursos o sobrescribir trabajo ajeno sin comprobar sus usos.

## 10. Responsive, accesibilidad y validación

El sitio debe funcionar en móvil, laptop y escritorio con el mismo HTML. Adaptar columnas, filtros, tarjetas, formularios y modales mediante Grid, Flexbox y media queries. Favorecer una construcción desde tamaños pequeños en los nuevos componentes, respetando el CSS existente.

Antes de integrar un avance, revisar:

1. Composición en móvil, laptop y escritorio; usar como referencias de revisión 390, 1024 y 1440 px, y comprobar que a 320 px no aparezca desbordamiento horizontal. Estos anchos son criterios de revisión, no IDs o medidas atribuidos a Figma.
2. Navbar, avatar y desplegables, foco visible, teclado, Escape y retorno del foco al cerrar diálogos.
3. Textos legibles, contraste, controles cómodos de pulsar, `alt` útil y etiquetas de formulario.
4. Carga de recursos y fuentes, enlaces entre grupos, pestañas, estados de API y mensajes de validación.
5. Flujos afectados: filtros, acceso, perfil, roles, fotografías, platos o reseñas según el cambio.
6. Pruebas automatizadas pertinentes desde la rama `test`, utilizando datos aislados o API simulada, sin escribir pruebas de demostración en Atlas.
7. `git diff --check` y revisión de los archivos incluidos en el cambio.

Registrar qué se verificó realmente, las limitaciones y lo pendiente. No convertir la revisión en una afirmación de accesibilidad certificada o de integración con servicios que no se han probado.

## 11. Organización del equipo y uso de Codex

Cada integrante contextualiza a Codex con la pantalla o funcionalidad asignada, la referencia de Figma y los cambios esperados.

Codex apoya el análisis, la implementación y las comprobaciones. El integrante revisa el resultado, comprende los cambios, realiza sus ajustes y verifica que cumplan el objetivo antes de integrarlos. No se asignan aquí nombres, módulos o contribuciones que el equipo no haya acordado.

Al cerrar un avance, es útil registrar el alcance, los archivos afectados, las comprobaciones realizadas y las limitaciones. Conservar evidencia auténtica de autoría y revisión mediante commits y pull requests.

### Ramas

| Rama | Uso |
| --- | --- |
| `main` | Versión estable del frontend y documentación del proyecto. |
| `develop` | Integración del trabajo del equipo. |
| `feature/nombre-del-cambio` | Desarrollo de una funcionalidad a partir de `develop`. |
| `test` | Validación del frontend y mantenimiento de las herramientas de pruebas. |

El flujo de integración es **`feature/...` → `develop` → `main`**. Para validar, incorporar los avances de `develop` en `test`. No mezclar toda la rama `test` hacia `develop` o `main`, porque introduciría los archivos de pruebas y dependencias en las ramas de publicación.

No crear ramas `develop/...` junto con `develop`, ni una rama llamada únicamente `feature` junto con `feature/...`, por el conflicto entre nombres de referencias Git. El backend conserva su organización y sus dependencias propias en su repositorio separado.

## 12. Mantenimiento del SPEC

Actualizar este documento cuando el equipo acuerde cambios de alcance, estructura, identidad visual o tecnologías. Reemplazar el marcador de Figma con el enlace real antes de usarlo como referencia compartida del diseño. Mantener consistencia con el README y distinguir las funcionalidades implementadas de las pendientes.

El SPEC documenta los acuerdos de MesaSpot para la presentación y la continuidad del proyecto, acompañados de la revisión humana del producto.
