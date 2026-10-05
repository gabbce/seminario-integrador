# Registro de QA final · ejecución 04/10/2026

Copia de la [plantilla](registro-qa-final.md) para esta ejecución. Guía: [casos F01–F12](qa-final-i-04-i-05-i-06.md) y [manifiesto](manifiesto-qa-final.md).

**Resumen:** la ejecución manual sobre el sistema vivo está **bloqueada por el entorno**. El proyecto Supabase compartido no existe en DNS y la PC del operador no tiene virtualización habilitada, así que Docker no arranca. Se ejecutó lo que no depende de esas dos cosas:

- todas las pruebas automatizadas del frontend;
- un análisis estático completo de la especificación contra el código, por área;
- sondeos de interfaz con la UI real y la API simulada.

Resultado: **1 hallazgo de severidad Alta (seguridad), 14 de severidad Media y 21 de severidad Baja**. Ninguna entrega se acepta en esta ejecución.

Fecha/hora institucional: 04/10/2026 21:46–22:30 (Córdoba). Operador: equipo QA. Commit: `b242e11` (rama `main`). Imagen: no construida (Docker no disponible). Origen/destino: no disponible (ver bloqueos). Navegadores: Chromium (Playwright 1.63) y Firefox 155.0 (Playwright), solo en las pruebas con red simulada. Escritorio 1366×768, móvil 390×844 y zoom nativo 200 %: no ejecutados.

## Bloqueos de entorno

| ID | Bloqueo | Evidencia | Qué lo destraba |
|---|---|---|---|
|BLQ-1|El proyecto Supabase `nrjykdzvzrcixapkdfsp` no resuelve DNS (NXDOMAIN, también con 8.8.8.8). Lo más probable es que esté pausado por inactividad (plan free; último commit 28/09). Por eso la instancia `seminario-integrador-rqft.onrender.com` acepta la conexión TLS pero no responde: 20 intentos en 15 min, todos sin respuesta.|`nslookup nrjykdzvzrcixapkdfsp.supabase.co 8.8.8.8` → Non-existent domain|Gabi restaura el proyecto desde el dashboard de Supabase. **Antes, ver QA-01.**|
|BLQ-2|Virtualización (AMD SVM) desactivada en la BIOS de la PC de QA → WSL2/Docker Desktop no arrancan.|`VirtualizationFirmwareEnabled=False`|BIOS ASUS: Advanced → CPU Configuration → SVM Mode → Enabled.|
|BLQ-3|No hay `backend/.env` ni `frontend/.env.local` en el checkout de QA.|`ls -a backend frontend`|Plan B sin credenciales: Supabase CLI local con los datasets I02–I05 cargados por los comandos explícitos (requiere BLQ-2).|

## Resultados por caso

| Caso | Estado | Rol/navegador | IDs/fechas/filtros | Esperado/observado | Evidencia/incidencia |
|---|---|---|---|---|---|
|F01 arranque/reinicio|Bloqueado|—|—|Compose no se puede construir (BLQ-2); el destino remoto no existe (BLQ-1). Estático: matriz rol×endpoint, perfil inactivo con 403 y rutas SPA iguales al router → OK.|QA-01, QA-13, QA-15, QA-24, QA-28|
|F02 escenarios/privacidad|Bloqueado (manual)|—|—|Estático: el backend aplica la proyección sin `teacherEmail`, `registrant`, `changes` ni actor para Docente en detalle, colección y `operaciones/{key}` → OK.|QA-07, QA-30|
|F03 agenda/listados|Bloqueado (manual) · **Fallido en sondeo de interfaz**|Bedel / Chromium (red simulada)|`/reservas?date=2027-08-23&status=active&size=20&page=9`; `/agenda?fecha=2027-13-45`|Página fuera de rango: muestra «104 resultados», «No hay reservas para estos filtros» y «Página 10 de 6». Fecha inválida: pantalla en blanco.|QA-03, QA-04, QA-05, QA-25, QA-26|
|F04 impresión|Bloqueado (manual) · Automatizado parcial|— / Chromium OK, Firefox no ejecutable en Windows|Red simulada: 121 filas|Chromium: imprime todas las filas, filtra y maneja el error → OK. El caso de Firefox falla por la ruta `/tmp` del test (T-01).|QA-27, T-01|
|F05 indicadores/historia|Bloqueado|—|—|El entorno exacto 5176 requiere Docker y Auth remoto. Estático: denominador, ponderación, franjas y semana típica coinciden con las tablas. `check-volume.py`: 23/08/2027 = 104 filas, 52 h-aula, 780 alumnos-hora, pico de 125 alumnos → OK.|QA-10, QA-11, QA-31…QA-34|
|F06 alta/cabecera/concurrencia|Bloqueado (manual) · **Fallido en sondeo de interfaz**|Bedel / Chromium (red simulada)|Esporádica con respuesta perdida tras guardar|Tras recargar, el asistente vuelve vacío, sin `sessionStorage` ni botón de recuperación, aunque el servidor guardó la reserva → riesgo de duplicado.|QA-02, QA-16…QA-20|
|F07 aulas/reprogramación|Bloqueado (manual)|—|—|Estático: origen inmutable, cambio por patrón con reprogramadas, rechazos totales → OK.|QA-06, QA-07, QA-21|
|F08 cancelación/continuidad|Bloqueado (manual)|—|—|Estático: motivo/actor/cese/estado derivado y liberación correctos; el cese no se ve en la UI.|QA-07, QA-22, QA-23|
|F09 calendario|Bloqueado (manual)|—|—|Estático: revisión de solo lectura, atomicidad, sin regenerar excluidas/canceladas/orígenes → OK.|QA-06, QA-08, QA-09, QA-11, QA-35, QA-36|
|F10 interacción/fallos/evidencia|Parcial|Chromium/Firefox (red simulada)|`npx playwright test` (110)|106/110 con 4 workers. Re-ejecución en serie: 2 fallos reproducibles del test, no de la app (T-01, T-02). Unitarias 66/66, `build` OK, `lint` OK. **Backend 174: no ejecutado** (Testcontainers requiere Docker).|T-01…T-03|
|F11 reset aislado|Bloqueado|—|—|Requiere Docker. Además el script no corre en Windows sin `PYTHONUTF8=1`.|QA-14, QA-29|
|F12 presentación|Bloqueado|—|—|Depende de F01. La documentación tiene inconsistencias de trazabilidad.|QA-01, QA-28, D-01, D-02|

## Hallazgos

Verificación: **Dinámico** = reproducido en ejecución (UI real + API simulada). **Código** = verificado leyendo las líneas citadas. **Estático** = análisis spec-vs-código sin ejecutar; hay que confirmarlo en vivo.

### Alta

| ID | Hallazgo | Ubicación | Verificación |
|---|---|---|---|
|QA-01|El repo `gabbce/seminario-integrador` es **público** y publica la URL de Render y la contraseña común de las cuentas demo, incluida **Admin**. Contradice el manifiesto (l. 11 y 81), F01 («contraseñas por canal privado») y la spec 10:44. Un tercero puede crear otros Admin, cambiar contraseñas, modificar calendarios/aulas/reservas e invalidar los esperados del QA. Hay que **rotar las contraseñas en Supabase antes de restaurar el proyecto**: la contraseña queda en el historial de git (`b242e11`).|`docs/credenciales-demo.md`; `README.md:28`; `frontend/src/components/DemoControls.tsx:71` (no se usa)|Código + `gh repo view` (PUBLIC)|

### Media

| ID | Hallazgo | Ubicación | Verificación |
|---|---|---|---|
|QA-02|Alta esporádica: el intento incierto solo vive en memoria (`useRef`). Si se recarga tras «No pudimos confirmar el resultado», se pierden el UUID y la recuperación; al volver a crearla queda una reserva duplicada. Cabecera, cancelación, aulas y reprogramación sí lo guardan en `sessionStorage`. Un 401 durante el reintento también descarta el UUID.|`Wizard.tsx:214,230-238,305-381`|**Dinámico (P5)**|
|QA-03|Listado: una página fuera de rango se muestra como «sin resultados» con total > 0. Camino natural: cancelar la única fila de la última página y volver.|`PersistedListing.tsx:22,46,172,222-225,247-252`|**Dinámico (P2)**|
|QA-04|Agenda: con `?fecha=2027-13-45` la pantalla queda en blanco (`RangeError`, no hay ErrorBoundary). Con `?fecha=2027-02-30` el título dice «2 de marzo de 2027» mientras la API responde 400.|`OperationalApp.tsx:87-89`; `Agenda.tsx:107-108`; `domain.ts:250-256`|**Dinámico (P1, P4)**|
|QA-05|La agenda oculta en silencio las clases de aulas creadas después de cargar las referencias (otra sesión). Una franja ocupada parece libre hasta recargar.|`OperationalApp.tsx:111-134`; `Agenda.tsx:70-88`; `WeekAgenda.tsx:44`|Estático|
|QA-06|No se puede cambiar el aula de un patrón sin clases futuras, aunque el impacto de calendario genere clases para ese patrón y sugiera cambiarla. Si el aula del patrón pasó a Mantenimiento/Baja, la ampliación queda bloqueada sin salida (con Baja, para siempre). Contradice spec 07 «Actualizar series», CA-R25, CA-R37 y DA-57.|`RoomMutationService.java:55-58,96`; `CalendarImpactService.java:71-76,85-86`; `CalendarEditor.tsx:442-444`|Código|
|QA-07|El detalle no muestra el cese de continuidad, el patrón semanal ni las fechas excluidas, aunque la API los devuelve. En la UI, un cese no se distingue de un fin natural, así que F07/F08 solo se pueden verificar por JSON.|`Detail.tsx:352-405`; `PersistedCancellation.tsx:156-165`|Estático|
|QA-08|Calendario: tras un conflicto de versión (otra pestaña confirmó), «Recargar calendario» restaura la propuesta con la versión vieja y cada «Revisar impacto» da 409 otra vez. La única salida es descartar la propuesta.|`PersistedCalendar.tsx:97-113,137-141,214,238-242`; `CalendarEditor.tsx:38-40`|Estático|
|QA-09|Dependencias de calendario (feriado o recorte): se informa solo la primera reserva afectada, sin orden y sin fecha. La spec 06:47 pide mostrar las reservas.|`ReservationGuards.java:34-37,46-51`|Estático|
|QA-10|Indicadores: un aula sin historial en el rango (por ejemplo, creada después) marca cobertura desconocida para **todo** el conjunto, y el porcentaje de «Todas las aulas» (aun filtrando otro tipo) pasa a «—». Crear un aula hoy anula los porcentajes históricos. La spec 09 pide contar solo los módulos con cobertura conocida; hay que confirmar la intención con Gabi.|`IndicatorQueries.java:95-96,111`|Código|
|QA-11|Se puede agregar como feriado la fecha de hoy aunque sus clases ya terminaron. La clase queda CONFIRMADA en un día no lectivo: el numerador la cuenta y el denominador la excluye (ejemplo: semana 56/1280 h = 4,4 % en vez de 3,5 %). Contradice DA-69.|`CalendarManagement.java:84-86`; `ReservationGuards.java:34-37`; `IndicatorQueries.java:145,153`|Código|
|QA-12|Cuentas: una operación de identidad incierta y abandonada (descartar/recargar) deja la cuenta bloqueada. No se puede editar, deshabilitar ni cambiar correo o contraseña (409), y no hay forma de anularla desde la app.|`IdentityManagement.java:75,97-98,110-115`; `AccountManagement.java:53-54`; `Users.tsx:23,108,445-451`|Estático|
|QA-13|`supabase/config.toml` habilita el registro público (`enable_signup = true`), contra CA-U01. Un `supabase config push` lo abriría en el proyecto remoto.|`supabase/config.toml:175,220`|Código|
|QA-14|Los scripts de QA no corren en Windows: `reset-rehearsal.py` y `check-volume.py` abren archivos sin `encoding` (cp1252 → `UnicodeDecodeError`), y las guías usan `python3`, `export` y `./mvnw`. Alternativa: `PYTHONUTF8=1 python …`.|`tools/qa/reset-rehearsal.py:9,26`; `tools/qa/check-volume.py`|**Dinámico (check-volume)**|
|QA-15|El wrapper de Maven descarga de `dlcdn.apache.org`, que solo aloja las versiones vigentes. Cuando salga otra 3.9.x, la build Docker y `./mvnw` van a fallar (404).|`backend/.mvn/wrapper/maven-wrapper.properties:3`; `Dockerfile:24-36`|Estático (depende del tiempo)|

### Baja

| ID | Hallazgo | Ubicación |
|---|---|---|
|QA-16|Un rechazo de negocio en el paso 2 (409 «ya comenzó») se muestra como fallo técnico genérico.|`Wizard.tsx:750-766,901-907`|
|QA-17|Ante un conflicto o una validación se informa solo la primera fecha. Además, un mismo texto («lunes a viernes del mismo año») cubre sábado, fecha duplicada y otro año.|`SporadicConfirmation.java:56-61`; `SporadicPreparation.java:42-47,60-64`|
|QA-18|El historial de cabecera usa formato técnico (`{fans} → [air, fans]`).|`HeaderMutationService.java:79`; `Detail.tsx:332-334`|
|QA-19|Si la serie ya empezó, «Modificar datos» desaparece sin explicar el procedimiento (CA-R20). Además, la cabecera trata un 403 como resultado incierto.|`Detail.tsx:226-244`; `PersistedHeader.tsx:77-85`|
|QA-20|El asistente preselecciona el primer curso y el primer docente: hay riesgo de reservar sobre un curso de referencia durante el QA.|`Wizard.tsx:90-96,498-500`|
|QA-21|Las etiquetas de «Cambiar aula» salen en formato técnico («Viernes 21:00:00», fecha ISO).|`RoomMutationService.java:61-62`|
|QA-22|Después de un 409 por clase iniciada, la selección de cancelación queda trabada.|`PersistedCancellation.tsx:101-107,213-214`|
|QA-23|El instante de auditoría de cancelar/confirmar es el inicio de la transacción, no el instante real.|`CancellationService.java:103`; `PeriodicConfirmation.java:88`; `SporadicConfirmation.java:70`|
|QA-24|Tras el login se pierde la ruta profunda (`/reservas/24` → `/agenda`). **Dinámico (P3).**|`Login.tsx:31`|
|QA-25|Desde el listado, el detalle no marca qué clase se consultó. El error del detalle no ofrece volver con los filtros.|`PersistedListing.tsx:203`; `PersistedDetail.tsx:62-75`|
|QA-26|Se usa la zona `Buenos_Aires` en lugar de `Cordoba` (DA-70). Hoy no hay diferencia observable.|`ConsultationQueries.java:23-24`; `IndicatorQueries.java:13`|
|QA-27|La impresión queda montada y Ctrl+P reimprime datos viejos sin indicar cuándo se obtuvieron (sospecha).|`PrintDaily.tsx:42,65,81-133`|
|QA-28|El HEALTHCHECK fija el puerto 8080 aunque `PORT` es configurable. Las barreras del reset son débiles: `.env.example` ya trae `AULAS_ENVIRONMENT=demo` y la auditoría se atribuye al Admin de menor id.|`tools/docker/Healthcheck.java:8`; `DemoResetService.java:140,162`|
|QA-29|La evidencia del ensayo de reset es débil: `previewReadOnly` solo compara la tabla `reserva`, con `assert`.|`tools/qa/reset-rehearsal.py:53,63`|
|QA-30|`GET /api/reservas` sigue devolviendo todo el histórico a cualquier rol, contra el plan I-05.|`ReservationsController.java:15`|
|QA-31|La semana típica no muestra qué fechas incluye (DA-43).|`MetricWeek.tsx`|
|QA-32|En un día no elegible se mezclan «Sin datos aplicables», «Sin horas habilitadas», «1 fecha aportante» y «Pico 0».|`PersistedIndicators.tsx:182-279`|
|QA-33|Una ocupación pequeña pero no nula se muestra como «0 %». Si el rango toca un año no registrado, se anula el porcentaje y se culpa al historial de aulas.|`PersistedIndicators.tsx:14-15,187-192`|
|QA-34|Un aula inexistente en el filtro de indicadores devuelve 200 en vez de 400. Vaciar una fecha vuelve a hoy en silencio.|`IndicatorQueries.java:133-143`; `PersistedIndicators.tsx:23,35,41`|
|QA-35|Las alternativas de impacto se calculan solo para esa fecha, no para todas las futuras del patrón. El resumen no identifica las series afectadas.|`CalendarImpactService.java:87-89`; `CalendarEditor.tsx:426-431`|
|QA-36|El impacto de calendario escala con N+1 consultas, y el sello incluye la versión de todas las reservas del año: cualquier operación de un Bedel invalida la revisión.|`CalendarImpactService.java:58-119`|

Pendientes de decisión (no se cuentan como defecto):
- Esporádicas fuera de ambos cuatrimestres (por ejemplo 04/01/2027): se aceptan.
- Reprogramar sobre una fecha excluida: se permite.
- Un patrón con todas sus futuras canceladas se regenera si otro patrón de la serie sigue vigente.

### Pruebas y documentación

| ID | Hallazgo |
|---|---|
|T-01|`printing.spec.ts` (Firefox) escribe el PDF en `/tmp/...`, una ruta Linux. En Windows falla siempre.|
|T-02|`sporadic.spec.ts` «lost-before» es intermitente: la página queda en el login (fixture de Auth). Falló en 1440 y en 390 en corridas distintas.|
|T-03|Las specs guardan capturas en `/tmp`; en Windows crean `D:\tmp` con 115 archivos fuera del repo.|
|D-01|El manifiesto indica la rama `feat/integracion` y una «imagen verificada» con commits posteriores solo documentales. En `main` hay commits posteriores que cambian el Dockerfile, el wrapper de Maven y `package.json`/lockfile, así que una imagen reconstruida no es la verificada.|
|D-02|`sha256sum volumen-i05-v1.json` no coincide en un checkout de Windows con `core.autocrlf=true` (CRLF). El blob de git sí coincide con `55dcc85e…`.|

## Evidencia automatizada de esta ejecución

- Frontend unitarias: **66/66**. `npm run build`: OK. `npm run lint` (oxlint): 0 errores.
- Playwright con red simulada: **106/110** (4 workers). En serie: impresión Firefox falla (T-01), «lost-before» intermitente (T-02); el resto pasa.
- `PYTHONUTF8=1 python tools/qa/check-volume.py`: 306 reservas, 4613 clases (4612 vigentes, 1 cancelada); 23/08/2027 = 104 filas, 52 h-aula, 780 alumnos-hora, pico de 125.
- Sondeos de interfaz P1–P5 (UI real + API simulada): las capturas quedan fuera del repo, en el scratchpad de la sesión.
- **No ejecutado:** backend `./mvnw test` (174), paquete contra datos compartidos, entorno exacto 5176, operaciones aisladas, ensayo de reset y carga.

## Decisión por entrega

| Entrega | Decisión explícita del usuario | Fecha/evidencia | Incidencias pendientes |
|---|---|---|---|
|I04|Pendiente (no evaluable: BLQ-1/BLQ-2)|04/10/2026, este registro|QA-02, QA-06, QA-07, QA-08, QA-09, QA-11, QA-16…QA-23|
|I05|Pendiente (no evaluable: BLQ-1/BLQ-2)|04/10/2026, este registro|QA-03, QA-04, QA-05, QA-10, QA-11, QA-24…QA-27, QA-30…QA-34|
|I06|Pendiente (no evaluable: BLQ-1/BLQ-2)|04/10/2026, este registro|QA-01, QA-13, QA-14, QA-15, QA-28, QA-29, D-01|

Restablecimiento remoto: no solicitado ni ejecutado. No se registran contraseñas ni tokens en este archivo.

## Próximos pasos

1. Gabi rota las contraseñas demo (QA-01), restaura el proyecto Supabase y decide si retira `docs/credenciales-demo.md`.
2. QA reactiva SVM. Después: `./mvnw test`, construir la imagen y ejecutar F01–F12 en vivo. Si Supabase sigue sin estar disponible, se usa la réplica local con Supabase CLI y los datasets I02–I05 cargados por los comandos explícitos, registrando que los IDs y las reservas QA ajenas (14–23, 2029) difieren del entorno compartido.
3. Confirmar en vivo los hallazgos «Estático» y repetir los casos afectados después de cada corrección.
