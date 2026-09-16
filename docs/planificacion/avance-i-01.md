# Avance I-01

Plan: [base e ingreso real](i-01-base-e-ingreso.md). Rama `feat/integracion`; prototipo preservado en `prototype/v1`.

| Corte | Estado | Evidencia / pendiente |
|---|---|---|
| I-01.1 | Completado y validado local/remoto | Migración usuarios/perfiles, configuración JDBC/JPA/Flyway y PostgreSQL desechable. Cuatro pruebas pasan. Proyecto inspeccionado; rol propio, V1 aplicada, salud UP, repetición sin cambios y permisos remotos comprobados. |
| I-01.2 | Completado | Comandos admin/demo, UUID durable, HTTP fuera de transacciones, recuperación probada y cuatro cuentas reales creadas/repetidas. |
| I-01.3 | Completado | JWT ES256/RS256, perfil y permisos actuales desde PostgreSQL, contrato OpenAPI y 12 pruebas. |
| I-01.4 | Completado | Login Supabase, perfil Java, navegación por permisos, restauración, salida y errores; 9 pruebas de navegador y 4 recorridos reales. |

## Verificación local I-01.1

Baseline: backend original correcto; frontend build, lint y 62 unitarias correctos. Las nuevas pruebas fallaron por inexistencia de tablas y pasaron después de la migración: cuatro pruebas con PostgreSQL 17.6 real en Testcontainers. Segunda ejecución de Flyway sin migraciones pendientes. No se modificó frontend ni la base remota.

## Acceso solicitado al usuario

No hay conector Supabase, CLI instalado ni token configurado en este entorno. Se preparó `backend/.env` ignorado por Git y con permisos 600, sin valores privados. Se solicitó autorizar el CLI en WSL con `npx --yes supabase login` y completar la contraseña PostgreSQL en el archivo local. Con autorización se podrán consultar claves/configuración; la contraseña existente no se recupera desde la Management API. No se restablecerá sin evaluar conexiones existentes.

Revisión de Terra high en dos ejes (especificación y estándares): sin hallazgos bloqueantes locales. Ambos revisores ejecutaron las cuatro pruebas con resultado correcto. Commit parcial autorizado; no implica cierre del corte remoto.

## Cierre remoto I-01.1

El usuario autorizó el CLI. Se obtuvieron claves de Auth sin mostrarlas ni versionarlas; se creó `aulas_app` y el esquema privado sin alterar la contraseña general de PostgreSQL. Supabase estaba sin tablas en public/aulas. Se deshabilitó registro público y configuró URL local. Java conectó por Session pooler, aplicó V1, devolvió salud UP y repitió arranque sin migraciones pendientes. Roles anon/authenticated sin uso de aulas, fuera de esquemas expuestos por Data API. Se continúa I-01.2.

## I-01.2

Siete pruebas locales, incluidas repetición sin cambios, rechazo de identidad ajena, respuesta incierta y recuperación tras fallo del perfil. La prueba confirma que auth_id persiste después de rollback y que Auth no se llama dentro de una transacción JDBC. Terra detectó y revisó la corrección de esos puntos, paginación acotada y política de contraseña delegada al proveedor; ambos ejes sin bloqueantes. Ejecución real: admin, demo (cuatro cuentas) y repetición corregida completadas. Credenciales en backend/.env, nunca en el journal ni en Git.

## I-01.3

Doce pruebas backend aprobadas con PostgreSQL desechable y claves JWT locales. Cubren firma, emisor, audiencia, expiración, perfil inexistente/deshabilitado, permisos y caída de persistencia. Revisiones Terra high de especificación y estándares aprobadas. Comprobación real con Supabase: Admin, Bedel y Docente reciben 200 y sus permisos en /api/me; cuenta deshabilitada recibe 403 con JWT vigente. Contrato en docs/api/identidad.openapi.yaml.


## I-01.4 y cierre de entrega

React usa Supabase y consulta /api/me antes de mostrar la app. Se retiraron los controles de identidad simulada; el negocio conserva los datos en memoria conforme al alcance. Aplicación operativa cargada después del login, sin agregar avisos de módulos pendientes.

Verificación: build y lint correctos; 62 unitarias; 9 pruebas de navegador con proveedor simulado y 4 con Supabase real aprobadas. Recorridos reales para Admin/Bedel/Docente e inhabilitado: permisos, recarga, cierre, Atrás y bloqueo de perfil. Capturas revisadas de ingreso móvil y navegación tablet/escritorio; accesibilidad axe sin violaciones en los recorridos evaluados. Backend responde UP. Configuración faltante probada de forma aislada: error legible, sin crash.

Revisión Terra high en especificación y estándares: corregidos cierre de sesión prematuro, respuesta de perfil inválida y configuración ausente. El cierre mantiene la app bloqueada hasta limpiar almacenamiento; probado también con proveedor lento o fallido. Evidencias locales en frontend/evidence/, ignoradas por Git. [QA reproducible](qa-i-01.md).

Las 44 pruebas históricas del prototipo se conservan como referencia en e2e/prototype/ y se ejecutan desde prototype/v1; no se cuentan como pruebas de integración. I-02 a I-06 continúan pendientes: antes de cada entrega se detalla y acuerda su plan.

## Aceptación funcional

El usuario completó el [QA manual de I-01](qa-i-01.md) en localhost y confirmó funcionamiento correcto según lo planeado, sin incidencias reportadas. I-01 queda cerrada con validación técnica y aceptación manual. El siguiente paso es detallar y acordar I-02 antes de implementarla.
