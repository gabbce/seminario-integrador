# Revisión de cumplimiento · 19/10/2026

**Registro histórico de la auditoría inicial.** Las correcciones y la nueva verificación se documentan en el [informe de cierre](cierre-cumplimiento-2026-10-19.md); los hallazgos y conteos de este documento corresponden al estado anterior.

Base revisada: `2c7dc7b`, implementación completa y árbol de trabajo actual. Se preservaron las modificaciones previas del guion y el registro de revisión de demo. No se modificó código de producto, configuración privada ni datos remotos.

**Dictamen: la implementación cubre los recorridos principales, pero no corresponde declarar cumplimiento completo.** Hay tres brechas concretas de implementación, rendimiento remoto sin acreditar y comprobaciones manuales pendientes.

## Fuentes y alcance

Se compararon los 29 RF/CU del catálogo 02 y las fichas vigentes del documento 18, sus extensiones y las precisiones de los documentos 05–11 y 17. Las fichas originales de 2025 no reemplazan los acuerdos vigentes. Se inspeccionaron servicios, controladores, permisos, migraciones, pantallas y pruebas; las comprobaciones ejecutadas en esta revisión se separan de los registros históricos.

«Implementado» en la matriz significa que se encontró el recorrido y sus controles principales; no certifica cada alternativa ni equivale a aceptación del usuario.

## Hallazgos de implementación

### H1 · Búsquedas de calendario incompletas — P2

**Prometido:** CU-10 exige filtrar por año/estado y paginar; CU-14 exige elegir año y filtrar fechas. Ver `docs/especificacion/18-casos-de-uso-vigentes.md:89` y `:121`.

**Actual:** `backend/src/main/java/ar/edu/aulas/calendar/CalendarManagement.java:32` devuelve todos los años, sin parámetros, mediante lecturas de cada calendario. `CalendarsController.java:13` tampoco acepta filtros/paginación. `frontend/src/pages/CalendarEditor.tsx:116` ofrece un selector completo de años y formularios de períodos, sin búsqueda por estado ni fechas ni paginación.

Se puede consultar y administrar el calendario, pero RF/CU-10 y 14 están parcialmente implementados. Completar la búsqueda administrativa sin sustituir la edición ni romper los selectores de referencias.

### H2 · EX-02 no ofrece las alternativas conflictivas acordadas — P2

**Prometido:** al ampliar cuatrimestre o quitar feriado con interferencias, mostrar alternativas informativas con el ranking de periódicas. Documento 07, línea 182; criterios de orden y detalle en líneas 33–49.

**Actual:** `backend/src/main/java/ar/edu/aulas/calendar/CalendarImpactService.java:99` conserva solo aulas completamente libres y ordena por capacidad/identificador. El contrato devuelve `List<String>`, no alternativas con conflictos y sus detalles. `frontend/src/pages/CalendarEditor.tsx:473` muestra «Aulas compatibles libres en ese horario».

Caso que expone la brecha: la ampliación choca en el aula del patrón y todas las demás aulas compatibles tienen alguna interferencia. La respuesta deja las alternativas vacías; el compromiso exige mostrarlas, ordenadas, para que el operador pueda resolver los conflictos. El bloqueo de guardado sigue funcionando: este hallazgo afecta la información y la resolución asistida, no prueba una sobre-reserva.

Completar el ranking y detalle informativos conservando la prohibición de confirmar aulas ocupadas o asignar otra aula únicamente a las nuevas fechas.

### H3 · Colección de reservas sin paginación — P2

**Prometido:** RNF-03 exige paginación obligatoria (documento 05, tabla de RNF).

**Actual:** `backend/src/main/java/ar/edu/aulas/reservations/ReservationsController.java:16` expone `GET /api/reservas` sin parámetros. `ReservationQueries.java:15` llama a `read(null, ...)`; líneas 28–33 no acotan cabeceras y luego se obtienen detalles, patrones e historial de toda la colección. Las lecturas agrupadas evitan N+1, pero no acotan el volumen.

**La pantalla habitual de listados sí pagina**, mediante `/api/consultas/listado` y `PersistedListing`. No atribuir esta brecha a esa pantalla. Paginar la colección expuesta o retirar su acceso si ya no tiene consumidores operativos, adecuando contratos y pruebas.

## Requisitos no funcionales

| ID | Evaluación | Evidencia y límite |
|---|---|---|
| RNF-01 | Implementado; integración respaldada por registros previos | JWT validado en Java, rol/estado consultados en cada petición, permisos backend y credencial administrativa separada del frontend. `SecurityConfiguration`, `CurrentAccountFilter`, pruebas de seguridad/cuentas. No se revalidó en vivo la configuración de Auth remoto en esta revisión. |
| RNF-02 | Implementado; controles de integridad presentes | Transacciones, bloqueos, versiones y exclusión PostgreSQL para ocupación; manejo separado de resultados inciertos de Auth. Pruebas de rollback/concurrencia en suites backend. |
| RNF-03 | Parcial; rendimiento remoto sin acreditar | H1/H3 afectan paginación. La muestra remota conservada supera el objetivo de 1.500 ms; no es una medición formal de 50 sesiones ni permite certificar el rendimiento actual. |
| RNF-04 | Implementado; respaldo técnico | Tabla de auditoría, eventos de mutaciones y registro de resultados conocidos/inciertos de identidad. Consulta técnica conforme al alcance; no se prometió un panel de auditoría. |
| RNF-05 | Evidencia local; pendiente en el entorno Supabase comprometido | Ensayo conservado de 50 sesiones, 5 operativas/45 docentes, con PostgreSQL y JWKS locales. No acredita el rendimiento con PostgreSQL/Auth remotos ni sobre la revisión actual. |

Rendimiento: `docs/evidencias/i05-lecturas.json` conserva una muestra del 26/09, una sesión y cinco lecturas por operación: listado p95 **1.612,87 ms**, disponibilidad **2.748,60 ms**, frente al objetivo **<1.500 ms**. El propio archivo dice «NO protocolo RNF». Es una señal de brecha, no una prueba formal de incumplimiento bajo el protocolo completo actual.

`docs/evidencias/i06-carga.json` conserva una corrida local de 50 sesiones y 5.963 solicitudes medidas sin errores, con p95 dentro del objetivo. Su entorno declara «local Docker; no Supabase» y una imagen anterior. No reemplaza la medición remota. Para cerrar RNF-03/05 hace falta medir la revisión final con el protocolo del documento 11 y el entorno objetivo, analizar latencias y corregir lo necesario.

## Matriz RF / CU

| RF / CU | Cobertura observada | Referencia de implementación/pruebas |
|---|---|---|
| 01 · Autenticación/autorización | Implementado | Seguridad, sesión frontend, `SecurityTests` |
| 02 · Alta de usuario | Implementado | Gestión de cuentas/identidad, `AccountManagementTests` |
| 03 · Buscar usuarios | Implementado | API y pantalla de cuentas con filtros/paginación |
| 04 · Modificar usuario | Implementado | Cuenta/identidad, versión y último Admin |
| 05 · Baja lógica de usuario | Implementado | Estado, autorización vigente, auditoría |
| 06 · Crear aula | Implementado | `RoomsService`, `RoomsTests` |
| 07 · Buscar aulas | Implementado | Filtros/paginación de aulas |
| 08 · Modificar aula | Implementado | Historia y protección de futuras/en curso |
| 09 · Baja de aula | Implementado | Dependencias y conservación histórica |
| 10 · Buscar año | **Parcial: H1** | Selector completo, faltan filtros/paginación |
| 11 · Crear año | Implementado | Estado preparación y unicidad |
| 12 · Modificar año | Implementado | Validación de calendario/dependencias |
| 13 · Eliminar año | Implementado | Bloqueo de dependencias y año cerrado |
| 14 · Buscar cuatrimestre | **Parcial: H1** | Consulta por año, falta filtro por fechas |
| 15 · Crear cuatrimestre | Implementado | Número, fechas, máximo y no solapamiento |
| 16 · Modificar cuatrimestre | Implementado con **brecha EX-02: H2** | Revisión y guardado conjunto de impacto |
| 17 · Eliminar cuatrimestre | Implementado | Dependencias históricas/canceladas y estado del año |
| 18 · Disponibilidad | Implementado | Preparación esporádica/periódica, alternativas normales |
| 19 · Sugerencias | Implementado | Ranking de capacidad y patrón completo |
| 20 · Solapamientos | Implementado | Revalidación, bloqueos y restricción PostgreSQL |
| 21 · Esporádica | Implementado | Preparación/confirmación y recuperación de operación |
| 22 · Periódica | Implementado | Patrones, períodos, exclusiones y futuras |
| 23 · Confirmación | Implementado | Persistencia atómica y revalidación |
| 24 · Modificación | Implementado | Cabecera, aulas por patrón y reprogramación/versiones |
| 25 · Cancelación | Implementado | Motivo, selección, vigencia y cese de continuidad |
| 26 · Listado diario | Implementado | Consulta paginada e impresión del conjunto completo |
| 27 · Listado por curso | Implementado | Curso/comisión/año, orden y filtro de estado |
| 28 · Agenda | Implementado | Consultas, roles, filtros y paginación por aulas |
| 29 · Indicadores | Implementado | Historia, denominadores, concurrencia teórica y comparación |

EX-01 está implementada mediante calendario/impacto, con la salvedad H2 al quitar feriados; EX-02 tiene H2. EX-03 (contraseña) y EX-04 (rehabilitación) tienen servicios y pantallas. OP-01/02/03 tienen procedimientos y herramientas; las cargas no forman parte del arranque normal.

## Pendientes de aceptación y documentación

- **Incidencia intermitente de calendario observada en esta revisión:** la suite completa aprobó 121/122; `e2e/calendar.spec.ts:107` falló esperando el rechazo de año duplicado a 1440 px. El snapshot mostraba 2027 y 2028 creados y el campo «Nuevo año» en 2028, aunque el ensayo había ingresado 2027. La repetición aislada del mismo caso aprobó **3/3**: el fallo inicial se conserva y no se declara resuelto. Hay un mecanismo compatible en `OperationalApp.tsx:147` y `:290`: cambiar los años dispara la carga de referencias y desmonta todas las rutas; `CalendarEditor.tsx:36` reinicializa el campo al volver a montar. La causa exacta del fallo requiere un ensayo con demoras controladas; no se certifica como defecto determinista. El registro real del 19/10 también describe pérdida del formulario durante una recarga de referencias. Conviene resolver/descartar esta carrera antes del cierre.
- La aceptación del usuario de I04/I05/I06 sigue pendiente según los registros. Eso es distinto de que falte toda su implementación o toda prueba real: hay recorridos reales registrados el 05/10, correcciones y regresión el 07/10, y revisión real el 19/10.
- Zoom nativo al 200 % y PDF de Firefox en Windows siguen sin acreditarse en los registros consultados. Hay evidencia de reflow y de impresión en Linux, que no reemplaza esas comprobaciones específicas.
- `revision-demo-2026-10-19.md` conserva intentos administrativos con esperas/versiones obsoletas y anuncia completar años/cuentas, sin un resultado final asentado. No tomarlos como defectos confirmados ni como aprobaciones completas.
- Hay textos de estado obsoletos: documento 05 dice que no hay implementación ni pruebas, documento 17 que no se produjeron evidencias y README conserva conteos anteriores. Conviene actualizar el estado o marcar explícitamente que esas frases describen el cierre de especificación, sin modificar los requisitos aprobados.

## Verificación de esta revisión

Pruebas ejecutadas en WSL, con datos aislados o red simulada. Las suites backend pueden preparar/restablecer exclusivamente sus bases descartables; no se ejecutaron cargas, resets ni pruebas con escrituras en Supabase.

- Unitarias frontend: **72/72 aprobadas**.
- Lint: **0 errores y 0 advertencias**.
- Build TypeScript/Vite: **aprobado**.
- Navegador con red simulada: **121/122 aprobadas**, una incidencia de calendario descrita arriba. Repetición aislada de ese caso: **3/3 aprobadas**, sin modificar código.
- Backend: **198/198 aprobadas en 27 suites**, cero fallos, errores y omitidas; PostgreSQL 17.6 descartable y Auth simulado. Se comprobó terminación de Maven y reportes Surefire nuevos de esta ejecución.
- El intento inicial con Node Windows sobre dependencias instaladas en Linux falló antes de ejecutar pruebas por un binding nativo de Rolldown ausente. Se usó WSL con sus dependencias existentes, sin reinstalar ni borrar archivos. No se atribuye ese error a la app.

Comandos: `cd backend && ./mvnw -q test`; desde frontend, `npm test -- --run`, `npm run lint`, `npm run build`, `npx playwright test` y `npx playwright test e2e/calendar.spec.ts --grep 1440 --repeat-each=3 --workers=1`. Logs locales WSL: `/tmp/aulas-revision-requisitos-backend.log`, `/tmp/aulas-revision-requisitos-ui.log` y `/tmp/aulas-revision-calendario-repeticion.log`. En la corrida UI se leyó el resumen de Playwright, que informa un fallo, aunque el comando envolvente terminó con código cero: no se tomó ese código como aprobación de la suite.

Orden recomendado de cierre: completar H1/H2/H3; volver a verificar sus recorridos y dependencias; medir rendimiento contra Supabase con el protocolo íntegro; actualizar la trazabilidad; completar la aceptación manual y las comprobaciones de presentación pendientes. No se cambian requisitos para hacerlos coincidir con lo implementado.
