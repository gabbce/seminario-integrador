# Correcciones y nueva verificación de cumplimiento · 19/10/2026

**Ampliación posterior solicitada por el usuario:** se hizo commit/push y un [extra de concurrencia contra Supabase remoto](concurrencia-remota-extra-2026-10-19.md). Pasaron 1.546 lecturas con 50 clientes, pero una ráfaga de diez confirmaciones produjo tres HTTP 500 por espera de conexión. Ese hallazgo queda abierto y no se presenta este cierre anterior como prueba de que toda la concurrencia remota está resuelta.

**Dictamen:** las tres brechas funcionales detectadas quedaron corregidas y el fallo intermitente del calendario se reprodujo y corrigió. La verificación técnica aprobó. Las lecturas remotas medidas mejoraron y quedaron por debajo de 1.500 ms de p95; la carga íntegra de 50 sesiones aprobó en PostgreSQL aislado. **No se acredita todavía RNF-03/05 bajo el protocolo completo con Supabase remoto**, ni se sustituye la aceptación manual del usuario.

Se ejecuta el [plan de correcciones](correcciones-cumplimiento-2026-10-19.md) sobre la [auditoría inicial](revision-cumplimiento-2026-10-19.md). Rama local `feat/cumplimiento-requisitos`. La base inicial fue `2c7dc7b`; durante el trabajo se incorporaron commits concurrentes de marca CHAD (`d8f74c9`, `71e4c66`). Se conservaron esos cambios, el guion y los artefactos ajenos a esta tarea. Las imágenes y los hashes de los guiones fijan las revisiones efectivamente medidas; HEAD por sí solo no representa el árbol con correcciones aún sin commit.

## Faltantes corregidos

| Hallazgo | Implementación | Evidencia funcional |
|---|---|---|
| H1 · RF/CU-10 y 14 | Búsqueda administrativa de años por año/estado, paginación y consulta de cuatrimestres por rango inclusivo; referencias de selectores preservadas. | `CalendarManagementTests`, `calendar-search.spec.ts`, calendario 390/1440. Rango imposible/invertido rechazado, página vacía válida y filtros conservados. |
| H2 · EX-02 | Alternativas compatibles ocupadas con ranking periódico, detalle de conflictos/contactos, primeras tres y acceso a restantes; aulas libres se muestran por separado. | `CalendarImpactTests`, `AlternativeRankingTests`, `calendar-impact.spec.ts`. Incluye ventanas reprogramadas, unión de minutos y registrador inactivo; no habilita guardar con conflictos. |
| H3 · RNF-03, colección | `GET /api/reservas` devuelve `{items,total,page,size}`, página base cero, tamaños 20/50/100 y orden estable; hijos/historial se consultan solo para los IDs de la página. | `ReservationPaginationTests`, regresión de confirmación/volumen/consultas y helper de inventario paginado. Docente conserva proyección pública. |
| Calendario intermitente | Las recargas de referencias mantienen montadas las rutas y descartan respuestas anteriores. La recarga explícita del calendario bloquea controles mientras llega su resultado, conserva filtros y no pierde borrador si falla. | Rojo determinista con respuesta de cursos retenida; verde con la misma demora. `calendar-refresh.spec.ts`, `calendar-reload.spec.ts` y calendario 390/1440. |

La revisión independiente detectó y permitió corregir riesgos adicionales antes del cierre: la recarga explícita permitía ediciones concurrentes que luego sobrescribía; abrir otro año durante un alta o revisión demorada podía perder el borrador; y la proyección optimizada convertía extremos incompletos de cuatrimestres de `""` a `null`. Cuentan con regresión roja y verde, incluida recuperación ante HTTP 503. Los cuatrimestres parciales de años en preparación se pueden leer y guardar otra vez. La revisión posterior del bloqueo compartido del editor no encontró nuevos bloqueos.

## Rendimiento con Supabase

Se consultaron `pg_stat_statements`, índices existentes y la documentación oficial. Las lecturas SQL habituales registraban tiempos de ejecución de pocos milisegundos, mientras las respuestas HTTP tardaban segundos. El trabajo se concentró en reducir intercambios JDBC y volumen, sin cambiar la política de permisos ni la integridad de confirmación.

- Listado e impresión: una sentencia SQL devuelve datos, total y validación de curso desde el mismo snapshot, incluso con una página fuera de rango. Se elimina la consulta separada de conteo y la preparación de una transacción de varias lecturas.
- Calendario: los períodos y feriados se proyectan junto con el año; las referencias dejan de realizar consultas por cada año. Los métodos de una sola lectura conservan el snapshot de esa sentencia y participan de una transacción existente cuando se invocan durante una escritura.
- Disponibilidad: la primera consolidación redujo siete lecturas a tres. La medición intermedia mejoró pero todavía excedió el objetivo; se implementó una proyección de una sola sentencia con calendario, aulas compatibles y ocupación. La confirmación sigue leyendo después de adquirir sus bloqueos y dentro de su transacción. El reloj institucional se consulta después del SQL; no se equipara ese instante con el snapshot de los datos ni se garantiza disponibilidad futura.
- La autorización continúa consultando rol/estado actuales en cada petición. No se añadió una caché de permisos, se alteró la exclusión de solapamientos ni se redujo la revalidación al confirmar.

### Referencia remota de lectura

Guion: `tools/qa/profile-remote-reads.mjs`, dos calentamientos y veinte respuestas completas por operación, una sesión Bedel de Supabase real, PostgreSQL remoto us-west-2. Incluye HTTP, transferencia y consumo del cuerpo, sin renderizado ni login. Son muestras descriptivas secuenciales; **no acreditan RNF-03/05 con 50 sesiones ni el rendimiento de altas/modificaciones remotas**.

| Operación | Antes, p95 ms | Primera consolidación, p95 ms | Resultado final |
|---|---:|---:|---|
| Listado diario, página 20 | 1708,8 | 489,7 | 672,5 ms |
| Listado por curso, página 20 | 2557,5 | 477,5 | 655,9 ms |
| Disponibilidad periódica | 2894,6 | 1958,2 | 876,6 ms |
| Referencias de calendario | 6163,4 | 1586,5 | 651,4 ms |

La referencia anterior usó la imagen `64206c9…` en 8082; la primera consolidación `41ff9e63…` en una instancia separada 8083, con migraciones deshabilitadas. La muestra final usó `cfec013d0549be712fb58648a15eb8a017f309abfa991945d0bbf71eb3f62218` en 8083. Consumen los datos ficticios existentes; no se crearon reservas ni se alteraron cuentas/calendarios remotos. Las 80 respuestas finales medidas fueron HTTP 200. Registros completos conservados en `docs/evidencias/cumplimiento-lecturas-{before,after,final}-2026-10-19.json`, con tamaños, estados HTTP, muestras y metadatos. No se descartan valores lentos ni se atribuye toda diferencia entre corridas a código: también varía la red remota.

### Protocolo íntegro de carga

**Aprobado:** 50 sesiones (2 Admin, 3 Bedel y 45 Docente), dos minutos de calentamiento y diez de medición, **5.952 solicitudes medidas, cero errores medidos y cero en todas las fases**. Pausa mínima de cinco segundos tras cada respuesta; sin solicitudes auxiliares durante la medición. Base descartable de 30 aulas, 1.300 reservas y 26.100 detalles, más la preparación controlada de 280 propuestas de alta y diez series propias. El auditor reprodujo ciclos, asignaciones, IDs, versiones, errores y percentiles desde las muestras finales.

| Operación | Solicitudes medidas | p95 ms | Objetivo ms |
|---|---:|---:|---:|
| Disponibilidad | 2957 | 56,5 | <1500 |
| Listado diario | 1350 | 14,4 | <1500 |
| Listado por curso | 1350 | 75,4 | <1500 |
| Alta periódica | 150 | 165,8 | <2000 |
| Modificación periódica | 145 | 252,1 | <2000 |

El ensayo usó PostgreSQL 17.6 y JWT/JWKS locales, con imagen `4d0457024c75dbe135407770b77f8e4190e7e800331dd8bd80178a678dde3d89`, fijada mediante `aulas-requisitos:20261019-final`. La imagen se reconstruyó antes del ensayo; las clases, recursos y dependencias del backend coinciden byte a byte con la imagen de las lecturas remotas, pero los assets frontend difieren. Se registran ambas versiones en [comparación de imágenes](../evidencias/cumplimiento-imagenes-2026-10-19.json). No sustituye la comprobación nominal con PostgreSQL Supabase remoto. No se restableció ni cargó destructivamente la instancia compartida para medir.

Evidencias: [resultado completo](../evidencias/cumplimiento-carga-2026-10-19.json), [auditoría](../evidencias/cumplimiento-carga-auditoria-2026-10-19.txt) y [trazas reproducibles](../evidencias/cumplimiento-carga-trazas-2026-10-19.tar.gz), SHA-256 `05fb9f5731fd263bffd9a7462945850301333b1a88a161521ff6e3fe1770e8ab`. El archivo conserva muestras, pausas, activaciones, asignaciones, manifiesto, auxiliares y preparación; no incluye tokens ni configuración privada. La primera invocación del auditor coincidió con la escritura pendiente del resultado y rechazó archivos incompletos; la aprobación corresponde a su ejecución posterior sobre todos los archivos finales.

Un intento anterior se interrumpió durante la preparación por un reinicio del canal de herramientas; se retiraron exclusivamente sus contenedores identificados y no se contó como resultado. La ejecución completa se inició nuevamente con imagen fijada y sin otras suites o compilaciones simultáneas.

Persisten como factores a estudiar en un ensayo remoto completo la distancia entre servidor Java y base us-west-2, el pool y la serialización deliberada de escrituras. La métrica remota de bloqueo `control_cuentas` incluyó esperas; no se relajaron esos bloqueos de seguridad sin un diseño y una validación específicos. Los índices existentes y los bajos tiempos SQL no justificaron añadir índices ni cambiar parámetros globales de Supabase en esta corrección.

Fuentes consultadas: [diagnóstico de consultas de Supabase](https://supabase.com/docs/guides/database/extensions/pg_stat_statements), [inspección de la base](https://supabase.com/docs/guides/observability/inspect), [conexiones PostgreSQL](https://supabase.com/docs/guides/database/connecting-to-postgres). Se revisó también el changelog oficial; las correcciones no requieren una actualización del SDK ni cambios de configuración del proveedor.

## Verificación y trazabilidad

Los totales y hashes de los reportes backend se conservan en [evidencia de backend](../evidencias/cumplimiento-backend-2026-10-19.json).

| Conjunto | Estado de esta ejecución |
|---|---|
| Unitarias frontend | 72/72 aprobadas. |
| Lint y TypeScript/Vite | Sin errores ni advertencias; build aprobado. |
| Navegador con red simulada | 130/130 en la integral final, incluidas demoras controladas de refresco, alta, revisión de impacto y recarga, con éxito y error. |
| Backend PostgreSQL | 211/211, 29 suites, cero errores/fallos/omitidas. Reportes XML completos de la repetición final (01:59–02:03 UTC del 20/10); la integral anterior interrumpida no se cuenta. |
| Paquete con Supabase real, solo lectura | 10/10 sobre imagen `cfec013d…`: rutas/assets, Auth Admin/Bedel/Docente/inhabilitado, indicadores, volumen, filtros, privacidad, impresión completa, teclado/reflow y PDF Firefox Linux. |
| Carga 50 sesiones | Aprobada y auditada: 5.952 solicitudes medidas, cero errores, todos los p95 dentro de objetivos; PostgreSQL y JWKS locales. |
| Revisión independiente | Requisitos y calidad revisados. T1/T2/T3, proyecciones de calendario/listados, snapshot de disponibilidad y cargas de referencias sin bloqueos pendientes después de corregir extremos parciales y carreras de calendario. Revisiones estáticas separadas de las pruebas ejecutadas. |

Los RF/CU-01 a 09, 11 a 13, 15 a 29 conservan su implementación y sus regresiones. RF/CU-10 y 14 cierran H1; RF/CU-16 y EX-01/02 cierran la asistencia de conflictos H2. RNF-01/02/04 mantienen sus controles; RNF-03 cierra la paginación pendiente y mejora las lecturas. La acreditación integral de RNF-03/05 en Supabase remoto se declara por separado y no se da por lograda a partir del ensayo local.

La aceptación manual del usuario de I04/I05/I06 no se sustituye por esta ejecución. Zoom nativo al 200 % e impresión Firefox en Windows requieren su comprobación específica; las pruebas Linux/viewport no se presentan como esa evidencia. Para cerrar RNF-03/05 hace falta repetir el protocolo nominal, incluidas altas y modificaciones, en una base QA Supabase identificada y con la topología/pool del entorno objetivo, sin restablecer la base compartida.

Se retiraron los contenedores temporales de carga y perfilado de esta tarea. Esta tarea no reemplazó la demo existente en 8082; al cierre se observó allí la imagen `32361688aed8f41c597d519a30a5ad2bb95304791a2464d0926cbdb5c1f8ca81`, distinta de la inicial, en este espacio compartido con trabajo concurrente. Los resultados de este informe corresponden a las imágenes identificadas en cada ensayo. No hubo despliegue público, push ni modificación de credenciales por esta tarea. La imagen corregida queda construida localmente como `aulas-requisitos:20261019-final`.

## Reproducción

Desde la raíz en WSL:

```sh
# Lecturas con credencial existente, sin cambiarla ni imprimirla:
# Requiere levantar previamente una instancia de revisión con la imagen elegida.
node tools/qa/profile-remote-reads.mjs --origin=http://127.0.0.1:8083 --demo-guide --samples=20 --out=artifacts/qa/requirements/remote-final.json --snapshot=IMAGEN_VERIFICADA
node tools/qa/run-readonly-package.mjs --origin=http://127.0.0.1:8083 --demo-guide

# Carga nominal: crea y retira exclusivamente sus contenedores aislados.
AULAS_LOAD_IMAGE=aulas-requisitos:20261019-final node tools/qa/load/run.mjs
python3 tools/qa/load/verify.py

# Suites aisladas:
cd backend && ./mvnw -q test
cd ../frontend && npm test -- --run && npm run lint && npm run build && npx playwright test
```

Las sesiones de lectura son temporales y se cierran con alcance local. El despliegue público y la aceptación manual no forman parte de estos comandos.
