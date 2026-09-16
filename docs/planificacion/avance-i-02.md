# Avance de I-02

Plan aprobado: [administración y catálogos](i-02-administracion-y-catalogos.md). Todos los datos son ficticios para el TP; persistencia en Supabase PostgreSQL y Auth.

| Corte | Estado |
|---|---|
| I-02.1 | Completado |
| I-02.2 | Completado |
| I-02.3 | Completado |
| I-02.4 | Completado |
| I-02.5 | Completado |
| I-02.6 | Completado |

## I-02.1

Listado, filtros, orden y paginación de cuentas desde Java. Edición transaccional de perfil/rol/estado con versión y auditoría antes/después, sin secretos. Un bloqueo compartido por las mutaciones de cuentas serializa la protección del último administrador; se vuelve a comprobar el permiso del actor dentro de esa transacción.

Pruebas PostgreSQL: perfil y auditoría, rechazo de versión vieja, permisos y dos degradaciones simultáneas. Prueba HTTP de acceso al listado por los tres roles. Navegador: 11 recorridos automáticos sin proveedor, incluidos edición/filtros y accesibilidad en 390/1440. Cinco recorridos con Supabase: roles y perfil deshabilitado de I-01 más edición de Bedel, recarga, observación desde otra sesión y restauración del nombre original. Capturas revisadas visualmente en frontend/evidence/i021-*.png (fuera de Git).

Revisiones Terra high separadas de especificación y estándares. Se corrigió auditoría insuficiente y se documentaron cuerpos de error OpenAPI. Contrato: docs/api/administracion.openapi.json. Alta/email/contraseña corresponden al siguiente corte; no se usan adaptadores de identidad ficticia.

Cierre I-02.1: 16 pruebas backend aprobadas, build/lint frontend limpios y ambos revisores Terra high sin bloqueantes tras las correcciones. Las unitarias históricas del prototipo no se cuentan como evidencia de integración.

## I-02.2

Alta, cambio de email y contraseña conectados a Supabase desde Java. Journal sin secretos y recuperación de alta mediante UUID de operación. Reintentos de email consultan Auth antes de repetir la misma asignación; contraseñas inciertas no se repiten automáticamente. La interfaz conserva e inmoviliza datos durante recuperación y separa perfil/email/contraseña en el panel aprobado.

Diecinueve pruebas backend, doce de navegador sin proveedor y seis recorridos reales aprobados. El recorrido nuevo creó una cuenta ficticia QA, verificó ingreso inicial, cambió email conservando identidad, verificó nuevo ingreso, cambió contraseña, comprobó ingreso con la nueva y rechazo de la anterior. Cuenta QA deshabilitada al finalizar. Captura i022-real-cuentas revisada; secretos nunca guardados en evidencias. Ambos revisores Terra high aprobaron tras corregir clasificación de rechazo/duplicado, recuperación de email no aplicado e inmovilización de datos al reintentar.

## I-02.3

Inventario conectado a Java/PostgreSQL, con filtros y paginación, subtipos, historial de estados/tipo, auditoría, control de versión y baja lógica. La consulta de disponibilidad consume el mismo inventario persistido. Identificadores únicos incluso tras la baja; PC únicamente descriptivas.

Dos pruebas PostgreSQL y dos recorridos de navegador móvil/escritorio aprobados; capturas i023-aulas revisadas, accesibilidad sin infracciones. Recorrido con Supabase aprobado: alta de laboratorio, recarga, mantenimiento y baja conservando consulta histórica. Se corrigió una ventana de versión vieja al reabrir un registro durante el refresco posterior al guardado, detectada en esta prueba remota. Revisiones Terra high de especificación y estándares completadas. La protección frente a reservas persistidas se incorpora en I-03 antes de habilitar sus escrituras.

## I-02.4

Años, dos cuatrimestres y fechas no lectivas persistidos, con versiones, auditoría y reglas temporales; cerrado de solo lectura. Interfaz conectada con vacío real, carga, reintento y recarga que también actualiza el calendario usado por las otras pantallas. Sin aplicar impactos sobre reservas simuladas.

Seis pruebas de calendario en PostgreSQL, dos recorridos móvil/escritorio con accesibilidad y recorrido Supabase aprobados: alta 2028, dos períodos, feriado ficticio, habilitación y recarga. Se revisaron las capturas i024-calendario y i024-real-calendario. Terra high detectó y se corrigió la falta de propagación de recarga, el bloqueo durante carga/fallo y validación de cuerpos nulos. Dependencias con cursos se agregan en I-02.5; las de reservas, antes de sus escrituras en I-03.

## I-02.5

Cursos y materias desde Java, con búsqueda en el selector, creación desde el formulario, normalización y unicidad concurrente. Código numérico compartido entre comisiones/años, separado del ID interno. Docentes servidos por Java y compartidos por alta/edición de datos de reserva; el adaptador conserva sus IDs. La lista de cuentas no modifica referencias académicas. Cursos dependientes bloquean renumeración/borrado del año.

Siete pruebas PostgreSQL de referencias (incluida carrera alta de curso/renumeración), dos recorridos móviles/escritorio y recorrido Supabase de creación/recarga aprobados. Sesenta y dos pruebas unitarias históricas del frontend siguen aprobadas, sin contarlas como persistencia de reservas. Capturas i025-referencias revisadas, sin problemas de accesibilidad. Terra high corrigió separación de ID/código visible, docentes aún leídos del fixture en edición, carga de referencias y búsqueda. Contrato referencias.openapi.yaml. Registrar curso no persiste una reserva.


## I-02.6

Carga explícita `seed-catalogos`, exclusiva de demo/no web, con configuración JSON versionada. Veinte aulas, dos años 2026/2027 con ambos cuatrimestres, fechas ficticias y cuarenta cursos. Historial de aula preparado desde enero de 2026. Sin llamadas a Auth ni cambios de cuentas. Repetición conserva datos existentes y reporta discrepancias; no es un comando de restablecimiento.

Cuatro pruebas de carga cubren primera ejecución, repetición, preservación de cambios, restricciones de entorno/arranque y rollback. Ambas revisiones Terra high aprobadas. Se ajustó `Lab 2` para mantener el identificador visible del prototipo. Carga aplicada al proyecto Supabase de demo: 20 aulas, 2 años y 40 cursos nuevos; los registros adicionales de QA se conservan.

Guías entregadas: [datos/comando](datos-demo-i-02.md) y [QA manual](qa-manual-i-02.md). Aceptación manual pendiente del usuario. Próxima entrega: detallar I-03 antes de implementar reservas periódicas persistentes y las protecciones de aula/calendario frente a ellas.

Repetición remota del comando: 0 aulas, 0 años y 0 cursos creados, sin discrepancias en los registros del dataset. No se borraron los datos adicionales de QA.

La prueba final con el catálogo poblado detectó consultas anidadas por aula que podían agotar las cuatro conexiones del pool durante recargas concurrentes. Se reemplazaron por una lectura de historial por lote, posterior al cierre del ResultSet de aulas, manteniendo snapshot transaccional. Prueba de asociación/orden de historiales agregada y revisión Terra high aprobada. No se aumentó el pool ni cambió el contrato.

Verificación de cierre: 39 pruebas backend/PostgreSQL, 62 unitarias frontend, 18 recorridos de navegador sin proveedor y 10 recorridos distintos contra Supabase aprobados. Build y lint correctos. La batería remota requirió ajustar la búsqueda del aula después de recargar (ya hay paginación) y los tiempos de espera del proveedor; ambos recorridos afectados se repitieron y pasaron. Capturas de formularios y dataset revisadas en escritorio/móvil; evidencias locales ignoradas por Git. Aceptación manual del usuario todavía pendiente.
