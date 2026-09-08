# Operación diaria — diseño B

Cuatro imágenes de la agenda diaria, el detalle y dos operaciones representativas. Composición y recorridos aprobados por el usuario, incluidos agenda por aulas y alcance de modificación/cancelación. La [especificación](../../../especificacion/14-pantallas-y-navegacion.md) conserva la autoridad sobre reglas y permisos.

| Pantalla | Imagen | Validación principal |
|---|---|---|
| Agenda diaria | [Abrir](01-agenda.png) | Horas en filas y aulas en columnas para leer clases simultáneas sin superponer bloques. |
| Detalle | [Abrir](02-detalle.png) | Resumen, fechas, estados y acceso a modificar o cancelar clases. |
| Cambio de aula | [Abrir](03-modificar.png) | Alcance sobre todas las futuras vigentes del patrón semanal seleccionado. |
| Cancelación | [Abrir](04-cancelar.png) | Selección explícita, motivo obligatorio y resumen del alcance antes de confirmar. |

## Ejemplo y navegación

Se reutiliza la reserva periódica ficticia de Matemática I, 001-A-2026, Laura Gómez, 30 alumnos previstos: 12 lunes en Aula 203 y 14 miércoles en Aula 105, de 14:00 a 16:00. El momento del ejemplo es anterior a la primera clase del 14 de septiembre de 2026. Las cuatro primeras fechas mostradas son 14, 16, 21 y 23 de septiembre.

Abrir un bloque de agenda lleva al detalle de su reserva, con la fecha consultada identificada. «Modificar» permite elegir la operación permitida: datos compartidos mientras ninguna clase haya comenzado, fecha/horario de futuras o cambio de aula. La imagen desarrolla este último caso, sin representar un permiso para cambiar un aula periódica por fecha.

Modificación y cancelación son ejemplos alternativos sobre la reserva original; no se ejecutan consecutivamente. Cambiar el aula de los lunes de 203 a 301 afecta sus 12 clases futuras y deja los miércoles en 105. Cancelar el lunes 14 de septiembre afecta solo esa clase y mantiene otras 25. La cabecera sigue confirmada mientras conserve alguna ocurrencia confirmada.

## Comportamientos

- Agenda diaria: el ejemplo tiene cuatro aulas. Con más aulas se requiere desplazamiento o navegación explícita que indique qué aulas se muestran; no ocultar clases del conjunto mostrado. Encabezados y eje horario deben seguir siendo legibles. La alternativa móvil diaria y la representación semanal se detallarán después.
- Detalle: los filtros de fechas no cambian el estado de reserva. Los contactos y acciones operativas corresponden a Bedel/Administrador; Docente consulta sin emails ni acciones de gestión. Las cuatro filas son una vista resumida, no un nuevo tamaño de página obligatorio.
- Cambio de aula periódica: consultar candidatas que cumplan los requisitos originales y estén libres en todas las futuras vigentes del patrón. Las clases pasadas o iniciadas conservan su aula. Reprogramar una fecha/horario mantiene el aula del patrón y revalida disponibilidad.
- Cancelación: permitir seleccionar una, varias o todas las futuras, con el alcance visible. Las iniciadas y pasadas no se seleccionan; tampoco se reactivan canceladas. El botón de confirmar indica una cancelación de clases; «Volver» abandona la operación.
- Antes de guardar, revalidar permisos, vigencia y versión de la reserva. Un cambio concurrente exige revisar los datos actuales sin sobrescribirlos. El éxito actualiza agenda, detalle e indicadores tras guardar; ninguna imagen implica cambios realizados.

## Ajustes para el diseño detallado

La alineación exacta de bloques con intervalos de media hora y los colores de categorías son ilustrativos. Deben unificarse los colores y los identificadores de curso en todos los bloques de la agenda. El bloque de Programación muestra 15:00–17:00 en su texto: su altura final debe terminar exactamente a las 17:00.

El detalle generado incluye un pie sobre correos automáticos: se omite en el diseño definitivo porque no ayuda a operar esta pantalla. Las fechas no lectivas son datos ficticios cargados manualmente; el rótulo preferido es «Fechas no lectivas», sin sugerir un calendario externo.

Se valida composición, jerarquía y claridad del alcance. Estas imágenes no prueban interacción, accesibilidad ni adaptación móvil. Listados, impresión y reprogramación también están aprobados; la edición de datos compartidos reutiliza los formularios aprobados con las reglas vigentes.

Generadas con la herramienta integrada de imágenes, referencia B adjunta. [Prompts](prompts.md).
