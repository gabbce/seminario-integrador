# Avance de I-02

Plan aprobado: [administración y catálogos](i-02-administracion-y-catalogos.md). Todos los datos son ficticios para el TP; persistencia en Supabase PostgreSQL y Auth.

| Corte | Estado |
|---|---|
| I-02.1 | Completado |
| I-02.2 | Completado |
| I-02.3 | Pendiente |
| I-02.4 | Pendiente |
| I-02.5 | Pendiente |
| I-02.6 | Pendiente |

## I-02.1

Listado, filtros, orden y paginación de cuentas desde Java. Edición transaccional de perfil/rol/estado con versión y auditoría antes/después, sin secretos. Un bloqueo compartido por las mutaciones de cuentas serializa la protección del último administrador; se vuelve a comprobar el permiso del actor dentro de esa transacción.

Pruebas PostgreSQL: perfil y auditoría, rechazo de versión vieja, permisos y dos degradaciones simultáneas. Prueba HTTP de acceso al listado por los tres roles. Navegador: 11 recorridos automáticos sin proveedor, incluidos edición/filtros y accesibilidad en 390/1440. Cinco recorridos con Supabase: roles y perfil deshabilitado de I-01 más edición de Bedel, recarga, observación desde otra sesión y restauración del nombre original. Capturas revisadas visualmente en frontend/evidence/i021-*.png (fuera de Git).

Revisiones Terra high separadas de especificación y estándares. Se corrigió auditoría insuficiente y se documentaron cuerpos de error OpenAPI. Contrato: docs/api/administracion.openapi.json. Alta/email/contraseña corresponden al siguiente corte; no se usan adaptadores de identidad ficticia.

Cierre I-02.1: 16 pruebas backend aprobadas, build/lint frontend limpios y ambos revisores Terra high sin bloqueantes tras las correcciones. Las unitarias históricas del prototipo no se cuentan como evidencia de integración.

## I-02.2

Alta, cambio de email y contraseña conectados a Supabase desde Java. Journal sin secretos y recuperación de alta mediante UUID de operación. Reintentos de email consultan Auth antes de repetir la misma asignación; contraseñas inciertas no se repiten automáticamente. La interfaz conserva e inmoviliza datos durante recuperación y separa perfil/email/contraseña en el panel aprobado.

Diecinueve pruebas backend, doce de navegador sin proveedor y seis recorridos reales aprobados. El recorrido nuevo creó una cuenta ficticia QA, verificó ingreso inicial, cambió email conservando identidad, verificó nuevo ingreso, cambió contraseña, comprobó ingreso con la nueva y rechazo de la anterior. Cuenta QA deshabilitada al finalizar. Captura i022-real-cuentas revisada; secretos nunca guardados en evidencias. Ambos revisores Terra high aprobaron tras corregir clasificación de rechazo/duplicado, recuperación de email no aplicado e inmovilización de datos al reintentar.
