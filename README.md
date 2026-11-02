# MesaSpot 🍽️

> Plataforma web inteligente para el descubrimiento gastronómico en Lima Metropolitana. Proyecto desarrollado para el curso de **Interacción Humano-Computador y Programación Web (IHC)** en la **Universidad Peruana de Ciencias Aplicadas (UPC)**.

---

## 🚀 Sobre la Startup: Saboría

**Saboría** es una startup tecnológica enfocada en transformar la experiencia culinaria y comercial en el sector gastronómico de Lima Metropolitana. 

### Problemática
En Lima Metropolitana se concentra más del 42 % de empresas del país, de las cuales el sector de comidas y bebidas representa una parte vital de la economía cotidiana. Sin embargo, los comensales enfrentan un problema recurrente: **la dispersión de información**. Precios, promociones, menús, horarios y opiniones reales se encuentran fragmentados entre múltiples redes sociales, buscadores y mapas digitales, generando pérdida de tiempo e incertidumbre al momento de decidir dónde comer.

Por otro lado, los dueños de restaurantes independientes y pequeños negocios gastronómicos tienen dificultades para ganar visibilidad digital, actualizar sus ofertas en tiempo real y gestionar reservas o pedidos sin saturar sus canales convencionales (como WhatsApp o llamadas).

### Nuestra Solución: MesaSpot
**MesaSpot** centraliza la oferta culinaria en una experiencia digital accesible, intuitiva y transparente. Permite a los usuarios:
- Buscar y filtrar restaurantes por ubicación cercana, distrito, rango de precio y especialidad gastronómica.
- Consultar información fidedigna: cartas actualizadas, fotos, promociones vigentes, calificaciones y reseñas de la comunidad.
- Facilitar reservas y pedidos anticipados para reducir esperas.
- Ofrecer a los dueños de restaurantes un panel de administración para actualizar su perfil, platos, promociones y gestionar la interacción con sus clientes.

---

## 👥 Integrantes del Equipo

Proyecto desarrollado por estudiantes de la carrera de **Ciencias de la Computación**:

| Integrante | Código | Carrera | Habilidades y Enfoque Técnico |
| :--- | :---: | :---: | :--- |
| **Carrillo Alor, Iván Leonardo** | `U20241C412` | Ciencias de la Computación | Programación en C++ y Python, maquetación web en HTML/CSS y trabajo colaborativo. |
| **Chavez Pino, Paula Brenda** | `U20241F697` | Ciencias de la Computación | Desarrollo en C++ y Python, diseño y estructura web, documentación y coordinación de equipo. |
| **Macalupu Marchan, Yeissen Beckam** | `U202423813` | Ciencias de la Computación | Desarrollo full-stack con stack MERN, C++, integración de APIs, JavaScript y metodologías ágiles. |
| **Quispe Valdez, Elim Zabdi** | `U20241F731` | Ciencias de la Computación | Lógica algorítmica con C++ y Python, desarrollo de software y análisis de requisitos. |

**Docente:** Henry Antonio Mendoza Puerta  
**Sección:** 4931  
**Periodo:** 2026-20  

---

## 🌿 Flujo de Ramas (Git Branching Model)

El desarrollo del proyecto sigue una metodología colaborativa y controlada de control de versiones con Git:

```
[ main ]          <--- Rama de producción (despliegue final)
   ▲
   │ (Pull Request validado)
[ develop ]       <--- Integración continua del equipo
   ▲         ▲
   │         │ (Merge de feature)
   │     [ feature/nombre-tarea ]  <--- Desarrollo de cada funcionalidad
   │
   └──► [ test ]  <--- Entorno para pruebas automatizadas y QA
```

### Descripción de Ramas

| Rama | Propósito | Reglas de Uso |
| :--- | :--- | :--- |
| `main` | **Producción:** Versión estable, depurada y lista para despliegue público. | Solo recibe cambios verificados desde `develop` vía Pull Request. |
| `develop` | **Integración:** Rama principal de trabajo donde convergen las funcionalidades terminadas. | Base común para crear nuevas ramas y realizar integración continua. |
| `test` | **Pruebas y QA:** Rama dedicada a la ejecución de suites de pruebas automáticas y validaciones. | Recibe actualizaciones desde `develop` para verificar estabilidad. No se fusiona de vuelta a `develop`. |
| `feature/...` | **Nuevas características:** Ramas temporales creadas para implementar una tarea o historia de usuario específica. | Se originan desde `develop` y se integran de regreso mediante Pull Request con revisión de código. |

### Flujo de Trabajo para Nuevas Funcionalidades
1. Asegurarse de tener la última versión de `develop`:
   ```bash
   git switch develop
   git pull --ff-only origin develop
   ```
2. Crear una rama de trabajo descriptiva:
   ```bash
   git switch -c feature/nombre-de-la-funcionalidad
   ```
3. Realizar los commits con mensajes claros y publicar la rama:
   ```bash
   git push -u origin feature/nombre-de-la-funcionalidad
   ```
4. Abrir un **Pull Request** hacia `develop` para su revisión e integración.

---

## 📁 Estructura del Proyecto

El frontend está construido con tecnologías web estándares (**HTML5, CSS3 y JavaScript Vanilla**), sin necesidad de compilación o empaquetadores complejos:

```text
MesaSpot/
├── index.html                   # Página principal (Landing Page de MesaSpot)
├── assets/                      # Recursos multimedia, logotipos e iconos vectoriales
│   └── restaurant-placeholder.svg
├── pages/                       # Vistas y pantallas del aplicativo
│   ├── restaurantes/            # Catálogo general y detalle de restaurantes
│   │   ├── restaurantes.html    # Directorio de búsqueda con filtros avanzados
│   │   └── restaurante.html     # Ficha detallada de un restaurante por ID
│   ├── perfil/                  # Gestión de usuario
│   │   └── perfil.html          # Perfil de usuario, historial y reseñas personales
│   ├── promociones/             # Sección de ofertas y descuentos gastronómicos
│   │   └── promociones.html
│   └── administracion/          # Panel administrativo para restaurantes
│       ├── administracion.html  # Gestión de locales, cartas, fotos y promociones
│       └── administracionDemo.html
├── js/                          # Lógica frontend modularizada en JavaScript
│   ├── api.js                   # Módulo de comunicación HTTP con la API REST
│   ├── config.js                # Variables de configuración del cliente (URL de API)
│   ├── auth.js                  # Control de autenticación, login, registro y tokens
│   ├── profile.js               # Lógica del perfil de usuario y avatar
│   ├── restaurants.js           # Búsqueda, ordenamiento y renderizado del catálogo
│   ├── restaurant-detail.js     # Carga de datos de la ficha del restaurante
│   ├── restaurant-tabs.js       # Navegación entre pestañas (menú, horarios, mapa)
│   ├── reviews.js               # Creación, lectura y calificación de reseñas
│   ├── gallery.js               # Galería interactiva de imágenes y carrusel
│   ├── admin.js                 # Lógica del panel de administración gastronómico
│   ├── promotions.js            # Filtros y despliegue de promociones
│   ├── navbar.js                # Comportamiento del menú de navegación responsive
│   ├── icons.js                 # Inicialización y manejo de iconos
│   └── ui.js                    # Componentes UI reutilizables (modales, alertas)
├── styles/                      # Hojas de estilo modulares en CSS
│   ├── main.css                 # Estilos globales, variables y tipografías
│   ├── navbar.css               # Estilos de la barra de navegación
│   ├── restaurants.css          # Estilos del catálogo de búsqueda
│   ├── restaurant-detail.css    # Estilos de la vista de detalle
│   ├── restaurant-tabs.css      # Estilos de pestañas de navegación interna
│   ├── reviews.css              # Estilos del sistema de reseñas y estrellas
│   ├── gallery.css              # Estilos del visualizador de fotos
│   ├── promotions.css           # Estilos para tarjetas de promociones
│   ├── profile.css              # Estilos del perfil de usuario
│   └── auth.css                 # Estilos de formularios de autenticación
└── vendor/                      # Librerías cliente locales de producción
    ├── lucide-1.61.0.min.js     # Librería de iconografía Lucide
    └── lucide-LICENSE.txt
```

---

## 🔌 Backend y API REST

El frontend se conecta con un backend independiente desarrollado con una arquitectura RESTful robusta y escalable:

- **Stack tecnológico**: Desarrollado con **Node.js**, **Express.js** y **MongoDB** (utilizando el ODM Mongoose).
- **Alojamiento y Servicios**: Desplegado en **Vercel** y con gestión de imágenes/avatares a través de **Cloudinary**.
- **Repositorio del Backend**: [https://github.com/YeisonMC/mesaspot-backend](https://github.com/YeisonMC/mesaspot-backend)
- **URL Base de la API**:
  ```text
  https://mesaspot-backend.vercel.app/api
  ```

### Endpoints Principales Utilizados

| Módulo | Método | Endpoint | Descripción | Acceso |
| :--- | :---: | :--- | :--- | :---: |
| **Autenticación** | `POST` | `/auth/register` | Registro de nuevos usuarios (clientes o administradores). | Público |
| | `POST` | `/auth/login` | Inicio de sesión y emisión del token JWT de acceso. | Público |
| **Usuarios** | `GET` | `/users/me` | Obtiene los datos del perfil del usuario actualmente autenticado. | Autenticado |
| | `PATCH` | `/users/me` | Permite actualizar nombres, apellidos y número de celular. | Autenticado |
| | `POST` | `/users/me/avatar/signature` | Genera la firma segura para subir la foto de perfil a Cloudinary. | Autenticado |
| **Restaurantes** | `GET` | `/restaurants` | Catálogo con paginación y filtros por nombre, distrito, precio y categoría. | Público |
| | `GET` | `/restaurants/:id` | Ficha técnica completa del restaurante (horarios, locales, servicios, platos). | Público |
| **Reseñas** | `GET` | `/restaurants/:id/reviews` | Listado de reseñas con desglose de comida, servicio y ambiente. | Público |
| | `POST` | `/restaurants/:id/reviews` | Registro de una nueva reseña (disponible para rol `CLIENT`). | Cliente |
| **Promociones** | `GET` | `/promotions` | Listado general de promociones y ofertas vigentes. | Público |
| **Metadatos** | `GET` | `/metadata` | Listado de distritos, tipos de comida y opciones de configuración. | Público |
| **Administración** | `*` | `/admin/...` | Gestión de locales, cartas, menús, fotos y promociones (rol `RESTAURANT_ADMIN`). | Admin Restaurante |

---

## ⚙️ Despliegue y Configuración Local

1. **Ejecución local**:
   - Clona este repositorio:
     ```bash
     git clone https://github.com/YeisonMC/MesaSpot.git
     ```
   - Abre la carpeta en tu editor de preferencia (por ejemplo, VS Code).
   - Inicia un servidor local estático (como la extensión **Live Server** de VS Code) sobre `index.html`.
   *(Nota: No abrir directamente mediante doble clic o protocolo `file://` para permitir el correcto funcionamiento de las peticiones HTTP y módulos).*

2. **Conexión con el Backend**:
   - El frontend consume el API REST configurado en [js/config.js](file:///c:/Users/YeisonMC/Desktop/Proyectos/IHC/MesaSpot/js/config.js).
   - Verifica que el backend contemple en sus orígenes permitidos (CORS) la URL local donde se ejecuta el cliente.

---

## 📄 Licencia

Este proyecto ha sido desarrollado con fines académicos para el curso de **Interacción Humano-Computador y Programación Web (UPC)**.
