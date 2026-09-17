# I-03 · Reserva periódica persistente

**Estado:** planificación detallada aprobada secuencialmente por el usuario el 17/09/2026. Implementación terminada y verificada; QA aprobado y entrega cerrada por el usuario el 17/09/2026; ver [avance y evidencia](avance-i-03.md). I-02 aceptada y cerrada, incluidos ajustes visuales, el 17/09/2026.

## Resultado acordado

Un Administrador o Bedel puede completar el recorrido aprobado **Datos y fechas → Aulas por día → Revisar**, confirmar una reserva periódica y encontrarla en la agenda y su detalle después de recargar o ingresar desde otra sesión. Un Docente puede consultar disponibilidad y reservas con los datos permitidos para su rol.

La confirmación guarda toda la reserva o nada, conserva una única aula por patrón semanal y evita solapamientos y duplicados por concurrencia o reintentos. Se reutiliza el diseño B, incluidos los ajustes de I-02.

Fuentes: [plan general](integracion.md), [ciclo de reservas](../especificacion/07-ciclo-de-reservas.md), [modelo](../especificacion/13-modelo-consolidado.md), [pantallas](../especificacion/14-pantallas-y-navegacion.md) y [contratos](../especificacion/15-operaciones-y-contratos.md).

## Punto de partida comprobado

- Java ya gestiona identidad, aulas, calendario y referencias; las migraciones actuales llegan a V7. No existen aún tablas ni servicios de reservas.
- React conserva preparación y operaciones de reservas del prototipo. Conectar el formulario no alcanza: hay que reemplazar su autoridad de disponibilidad y escritura por Java y conectar las lecturas del resultado.
- Los catálogos ficticios 2026/2027 ya están cargados. Se amplían mediante comandos explícitos; el arranque no modifica los datos.
- Las mutaciones administrativas todavía no acreditan protección contra reservas persistidas. Esa protección debe acompañar la primera confirmación, no esperar al final del proyecto.

## Alcance y frontera

Incluye cuatrimestrales y anuales, distintos horarios por día semanal, exclusiones manuales, disponibilidad para todas las fechas de cada patrón, alternativas informativas, revisión, confirmación, consulta mínima en agenda/detalle y datos de prueba del recorrido.

I-04 conserva altas esporádicas, edición, reprogramación, cancelación y actualización conjunta del calendario y las series. I-05 conserva consultas completas, impresión e indicadores. No se agregan notificaciones, borradores persistentes, nuevas pantallas de administración ni avisos temporales de módulos pendientes.

**Transición aprobada por el usuario:** hasta implementar la actualización de series en I-04, rechazar en servidor un cambio de calendario que requiera generar nuevas clases. Mostrar el error en el formulario existente y no guardar cambios parciales. Es una limitación transitoria de I-03, no una modificación de la especificación final. Los cambios sin ese efecto siguen permitidos si cumplen las reglas. La actualización conjunta completa se mantiene en I-04; no hacer una actualización silenciosamente incompleta.

Las vistas migradas consultarán reservas persistidas sin mezclarlas con reservas simuladas. Las acciones de edición/cancelación pendientes no deben aparentar guardar cambios sobre una reserva persistida: no se conectarán como acciones operativas hasta I-04. El prototipo completo sigue disponible en `prototype/v1`.

## Cortes aprobados

Cada corte funcional incluye contrato, persistencia necesaria, Java, conexión React y pruebas del comportamiento. Los nombres de rutas y DTO se concretan en OpenAPI antes de implementarlo. No se separa el trabajo en una entrega de base de datos, otra de backend y otra de frontend.

| Corte | Resultado visible | Bloqueado por |
|---|---|---|
| I-03.1 · Preparar fechas y consultar disponibilidad | Datos y fechas reales; aulas válidas para todo el patrón; revisión sin guardar. | I-02 aceptada y aprobación de este plan |
| I-03.2 · Confirmar y consultar la reserva | Guardado atómico, reintento seguro, éxito y detalle persistido; aparición en agenda y acceso desde reservas. | I-03.1 |
| I-03.3 · Resolver falta de disponibilidad | Alternativas ordenadas, explicación de conflictos y contactos según rol; volver a consultar después de cambios efectivos. | I-03.2 |
| I-03.4 · Datos de demostración y aceptación integrada | Escenarios 2026/2027 reproducibles, resultados esperados y guía de QA manual. | I-03.3 |

### I-03.1 · Preparación, fechas y aulas

- Java deriva fechas a partir de curso/año, uno o dos cuatrimestres, día, inicio y módulos. Solo años habilitados, lunes a viernes, 07–23 y módulos de 30 minutos. Hoy se admite únicamente si el inicio no ocurrió, en la zona institucional.
- Una anual usa la unión de ambos cuatrimestres. Distinguir receso, feriados, fechas ya iniciadas y exclusiones elegidas; un patrón sin fechas efectivas obliga a corregir la propuesta.
- Capacidad en personas, tipo y recursos determinan elegibilidad. Cantidad de PC no filtra ni ordena.
- Mostrar hasta tres aulas por capacidad suficiente e identificador y permitir consultar el resto. Elegir un aula por patrón, nunca por fecha individual.
- Al cambiar datos o exclusiones, invalidar selecciones/revisión que hayan dejado de corresponder. Consultar y revisar no ocupa aulas ni persiste borradores.
- Introducir las tablas del modelo necesarias para consultar ocupación, aunque la escritura operativa se habilite en el corte siguiente. No insertar reservas al arrancar.

Aceptación: comparar fechas y disponibilidad con un conjunto pequeño de resultados exactos; comprobar anual con receso, período iniciado, exclusiones, horarios contiguos y ausencia de candidatas. Probar consulta por los tres roles, estados de carga/error y recorrido móvil/escritorio. La confirmación persistente aún no se considera entregada en este corte.

### I-03.2 · Confirmación, integridad y lectura

- Guardar cabecera, subtipo periódico, períodos asignados, patrones, exclusiones y ocurrencias en una transacción. Docente proviene de la referencia fija; registrador del usuario autenticado. Conservar requisitos y versiones del modelo.
- Confirmación vuelve a calcular fechas y disponibilidad. Si cambia el calendario, la elegibilidad, la ocupación o el tiempo hace que una clase ya haya empezado desde la revisión, rechazar y conservar la propuesta para revisarla, sin quitar fechas silenciosamente.
- Restricción PostgreSQL contra intervalos superpuestos de una misma aula para detalles confirmados, con extremos `[inicio, fin)`. Documentar un único orden de bloqueo para cuentas/permisos, calendario, aulas y reservas compatible con las operaciones existentes y futuras.
- Proteger desde este corte bajas, estados y cambios de capacidad/tipo/recursos del aula; eliminación/cierre/cambio de estado del año y eliminación/cambio de períodos o feriados. Comprobar referencias históricas además de clases futuras cuando corresponda. Aplicar la transición de calendario acordada antes de permitir altas.
- Conectar éxito, detalle y consulta mínima de agenda/reservas a las mismas lecturas persistidas: fecha, aula, curso, horario y acceso al detalle. No acreditar como integración resultados provenientes del estado simulado.
- Docente consulta sin emails ni datos administrativos restringidos en el JSON. Admin/Bedel pueden confirmar; Docente recibe rechazo incluso llamando directamente a la API.

Diseño acordado de reintento: UUID por intento lógico, asociado al actor y al contenido de la solicitud. Guardar identidad de operación y resultado junto con la reserva; misma clave y contenido devuelve la reserva existente, misma clave con otro contenido devuelve conflicto. Un timeout conserva la clave y permite comprobar el resultado mediante API antes de generar otro intento. Un rechazo conocido permite corregir y comenzar un intento nuevo. No agregar una cola ni otra pantalla.

Aceptación: recarga y segunda sesión muestran la misma reserva; dos solicitudes simultáneas por la misma franja producen un único éxito; reintentos concurrentes no duplican; una fecha conflictiva o fallo de escritura no deja cabecera ni detalles parciales. Probar también confirmación contra baja/cambio de aula y modificación de calendario con PostgreSQL aislado real. Comprobar recuperación de respuesta perdida y rechazo de entradas manipuladas.

Este es el corte de mayor riesgo. Si excede un contexto de implementación, subdividir por recorrido acotado (cuatrimestral de un patrón; luego múltiples patrones/anual/exclusiones), conservando desde la primera escritura atomicidad, reintentos y protecciones administrativas. No publicar variantes con esas garantías pendientes.

### I-03.3 · Alternativas y conflictos comprensibles

- Por patrón sin aula disponible, mostrar únicamente alternativas compatibles por capacidad, tipo, recursos y estado, sin permitir seleccionarlas para confirmar.
- Grupo 1: conflictos solo esporádicos, por menos fechas distintas y luego menos minutos. Grupo 2: con periódicas, por menos minutos periódicos y luego menos fechas esporádicas. Desempatar por capacidad e identificador según la especificación; calcular minutos como unión de intervalos por modalidad/fecha.
- Tres alternativas iniciales y acceso a las restantes. Mostrar fechas, horarios y reservas afectadas; contactos de registrador actual y solicitante guardado solo para roles operativos.
- Distinguir falta de aulas compatibles de aulas compatibles ocupadas. Conservar la propuesta ante conflicto nuevo al confirmar; recalcular al volver a consultar.
- No guardar estadísticas de conflictos, excluir fechas automáticamente ni considerar un contacto externo como resolución.

Aceptación: ranking exacto con empates, distintas cantidades de fechas, intervalos contiguos y mezcla de modalidades. Las esporádicas necesarias para validar este ranking se introducen como fixtures de prueba controlados, sin adelantar su formulario de alta de I-04. Probar privacidad por API y presentación móvil/escritorio.

### I-03.4 · Datos y QA

- Ampliar la carga explícita de demo con periódicas del segundo cuatrimestre 2026, primero 2027 y anuales 2027, usando los catálogos existentes.
- Incluir varios patrones, misma aula o aulas distintas por día, omisiones por feriado/receso, exclusiones manuales, capacidad justa, espacio disponible y propuestas que encontrarán ocupación. No sembrar solapamientos activos inválidos.
- Determinismo por configuración y repetición sin duplicación ni sobrescritura silenciosa de cambios manuales. Mantener separado el dataset pequeño de prueba del conjunto de demostración.
- Cualquier historia ficticia se carga explícitamente, sin permitir altas retroactivas por la interfaz. La demo usa reloj real; las pruebas de fechas usan reloj controlado. Documentar fechas de consulta útiles para la fecha de ejecución.
- El volumen amplio de miles de clases y las referencias numéricas de indicadores se completan en I-05, junto con cancelaciones/reprogramaciones de I-04.

Entregables de cierre: guía `qa-manual-i-03.md`, instrucciones y resultado de la carga, contratos OpenAPI, avance con evidencia y commits. QA debe cubrir los tres roles, recarga, segunda sesión, anual, exclusiones, alternativas, conflicto después de consultar, reintento, protecciones administrativas y visualización móvil/teclado/zoom. Distinguir pruebas con fixtures de recorridos realmente ejecutados con Supabase.

## Método y aprobación

Para cada corte: revisar contrato y casos, implementar, ejecutar pruebas pertinentes, revisar con subagente Terra high según el método solicitado, corregir hallazgos, verificar visualmente y hacer commit. La revisión del plan no requiere comenzar código ni modificar Supabase.

Puntos revisados secuencialmente con el usuario:

1. Resultado, frontera I-03/I-04 y transición de cambios de calendario.
2. Orden de los cuatro cortes y aceptación de preparación/confirmación.
3. Alternativas, datos y checklist de cierre.

**Aprobado:** punto 1, resultado y frontera I-03/I-04, incluida la protección transitoria de cambios de calendario que requieran generar clases.

**Aprobado:** punto 2, orden de los cuatro cortes y criterios de preparación/confirmación: disponibilidad sin retención, persistencia consultable, atomicidad, conservación de la propuesta ante conflictos, protección concurrente, reintentos sin duplicación y protección frente a cambios administrativos.

**Aprobado:** punto 3, alternativas informativas según la especificación, datos reproducibles 2026/2027 y checklist de cierre con QA manual, pruebas automatizadas y revisión visual.

Los tres bloques del plan detallado están aprobados. Los cortes se ejecutan bajo esta aprobación; la evidencia de implementación y las pruebas se registran en el documento de avance. La aceptación manual final corresponde al usuario.
