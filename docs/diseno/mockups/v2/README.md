# Segunda exploración visual

**Dirección elegida para el sistema: B — PATIO.** A queda como alternativa exploratoria. La elección aprueba la identidad y composición generales; los detalles de interacción y adaptación se completan según el [plan de validación](../../validacion-interfaces.md).

Seis mockups generados como imágenes para validar la dirección visual antes de implementar. La especificación vigente conserva la autoridad sobre el comportamiento de la aplicación.

| Dirección | Agenda | Reserva periódica | Indicadores |
|---|---|---|---|
| A — ATLAS | [Imagen](a-agenda.png) | [Imagen](a-seleccion-aula.png) | [Imagen](a-indicadores.png) |
| B — PATIO | [Imagen](b-agenda.png) | [Imagen](b-seleccion-aula.png) | [Imagen](b-indicadores.png) |

## Direcciones

**ATLAS:** navegación lateral azul oscuro, tipografía condensada, bordes rectos, divisores finos y mayor densidad. Busca precisión y rapidez de lectura para el trabajo diario.

**PATIO:** navegación superior, fondo marfil, verde bosque y terracota, títulos serif y paneles redondeados con más espacio. Busca una presencia cálida y distintiva conservando la jerarquía operativa.

Estos nombres identifican alternativas visuales; no cambian el nombre de la aplicación ni prescriben una biblioteca de componentes.

## Comportamiento representado

- Agenda semanal con un tramo visible del horario institucional de 07:00 a 23:00.
- Reserva periódica con una misma aula para todas las fechas efectivas de cada día semanal. Lunes y miércoles pueden tener aulas diferentes; no se elige un aula por fecha.
- Ejemplo con lunes resuelto y miércoles sin disponibilidad completa. Las alternativas conflictivas son informativas: primero las que solo tienen conflictos esporádicos, luego las que tienen conflictos periódicos. Se muestran reservas y contactos para gestionar la resolución fuera de la aplicación y volver a consultar. No se confirma mientras haya conflictos.
- Indicadores de horas reservadas, ocupación, clases y concurrencia teórica; mapa por día y horario y comparación de alumno-horas. No representan asistencia real ni personas únicas, ni introducen indicadores de conflictos.

## Límites de la validación

Las imágenes permiten comparar composición, personalidad y jerarquía. Los datos son ficticios. La alineación exacta de bloques horarios, la cantidad de celdas del mapa de calor y algunos textos son ilustrativos: deben ajustarse a la especificación al construir el diseño definitivo. No verifican accesibilidad, adaptación a otros tamaños ni interacción.

En particular, el mapa definitivo usa intervalos de 30 minutos entre 07:00 y 23:00. En la selección periódica, la regla del aula fija aplica a cada día semanal, aunque el texto contextual del ejemplo se refiera a los miércoles.

Generación: herramienta integrada de imágenes. [Prompts completos](prompts.md). Referencias: [pantallas](../../../especificacion/14-pantallas-y-navegacion.md), [consultas y conflictos](../../../especificacion/08-consultas-y-comunicaciones.md) e [indicadores](../../../especificacion/09-indicadores-y-horas-pico.md).
