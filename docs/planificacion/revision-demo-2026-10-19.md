# Revisión real para preparar el video · 19/10/2026

Base de código: `main`, `2c7dc7b`. Destino: paquete local `http://127.0.0.1:8082` con Java/PostgreSQL/Auth reales del proyecto Supabase `nrjykdzvzrcixapkdfsp`. Este documento registra comprobaciones técnicas para preparar la grabación; no constituye aceptación manual de I04/I05/I06.

## Entorno y reactivación

- Reactivación solicitada expresamente por el usuario el 19/10/2026. Supabase confirmó `ACTIVE_HEALTHY`; el paquete respondió HTTP 200 y `UP`.
- Se usó la imagen construida desde el commit indicado. No se ejecutaron seeds ni restablecimientos remotos.
- Las contraseñas privadas de pruebas en `backend/.env` no coincidían con Auth. Se comprobó el ingreso usando las credenciales demo compartidas ya documentadas. La corrección se aplicó exclusivamente al entorno del proceso de pruebas: no se modificaron las contraseñas de cuentas existentes, ni el archivo privado ni las claves de servidor.
- Antes de corregir esa configuración se interrumpió una batería que esperaba el ingreso. Ese intento no se contabiliza como fallo funcional ni como verificación aprobada.
- Navegador principal de esta revisión: Chromium en Linux/WSL, escritorio y segunda sesión Docente móvil según cada recorrido. No extrapolar este resultado a Firefox/Windows ni al zoom nativo.

## Resultados

**Lecturas reales: 10/10 aprobadas.** Rutas profundas y errores JSON; ingreso Administrador/Bedel/Docente y rechazo de cuenta inactiva; recarga y permisos; listado completo, filtros y paginación; PDFs Chromium/Firefox/Linux de 104 filas; indicadores diarios/semanales, receso y proyección pública Docente.

Valores observados conservados: 23/08/2027 = 104 clases, 52/272 horas habilitadas, 19,1 %, 780 alumnos-hora y picos 125/8; semana 23–27/08 = 56/1360 horas, 4,1 % y 855 alumnos-hora. La impresión completa usa 104 identidades distintas aunque se abra desde una página de 20 filas.

**Operaciones existentes: 13/14 aprobadas en la primera corrida (15,2 minutos).** Se comprobaron altas periódica/esporádica, edición de cabecera e historial, cambio de aulas por fechas y patrón completo, reprogramación periódica, cancelación/liberación/reutilización, calendario con generación atómica, consultas y privacidad en segunda sesión Docente. Las series de referencia 24–31 conservaron sus 69 clases y 18 canceladas.

El caso esporádico restante hizo correctamente el primer movimiento, pero el segundo destino fijo —13/08/2027, 18:00–19:30, aula 103— estaba ocupado. La app rechazó la revisión sin guardar ese cambio. Se completó sobre la misma reserva propia 349 con destinos comprobados previamente: 18/08 y 20/08, 21:00–22:30. Ambos movimientos aprobaron y conservaron el origen 10/08 y el aula. No se eliminó ni modificó la reserva que producía la interferencia.

**Recorridos adicionales aprobados:** filtros de agenda por curso/docente; filtros de tipo/capacidad/recursos de indicadores; comparación A/B con recarga; disponibilidad de laboratorio con alternativas y conflictos; consulta administrativa y formularios; alta/edición/estado/baja de aula propia con recarga; creación de curso desde el selector; cancelación parcial y cese de periódica propia. El cierre dirigido terminó con **3/3 casos aprobados**: reprogramación esporádica con destinos disponibles, habilitación/cierre del año 2041 y edición/baja/rehabilitación de la cuenta QA11 con versión actual. La última lectura confirmó ambas cuentas QA inactivas, el año 2040 eliminado y el 2041 cerrado.

Comparación observada: A=23–27/08/2027 y B=30/08–03/09/2027, cinco días hábiles por rango. Ocupación 4,1 %/0 % y diferencia −4,1 p. p.; horas por día 11,2/0; clases por día 21,6/0; alumnos-hora por día 171/0. No se copiaron cifras de fixtures simulados.

## Incidencias y preparación de las tomas

- El primer script adicional de filtros hizo una interacción demasiado seguida sobre controles que actualizan la URL; la comprobación de Proyector falló. La repetición, esperando la actualización de cada filtro y su estado visible, aprobó. No se cambió código de producto.
- El primer guardado de 2040 superó la espera del script para el mensaje final. Una lectura posterior confirmó `Habilitado`, versión 1, con períodos guardados. En la continuación se quitaron ambos períodos y se eliminó exclusivamente ese año QA, sin dependencias.
- Al crear 2041, el formulario volvió a aparecer en preparación antes de la revisión; la corrida no llegó a mostrar impacto. El comportamiento es compatible con la recarga de referencias tras agregar un año, que puede volver a montar la pantalla mientras se empieza a editar. No se lo presenta como guardado aprobado ni se oculta el intento. Para grabar: esperar a que terminen las cargas, reabrir el año y comprobar los cuatro campos y el estado antes de revisar. La continuación sobre ese mismo año ya cargado aprobó: períodos, habilitación, cierre y recarga de solo lectura, sin crear otro año.
- La cuenta QA10 se creó, cambió correo y contraseña y admitió el ingreso con la clave nueva. Una edición posterior encontró versión obsoleta: la app la rechazó. Se la dejó inactiva mediante la API con su versión actual. La repetición con cuenta QA11 pasó el alta/correo/contraseña, pero agotó el límite global de 90 s al agregar también baja/rehabilitación y recargas. No se declara aprobada esa corrida. La continuación separada sobre QA11 aprobó tres guardados con versiones 4/5/6: inactiva→activa→inactiva, rol Bedel. No se creó otra identidad ni se tocaron cuentas del equipo.
- Las esperas remotas y estados recuperables son parte del entorno real. El video debe cortar las esperas y conservar resultados auténticos; si una escritura queda pendiente, consultar su resultado con el mismo identificador antes de repetirla. Esta revisión no acredita objetivos de rendimiento remoto.

## Evidencia reproducible

Los scripts auxiliares, logs, capturas y PDF de esta revisión se guardan en `artifacts/qa/demo-2026-10-19/`, `artifacts/qa/operations/`, `artifacts/qa/package/`, `artifacts/qa/i05/` y `frontend/evidence/`, ignorados por Git. No incluyen inventarios de contraseñas en este documento.

- Lecturas del paquete: `frontend/playwright.readonly.config.ts` (`AULAS_TEST_ORIGIN=http://127.0.0.1:8082`).
- Operaciones: suites reales existentes de cancelación, cabecera, cambio de aulas, reprogramación, calendario, reservas, consultas y esporádicas. Configuración auxiliar sin respuestas simuladas. La prueba histórica I-03.4 se excluye de esta corrida porque su navegación de Disponibilidad todavía intenta seleccionar Curso/Docente, campos que no existen en la consulta actual; la consulta de alternativas se revisa por separado con los controles actuales.
- Recorridos adicionales: filtros de agenda/indicadores, comparación A/B, disponibilidad con alternativas, formularios administrativos, ciclo de años propios y gestión de cuenta/aula propias.
- Las credenciales se leen de la guía demo al proceso, sin mostrarlas en comandos ni cambiar las cuentas del equipo.

## Grabación

Guion actualizado: [video mudo de hasta diez minutos](guion-demo-final.md). Presupuesto de montaje: 580 segundos (9:40), con veinte segundos de margen para títulos/transiciones. La cobertura relaciona CU-01–29 y extensiones visibles con cada capítulo.

No se grabó ni se exportó el video en esta revisión. Se debe cronometrar el primer montaje y comprobar la legibilidad al tamaño de proyección. Las pausas y explicaciones del coloquio suceden sobre el reproductor y no forman parte de la duración del archivo.



## Registros propios conservados y estado final

La lectura posterior a todas las operaciones confirmó estos registros. Se conservaron como trazabilidad del ensayo; no se restablecieron los datasets. Los cursos QA compartidos que ya existían se reutilizaron sin cambiar sus datos.

| Reserva | Curso | Resultado observado |
|---|---|---|
|345|94|Impacto de calendario en año 2030 (id 5, versión 2): 4, 11 y 18 de marzo de 2030, 18–19, aula 103; tres clases vigentes.|
|346 / 347|84|Dos clases canceladas con motivo; reemplazo de dos clases en las mismas aulas/franjas después de comprobar liberación.|
|348|85|Cabecera 20→25 alumnos y docente D-01→D-02; dos clases, fechas/aulas conservadas; historial y privacidad comprobados. El aula elegida se preparó para capacidad 25, sin forzar el aula 103.|
|349|88|Dos clases esporádicas. La clase con origen 10/08 quedó finalmente el 20/08/2027,21:00–22:30, aula 103; origen conservado tras movimientos sucesivos. La otra clase mantiene su programación.|
|350|89|Periódica de 17 clases; origen 11/03 trasladado sucesivamente a 12/03 y 15/03,18:00–19:30, aula 105; patrón conservado.|
|351|86|Cambio de aula de dos fechas esporádicas a 204, conservando fechas/horarios.|
|352|87|Cambio de aula de patrón periódico completo: 17 clases en 204.|
|353|83|Esporádica creada desde el asistente real: 19 y 21/07/2027; dos clases persistentes y consulta Docente desde otra sesión.|
|354|103|Periódica propia de 17 clases: cancelación parcial primero, luego todas las futuras; 17 canceladas y `continuityCancelledAt` presente.|
|355|28|Periódica confirmada desde el asistente: 33 clases; recarga y consulta en segunda sesión aprobadas.|

- Año 2030: habilitado, reserva 345 y tres clases vigentes. Año 2040: creado, períodos guardados, retirados y año eliminado solo después de quitar sus dependencias. Año 2041 (id 7): cerrado, versión 2, sin reservas; controles de edición deshabilitados al recargar.
- Cuenta QA10 y QA11: correo y contraseña cambiados durante sus recorridos, ambas finalmente inactivas; QA11 quedó Bedel, versión 6. Los identificadores completos de las cuentas ficticias figuran en el inventario local del ensayo.
- Aula propia `QA-1792455892646`: creada como laboratorio, capacidad editada a 35, estado Mantenimiento y posterior baja; visible en el filtro Baja. No tiene reservas.
- Curso nuevo creado desde «Crear curso» del asistente: selección y persistencia tras recarga aprobadas. No se confirmó una reserva por el solo hecho de crear ese curso.
- Capturas reales inspeccionadas: impacto del año 2030 y tabla comparativa A/B. También se generaron capturas de los demás recorridos y de consulta móvil.

La lectura final volvió a comprobar 104 filas, 52/272 horas, 780 alumnos-hora y picos 125/8 el 23/08/2027. Las reservas 24–31 pasaron la comprobación de sus 69 clases/18 canceladas. Las cuentas de presentación y los calendarios 2026/2027 no fueron modificados por estas pruebas.

## Cierre y alcance

Supabase `ACTIVE_HEALTHY`; contenedor local saludable y `/api/health` con HTTP 200/UP al finalizar. La app queda iniciada en 8082. Los cambios versionables son únicamente el guion y este registro; no se modificó código de producto, configuración privada, credenciales del equipo ni migraciones.

Las corridas iniciales con fallos quedan descritas arriba y conservadas en sus logs. Las repeticiones acreditan las continuaciones concretas; no convierten retroactivamente esas baterías en 100 % aprobadas. En particular, queda observado el riesgo de empezar a editar un año inmediatamente después de crearlo y el rechazo de una versión desactualizada de cuenta. Para el ensayo de grabación se indican cargas completas y reabrir con datos actuales.

Verificación documental: cronograma de 12 capítulos consecutivos, 580 segundos y 20 segundos de margen; enlaces locales y `git diff --check` revisados. El guion cubre CU-01–29 y las extensiones visibles. El archivo de video todavía debe grabarse, montarse y medirse; no se promete una duración real de exportación sin ese ensayo.
