# QA manual · I-03

**Estado:** guía en preparación durante la implementación. Todavía no acredita resultados ni aceptación del usuario.

## Preparación

Usar las cuentas ficticias de I-01 y los catálogos de I-02. Arrancar frontend y backend según sus README; PostgreSQL y Auth están en Supabase. Las contraseñas permanecen en `backend/.env`. No incluir secretos en capturas.

Abrir dos perfiles de navegador para sesiones independientes. La carga de reservas de I-03 y sus fechas de referencia se documentarán al completar I-03.4. No usar las cantidades del prototipo como resultado esperado.

## Preparación de periódicas · Administrador y Bedel

1. Abrir Nueva reserva periódica. Elegir curso/comisión, docente, cantidad de alumnos prevista, tipo de aula y recursos. Confirmar que las referencias coinciden con administración.
2. Elegir un cuatrimestre de 2027, lunes y miércoles con horarios diferentes. Buscar aulas: cada día muestra cantidad de clases y opciones válidas para todas sus fechas.
3. Seleccionar aula por día semanal. Puede ser la misma en ambos días si está disponible. No existe selección de aula por fecha individual.
4. Volver a Datos y fechas, excluir una fecha y repetir la búsqueda. Revisar que se distingue exclusión manual de feriados/receso y que el resumen coincide con las fechas a registrar.
5. Probar una anual de 2027: incluye ambos cuatrimestres y omite el receso. Probar el segundo cuatrimestre de 2026 si todavía tiene fechas futuras: no incluye clases ya iniciadas.
6. Probar requisitos sin aula compatible, todos los días sin fechas y exclusión de todas las fechas de un patrón. Debe informar cómo corregir; no confirmar una serie vacía ni sugerir aulas insuficientes.
7. Comprobar que cantidad de PC no aparece como requisito de búsqueda y que la capacidad se mide en personas.

Referencia exacta con el calendario original `catalogos-i02-v1`, sin exclusiones manuales y consultando antes de comenzar esos períodos: lunes + miércoles del primer cuatrimestre 2027 generan **33 clases** (16 + 17); una anual 2027 genera **60 clases** (29 + 31). Excluir el lunes 15/03/2027 reduce cada total en una clase. Si se modificó el calendario o ya transcurrieron fechas, revisar las omisiones: estos totales dejan de ser el resultado esperado.

## Confirmación y consulta

1. Revisar curso, docente, alumnos, requisitos, aula por patrón, fechas incluidas y omitidas; confirmar. Ver éxito solo después del guardado.
2. Abrir el detalle y luego la agenda en una fecha de la nueva reserva. Recargar y consultar desde la segunda sesión: misma reserva y asignaciones.
3. Buscar el mismo espacio/horario: la reserva confirmada ocupa sus fechas. Una preparación abandonada no ocupa aulas.
4. Preparar dos propuestas coincidentes desde dos sesiones. Confirmar una y luego la otra: la segunda se rechaza sin guardar un subconjunto y permite corregir la propuesta.
5. Un horario contiguo al final de una clase no es conflicto. Probar también una superposición parcial para contrastar.
6. Si aparece «No pudimos confirmar el resultado», usar «Comprobar estado de la reserva». Si todavía no figura confirmada, «Reintentar la misma operación» conserva su identidad y evita duplicados. No interpretar una respuesta perdida como una reserva rechazada. Este flujo también cuenta con pruebas de red simulada.
7. Desde el éxito, «Ver en la agenda» abre la primera fecha guardada. En el detalle persistido no se ofrecen todavía acciones de edición o cancelación.

## Conflictos y roles

1. Consultar una franja ocupada del dataset. Las alternativas aparecen separadas de las disponibles y no se pueden seleccionar para confirmar.
2. Abrir el detalle del conflicto: fechas, horarios, curso y reserva. Admin/Bedel ven el registrador y solicitante diferenciados, con sus contactos disponibles.
3. Como Docente, consultar disponibilidad y la reserva desde agenda/detalle. No debe poder confirmar ni acceder a emails o información administrativa restringida.
4. Volver a consultar conserva los criterios y obtiene disponibilidad actualizada. Contactar por fuera de la app no libera un aula automáticamente.

## Protección administrativa

1. Intentar dar de baja o poner en mantenimiento un aula con reserva futura. Intentar reducir su capacidad por debajo de los alumnos previstos o quitar un recurso solicitado: debe rechazar sin cambios parciales.
2. Intentar cerrar el año con clases futuras, eliminar un cuatrimestre asociado o agregar un feriado que invalide una clase vigente. Debe informar dependencias y conservar los datos.
3. Hasta I-04, un cambio de calendario que deba generar nuevas clases se rechaza. No debe guardar el calendario dejando incompleta la serie. Cambios compatibles, como una descripción, siguen funcionando según sus reglas.

## Presentación y pruebas controladas

- Revisar escritorio y móvil de aproximadamente 390 px: selección, resumen, errores y éxito sin recortes ni desplazamiento horizontal accidental.
- Recorrer con teclado, comprobar foco y etiquetas, y ampliar zoom. Los errores tienen separación visual respecto de los demás controles.
- Fallos de API no se presentan como disponibilidad vacía ni sustituyen los datos por ejemplos.
- Concurrencia simultánea, rollback y respuesta perdida se comprueban además automáticamente con PostgreSQL aislado y fallos controlados. No hace falta provocar caídas de Supabase para el QA manual.
- Edición, reprogramación, cancelación, alta esporádica y actualización de series se aceptan en I-04; indicadores e impresión completa en I-05.

| Sección | Resultado del usuario | Observaciones |
|---|---|---|
| Preparación y disponibilidad | Pendiente | |
| Confirmación y consulta persistente | Pendiente | |
| Alternativas y permisos | Pendiente | |
| Protección administrativa | Pendiente | |
| Datos y presentación visual | Pendiente | |
