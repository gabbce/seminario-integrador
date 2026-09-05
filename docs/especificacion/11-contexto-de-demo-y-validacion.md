# Contexto de demostración y validación

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: contexto acordado DA-70 a DA-73. El escenario de carga siguiente es una referencia de ingeniería ante falta de estimaciones reales; no es una medición ni un límite del producto. No se ha ejecutado ninguna prueba de aplicación.

## Uso previsto

Demostración académica con datos ficticios para una facultad de Santa Fe, Argentina. Aplicación web; Admin y Bedel operan principalmente desde computadora, mientras Docente puede consultar también desde celular. No se construye aplicación móvil nativa.

Usar fechas y horas de la institución, con zona America/Argentina/Cordoba, independientemente del dispositivo. Esto alcanza horarios de clases, inicio futuro, cierres y agrupación por día de los indicadores. El almacenamiento debe conservar esa interpretación funcional, según el modelo y los contratos vigentes.

No cargar datos personales reales para demostrar. Docentes de fuente simulada, cuentas, aulas, materias y comisiones serán ficticios, con identificadores coherentes y casos útiles para verificar flujos. La demo no implica integración académica real ni operación de producción.

## Escenario sintético de referencia

| Dimensión | Referencia para validar |
|---|---|
| Aulas | 30: 10 generales, 10 multimedios, 10 laboratorios informáticos, con capacidades y estados variados. |
| Calendario | Dos años con dos cuatrimestres cada uno; año histórico cerrado y año operativo habilitado. Usar fechas coherentes con el momento de la prueba. |
| Series | 200 reservas periódicas por cuatrimestre; referencia de dos días por semana durante 16 semanas. |
| Ocurrencias | Hasta 6.400 por cuatrimestre antes de descontar feriados/exclusiones; hasta 25.600 para cuatro cuatrimestres, más esporádicas. |
| Esporádicas | 500 ocurrencias distribuidas entre días lectivos y recesos. |
| Cuentas concurrentes | 50: 5 Admin/Bedel y 45 Docente, conforme a RNF-05. |
| Variante de carga | Variar ocupación por hora y día para que el dashboard permita comparar picos, sin generar solapamientos inválidos como datos normales. |

La cantidad de reservas y fechas es tamaño del conjunto de prueba, no un máximo permitido. Duraciones, aulas y grupos deben distribuirse de manera compatible con la apertura y disponibilidad. La misma aula no puede recibir detalles superpuestos para alcanzar artificialmente el volumen.

Incluir casos pequeños identificables para demostrar: cancelación parcial, fecha excluida, feriado, cambio puntual de horario, ampliación de cuatrimestre, feriado retirado, conflicto concurrente, aula en mantenimiento y reserva de 30 alumnos en aula de capacidad superior.

## Comprobación de rendimiento

Mantener RNF-03: p95 menor a 1,5 segundos para disponibilidad/listados y menor a 2 segundos para altas/modificaciones periódicas. Mantener la mezcla de 50 usuarios concurrentes de RNF-05.

Protocolo de referencia reproducible: 2 minutos de calentamiento y 10 de medición sostenida con 50 sesiones autenticadas. Convención técnica de validación, sin cambiar los RNF ni atribuir esta carga a la institución:

| Sesiones | Ciclo fijo de operaciones, repetido en orden | Mezcla por ciclo |
|---|---|---|
| 45 Docente | Disponibilidad; listado diario; disponibilidad; listado por curso. | 50 % disponibilidad, 25 % listado diario, 25 % listado por curso. |
| 5 Admin/Bedel | Disponibilidad; alta periódica; disponibilidad; modificación periódica de una serie propia de prueba. | 50 % disponibilidad, 25 % altas, 25 % modificaciones. |

Cada sesión realiza una sola operación a la vez y espera exactamente 5 segundos desde su respuesta completa antes de iniciar la siguiente. Escalonar el inicio de las sesiones cada 100 ms; comenzar los 2 minutos de calentamiento cuando todas estén activas. Mantener las sesiones y los ciclos durante los 10 minutos de medición. No incluir login, preparación de datos ni recursos estáticos en los percentiles de operaciones.

La carga es de circuito cerrado: con respuesta instantánea el máximo teórico es 10 operaciones por segundo; la tasa efectiva será menor según la latencia. No imponer simultáneamente una tasa fija de peticiones y estas pausas. Registrar tasa efectiva por operación, latencias y pausas realmente aplicadas; no incrementar pausas para ocultar degradación. Los pesos anteriores corresponden a cada ciclo, no a una proporción global exacta entre roles con latencias distintas.

El guion consume casos en orden fijo de un conjunto de prueba versionado, con semilla, fechas de referencia, filtros, IDs y asignaciones conocidos. Las consultas de listados solicitan la primera página de 20 resultados; alternar altas/modificaciones cuatrimestrales y anuales en partes iguales. Cada sesión operativa tiene series y franjas reservadas para la prueba, suficientes para completar el escenario sin colisiones artificiales. Preparación de propuestas y lectura de versiones preceden a la medición sostenida; si se requieren llamadas auxiliares durante ella, se registran separadas y se conserva su guion entre ejecuciones.

Restaurar el mismo conjunto inicial antes de cada ejecución. Las modificaciones alternan entre dos asignaciones válidas predefinidas y actualizan la versión devuelta por la operación anterior. Las pruebas de conflictos deliberados se ejecutan aparte de este escenario nominal. Conservar el guion y el conjunto definitivo como artefactos de la futura implementación; no se han creado ni ejecutado en esta etapa.

Incluir reservas cuatrimestrales de hasta 32 ocurrencias y anuales de hasta 64 como casos de referencia, antes de exclusiones. Registrar ambiente, equipo, recursos asignados, ubicación de cliente/servidor y tamaño de datos junto con los resultados. No declarar cumplimiento a partir de una sola respuesta rápida.

Separar errores de validación esperados de errores técnicos. Registrar ambos; no ocultar errores del escenario para mejorar el porcentaje. Las operaciones de expansión conjunta de calendario y dashboard requieren validación funcional, pero el documento original no les fija el mismo umbral de 2 segundos: no extenderlo sin justificar la carga de múltiples series.

## Navegación y presentación

Validar operaciones principales de Admin/Bedel en computadora y consultas de Docente en viewport móvil, sin pérdida de filtros o campos esenciales. Si la agenda semanal necesita desplazamiento, la vista diaria debe seguir siendo utilizable. Formularios deben identificar errores por campo y preservar datos corregibles; los límites de borradores y sesión siguen vigentes.

La matriz del documento 17 fija Chromium/Firefox y tamaños de computadora/móvil; al ejecutar se registran sus versiones exactas, sin prometer soporte de todas las versiones o dispositivos.

## Respaldos, recuperación y administración inicial

RNF-02 sigue exigiendo PostgreSQL, respaldos lógicos diarios y retención de 14 días. La condición de demo no elimina ese requisito. El documento 17 define el procedimiento demostrable de respaldo/restauración y precisa que la periodicidad depende de la disponibilidad del entorno local.

DA-77 crea Admin inicial con contraseña de variable de entorno, sin frase temporal ni cambio obligatorio; se guarda hash y no se sobrescriben cuentas existentes al reiniciar. No hay asistente ni recuperación pública especial. DA-76 conserva auditoría con consulta técnica, sin pantalla propia.

DA-75 confirma ejecución local reproducible. DA-74 confirma ausencia de restricciones académicas de lenguaje o framework. DA-79 aprueba PostgreSQL y Docker Compose; DA-78 acota backend a Java/Node/Laravel y frontend a React/Next. DA-81 aprueba Java/Spring Boot y React/Vite con las bibliotecas indicadas en documento 12. No se ha autorizado ni requerido infraestructura de producción.

## Concreción de esta versión

El [documento 17](17-operacion-local-y-verificacion.md) concreta versiones base, ejecución local, eventos de auditoría, navegadores y prueba de restauración. Los documentos 13–16 y 18 completan modelo, navegación, contratos, historias y aceptación. La [síntesis](00-especificacion.md) es el punto de entrada a la especificación v1.0 final y aprobada.
