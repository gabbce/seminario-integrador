# Listados, impresión y reprogramación — diseño B

Composición y recorridos aprobados por el usuario: listados diario y por curso, impresión y reprogramación de una clase, con la dirección B. Se mantienen las precisiones de comportamiento y ajustes de detalle documentados debajo. Sin implementación.

| Pantalla | Imagen | Diseño aprobado |
|---|---|---|
| Listado diario | [Abrir](01-listado-diario.png) | Filtros, agrupación por tipo y acceso a detalle. |
| Listado por curso | [Abrir](02-listado-curso.png) | Orden cronológico, filtro de estado y distinción de canceladas. |
| Listado imprimible | [Abrir](03-impresion.png) | Lectura en papel, filtros identificados y ausencia de controles operativos. |
| Reprogramación | [Abrir](04-reprogramar.png) | Comparación de fecha/horario original y propuesto, aula conservada y alcance de una clase. |

## Datos y alcance

El diario y la impresión comparten cinco ocurrencias ficticias del lunes 14 de septiembre de 2026: Historia, Física I, Matemática I, Álgebra y Programación I, agrupadas por General, Multimedios y Laboratorio. La impresión es un mockup de la salida; el sistema usará impresión/guardar PDF del navegador, sin generar PDF en servidor.

El listado por curso presenta un estado alternativo: la primera clase de Matemática I está cancelada y quedan 25 confirmadas. No debe interpretarse como el mismo estado del listado diario. La cabecera de ejemplo describe una única reserva porque solo hay una en esos datos; la consulta por curso debe incluir todas sus reservas y modalidades, no limitarse a una serie ni a un docente. Si hay varios docentes, se identifican por ocurrencia. El intervalo 14 sep–16 dic del mockup corresponde a las fechas extremas de las clases, no a las fechas del cuatrimestre.

La reprogramación es otro ejemplo independiente sobre la clase original confirmada: del lunes 14 al martes 15 de septiembre, de 14:00 a 16:00, conservando Aula 203. Las restantes clases y el patrón de los lunes no cambian. El martes pertenece al período asignado; no se convierte la reserva en esporádica ni se cambia el aula por fecha.

## Comportamientos para implementación posterior

- Los listados comienzan con confirmadas; el filtro permite canceladas o todas. En curso se eligió «Todas» para demostrar el estado cancelado. La paginación conserva filtros y orden, con 20/50/100 resultados por página.
- Las filas visibles del listado de curso son un recorte desplazable de la página de 20 resultados, no una página de cinco con un contador falso.
- Imprimir incluye todos los resultados filtrados, conserva columnas de datos y agrupación, repite encabezados cuando hay varias hojas y elimina controles de acción y paginación. El ejemplo cabe en una hoja. No se agrega impresión por curso ni exportación a Excel.
- Docente puede consultar listados e imprimir el diario sin recibir emails ni acciones de modificación. Bedel/Administrador acceden a operaciones desde el detalle.
- Reprogramar exige una ocurrencia futura, nueva fecha dentro del período asignado, día lectivo, apertura y disponibilidad del aula conservada. La consulta previa no sustituye la revalidación al guardar.
- Un cambio concurrente o una clase que ya comenzó bloquean el guardado y requieren revisar datos actuales. Se conserva la referencia a la fecha original para no regenerarla en cambios de calendario.
- Tras guardar, la agenda ubica la clase en la nueva fecha; el detalle conserva las demás. Para recuperar fuera del período, se aplica el procedimiento vigente de cancelar la original y registrar una esporádica.

Referencias: [consultas e impresión](../../../especificacion/08-consultas-y-comunicaciones.md), [ciclo de reservas](../../../especificacion/07-ciclo-de-reservas.md). Textos, espaciado y estados de controles se pulirán; imágenes no verifican accesibilidad ni interacción.

Generadas con la herramienta integrada de imágenes y referencia B adjunta. [Prompts](prompts.md).

En reprogramación, el día de semana se deriva de la fecha y no es un selector independiente, aunque el mockup muestre una flecha. «Antes» describe la ocurrencia original; el período mostrado es el límite permitido, no el alcance de la consulta puntual de disponibilidad. Estos rótulos se ajustarán en el diseño detallado.
