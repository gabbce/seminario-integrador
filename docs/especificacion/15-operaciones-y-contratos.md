# Operaciones y contratos de la aplicación

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: diseño de operaciones derivado del alcance acordado. Sin código ni OpenAPI generado. Las rutas definitivas y tipos de transporte se fijarán al implementar estos contratos, evitando una API más amplia que los casos de uso.

## Contrato común

API JSON bajo /api. Fechas de clase como fecha local, horas de 24 horas y zona institucional definida; instantes de auditoría con referencia temporal inequívoca. IDs internos y código de curso cumplen funciones distintas, descritas en el modelo. DTO de respuesta por rol; nunca serializar indiscriminadamente entidades con hashes o contactos.

Errores distinguen: datos inválidos, sesión ausente/vencida, permiso insuficiente, recurso inexistente, conflicto de versión/solapamiento y fallo técnico. La respuesta incluye mensaje y errores de campo o fechas afectadas según el caso, sin trazas internas. Listados vacíos son respuestas válidas, no errores de sistema.

El cliente no determina usuario autor, estado derivado, rol autorizado, cantidad de conflictos ni estado del año. Esos valores se validan o calculan en backend.

## Operaciones principales

| Operación | Actor | Entrada relevante | Resultado y garantía |
|---|---|---|---|
| Ingresar/cerrar sesión | Todos | Credenciales / sesión | Sesión válida o rechazo; bloqueo y vencimiento acordados. |
| Cambiar contraseña temporal | Titular | Nueva contraseña y confirmación | Cambia hash y elimina obligación; temporal anterior deja de servir. |
| Crear/modificar/deshabilitar/rehabilitar/reset de usuario | Admin | Datos de cuenta y versión cuando existe | Validación de email, rol/perfil y último Admin; no afectar reservas. |
| Consultar/gestionar aulas | Admin/Bedel | Filtros o datos y versión | Operación válida o dependencias bloqueantes; historia de estado/tipo coherente. |
| Gestionar año/cuatrimestre | Admin | Datos, estado/acción y versión | Consistencia de calendario, referencias y transiciones. |
| Consultar disponibilidad | Todos | Tipo, alumnos, recursos, fechas/horarios | Aulas válidas por fecha y conflictos informativos cuando corresponde; no retiene aulas. |
| Confirmar reserva | Admin/Bedel | Cabecera, patrón/fechas, selecciones y exclusiones | Recalcula y valida propuesta; cabecera y detalles completos o ninguno. |
| Modificar detalles | Admin/Bedel | Reserva/version, IDs elegidos y cambios | Revalidación temporal y de aula; alcance completo o rechazo. |
| Cancelar detalles | Admin/Bedel | Reserva/version, IDs elegidos, motivo | Estados, motivos, cabecera y continuidad de serie consistentes en una transacción. |
| Preparar cambio de calendario | Admin | Versión y cambio propuesto | Resumen de nuevas clases, aulas sugeridas y bloqueos; no cambia persistencia. |
| Confirmar cambio de calendario | Admin | Cambio, versiones revisadas y asignaciones | Recalcular efecto y validar; calendario y clases completos o ninguno. |
| Consultar agenda/listados | Todos | Filtros y paginación cuando aplica | Datos del rol, estados correctos, contacto restringido. |
| Consultar indicadores | Admin/Bedel | Rango, vista y filtros | Fórmulas del documento 09, cobertura y unidades. |
| Consultar referencias | Según formulario autorizado | Texto/año de búsqueda | Materias/cursos y docentes simulados; no gestión académica. |

No se publica una operación para modificar una ocurrencia cancelada, habilitar un cuatrimestre independientemente, obtener contraseñas guardadas, reactivar aulas dadas de baja o consultar estadística de conflictos.

## Confirmación y cálculo de fechas

El frontend puede enviar la selección, pero backend deriva las fechas esperadas a partir de calendario y patrón y comprueba las exclusiones explícitas. No confiar en datos del navegador para omitir una validación o crear una clase fuera del período.

La propuesta temporal no se guarda en una tabla de borradores. En cambio, al confirmar se conservan las exclusiones manuales del patrón para cumplir futuras actualizaciones. Una versión o fecha desactualizada devuelve el conflicto y obliga a revisar.

## Transacciones y concurrencia

Operaciones de escritura usan transacciones ACID. El backend debe proteger operaciones que compiten por la misma aula/fecha y cambios que alteran su elegibilidad o calendario. Las comprobaciones de versión protegen ediciones del mismo agregado; la restricción de no solapamiento protege asignaciones concurrentes de reservas distintas.

Definición técnica del control: versiones para Usuario/Aula/Año/Reserva y bloqueo consistente de los recursos implicados durante escritura. La revisión de versión de Reserva incluye mutaciones de detalles realizadas desde cualquier pantalla. El diseño de implementación debe fijar el mismo orden de adquisición en confirmación, edición y cambio de calendario, evitando bloqueos invertidos.

Si dos confirmaciones compiten por la misma franja, una puede guardar y la otra debe recibir conflicto; no aceptar ambas ni convertir una en éxito parcial. Si dos ediciones compiten por una misma reserva, el segundo operador debe revisar datos actuales antes de guardar.

## Actualización de calendario

La preparación devuelve fechas nuevas asociadas al patrón y su aula propuesta; no guarda cambios. La confirmación repite el cálculo bajo los datos vigentes y verifica que el resumen siga correspondiendo al cambio. Si se modificó una reserva implicada desde la revisión, exige revisar el efecto actualizado.

No crear clases para fechas pasadas, canceladas, excluidas, ya representadas por una clase reprogramada o pertenecientes a series sin continuidad. Eliminar un feriado y ampliar cuatrimestre no son operaciones CRUD independientes de reservas, porque DA-57 exige persistencia conjunta.

## Autorización y sesión

Spring Security controla acceso, sesiones y CSRF. Roles se verifican en backend por operación. Sesión requerida con cambio obligatorio solo puede completar cambio de contraseña o salir. Email de docente se omite de las respuestas dirigidas a Docente, no solo de las columnas visibles.

El cliente informa actividad significativa al usar la aplicación cuando sea necesario para distinguir interacción real de refrescos automáticos; la política de 120 minutos no se prolonga por consultar periódicamente datos. Nunca confiar en un rol enviado por frontend.

## Validación prevista

Probar externamente los casos de uso a través de API y navegador, con PostgreSQL real para restricciones y concurrencia. Son esenciales: dos altas simultáneas en la misma franja, edición contra cancelación, cambio de calendario con nuevas fechas, baja de aula contra confirmación y protección del último Admin. No sustituir estas garantías por pruebas que simulen la persistencia y omitan transacciones.

La validación de interfaz verifica permisos, flujo de preparación, selección de fechas, respuestas de conflicto, impresión completa y métricas de ejemplo. El protocolo de carga se conserva en el documento 11. La selección de herramientas de test no requiere añadir funciones a la app.
