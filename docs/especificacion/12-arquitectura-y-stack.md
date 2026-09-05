# Arquitectura y stack acordados para la demo local

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: stack aprobado por DA-81, registrado en [ADR-0001](../adr/0001-stack-y-organizacion.md). No se ha creado código ni instalado dependencias. Las convenciones técnicas siguientes concretan el stack dentro del alcance acordado.

## Stack aprobado

Java con Spring Boot para una API y React con TypeScript y Vite para la interfaz. Tailwind CSS y shadcn/ui como base de componentes, Chart.js para gráficos y una tabla coloreada para la semana típica. PostgreSQL y Docker Compose como decisiones ya aprobadas.

| Parte | Selección | Estado |
|---|---|---|
| Backend | Java + Spring Boot | Aprobada por DA-81 |
| Autenticación y autorización | Spring Security, sesiones de servidor | Aprobada por DA-81 |
| Persistencia | Spring Data JPA/Hibernate, con transacciones y restricciones explícitas | Aprobada por DA-81 |
| Base de datos | PostgreSQL | Aprobada |
| Frontend | React + TypeScript + Vite | Aprobada por DA-81 |
| Interfaz | Tailwind CSS + shadcn/ui | Aprobada por DA-81 |
| Navegación | React Router en modo de aplicación cliente | Convención técnica |
| Gráficos | Chart.js y tabla coloreada para mapa semanal | Aprobada |
| Ejecución local | Docker Compose | Aprobada |

Las versiones base se concretan en el [documento 17](17-operacion-local-y-verificacion.md); los parches compatibles se fijarán en las dependencias al implementar.

## Motivos y alternativas

Java permite expresar con claridad las entidades y especializaciones de los diagramas. Spring Boot, Spring Security y JPA ofrecen una base para la API, permisos y persistencia, pero no resuelven por sí solos las reglas de reservas ni sustituyen el diseño de transacciones. Esta es una recomendación de adecuación al proyecto, no una afirmación de que otros lenguajes impidan respetar el modelo.

Node con NestJS es una alternativa razonable si el equipo prioriza TypeScript en frontend y backend. Laravel también cubre el dominio si PHP es la tecnología que mejor domina el equipo. Ante ausencia de esa preferencia, se seleccionó Java/Spring por la correspondencia con el diseño orientado a objetos académico. No se realizará una prueba de implementación para decidir en esta etapa.

React/Vite cubre una app de gestión autenticada servida por una API Java. El alcance actual no requiere renderizado de servidor de frontend ni funcionalidades de Next. Elegir React/Vite implica concretar navegación y acceso a datos; Vite no los aporta automáticamente. Se adopta React Router y llamadas HTTP al backend, sin introducir por defecto un estado global complejo.

## Arquitectura

Un backend único organizado por módulos funcionales, una interfaz React y una base PostgreSQL. La separación de interfaz y API no implica separar el backend en microservicios. El repositorio contendrá ambos proyectos y la configuración de demo; aún no se crean carpetas de aplicación.

Módulos del backend: cuentas, aulas, calendario, referencias de materias/cursos/docentes, reservas y consultas/indicadores. Las operaciones de calendario y generación de clases comparten el límite transaccional acordado en DA-57, dentro de la misma aplicación.

La API valida permisos, datos, estados, horarios y concurrencia. El frontend presenta formularios, agenda y gráficos; sus validaciones ayudan al usuario, pero no constituyen la protección de integridad. Los indicadores se calculan en backend con las fórmulas acordadas para evitar discrepancias entre vistas.

## Autenticación

Sesiones de servidor con cookie HttpOnly, usando Spring Security. Configurar expresamente protección CSRF, permisos y endpoints de sesión. Evitar introducir JWT con renovación cuando solo hay un navegador y una API de esta demo. Las sesiones forman parte del stack aceptado.

Bloqueo tras cinco fallos, inactividad de 120 minutos, invalidación al deshabilitar y contraseña temporal obligatoria son requisitos propios: no afirmar que quedan cumplidos automáticamente por instalar Spring Security. El cálculo de inactividad debe excluir refrescos automáticos del frontend.

Admin inicial usa variable de entorno conforme a DA-77, guardando hash y sin sobrescribir una cuenta existente al arrancar. No tiene cambio obligatorio; las altas desde la app sí.

## Modelos y concurrencia

Preservar Usuario y especializaciones, aulas y subtipos, Reserva y modalidades, y DetalleReserva. El documento 13 concreta tablas base y especializaciones vinculadas por clave compartida, conservando el diseño de dominio.

Confirmar una reserva y actualizar calendario con nuevas clases requieren transacciones; la ausencia de solapamientos debe protegerse también bajo concurrencia. JPA no basta por sí solo para impedir carreras entre dos confirmaciones. Los documentos 13/15 concretan restricciones de exclusión, versiones y coordinación transaccional además de validaciones funcionales.

DA-50 exige detectar una edición sobre datos desactualizados y devolver un conflicto comprensible al operador. El contrato de API distingue este caso de errores de formulario y fallos técnicos.

## UI y gráficos

Usar componentes propios basados en shadcn/ui y Tailwind para formularios, filtros, tablas, diálogos y navegación adaptable. No convertir la biblioteca en un motivo para agregar pantallas. Chart.js dibuja curvas/barras; la semana típica se representa con tabla coloreada y valores legibles. Las vistas usan datos calculados por la API y permisos del rol.

Se conserva impresión por navegador del listado diario y ausencia de aplicación móvil nativa. Las vistas y filtros de agenda están en documentos 08/14; la selección de un componente al implementar debe respetarlos, sin agregar arrastrar y soltar.

## Demo local

Docker Compose coordina aplicación y base de datos, con servicio auxiliar de respaldos. Spring sirve frontend estático y API bajo un único origen; durante desarrollo Vite reenvía consultas al backend. El documento 17 concreta ejecución y configuración.

Los gráficos y componentes se distribuyen con la app para que su uso no dependa de una CDN durante la demo. La preparación inicial puede requerir descargar herramientas y dependencias; no se promete instalación inicial sin internet.

Respaldos lógicos diarios con retención de 14 días permanecen exigidos por RNF-02. El documento 17 define el mecanismo local y la prueba de restauración. Auditoría consultada con herramientas técnicas, sin pantalla de app, conforme a DA-76.

## Fuentes primarias consultadas

- [Spring Boot](https://docs.spring.io/spring-boot/index.html): aplicaciones Java autónomas y configuración integrada.
- [Spring Security](https://docs.spring.io/spring-security/reference/index.html): autenticación y autorización.
- [React: construir una app](https://react.dev/learn/build-a-react-app-from-scratch): Vite con TypeScript y responsabilidades adicionales de navegación/datos.
- [shadcn/ui con Vite](https://ui.shadcn.com/docs/installation/vite): integración de componentes y Tailwind.
- [Chart.js: integración](https://www.chartjs.org/docs/latest/getting-started/integration.html).
- [Docker Compose](https://docs.docker.com/compose/).

## Concreción técnica

- Java 21 como base del proyecto. La documentación actual de requisitos de Spring Boot admite esa versión; las versiones base están en documento 17 y sus parches se fijarán al implementar mediante un conjunto compatible, sin mezclar versiones de Spring elegidas individualmente.
- Maven para backend y npm para frontend, con versiones reproducibles y archivos de bloqueo cuando se implemente. No son nuevas capacidades funcionales.
- Una API bajo /api y frontend estático bajo el mismo origen local. Spring Boot puede servir los archivos estáticos del build de React; Vite se usa en desarrollo y compilación, no requiere otro servidor de aplicación para la demo empaquetada.
- DTO de entrada/salida separados de entidades persistentes, para no entregar hashes, email docente a roles no autorizados o relaciones internas por serialización automática.
- El modelo consolidado y las operaciones indican dónde usar transacciones; JPA no es una sustitución de las restricciones de integridad.

Fuentes adicionales: [requisitos de Spring Boot](https://docs.spring.io/spring-boot/system-requirements.html) y [aplicaciones web y recursos estáticos](https://docs.spring.io/spring-boot/reference/web/servlet.html).

## Estado de cierre

Stack acordado y decisiones funcionales cerradas hasta DA-85. La versión 1.0 de modelo, contratos y navegación está finalizada y aprobada por el usuario. La implementación sigue fuera de esta etapa.
