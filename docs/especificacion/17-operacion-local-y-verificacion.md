# Operación y verificación de la demo

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

## Ejecución

Aplicación Java con frontend React compilado bajo un mismo origen. Docker Compose permite levantar la app local; para desarrollar se admite Java y Vite con proxy. Supabase remoto provee PostgreSQL y Auth en ambos casos. Se necesita internet durante el uso, incluso si la presentación se hace desde localhost.

La misma aplicación puede desplegarse en un host con URL HTTPS. Su elección se realiza al publicar y debe soportar el proceso Java, las variables privadas y la conexión a Supabase. No se exige alojamiento de producción, funcionamiento offline ni un segundo proveedor de autenticación.

## Dependencias

Java 21, Spring Boot 4.1 con versiones administradas de Spring Security/JPA/Hibernate; React 19, Vite 8, Tailwind 4 y Chart.js 4, TypeScript, React Router y cliente Supabase para frontend. Maven y npm; Node 22 al menos 22.12 para herramientas de frontend. Fijar parches y archivos de bloqueo al implementar y verificar compatibilidad del conjunto.

La versión de PostgreSQL es la disponible en el proyecto Supabase elegido y debe registrarse en la configuración de la demo. Validar migraciones y restricciones contra esa versión, sin imponer una imagen local distinta. No usar etiquetas flotantes como única definición reproducible de las dependencias propias.

## Configuración necesaria

| Dato | Uso y ubicación |
|---|---|
| URL del proyecto Supabase y clave pública | Cliente de autenticación del navegador. |
| Emisor, audiencia y claves públicas JWT | Validación de identidad en Java; coherentes con el proyecto. |
| Conexión PostgreSQL y credenciales | Solo backend y migraciones; conexión cifrada y pool compatible con el proveedor. |
| Credencial administrativa Supabase | Solo backend para crear identidades y actualizar contraseñas/email. Nunca variable pública Vite. |
| Email y contraseña del Admin inicial | Variables privadas para la inicialización explícita e idempotente. |
| Puerto/origen de aplicación | Acceso local; URL HTTPS al publicar. Configurar orígenes y URLs autorizadas en los componentes que las requieran. |
| Activación de datos ficticios | Carga explícita, sin repoblar destructivamente en cada arranque. |

Desactivar registro público en Supabase. Las altas administrativas de la demo no dependen de correo de confirmación ni recuperación por email. Registrar la configuración de contraseñas y sesiones del proveedor usada en la demo; no exigir valores propios de inactividad o bloqueo. Mantener el esquema del dominio fuera del acceso directo del cliente.

La ausencia de secretos requeridos impide iniciar operaciones que los necesiten y produce un error comprensible. El archivo de ejemplo de configuración contiene nombres y valores sustituibles, nunca claves reales. La zona funcional sigue siendo America/Argentina/Cordoba.

## Preparación de datos

Inicializar la identidad Auth del Admin y su perfil en la app sin duplicarlos ni cambiar credenciales existentes. Si una inicialización queda incompleta, comprobar y completar su vínculo siguiendo el documento 15. Cargar docentes simulados, materias, comisiones, calendario y aulas ficticias con referencias coherentes.

Incluir escenarios reconocibles de reservas, cancelaciones, feriados, ampliación de cuatrimestre e indicadores. Una reinicialización de datos ficticios es una operación técnica explícita del responsable; nunca ocurre automáticamente al arrancar ni afecta otros proyectos de Supabase. No se exige respaldo, retención o restauración como entregable.

## Auditoría del dominio

Registrar mutaciones de cuentas/perfiles, aulas, calendario y reservas con actor, instante, entidad, operación y resultado. Las operaciones locales exitosas y su evento se guardan en la misma transacción. Para operaciones administrativas de Auth, registrar el resultado conocido y señalar fallos o resultado incierto sin almacenar contraseñas ni tokens.

Supabase gestiona los eventos de autenticación; no reproducir en Java su registro de logins, fallos o límites de acceso ni exigir exportarlo. La bitácora de negocio permanece durante la vida de la base y se consulta mediante herramientas técnicas. No hay panel, purga automática ni indicadores de conflictos.

## Verificación funcional

API y navegador verifican comportamiento; PostgreSQL real verifica restricciones y transacciones. Cubrir CU y extensiones del documento 18. Calendario e indicadores pueden usar fechas fijas en pruebas. No afirmar cumplimiento por completar la documentación.

Casos imprescindibles:

- Login válido/inválido, cierre y rechazo de tokens inválidos; ausencia de registro público.
- Alta y cambio de contraseña por Admin, con rechazo para otros roles; acceso sin cambio obligatorio.
- Cuenta sin perfil o deshabilitada no opera, incluso con token válido; cambios de rol afectan permisos de solicitudes posteriores.
- Fallo parcial de alta Auth/perfil no produce éxito falso ni duplicados al resolverlo.
- Dos confirmaciones para la misma aula/franja no se guardan ambas; edición sobre versión vieja exige revisión.
- Confirmación concurrente con inhabilitación de aula o feriado conserva integridad.
- Error durante ampliación de calendario no deja calendario/reservas parcialmente modificados.
- Dos intentos simultáneos de quitar el último Admin conservan al menos uno activo.
- Roles docentes no reciben contactos restringidos ni datos administrativos.

Las pruebas de autenticación verifican integración con un proyecto de demo; los límites internos del proveedor no se someten al escenario de carga del dominio.

## Navegadores y carga

Chromium y Firefox estables, registrando versiones al ejecutar; computadora 1366×768 y móvil 390×844 para consultas docentes. Validar teclado, errores por campo, agenda diaria e impresión completa.

El documento 11 define el escenario sintético y guion: 30 aulas, hasta 25.600 ocurrencias periódicas y 500 esporádicas; 50 sesiones con 5 operativas/45 docentes, ciclos fijos, espera de 5 segundos tras cada operación, 2 minutos de calentamiento y 10 de medición. Conservar RNF de rendimiento del dominio. Registrar equipo, región de servicios, red, recursos, latencias y tasa efectiva; login/renovación se registran separados de los percentiles de negocio. No inferir una garantía de rendimiento del plan gratuito.

## Evidencias de implementación

- Instrucciones reproducibles para ejecutar la app, configurar Supabase e inicializar datos ficticios.
- Matriz CU/EX con resultados, incluyendo permisos e integración de cuentas.
- Pruebas de integridad, concurrencia y rendimiento del dominio.
- Recorrido de presentación con agenda, reservas, calendario y métricas.

Estas evidencias corresponden a implementación; todavía no se han producido.
