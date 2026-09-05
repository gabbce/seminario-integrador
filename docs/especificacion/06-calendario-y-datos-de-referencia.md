# Calendario y datos de referencia

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: reglas consolidadas de la entrevista. Complementa los modelos originales, que permanecen preservados.

## Fuente simulada de docentes (DA-09)

La primera versión representa la información externa mediante una lista fija local de registros. Cada registro contiene ID estable, nombre, apellido y email. No se implementa conexión, sincronización ni gestión académica de docentes. La elección de una lista de registros permite representar esos datos sin convertir personas en valores de un enum.

La cuenta con rol Docente se mantiene como especialización de Usuario y es independiente de esta fuente: un docente de la lista puede no tener cuenta de acceso (DA-07). No se sustituye esa especialización por la lista.

Registro acordado (DA-15): seleccionar exclusivamente un docente de la lista y completar su ID y datos en los campos de Reserva. No hay carga libre ni ABM. Si no aparece el docente buscado, no se puede completar el registro con otro docente inventado; la primera versión se limita a los registros de la fuente simulada.

## Materia y comisión (DA-08/10)

La identificación debe distinguir, por ejemplo, Matemática I — A y Matemática I — B. No existe código institucional.

DA-48 exige un identificador legible compuesto de código de materia, comisión y año. La referencia de curso corresponde a un año: Matemática I, comisión A de 2026 se distingue de la de 2027. DA-52 define el formato 001-A-2026: código de materia numérico generado automáticamente y reutilizado, comisión y año. Se muestra también el nombre completo de la materia. No se usa el prefijo MAT ni se exige código institucional. No se incluye gestión de programas, inscripciones ni asignaciones académicas. La propuesta de una identidad de curso reutilizada entre años queda reemplazada por esta decisión.

## Preparación del calendario (DA-11)

Administrador puede crear un año y cargar sus dos cuatrimestres por etapas. Solo puede habilitarlo para reservas cuando ambos tengan fechas completas y válidas, sin solaparse. El modo de preparación resuelve la diferencia entre el ABM individual y la exigencia de dos cuatrimestres.

DA-66/67/68 definen estados del año, dependencia de cuatrimestres y eliminación protegida. La edición del calendario no cancela reservas automáticamente. Las ampliaciones y eliminación de feriados generan nuevas clases conforme a DA-54/55/57.

## Días y horarios (DA-12/14)

Primera versión: lunes a viernes, de 07:00 a 23:00, sin pantalla de configuración de apertura. Se adopta la alternativa fija ofrecida por el usuario para acotar el alcance. La enumeración original incluye sábado, pero no es un día reservable en esta versión.

- Duración positiva en módulos de 30 minutos.
- Inicio a las :00 o :30; inicio mínimo 07:00 y finalización máxima 23:00.
- La reserva termina el mismo día en que comienza.
- Se permite reservar para hoy únicamente si el inicio es posterior al momento actual de la institución; debe revalidarse al confirmar.
- Dos ocurrencias contiguas no se solapan: 09:00–10:00 y 10:00–11:00 son compatibles.
- Hay solapamiento cuando dos ocurrencias vigentes de la misma aula y fecha comparten tiempo: inicio A < fin B e inicio B < fin A.

Zona horaria institucional: America/Argentina/Cordoba, correspondiente al contexto de Santa Fe acordado en DA-70.

## Feriados y fechas no lectivas (DA-13/16/17/18)

Administrador gestiona manualmente las fechas no lectivas del calendario. Cada registro tiene fecha y descripción. El alcance es listar, agregar, corregir y quitar fechas del año sin duplicados. No se incorpora autocompletado ni consulta a un servicio externo en la primera versión; queda como posible mejora futura, sin compromiso de implementación.

Reglas acordadas:

1. Una fecha no lectiva impide reservas esporádicas y se excluye de las recurrencias. El resumen muestra las fechas omitidas.
2. Si un nuevo día no lectivo afecta reservas futuras vigentes, se muestran las reservas y se impide guardar el cambio hasta cancelarlas o reprogramarlas mediante sus operaciones normales.
3. El calendario no cancela automáticamente reservas.

Consecuencia de la relación Reserva–DetalleReserva ya documentada: si no queda ninguna fecha válida, no se confirma una reserva vacía, porque una reserva requiere al menos una ocurrencia.

DA-55 exige que al quitar un feriado se generen las clases periódicas correspondientes. DA-57/58/59/60 precisan asignación de aula, resolución de conflictos y alcance futuro, preservando DA-21/49. DA-69 impide agregar/quitar feriados pasados y alterar clases iniciadas. Una corrección de fecha debe satisfacer esas mismas restricciones y las de conflictos vigentes.

La evaluación de autocompletado se conserva como antecedente en el [registro de decisiones](04-decisiones-acordadas.md#investigación-acotada-feriados-argentinos), sin incorporarla como requisito.

## Reservas anuales (DA-16)

Generar las fechas dentro de los dos cuatrimestres, omitiendo el intervalo entre ellos y los feriados cargados. Aplicar los días seleccionados y el horario institucional. DA-23 permite registrar con el período iniciado: generar únicamente las ocurrencias cuyo inicio aún es futuro y mostrar las omitidas.

## Trazabilidad del cambio

| Decisión | Elementos afectados |
|---|---|
| DA-09 | ID externo y datos docentes de Reserva; flujo RF/CU-21/22. Mantiene Usuario–Docente. |
| DA-10 | Identificación de curso en RF/CU-21/27 y campos de Reserva. |
| DA-11 | RF/CU-10 a 17, estados de AñoLectivo y regla de dos Cuatrimestres. |
| DA-12/14 | RF/CU-18/21/22/24, nota de módulo y días de semana del modelo. |
| DA-13 | Ampliación explícita del calendario original solicitada durante la entrevista. Nuevo comportamiento sin renumerar los 29 RF originales; ficha EX-01 y criterios asociados en el [documento 18](18-casos-de-uso-vigentes.md). |
| DA-15 | Selección exclusiva de docente en RF/CU-21/22, sin ABM académico. |
| DA-16/17/18 | Generación de recurrencias y validación de fechas; alcance del nuevo gestor manual. |

## Criterios de aceptación de los acuerdos

- Al preparar una reserva, el solicitante debe existir en la lista fija. Su falta de cuenta de acceso no impide reservar para él.
- Dos comisiones de la misma materia se identifican separadamente en las reservas y los listados.
- Un año con un solo cuatrimestre cargado no puede habilitarse para reservas; con ambos completos y válidos puede habilitarse.
- Una recurrencia anual no genera fechas en el receso entre cuatrimestres ni en feriados cargados, aunque coincidan con un día de semana seleccionado.
- Una reserva esporádica para un feriado es rechazada; la interfaz identifica la fecha impedida.
- Al intentar agregar un feriado con una reserva futura vigente, se muestran los datos que permiten identificar la reserva y el calendario permanece sin cambios.
- Una vez canceladas o reprogramadas todas las reservas futuras afectadas, puede guardarse el feriado.
- La carga y consulta del calendario local funcionan sin consultar servicios de feriados externos.
- Una reserva de 22:30 a 23:00 un día hábil cumple el límite de apertura; una de 22:30 a 23:30 no lo cumple.
- Dos reservas de una misma aula de 09:00 a 10:00 y de 10:00 a 11:00 no se rechazan por solapamiento entre sí.

## Identificador de curso (DA-52)

El código numérico de materia se asigna automáticamente al registrarla por primera vez y se reutiliza para sus comisiones y años. El identificador legible combina código, comisión y año: 001-A-2026. La representación inicial usa tres dígitos; no se deduce de ello un límite de 999 materias. Las reglas de unicidad y formato de comisión se completarán en el diccionario, sin introducir un código institucional inexistente.

## Esporádicas en receso (DA-53)

Se permiten durante el intervalo entre cuatrimestres dentro de un año habilitado, respetando días de apertura, horarios y feriados. Una mesa de examen final es un ejemplo de uso; no agrega gestión de exámenes, actas o inscripciones.

El receso de reservas periódicas no es cierre institucional: sus horas pueden formar parte del denominador de ocupación cuando las aulas están habilitadas.

## Cambios del calendario que generan clases (DA-54/55)

- No permitir recortar un cuatrimestre dejando clases registradas fuera de su período.
- Al ampliar un cuatrimestre, extender las reservas periódicas correspondientes generando las nuevas fechas de su patrón semanal.
- Al quitar un feriado, generar las clases de las reservas periódicas a las que corresponde esa fecha.
- Las reservas esporádicas no se extienden por estos cambios.

DA-57 exige mostrar las nuevas clases, resolver sus aulas, revalidar conflictos y guardar calendario y ocurrencias juntos. No hay confirmación parcial del cambio de calendario.

DA-58 conserva exclusiones manuales y cancelaciones; DA-59 impide recuperar series cuya continuidad fue cancelada; DA-60 mantiene el patrón semanal frente a cambios puntuales. El flujo completo está en [ciclo de reservas](07-ciclo-de-reservas.md#actualizar-series-por-cambios-de-calendario-da-57-a-da-60).

## Estados del calendario (DA-66/67)

Solo Administrador gestiona estados y calendario.

| Estado del año | Operaciones permitidas | Restricciones |
|---|---|---|
| EN PREPARACIÓN | Cargar y corregir datos, cuatrimestres y feriados respetando historial y dependencias. | No registrar reservas hasta habilitar. |
| HABILITADO | Registrar reservas y editar calendario con las reglas de validación y actualización de series. | Requiere dos cuatrimestres completos, válidos y sin solapamiento. |
| CERRADO | Consultar datos e historial. | No admitir nuevas reservas ni cambios sobre el año y sus reservas. |

Para cerrar, comprobar que no existan ocurrencias futuras ni en curso no canceladas dentro del año, tanto periódicas como esporádicas. Las canceladas no bloquean el cierre. El cierre no cancela clases ni cambia el estado de las cabeceras de reservas históricas.

Los cuatrimestres conservan número, inicio, fin y pertenencia al año. Se elimina su habilitación independiente: su uso depende del estado del año y de sus fechas. La simplificación afecta expresamente el atributo estado y los filtros por estado de cuatrimestre de RF-14/15/16; si se muestra estado del año asociado, debe etiquetarse así y no simular un estado editable del cuatrimestre.

No se ha acordado una operación para reabrir años cerrados. El estado CERRADO se trata como solo lectura dentro del alcance actual.

## Eliminación de cuatrimestres (DA-68)

Mantener la prohibición original de eliminar un cuatrimestre con reservas asociadas, incluidas reservas históricas o canceladas. No interpretar «sin reservas futuras» como autorización para borrar esas relaciones.

Si no tiene reservas asociadas, puede eliminarse solo si el regreso del año a preparación no afecta reservas futuras o en curso. En particular, las reservas esporádicas del año también deben comprobarse, aunque no dependan del cuatrimestre eliminado. La eliminación y el cambio de estado del año se realizan juntos.

No permitir eliminar cuatrimestres de un año cerrado. La eliminación de años mantiene RF-13: sin cuatrimestres ni reservas asociadas, respetando además las restricciones del estado.

## Protección del pasado (DA-69)

No agregar ni quitar feriados de fechas pasadas. Mover un feriado desde o hacia una fecha pasada tampoco puede utilizarse para evadir esa regla. Una edición del calendario no modifica clases que ya comenzaron.

Para hoy, aplicar además protección de clases en curso: no puede guardarse un cambio que las invalide. No se generan ocurrencias retroactivas al quitar un feriado o extender un cuatrimestre. Los cambios futuros siguen el flujo conjunto de revisión y generación de clases acordado en DA-57.

## Criterios de aceptación adicionales

| ID | Situación | Resultado esperado |
|---|---|---|
| CA-K01 | Año en preparación con un cuatrimestre incompleto. | No puede habilitarse ni aceptar nuevas reservas. |
| CA-K02 | Año con dos cuatrimestres completos y sin solapamiento. | Puede habilitarse si cumple las demás validaciones. |
| CA-K03 | Intento de cerrar año con clase futura o en curso vigente. | Cierre rechazado, sin cancelar clases. |
| CA-K04 | Año cerrado consultado por usuario autorizado. | Acceso de consulta; no permite nuevas reservas ni edición de calendario. |
| CA-K05 | Cuatrimestre sin reservas, pero el año tiene una esporádica futura vigente. | No eliminar si el regreso a preparación afectaría esa reserva. |
| CA-K06 | Cuatrimestre con reservas históricas o canceladas asociadas. | No eliminar. |
| CA-K07 | Cuatrimestre eliminable de año habilitado sin reservas futuras ni en curso afectadas. | Eliminación y regreso a preparación conjuntos. |
| CA-K08 | Intento de crear/quitar feriado pasado o moverlo desde/hacia fecha pasada. | Cambio rechazado. |
| CA-K09 | Formulario de cuatrimestre. | No ofrece habilitación independiente del estado del año. |

## Estado administrativo e indicadores (DA-85)

El estado del año controla las operaciones permitidas y no representa apertura física de la institución. Cambiarlo no modifica los indicadores del mismo rango. La disponibilidad estadística depende de fechas, apertura institucional, feriados e HistorialAula, contando módulos completos según el documento 09; no se incorpora un historial de estados del año.
