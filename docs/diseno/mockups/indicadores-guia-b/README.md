# Indicadores y guía visual B

Composición y guía aprobadas por el usuario, con las precisiones de gráficos documentadas. [Vista diaria](01-indicadores-dia.png), [semana típica](02-semana-tipica.png), [lámina visual](03-guia-visual.png) y [guía escrita](../../guia-visual-b.md). Imágenes estáticas; no son gráficos calculados ni implementación.

## Datos del ejemplo diario

El 14/09/2026 hay cinco clases: Historia 60 alumnos 13:00–14:30; Física I 36 de 14:00–15:30; Matemática I 30 de 14:00–16:00; Programación I 24 de 15:00–17:00; Álgebra 40 de 16:00–17:30. Cuatro aulas habilitadas durante 16 horas aportan 64 horas disponibles. Se reservan 8,5 horas-aula: 13,3 % redondeado, 5 clases y 312 alumnos-hora.

| Franja | Alumnos previstos | Clases simultáneas |
|---|---|---|
| 07:00–13:00 | 0 | 0 |
| 13:00–14:00 | 60 | 1 |
| 14:00–14:30 | 126 | 3 |
| 14:30–15:00 | 66 | 2 |
| 15:00–15:30 | 90 | 3 |
| 15:30–16:00 | 54 | 2 |
| 16:00–17:00 | 64 | 2 |
| 17:00–17:30 | 40 | 1 |
| 17:30–23:00 | 0 | 0 |

Los intervalos agrupados de la tabla se subdividen en medias horas. El pico de alumnos es 126; el de clases, 3, se alcanza en dos franjas. No son conteos de personas únicas.

## Datos de semana típica

Ejemplo independiente: período ficticio 14/09–18/12/2026, cuatro aulas habilitadas y dos lunes no lectivos (12/10 y 23/11). Solo dos series: Matemática I, 30 alumnos, lunes y miércoles de 14:00–16:00; Física I, 36 alumnos, martes y jueves de 15:00–17:00.

Hay 12 lunes y 14 fechas por cada otro día hábil: 68 días elegibles. Matemática aporta 26 clases y Física 28. Total 54 clases, 108 horas reservadas y 4.352 horas disponibles: 2,5 % redondeado. La media diaria de alumnos-hora es 60, 72, 60, 72 y 0 de lunes a viernes.

Las celdas lunes/miércoles de 14:00–16:00 valen 30 alumnos y 1 clase; martes/jueves de 15:00–17:00 valen 36 y 1; las demás cero. El viernes aporta 14 fechas al promedio aunque no tenga clases. El pico de la curva promedio es 36; no equivale al pico observado en una fecha particular de otro conjunto.

## Interacción y casos límite

- Día permite seleccionar fecha; semana típica permite cuatrimestre o rango personalizado. Ambos conservan filtros por aula y tipo donde correspondan.
- Seleccionar una franja muestra horario, valor, unidad y fechas aportantes; foco y toque acceden a los mismos valores que el puntero. La selección no modifica reservas.
- Sin fechas elegibles: «Sin datos aplicables». Sin horas habilitadas: ocupación sin porcentaje. Cobertura histórica desconocida se identifica, sin inferir disponibilidad anterior. Cero es un resultado válido distinto de esos estados.
- Los filtros nuevos invalidan la presentación de resultados anteriores. Carga y errores reutilizan los patrones aprobados. Docente no accede a indicadores.
- La demanda atendida por tipo de aula sigue dentro del alcance y reutiliza la tabla de la [exploración B original](../v2/b-indicadores.png), con clases y horas del mismo filtro. No se reemplaza por una gestión de materias.

## Ajustes de las imágenes

Las curvas y el mapa generados no respetan exactamente las posiciones temporales ni el número de celdas: deben trazarse con los datos de este documento y la especificación, no copiarse como gráficos finales. El mapa usa 32 intervalos, cuatro celdas por bloque de dos horas. Los ceros deben conservarse.

En vista diaria, quitar la tarjeta extra «Aulas abiertas»: el denominador ya se explica junto a ocupación. La fecha del día debe ser un control editable. En semana típica, incorporar el acceso a rango personalizado que la imagen omitió; reemplazar la tabla inventada de asignaturas por demanda atendida por tipo. Las barras se etiquetan en alumnos-hora, no «h». La tabla inventada no define grupos ni conteos académicos del proyecto.

La lámina de componentes es la referencia visual aprobada. Los valores exactos y pautas de la [guía escrita](../../guia-visual-b.md) prevalecen sobre cualquier etiqueta o color aproximado de la imagen.

Referencia funcional: [indicadores y horas pico](../../../especificacion/09-indicadores-y-horas-pico.md). Generadas con la herramienta integrada, referencia B adjunta. [Prompts](prompts.md).
