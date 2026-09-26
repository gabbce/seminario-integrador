# Preparación de planes I-05, I-06 y QA final conjunto

**Estado al 26/09/2026:** planificación consolidada y aprobada, sin inicio ni autorización de implementación en esta conversación. I-04 implementada y verificada; QA y aceptación del usuario pendientes. El usuario solicitó validar estos planes por bloques y documentar los acuerdos. Los seis bloques fueron aprobados por el usuario el 26/09/2026. La aceptación de las implementaciones y la ejecución del QA continúan pendientes.

## Base comprobada

- [Integración](integracion.md) autoriza postergar el QA I-04 para un QA final conjunto, sin dar ninguna de las tres entregas por aceptada.
- `ReservationQueries.list` recupera todas las reservas y sus colecciones mediante consultas agrupadas. `OperationalApp` carga `/reservas`; `Listing` filtra y pagina en React y su impresión usa las filas cargadas. Esta solución mínima no es el contrato final de consultas paginadas del servidor.
- `Indicators` usa cálculos frontend; `OperationalApp` le entrega `scenario.bookings`, separado del dominio persistido. Conectar solamente ese array a la API no completa indicadores históricos ni agregaciones de servidor.
- I-04 aporta operaciones completas, origen de reprogramación, cancelaciones/continuidad e historial. Su [QA](qa-manual-i-04.md) y [dataset](datos-demo-i-04.md) son la base que se conserva, incluidos casos manuales y año QA 2029.
- Los comandos demo existentes cargan explícitamente, preservan registros y detectan discrepancias. No constituyen un restablecimiento destructivo autorizado.
- No se encontraron Dockerfile ni Compose en el inventario actual. La ejecución final acordada sirve React compilado y API Java desde un mismo origen, con PostgreSQL/Auth remotos.
- Hay cambios documentales locales previos a esta planificación. No se sobrescriben ni se interpretan como implementación nueva.

Fuentes de reglas: [consultas](../especificacion/08-consultas-y-comunicaciones.md), [indicadores](../especificacion/09-indicadores-y-horas-pico.md), [validación demo y carga](../especificacion/11-contexto-de-demo-y-validacion.md), [arquitectura](../especificacion/12-arquitectura-y-stack.md), [modelo](../especificacion/13-modelo-consolidado.md), [contratos](../especificacion/15-operaciones-y-contratos.md) y [operación](../especificacion/17-operacion-local-y-verificacion.md).

## Registro de aprobación por bloques

| Bloque | Tema | Estado |
|---|---|---|
| 1 | Alcance, secuencia y dependencias I-05/I-06 y aceptación conjunta | Aprobado · 26/09/2026 |
| 2 | Agenda/listados: contratos, paginación, estados, privacidad e impresión completa | Aprobado · 26/09/2026 |
| 3 | Indicadores: contratos, historia, denominadores, franjas, promedios y ejemplos exactos | Aprobado · 26/09/2026 |
| 4 | Dataset de volumen y preservación de escenarios; pruebas funcionales y de carga | Aprobado · 26/09/2026 |
| 5 | Compose, configuración y restablecimiento explícito de demo (dominio e identidades) | Aprobado · 26/09/2026 |
| 6 | QA manual conjunto: roles, datos, pasos, esperados, cobertura y aceptación por entrega | Aprobado · 26/09/2026 |

## Bloque 1 · Orden aprobado

### I-05

| Corte | Resultado aprobado | Dependencia |
|---|---|---|
| I-05.1 | Contratos y consultas de agenda/listados desde Java, filtradas por período/fecha/curso según vista, orden estable, paginación donde corresponde y DTO por rol; conectar React sin descargar todo el histórico | Base I-04 verificada |
| I-05.2 | Impresión del listado diario completo y filtrado, independiente de la página visible; PDF del navegador, sin exportador servidor | I-05.1 |
| I-05.3 | Indicadores persistentes de horas, ocupación y demanda por tipo; historia de aula, cobertura y denominadores coherentes | I-05.1 y fixtures pequeños exactos |
| I-05.4 | Concurrencia prevista por franja, máximos, alumnos-hora y semana típica para cuatrimestre/rango; retirar fuente simulada de indicadores | I-05.3 |
| I-05.5 | Ampliar demo a miles de clases y verificar consultas/indicadores/impresión con volumen sin invalidar escenarios existentes | I-05.1–4 |
| I-05.6 | Regresión cruzada con operaciones I-04, revisión visual y documentación de QA/valores de referencia | Todos |

Cada corte incluye contrato, backend/interfaz, pruebas y aceptación técnica. Los fixtures de cálculo y privacidad aparecen con la función correspondiente, no recién al generar volumen. Se preserva la especificación: agenda sin canceladas, listados con filtro por estado de ocurrencia, impresión diaria completa, indicadores solo Admin/Bedel, sin personas únicas ni métricas de conflictos.

### I-06

| Corte | Resultado aprobado | Dependencia |
|---|---|---|
| I-06.1 | Empaquetado reproducible con Compose, frontend compilado + Java bajo mismo origen, configuración privada y Supabase remoto; comprobar arranque/recarga/rutas | I-05 técnicamente verificada |
| I-06.2 | Comando explícito de restablecimiento demo con alcance aprobado y pruebas de repetición/seguridad; instrucciones de carga y recuperación de escenario | Dataset I-05 y decisión del bloque 5 |
| I-06.3 | Verificación final del paquete: navegadores, roles, concurrencia, regresión y protocolo de carga ya especificado | I-06.1–2 |
| I-06.4 | Guion de presentación, instrucciones y ejecución del QA manual final conjunto; registrar aceptación por entrega | I-06.3 y usuario para aceptación |

Restablecimiento no significa respaldo/restauración ni autoriza borrar el entorno compartido. El alcance exacto, preservación de identidades y casos manuales y entorno de ensayo se validarán en el bloque 5 antes de implementar. No se agrega hosting obligatorio ni infraestructura de producción.

### QA final conjunto

Preparar una única guía operativa con identificadores de caso y cobertura explícita I-04/I-05/I-06; reutilizar el detalle de QA I-04 sin perder casos. Separar recorrido de lectura/cálculos de las operaciones que alteran datos y del ensayo de restablecimiento. Registrar resultados y pendientes por entrega; una ejecución conjunta no implica aceptación automática de las tres.

El bloque 6 fijará roles, precondiciones/datos, pasos, resultados, evidencia y orden. No se declara ejecutado ningún caso por planificarlo. La verificación automatizada no se atribuye al usuario.

## Reglas ya aprobadas que no se reabren

- Ocupación histórica según habilitación/tipo/cobertura conocidos del aula, módulos completos de 30 minutos, sin reconstruir pasado desde el estado actual. Año CERRADO no elimina historia; receso no equivale a cierre institucional. Cero denominador no produce porcentaje.
- Semana típica incluye ceros de fechas elegibles, excluye feriados y divide por cantidad real de fechas equivalentes; no confundir pico promedio con pico de un día.
- Impresión de todas las filas del filtro diario, aunque superen 20/50/100 por página. Sin Excel ni PDF generado en Java.
- Prueba de carga según documento 11: 50 sesiones, 2 minutos de calentamiento y 10 de medición, ciclos y pausas definidos; no atribuir cumplimiento a una respuesta rápida ni extender umbrales a dashboard/impacto de calendario sin especificación.
- Datos ficticios 2026/2027, preservación de conjuntos I-03/I-04 y QA manual; Auth/DB remotos, internet requerido. No sembrar ni restablecer al arrancar.

Planes consolidados: [I-05](i-05-consultas-e-indicadores.md), [I-06](i-06-demo-y-validacion-final.md) y [QA final conjunto](qa-final-i-04-i-05-i-06.md). Este documento conserva el registro de acuerdos; los planes por entrega son la referencia para ejecutar. No iniciar implementación durante esta conversación de planificación.

## Bloque 2 · Agenda, listados e impresión (aprobado · 26/09/2026)

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

## Bloque 3 · Indicadores persistentes (aprobado · 26/09/2026)

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

## Bloque 4 · Datos de volumen y verificación (aprobado · 26/09/2026)

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

## Bloque 5 · Compose y restablecimiento (aprobado · 26/09/2026)

Corresponde a I-06.1–2. No introduce hosting obligatorio, respaldos ni instalación local de Supabase.

### Empaquetado y contrato operativo

- Un servicio de aplicación: build React servido por Spring Boot junto a `/api`, mismo origen. Construcción multietapa con versiones fijadas/lockfiles; no usar Vite dev como servidor final ni añadir servidor Node en ejecución.
- Compose construye/inicia/detiene ese servicio; PostgreSQL y Auth permanecen remotos. Puerto configurable, publicado en loopback para demo local; Java debe escuchar dentro del contenedor en la interfaz adecuada (actualmente application.properties usa 127.0.0.1). No romper el modo de desarrollo existente.
- Variables privadas del backend en configuración local ignorada por Git y provistas al contenedor, nunca en capas de imagen, bundle o logs. `.dockerignore` excluye .env, credenciales y evidencias privadas. Frontend incorpora únicamente URL/clave pública de Auth; documentar si cambiar estas requiere reconstruir la imagen.
- Conservar migraciones no destructivas al arrancar; ningún arranque/reinicio ejecuta carga o reset. Inicialización del Admin y cuentas demo sigue explícita y sin sobrescribir identidades. No ejecutar cambios sobre tablas internas de Auth.
- Instrucciones desde checkout limpio: configuración, build, arranque, salud, ingreso, recarga de rutas profundas, parada/reinicio, diagnóstico de puerto ocupado y conexión remota. Indicar dependencia de internet.
- Pruebas: build reproducible con dependencias fijadas, carga de assets sin CDN, `/api/health`, fallback de rutas de React sin interceptar errores API, roles y tokens, ausencia de secretos en bundle/imagen, reinicio conserva datos y modo Java+Vite sigue disponible.

### Restablecimiento aprobado: reservas de datasets seleccionados

Distinguir comandos de carga preservadores de un comando nuevo y explícito que devuelve reservas de un dataset gestionado a su definición original. Alcance acotado a claves registradas de I-03/I-04/I-05, seleccionadas explícitamente; no TRUNCATE global ni borrado/recreación del esquema. No cambiar el comportamiento de los seeds existentes.

- Preservar cuentas/perfiles, contraseñas y UUID de Auth; ninguna llamada destructiva a Auth. Preservar aulas, historia de aulas, materias/cursos y calendarios actuales. Preservar reservas manuales/QA ajenas al dataset y QA 2029.
- Las reservas gestionadas incluidas en el reset sí recuperan sus datos originales, deshaciendo modificaciones realizadas sobre ellas. Esto se advierte en la previsualización; mantener IDs de reserva/clases existentes cuando el escenario los conserva y documentar cualquier remapeo inevitable por claves semánticas. No dejar referencias huérfanas ni identidades reutilizadas incorrectamente.
- Preparar informe de destino, datasets/claves, diferencias y bloqueos sin escribir. Ejecutar solo en modo demo, con aplicación detenida para el procedimiento documentado, selección explícita y confirmación del alcance. Revalidar dentro de la transacción; detener si el estado cambió desde la revisión.
- Un calendario/aula modificado o una reserva manual ocupando un intervalo original puede impedir el reset. En ese caso informar dependencias y rechazar todo, sin corregir/eliminar datos ajenos ni restaurar calendarios silenciosamente.
- Mantener coherentes registros de dataset, operaciones recuperables y auditoría. Especificar manejo de resultados antiguos de operaciones para que no se repongan mutaciones anteriores tras un reset; el contrato técnico debe probarlo. Conservar la historia de acciones y registrar el restablecimiento explícito, sin fingir una reserva de nueva creación ni omitir trazabilidad técnica.
- El reset del alcance seleccionado es completo o no produce cambios; repetirlo deja el mismo estado funcional y no duplica. Reloj histórico demo limitado al comando, sin habilitar mutaciones retroactivas de la API.
- Ensayar primero y de forma automatizada sobre PostgreSQL aislado con el mismo esquema/servicios; no ejecutar reset sobre el proyecto compartido como consecuencia implícita de aprobar un plan o de iniciar pruebas. Antes de una ejecución remota, presentar el destino y alcance concreto para la autorización correspondiente.

El resultado es recuperación de escenarios gestionados, no un clon exacto de toda la base: los registros manuales preservados pueden alterar los totales globales. Los esperados se vinculan al manifiesto/dataset y filtros; no prometer totales globales originales tras conservar datos adicionales. Una preparación desde entorno vacío utiliza las cargas explícitas normales, no necesita borrar Auth.

### Pruebas y aceptación

Compose: app accesible por un origen, mismo comportamiento y permisos, recarga de rutas, arranque/parada/reinicio sin pérdida ni recarga automática. Reset: previsualización sin escritura, selección exacta, rechazo fuera de demo, preservación de cuentas/QA/calendarios, recuperación de escenario gestionado modificado, conflicto con reserva ajena sin borrarla, fallo inducido con rollback, repetición sin duplicados y tratamiento seguro de operaciones antiguas. Evidencia y comandos para el QA final; ninguna ejecución se da por realizada al planificar.

## Bloque 6 · QA final conjunto (aprobado · 26/09/2026)

Plan aprobado en [QA final conjunto](qa-final-i-04-i-05-i-06.md). Orden: preparación/arranque, lectura de escenarios existentes, consultas/impresión/indicadores de referencia, operaciones nuevas de QA y comprobación de efectos, impacto de calendario dedicado, presentación y restablecimiento ensayado en entorno aislado. Preservar cobertura de cada sección de QA I-04 y aceptación separada de I-04/I-05/I-06.

Usar Chromium/Firefox con versiones registradas, escritorio 1366×768 y consultas Docente 390×844, teclado y revisión visual. Dos sesiones independientes para permisos/concurrencia. Pruebas temporales difíciles, fallos de persistencia/red y carga se acreditan por evidencia automatizada independiente, no se piden caídas deliberadas de Supabase ni modificar el reloj real.

Preparar un manifiesto con identificadores semánticos/IDs resueltos, fechas/filtros, cifras esperadas calculadas independientemente, entorno/commit y precondiciones. I-05/I-06 deben completarlo antes de entregar QA; el usuario no tiene que inventar resultados. Operaciones de QA en cursos/reservas propios; conservar datasets de referencia. Cada caso registra pendiente/aprobado/fallido/bloqueado/no ejecutado, rol, navegador, datos y evidencia; nunca inferir aceptación de una prueba automatizada.

El QA conjunto tiene pruebas compartidas y cobertura por entrega; una incidencia puede bloquear una o varias sin aceptar automáticamente ninguna. Tras corregir, repetir casos afectados y dependientes. Solo el usuario acepta cada entrega. Aprobar este bloque aprueba planificación, no ejecución ni reset remoto.
