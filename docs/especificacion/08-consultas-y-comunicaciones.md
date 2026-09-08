# Consultas y comunicaciones

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: acuerdos DA-33 a DA-37 y RF/CU-23/25/26/27/28. No agrega integraciones de mensajería ni formatos de exportación adicionales.

## Mensajes al operador

Al confirmar o cancelar una reserva, mostrar en pantalla el resultado de la operación al usuario que la ejecutó. El mensaje de éxito se presenta después de que la operación se haya guardado. En cancelaciones parciales, identificar el alcance aplicado para no dar a entender que toda la reserva fue cancelada.

Si la validación o la persistencia falla, informar el error sin mostrar éxito. Los conflictos de confirmación conservan la propuesta para corregir conforme a DA-20.

No se envían emails al docente ni a otros usuarios. El email guardado es un dato de contacto. No se incluye centro de notificaciones, avisos entre usuarios, colas de envío ni reintentos de correo.

## Agenda de ocupación

Administrador, Bedel y Docente acceden a una agenda diaria o semanal, con selección de fecha y filtros por tipo y aula. Mostrar curso, comisión, nombre del docente, aula y horario de cada ocurrencia vigente.

Docente solo consulta. Bedel y Administrador pueden abrir desde la agenda las operaciones de modificación y cancelación. Esto no modifica las reglas temporales: las ocurrencias ya iniciadas no se pueden editar ni cancelar.

No mostrar ocurrencias canceladas como bloques de ocupación. Una reserva parcialmente cancelada muestra únicamente sus ocurrencias no canceladas. La agenda se construye desde el estado del detalle, no exclusivamente desde el estado de la cabecera.

Una franja sin reserva no significa automáticamente que sea reservable: también deben cumplirse calendario, apertura y estado del aula. La vista debe distinguir ausencia de ocupación y período no reservable.

## Listados

Se conservan los listados originales:

- Por día: fecha, filtros de tipo y aula, agrupación por tipo; docente, curso/comisión, aula y horario (RF/CU-26).
- Por curso: referencia de curso/comisión y año, mostrando ocurrencias en orden cronológico (RF/CU-27).

Los listados permiten consultar canceladas mediante filtro de estado y las identifican claramente. El filtro se aplica al estado de cada ocurrencia: una cabecera CONFIRMADA puede contener fechas CANCELADAS. Las canceladas no cuentan como ocupación.

Como convención de presentación, el listado inicia con ocurrencias no canceladas; el usuario puede elegir canceladas o todas. La paginación de listados se conserva conforme a los RNF originales; la interfaz define 20 resultados iniciales por página y opciones de 20/50/100 en el documento 14.

## Datos visibles y permisos

| Información o acción | Administrador | Bedel | Docente |
|---|---|---|---|
| Curso, comisión, nombre docente, aula y horario | Sí | Sí | Sí |
| Consultar canceladas por filtro de listado | Sí | Sí | Sí |
| Email docente en el detalle | Sí | Sí | No |
| Modificar/cancelar desde agenda | Sí, si las reglas lo permiten | Sí, si las reglas lo permiten | No |
| Imprimir listado diario | Sí | Sí | Sí |

No entregar el email en las respuestas de consulta destinadas al rol Docente; ocultarlo únicamente en pantalla no cumpliría DA-35. No se agrega restricción de consulta a «mis reservas».

## Impresión

CU-26 se satisface con una vista imprimible del listado diario, que permite imprimir o guardar como PDF usando el navegador. No se genera otro PDF desde el servidor ni se exporta a Excel.

La vista conserva los filtros elegidos y las columnas visibles del listado, e identifica la fecha consultada. Como criterio de completitud, incluye todos los resultados filtrados y no solo la página visible; la paginación de la consulta en pantalla no debe producir una impresión incompleta. No imprime controles de edición ni datos de contacto ausentes en el listado.

No se extiende por defecto la impresión al resto de las pantallas, porque el caso de uso que la exige es el listado diario.

## Criterios de aceptación

| ID | Situación | Resultado esperado |
|---|---|---|
| CA-C01 | Confirmación guardada correctamente. | Mensaje de éxito al operador, sin enviar email. |
| CA-C02 | Confirmación rechazada por conflicto. | Mensaje con fechas afectadas; no indicar registro exitoso. |
| CA-C03 | Cancelación de dos fechas de una reserva de cinco. | Informar cancelación de las dos seleccionadas, sin describir baja total. |
| CA-C04 | Docente abre agenda diaria o semanal. | Consulta ocupación general y filtros sin acciones de modificación/cancelación. |
| CA-C05 | Bedel o Admin abre una ocurrencia futura desde agenda. | Puede acceder a modificar/cancelar, sujeto a validación vigente. |
| CA-C06 | Una fecha de una reserva queda cancelada. | Desaparece como ocupación de agenda; aparece identificada en el listado al filtrar canceladas o todas. |
| CA-C07 | Docente consulta agenda, listados y detalle permitido. | Ve los datos acordados sin recibir el email de contacto. |
| CA-C08 | Bedel/Admin consulta detalle de reserva. | Puede consultar email docente. |
| CA-C09 | Se imprime un listado diario filtrado con varias páginas de resultados. | La vista imprimible contiene todos los resultados filtrados, con fecha y columnas acordadas. |
| CA-C10 | No hay ocurrencias para los filtros elegidos. | Estado sin resultados, sin presentarlo como error técnico ni ocupación cero universal. |

## Trazabilidad

DA-33 precisa el significado de «notificar» en RF-23 y CU-23/25. DA-34 amplía la agenda de RF/CU-28 a los roles operativos manteniendo permisos. DA-35 define información visible. DA-36 resuelve la consulta de cancelación parcial. DA-37 concreta la alternativa de exportación/impresión de CU-26. Los indicadores de RF/CU-29 se desarrollan en [indicadores y horas pico](09-indicadores-y-horas-pico.md), con acuerdos y propuestas separados.

## Mensajes de cuentas

El login informa errores de Supabase y la API informa falta de perfil, cuenta deshabilitada o permiso insuficiente. Alta y cambio administrativo de contraseña muestran éxito solo tras resultado confirmado, y diferencian fallo o resultado incierto del proveedor. No hay avisos de cambio obligatorio ni cuenta regresiva de inactividad propia.

## Información para resolver conflictos

Las alternativas sin disponibilidad son informativas. Admin/Bedel puede consultar las reservas afectadas, sus fechas/horarios, usuario registrador con nombre/email y docente solicitante con contacto, diferenciando ambas funciones. Esto permite comunicación fuera de la app; no hay mensajería, negociación ni cambios automáticos. Docente no recibe datos administrativos del registrador ni emails. La disponibilidad solo cambia cuando se modifican efectivamente las reservas y se repite la comprobación.
