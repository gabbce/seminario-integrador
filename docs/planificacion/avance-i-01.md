# Avance I-01

Plan: [base e ingreso real](i-01-base-e-ingreso.md). Rama `feat/integracion`; prototipo preservado en `prototype/v1`.

| Corte | Estado | Evidencia / pendiente |
|---|---|---|
| I-01.1 | Implementación local revisada; validación remota pendiente | Migración usuarios/perfiles, configuración JDBC/JPA/Flyway y PostgreSQL desechable. Cuatro pruebas pasan. Faltan credenciales/acceso al proyecto para inspección y conexión reales. |
| I-01.2 | Pendiente | Preparación explícita y recuperación de cuentas. |
| I-01.3 | Pendiente | JWT, permisos y `/api/me`. |
| I-01.4 | Pendiente | Sesión real React y pruebas integradas. |

## Verificación local I-01.1

Baseline: backend original correcto; frontend build, lint y 62 unitarias correctos. Las nuevas pruebas fallaron por inexistencia de tablas y pasaron después de la migración: cuatro pruebas con PostgreSQL 17.6 real en Testcontainers. Segunda ejecución de Flyway sin migraciones pendientes. No se modificó frontend ni la base remota.

## Acceso solicitado al usuario

No hay conector Supabase, CLI instalado ni token configurado en este entorno. Se preparó `backend/.env` ignorado por Git y con permisos 600, sin valores privados. Se solicitó autorizar el CLI en WSL con `npx --yes supabase login` y completar la contraseña PostgreSQL en el archivo local. Con autorización se podrán consultar claves/configuración; la contraseña existente no se recupera desde la Management API. No se restablecerá sin evaluar conexiones existentes.

Revisión de Terra high en dos ejes (especificación y estándares): sin hallazgos bloqueantes locales. Ambos revisores ejecutaron las cuatro pruebas con resultado correcto. Commit parcial autorizado; no implica cierre del corte remoto.
