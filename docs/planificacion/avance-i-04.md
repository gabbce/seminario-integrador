# Avance de I-04

Plan vinculante: [operación completa](i-04-operacion-completa.md), aprobado el 25/09/2026. Objetivo activo: implementar y verificar los seis cortes y dejar QA manual listo; aceptación exclusiva del usuario.

## Base y método

Inicio: `feat/integracion`, HEAD `a5e59a5`, árbol limpio. `prototype/v1` se preserva. Sin AGENTS.md en repositorio ni directorios antecesores inspeccionados. I-01–03 aceptadas. V8–V10 ya contienen modelo de modalidades, patrones, cancelaciones, exclusiones, operación de alta y dataset; no se modificarán migraciones aplicadas. La interfaz operativa solo confirma periódicas. Calendario conserva protección transitoria contra generación incompleta.

Cada fila requiere: contrato concreto antes de código; backend/PostgreSQL e interfaz B — PATIO; pruebas relevantes y revisión visual escritorio/móvil con errores, conflictos, confirmaciones, teclado y permisos; revisión `gpt-6-luna` esfuerzo `high` sobre diff identificado; correcciones y nueva revisión; evidencia y commit controlado. La revisión preliminar fue ejecutada con ese modelo/esfuerzo solicitados a la herramienta, sin sustitución. El desglose y sus ajustes fueron aprobados sin bloqueantes.

## Matriz de ejecución

| Tarea | Contrato y aceptación a cubrir | Depende de | Estado / evidencia pendiente |
|---|---|---|---|
| Preparación | Lectura completa de fuentes, contraste de código, revisión de este desglose, pruebas base | I-03 | Verificada base y revisión inicial aprobada; contratos por corte pendientes |
| I-04.1 | POST preparación/confirmación esporádica y GET operación/resultado; cabecera común, fechas del mismo año habilitado, receso, apertura, módulos, feriados, pasado, recursos; candidatas por capacidad/ID y alternativas por minutos; conjunto atómico e idempotente. CA-R01–03, 07, 13–18 | Preparación | Pendiente: OpenAPI, código, datos, reglas/API/PostgreSQL concurrente y rollback, navegador/recarga/segunda sesión/privacidad, capturas y revisión |
| I-04.2 | Cancelación por IDs explícitos y versión, motivo obligatorio, revisión de cantidad/fechas/aulas; estados derivados y cese explícito solo al cancelar toda continuidad; no reactivación. CA-R04–08, 21–23, 28 | I-04.1 | Pendiente: contrato de reintento, API/UI, aula reutilizable, carrera edición/cancelación, tiempo durante revisión y rollback, capturas/revisión |
| I-04.3a | Edición de cabecera antes de cualquier inicio, versión, curso del año, docente fijo, revalidación de todas las aulas; rechazo total de incompatibles. DA-83, CA-R19–23 | I-04.2 | Pendiente: contrato/API/UI, pruebas de requisitos/historia/permisos/tiempo/versiones, capturas/revisión |
| I-04.3b | Revisión/confirmación de aulas: esporádicas por detalle; periódicas por patrón completo con todas las futuras vigentes, incluso reprogramadas; conservar iniciadas/canceladas. CA-R22–23, 37 | I-04.3a | Pendiente: contratos, disponibilidad contra conjunto, patrón y detalles atómicos, carreras, UI y revisión |
| I-04.4 | Reprogramación de IDs y versión con fecha/inicio/módulos, aula fija; esporádicas mismo año, periódicas períodos asignados; origen inmutable y patrón intacto; conflictos internos/externos. DA-84, CA-R22–23, 29 | I-04.3b | Pendiente: contrato/API/UI, cambios sucesivos, transacciones y tiempo, errores/confirmación visual y revisión |
| I-04.5 | Preparación de impacto sin escritura y confirmación conjunta de calendario/series; comparar resumen/versiones, revalidar tiempo, requisitos y ocupación; ampliación/quitar feriado, pasado/exclusiones/cancelaciones/continuidad/orígenes; fin natural extensible. CA-R24–30, 35–37; DA-54/55, 57–60 | I-04.2–4 | Pendiente: contratos/API/UI, reemplazo completo de protección transitoria, conflictos/alternativas, competencia con reservas/aulas y rollback; agregar feriado/acortar con/sin dependencias; revisión |
| I-04.6 | Dataset explícito repetible sin sobrescrituras, 2026 segundo/2027 primero/anuales; guía QA con roles/fechas/resultados, regresión integral y cierre técnico | Todos | Pendiente: datos-demo-i-04.md, qa-manual-i-04.md, pruebas/revisión final, commits y limpieza de procesos propios |

## Decisiones técnicas iniciales

- Conservar serialización de escrituras y orden `control_cuentas → año → aulas por ID ascendente → operación/reservas por ID ascendente`. Revalidar rol actual tras bloqueo. Mutaciones READ COMMITTED; lecturas/revisiones coherentes sin retener espacios. La exclusión PostgreSQL `[inicio, fin)` sigue como última garantía.
- Creación esporádica reutiliza identidad de operación por actor/UUID; contenido canónico distingue modalidad. Recuperar resultado previo antes de comprobar ocupación propia. Mismo UUID con contenido diferente se rechaza.
- Mutaciones de reservas incorporarán identidad de operación por actor/UUID/tipo/entidad/contenido, resultado y auditoría en la misma transacción; versión de reserva incluye detalles/patrón. V9 tiene una sola fila por reserva y no sirve para múltiples mutaciones: concretar registro nuevo mínimo y contrato de lectura del resultado antes de I-04.2. Respuesta incierta congela clave y cuerpo; `found=false` no prueba rechazo. No repetir con UUID nuevo hasta resolver.
- Selección explícita de detalles y versión evita reducir silenciosamente el conjunto si inicia una clase. Reasignación periódica compara conjunto revisado completo del patrón con futuras vigentes al confirmar. Confirmación de calendario compara versiones y nuevas fechas revisadas; un cambio temporal exige revisar nuevamente.
- Extender obligatoriamente origen histórico para esporádicas mediante migración nueva antes de I-04.4 para conservar fecha original; preservar reglas de origen de periódicas y no editar V8. No introducir excepciones de aula periódica.
- Mantener DTO por rol: contactos y registrador ausentes también del JSON Docente. Detalle persistido incorporará motivo, estado derivado, origen y datos operativos necesarios; historial y auditoría sin panel adicional.
- Reusar componentes visuales aprobados y flujos operativos; reglas autoritativas solo Java. No mezclar reservas del prototipo ni adelantar consultas completas, impresión o indicadores.

## Verificación y entorno

Al inicio se inspeccionaron puertos: 8080/5173/5174/5175 libres; 5432 ocupado por proceso previo que no se detendrá. Tests de escritura y concurrencia usarán PostgreSQL aislado de Testcontainers. No se imprimirán secretos. Cargas remotas solo ficticias identificables y aditivas, sin borrar datos previos ni sobrescribir QA.

Base aprobada: 76 pruebas backend con PostgreSQL 17.6 aislado (`/tmp/i04-baseline-backend.log`); 64 unitarias frontend, build y lint (`/tmp/i04-baseline-frontend.log`); 33 recorridos Playwright (`/tmp/i04-baseline-browser.log`). Browser plugin no disponible; se utiliza Playwright del repo. Sin capturas nuevas I-04 inspeccionadas aún. El servidor Vite de pruebas fue gestionado y detenido por Playwright; sin servicios propios de aplicación activos.

## Revisiones y commits

Revisión inicial gpt-6-luna high sobre `/tmp/i04-initial-plan.diff`, SHA256 `9ca262a2dd46717530774f5fb2063eace3c84fce405b33e0e78bfce8a4121c7a`, contra `a5e59a5`: aprobada para iniciar I-04.1. Se incorporaron observaciones: migración obligatoria de origen esporádico antes de I-04.4, registro de múltiples mutaciones distinto del V9 y actualización de evidencia base. Nueva revisión de ajustes (`1774adc08a09d7e4b5083fbc1f6efee8e4279acb4db1853caff8b8c2f6e9131a`) aprobada sin bloqueantes. Los seis cortes permanecen pendientes; este avance no acredita implementación ni aceptación.
