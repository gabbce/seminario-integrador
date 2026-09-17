# Avance de I-03

Plan: [reserva periódica persistente](i-03-reserva-periodica.md), aprobado el 17/09/2026. Implementación completa autorizada por el usuario, con revisión Terra high, pruebas, comprobación visual y commits por corte. El usuario aprobó el QA manual el 17/09/2026.

| Corte | Estado |
|---|---|
| I-03.1 · Preparación y disponibilidad | Implementado y verificado |
| I-03.2 · Confirmación y consulta | Implementado y verificado |
| I-03.3 · Alternativas | Implementado y verificado |
| I-03.4 · Datos y QA | Implementado y verificado |

## Evidencia

Se registrarán aquí resultados realmente ejecutados, revisiones y limitaciones por corte. Las pruebas del prototipo no acreditan persistencia. Browser plugin no disponible en esta sesión; se utiliza Playwright del repositorio para comprobar interacción, escritorio/móvil y capturas.

Base antes de implementar: 39 pruebas backend con PostgreSQL desechable, 62 unitarias frontend, 18 recorridos Playwright offline, build y lint aprobados.

También se verificaron los cuatro ingresos reales con Supabase (Admin, Bedel, Docente y cuenta inhabilitada). Se conservan las cuentas y credenciales existentes.

## I-03.1

Preparación periódica calculada por Java: períodos, fechas efectivas y omitidas, requisitos y disponibilidad completa por patrón. React presenta esa respuesta, conserva el diseño B, ofrece tres candidatas y acceso al resto e invalida selecciones al cambiar criterios. La consulta no ocupa aulas ni guarda borradores; confirmación corresponde al corte siguiente.

V8 crea el modelo de reservas con restricciones diferidas de modalidad/relaciones y exclusión de intervalos en PostgreSQL usando rangos nativos, sin extensiones ni permisos nuevos. Aplicada correctamente en Supabase después de ambas revisiones Terra high (especificación y estándares) sin bloqueantes.

Verificación: 48 pruebas backend con PostgreSQL, 62 unitarias frontend, build/lint y 23 recorridos offline aprobados. Tras aislar la nueva API en el fixture general, se repitieron los siete recorridos afectados: aprobados. Cinco casos nuevos comprueban selección/revisión, exclusión total y corrección, invalidación de selección, fallos/reintento y consulta Docente; axe, ausencia de errores de página y overflow verificados. Capturas de selección y revisión inspeccionadas en 390/1440 px, fuera de Git (`/tmp/i031-*.png`).

Recorrido real con Supabase aprobado: Bedel, primer cuatrimestre 2027, selección por patrón y resumen con cantidad de fechas servida por Java. No guarda reservas. Captura real de revisión inspeccionada. Migración v8 y backend local activos para continuar I-03.2.

## I-03.2

Confirmación periódica atómica, UUID por actor/contenido y recuperación de resultado incierto. Java vuelve a validar fechas, versiones, permisos y disponibilidad bajo el orden de bloqueo documentado en [concurrencia](../api/reservas-concurrencia.md). V9 agrega el registro de operación. Aula y calendario protegen reservas activas e históricas según las reglas; se mantiene la transición aprobada hasta I-04.

Agenda/listado mínimos y detalle leen reservas persistidas. El detalle obtiene la reserva por ID y Docente no recibe contactos ni registrador en el JSON. El éxito incorpora la reserva y abre su primera fecha en agenda. Las acciones operativas de I-04 no se ofrecen todavía sobre estas reservas.

Ambas revisiones Terra high (especificación y estándares) aprobadas. Se corrigió una carrera en la que el listado inicial demorado podía sustituir una confirmación nueva; un recorrido de navegador reproduce ese orden y comprueba que la agenda conserva la reserva.

Verificación: 62 pruebas Java con PostgreSQL aislado (14 de confirmación), 64 unitarias frontend, build/lint y 29 recorridos offline aprobados. Las pruebas antiguas de ingreso/administración esperaban la fecha fija del prototipo; se actualizaron para esperar la agenda operativa, que utiliza la fecha institucional actual. Las pruebas del reloj comprueban el cambio de día/año en Córdoba. Capturas de éxito, detalle y conflicto inspeccionadas en escritorio/móvil (`/tmp/i032-*.png`). Los recorridos con respuestas simuladas prueban interfaz/recuperación; la atomicidad y las carreras de escritura se comprueban con PostgreSQL.

V9 aplicada correctamente en Supabase. Recorrido real aprobado: Bedel confirmó una reserva ficticia de 33 clases (Álgebra, 005-A-2027, lunes/miércoles 07–09, aula 106), recargó el detalle y otra sesión Docente consultó el mismo ID y su agenda. La prueba comprobó que el JSON Docente omite los contactos restringidos. Se conserva la reserva 1 para QA; no se eliminaron registros anteriores.

## I-03.3

Preparación incorpora alternativas informativas solo para patrones sin aula libre y con espacios compatibles. Ranking lexicográfico por modalidad, fechas y minutos, con unión de intervalos por modalidad/fecha y desempate por capacidad/identificador. Las respuestas de Docente omiten contactos; Admin/Bedel reciben el solicitante guardado y el registrador actual, incluido su estado inactivo.

React muestra tres alternativas, permite consultar el resto y desplegar conflictos por aula, sin controles de selección. «Volver a consultar» conserva los criterios y vuelve a Java; un contacto externo no cambia la disponibilidad. Los escenarios esporádicos necesarios para el ranking son fixtures de pruebas, sin formulario de alta esporádica.

La inspección visual detectó un botón parcialmente fuera del ancho móvil pese a no aumentar el ancho del documento. Se corrigió la barra de acciones del asistente y se agregó una comprobación de posición visible. Capturas finales de escritorio/móvil y Docente inspeccionadas (`/tmp/i033-*.png`); teclado, axe y límites horizontales comprobados.

Ambas revisiones Terra high aprobadas sin bloqueantes. Verificación final: 69 pruebas Java (siete nuevas, incluidas PostgreSQL/API), 64 unitarias frontend, build/lint/OpenAPI y 33 recorridos offline correctos. La consulta real de alternativas se verificará con el dataset cargado en I-03.4; este corte no introduce migraciones ni carga reservas remotas.

Después de integrar I-03.3 se reinició Java y se repitió la preparación real con Supabase: aprobada, sin crear otra reserva. La confirmación real conservada corresponde al corte anterior.

## I-03.4

Dataset versionado con 12 series y 370 clases: cuatro del segundo cuatrimestre 2026 (93 clases), cuatro del primero 2027 y cuatro anuales 2027 (277 clases en 2027). Una comprobación independiente del JSON contra los catálogos de I-02 verificó fechas exactas, capacidad/tipo/recursos y ausencia de solapamientos entre las series. Las fechas esperadas quedan explícitas en la configuración para detectar modificaciones del calendario antes de nuevas altas.

La carga usa un comando explícito y una identidad de dataset/entrada independiente del actor. La repetición conserva registros y detecta discrepancias sin restaurar cambios manuales. El reloj histórico configurado se utiliza solo durante la carga ficticia; la interfaz mantiene reloj institucional real y no permite altas retroactivas.

Ambas revisiones Terra high de I-03.4 aprobadas sin bloqueantes. Suite final de Java: 76 pruebas PostgreSQL correctas; frontend: 64 unitarias, build y lint correctos. Los 33 recorridos offline del corte anterior siguen siendo la referencia de interfaz; I-03.4 no cambia React, añade el dataset y un recorrido real de lectura.

V10 aplicada correctamente en Supabase. Primera carga explícita ejecutada: **12 reservas y 370 clases creadas; 0 conservadas**, sin discrepancias y con salida correcta. Se conserva la reserva ficticia 1 del recorrido real de confirmación.

Segunda ejecución en Supabase: **0 reservas y 0 clases creadas; 12 reservas conservadas**, sin discrepancias. El arranque normal posterior respondió `UP` y no ejecutó el comando de carga.

La primera ejecución del recorrido real de I-03.4 se interrumpió al detectar lecturas demasiado lentas con el dataset completo. Se sustituyó el listado N+1 por seis consultas agrupadas, compartiendo el mapeo con el detalle y manteniendo una instantánea consistente y la privacidad por rol. El ajuste pasó ambas revisiones Terra high y una prueba que cuenta consultas para 12 reservas/370 clases y compara listado/detalle. Medición puntual del mismo listado remoto (13 reservas/403 clases): 19.864 ms antes y 2.693 ms después; no representa una garantía de latencia de Supabase.

Recorrido real final de I-03.4 aprobado contra Supabase (57,9 s): recuentos de las doce series, agenda 2026, detalle anual móvil, ranking de laboratorios y proyección sin contactos en una segunda sesión Docente. Se corrigió un selector del test para localizar el tipo de aula por su rol accesible. Las aulas QA anteriores tienen disponibilidad propia; se agregó Ventiladores como requisito del escenario para comprobar los dos laboratorios sin modificar esos datos. Capturas reales de agenda, detalle móvil y alternativas inspeccionadas (`/tmp/i034-real-*.png`). La ejecución es de lectura y no agrega reservas.

**I-03 implementada, verificada y cerrada: QA aprobado por el usuario el 17/09/2026.** La guía manual queda como referencia para futuras regresiones. I-04 a I-06 conservan su planificación detallada pendiente; no se adelantaron sus funcionalidades.
