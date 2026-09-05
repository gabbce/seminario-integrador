# Especificación de la aplicación — versión 1.0

**Estado:** especificación funcional y técnica v1.0 final, aprobada por el usuario. Las decisiones funcionales abiertas de la entrevista quedaron resueltas en DA-01 a DA-85. No se ha iniciado código ni se han ejecutado pruebas de aplicación.

## Problema y solución

Una facultad necesita asignar aulas a clases y actividades sin superposiciones, considerando alumnos previstos, recursos, fechas y horarios. La app digitaliza ese circuito para Bedelía y permite consultar ocupación y analizar el uso programado de los espacios.

Primera versión: demostración académica local con datos ficticios, para una institución de Santa Fe, Argentina. Operación desde computadora y consultas docentes también desde celular. Idioma español; horario local institucional.

## Actores y alcance

- **Administrador:** administra cuentas y calendario y realiza todas las operaciones de Bedel.
- **Bedel:** gestiona aulas y reservas, consulta agenda/listados y estadísticas.
- **Docente:** consulta ocupación, disponibilidad y listados, sin modificar reservas ni ver el email de contacto de otros docentes.

El docente solicitante de una reserva proviene de una lista fija que simula una fuente externa; no necesita cuenta de acceso. Materias y cursos son referencias mínimas que se seleccionan o cargan al reservar, sin gestión académica. Un curso se identifica como 001-A-2026: código numérico de materia, comisión y año.

## Reglas centrales

### Aulas

General, Multimedios y Laboratorio informático, conservando los subtipos del diseño original. La capacidad indica personas. Cantidad de PC es solo descriptiva y no es filtro ni condición de reserva.

Solo aulas habilitadas y no dadas de baja se reservan. Modificaciones no pueden invalidar requisitos de clases futuras o en curso. Inhabilitación, mantenimiento y baja se bloquean mientras haya clases afectadas. Baja lógica conserva historial y no se revierte; la interrupción temporal usa estado.

### Calendario

Lunes a viernes, 07:00–23:00, módulos de 30 minutos, inicios a :00 o :30, sin cruce de medianoche. Se admite hoy si el inicio aún no ocurrió; horarios contiguos no se solapan.

Año EN PREPARACIÓN, HABILITADO o CERRADO. Se habilita con dos cuatrimestres completos y sin solapamiento; cada cuatrimestre depende del año, sin estado independiente. Un año cerrado solo se consulta. Eliminaciones respetan dependencias y no borran reservas históricas.

Feriados manuales con fecha y descripción, sin autocompletado externo. No se modifican retroactivamente ni se alteran clases iniciadas. Esporádicas pueden ocurrir en receso, por ejemplo para finales; periódicas se limitan a sus cuatrimestres.

### Reservas

La reserva conserva docente, curso/comisión, alumnos previstos, tipo y recursos solicitados; cada detalle indica un aula, fecha y horario. «Cantidad de alumnos prevista» sustituye la capacidad mínima solicitada: exige aula de capacidad suficiente y alimenta métricas.

Esporádicas para fechas concretas; periódicas cuatrimestrales o anuales con horario por día de semana. Una anual une los dos cuatrimestres y omite receso/feriados. Si el período comenzó, solo genera clases futuras.

Hasta tres sugerencias por menor capacidad suficiente e identificador, con acceso a otras aulas válidas. Permite aplicar aula a fechas compatibles y excluir fechas expresamente. Si no hay aulas libres, mostrar conflictos y menor superposición como información, sin permitir sobre-reserva.

Preparación temporal sin guardar ni ocupar aulas. Confirmación completa del conjunto elegido o ninguna; conflictos nuevos vuelven a revisión. Mutaciones revalidan permisos, tiempo y versión; no sobrescriben ediciones ajenas.

Puede modificarse/cancelarse una, varias o todas las futuras. Cancelación exige motivo, libera ocupación y conserva historia. Una clase iniciada no se modifica; una cancelada no se reactiva. Cabecera CANCELADA solo si todos los detalles lo están; de lo contrario CONFIRMADA, aunque ya no queden futuras.

Docente, curso, alumnos y requisitos compartidos quedan fijos al empezar la serie. Para cambiarlos se cancelan futuras afectadas y se crea otra reserva. Una reprogramación periódica debe permanecer en períodos asignados; fuera se recupera mediante esporádica.

### Actualización de series

Ampliar cuatrimestre o quitar feriado genera las clases periódicas correspondientes. Mostrar impacto, proponer aula de la última ocurrencia no cancelada del mismo patrón y resolver todas las fechas antes de guardar calendario y nuevas clases juntos.

Respetar fechas excluidas, detalles cancelados, clases reprogramadas y cese de continuidad. No extender series a las que se cancelaron todas las futuras, ni generar pasado. Una modificación puntual no altera el patrón semanal.

### Consultas e indicadores

Agenda diaria/semanal para todos los roles; listados por día y curso anual. Canceladas fuera de agenda de ocupación y consultables por filtro en listados. Impresión completa del listado diario y PDF del navegador, sin Excel.

Admin/Bedel consultan horas reservadas, ocupación porcentual sobre horas habilitadas, demanda atendida por tipo y horas pico. Concurrencia prevista por media hora, semana típica por cuatrimestre/rango y alumnos-hora; no medir asistencia real ni personas únicas. Promedios por fechas equivalentes elegibles, incluyendo ceros y excluyendo feriados. Historia de estado/tipo del aula preserva denominadores y desgloses. La ocupación cuenta módulos completos disponibles; los estados administrativos del año no afectan las métricas ni requieren historial propio (DA-85).

### Acceso

Email/contraseña y rol único, sin registro público. Mínimo 12 caracteres, bloqueo de 15 minutos tras cinco fallos y sesión de 120 minutos de inactividad. Altas/reset desde la app generan frase temporal legible con cambio obligatorio.

Admin inicial toma contraseña de variable de entorno, sin cambio obligatorio ni sobrescritura al reiniciar. Deshabilitar invalida sesiones sin cancelar reservas; se puede rehabilitar. Último Admin activo protegido. Turno/legajo opcionales, descriptivos y sin restricciones de acceso.

## Arquitectura y operación

Java 21/Spring Boot, Spring Security con sesiones y JPA/Hibernate; React/TypeScript/Vite, Tailwind/shadcn, Chart.js; PostgreSQL y Docker Compose. Un backend por módulos, interfaz cliente y una base. API y frontend empaquetado bajo el mismo origen local.

Transacciones y restricciones de base protegen reservas/calendario bajo concurrencia. Auditoría consultable técnicamente, sin panel. Respaldos lógicos diarios con retención de 14 días y procedimiento de restauración verificable en el entorno local. Configuración, versiones base y límites de operación se detallan en el documento 17.

RNF de rendimiento conservados: p95 de disponibilidad/listados <1,5 s y altas/modificaciones periódicas <2 s con 50 usuarios concurrentes en la mezcla definida. Escenario sintético explícito, no volumen real conocido.

## Fuera de alcance

- Gestión académica de docentes, cátedras, inscripciones, actas o exámenes.
- Integraciones reales de docentes o feriados, varias instituciones y despliegue de producción.
- Aplicación móvil nativa, correos automáticos y centro de notificaciones.
- Registro público, borradores persistentes y aprobación de solicitudes.
- Sobre-reservas, optimización automática global y asignaciones que ignoren conflictos.
- Filtros por PC, métricas de conflictos, asistencia real o alumnos únicos.
- Excel, PDF generado por servidor y panel de auditoría.
- Restaurar aulas dadas de baja, reactivar canceladas y modificar clases iniciadas.

Estos límites conservan el alcance funcional acordado; no eliminan mensajes de error, trazabilidad o recuperación de datos exigidos.

## Documentos normativos y trazabilidad

| Tema | Documento |
|---|---|
| Arquitectura | [12 — Stack y arquitectura](12-arquitectura-y-stack.md) y [ADR-0001](../adr/0001-stack-y-organizacion.md) |
| Entidades, relaciones y restricciones | [13 — Modelo consolidado](13-modelo-consolidado.md) |
| Pantallas | [14 — Navegación](14-pantallas-y-navegacion.md) |
| Operaciones | [15 — Contratos](15-operaciones-y-contratos.md) |
| Historias de usuario | [16 — Historias](16-historias-de-usuario.md) |
| Demo y verificación | [17 — Operación local](17-operacion-local-y-verificacion.md) |
| Casos de uso vigentes | [18 — Casos y trazabilidad](18-casos-de-uso-vigentes.md) |
| Decisiones | [04 — Registro DA](04-decisiones-acordadas.md) |

Los capítulos 01–11 desarrollan las reglas por tema. Las fuentes literales y diagramas originales están en [fuentes](../README.md#fuentes-preservadas). Ante una diferencia de terminología histórica, aplicar el ajuste DA explicitado y el modelo/caso vigente, sin reescribir la historia del proyecto.

## Cierre de la versión 1.0

Se preservaron 29 RF, 5 RNF y 29 fichas originales. La versión vigente agrega las extensiones aprobadas y documenta exclusiones. El conjunto contiene modelo actualizado, pantallas, contratos, historias y criterios verificables.

El usuario confirma esta entrega como estado final de la especificación v1.0, con DA-01 a DA-85 y los ajustes de la revisión independiente incorporados. No quedan decisiones funcionales pendientes. Los cambios posteriores de alcance deberán registrarse explícitamente y actualizar la versión y los documentos afectados.

La aprobación es documental. No acredita rendimiento, seguridad implementada ni pruebas de restauración: esas evidencias corresponden a construcción posterior. La finalización de la especificación no inicia implementación automáticamente.
