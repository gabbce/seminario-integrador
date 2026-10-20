# Correcciones de cumplimiento — plan y registro

**Objetivo:** cerrar H1/H2/H3 de la revisión, reproducir y corregir la carrera de calendario, y mejorar/verificar el rendimiento con Supabase sin cambiar los requisitos aprobados.

**Base:** `2c7dc7b`; rama local `feat/cumplimiento-requisitos`. Especificación: documentos 05, 07, 11, 17 y 18; diagnóstico: `revision-cumplimiento-2026-10-19.md`.

**Arquitectura:** conservar Java/Spring Boot, React y el esquema privado PostgreSQL. Las consultas administrativas serán paginadas y filtradas en el servidor; EX-02 reutilizará el ranking de alternativas; las recargas de referencias mantendrán montadas las pantallas. Optimizar viajes JDBC y consultas según mediciones, sin cachear permisos ni eliminar las revalidaciones transaccionales.

**Restricciones:** preservar cambios previos del usuario (guion, marca visual, prueba bundle y artefactos). No publicar ni desplegar; no cambiar contraseñas, restablecer datos remotos ni modificar reglas aprobadas. Las mediciones remotas iniciales serán lecturas; el protocolo nominal con escrituras se ejecutará exclusivamente sobre datos/entorno de prueba identificados. No extrapolar base local a Supabase.

## Tareas

- [x] T1. Calendario: API paginada con año/estado y fechas de cuatrimestre; controles de búsqueda accesibles; filtros conservados, páginas vacías válidas, fechas inválidas rechazadas. Mantener referencias completas para selectores. Archivos: CalendarManagement, CalendarsController, PersistedCalendar y componente nuevo de búsqueda; CalendarManagementTests y pruebas UI.
- [x] T2. EX-02: alternativas compatibles ocupadas con ranking periódico y detalles/contactos; primeras tres y acceso a restantes; bloqueo de confirmación intacto. Archivos: CalendarImpactService, AlternativeRanking, CalendarEditor, calendar-management.ts, CalendarImpactTests y calendar-impact.spec.ts; contrato de impacto.
- [x] T3. Colección de reservas: paginar GET /api/reservas y acotar también las consultas de hijos/historial al conjunto de IDs de la página; adaptar consumidores y contrato. Mantener detalle, privacidad Docente y consultas/impresión. Archivos: ReservationsController, ReservationQueries, pruebas afectadas y contrato de reservas.
- [x] T4. Carrera del calendario: regresión con demora controlada tras crear año, comprobar que editar/seleccionar no pierde datos ni crea otro año; corregir en OperationalApp la carga global de referencias que desmonta rutas. Verificar respuestas fuera de orden y actualizaciones de catálogos. Archivos: OperationalApp y nueva regresión UI.
- [x] T5. Rendimiento: medir JDBC/red/consultas del entorno actual; revisar planes e índices; reducir viajes evitables de disponibilidad/listados y cargar solo datos relevantes, conservar tiempo institucional, historia y autorizaciones. Medir antes/después en Supabase con guion reproducible de lectura y repetir protocolo íntegro en entorno aislado. Archivos a decidir con evidencia, herramientas QA e informe.
- [x] T6. Verificación integral: backend PostgreSQL real aislado, unitarias, lint, build, navegador, revisión independiente de cambios y matriz RF/CU/RNF actualizada. Registrar resultados exactos, entorno y pendientes reales; no certificar aceptación del usuario por pruebas automáticas.

## Ejecución y evidencias

Aplicar regresión roja → corrección → verde para cambios de comportamiento. Las tareas T1/T2/T3 tienen archivos delimitados y pueden implementarse de forma independiente, con revisión posterior. Serializar Maven con `flock /tmp/aulas-requisitos-maven.lock` y Playwright con `flock /tmp/aulas-requisitos-playwright.lock`; no compartir puerto/target en pruebas simultáneas. Mantener logs en `/tmp` o en artefactos QA ignorados, sin secretos.

Revisar especialmente: fechas de filtros imposibles/invertidas, páginas fuera de rango, alternativas con horarios reprogramados distintos dentro de un patrón, privacidad de contactos, referencias que terminan fuera de orden, transacciones y consultas con conexión remota lenta. No introducir una caché que permita operar a una cuenta recién deshabilitada.

El usuario autorizó expresamente corregir y verificar estos faltantes; se ejecuta el alcance sin agregar una nueva aprobación de requisitos ni publicar cambios.

## Cierre

T1–T6 ejecutadas. Resultado y límites en [informe de cierre](cierre-cumplimiento-2026-10-19.md): 211 backend, 72 unitarias, 130 navegador simulado, 10 paquete Supabase y carga aislada de 50 sesiones/5.952 solicitudes aprobados. Las lecturas remotas mejoraron; el protocolo nominal íntegro en Supabase y la aceptación manual permanecen sin acreditar. No se cambiaron los requisitos para declarar esos pendientes cumplidos.
