# Calidad y validación

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: requisitos originales y cobertura consolidada para la versión 1.0. No se han ejecutado pruebas de aplicación; aún no hay implementación.

## Requisitos no funcionales vigentes

| ID | Compromiso documentado | Concreción vigente |
|---|---|---|
| RNF-01 | Autenticación con Supabase Auth y autorización por rol/estado en backend. | Política y sesiones del proveedor; credencial administrativa solo en backend, Admin inicial conforme a documento 10. |
| RNF-02 | Transacciones ACID en PostgreSQL para reservas, calendario y mutaciones del dominio. | PostgreSQL en Supabase. Altas de identidad/perfil por servicios distintos siguen el manejo de fallos parciales del documento 15. No se exigen respaldos ni restauración. |
| RNF-03 | p95 de disponibilidad/listados menor a 1,5 s; altas/modificaciones periódicas menor a 2 s; índices en aula/fecha/hora inicial y paginación obligatoria. | Escenario y protocolo del documento 11; paginación y agenda en documentos 14/15. |
| RNF-04 | Bitácora de operaciones del dominio con usuario, timestamp y entidad. | Eventos, conservación durante la vida de la base y acceso técnico en documento 17. |
| RNF-05 | 50 usuarios concurrentes: 10 % Bedel/Admin y 90 % Docente, respetando p95. | 5 sesiones operativas y 45 docentes; registrar equipo y entorno según documentos 11/17. |

PostgreSQL y Docker Compose están aprobados para demo local (DA-79). DA-81 aprueba Java/Spring Boot y React/Vite; el modelo consolidado concreta las especializaciones y DA-82 a DA-84 precisan rol y edición; DA-85 cierra el cálculo de ocupación.

La usabilidad y trazabilidad se concretan en pantallas, navegación, contratos y casos vigentes (documentos 14/15/18), con matriz de navegadores en documento 17.

## Escenarios de aceptación derivados de lo ya explícito

Estos escenarios resumen la cobertura original. Los criterios detallados de cada tema y los casos vigentes del documento 18 precisan los resultados esperados.

| Escenario | Resultado exigido por la especificación | Cobertura |
|---|---|---|
| Credenciales válidas / inválidas / usuario inactivo | Auth valida credenciales; Java permite o rechaza según identidad, estado y rol. | RF-01 |
| Email o identificador de aula duplicado | Alta rechazada sin duplicar entidad. | RF-02/06 |
| Baja o cambio de rol del último Admin activo | Operación impedida. | RF-04/05 |
| Inhabilitar o eliminar aula con reservas futuras | Operación impedida. | RF-08/09 |
| Aula con capacidad insuficiente, inactiva u ocupada | No aparece como disponible. | RF-18 |
| Cuatrimestres superpuestos o tercer cuatrimestre | Alta/modificación rechazada. | RF-15/16 |
| Borrar calendario con dependencias | Operación impedida. | RF-13/17 |
| Duración no múltiplo de 30 o fecha pasada | Registro rechazado. | RF-21/22, CU-21/22 |
| Reserva esporádica con varias fechas válidas | Ocurrencias y aulas seleccionadas persistidas al confirmar. | RF-21/23 |
| Reserva periódica | Ocurrencias dentro de períodos válidos y verificación de conflictos. | RF-22/23 |
| Solapamiento detectado antes de persistir | Conflictos informados; no se confirma una asignación inválida. | RF-20 |
| Error de persistencia en confirmación | Ninguna reserva parcialmente registrada. | CU-23, RNF-02 |
| Modificar ocurrencia seleccionada | Revalidación y modificación conforme al alcance seleccionado. | RF-24 |
| Cancelación de fecha futura con motivo / fecha pasada | Baja de la fecha seleccionada / rechazo de cancelación pasada. | RF-25 |
| Listados y agenda | Datos por filtros y orden acordados; Docente solo consulta. | RF-26 a 28 |
| Indicadores sin datos | No confundir cero con falta de horas habilitadas o falta de cobertura histórica; ver documento 09. | CU-29, DA-38 a DA-42 |
| Carga de 50 usuarios con mezcla definida | Cumplimiento de percentiles establecidos. | RNF-03/05 |

## Cierre documental y validación futura

La [síntesis de la versión 1.0](00-especificacion.md) reúne el alcance consolidado. Modelo, estados, permisos, calendario, flujos, indicadores y operación local tienen definición vigente. Las [66 historias](16-historias-de-usuario.md) y los [29 casos de uso con extensiones](18-casos-de-uso-vigentes.md) permiten revisar cobertura sin reemplazar las fuentes históricas.

La especificación v1.0 está aprobada como estado final por el usuario. Durante la implementación se deberán producir evidencias funcionales, de concurrencia, rendimiento e integración de cuentas según el [procedimiento de verificación](17-operacion-local-y-verificacion.md). La consistencia documental no demuestra cumplimiento de pruebas de software.

## Contexto de validación definido

DA-70 a DA-73 fijan demo académica web con datos ficticios y horario de Santa Fe. El [escenario sintético de prueba](11-contexto-de-demo-y-validacion.md) establece volumen y protocolo de referencia para verificar los RNF sin presentarlos como carga real de la institución. PostgreSQL administrado, transacciones y auditoría del dominio siguen vigentes.
