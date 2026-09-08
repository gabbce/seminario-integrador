# Reserva esporádica — recorrido con diseño B

Recorrido aprobado por el usuario. Reutiliza la dirección B y la pantalla única de datos aprobadas para la periódica. No constituye implementación ni modifica las reglas de la [especificación](../../../especificacion/14-pantallas-y-navegacion.md).

| Paso | Imagen | Diferencia relevante |
|---|---|---|
| Datos y fechas | [Abrir](01-datos.png) | Una fila por fecha concreta, con inicio, duración y fin calculado; permite agregar o quitar fechas de la preparación. |
| Aulas por fecha | [Abrir](02-aulas.png) | Selección independiente para cada fecha y horario; se conserva lo seleccionado para las demás. |
| Revisión | [Abrir](03-revision.png) | Tabla completa de fechas, horarios y aulas antes de confirmar todo el conjunto. |

## Ejemplo

Matemática I, curso 001-A-2026, Laura Gómez, 30 alumnos previstos y aula Multimedios con proyector. Año lectivo 2026 habilitado en los datos ficticios.

- Lunes 14 de septiembre de 2026, 14:00–16:00, Aula 203, capacidad 32.
- Lunes 21 de septiembre de 2026, 16:00–17:30, Aula 105, capacidad 40.

Se usan dos lunes deliberadamente: en una esporádica pueden tener diferentes horarios y aulas. No se generan otros lunes ni se selecciona cuatrimestre. Las fechas deben cumplir las reglas de año habilitado, apertura, futuro y días lectivos; el receso entre cuatrimestres no impide por sí solo una esporádica.

## Interacción y estados

- «Agregar fecha» incorpora una fila editable; «Quitar fecha» retira esa fecha de la preparación, no cancela una reserva guardada. No se puede confirmar un conjunto vacío.
- La fecha y el inicio son editables; el fin se deriva de la duración. La disponibilidad corresponde exactamente a la fecha, horario y requisitos actuales.
- Mostrar hasta tres aulas disponibles, ordenadas por capacidad suficiente e identificador, y acceso a todas las válidas. Una nueva consulta debe invalidar selecciones que ya no cumplan los criterios.
- Si no hay disponibilidad, las alternativas ocupadas se muestran únicamente como información, ordenadas por minutos de solapamiento de esa fecha. No se les aplica la prioridad entre modalidades utilizada para periódicas. Los contactos permiten gestionar la resolución fuera de la app y volver a consultar.
- La selección no ocupa el aula. Confirmar revalida y guarda todas las ocurrencias o ninguna. Si aparece un conflicto, se conserva la preparación y se vuelve a asignaciones; no se omiten fechas automáticamente.
- El éxito reutiliza la [composición aprobada](../flujo-periodico-b/04-confirmacion.png), con «Reserva confirmada», «Se registraron las 2 fechas de Matemática I», tabla por fecha y acciones «Ver reserva» e «Ir a la agenda». No muestra cuatrimestre ni agrupación semanal. No se genera una cuarta imagen para repetir ese patrón.

## Lectura de los mockups

Las imágenes son estáticas. El acento terracota del día activo en selección significa foco de navegación, no conflicto: ambas fechas del ejemplo tienen aula disponible. En el diseño detallado conviene explicitar «Seleccionada» y mantener una distinción clara respecto de errores. El contador de exclusiones en datos es accesorio y no introduce otro paso ni una nueva entidad.

Quedan aprobadas la composición general y las acciones de esta variante. Textos, estados de controles y espaciados se pulirán; las imágenes no verifican accesibilidad ni comportamiento móvil.

Generadas con la herramienta integrada de imágenes y referencia B adjunta. [Prompts completos](prompts.md).
