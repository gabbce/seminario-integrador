# QA final conjunto · I-04, I-05 e I-06

**Estado: planificación del QA aprobada por el usuario el 26/09/2026. Ejecución y aceptación de I-04/I-05/I-06 pendientes; ningún caso ejecutado por este documento.** I-04 está implementada/verificada con aceptación pendiente; I-05 e I-06 aún no se implementan. Esta guía conserva la cobertura de [QA I-04](qa-manual-i-04.md); sus detalles siguen siendo aplicables.

## Preparación y datos

1. Registrar commit del paquete, entorno/destino, fecha institucional y versiones de Chromium/Firefox. Escritorio 1366×768 y consultas Docente 390×844; navegación por teclado y ampliación de zoom sin perder controles esenciales.
2. Preparar Admin, Bedel y Docente y cuenta inhabilitada existentes; contraseñas por canal privado, nunca en resultados. Dos perfiles de navegador independientes. Mantener sesiones y roles existentes.
3. Registrar manifiesto de datasets I-03/I-04/I-05 y reservas QA ajenas. Preservar datos y condiciones de los escenarios, incluido año QA 2029. Los IDs actuales son referencias, resolver por claves del dataset cuando corresponda. No restablecer para iniciar la lectura.
4. Antes de entregar esta guía como ejecutable, el implementador completará las referencias pendientes I-05/I-06: dataset y filtros exactos con >100 filas diarias, intervalo histórico con habilitación/tipo conocidos, cifras globales y filtradas del volumen, casos sin datos y comandos Compose/reset definitivos. Registrar esperados independientes de la API bajo prueba. No presentar referencias pendientes como QA listo.
5. Usar datos pequeños aislados para cifras exactas que la base compartida no puede garantizar. Documentar cómo acceder a ese entorno desde la misma interfaz; no añadir selectores de simulación al producto. No extrapolar mediciones aisladas a Supabase remoto.
6. Crear las operaciones manuales en cursos/reservas propios («QA final» y comisión identificable), sin modificar las series de referencia. Fechas propuestas siguen QA I-04 (2027/QA 2029); si transcurrieron, preparar referencias futuras equivalentes, registrar el cambio y recalcular esperados antes de ejecutar.

## Casos y orden de ejecución

### F01 · Arranque, acceso y conservación — I-06 y regresión de base

**Rol:** quien prepara el entorno, luego Admin/Bedel/Docente. **Datos:** configuración privada existente y manifiesto previo.

Desde checkout limpio/configurado, construir e iniciar con Compose según instrucciones finales. Abrir login, ingresar con cada rol, recargar una ruta de detalle y acceder directamente a ella. Rechazar cuenta inhabilitada. Parar/reiniciar y consultar las mismas reservas.

**Esperado:** un mismo origen sirve React/API, rutas profundas funcionan, permisos correctos, datos/identidades conservados. No se ejecuta carga/reset al arrancar ni se requiere PostgreSQL local. Documentar diagnóstico de falta de conexión/puerto ocupado sin detener servicios ajenos.

### F02 · Escenarios conservados y privacidad — I-04, I-05

**Roles:** Bedel y Docente. **Datos:** I-04 claves receso-2027, cancelacion-parcial-2027, origen-esporadica-2027, patron-reprogramado-2027, cese-periodica-2026, anual-2027; IDs de carga 24–31 como referencia inicial.

Recorrer 14/07/2027 Historia 07–08 aula103, 22/07/2027 con 20/07 cancelado, 18/08/2027 con origen17/08, y 17/03/2027 aula105 perteneciente a patrón martes. Consultar anual de 31 clases y cese explícito. Repetir desde Docente y recargar.

**Esperado:** mismas clases/aulas/orígenes y cancelaciones que el manifiesto I-04; Docente no recibe teacherEmail, registrant, changes ni actor de cancelación, comprobando JSON cuando corresponda. No hay acciones operativas para Docente. No se perdieron escenarios al agregar volumen.

### F03 · Agenda y listados — I-05; regresión I-04

**Roles:** los tres. **Datos:** rango/cursos del manifiesto y reserva con cancelación parcial.

Alternar día/semana y filtros aula/tipo; abrir detalle y volver. Consultar por día y por curso/comisión/año; cambiar estado entre vigentes/canceladas/todas y tamaños 20/50/100; recorrer páginas y volver desde detalle. Probar filtros sin resultados y franja no reservable.

**Esperado:** ocupación completa del intervalo, canceladas fuera de agenda pero consultables en listado, totales/filtros/orden coherentes, sin filas repetidas u omitidas. Curso/comisión/año correcto. Filtros se conservan al volver; no confundir hueco con aula reservable ni vacío con error de API. Contactos restringidos ausentes.

### F04 · Impresión completa — I-05, I-06

**Roles:** Bedel y Docente; mismo contrato para Admin. **Datos:** filtro diario del manifiesto con más de 100 filas y subconjunto con canceladas.

Seleccionar página intermedia de20 filas; imprimir el filtro completo y guardar PDF desde Chromium y Firefox. Comparar cantidad/identidades con manifiesto independiente. Repetir con filtro reducido y sin resultados.

**Esperado:** todas las filas filtradas, no solo las visibles, fecha/filtros/columnas y agrupación acordados; sin controles ni contactos añadidos, sin texto cortado ilegible. Fallo al obtener el conjunto completo no se presenta como impresión válida; caso de fallo cubierto también por prueba automatizada.

### F05 · Indicadores exactos e históricos — I-05

**Roles:** Admin/Bedel; rechazo para Docente. **Datos:** fixtures pequeños accesibles en entorno de QA y manifestados, más rango demo de volumen.

Comparar resumen, curvas y semana típica con tablas esperadas: 2/8h=25%; combinación2/8 y0/2=20%; alumnos30/50/20 por franja y50alumnos-hora; cuatro lunes40/0/20/0 dan15. Revisar feriado, receso, año cerrado, cobertura parcial, cambio histórico de estado/tipo y baja posterior. Consultar cero denominador y ausencia de fechas elegibles; cambiar filtros/rango.

**Esperado:** resultados exactos y unidades, máximos/franjas correctos, ceros elegibles incluidos, sin inventar historia ni alumnos únicos. Cierre del año no cambia estadísticas. Tipo histórico preservado. «Sin horas habilitadas» y «Sin datos aplicables» diferenciados. El manifiesto final debe concretar IDs/fechas de estos fixtures antes de QA.

### F06 · Alta, cabecera y concurrencia — I-04, I-05

**Rol:** Bedel, segunda sesión operativa y consulta Docente. **Datos:** curso QA propio, propuesta27 y29/07/2027,08–09,20 alumnos General, según disponibilidad preservada.

Seguir secciones2–3 del QA I-04: alta esporádica múltiple en receso, confirmación, recarga, edición antes de inicio y casos inválidos; dos propuestas simultáneas de la misma franja. Probar límites de tiempo, feriado y capacidad sin modificar clases iniciadas.

**Esperado:** guardado completo o rechazo, cabecera compartida, versión antigua rechazada, una sola ocupación por aula/franja. Nuevas clases aparecen en listados/agenda/indicadores. Medir deltas sobre lecturas previas para no depender de totales globales fijos. Por ejemplo, dos clases de1h y20 alumnos aportan2horas-aula y40alumnos-hora; editar ambas a25 antes del inicio agrega10alumnos-hora, sin cambiar horas-aula.

### F07 · Aulas y reprogramación — I-04, I-05

**Rol:** Admin o Bedel. **Datos:** reservas QA propias esporádica y periódica.

Seguir sección4 de QA I-04: reasignar una/varias esporádicas, un patrón periódico completo incluyendo clase reprogramada y mover fecha/horario dos veces conservando origen. Probar conflicto externo/interno y fuera de período.

**Esperado:** pasado/canceladas intactos, aula periódica por patrón completo; origen inmutable y patrón semanal conservado. Agenda/listados muestran destino vigente, no origen como ocupación; indicadores trasladan horas/alumnos-hora a fecha/aula efectiva sin duplicar. Registrar nuevo horario/duración para calcular delta exacto.

### F08 · Cancelación y continuidad — I-04, I-05

**Rol:** Bedel. **Datos:** reservas QA propias y muestra histórica I-04 de solo lectura.

Seguir sección5 de QA I-04: cancelar una clase con motivo, comprobar liberación y crear otra en la franja; cancelar el resto. En periódica propia, cancelar toda continuidad futura. Revisar cabecera con todas canceladas y otra con pasado no cancelado.

**Esperado:** sin reactivación, motivos/historia conservados, estado derivado correcto, ausencia en agenda y presencia en filtro canceladas. Indicadores excluyen canceladas; registrar el efecto antes de volver a ocupar para no mezclar deltas. Cese no equivale a fin natural.

### F09 · Impacto de calendario — I-04, I-05

**Rol:** Admin; Bedel para conflicto controlado; Docente consulta resultado. **Datos:** QA 2029, reserva 23 de referencia, según estado vigente registrado antes del caso.

Seguir sección6 de QA I-04: ampliar al siguiente lunes futuro no incorporado, revisar sin guardar, provocar interferencia mediante reserva QA, rechazar confirmación, resolver y revisar de nuevo; confirmar. Quitar feriado según secuencia documentada. Probar recorte/agregar feriado con dependencia.

**Esperado:** calendario/clases juntos o ninguno, aula del patrón, versiones revisadas vigentes, sin regenerar exclusiones/cancelaciones/orígenes. Consultas e indicadores reflejan nuevas clases. Al ampliar cuatrimestre, la apertura institucional no aumenta por ese hecho; al quitar feriado pueden cambiar numerador y denominadores/elegibilidad. Comparar esperados específicos, no asumir que siempre cambia solo la cantidad de clases. No alterar calendarios 2026/2027 compartidos para estos casos.

### F10 · Interacción, fallos y evidencias técnicas — I-04, I-05, I-06

**Roles:** todos según permisos. Recorrer pantallas afectadas en Chromium/Firefox y tamaños definidos, con teclado, foco, zoom, mensajes, filtros y gráficos. Revisar recuperación de operación incierta cuando ocurra; no provocar caídas remotas como requisito manual.

**Esperado:** controles utilizables y sin recortes accidentales; errores diferenciados de vacío; reintento seguro. Adjuntar reportes automatizados de respuestas tardías/perdidas, rollback, concurrencia real, reloj controlado y carga completa. Registrar pruebas no ejecutadas, umbrales fallidos y alcance del entorno; no atribuir resultados automatizados al usuario ni aprobación por omisión.

### F11 · Restablecimiento selectivo — I-06; regresión I-04/I-05

**Rol:** operador técnico con configuración privada. **Datos:** entorno aislado identificado, dataset gestionado modificado y registros ajenos testigo; completar comandos exactos al implementar.

Verificar destino y previsualizar un dataset seleccionado: no debe escribir. Ejecutar confirmación explícita, comparar escenario original, repetir y comprobar mismo estado funcional. Probar bloqueo por calendario/aula/reserva ajena incompatible. Registrar preservación de identidades, claves y datos testigo sin mostrarlos. Verificar que reintentos antiguos no deshagan el reset.

**Esperado:** recuperación solo del alcance elegido, sin duplicados, cambios parciales ni eliminación de QA manual/cuentas/calendarios. Reporte de datasets/identidades y cualquier remapeo. No ejecutar en proyecto compartido sin autorización concreta; el ensayo aislado y su evidencia son parte del cierre. Los comandos de carga normales siguen conservando cambios.

### F12 · Recorrido final y aceptación — I-04, I-05, I-06

Arrancar el paquete documentado y recorrer ingreso→agenda→reserva→operación→listado/impresión→indicadores. Documentar datos finales, comandos, límites reales y cómo continuar la demo sin ejecutar cargas/reset innecesarios. Verificar que las instrucciones no dependen de archivos temporales de una máquina del implementador.

**Esperado:** demo presentable, instrucciones reproducibles y estados por entrega explícitos. Registrar aceptación del usuario por separado; corregir incidencias y repetir casos afectados/dependientes antes de aceptar.

## Registro y cobertura

Por caso anotar estado (pendiente/aprobado/fallido/bloqueado/no ejecutado), rol, navegador, entorno/commit, IDs/fechas/filtros, esperado/observado y evidencia/incidencia. La selección de fechas equivalentes o cambios de datos debe quedar registrada antes de juzgar una cifra.

| Entrega | Casos de cobertura | Aceptación del usuario |
|---|---|---|
| I-04 | F02, F06–F10 y regresiones F03/F11/F12; secciones 1–7 del QA I-04 conservadas | Pendiente |
| I-05 | F02–F10 y F12; precisión, historia, consultas/impresión y volumen | Pendiente |
| I-06 | F01, F04, F10–F12; paquete, restablecimiento, carga y presentación | Pendiente |

Los resultados del rendimiento se registran aparte por operación y entorno, siguiendo documento 11. Una prueba fallida no se convierte en aceptación por finalizar el guion. Compartir un caso entre entregas no elimina su trazabilidad ni permite cerrar las tres automáticamente.

Planes de referencia: [I-05](i-05-consultas-e-indicadores.md) y [I-06](i-06-demo-y-validacion-final.md). La guía se completará con los datos y comandos efectivos al implementar, conservando estos casos y criterios aprobados.
