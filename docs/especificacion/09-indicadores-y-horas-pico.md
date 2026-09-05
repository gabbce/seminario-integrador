# Indicadores y horas pico

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: alcance y dato de alumnos acordados en DA-38 a DA-46; datos compartidos protegidos tras iniciar la serie (DA-47); historia de habilitación de aulas definida en HistorialAula del modelo consolidado y denominador precisado por DA-85. Acceso para Administrador y Bedel conforme a RF/CU-29.

## Fuente y límites de interpretación

Usar ocurrencias confirmadas, sus fechas, horarios y aula, excluyendo canceladas. Una cabecera CONFIRMADA no basta para incluir sus detalles cancelados. Los datos representan programación de clases, no asistencia registrada ni uso observado de las instalaciones.

Los indicadores de conflictos se eliminan del alcance por decisión explícita DA-41. No se necesita guardar consultas de disponibilidad ni intentos rechazados para construir el dashboard. Se conservan las reglas de solapamiento y el detalle operativo de conflictos que ya requieren los casos de uso.

## Indicadores acordados

| Indicador | Definición | Fuente |
|---|---|---|
| Horas reservadas | Suma de duración de ocurrencias no canceladas en el rango consultado; desglosable por aula y tipo. | DA-38 |
| Ocupación porcentual | 100 × horas reservadas / horas habilitadas para reservar del mismo conjunto de aulas y rango. | DA-39 |
| Demanda atendida | Cantidad de ocurrencias y horas reservadas, agrupadas por tipo de aula. | DA-40 |
| Alumnos teóricos simultáneos | Suma de alumnos previstos de las clases activas en una franja, bajo supuesto de asistencia del 100 %. Dato: cantidad de alumnos prevista de la reserva (DA-46). | DA-42 |
| Clases simultáneas | Cantidad de ocurrencias no canceladas activas en una franja. | DA-42 |

Una reserva de varias fechas aporta varias ocurrencias a la demanda atendida. Las horas de aulas diferentes se suman, aunque sean simultáneas; son horas-aula, no duración del día.

## Ocupación: coherencia temporal

El denominador considera fechas del calendario en el rango, apertura institucional y feriados, y respeta los períodos en que cada aula estuvo habilitada y no dada de baja (DA-85). «Cierres» significa tiempo fuera del horario de apertura, fechas no lectivas registradas como feriados e indisponibilidad del aula; no significa estado CERRADO del año lectivo. No se calcula usando únicamente el estado actual del aula: su baja de hoy no elimina las horas disponibles del mes pasado.

Los estados EN_PREPARACION, HABILITADO y CERRADO del año gobiernan las operaciones permitidas, no el denominador ni la elegibilidad histórica de fechas. No se agrega un historial de estados del año para las métricas: habilitarlo o cerrarlo no cambia las estadísticas del mismo rango.

Contar módulos institucionales completos de 30 minutos, con inicio incluido y fin excluido, durante los cuales el aula tenga cobertura conocida, esté habilitada y no dada de baja. Cada módulo válido aporta 0,5 horas-aula. Si se habilita a las 10:10, el primer módulo válido comienza a las 10:30; si se inhabilita a las 10:10, el último módulo completo termina a las 10:00. No redondear el evento almacenado: se aplica esta regla al cálculo. Un cambio de tipo que mantenga disponibilidad no interrumpe la habilitación; atribuir el módulo a su tipo al inicio, para contar una sola vez y conservar la suma de desgloses.

El numerador y denominador deben usar las mismas aulas, fechas y filtros. Para totales, dividir las sumas de horas; no promediar porcentajes de aulas con distinta cantidad de horas disponibles. Si el denominador es cero, mostrar «Sin horas habilitadas», sin división por cero ni porcentaje inventado.

Si solo se conoce el estado de un aula desde cierta fecha, no inferir disponibilidad anterior. HistorialAula comienza al crear el aula y registra intervalos de estado/tipo; la demo precarga intervalos explícitos para su histórico, sin introducir un historial genérico de todos los atributos.

DA-51 protege clases en curso y DA-69 impide altas/bajas retroactivas de feriados. El documento 13 concreta los intervalos de habilitación y cobertura para el denominador histórico. DA-53 permite esporádicas durante el receso, por lo que el receso no se excluye por sí mismo como cierre institucional.

## Franjas de 30 minutos (DA-44)

Usar los módulos ya acordados, de 07:00 a 23:00. Una clase cuenta desde su inicio inclusive hasta su fin exclusivo. Así, una clase que termina a las 14:00 no coincide con otra que empieza a las 14:00.

Para cada franja, sumar alumnos previstos de las ocurrencias activas y contar esas ocurrencias como clases simultáneas. No sumar capacidades máximas de las aulas: un aula para 80 personas no implica una clase de 80 alumnos.

Ejemplo ilustrativo, no datos del proyecto:

| Clase | Horario | Alumnos previstos |
|---|---|---|
| A | 14:00–15:00 | 30 |
| B | 14:30–15:30 | 20 |

| Franja | Clases simultáneas | Alumnos teóricos simultáneos |
|---|---|---|
| 14:00–14:30 | 1 | 30 |
| 14:30–15:00 | 2 | 50 |
| 15:00–15:30 | 1 | 20 |

No sumar 30 + 50 + 20 para afirmar que hubo 100 personas distintas. Los mismos alumnos pueden ocupar varias franjas. Sin identificación o matrícula individual tampoco puede garantizarse que las clases representen grupos de personas distintos. El indicador es una estimación por clases, no un conteo de individuos únicos.

## Vistas y comparaciones (DA-43/44/45)

### Día concreto

Curvas por franja de alumnos previstos y clases simultáneas. Mostrar máximo de alumnos, máximo de clases y las franjas donde se alcanzan; los dos máximos no tienen por qué coincidir.

### Semana típica del cuatrimestre

Mapa de lunes a viernes por franjas de media hora. Cada celda representa la media de alumnos o clases de los días equivalentes del período: lunes 14:00 se calcula sobre los lunes lectivos del cuatrimestre. Incluir ceros de días lectivos sin reservas; excluir feriados y días fuera de apertura. El estado administrativo del año no excluye fechas; tampoco se elimina un día elegible por no tener clases o aulas disponibles, pues esta media describe programación de clases, no porcentaje de ocupación. Mostrar cuántas fechas aporta cada día de semana. Si no hay fechas elegibles, mostrar «Sin datos aplicables».

Esto evita comparar sumas de cinco lunes con sumas de cuatro miércoles. Una media de 42 alumnos no significa que haya exactamente 42 cada lunes: es un perfil promedio del período.

### Comparación entre días

Comparar pico de concurrencia prevista y volumen de alumnos-hora, además de clases programadas (DA-45). Alumnos-hora es suma de alumnos previstos × duración de cada clase en horas; no se presenta como personas únicas. Ayuda a distinguir un pico corto de una jornada con mucha concurrencia sostenida. En comparaciones entre días de semana usar magnitudes por día: media de alumnos-hora de cada lunes frente a la de cada miércoles, en vez de totales que dependan del número de fechas. Etiquetar por separado el máximo de la curva promedio semanal y el máximo de una fecha concreta; son estadísticas distintas.

### Rangos seleccionados

Reutilizar las mismas vistas y fórmulas con inicio/fin seleccionados, además del acceso rápido por cuatrimestre (DA-44). No introducir otra clase de reporte o métrica. La semana típica se calcula sobre los días elegibles del rango y debe mostrar ese rango.

## Cantidad de alumnos prevista (DA-46)

Se renombra «Capacidad mínima solicitada» a «Cantidad de alumnos prevista» como único dato de la reserva. No se conservan dos campos ni se requiere cargar dos cantidades. Los requisitos y diagramas históricos mantienen sus textos originales; esta decisión define el significado vigente.

| Concepto | Entidad | Significado |
|---|---|---|
| Capacidad del aula | AulaGeneral, heredada por sus subtipos | Máximo de personas que admite el espacio. |
| Cantidad de alumnos prevista | Reserva, común a sus ocurrencias | Tamaño esperado del grupo. Se utiliza tanto como mínimo de capacidad de aula como para calcular concurrencia teórica. |

Ejemplo: una reserva de 30 alumnos puede usar un aula de capacidad 50. Aporta 30 alumnos previstos a cada franja que ocupa, nunca 50. La regla es capacidad del aula ≥ cantidad de alumnos prevista.

No hay matrícula individual ni comprobación de asistencia. La cantidad es la estimación informada al reservar. El modelo actual aplica el dato a todas las ocurrencias de la reserva. DA-47 impide modificar la cantidad una vez iniciada la serie. Si cambia para clases futuras, se cancelan las afectadas y se crea otra reserva. Así se preserva el valor histórico sin versiones por ocurrencia.

## Criterios verificables ya derivados

- Una ocurrencia cancelada no suma horas, demanda atendida ni concurrencia.
- Dos clases simultáneas de dos horas cada una aportan cuatro horas reservadas, no dos.
- Una ocurrencia de dos horas sobre ocho horas habilitadas aporta 25 % de ocupación.
- Un conjunto con cero horas habilitadas no produce un porcentaje numérico de ocupación.
- Una baja actual de aula no elimina del denominador su tiempo habilitado previo conocido.
- No aparece un indicador de conflictos ni se exige registrar intentos rechazados para estadísticas.

Las franjas, vistas y promedios están acordados por DA-43/44/45. DA-46 define como fuente la cantidad de alumnos prevista de la reserva.

- Una clase de 30 alumnos durante dos horas aporta 30 alumnos simultáneos mientras está activa y 60 alumnos-hora; no se presenta como 60 personas.
- Dos clases consecutivas del mismo grupo no se suman para un total de alumnos distintos. Sus franjas se muestran separadas y su duración aporta a alumnos-hora.
- Una semana típica divide por la cantidad real de días equivalentes elegibles, incluyendo días lectivos sin reservas y excluyendo feriados.
- Las comparaciones de volumen entre lunes y miércoles usan promedio diario de alumnos-hora, no sumas sobre cantidades desiguales de fechas.
- Dos reservas simultáneas que involucren personas compartidas pueden sobreestimar concurrencia. No se inventa una deduplicación por materia o comisión, porque esos datos tampoco identifican a cada alumno. Clases simultáneas y horas-aula se ofrecen como medidas complementarias independientes de ese conteo.

## Trazabilidad respecto de las fuentes

DA-38/39/40 precisan ocupación y demanda de RF/CU-29. DA-41 elimina explícitamente el componente estadístico de conflictos, manteniendo RF/CU-20. DA-42 agrega concurrencia teórica de alumnos y clases a pedido del usuario. La historia mínima de habilitación de aulas es consecuencia de DA-39; los gráficos de horas pico se obtienen de reservas sin sensores, control de asistencia ni integración académica.
