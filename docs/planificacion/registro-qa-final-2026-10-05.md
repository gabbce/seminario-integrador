# Registro de QA final · ejecución 05/10/2026

Copia de la [plantilla](registro-qa-final.md) para esta ejecución. Guía: [casos F01–F12](qa-final-i-04-i-05-i-06.md) y [manifiesto](manifiesto-qa-final.md). Retoma la [ejecución del 04/10](registro-qa-final-2026-10-04.md), que había quedado bloqueada por el entorno.

**Resumen:** los bloqueos BLQ-1 a BLQ-3 están resueltos (Supabase restaurado, virtualización activa, configuración privada local). Se ejecutaron F01–F10 y F12 contra la **demo compartida** (Compose en 8082 + Supabase remoto) y el entorno exacto aislado (5176), con recorridos sobre la UI real en Chromium y Firefox, y verificación de cada cifra y delta por API. **F11 no se ejecutó**: el ensayo de reset no pudo correrse desde la sesión de QA y queda para el operador. Se confirmaron en vivo 8 hallazgos del 04/10 y aparecieron 4 nuevos. **La aceptación de I-04, I-05 e I-06 sigue pendiente del usuario.**

Fecha/hora institucional: 05/10/2026 16:40–18:40 (Córdoba). Operador: equipo QA. Commit: `b242e11` (rama `main`). Imagen: `sha256:1c6fe1eb362cfd9213297e01004179bde87b408c9f2f767ca62688dbb28b687c`, construida desde una copia LF del mismo commit (ver QA-37); no es la «imagen verificada» del manifiesto (D-01). Origen: `http://127.0.0.1:8082`, Supabase `nrjykdzvzrcixapkdfsp` (us-west-2) vía Session pooler. Navegadores: Chromium 153.0.8010.12 y Firefox 155.0 (Playwright). Escritorio 1366×768, Docente 390×844 y reflow 683×384: ejecutados. **Zoom nativo 200 %: no ejecutado.**

## Resultados por caso

| Caso | Estado | Rol/navegador | IDs/fechas/filtros | Esperado/observado | Evidencia/incidencia |
|---|---|---|---|---|---|
|F01 arranque/reinicio|**Fallido** en Windows (construcción) · resto aprobado|Operador; Admin/Bedel/Docente/inhabilitado · Chromium y Firefox|`/api/health`; `/reservas/24`; reservas 23–31 y 339–344|Desde un checkout normal en Windows la imagen **no se construye** (QA-37). Con copia LF: salud `UP`, mismo origen para React y API, rutas profundas, permisos por rol, inhabilitado rechazado. `stop`/`start` → 10 reservas de control y listado **idénticos**. Diagnóstico de puerto ocupado no probado (habría recreado el contenedor).|QA-37, QA-24, `bundle-real` 11/12|
|F02 escenarios/privacidad|Aprobado|Bedel y Docente · Chromium|Reservas 24–31 (I-04)|Dataset I-04 íntegro: receso 24, parcial 25, total 26, aulas 27, origen 28, patrón 29, cese 30, anual 31; 69 clases y 18 canceladas. Docente: JSON de `/api/reservas/{id}` sin `teacherEmail`, `registrant`, `changes` ni actor de cancelación.|`demo-i04-real`, `consultations-real`; QA-30|
|F03 agenda/listados|**Parcial**: esperados aprobados · 2 subpruebas fallidas (QA-03, QA-04)|Los tres roles · Chromium|23/08/2027; 24/08; 25/08; curso 30|Aprobado: 23/08 = 104 vigentes; tamaños 20/50/100 → 6/3/2 páginas; 104 identidades sin repetir ni omitir. 24/08 = 1 vigente, 1 cancelada, 2 todas. 25/08 = 0. Curso 30 `006-A-2027` = 664. La agenda del 24/08 excluye la cancelada. Fallido: una página fuera de rango muestra «sin resultados» con total > 0 (QA-03) y una fecha inválida deja la agenda en blanco (QA-04). Son defectos previos a este PR: el registro los consigna, no los introduce.|QA-03 y QA-04 confirmados en vivo|
|F04 impresión|Aprobado (Chromium) · Firefox parcial|Bedel · Chromium y Firefox|23/08/2027|Chromium: PDF de **9 páginas y 104 filas**, cotejado con `verify-volume-print.py` contra `i05-datos.json`. Filtros: General 65, Multimedios 39, aula 104 13; 24/08 canceladas 1; 25/08 0. Firefox: las 104 filas impresas son idénticas a las de Chromium (id y texto), pero **no se genera el PDF** en Windows.|T-04|
|F05 indicadores/historia|Aprobado|Admin/Bedel; Docente · Chromium y Firefox|Entorno exacto 5176 (2021); compartido 23/08 y 23–27/08/2027|Suite exacta **4/4** con JWT real (las 11 filas de la tabla, por API y UI) y revisión visual de capturas. Compartido: 23/08 = 52/320 h = 16,25 % (16,3 visible), 104 clases, 780 alumnos-hora, pico de 125; semana = 108 clases, 56/1600 h = 3,5 %. Docente: sin menú Indicadores, API **403**; listado exacto del 03/03/2021 = 2 filas.|`indicators-exact`, `bundle-real`, `indicators-real`, `volume-real`|
|F06 alta/cabecera/concurrencia|Aprobado (con desvío registrado D-03)|Bedel; 2.ª sesión Admin; Docente 390 · Chromium|Curso 92 `051-QAF-2027`; reserva **339**; concurrencia **340**|Casos inválidos sin avanzar: fecha pasada, sábado, feriado configurado, fin después de 23 e inicio antes de 07. Cambiar alumnos tras buscar invalida la selección. Esporádica 27 y 29/07 08–09 en aula 103 → una reserva con 2 clases; **+1 h, +1 clase y +20 alumnos-hora por fecha**. Horario contiguo 09–10 libre; superposición 08:30 ocupa. Concurrencia: primera 200, segunda **409** sin guardar nada. Cabecera: 9999 → 409; **25 → 409 por capacidad** (aula 103 = 24 personas); se editó **20→24** y Laura Gómez→Ana Ruiz, con historial «alumnos 20 → 24»; +4 alumnos-hora por fecha y horas sin cambio. Versión vieja de la 2.ª sesión → 409. La reserva 30 (iniciada) no ofrece «Modificar datos». Docente sin datos privados.|D-03, QA-18, QA-20|
|F07 aulas/reprogramación|**Parcial**: todo aprobado salvo el mensaje fuera de período (QA-38)|Bedel; Docente 390 · Chromium|Reservas **339** y **342** (periódica)|Fallido: reprogramar fuera de los períodos se rechaza, pero no orienta a cancelar la original y crear una esporádica, como pide `qa-manual-i-04.md:39` (QA-38). Aprobado: cambio de aula: se admiten varias clases marcadas; solo 27/07 → 105 y 29/07 conserva 103; traslado de 1 h / 24 alumnos-hora con total igual. Reprogramación 27/07 → 28/07 09:00–10:30 → 30/07: **el origen 27/07 se conserva**, siguen 2 clases (2,5 h-aula, 60 alumnos-hora). Deltas: 27/07 −1 h/−24; 28/07 neto 0; 30/07 +1,5 h/+36. Rechazos 409: fecha ya vigente de la misma reserva y aula ocupada (103 por la 340). Periódica viernes 21–22: **17 clases exactas** (12/03…02/07), +17 h y +340 alumnos-hora; 12/03 → 15/03 conserva origen y patrón; fuera de período → 409; cambio de aula por **patrón completo** (incluida la clase movida) a 105.|QA-21, QA-38|
|F08 cancelación/continuidad|Aprobado|Bedel; Docente 390 · Chromium|Reservas **339**, **343** (reocupación), **342**, 2 (solo lectura)|Cancelar la clase movida (30/07, motivo «QA final: suspensión») → −1,5 h/−36; queda 29/07 con 1 h/24. Franja liberada (105 disponible) → **reocupada con la 343**. Restante cancelada → cabecera `CANCELADA`, motivos conservados y sin acciones ni reactivación. Periódica 342: todas las futuras canceladas → `continuityCancelledAt` (cese explícito); indicadores −17 h/−340. Canceladas fuera de la agenda y presentes en el filtro de canceladas. Clases pasadas de una serie en curso (reserva 2) aparecen **deshabilitadas**. Docente: motivo sin actor.|QA-07 confirmado|
|F09 calendario|Aprobado|Admin; Bedel (interferencia); Docente 390 · Chromium|Calendario 2029 id 4 (v2 → v6); reserva 23; curso 93; interferencia **344**|Estado leído antes de actuar. Ampliar a 26/03 → revisión con 1 clase, sin escribir. Interferencia 344 → confirmación **409** («Hay interferencias»); la nueva revisión la muestra sin reasignar. Cancelada la 344 → confirmación atómica: +1 h/+20 en aula 103, **denominador igual**. Feriado 09/04 fuera del período → 0 clases; ampliar a 09/04 → solo 02/04; quitar el feriado → 09/04 con apertura **0 → 16 h** y 6,25 %. Feriado sobre clase vigente y recorte → 409 sin cancelar. Bedel y Docente sin acceso.|QA-08 no probado|
|F10 interacción/fallos/evidencia|Aprobado parcial|Todos · Chromium y Firefox|6 pantallas a 683×384; 4 a 390×844|Sin scroll horizontal en ambos navegadores; foco visible con Tab. Backend **174/174**. El I-01 «backend caído» no aplica igual en el paquete (el mismo contenedor sirve la UI); al reiniciar, la sesión se conservó. **Zoom nativo 200 % no ejecutado.** Frontend: unitarias **66/66**, simuladas **109/110** (solo falla el PDF de Firefox), `build`, `lint` y `tsc` OK.|T-01, T-04|
|F11 reset aislado|**No ejecutado**|—|—|La imagen está construida. El ensayo `reset-rehearsal.py` no pudo lanzarse desde la sesión de QA. Ningún reset remoto.|Pendiente del operador|
|F12 presentación|Aprobado (recorrido)|Bedel y Docente · Chromium|10 capturas `f12-*`|Ingreso → agenda 14/07 → reservas 24/28/29 → listado 23/08 → indicadores día/semana → operación 339 → impacto 2029 (reserva 23); Docente en paralelo.|Aceptación pendiente|

## Datos creados por esta ejecución

Salidas del QA. No forman parte de ningún dataset ni del reset.

| ID | Qué | Estado final |
|---|---|---|
|Curso 92|`QA final` · `051-QAF-2027`|—|
|Reserva 339|Esporádica QA final: 27/07 (→ 28/07 → 30/07, origen 27/07, aula 105) y 29/07 08–09 aula 103; 24 alumnos, Ana Ruiz|`CANCELADA` (motivos «QA final: suspensión» y «… (resto)»)|
|Reserva 340|Concurrencia: 26/07/2027 10–11 aula 103|`CANCELADA` en la limpieza|
|Reserva 342|Periódica QA final viernes 21–22, 1.er cuatrimestre 2027; 12/03 → 15/03; patrón en aula 105|`CANCELADA`, cese explícito|
|Reserva 343|Reocupación de la franja liberada: 30/07/2027 09:00–10:30 aula 105|`CANCELADA` en la limpieza|
|Curso 93|`QA final` · `051-QAF-2029`|—|
|Reserva 344|Interferencia F09: 26/03/2029 18–19 aula 103|`CANCELADA`|
|Calendario 2029 (id 4)|1.er período 05/03–**09/04**/2029, sin feriados|Habilitado|
|Reserva 23|Clases nuevas: 26/03, 02/04 y 09/04/2029, aula 103|6 clases vigentes|

**Actividad ajena observada:** durante la ejecución apareció la reserva **341** (Álgebra `005-A-2026`, 16/10/2026 14–16, aula 301, 80 alumnos), registrada con la cuenta Bedel. No fue creada por esta ejecución: alguien más estaba operando la demo compartida. No se modificó.

## Hallazgos

### Confirmados en vivo (antes solo por análisis estático o sondeo simulado)

| ID | Resultado en vivo |
|---|---|
|QA-03|`/reservas?date=2027-08-23&status=active&size=20&page=9` → «104 resultados», «No hay reservas para estos filtros» y «Página 10 de 6».|
|QA-04|`/agenda?fecha=2027-13-45` → pantalla en blanco (`Invalid time value`). `?fecha=2027-02-30` → «2 de marzo de 2027».|
|QA-07|Los detalles de las reservas 342, 30 y 29 no muestran el cese, el patrón semanal ni las exclusiones; los datos están solo en el JSON (`continuityCancelledAt`, `patterns`).|
|QA-18|El historial de cabecera muestra «tipo General → General; … recursos {} → []».|
|QA-20|El asistente abre con «Álgebra · 005-A-2027» y «Laura Gómez» preseleccionados.|
|QA-21|El cambio de aula de una periódica se ofrece como «Viernes 21:00:00 · patrón completo».|
|QA-24|Abrir `/reservas/24` sin sesión e ingresar → termina en `/agenda`.|
|QA-30|`GET /api/reservas` como Docente devuelve las 337 reservas (785 KB, ~4 s), sin campos privados.|

No reproducido: **QA-09** (con una sola reserva afectada, el mensaje ya incluye reserva y fecha; falta el caso con varias). No probados: **QA-08**, porque F09 probó la recuperación después de una interferencia de ocupación (la nueva revisión respondió 200), y QA-08 trata otro caso: una versión obsoleta del calendario después de que otra pestaña confirmó. **QA-05** y **QA-12** tampoco se probaron, para no alterar los esperados compartidos: QA-05 requiere crear un aula, que según QA-10 anula los % históricos, y QA-12 requiere provocar fallos del proveedor de identidad.

### Nuevos

| ID | Severidad | Hallazgo | Ubicación |
|---|---|---|---|
|QA-37|Media|La imagen no se construye desde un checkout normal en Windows: con `core.autocrlf=true` (el valor por defecto de Git for Windows) y sin `.gitattributes`, `maven-wrapper.properties` baja con CRLF, el `\r` queda pegado a la URL y `curl` falla («URL using bad/illegal format»). Misma causa que D-02.|`Dockerfile:24-36`; `backend/.mvn/wrapper/maven-wrapper.properties`|
|QA-38|Baja|Reprogramar una periódica fuera de sus períodos se rechaza con «Las fechas deben quedar dentro de los períodos asignados; el patrón semanal no cambia», sin orientar a cancelar la original y crear una esporádica, como pide la guía.|Reprogramación|
|D-03|Documentación|El manifiesto (F06 §1) indica elegir el aula 103 «si sigue libre» y después editar de 20 a 25 alumnos, pero la 103 tiene capacidad 24: la app rechaza el 25 (correcto). Esta ejecución usó 20→24 y recalculó los esperados (+8 alumnos-hora; F07 = 60 alumnos-hora en vez de 62,5; cancelación −36 en vez de −37,5).|`manifiesto-qa-final.md` §Operaciones nuevas|
|T-04|Pruebas|En Windows, Firefox no guarda el PDF de impresión con las preferencias de `playwright.package.config.ts` ni con `volume-real` (falla `bundle-real` en Firefox, 11/12, y `volume-real` «PDF completo Firefox»). Las filas impresas sí se verifican.|`frontend/playwright.package.config.ts`; `frontend/e2e/volume-real.spec.ts`|

## Evidencia automatizada de esta ejecución

- Backend `./mvnw test`: **174/174** (26 clases), con Testcontainers.
- Frontend: `npm test -- --run` **66/66**; `npx playwright test` (red simulada) **109/110**; `npm run lint`, `npm run build` y `tsc --noEmit`: OK.
- `playwright.exact.config.ts` contra 5176: **4/4** (Chromium y Firefox).
- `playwright.package.config.ts` contra 8082: **11/12** (solo falla el PDF de Firefox, T-04). `verify-volume-print.py` sobre el PDF de Chromium: 9 páginas, 104 filas por contenido y 104 identidades.
- `playwright.real.config.ts` (solo lectura: `demo-i04-real`, `consultations-real`, `volume-real`, `indicators-real`) vía proxy a 8082: **6/7** (falla el PDF de Firefox, T-04).
- Recorridos de QA final sobre la UI real (F01–F10, F12): 135 verificaciones registradas en `artifacts/qa/final-2026-10-05/log.txt`, con 60 capturas en la misma carpeta (ignorada por Git). Las 18 marcadas como fallidas se revisaron una por una. Tres son hallazgos reales (QA-24, QA-03, QA-04) y una es el desvío D-03. Las otras 14 eran errores de los scripts o chequeos que leyeron la pantalla mientras todavía cargaba, contaron casillas deshabilitadas o buscaron un texto distinto; se repitieron con la espera o el patrón correctos y pasaron.
- **No ejecutado:** F11 (`reset-rehearsal.py`, `DemoResetTests` fuera de la suite completa), zoom nativo 200 %, medición de carga.

## Arreglos aplicados en esta ejecución

Cambios de infraestructura y pruebas, sin tocar código de la aplicación:

| Hallazgo | Cambio | Verificación |
|---|---|---|
|QA-37, D-02|`.gitattributes` fuerza LF en `mvnw`, `*.sh`, `Dockerfile`, `*.properties`, `*.sql` y `*.json`.|`docker compose build` desde el checkout normal de Windows: OK (`sha256:26e47375…`). `sha256sum volumen-i05-v1.json` = `55dcc85e…`, igual que el manifiesto.|
|QA-14|`reset-rehearsal.py` y `check-volume.py` leen y escriben en UTF-8 explícito.|`check-volume.py` corre sin `PYTHONUTF8` (306 reservas; 23/08 = 104 filas, 52 h, 780 alumnos-hora). `py_compile` OK.|
|T-03|Las specs guardan capturas y PDFs en `artifacts/qa/screens/` (ignorada por Git) en vez de `/tmp`.|Suite simulada **109/110** (4 workers); ya no se escribe en `D:\tmp`. `lint`, `build` y `tsc --noEmit` OK.|
|T-01, T-04|Sin cambio. Se probó corregir la preferencia de impresora de Firefox, no resolvió el problema y se revirtió.|Persiste: en Windows, Firefox no imprime a archivo en modo silencioso (`printing.spec` Firefox, `bundle-real` Firefox, `volume-real` PDF). Las filas impresas sí se verifican.|

En la suite simulada, T-02 («lost-before») pasó en esta corrida.

## Cambios pedidos en la revisión del 05/10 (posteriores a esta ejecución)

Después de la ejecución se incorporaron seis pedidos de la revisión. Cambian la interfaz y el backend, así que **hay que repetir F03 (agenda) y las regresiones de Aulas y Cuentas (I-02)** sobre una imagen reconstruida.

| Pedido | Cambio | Verificación |
|---|---|---|
|Separar los paneles de filtros de las tablas|Aulas y Cuentas tienen un panel «Filtros» propio (tono distinto y «Limpiar filtros») y un panel de resultados con total y orden.|Capturas a 1366 y 390 px, sin desborde horizontal.|
|Filtros de aulas por todos los datos relevantes|Se agregan edificio, piso, capacidad máxima y varios recursos a la vez. La búsqueda de texto cubre identificador y edificio. Backend: `GET /api/aulas` acepta `resources`, `maxCapacity`, `location` y `floor`. El filtro «PC mínimas» se retiró después (ver correcciones).|`RoomsTests.filtersCoverEveryRoomAttribute`; recorrido UI 7/7 sobre datos reales.|
|Agenda por día sin desplazamiento lateral|La vista Día es una línea de tiempo: una fila por aula y las horas 07–23 a lo ancho. Las clases cortas muestran solo la materia; el resumen completo queda en el tooltip y en el detalle. Revertido después (ver correcciones).|0 px de desborde a 1366 y 390 px; `consultations.spec` sin cambios.|
|«Crear docentes» da error y no lo explica|Causa: un rechazo de Supabase (contraseña de menos de 6 caracteres) dejaba trabado ese correo («preparación incompatible») y se informaba de forma genérica. Ahora se libera la preparación rechazada, el mensaje dice la regla incumplida y el formulario anuncia y valida el mínimo.|`AccountManagementTests.rejectedPasswordDoesNotBlockANewAttemptForTheSameEmail`, `SupabaseRejectionTests` (4); recorrido UI.|
|Errores con la razón real|Mensajes concretos de Supabase (contraseña, correo existente o inválido) y de configuración faltante; motivo incluido en los 503 de identidad; el asistente muestra el motivo en el paso 2 y separa año, fin de semana, repetida y horario con la fecha concreta (QA-16, QA-17); el editor de calendario conserva el mensaje del servidor.|Recorrido UI 6/6.|
|El detalle del aula muestra sus atributos|Cada aula del inventario y su panel de detalle listan pizarrón, recursos y PC.|Recorrido UI.|

Suites después de los cambios: backend **180/180**, unitarias **66/66**, simuladas **109/110** (solo el PDF de Firefox, T-04), `lint` y `tsc` OK.

Quedó una preparación de alta trabada para `qa-politica-20261005@demo.local`, generada por una prueba de hoy antes del arreglo. Solo afecta a ese correo ficticio. También se creó la cuenta ficticia `qa-docente-20261005@demo.local` (id 9) al reproducir el error.

**Limpieza (05/10, con las cuentas demo existentes):** el Bedel canceló las reservas 340 y 343 con el motivo «Limpieza QA final 05/10: reserva de prueba, ya no se necesita», y el Admin deshabilitó la cuenta 9. Se conservan las reservas 339, 342 y 344 (ya canceladas), los cursos 92 y 93, el calendario 2029 en v6 y las clases agregadas a la reserva 23. La 341 no es del QA y no se tocó. Falta liberar la preparación trabada de `qa-politica-20261005@demo.local`: la app no tiene una acción para hacerlo, así que requiere una consulta SQL que hace el dueño de Supabase.

**Migración V16 en la base compartida:** la imagen de esta rama se levantó en Compose (8082) contra el Supabase compartido para probarla, y Flyway aplicó `V16__envio_de_preparacion` (dos columnas que admiten vacío en `preparacion_cuenta`). La versión de `main` en Render no la conoce todavía.

### Correcciones tras la revisión del PR

La revisión del PR encontró dos regresiones de cuentas, un filtro fuera de alcance y una agenda que se apartaba del contrato visual. Se corrigieron así:

| Hallazgo | Corrección | Verificación |
|---|---|---|
|Un intento rechazado podía borrar la preparación de un alta concurrente exitosa y dejar una identidad Auth sin perfil (contra CA-U12).|Solo un intento por preparación envía el alta a Auth (columnas `envio` y `envio_desde`, migración V16; un envío abandonado vence a los 2 minutos). Un rechazo definitivo libera el correo solo si ese intento era el único en curso y Auth no tiene una identidad con ese correo. Un resultado incierto conserva la preparación.|`AulasApplicationTests.rejectedAttemptDoesNotFreeAPreparationAnotherAttemptIsCreating` y `abandonedCreateClaimExpires`.|
|Cambiar a un correo ocupado dejaba la operación `ENVIADA` y bloqueaba editar, deshabilitar y cualquier otro cambio de correo.|Un rechazo definitivo de Auth (correo inválido u ocupado) cierra la operación como `RECHAZADA`; solo los resultados inciertos quedan pendientes. La pantalla de Cuentas genera un identificador nuevo también ante un 409.|`AccountManagementTests.takenEmailClosesTheChangeAndKeepsTheProfileEditable`.|
|El filtro «PC mínimas» contradice DA-30 y HU-14.|Se retiró de `GET /api/aulas` y de la pantalla Aulas. La cantidad de PC sigue visible como dato descriptivo.|`RoomsTests.filtersCoverEveryRoomAttribute`, ajustado.|
|La vista Día como línea de tiempo invertía los ejes aprobados (`14-pantallas-y-navegacion.md:82`) y dejaba curso, docente y horario completo en el tooltip (UI-03).|Por decisión del usuario, la vista Día vuelve a la grilla aprobada: horas en filas, aulas en columnas y cada bloque con horario, materia, curso, docente y alumnos. Con muchas aulas la grilla vuelve a desplazarse en horizontal; si se quiere evitarlo, la spec permite paginar por aulas indicándolo (línea 107).|`consultations.spec` y suite simulada.|

Suites después de las correcciones: backend **183/183** (PostgreSQL 17.6 con Testcontainers), unitarias **66/66** y simuladas **108/110**. Fallan el PDF de Firefox (T-04) y `reservations.spec` «sin aulas compatibles», que pasó 3/3 al repetirla sola: es intermitente cuando la suite del backend corre en paralelo. `lint` y `tsc` OK.

### Ampliación pedida el 06/10

| Pedido | Cambio | Verificación |
|---|---|---|
|Filtrar la agenda por curso y por docente|DA-86: `GET /api/consultas/agenda` acepta `courseId` (materia, comisión y año) y `teacher` (docente de la lista fija), combinables con fecha, tipo y aula. La agenda Día, la Semana y la lista móvil muestran solo esas clases y solo las aulas donde están, con el aviso «Mostrando solo las clases de …. Los espacios vacíos no indican aulas libres». Se actualizaron DA-86, UI-03, CU-28, el capítulo 08 y `consultas.openapi.yaml`.|`ConsultationTests.agendaNarrowsToACourseOrTeacher`; `agenda-filters.spec`.|
|Sin desplazamiento horizontal en la grilla diaria|La grilla muestra las aulas que entran a lo ancho (columna mínima de 190 px) y pagina el resto con «Aulas anteriores» y «Aulas siguientes». Indica el rango («Aulas 7–12 de 12») y cuántas clases quedan en otras páginas, como pide `14-pantallas-y-navegacion.md:107`. La página de aulas queda en la URL (`aulas=`) y vuelve a la primera al cambiar fecha o filtros. Las filas pasan a 1 px por minuto (30 px por módulo, la mitad de alto). Cada bloque reparte los mismos datos según su duración: una línea si dura 30 min, tres si dura 1 h y cuatro si dura más, con el resumen completo en el tooltip.|`agenda-filters.spec` a 1366 px: 6 aulas por página y `scrollWidth` ≤ `clientWidth`; a 390 px, lista móvil sin desborde.|

Hay que repetir F03 (agenda) con estos cambios. El spec de prototipo `e2e/prototype/agenda-many.spec.ts`, que esperaba desplazamiento horizontal, no corre en ninguna configuración vigente y no se actualizó.

Suites después de la ampliación: backend **184/184**, unitarias **66/66** y simuladas **110/111** (solo falla el PDF de Firefox, T-04). `lint`, `tsc` y `build` OK.

## Decisión por entrega

| Entrega | Decisión explícita del usuario | Fecha/evidencia | Incidencias pendientes |
|---|---|---|---|
|I04|Pendiente|05/10/2026, este registro|QA-02, QA-06, QA-07, QA-08, QA-09, QA-11, QA-16…QA-23, QA-38, D-03|
|I05|Pendiente|05/10/2026, este registro|QA-03, QA-04, QA-05, QA-10, QA-11, QA-24…QA-27, QA-30…QA-34|
|I06|Pendiente|05/10/2026, este registro|QA-13, QA-15, QA-28, QA-29, D-01, T-01/T-04; F11 sin ejecutar. QA-14, QA-37 y D-02 corregidos en esta ejecución|

Restablecimiento remoto: no solicitado ni ejecutado.

## Próximos pasos

1. Operador: correr `PYTHONUTF8=1 python tools/qa/reset-rehearsal.py` (F11) con la imagen ya construida y registrar el resultado.
2. Usuario: probar el zoom nativo al 200 % y decidir la aceptación de cada entrega.
3. Corregir, según prioridad, los hallazgos confirmados de la aplicación (QA-03, QA-04, QA-07, QA-24 y QA-02) y repetir los casos afectados.
4. Ajustar el manifiesto por D-03: elegir un aula de al menos 25 personas, o editar a 24.
