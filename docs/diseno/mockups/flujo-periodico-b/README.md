# Reserva periódica — recorrido con diseño B

Recorrido aprobado por el usuario, siguiendo la dirección B — PATIO. Se aprueba reunir todos los datos y fechas en una única pantalla, continuar con aulas por día semanal, revisar y confirmar, y mostrar el resultado exitoso. Son imágenes, no una implementación. La [especificación de pantallas](../../../especificacion/14-pantallas-y-navegacion.md) mantiene la autoridad funcional.

## Secuencia

| Paso | Imagen | Interacción aprobada |
|---|---|---|
| Datos y fechas | [Abrir](01-datos.png) | Selección de docente, curso, alumnos, requisitos, período y horarios; comprensión del resumen de clases y omisiones. |
| Aulas por día | [Abrir](02-aulas.png) | Elegir una única aula para todas las fechas efectivas de cada día semanal; cambiar de grupo sin perder la selección del otro. |
| Revisión | [Abrir](03-revision.png) | Entender exactamente qué se guardará, revisar fechas y volver a corregir datos o aulas. |
| Confirmación | [Abrir](04-confirmacion.png) | Reconocer el guardado exitoso y acceder a la reserva o agenda. |

## Ejemplo consistente

Datos ficticios: Matemática I, curso 001-A-2026, Laura Gómez, 30 alumnos previstos, aula Multimedios con proyector. El cuatrimestre de ejemplo va del 14 de septiembre al 18 de diciembre de 2026. No son fechas oficiales de una institución.

Lunes y miércoles de 14:00 a 16:00 generan 28 fechas potenciales. El calendario ficticio tiene cargados como no lectivos los lunes 12 de octubre y 23 de noviembre. Quedan **26 clases: 12 lunes en Aula 203 y 14 miércoles en Aula 105**, sin exclusiones manuales. Se comprobó el cálculo de fechas.

Los días no lectivos son datos del ejemplo cargados manualmente; no representan una integración con un calendario externo de feriados. Este recorrido muestra disponibilidad exitosa. El [mockup de conflictos](../v2/b-seleccion-aula.png) conserva su utilidad como ejemplo alternativo, con datos independientes: las opciones conflictivas solo informan y no permiten confirmar.

## Comportamientos que acompañan las imágenes

- Las fechas del cuatrimestre se consultan; el Bedel no las modifica desde la reserva. El fin horario se calcula a partir del inicio y la duración. Aunque la imagen muestre iconos de calendario/reloj, esos valores derivados no son entradas adicionales.
- «Revisar fechas» permite entender las omisiones del calendario y revisar las exclusiones explícitas durante la preparación. Un cambio de días, horarios o exclusiones exige recalcular disponibilidad.
- La selección del aula corresponde al día semanal completo. Las fechas desplegadas en selección y revisión son informativas y no permiten cambiar el aula por fecha.
- Volver a un paso conserva la preparación activa; no hay borrador persistente. «Salir» abandona la preparación, no cancela una reserva existente.
- «Confirmar reserva» revalida todas las fechas y guarda el conjunto. Si aparece un conflicto, se regresa a asignaciones conservando los datos; no se muestra éxito ni se guarda una reserva parcial.
- La confirmación es una respuesta al guardado exitoso, no un cuarto paso que requiera otra confirmación.

## Límites y siguiente revisión

Quedan aprobados el orden, la composición general y las acciones del recorrido. Textos, estados de controles y espaciados se ajustarán en el diseño detallado. No se han probado interacción, accesibilidad ni adaptación móvil con estas imágenes. La variante esporádica y los restantes bloques ya fueron aprobados; el [estado consolidado](../../README.md) identifica las referencias vigentes.

Generadas con la herramienta integrada de imágenes, usando el mockup B como referencia adjunta. [Prompts completos](prompts.md).
