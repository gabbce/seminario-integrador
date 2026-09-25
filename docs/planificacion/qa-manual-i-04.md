# QA manual · I-04

**Pendiente del usuario.** Esta guía no marca aceptación. Alcance: esporádicas, cancelaciones, edición de cabecera/aulas, reprogramación, impacto de calendario y recuperación. I-01–03 mantienen su aceptación previa; indicadores persistentes, consultas/impresión completas y empaquetado quedan para I-05/I-06.

## Preparación

1. Usar `feat/integracion` y las variables locales existentes; contraseñas en `backend/.env`, sin copiarlas a capturas. Administrador `admin@demo.local` usa `AULAS_ADMIN_PASSWORD`; Bedel `bedel@demo.local` y Docente `docente@demo.local`, `AULAS_DEMO_PASSWORD`. La cuenta `inhabilitado@demo.local` debe seguir rechazada. Las contraseñas configuradas fueron restablecidas con autorización del usuario; no se modificaron roles.
2. Revisar puertos libres. Desde `backend/`: `./mvnw spring-boot:run` (8080). Desde `frontend/`: `npm run dev` (5173). PostgreSQL/Auth permanecen en Supabase. No detener procesos ajenos.
3. Abrir dos perfiles de navegador independientes, escritorio1440px y móvil390px. La app usa fecha/hora institucional real de Córdoba; esta guía parte del25/09/2026. Si las fechas ya comenzaron, elegir nuevas futuras y registrar el cambio de referencia; nunca modificar iniciadas.
4. Revisar [datos e identidades](datos-demo-i-04.md). No restablecer catálogos ni reservas para reproducir un caso. Para explorar sin alterar el dataset, crear curso con materia «QA manual I04» y comisión propia. Los IDs15–23 de QA real y24–31 del dataset tienen enlaces directos `/reservas/{id}`. La carga y su repetición ya se ejecutaron; no es necesario recargar datos. El calendario abre el último año: seleccionar **2027** para casos habituales; **2029** es el año dedicado al recorrido real de impacto.
5. Anotar resultado de cada sección, rol, fecha usada e IDs creados. Las cifras del dataset se refieren a sus propias reservas, no al total global.

## 1. Consulta del conjunto y privacidad

Como Bedel, en agenda14/07/2027, aula103, abrir Historia07–08 (receso-2027). Recargar y abrir desde Docente: mismas fechas y aula. Docente no ve contactos, registrante, historial administrativo ni botones de modificación. En DevTools/Network, el JSON de `/api/reservas/{id}` debe omitir `teacherEmail`, `registrant` y `changes`, no solo esconderlos en pantalla.

Consultar22/07/2027 Historia07–08: la reserva tiene dos detalles,20/07 cancelado con motivo y22/07 vigente. Consultar18/08/2027 Historia07–08: origen17/08 visible. Consultar17/03/2027 Historia07–08 aula105: pertenece al patrón martes, pese al movimiento puntual a miércoles. La anual de Historia miércoles08–09 tiene31 clases y respeta ambos períodos.

## 2. Alta esporádica y conflictos

Como Bedel, crear esporádica del curso QA manual, docente Laura Gómez,20 alumnos, General. Fechas sugeridas **27 y29/07/2027,08–09**. Buscar aulas, seleccionar por fecha, revisar ambas y confirmar. Debe aparecer una sola reserva con cabecera compartida y ambas clases; recargar y comprobar desde la segunda sesión.

Probar fecha pasada, sábado, feriado configurado y horario fuera de07–23: se rechazan sin guardar. El receso no impide una esporádica. Modificar requisitos o fechas después de buscar invalida la selección previa. Eliminar todas las fechas no permite confirmar.

Preparar dos reservas para mismo aula/fecha/franja desde dos sesiones. Confirmar una y luego la otra: la segunda debe rechazar el conjunto y conservar propuesta corregible. Consultar un horario contiguo al final: no debe contar como solapamiento. Las alternativas con conflictos son informativas; un acuerdo externo no libera ocupación.

## 3. Cabecera antes de iniciar

En la esporádica recién creada, «Modificar datos»: cambiar docente a Ana Ruiz y alumnos20→25, revisar y guardar. Curso/docente/alumnos/requisitos afectan toda la reserva; fechas/aulas permanecen. El historial del operador muestra antes/después y la recarga conserva el cambio.

Probar9999 alumnos o un requisito incompatible con una de las aulas: rechazo total, ningún detalle ni cabecera cambia. Curso de otro año no se permite. En una reserva con cualquier clase ya iniciada no debe aparecer la acción ni aceptarse por API. Dos sesiones con la misma versión: el segundo guardado exige revisar versión actual.

## 4. Aulas y reprogramación

En esporádica QA, «Cambiar aula»: marcar una clase, elegir otra aula compatible, revisar anterior/nueva, guardar. La otra clase conserva su aula. Probar varias marcadas y revisar todas antes de confirmar.

En una periódica futura QA, el cambio selecciona el **patrón completo**, incluidas sus clases puntualmente reprogramadas. No permite excepción de aula por fecha. Cambia patrón y todas sus futuras vigentes; las iniciadas/canceladas permanecen. Para inspeccionar un ejemplo ya persistido usar reserva20 (patrón viernes20–21,105) o el dataset `patron-reprogramado-2027`.

En esporádica, «Reprogramar clases»: marcar una, mover27/07→28/07, inicio09:00, duración1,5h. Revisar antes/después/aula y guardar; origen27/07 y aula se conservan. Mover otra vez a30/07: el origen debe seguir27/07. Una reprogramación periódica conserva además el patrón semanal; probar un día diferente dentro de sus períodos. Fuera de ellos debe rechazar y orientar a cancelar original/crear esporádica. Probar una fecha ya vigente de la misma reserva y un aula ocupada: rechazo total sin cambiar las otras seleccionadas.

## 5. Cancelación y liberación

En la esporádica QA, cancelar una clase con motivo «QA manual: suspensión». Revisar cantidad/fechas/aulas antes de confirmar. El detalle conserva fecha/aula y muestra cancelación/motivo; la otra continúa vigente. Disponibilidad debe liberar el espacio y permitir una nueva reserva ficticia en la franja cancelada. Cancelar la restante deja cabecera Cancelada. No existe reactivación.

En una periódica QA, cancelar todas sus futuras vigentes registra cese explícito, incluso si quedan clases históricas. Ampliar calendario luego no debe crear nuevas clases de esa serie. `cese-periodica-2026` permite inspeccionar el estado sin cancelaciones nuevas. No se permite cancelar iniciadas ni seleccionar IDs ajenos por API. Cancelar puede liberar clases aunque el año ya no esté habilitado.

## 6. Impacto de calendario · solo Administrador

Usar el **año QA2029**, preservando calendarios compartidos2026/2027. La reserva23 tiene lunes05,12,19/03/2029,18–19,103 y patrón lunes. Su calendario termina primer período19/03. Seleccionar2029 y ampliar fin a **26/03/2029**. «Revisar impacto» debe mostrar una nueva clase de reserva23,26/03,18–19,103, sin escribir todavía. Confirmar: calendario, clase e historial aparecen juntos, persisten al recargar y son visibles desde Docente sin datos privados.

Antes de confirmar una revisión, crear desde Bedel una esporádica QA2029 para26/03,18–19,aula103 (si aún libre). Confirmar el calendario debe rechazar todo. Revisar de nuevo muestra interferencia y alternativas informativas, sin reasignar automáticamente. Cancelar/mover la reserva conflictiva mediante el flujo normal y volver a revisar. Si ya ampliaste al26/03, usar02/04 como siguiente lunes para este caso.

Para quitar un feriado: elegir otro lunes futuro de2029 que todavía no tenga clase (por ejemplo09/04), añadirlo como fecha no lectiva mientras queda fuera del período y guardar con revisión; ampliar período hasta ese lunes manteniendo feriado (no genera esa fecha); luego quitarlo y revisar: agrega la clase antes omitida. Comprobar exclusiones y canceladas sin regeneración en los tests controlados listados abajo, sin alterar el dataset compartido para forzar el caso.

Agregar feriado sobre una clase vigente o recortar período dejando clases/orígenes fuera debe informar dependencia y rechazar; nunca cancela automáticamente. Un cambio sin nuevas clases ni dependencias bloqueantes se guarda después de revisión. Un año Cerrado sigue solo lectura. Bedel/Docente no tienen acceso a gestionar impacto.

Cambiar calendario/reserva/aula después de la revisión obliga a revisarla de nuevo. Fin natural de una serie no cancela su continuidad: el caso temporal exacto, junto con pasado y reloj después de espera, está automatizado en `CalendarImpactTests`; no cambiar el reloj real para QA.

## 7. Respuestas inciertas, teclado y móvil

Los recorridos automatizados simulan pérdida de respuesta antes y después del commit para altas, cancelación, cabecera, aulas, reprogramación y calendario. Si ocurre durante QA, conservar la propuesta: «Consultar resultado» y «Reintentar misma operación» reutilizan UUID/cuerpo incluso tras recargar. `found=false` no significa rechazo confirmado. No crear otro intento mientras el resultado anterior sea incierto.

En390/1440px recorrer formulario, revisión, conflicto, éxito e historial. Usar Tab/Shift+Tab/Enter/Espacio: foco visible, etiquetas comprensibles, selección posible sin ratón, confirmación explícita. No debe haber scroll horizontal ni alertas pegadas a acciones. Abrir otra sesión y comprobar recarga. No incluir contraseñas/tokens en capturas.

## Evidencia automatizada y registro manual

- PostgreSQL aislado: suites `SporadicReservationTests`, `CancellationTests`, `HeaderMutationTests`, `RoomMutationTests`, `RescheduleTests`, `CalendarImpactTests`, `DemoOperationTests` y regresiones existentes; los nombres exactos ejecutables figuran en `backend/src/test/java/ar/edu/aulas/`.
- `./mvnw test`: reglas, API, exclusión real, concurrencia, versiones, reloj controlado, idempotencia y rollback de auditoría.
- Frontend: `npm test -- --run`, `npm run build`, `npm run lint`, `npx playwright test --workers=2`. Las pruebas de red simulada acreditan interacción/recuperación, no persistencia remota.
- Recorridos reales opt-in por operación, con recarga y segunda sesión, ya documentados en [avance](avance-i-04.md). No ejecutar todos indiscriminadamente: agregan reservas QA.
- No se ejecutó QA manual del usuario ni se valida I-05/I-06 con esta entrega. La evidencia final y limitaciones reales se registran en avance; no reemplazan esta revisión manual.

| Área | Resultado del usuario / incidencia / ID |
|---|---|
|Consulta/privacidad|Pendiente|
|Esporádicas/conflictos|Pendiente|
|Cabecera|Pendiente|
|Aulas/reprogramación|Pendiente|
|Cancelación/liberación|Pendiente|
|Calendario/continuidad|Pendiente|
|Recuperación/móvil/teclado|Pendiente|

Estado técnico de entrega: **I-04 implementada y verificada, pendiente de QA del usuario**. Solo el usuario puede aceptarla.
