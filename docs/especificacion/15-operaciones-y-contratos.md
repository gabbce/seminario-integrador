# Operaciones y contratos de la aplicación

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: diseño de operaciones derivado del alcance acordado. Sin código ni OpenAPI generado. Las rutas definitivas y tipos de transporte se fijarán al implementar estos contratos, evitando una API más amplia que los casos de uso.

## Contrato común

API JSON bajo /api. Fechas de clase como fecha local, horas de 24 horas y zona institucional definida; instantes de auditoría con referencia temporal inequívoca. IDs internos y código de curso cumplen funciones distintas, descritas en el modelo. DTO de respuesta por rol; nunca serializar indiscriminadamente entidades con contactos restringidos o datos internos.

Errores distinguen: datos inválidos, sesión ausente/vencida, permiso insuficiente, recurso inexistente, conflicto de versión/solapamiento y fallo técnico. La respuesta incluye mensaje y errores de campo o fechas afectadas según el caso, sin trazas internas. Listados vacíos son respuestas válidas, no errores de sistema.

El cliente no determina usuario autor, estado derivado, rol autorizado, cantidad de conflictos ni estado del año. Esos valores se validan o calculan en backend.

## Operaciones principales

| Operación | Actor | Entrada relevante | Resultado y garantía |
|---|---|---|---|
| Ingresar/cerrar sesión | Todos | Credenciales / sesión | Identidad y sesión de Supabase válidas o rechazo; rol/estado comprobados por Java. |
| Crear/modificar/deshabilitar/rehabilitar/reset de usuario | Admin | Datos de cuenta y versión cuando existe | Validación de email, rol/perfil y último Admin; no afectar reservas. |
| Consultar/gestionar aulas | Admin/Bedel | Filtros o datos y versión | Operación válida o dependencias bloqueantes; historia de estado/tipo coherente. |
| Gestionar año/cuatrimestre | Admin | Datos, estado/acción y versión | Consistencia de calendario, referencias y transiciones. |
| Consultar disponibilidad | Todos | Tipo, alumnos, recursos, fechas/horarios | Esporádicas por fecha; periódicas por patrón con disponibilidad en todas sus fechas y alternativas informativas ordenadas; no retiene aulas. |
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

La preparación devuelve fechas nuevas asociadas al patrón y su aulaAsignada; no guarda cambios. La confirmación repite el cálculo bajo los datos vigentes y verifica que el resumen siga correspondiendo al cambio. Si se modificó una reserva implicada desde la revisión, exige revisar el efecto actualizado.

No crear clases para fechas pasadas, canceladas, excluidas, ya representadas por una clase reprogramada o pertenecientes a series sin continuidad. Eliminar un feriado y ampliar cuatrimestre no son operaciones CRUD independientes de reservas, porque DA-57 exige persistencia conjunta.

## Autorización y sesión

Spring Security valida tokens de Supabase; cada operación exige el rol y estado actuales del perfil del dominio. El cliente no determina permisos ni mantiene un reloj de inactividad propio. El contacto docente se omite de las respuestas dirigidas a Docente, no solo de las columnas visibles. La API usa Bearer explícito, sin sesiones por cookie.

## Validación prevista

Probar externamente los casos de uso a través de API y navegador, con PostgreSQL real para restricciones y concurrencia. Son esenciales: dos altas simultáneas en la misma franja, edición contra cancelación, cambio de calendario con nuevas fechas, baja de aula contra confirmación y protección del último Admin. No sustituir estas garantías por pruebas que simulen la persistencia y omitan transacciones.

La validación de interfaz verifica permisos, flujo de preparación, selección de fechas, respuestas de conflicto, impresión completa y métricas de ejemplo. El protocolo de carga se conserva en el documento 11. La selección de herramientas de test no requiere añadir funciones a la app.

## Contratos administrativos de identidad

Login, renovación y cierre se realizan con Supabase Auth desde el cliente. El backend recibe Bearer token y valida firma, emisor, audiencia, expiración y Usuario activo con rol actual. No recibe un rol fiable del cliente ni administra una sesión paralela. El cierre de sesión y los tokens emitidos tienen los límites del documento 10.

Crear cuenta recibe identidad, perfil y contraseña elegida; restablecer recibe usuario y nueva contraseña confirmada. Solo Admin puede invocarlos. La API administrativa de Supabase se usa desde Java; no se expone su credencial al navegador. Los datos de perfil/rol permanecen en la app. No hay operación de cambio obligatorio ni recuperación pública.

Auth es la autoridad del email; Usuario conserva una copia de consulta. Un cambio administrativo de email se confirma en Auth y luego actualiza la copia. El UUID de Auth nunca cambia por editar email. Si falla actualizar la copia, se informa que la operación está incompleta y se reconcilia consultando Auth; no se intenta crear otra identidad ni se trata la copia antigua como credencial vigente.

Alta de identidad y creación de perfil no son una transacción única aunque la base esté en Supabase. Mostrar éxito solo con ambos completados. Si falla el perfil, la identidad sin perfil carece de permisos y se informa el fallo. Conservar una referencia técnica de la operación incompleta al UUID creado, sin contraseña, para completar el perfil o retirar únicamente la identidad creada por esa operación. No asociar usuarios existentes por email sin comprobar el origen de la operación. Un reintento no duplica identidades ni modifica credenciales de otra cuenta. Esta recuperación es técnica, sin pantalla adicional ni cola de trabajos.

Ante timeout de una llamada administrativa, su resultado puede ser incierto: informar esa condición y verificar el estado antes de repetir cambios. Un cambio de contraseña no se considera atómico con su evento local; si Auth confirma el cambio pero falla la auditoría, no afirmar que la contraseña anterior sigue vigente ni repetir el cambio automáticamente. Las contraseñas nunca forman parte del registro de recuperación.

Cambios de rol, perfil y estado de Usuario son transacciones locales con auditoría. Deshabilitar hace que la siguiente solicitud protegida se rechace; rehabilitar vuelve a permitir identidad válida según el proveedor. No exigir revocación instantánea de todos los JWT ni una tabla propia de sesiones.

## Selección periódica y alternativas informativas

Preparar periódica recibe días semanales/horarios, período y exclusiones explícitas. Java deriva fechas efectivas y devuelve por patrón aulas disponibles en todas ellas. Confirmar recibe aula por patrón, no un mapa editable de aula por fecha. El backend genera los detalles y rechaza cualquier entrada que intente eludir la uniformidad. Editar aula periódica actualiza patrón y todas sus futuras vigentes de forma atómica; fecha/horario puntual conserva el aula del patrón.

Sin disponibilidad, devolver alternativas con grupo (solo esporádicas o con periódicas), fechas esporádicas distintas, minutos acumulados por modalidad y detalle de conflictos; orden exacto del documento 07. No convertir esas alternativas en asignaciones confirmables. Los contactos de registrador y solicitante solo se entregan a Admin/Bedel; usar datos existentes sin inferir una nueva entidad responsable. El ranking no persiste consultas ni alimenta indicadores de conflictos.

Ampliar calendario usa el aula del patrón. Si falla disponibilidad, rechazar todo el cambio y mostrar interferencias; no permitir una asignación excepcional para las nuevas fechas. Toda resolución exige cambios efectivos y nueva validación, no un indicador de «acuerdo externo».
