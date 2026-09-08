# Modelo del dominio y reglas

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: reglas y trazabilidad de la especificación v1.0 final; el modelo vigente está definido en el documento 13. Fuentes: [modelos](../fuentes/03-modelos.md), [diagramas](../fuentes/04-diagramas.md) y RF/CU.

## Entidades y datos presentes en las fuentes

| Concepto | Datos documentados | Observaciones |
|---|---|---|
| Usuario | ID, email, contraseña, nombre, apellido, rol, activo | Supabase gestiona credenciales; Usuario conserva el vínculo UUID y perfil, sin contraseña en el dominio. |
| Administrador | Especialización de Usuario | Sin atributos específicos en los diagramas. |
| Bedel | Turno: mañana, tarde, noche | La justificación menciona habilitado; el modelo lo representa con activo en Usuario. |
| Docente | Legajo como usuario; nombre, apellido, email e ID en reserva | No requiere cuenta para figurar en una reserva (DA-07); fuente externa simulada como lista local (DA-09). |
| Aula | ID, identificador, tipo, ubicación, piso, estado, capacidad, pizarrón, ventiladores, aire acondicionado | RF menciona edificio/piso y características. |
| Aula multimedios | Televisor, cañón/proyector, computadora | Especialización propuesta por la fuente. |
| Aula laboratorio | Cantidad de PC | Capacidad evaluada por personas; cantidad de PC solo descriptiva, nunca criterio de búsqueda o reserva (DA-30). |
| Reserva | ID, docente y contacto, curso/cátedra, fecha de registro, estado, motivo de cancelación | El DER omite nombre de cátedra presente en clases; IDs marcados externos. |
| Reserva periódica | Tipo cuatrimestral/anual, días de semana | El DER propone JSON para días; el modelo vigente usa PatronSemanal, definido en el documento 13. |
| Reserva esporádica | Fechas puntuales a través de detalles | Sin atributos específicos en la cabecera. |
| Ocurrencia / DetalleReserva | ID en DER, fecha, hora de inicio, cantidad de módulos, día, aula asignada | DA-22 agrega estado y motivo por ocurrencia; ver ciclo acordado. |
| Año lectivo | ID, año calendario, estado | Año único. |
| Cuatrimestre | ID, número, inicio, fin, estado | Pertenece a un año; dos por año según fuentes. |
| Período asignado | Reserva y cuatrimestre | Asociación de reserva periódica con uno o dos cuatrimestres. |

La transcripción de PlantUML conserva también tipos, tamaños, enumeraciones y notas originales. La herencia de análisis no obliga por sí sola a usar una tabla por subtipo ni clases con getters/setters en la futura aplicación.

## Relaciones documentadas

- Un Bedel registra muchas reservas; cada reserva tiene un registrador en el modelo.
- Una reserva agrupa una o más ocurrencias. Cada ocurrencia ocupa exactamente un aula.
- Un aula puede aparecer en muchas ocurrencias, sujetas a ausencia de solapamientos.
- Un año contiene dos cuatrimestres.
- Una reserva periódica se vincula a uno o dos cuatrimestres del mismo año.
- La asociación de clases entre reserva periódica y cuatrimestre tiene las multiplicidades invertidas respecto de la descripción; queda corregida en el [modelo consolidado](13-modelo-consolidado.md).

## Reglas explícitas

| ID | Regla | Fuente |
|---|---|---|
| RN-01 | Email de acceso único y contraseña gestionados por Supabase Auth. | RF-02 |
| RN-02 | No degradar ni deshabilitar al último Administrador activo. | RF-04/05 |
| RN-03 | Autenticación y límites ante intentos gestionados por Supabase, sin contador propio. | RF-01, CU-01 |
| RN-04 | Identificador de aula único; un aula inactiva no es reservable. | RF-06, CU-06, RF-18 |
| RN-05 | No inhabilitar ni dar de baja un aula con reservas futuras. | RF-08/09 |
| RN-06 | La capacidad del aula debe ser mayor o igual a la solicitada. | RF-07/18/19 |
| RN-07 | Año lectivo único; dos cuatrimestres por año y sin superposición entre ellos. | RF-11/15/16 |
| RN-08 | No eliminar año con cuatrimestres/reservas ni cuatrimestre con reservas. | RF-13/17 |
| RN-09 | Duración de reserva en múltiplos de 30 minutos. | RF-18, CU-21/22/24 |
| RN-10 | Fechas de registro futuras; reservas periódicas dentro de su período. | RF-21/22 |
| RN-11 | Sugerir hasta tres aulas por capacidad suficiente: por fecha en esporádicas y por patrón semanal completo en periódicas. | RF-19 |
| RN-12 | Verificar solapamientos antes de confirmar y modificar. | RF-20 |
| RN-13 | Confirmar de forma transaccional; ante error de persistencia no registrar. | RF-23, CU-23 |
| RN-14 | Cancelación total o por fecha, con motivo; no cancelar ocurrencias pasadas. | RF-25 |
| RN-15 | Agenda docente de solo lectura. | RF-28 |

## Estados documentados y acuerdos posteriores

- Usuario: activo/inactivo y rol vigente; identidad vinculada por UUID a Supabase Auth.
- Aula: HABILITADA es reservable; INHABILITADA y MANTENIMIENTO no. La baja lógica retira el aula de la operación habitual sin borrar historial (DA-32).
- Reserva: PENDIENTE solo durante preparación temporal, sin persistencia (DA-19). CONFIRMADA si queda alguna ocurrencia no cancelada; CANCELADA si todas lo están (DA-22).
- Año: EN PREPARACIÓN, HABILITADO y CERRADO (DA-66). Cuatrimestre: sin habilitación independiente, depende de año y fechas (DA-67).
- Ocurrencia: DA-22 agrega CONFIRMADA/CANCELADA y motivo de cancelación al modelo original.

## Resolución de propuestas iniciales

Cancelaciones, historial y estado de cada ocurrencia quedaron acordados en DA-21/22; módulos de 30 minutos y horarios contiguos en DA-12. El registro de decisiones conserva el cierre de las preguntas de la entrevista.

## Ajustes funcionales acordados que afectan al modelo

- DA-06: el registrador de una reserva puede ser Administrador o Bedel. El [modelo consolidado](13-modelo-consolidado.md) vincula Reserva con el Usuario registrador y restringe la operación a esos roles, conservando trazabilidad.
- DA-07: los datos del docente solicitante no exigen una cuenta Docente. La reserva no debe depender de que exista esa cuenta.
- DA-08: no hay código institucional de curso; se admite ID interno. DA-10 exige distinguir comisiones; DA-48/52 precisan creación y reutilización por materia, comisión y año.

Los acuerdos de calendario, docentes de fuente simulada y comisiones se detallan en [calendario y datos de referencia](06-calendario-y-datos-de-referencia.md). El modelo original de relaciones se conserva como fuente histórica; DA-11 precisa que el año puede contener menos de dos cuatrimestres mientras está en preparación.

## Precisiones acordadas de selección y calendario

DA-15 exige que el docente solicitante exista en la fuente simulada, sin exigir cuenta de acceso. DA-16 limita la reserva anual a la unión de cuatrimestres sin feriados. DA-17 protege las reservas futuras ante altas de feriados y DA-18 deja fuera el autocompletado. El detalle y los criterios de aceptación están en [calendario y datos de referencia](06-calendario-y-datos-de-referencia.md).

El [ciclo de reservas](07-ciclo-de-reservas.md) precisa preparación, confirmación atómica, cancelación parcial y generación en períodos iniciados (DA-19 a DA-23).

## Precisiones de selección de aulas

DA-24 permite inicio y duración por día de semana durante la preparación; DetalleReserva conserva el horario concreto de cada fecha. DA-25 asigna una única aula por día semanal de la periódica, libre en todas sus fechas efectivas; esporádicas seleccionan por fecha. DA-26 ordena hasta tres sugerencias y permite acceder a otras aulas válidas. DA-27 no crea detalles para fechas excluidas antes de confirmar. DA-28 ordena alternativas informativas según modalidad: primero conflictos solo esporádicos por fechas y minutos, después periódicos por minutos acumulados y fechas esporádicas; no modifica la regla de ausencia de conflictos para confirmar.

## Aulas: tipos, capacidad y protección de reservas (DA-29 a DA-32)

Se conserva la especialización original:

| Tipo | Datos comunes | Datos específicos |
|---|---|---|
| General | Identificador, ubicación, piso, capacidad en personas, estado, tipo de pizarrón, ventiladores y aire acondicionado | Sin equipamiento específico adicional. |
| Multimedios | Los mismos datos comunes | Televisor, proyector y computadora. |
| Laboratorio informático | Los mismos datos comunes | Cantidad de PC, únicamente descriptiva. |

La capacidad mínima solicitada expresa personas. Cantidad de PC no aparece como parámetro de búsqueda, no limita la disponibilidad, no ordena sugerencias y no es una condición de reserva. Tampoco se asume una computadora por persona. El nombre «Laboratorio informático» corresponde a AulaLaboratorio en los modelos; no agrega un cuarto tipo.

La reserva conserva tipo solicitado, capacidad mínima en personas y características requeridas. Antes de cambiar capacidad, tipo o equipamiento de un aula, comparar los nuevos datos con los requisitos de las reservas futuras vigentes asignadas a ella. Si alguna deja de cumplirlos, mostrar las afectadas y bloquear el cambio hasta que se reasignen o cancelen (DA-31).

Ejemplo: una reserva requiere capacidad para 30 personas. Reducir la capacidad del aula de 40 a 35 no la invalida; reducirla a 25 sí. La validación debe contemplar todas las reservas futuras afectadas. Modificar cantidad de PC no incumple una exigencia de PC porque tal requisito no existe.

Solo un aula HABILITADA y no dada de baja puede asignarse. INHABILITADA y MANTENIMIENTO conservan los datos del aula pero impiden nuevas asignaciones. La baja lógica la retira de la operación habitual y mantiene las referencias históricas. No se elimina físicamente el aula usada en reservas.

Para pasar a INHABILITADA, MANTENIMIENTO o baja lógica, impedir el cambio mientras existan ocurrencias futuras no canceladas. Las canceladas no lo bloquean. No se introduce cancelación ni reasignación automática. DA-51 extiende la protección a clases en curso hasta su finalización. DA-56 excluye restaurar una baja lógica en esta versión.

### Criterios de aceptación

| ID | Situación | Resultado esperado |
|---|---|---|
| CA-A01 | Laboratorio con capacidad 30 y 20 PC; pedido para 30 personas. | Cantidad de PC no excluye el aula si cumple los demás requisitos y está disponible. |
| CA-A02 | Laboratorio con capacidad 20 y 30 PC; pedido para 30 personas. | Se excluye por capacidad insuficiente, independientemente de sus PC. |
| CA-A03 | Búsqueda, consulta de disponibilidad o preparación de reserva. | No existe parámetro de cantidad mínima de PC. |
| CA-A04 | Reducción de capacidad que deja de satisfacer una reserva futura vigente. | Se identifica la reserva afectada y se bloquea el cambio. |
| CA-A05 | Se retira un recurso exigido por una reserva futura. | Se bloquea el cambio hasta resolver la asignación afectada. |
| CA-A06 | Se intenta pasar a mantenimiento, inhabilitar o dar de baja con reservas futuras vigentes. | Operación rechazada sin alterar las reservas. |
| CA-A07 | Aula inhabilitada, en mantenimiento o dada de baja. | No aparece como disponible ni puede confirmarse una asignación nueva. |
| CA-A08 | Baja lógica de un aula sin reservas futuras vigentes. | Se retira de la operación habitual y sigue referenciada en el historial. |

## Nombre vigente del requisito de capacidad (DA-46)

En Reserva, «capacidad mínima solicitada» pasa a llamarse «cantidad de alumnos prevista». Es un único dato común a sus ocurrencias: determina la capacidad mínima del aula compatible y alimenta las métricas de concurrencia. La capacidad física pertenece al aula y permanece independiente. Donde las fuentes o reglas anteriores dicen «capacidad mínima solicitada», se interpreta este dato acordado; no se agrega un segundo campo de pedido.

La regla de selección y revalidación es: capacidad del aula ≥ cantidad de alumnos prevista. Un grupo de 30 alumnos en un aula de 50 aporta 30 alumnos a las métricas. Cambiar ese número deberá revalidar las aulas; DA-47 limita esta edición a series que aún no comenzaron.

## Precisiones de identidad e historial (DA-47 a DA-51)

El identificador de curso combina código de materia, comisión y año (DA-48); DA-52 define código numérico generado, por ejemplo 001-A-2026. DA-47 fija docente, curso/comisión y alumnos al comenzar la serie, preservando los datos históricos. DA-49 excluye reactivación de canceladas y DA-50 impide sobrescribir ediciones ajenas. DA-51 protege también aulas con clases en curso ante baja, inhabilitación o cambios que invaliden sus requisitos.

DA-54/55 exigen conservar información suficiente para generar nuevas ocurrencias por cambios de calendario. El [modelo consolidado](13-modelo-consolidado.md) define patrón semanal y excepciones, preservando la separación entre cabecera y detalles.

## Datos necesarios para regeneración acordada

DA-57 a DA-60 requieren conservar patrón semanal, exclusiones de fechas, vínculo entre ocurrencia reprogramada y fecha original, y cese de continuidad por cancelación de todas las futuras. Estos datos complementan ReservaPeriódica y DetalleReserva; no sustituyen su separación. Las nuevas fechas usan el aula asignada al patrón y se revalidan; no se selecciona otra aula por fecha. Estos datos están incluidos en el [modelo consolidado](13-modelo-consolidado.md).

DA-66 a DA-69 concretan estados del calendario, eliminación protegida y prohibición de cambios retroactivos. Se elimina el estado independiente de Cuatrimestre del modelo vigente, conservándolo únicamente en las fuentes históricas.
