# I-04 · Operación completa de reservas

**Estado:** plan detallado aprobado secuencialmente por el usuario el 25/09/2026: alcance/orden y los seis cortes. Implementación completada y verificada; ver [avance y evidencia](avance-i-04.md). I-03 está aceptada y cerrada. El QA manual de I-04 queda pendiente por decisión del usuario mientras se avanza con I-05 e I-06; la revisión manual final de las tres entregas fue planificada y aprobada por bloques el 26/09/2026, y sigue pendiente de ejecución. La aceptación final de I-04 sigue pendiente del usuario.

## Objetivo y límites

Completar las operaciones persistentes de reservas, conservando el diseño B — PATIO y las garantías de I-03. Cada corte abarca API, persistencia, interfaz y verificación del recorrido completo. Se permite subdividir por tamaño o dependencias técnicas sin omitir criterios ni publicar escrituras parcialmente seguras.

I-05 conserva consultas y filtros completos, impresión e indicadores persistentes y el dataset de volumen amplio. I-06 conserva empaquetado final, Docker Compose y preparación integral de la demo. No agregar avisos temporales de módulos pendientes, mensajes automáticos, gestión académica ni infraestructura de producción.

Fuentes: [plan general](integracion.md), [ciclo de reservas](../especificacion/07-ciclo-de-reservas.md), [calendario](../especificacion/06-calendario-y-datos-de-referencia.md), [modelo consolidado](../especificacion/13-modelo-consolidado.md), [pantallas](../especificacion/14-pantallas-y-navegacion.md), [contratos](../especificacion/15-operaciones-y-contratos.md), [casos de uso vigentes](../especificacion/18-casos-de-uso-vigentes.md) y [concurrencia implementada](../api/reservas-concurrencia.md). Consultar las DA y los diagramas ante dudas, sin sustituirlos por supuestos.

## Orden y dependencias

| Corte | Resultado | Dependencia |
|---|---|---|
| I-04.1 · Esporádicas | Preparar, consultar, revisar y confirmar fechas concretas | I-03 aceptada |
| I-04.2 · Cancelaciones | Liberar ocupación conservando estados, motivos e historia | I-04.1 |
| I-04.3 · Edición y aulas | Editar cabecera permitida y reasignar aulas por modalidad | I-04.2 |
| I-04.4 · Reprogramaciones | Cambiar fecha/horario conservando origen y patrón | I-04.3 |
| I-04.5 · Calendario y series | Revisar impacto y guardar calendario/clases conjuntamente | I-04.2–4 |
| I-04.6 · Verificación integrada | Datos demo, regresión y guía QA lista | Todos los anteriores |

Los datos necesarios para probar cada corte se incorporan en ese corte, no se posponen todos al último. Las operaciones de resolución de conflictos quedan listas antes de la actualización del calendario.

## Garantías comunes

- Admin y Bedel operan reservas; Docente solo consulta. Calendario exclusivo de Admin. Revalidar rol y estado actuales en servidor.
- No modificar clases iniciadas ni reactivar canceladas. Aplicar reloj institucional real en operación y controlado en pruebas temporales.
- Guardados de conjuntos completos o rechazo, también ante fallos de persistencia. Si una clase seleccionada dejó de ser futura, no guardar el resto silenciosamente.
- Controlar versiones de agregados, elegibilidad, requisitos, disponibilidad y concurrencia al guardar. Conservar las restricciones PostgreSQL y extender el orden de bloqueos documentado sin inversiones.
- Consulta/revisión no retiene aulas ni guarda borradores. Conservar propuesta corregible cuando haya conflictos. No convertir una respuesta perdida en éxito ni en rechazo confirmado; reutilizar los mecanismos de recuperación/reintento seguro aplicables, definiendo su contrato por operación.
- Los contactos restringidos se omiten en JSON de Docente, no solo en la presentación. No delegar reglas de negocio al navegador.
- Mantener historial y auditoría del dominio, sin panel adicional. Las nuevas lecturas necesarias para operar muestran datos persistidos, sin mezclar el conjunto del prototipo.

## I-04.1 · Reservas esporádicas

**Comportamiento aprobado:**

1. Cabecera compartida: curso/comisión, docente, cantidad de alumnos prevista, tipo y recursos para toda la reserva.
2. Una o varias fechas concretas, con inicio y duración propios; todas dentro del mismo año habilitado. Se permiten actividades en receso, respetando días/horarios de apertura y feriados.
3. Disponibilidad y selección de aula por fecha. Hasta tres sugerencias por menor capacidad suficiente e identificador, con acceso al resto.
4. Sin disponibilidad, alternativas informativas por minutos de solapamiento, con desempates de especificación y contactos según rol. No se puede seleccionar aula ocupada.
5. Resumen del conjunto y confirmación completa. Revalidar antes de guardar; conflicto nuevo conserva la propuesta para corregir. Un reintento de confirmación incierta no duplica la reserva.
6. Acceso al resultado desde éxito, agenda y listado existentes.

**Aceptación:** varias fechas/aulas distintas; actividad en receso; horarios contiguos; rechazo por feriado, pasado, requisitos y conflicto; competencia de confirmaciones; fallo sin persistencia parcial; recuperación de respuesta incierta; recarga y segunda sesión; permisos y privacidad. Referencias: CA-R01–03, CA-R07, CA-R13–18 y reglas comunes del documento 07.

## I-04.2 · Cancelaciones

**Comportamiento aprobado:**

1. Seleccionar una, varias o todas las clases futuras vigentes, de cualquiera de las modalidades.
2. Motivo obligatorio y revisión de fechas, aulas y cantidad afectada antes de confirmar.
3. Liberar ocupación conservando clases, estado y motivo por detalle. No borrar ni reactivar.
4. Cabecera CANCELADA solo si todos los detalles están cancelados; conservar CONFIRMADA si existen clases pasadas no canceladas.
5. Si la cancelación elimina toda la continuidad futura de una periódica, registrar el cese explícito. No deducirlo únicamente de que no haya futuras: el fin natural de un período no equivale a cancelación de continuidad.
6. Revalidar tiempo y versión: si alguna clase empezó o cambió, rechazar todo el conjunto. Mostrar canceladas y motivos en detalle; retirarlas de la ocupación de agenda. Filtros completos siguen en I-05.

**Aceptación:** individual/múltiple/todas; motivo ausente; aula liberada realmente reutilizable; historia y estado de cabecera correctos; continuidad cancelada; rechazo de iniciadas/canceladas; edición contra cancelación concurrente; ausencia de cambios parciales. Referencias: CA-R04–08, CA-R21–23 y CA-R28.

## I-04.3 · Cabecera y cambio de aula

**Edición de datos compartidos:** Admin/Bedel pueden cambiar docente, curso/comisión, alumnos previstos, tipo y recursos mientras ninguna ocurrencia haya comenzado. Revalidar las aulas asignadas; identificar incompatibilidades y rechazar el conjunto si no cumplen. Una vez iniciada la serie, cabecera fija; cambiar la necesidad requiere cancelar futuras afectadas y crear otra reserva. No introducir datos compartidos diferentes por fecha.

**Cambio de aula:**

- Esporádica: seleccionar clases futuras y elegir aula disponible por fecha.
- Periódica: elegir patrón semanal y aula válida para todas sus futuras vigentes; actualizar patrón y esas clases juntos. La pertenencia al patrón se conserva aunque una clase se haya reprogramado a otro día.
- Respetar requisitos originales, pasado y cancelaciones; nunca cambiar el aula de una fecha aislada de una periódica.
- Revisar aulas anteriores/nuevas y clases afectadas; confirmar con versiones, tiempo y disponibilidad vigentes.

**Aceptación:** cabecera antes de inicio; rechazo tras inicio o por capacidad/recursos; reasignación esporádica por fecha; periódica por patrón completo; preservación del pasado/canceladas; conflicto nuevo o edición concurrente sin cambios parciales. Referencias: DA-83, CA-R19–23 y CA-R37.

## I-04.4 · Reprogramaciones

**Comportamiento aprobado:**

1. Admin/Bedel seleccionan una o varias clases futuras vigentes y modifican fecha, horario o duración.
2. Validar apertura, módulos, feriados, requisitos y ocupación, incluyendo interferencias entre las propias clases del conjunto propuesto.
3. Esporádicas dentro del mismo año habilitado, admitiendo receso. Periódicas dentro de sus períodos asignados; fuera de ellos se cancela la original y se crea una esporádica.
4. Conservar aula asignada. Si no está libre, rechazar la propuesta; la reasignación es otra operación con el alcance de I-04.3. Una periódica conserva el aula de su patrón.
5. Conservar fecha original aun después de cambios sucesivos. Reprogramar no modifica la regla semanal ni permite regenerar la original al cambiar calendario.
6. Revisar valores anteriores/nuevos por clase; guardar completo o rechazar, incluyendo si alguna clase empezó durante la revisión.

**Aceptación:** individual/múltiple; fechas fuera del período/año; conflictos externos e internos del conjunto; fecha original tras cambios sucesivos; conservación de patrón/aula; versiones y tiempo concurrentes; rechazo sin persistencia parcial. Referencias: DA-84, CA-R22–23, CA-R29 y reglas de reprogramación del documento 07.

## I-04.5 · Calendario y actualización de series

**Comportamiento aprobado, exclusivo de Admin:**

1. Preparar ampliación de cuatrimestre o eliminación de feriado. Calcular nuevas clases futuras derivadas de las series correspondientes.
2. Mostrar impacto: series, fechas, horarios y aulas; preparación sin escritura.
3. Respetar exclusiones, cancelaciones, cese de continuidad, pasado, fechas existentes y fechas originales representadas por reprogramaciones. No regenerar ni duplicar clases.
4. Usar horario/aula del patrón semanal, sin aula excepcional por fecha nueva.
5. Si hay interferencias, bloquear el cambio completo y mostrar conflictos/alternativas informativas. Resolver mediante operaciones sobre reservas y volver a consultar el impacto; ningún acuerdo externo libera el aula por sí mismo.
6. Confirmar revalidando calendario, reservas implicadas, tiempo, requisitos y disponibilidad. El resumen revisado debe seguir vigente. Calendario y todas las nuevas clases se guardan juntos o no se guarda nada.

Una serie que finalizó naturalmente puede extenderse si corresponde; una con continuidad cancelada, no. Agregar feriado o acortar período no cancela clases automáticamente: rechazar si invalida clases vigentes e informar dependencias. Si no hay nuevas clases ni dependencias bloqueantes, guardar con las validaciones normales.

Retirar la protección transitoria de I-03 solo al disponer de este comportamiento completo, sin una ventana en que pueda guardarse un calendario con series incompletas.

**Aceptación:** ampliación y eliminación de feriado; exclusiones/cancelaciones/continuidad; fin natural; ausencia de duplicados tras reprogramación; aula y horario del patrón; bloqueo por interferencia; versión de reserva/calendario modificada después de revisión; competencia con nuevas reservas o cambios de aula; rollback completo. Agregar feriado/acortar período con y sin dependencias. Referencias: CA-R24–30, CA-R35–37 y DA-54/55, DA-57–60.

## I-04.6 · Datos, regresión y entrega

- Ampliar datos ficticios con esporádicas, actividades en receso, cancelaciones parciales/totales, cambios de aula y reprogramaciones. Mantener 2026 segundo, 2027 primero y anuales 2027.
- Carga explícita, repetible y separada del arranque, sin duplicar ni sobrescribir registros manuales. No editar migraciones ya aplicadas ni reinterpretar silenciosamente identidades del dataset anterior.
- Probar ampliaciones, eliminación de feriados, interferencias y series no extensibles en escenarios controlados. Concurrencia/escrituras automatizadas en PostgreSQL aislado; no restablecer la demo compartida para reproducir un test.
- Verificar permisos, privacidad, recarga, segunda sesión, historia, disponibilidad liberada, versiones y atomicidad. Adaptar referencias de fechas al reloj real, documentando qué escenarios requieren reloj controlado.
- Inspeccionar escritorio/móvil, teclado, mensajes de validación, errores, confirmaciones y conflictos. Conservar diseño B y separación visual de alertas.
- Crear datos-demo-i-04.md y qa-manual-i-04.md con roles, precondiciones, pasos, fechas y resultados esperados; distinguir pruebas manuales de automatizadas.

## Método de ejecución y revisión aprobado

Trabajar en modo perseguir objetivo hasta terminar I-04 o necesitar intervención del usuario. Antes de cada tarea, concretar contrato y aceptación; implementar, probar, inspeccionar en navegador, revisar y hacer commit controlado.

**Cada corte o subcorte se revisa con un agente GPT-6 Luna, razonamiento high.** Entregarle diff/commit concreto, criterios y evidencia. Revisar especificación, permisos, privacidad, integridad/concurrencia, pruebas, regresiones y complejidad. Resolver hallazgos aplicables, solicitar nueva revisión de correcciones y no cerrar con bloqueantes. No sustituir silenciosamente el modelo si no está disponible.

Mantener avance-i-04.md con matriz de tareas/criterios, pruebas realmente ejecutadas, revisión, límites y commits. Las revisiones no reemplazan verificaciones del implementador ni QA del usuario. Comunicar progreso y conservar estado recuperable.

No pedir nuevas aprobaciones por elecciones técnicas ya cubiertas. Detenerse ante contradicciones funcionales no resueltas, credenciales/intervenciones necesarias o cambios de alcance. Preservar secretos y datos compartidos; no iniciar procesos duplicados ni detener servicios ajenos. Al finalizar, detener solo los procesos iniciados para verificar e informar cómo levantar el entorno.

## Condición de entrega

Los seis cortes completos, contratos y documentación actualizados, pruebas relevantes y revisión visual ejecutadas, revisiones resueltas, datos demo preparados y QA manual listo. Registrar cualquier verificación no ejecutada; no afirmar cobertura inexistente. No hacer push ni desplegar sin solicitud.

Estado al entregar: **I-04 implementada y verificada, pendiente de QA del usuario**. Solo el usuario puede aceptar y cerrar la entrega. La aprobación de este plan no es aceptación de la implementación.
