# I-05 · Consultas e indicadores persistentes

**Estado:** plan detallado aprobado por bloques el 26/09/2026. Implementación no iniciada. Depende de I-04 implementada y verificada; por acuerdo explícito no requiere aceptar antes su QA manual, que se conserva pendiente para el [QA final conjunto](qa-final-i-04-i-05-i-06.md).

## Objetivo y fronteras

Completar agenda/listados, impresión diaria e indicadores desde datos persistidos, con historia y cálculos exactos, y ampliar la demo sin inutilizar escenarios existentes. No agregar métricas de conflictos, asistencia real, personas únicas, Excel, PDF servidor ni infraestructura de producción. Compose y restablecimiento pertenecen a I-06.

## Subcortes y dependencias

| Corte | Resultado aprobado | Dependencia |
|---|---|---|
| I-05.1 | Contratos y consultas de agenda/listados desde Java, filtradas por período/fecha/curso según vista, orden estable, paginación donde corresponde y DTO por rol; conectar React sin descargar todo el histórico | Base I-04 verificada |
| I-05.2 | Impresión del listado diario completo y filtrado, independiente de la página visible; PDF del navegador, sin exportador servidor | I-05.1 |
| I-05.3 | Indicadores persistentes de horas, ocupación y demanda por tipo; historia de aula, cobertura y denominadores coherentes | I-05.1 y fixtures pequeños exactos |
| I-05.4 | Concurrencia prevista por franja, máximos, alumnos-hora y semana típica para cuatrimestre/rango; retirar fuente simulada de indicadores | I-05.3 |
| I-05.5 | Ampliar demo a miles de clases y verificar consultas/indicadores/impresión con volumen sin invalidar escenarios existentes | I-05.1–4 |
| I-05.6 | Regresión cruzada con operaciones I-04, revisión visual y documentación de QA/valores de referencia | Todos |

Cada corte incluye contrato, backend/interfaz, pruebas y aceptación técnica. Los fixtures de cálculo y privacidad aparecen con la función correspondiente, no recién al generar volumen. Se preserva la especificación: agenda sin canceladas, listados con filtro por estado de ocurrencia, impresión diaria completa, indicadores solo Admin/Bedel, sin personas únicas ni métricas de conflictos.

## Fuentes y reglas de ejecución

Aplicar especificación vigente y DA aprobadas, [plan general](integracion.md), [registro de los seis bloques](preparacion-i-05-i-06.md) y contratos existentes en `docs/api/`. El código de I-04 y sus migraciones aplicadas se preservan. Las frases históricas de cierre documental no acreditan estado de implementación.

Cada subcorte incluye contrato antes de código, backend/persistencia, interfaz B — PATIO, pruebas relevantes, inspección visual y commit controlado. Mantener revisión con GPT-6 Luna high por iteración según el flujo vigente, resolver hallazgos y registrar evidencia; no sustituir silenciosamente el revisor solicitado. Los subcortes pueden dividirse técnicamente sin omitir alcance ni aceptar escrituras incompletas. No repetir aprobación funcional de reglas ya resueltas; consultar contradicciones reales o cambios de alcance.

No alterar código ni datos por aprobar este documento. Durante ejecución, preservar cambios ajenos, secretos y escenarios de QA; no editar migraciones aplicadas ni interpretar un arranque como autorización de carga/reset. Crear avance por entrega con tarea, contrato, criterios, pruebas, revisión, incidencias y commit. Distinguir pruebas automatizadas, recorridos reales y aceptación del usuario.

## Agenda/listados e impresión · I-05.1–2

Corresponde a I-05.1 e I-05.2. Depende de las operaciones verificadas de I-04; no implica aceptación manual de esa entrega.

### Contratos de lectura

Las rutas/DTO concretos se documentarán en OpenAPI antes de implementar. Separar consultas para las vistas de la lectura de detalle y de los resultados de operaciones existentes, preservando esos contratos o migrando consumidores explícitamente.

| Consulta | Entrada | Salida y garantía |
|---|---|---|
| Agenda | Fecha, vista día/semana, filtros de aula/tipo | Ocurrencias no canceladas del intervalo mostrado; IDs para abrir detalle, curso/comisión, docente, fecha, aula, inicio/fin y contexto de calendario/estado necesario para distinguir hueco de franja no reservable. Sin descargar el histórico completo ni paginar clases omitiendo ocupación. |
| Listado diario | Fecha, aula/tipo, estado de ocurrencia, página, tamaño 20/50/100 | Filas agrupadas/ordenadas por tipo y con orden estable dentro del grupo; total y metadatos de página. Filtros y paginación aplicados por Java. |
| Listado por curso | Curso/comisión y año, estado de ocurrencia, página/tamaño | Filas cronológicas, total y metadatos; desempate estable mediante ID. |
| Impresión diaria | Mismos filtros/orden efectivos que el listado diario, sin limitar por página visible | Todas las filas filtradas, fecha y filtros identificados; salida de datos para vista imprimible del navegador, no PDF generado por servidor. |

Estado inicial de listados: no canceladas; permitir canceladas/todas. El estado corresponde al detalle, no a la cabecera. La agenda excluye canceladas siempre. Todos los roles consultan; permisos de acciones conservados en detalle. Sin emails, registrador ni historial administrativo en proyecciones de Docente; impresión conserva columnas acordadas del listado sin agregar contactos.

Una franja sin ocupación no demuestra disponibilidad: distinguir calendario/apertura/estado del aula y mantener la consulta de disponibilidad como autoridad para reservar. Las representaciones históricas no se recalculan indiscriminadamente desde el estado actual.

### Interacción y actualización

Conservar filtros/orden al paginar y volver desde detalle; al cambiar criterios, reiniciar la página. Evitar que una respuesta tardía reemplace resultados de filtros nuevos. Refrescar las vistas afectadas después de una operación guardada, sin presentar fallos de API como conjuntos vacíos.

Imprimir únicamente cuando el conjunto completo se haya obtenido correctamente; mostrar fallo/reintento si la lectura queda incompleta. Si se necesitan varias lecturas, asegurar una salida coherente sin filas duplicadas/omitidas ante cambios entre páginas; concretar mecanismo mínimo en el contrato técnico. No basta concatenar páginas mutables sin control. No agregar nuevos formatos ni impresión de otras pantallas.

### Pruebas y aceptación

- API/PostgreSQL: filtros combinados, orden estable con empates, totales, páginas 20/50/100, curso/comisión/año correcto, estado por ocurrencia y DTO por rol.
- Agenda día/semana: ocupación completa, cancelación parcial, reprogramación visible solo en destino y huecos no reservables diferenciados. Conservar acceso a operaciones de I-04.
- Navegador: filtros al volver/paginar, respuestas fuera de orden, error/reintento, vacío legítimo, recarga y roles en escritorio/móvil.
- Impresión: conjunto que exceda una página y también 100 filas; conteo e identidades coincidentes con todos los resultados del filtro, no solo la página actual. Fecha, filtros, agrupación y columnas; sin botones ni cortes ilegibles. Comprobar vista de impresión y PDF del navegador.
- Cruce I-04: alta, modificación, reasignación, reprogramación, cancelación e impacto de calendario actualizan la consulta correspondiente y preservan historia/privacidad.

Cierre técnico: agenda/listados conectados a consultas acotadas del servidor, impresión completa verificada, contratos y evidencia actualizados. Aceptación manual pendiente del QA conjunto.

## Indicadores históricos y concurrencia · I-05.3–4

Corresponde a I-05.3–4. Implementar las fórmulas aprobadas en documentos 09/13 y DA-85; no rediseñarlas. Cálculos y agregaciones autoritativos en Java/PostgreSQL; React presenta resultados, filtros, unidades y gráficos B. Retirar la fuente simulada del recorrido operativo.

### Contratos

- Solo Admin/Bedel; Docente recibe rechazo de API, además de no acceder a la pantalla.
- Entrada: día, cuatrimestre o rango de fechas según vista; filtros de aula/tipo previstos en el diseño. Normalizar a fechas institucionales y devolver el rango y filtros efectivamente aplicados. Misma selección para numerador y denominador.
- Resumen: horas-aula reservadas, horas-aula habilitadas, ocupación (sin valor numérico cuando denominador cero), cantidad de clases y desgloses por aula/tipo pertinentes. Información de cobertura histórica conocida, sin inventar disponibilidad previa al primer intervalo.
- Día: franjas de 30 minutos con alumnos previstos y clases simultáneas, máximos independientes y todas las franjas donde ocurren; alumnos-hora.
- Semana típica: medias por día de semana/franja, número de fechas elegibles por día, comparaciones por día de alumnos-hora y clases; distinguir pico de curva promedio de pico de fecha concreta.
- Cero válido, cero horas habilitadas, ausencia de fechas elegibles y error técnico son estados diferentes. Conservar precisión de cálculo y redondear solo para presentación. Especificar rutas/DTO en OpenAPI antes del código.

### Historia y coherencia

Excluir detalles cancelados, usar fecha/aula efectiva de reprogramaciones y estado por ocurrencia. Una baja o cambio de tipo actual no reescribe el histórico; filtrar/desglosar por historia de tipo conforme al modelo, sin atribuir todo al tipo actual. Los módulos habilitados son completos de 30 minutos, con inicio incluido y fin excluido, cobertura conocida y tipo al inicio del módulo. Cambios de estado a las 10:10 no redondean el evento almacenado: habilitación permite módulos desde 10:30; inhabilitación solo hasta 10:00.

Ocupación total = suma de horas reservadas / suma de horas habilitadas, no media de porcentajes. Cierre administrativo del año no altera métricas; receso no elimina apertura institucional. Proyección futura usa último estado conocido mientras no haya otro cambio registrado y se presenta como previsión.

Semana típica incluye días elegibles con cero clases, aunque no haya aulas disponibles; excluye feriados y fechas fuera de apertura. Mostrar cantidad de fechas por día. No medir asistencia ni personas únicas, no deduplicar alumnos por comisión y no sumar franjas como si fueran individuos distintos.

### Casos numéricos de aceptación

Fixtures pequeños aislados, con resultados calculados independientemente de la implementación y conservando los ejemplos aprobados del prototipo:

| Caso | Resultado esperado |
|---|---|
| Dos clases simultáneas de 2 h en aulas distintas | 4 horas-aula reservadas |
| 2 h reservadas / 8 h habilitadas | 25 % de ocupación |
| A: 2/8 h; B: 0/2 h | Total 2/10 = 20 %, no 12,5 % |
| 30 alumnos 14–15 y 20 alumnos 14:30–15:30, aulas distintas | Franjas: 30/50/20 alumnos y 1/2/1 clases; 50 alumnos-hora |
| Clase de 30 alumnos durante 2 h | 60 alumnos-hora, no 60 personas |
| Cuatro lunes elegibles; una celda tiene 40, 0, 20, 0 alumnos | Media 15; denominador 4, incluyendo ceros |
| Un quinto lunes feriado | No se agrega al denominador anterior |
| Clase termina cuando otra empieza | No hay simultaneidad entre ambas |
| Sin horas habilitadas / sin fechas elegibles | «Sin horas habilitadas» / «Sin datos aplicables», sin porcentaje o media inventados |

Además: historial de habilitación/tipo/baja y cobertura parcial, cambios a minutos no alineados, año cerrado, receso, reprogramaciones y cancelaciones, filtros coherentes y empate de máximos. Los datos necesarios se crean al implementar cada cálculo, no al final de volumen.

### Verificación y cierre

Pruebas SQL/servicio/API con PostgreSQL aislado; contratos y permiso Docente; navegador con datos reales de API, cambio de filtros/respuestas tardías, fallos y estados sin datos; comparación de cifras contra tablas exactas y registros fuente. Inspección de curvas, mapa semanal, unidades, leyendas y rangos en escritorio/móvil según diseño aprobado. Probar que operaciones I-04 actualizan resultados sin contar canceladas ni duplicar orígenes. No extender a dashboard el umbral de altas/modificaciones que no le corresponde en los RNF.

Cierre técnico: todas las vistas de indicadores alimentadas por agregaciones persistentes, fórmulas/historia comprobadas y evidencia registrada. Aceptación manual sigue pendiente del QA conjunto.

## Volumen y regresión · I-05.5–6

Corresponde a I-05.5–6 y prepara I-06.3. Diferenciar tres conjuntos: ejemplos numéricos pequeños aislados, demo compartida ampliada y escenario sintético de rendimiento aislado. No confundir los tamaños aproximados de la demo con el protocolo RNF del documento 11.

### Demo ampliada

- Carga aditiva explícita, versionada y determinista, con claves estables/semilla y fechas de referencia. Objetivo inicial aprobado: al menos 3.000 clases adicionales distribuidas entre 2026 segundo, 2027 primero y anuales 2027, sobre catálogos existentes y sin solapamientos inválidos. El volumen no es un límite del producto.
- Distribuir horas pico/valles, tipos de aula, grupos, periódicas y esporádicas, receso, exclusiones, cancelaciones y reprogramaciones. Historial coherente de estado/tipo/cobertura; no alterar retrospectivamente aulas existentes para crear ejemplos históricos. Preparar ejemplos históricos especiales en fixtures aislados o referencias nuevas identificadas cuando sean necesarios.
- Mantener identidades y contenido de datasets I-03/I-04, reservas manuales/QA y año QA 2029. Antes de generar, inventariar también consultas de referencia y franjas propuestas para el QA: no basta con preservar filas si nuevas reservas impiden los recorridos previstos.
- Definir zonas/fechas de exclusión del generador a partir de guías existentes, especialmente alternativas periódicas de laboratorios, esporádicas de receso y recorridos manuales I-04. Verificar las mismas disponibilidades/rankings y pasos antes/después. No cerrar con escenarios previos inutilizados; si el plan de generación no cabe, ajustar su distribución, no borrar ni sobrescribir.
- Las métricas globales sí cambiarán al agregar volumen. Documentar nuevos totales y cifras por filtros estables, manteniendo cifras propias de cada dataset y los ejemplos exactos aislados. Emitir manifiesto con clases registradas/vigentes/canceladas, distribución, fechas clave y esperados calculados independientemente.
- Repetir carga no duplica ni restaura cambios manuales. Si faltan referencias, hay discrepancias o conflictos, informar y no dejar nuevas altas parciales. No cargar/restablecer al arrancar. Confirmar conservación mediante lecturas previas/posteriores y tests.

### Rendimiento: protocolo vigente, entorno separado

Mantener documento 11: 30 aulas (10 por tipo), dos años/dos cuatrimestres, 200 series por cuatrimestre, hasta 25.600 clases periódicas antes de omisiones y 500 esporádicas. Fechas coherentes con reloj de prueba, año histórico cerrado y operativo habilitado; no cerrar ni modificar los años compartidos para reproducirlo.

50 sesiones (45 Docente y 5 operativas), inicio escalonado 100 ms, 2 minutos de calentamiento tras activar todas y 10 de medición; ciclos/pesos y pausa de 5 s tras cada respuesta exactamente como la especificación. Preparar identidades/datos fuera de medición, no simular éxito de autorización. Registrar llamadas auxiliares y login/renovación separados según protocolo. Series/franjas propias por sesión y alternancia cuatrimestral/anual, sin conflictos nominales artificiales. Conflictos intencionales se prueban aparte.

Pruebas aisladas del proyecto demo compartido: PostgreSQL/identidades controladas para ensayo reproducible; documentar claramente qué proveedor/entorno de autenticación se empleó y qué parte se verificó con Supabase real. No extrapolar una medición local a Supabase remoto. Cualquier infraestructura externa o identidades remotas adicionales necesarias se concretarán antes de ejecutar, sin asumir acceso disponible.

Medir p95 por operación: disponibilidad/listados <1,5 s; altas/modificaciones periódicas <2 s. Registrar errores, tasa efectiva, tamaño, versiones, recursos, ubicación y latencia de red. No ocultar errores ni cambiar pausas/volumen para aprobar. Dashboard e impacto de calendario no heredan estos umbrales: medir comportamiento y validar función sin inventar RNF. Si un umbral no se cumple, registrar, analizar y corregir; no declarar cumplimiento sin evidencia ni modificar el requisito unilateralmente.

### Cierre y aceptación

I-05: carga y repetición verificadas, referencias I-04 preservadas, consultas paginadas y agregaciones acotadas, impresión >100 filas completa, cifras exactas con fixtures pequeños y cifras coherentes con volumen; regresión de operaciones/roles y revisión visual. Preparar guion de carga reproducible y medición de referencia. I-06.3 repite verificación final sobre el paquete/entorno declarado y registra resultados reales del protocolo completo.

Documentar los escenarios de QA por entrega y las cifras posteriores a volumen. Todo registro manual permanece pendiente hasta ejecución del usuario. No autoriza reset ni creación de infraestructura durante la planificación.

## Contratos y evidencia por subcorte

| Corte | Contrato a concretar antes del código | Pruebas/condición técnica de salida | QA final |
|---|---|---|---|
| I-05.1 | Agenda acotada; listados diario/curso con filtros, estado, orden, total y páginas; DTO por rol; actualización de consumidores del listado global | API/PostgreSQL y navegador: fechas/estados/permisos, páginas/empates, respuestas tardías, vacío/error; operación I-04 reflejada sin regresión | F02–03, F06–09 |
| I-05.2 | Datos completos de impresión diaria, filtros/orden coherentes y carga completa o error; interfaz de impresión navegador | Más de 100 filas, identidades/conteos exactos, sin duplicados, sin columnas privadas/controles; Chromium/Firefox | F04 |
| I-05.3 | Resumen/agregaciones históricas, cobertura, horas habilitadas/reservadas, desgloses y cero denominador | Tablas exactas independientes, tipo/estado histórico, fronteras 10:10, cobertura parcial, receso/año cerrado, filtros y permiso | F05 |
| I-05.4 | Franjas, máximos/empates, alumnos-hora, medias/fechas elegibles; quitar fuente simulada del recorrido | Ejemplos30/50/20, ceros y feriados, medias y picos distintos; curvas/mapa/errores/rangos correctos | F05, F07–09 |
| I-05.5 | Comando/versión/semilla/claves/manifiesto de volumen; aditivo y repetible; zonas excluidas de QA | Al menos 3.000 clases adicionales válidas, conservación de referencias/operabilidad, repetición sin duplicados y rechazo sin altas parciales | F02–05 |
| I-05.6 | Manifiesto de cifras/fechas/filtros del QA; guion de carga reproducible y evidencia | Cruces de operaciones I-04, volumen, privacidad, teclado/móvil y medición de referencia; registrar limitaciones | F02–10, F12 |

Los endpoints exactos no quedan impuestos por esta planificación: sus entradas/salidas y garantías sí. Documentar OpenAPI y comprobar consumidores antes de sustituir `/reservas` global; conservar contratos de detalle y recuperación de operaciones de I-04. No calcular totales paginando datos incompletos en React.

## Entregables y aceptación

Al ejecutar, crear `avance-i-05.md`, `datos-demo-i-05.md`, contratos OpenAPI y artefactos reproducibles de prueba/carga. Completar las referencias I-05 de la guía conjunta con IDs semánticos, fechas, filtros, cifras independientes y evidencia. No inventar valores de la demo que aún no existe.

Cierre técnico: seis subcortes verificados, revisiones resueltas y commits; consultas/impresión/indicadores persistentes y escenarios anteriores preservados. Estado: **implementada y verificada, pendiente de QA del usuario**. Mantener por separado el estado de I-04. El protocolo completo se repite con el paquete en I-06; un RNF incumplido se registra y no se declara aprobado por completar funcionalidad.
