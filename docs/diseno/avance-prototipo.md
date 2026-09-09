# Avance del prototipo navegable

Objetivo activo: completar P-01 a P-06 del [plan aprobado](prototipo-navegable.md), manteniendo datos simulados y esqueleto Java/Spring Boot. Cada subcorte se revisa visualmente, se prueba y se guarda en un commit antes de continuar. No integrar todavía Supabase ni desplegar.

## Cortes

| Corte | Estado | Alcance y comprobación |
|---|---|---|
| Base | Commit `d6f0b93` | React B, agenda, roles ficticios, primera periódica, Spring Boot. 4 pruebas de dominio y 3 E2E; revisión visual escritorio/móvil. Corregida pérdida de aulas al volver a datos. |
| Períodos y exclusiones | Implementado, validado | Primer/segundo cuatrimestre y anual, omisión del pasado/receso/feriados, exclusiones explícitas, inicio+duración con fin calculado, detalle de omisiones en revisión. 7 pruebas unitarias y 5 E2E. |
| Alternativas y conflictos | Implementado, validado | Aulas ordenadas por capacidad/ID, primeras tres y ver todas, ranking por modalidad/fechas/minutos, detalle y contactos ficticios. 11 pruebas unitarias y 7 E2E. |
| Catálogo y equipamiento | Implementado, validado | Cursos reutilizables con código generado, comisión/año y requisitos de recursos. 14 pruebas unitarias y 8 E2E; compilación y lint correctos. |
| Esporádicas | Implementado, validado | Fechas independientes, aula por fecha, validaciones y confirmación completa. 16 pruebas unitarias y 9 E2E. |
| Consulta de disponibilidad | Implementado, validado | Criterios compartidos, solo lectura para Docente y continuidad a registro para operadores. 16 pruebas unitarias y 11 E2E. |
| Listados e impresión P-03 | Implementado, validado | Día/curso, filtros por ocurrencia, 20/50/100, impresión completa. 18 pruebas unitarias y 13 de navegador. |
| Agenda semanal P-03 | Implementado, validado | Semana con filtros, días cerrados diferenciados y acceso diario móvil. 20 pruebas unitarias y 14 E2E. |
| Cancelación P-03 | Implementado, validado | Selección futura, motivo, historial, liberación de aulas y cese de continuidad. 23 pruebas unitarias y 15 E2E. |
| Cambio de aula P-03 | Implementado, validado | Futuras del patrón o fecha esporádica; comparación y disponibilidad conjunta. 27 pruebas unitarias, 16 E2E. |
| Reprogramación P-03 | Implementado, validado | Una o varias fechas con aula conservada, revisión previa y guardado conjunto. 30 pruebas unitarias, 17 E2E. |
| Datos compartidos P-03 | Implementado, validado | Curso/docente/alumnos/requisitos antes del inicio, revalidación e historial. 33 pruebas unitarias, 18 E2E. |
| Inventario de aulas P-04 | Implementado, validado | Alta, edición, baja, filtros, historial e integración de disponibilidad. 37 pruebas unitarias, 19 E2E. |
| Cuentas P-04 | Implementado, validado | Alta/perfiles, estados, búsqueda/orden/paginación, contraseña y último Admin. 39 pruebas unitarias, 20 E2E. |
| Calendario e impacto P-04 | Implementado, validado para 2026 | Cuatrimestres y fechas no lectivas compartidos; extensión atómica de series. 43 pruebas unitarias, 21 E2E. |
| Ciclo de años P-04 | Implementado, validado | Alta/estados y eliminación protegida; reservas y cursos por año, traspaso desde disponibilidad. 48 pruebas unitarias y 22 E2E. |
| Indicadores diarios P-05 | Implementado, validado | Cálculos históricos, filtros, curvas Chart.js y tabla de 32 franjas. 54 pruebas unitarias y 23 E2E. |
| Semana típica y rangos P-05 | Implementado, validado | Medias por fecha elegible, mapa seleccionable, comparación y filtros. 59 pruebas unitarias y 24 E2E. |
| Escenarios P-06 | Implementado, validado | Selector/reinicio, ejemplos exactos diario/semanal, histórico, vacíos y muchas aulas. 61 pruebas unitarias y 25 E2E. |
| Recuperación de consultas y sesión P-06 | Implementado, validado | Error/reintento/demora de indicadores, expiración y versión de reserva. 61 unitarias y 27 E2E. |
| Recuperación de reserva P-06 | Implementado, validado | Consulta/error, espera de guardado, fallo y comprobación de resultado incierto. 61 unitarias y 28 E2E. |
| Validación P-06 | Pendiente | Estados completos, escenarios, impresión extensa, teclado/zoom/móvil y consistencia entre vistas. |

## Revisión visual del corte de períodos

Referencia: `mockups/flujo-periodico-b/01-datos.png`, con las correcciones del README. Capturas reproducibles: `frontend/evidence/exclusiones-desktop.png` y `exclusiones-mobile.png` (ignoradas por Git). Inspeccionadas junto a la referencia.

- Se conservan paleta, tipografía, barra superior, tres pasos y resumen lateral/apilado.
- Inicio y duración son entradas; finalización es un valor calculado, conforme al recorrido aprobado.
- El selector reúne los tres períodos del año de demostración. Otros años se incorporan al preparar administración.
- «Revisar fechas y exclusiones» abre una lista con desplazamiento; distingue cada omisión por motivo.
- En móvil se apilan campos y resumen; la prueba no detecta desbordamiento horizontal a 390 px y completa la confirmación de 25 clases.
- La revisión final incluye fechas registradas y omitidas en desplegables separados. No hay selección de aula por fecha.

La fidelidad completa de las pantallas pendientes no está aprobada por estas comprobaciones. El diseño y alcance originales siguen vigentes.

## Revisión visual del corte de conflictos

Referencia: `mockups/v2/b-seleccion-aula.png`. Capturas reproducibles `frontend/evidence/conflictos-desktop.png` y `conflictos-mobile.png`, inspeccionadas en navegador y como imágenes junto al mockup.

- Aviso terracota y texto «Requieren resolver conflictos» separan opciones informativas de aulas seleccionables.
- Detalle identifica curso, reserva, modalidad, fecha, horario e interferencia, además de contactos ficticios de docente y registrador para operadores.
- Se conserva resumen lateral y se apila en móvil. Corregida compresión del texto de aula por el estado de disponibilidad en pantallas estrechas.
- Se inhabilita revisar mientras falta aula para algún patrón. Ninguna alternativa ocupada incluye selector ni acción para modificar reservas.
- Corregida pérdida visual de la cuarta opción elegida al contraer o volver desde revisión; se mantiene visible y marcada. E2E específico verifica ambos caminos.
- El escenario visual usa General/108 bloqueada un lunes por Historia; no duplica literalmente datos ilustrativos del mockup. El orden entre múltiples aulas y la unión de minutos se verifican con pruebas unitarias.

Pendientes del flujo completo: catálogo, equipamiento, consulta independiente y esporádicas. No se declara cerrado P-02.

## Revisión visual del corte de catálogo y equipamiento

Referencia `mockups/flujo-periodico-b/01-datos.png`. Capturas `frontend/evidence/catalogo-desktop.png` y `catalogo-mobile.png` inspeccionadas junto a la referencia. Se mantiene formulario único, resumen B y adaptación a una columna. El catálogo reemplaza entradas libres de materia/identificador por curso seleccionable y creación contextual; el código no se pide al usuario. La creación está limitada al año 2026 de la demo hasta completar administración.

Recursos comunes y de Multimedios son seleccionables; cantidad de PC sigue fuera de los filtros. El resumen conserva lo solicitado. E2E crea `001-B-2026` reutilizando Matemática I y confirma con proyector, verificando que Aula 204 no aparezca. La disponibilidad y la validación final comparten criterios. Crear/reutilizar cursos no reinicia la preparación activa.

Siguiente: esporádicas y disponibilidad independiente; después las operaciones y demás paquetes pendientes de la tabla. El objetivo completo sigue abierto.

## Revisión visual del corte de esporádicas

Comparadas referencia `mockups/flujo-esporadico-b/01-datos.png` y capturas reproducibles `frontend/evidence/esporadica-desktop.png` / `esporadica-mobile.png`. La modalidad comparte datos y pasos con periódicas, pero la selección es por fecha y la reserva guardada carece de patrón semanal. Se compactaron filas de fecha/inicio/duración en escritorio; móvil apila campos sin desbordar. La finalización se calcula y los textos distinguen fechas puntuales de un cuatrimestre.

E2E confirma 14/09 14–16 en 203 y 21/09 16–17:30 en 105, vuelve desde revisión sin perder elecciones y comprueba dos clases en detalle. Pruebas de fechas cubren duplicados, feriados, fines de semana, pasado, fecha inválida, apertura y una fecha fuera de cuatrimestres. La confirmación repite validación antes de guardar todo el conjunto. Compilación y lint correctos.

La consulta independiente todavía está pendiente; P-02 no se declara completo. Más escenarios de fallo y revisión exhaustiva de tamaños forman parte de P-06.

## Revisión visual del corte de disponibilidad independiente

Capturas `frontend/evidence/consulta-desktop.png` y `consulta-mobile.png` revisadas con la referencia B de selección y conflictos. Se conserva el mismo lenguaje visual y los resultados por patrón/fecha. La consulta presenta dos pasos, omite datos de curso/docente y no ofrece radios de selección; la cabecera del resumen se ajustó a «Criterios consultados».

E2E verifica ausencia de emails/registrador y acciones de registro para Docente. Bedel conserva modalidad, requisitos y fechas al preparar una reserva; salir y empezar otra no reutiliza esa preparación. La consulta no guarda ni ocupa aulas. Las claves de cada recorrido aíslan sus estados y los criterios transferidos se consumen al abrir el registro.

Los recorridos principales de P-02 están implementados. Quedan la operación P-03, administración P-04, indicadores P-05 y la validación integral/estados P-06, además de la revisión global de fidelidad. Compilación, lint y pruebas correctos; el objetivo completo continúa activo.

## Revisión visual de listados e impresión

Referencia `mockups/listados-b/01-listado-diario.png`. Capturas `frontend/evidence/listado-desktop.png`, `listado-mobile.png`, `listado-impresion.png` y PDF `listado-25.pdf` reproducibles con Playwright. Se conservan colores B, panel de filtros y paginación; la tabla presenta tipo como columna con filas agrupadas en el orden y combina curso/docente. En móvil hay desplazamiento horizontal explícito y filtros apilados.

La prueba de impresión carga el componente real mediante Vite SSR con 25 clases de horarios contiguos, comprueba 20 filas en pantalla y 25 en el medio print, oculta controles y genera PDF A4 horizontal. La prueba de la app comprueba filtros, cambio por curso y llamada al diálogo de impresión. El PDF se genera con Chromium; la revisión de saltos y otros navegadores forma parte de P-06.

La impresión conserva fecha y filtros; nunca incluye emails. Filtrar canceladas opera sobre cada ocurrencia. Las operaciones de cancelación se incorporarán en el siguiente bloque. Compilación y lint correctos.

## Revisión visual de agenda semanal

Referencia de lenguaje visual: `mockups/operacion-diaria-b/01-agenda.png`. La semana es una extensión de esta agenda: cinco columnas de días y tarjetas cronológicas (la altura no representa duración), con los mismos colores, tipografía, navegación y filtros. Capturas `frontend/evidence/semana-desktop.png` y `semana-mobile.png` revisadas. El contenedor admite desplazamiento horizontal indicado en el texto, mientras que «Ver día» mantiene disponible la agenda diaria móvil sin perder filtros.

Pruebas verifican cálculo de semana incluso al cruzar año, filtros por tipo, exclusión de canceladas en código de ambas vistas y aviso de feriado. Las reservas provienen del estado compartido; no se crean datos de una segunda agenda. Compilación y lint correctos.

Sigue pendiente aplicar estado de aula cuando se incorpore administración, además de operaciones, indicadores y revisión integral. No se declara terminado el objetivo.

## Revisión visual de cancelación

Comparadas referencia `mockups/operacion-diaria-b/04-cancelar.png` y capturas `frontend/evidence/cancelacion-desktop.png` / `cancelacion-mobile.png`. Dos paneles para selección y motivo/resumen, apilados en móvil; acción de cancelación en terracota. Corregida herencia de disposición vertical en casillas para conservar filas compactas. Se usa cabecera textual compacta en lugar de la banda ilustrativa del mockup. Las acciones quedan junto al resumen.

Cancelación de una, varias o todas las futuras, motivo obligatorio, registro del actor y momento, estado derivado e historial por ocurrencia. Las pruebas verifican rechazo íntegro por pasado/inicio exacto, versión vieja, rol Docente, motivo vacío o cancelación previa. Al cesar todas las futuras de una periódica se conserva la intención de cese para la futura reconciliación de calendario. La app comparte el resultado con agenda y listados; E2E verifica desaparición de la ocupación y consulta por filtro canceladas. El reloj sigue siendo el de la demo; controles de escenarios temporales se completan en P-06.

Revisiones independientes de especificación y estándares sin hallazgos. Build, lint, 23 pruebas unitarias y 15 de navegador correctos. Próximo corte: edición y reprogramación. Administración, indicadores y validación global continúan pendientes.

## Revisión visual del cambio de aula

Referencia `mockups/operacion-diaria-b/03-modificar.png`; capturas `frontend/evidence/cambio-aula-desktop.png` y `cambio-aula-mobile.png`. Conserva grupos semanales, comparación actual/nueva aula, candidatas válidas para todas las fechas, desplegable de fechas y acciones de guardar/descartar. Móvil apila comparación y opciones sin desbordar. Cabecera compacta conforme al resto del prototipo; no se inventan edificios/pisos ausentes en los datos actuales.

Cambio conjunto del patrón y sus futuras vigentes; conserva otras clases, pasado y canceladas. Esporádicas operan por fecha. Al guardar se revalidan versión, permiso, alcance temporal, requisitos y ocupación. Queda historial del cambio visible a operadores. E2E cambia 12 lunes a 301, conserva 14 miércoles en 105 y cancela luego sin duplicar historial. Se corrigió una duplicación del historial detectada por ambas revisiones independientes. Reprogramaciones y edición de datos compartidos siguen pendientes; todavía no se declara cerrado P-03.

## Revisión visual de reprogramación

Referencia `mockups/listados-b/04-reprogramar.png`, capturas `frontend/evidence/reprogramacion-desktop.png` y `reprogramacion-mobile.png`. Comparación Antes/Después, aula conservada, disponibilidad comprobada antes de revisión y nuevamente al guardar. La selección permite varias clases y separa preparación/revisión para mostrar el alcance completo; la pantalla del mockup ilustra una sola. Paneles apilados en móvil sin desbordar.

Preserva fecha original en periódicas, incluso después de varias reprogramaciones, y usa esa procedencia para el cambio de aula del grupo original. Fechas dentro del período asignado, horarios de apertura, feriados, protección temporal y conflictos se verifican para todo el conjunto. La auditoría conserva fechas y horarios anteriores/nuevos. E2E mueve lunes al martes y cambia después el aula de los 12 lunes originales. Pruebas unitarias cubren repetición, restricciones, versión, rol y rechazo completo por conflicto. Datos compartidos, administración, indicadores y validación global siguen pendientes.

## Revisión visual de datos compartidos

Referencia de formulario `mockups/flujo-periodico-b/01-datos.png`, reutilizando CoursePicker y requisitos. Capturas `frontend/evidence/datos-reserva-desktop.png` y `datos-reserva-mobile.png`. Formulario y panel de alcance, apilados en móvil; equipamiento compacto en dos columnas de escritorio. No modifica modalidad, fechas ni períodos desde esta operación.

Curso/comisión, docente/contacto, alumnos, tipo/pizarrón/recursos se actualizan juntos y quedan auditados. Todas las aulas vigentes deben seguir cumpliendo el pedido. Ninguna ocurrencia puede haber comenzado, incluidas las canceladas; además se valida versión y rol. E2E rechaza 41 alumnos en 105, permite corregir a 30 y cambia curso/docente/proyector conservando aula. Se añadieron nombres accesibles explícitos a selectores. Revisiones independientes sin hallazgos. Los recorridos principales de P-03 están implementados; falta su validación integral de escenarios P-06. Próximo bloque: administración P-04.

## Revisión visual de inventario de aulas

Referencia `mockups/administracion-b/01-aulas.png`; capturas `frontend/evidence/aulas-desktop.png` y `aulas-mobile.png`. Inventario y edición en dos paneles de escritorio, formulario primero en móvil. Filas compactas con botón explícito reemplazan la tabla ilustrativa. Ubicación se carga como texto y piso entero, sin ABM de edificios. Recursos y pizarrón disponibles como filtros; PC solo descriptivas del laboratorio. Los datos de edificio/piso iniciales son ficticios.

Inventario compartido mediante contexto React; funciones de validación reciben el conjunto actualizado. Altas crean cobertura histórica desde el reloj de la demo; fixtures tienen cobertura conocida desde enero de 2026. Cambios de estado/tipo generan historial. Baja lógica exige confirmación, conserva identidad y no admite restaurar/reutilizar. Capacidad, estado y recursos protegen futuras/en curso. Agenda indica aulas no reservables; consultas y mutaciones respetan estado. Listados conservan el tipo solicitado de la reserva, sin reclasificar canceladas al editar inventario.

E2E rechaza reducción de 105, crea S01 con piso negativo, la ofrece en disponibilidad y la retira al pasar a mantenimiento. Unitarias cubren bajas, identidad, cobertura y reservas en curso. Se corrigió reclasificación histórica detectada por revisión independiente. Cuentas, calendario, indicadores y validación global siguen pendientes.

## Revisión visual de cuentas

Referencia `mockups/administracion-b/02-usuarios.png`, capturas `frontend/evidence/cuentas-desktop.png` y `cuentas-mobile.png`. Lista y formulario en paralelo; formulario primero en móvil. Filas con acción Editar explícita, nombre accesible con correo, filtros por nombre/correo/rol/estado, orden por apellido o correo y páginas de 20. Se identifica el último Admin activo. Las pestañas con calendario se incorporan en el siguiente corte.

Identidad estable por ID, alta y modificación de nombre/apellido/email/rol/perfil, deshabilitar/rehabilitar y contraseña elegida/confirmada por Admin. Reservas conservadas, contactos de registrador actualizados por ID y auditoría de cambios con identidad del operador. Docentes del catálogo académico siguen independientes de cuentas. Login utiliza perfiles actuales; rol/estado afectan acceso. E2E protege último Admin, crea docente, cambia contraseña, rechaza clave anterior y entra con permisos de consulta.

`mock-auth.ts` es un adaptador ficticio de credenciales en memoria, separado del modelo Usuario, sin persistencia ni servicios externos. La mínima longitud de seis caracteres simula una respuesta de proveedor para la demostración; no añade política definitiva al producto ni sustituye Supabase Auth. No hay temporizador de inactividad ni cambio obligatorio. Integración real y secretos quedan fuera del prototipo. Revisiones independientes sin hallazgos; calendario, indicadores y P-06 pendientes.

## Revisión visual de calendario e impacto

Referencias `mockups/administracion-b/03-calendario.png` y `04-impacto.png`; capturas `frontend/evidence/calendario-desktop.png` / `calendario-mobile.png`. Paneles de cuatrimestres y fechas no lectivas, con revisión del impacto antes de confirmar. Las clases nuevas se muestran debajo de la preparación; móvil apila paneles. Controles nativos de fecha usan el formato del navegador. La lista de años/estados es el siguiente subcorte.

Calendario compartido entre registro, exclusiones, agenda y reprogramación. Cambiar cuatrimestres, agregar/describir/quitar fechas exige revisión y confirmación; fechas pasadas protegidas y recortes no dejan clases registradas fuera. Ampliaciones y feriados eliminados generan solo nuevas fechas futuras, preservando exclusiones, canceladas, excepciones reprogramadas y cese de continuidad. Verificación de aula, recursos y conflictos antes de devolver calendario/reservas juntos. La confirmación revalida versiones del calendario y reservas.

E2E bloquea fecha no lectiva con clases, quita octubre y amplía segundo cuatrimestre hasta 23/12: agrega tres y conserva la serie de 29. Unitarias cubren límites y rechazo íntegro por conflicto. Revisiones independientes sin hallazgos. Todavía faltan ciclo de años, indicadores y validación global P-06; no se declara cerrado P-04.

## Revisión visual del ciclo de años

Referencia `mockups/administracion-b/03-calendario.png`, capturas `frontend/evidence/anios-desktop.png` y `anios-mobile.png` inspeccionadas. Selector de año y alta en un panel, estado explícito y edición de cuatrimestres/fechas en los paneles existentes. Móvil apila los controles sin desbordamiento; se mantiene el lenguaje B con formularios en lugar de la tabla ilustrativa.

Los años nacen en preparación; habilitar requiere ambos cuatrimestres y cerrar exige no tener clases vigentes futuras/en curso. Cerrados son de consulta; eliminación exige preparación vacía y sin dependencias. Quitar cuatrimestres conserva dependencias históricas. Reserva, consulta, cursos, agenda y reprogramación usan el calendario correspondiente, incluyendo semanas entre años. El traspaso desde disponibilidad inicializa el curso del año consultado, corregido tras revisión independiente y cubierto por E2E.

Pruebas cubren crear/habilitar 2027, reservar con curso 001-A-2027, continuidad desde consulta, cierre protegido y conservación de 2026. Build y lint correctos. Revisiones de especificación y estándares sin hallazgos pendientes en este corte. Indicadores P-05 y validación integral P-06 continúan pendientes.

## Revisión visual de indicadores diarios

Referencia `mockups/indicadores-guia-b/01-indicadores-dia.png` y sus correcciones escritas. Capturas `frontend/evidence/indicadores-dia-desktop.png` / `indicadores-dia-mobile.png`, inspeccionadas con gráficos cargados. Tres tarjetas (sin Aulas abiertas), curvas escalonadas separadas, alumnos-hora, demanda por tipo y tabla accesible con 32 franjas. Se redujeron etiquetas del eje horizontal para evitar superposición móvil; las 32 franjas siguen disponibles. Chart.js se carga al abrir indicadores.

Los valores se calculan de reservas/aulas/calendarios compartidos. El escenario inicial conserva cuatro clases y seis aulas: 6,5 h, 6,8 %, 252 alumnos-hora. La prueba unitaria independiente del ejemplo aprobado usa cinco clases/cuatro aulas y obtiene 8,5 h, 13,3 %, 312 alumnos-hora. El selector de escenarios exactos se incorpora en P-06, sin mezclar ambos conjuntos.

Denominador por módulos completos e historial de aula; tipo al inicio, sin depender del estado administrativo del año ni excluir receso. Canceladas no suman; cero, sin horas y cobertura desconocida se distinguen. Eventos con mismo instante conservan el último, incluyendo continuidad. Se corrigió también el escalón temporal para no adelantar valores media hora. Revisiones independientes sin hallazgos pendientes en este corte.

E2E verifica datos actuales, filtros, fechas vacías/no lectivas, tabla, móvil y bloqueo de ruta para Docente. Compilación y lint correctos. Semana típica, rangos, selección de franjas y estados simulados completos siguen pendientes; no se declara cerrado P-05 ni el objetivo.

## Revisión visual de semana típica y rangos

Referencia `mockups/indicadores-guia-b/02-semana-tipica.png` con correcciones escritas: mapa de 32 medias horas por día, barras de alumnos-hora y demanda por tipo. Capturas `frontend/evidence/indicadores-semana-desktop.png` y `indicadores-semana-mobile.png` revisadas. El mapa se desplaza horizontalmente con los nombres de días fijos; foco, clic y toque muestran ambos valores y fechas aportantes. Corregido desbordamiento móvil de etiquetas accesibles. La comparación se presenta debajo del mapa para dar espacio a sus columnas.

Período rápido por cuatrimestre/año o rango personalizado, conservando filtros. Las medias incluyen días elegibles con cero clases y sin aulas; feriados excluidos, estado de año ignorado. Se distingue pico de curva promedio y máximo de una fecha. Totales dividen sumas de horas. Rangos inválidos retiran los resultados; rangos sin calendarios señalan cobertura desconocida y no recorren años sin datos. Prueba del límite 9999 evita desbordamiento de fecha/bucle.

El ejemplo semanal independiente obtiene 108 horas, 54 clases, 4.352 horas habilitadas y 2,5 %. Doce lunes y catorce de los demás días; medias de alumnos-hora 60/72/60/72/0. La app sigue mostrando su estado compartido, no esos valores fijos. Selector de escenarios, selección de franja diaria, fallos/carga y auditoría completa siguen pendientes de P-06. Compilación/lint y revisiones independientes correctas; objetivo activo.

## Escenarios reproducibles

Selector al pie, fuera de navegación operativa y oculto en impresión. Reinicia estado completo, credenciales y sesión mediante remontaje; no persiste. [Instrucciones y recorridos](escenarios-demo.md). Capturas `frontend/evidence/escenario-diario.png`, `escenario-semanal.png` y `escenarios-mobile.png`, inspeccionadas junto a los mockups ya referenciados. Los gráficos muestran ahora también los ejemplos exactos aprobados desde el estado compartido.

E2E cambia escenarios sin recargar, verifica agenda/métricas y entra a la serie con reloj adelantado. Se corrigió Hoy para usar el reloj institucional simulado. Unitarias comprueban aislamiento de datos y protección temporal. Build y lint correctos. Las revisiones independientes detectaron únicamente el literal de Hoy, corregido y cubierto. Todavía faltan simulación de errores/concurrencia/sesión, selección diaria de franja y validación global de P-06; objetivo activo.

## Recuperación de consultas, sesión y versión

Patrón visual `mockups/ingreso-movil-estados-b/04-error-consulta.png`, adaptado al área de indicadores. Capturas `frontend/evidence/error-consulta-desktop.png`, `error-consulta-mobile.png` y `sesion-vencida.png` inspeccionadas. Panel con mensaje y reintento conserva filtros; se omite la ilustración de nube. Login reutiliza el formulario con aviso de expiración.

Temporizador cancelable por criterios y revisión de simulación; respuestas anteriores no se muestran para otro filtro. E2E verifica reintento sobre Lab 2, cambio a día sin clases durante demora, expiración con reserva conservada y rechazo de cabecera con versión vieja. No se simulan garantías de red. Revisiones independientes sin hallazgos. Selección diaria de franja incorporada con clic/toque en curvas y selector accesible: el ejemplo de 14:00 muestra 126 alumnos y 3 clases, cubierto por E2E.

Build/lint y pruebas correctos. Continúan pendientes consulta/guardado de Wizard, respuesta incierta, auditoría integral de UX y accesibilidad/impresión. El objetivo sigue activo.

## Recuperación de consulta y guardado de reserva

Referencia `mockups/ingreso-movil-estados-b/04-error-consulta.png`. Capturas `frontend/evidence/disponibilidad-fallida.png`, `guardado-incierto-desktop.png` y `guardado-incierto-mobile.png` inspeccionadas. Se conserva resumen lateral y preparación; error en el área de resultados y avance deshabilitado. Resultado incierto usa un panel con ID y comprobación explícita. Móvil mantiene acciones legibles sin desbordamiento.

Consulta reutiliza invalidación por criterios. Guardado espera 600 ms, bloquea doble envío, cancela continuidad al desmontar y revalida con los datos actuales. App verifica además conflictos y duplicados. El ID se conserva desde el comienzo de la preparación; resultado incierto consulta el registro por ese ID sin reenviar. E2E recorre consulta fallida, guardado fallido, comprobación incierta y una sola instancia en agenda. Revisiones independientes sin hallazgos; build/lint correctos.

Sigue pendiente auditoría integral P-06: contraste, teclado/zoom, alcance de listados extensos, navegación y requisitos completos. Este corte no declara el objetivo terminado.


## Auditoría inicial de navegación y accesibilidad

El ingreso abre la agenda del día simulado, también después de cerrar sesión desde otra pantalla. La fecha elegida permanece al navegar y volver; una reserva inexistente ofrece una salida al listado. La grilla de escritorio admite foco y anuncia su desplazamiento, sin mostrar esa indicación en la lista móvil.

Axe no detectó infracciones WCAG A/AA automáticas en ingreso y nueve páginas principales a 390, 768 y 1440 px; ninguna produjo desbordamiento del documento. Esto no certifica accesibilidad completa. Prueba de teclado verifica ingreso, foco visible, Hoy, regreso de navegación y nueva sesión. Suite: 61 unitarias y 32 E2E, con la prueba de teclado repetida satisfactoriamente tras corregir su simulación de foco. Build/lint y prueba Maven del contexto Spring Boot correctos.

Capturas de 768 px en `frontend/evidence/audit--*.png`; inspección visual de agenda, administración y preparación de reserva. Formularios nativos conservan el formato que determine el navegador. Las revisiones independientes identificaron pendientes concretos: ordenar/paginar aulas, conservar la fecha de ocurrencia al abrir detalle y mostrar las fechas afectadas por conflictos de confirmación. Ingreso a agenda corregido en este corte.

P-06 continúa: revisar formularios abiertos y estados, zoom 200 %, impresión extensa, consistencia después de modificaciones y comparación completa con las correcciones aprobadas. No se declara terminado el prototipo.

## Inventario extenso: orden y paginación

Corregido el pendiente del README de administración: orden por identificador (numérico natural), capacidad, tipo o estado, ascendente/descendente, y páginas de 20/50/100. Filtrar, cambiar orden o tamaño vuelve a la primera página; si una edición reduce resultados, se muestra una página válida.

E2E con 30 aulas comprueba ambas páginas, filtro desde la segunda, orden descendente, cambio de tamaño y ausencia de resultados. Capturas `frontend/evidence/aulas-paginacion-desktop.png` y `aulas-paginacion-mobile.png` inspeccionadas: controles y filas legibles, paginación adaptada sin desbordamiento móvil. Axe móvil sin infracciones automáticas; build/lint correctos. Continúan los demás pendientes de la auditoría P-06.

## Fecha consultada desde agenda

Agenda diaria (grilla y lista móvil) y semanal llevan fecha/horario al detalle mediante la URL. El detalle identifica la clase consultada, enlaza a su fila y conserva todas las clases de la serie. Los parámetros solo identifican ocurrencias existentes; no alteran el alcance de operaciones.

E2E comprueba las tres entradas y la selección de una fecha posterior dentro de una serie de 26 clases. Capturas `frontend/evidence/detalle-fecha-desktop.png` y `detalle-fecha-mobile.png` inspeccionadas; se corrigió la separación del rótulo y la fecha tras la primera inspección. Build/lint correctos. Continúan pendientes conflictos de confirmación con fechas y la validación integral P-06.

La revisión independiente detectó una ambigüedad al reprogramar hacia la fecha/hora de una clase cancelada. El detalle prioriza la coincidencia vigente que muestra la agenda; E2E reproduce cancelación del 14/09 y traslado del 21/09 al mismo horario para verificarlo.

## Conflictos al confirmar

La revalidación informa todas las clases afectadas con fecha, horario y aula, y devuelve la preparación al paso de asignación. No se guarda un subconjunto. Herramienta de demostración: «Ocupar Aula 203 · 14 y 21/09 · 14–16» registra una reserva de prueba si el calendario y la disponibilidad lo permiten; es idempotente y se elimina al reiniciar el escenario.

E2E prepara la periódica aprobada, ocupa el aula antes de confirmar, verifica ambas fechas, conserva datos, elige otra aula y confirma 26 clases con una sola instancia en agenda. Capturas `frontend/evidence/conflicto-confirmacion-desktop.png` y `conflicto-confirmacion-mobile.png` inspeccionadas. Estado de error móvil sin infracciones automáticas de Axe. 61 unitarias, build y lint correctos. P-06 sigue pendiente de la auditoría integral ya enumerada.

## Impresión extensa desde la aplicación

Nueva E2E entra al escenario «Muchas aulas y listado extenso», navega a la segunda página (10 filas de 30), y genera el PDF desde la app completa: se imprimen las 30, con navegación y herramientas ocultas. También verifica filtro Aula D30 y genera su único resultado.

PDFs `frontend/evidence/listado-app-30.pdf` y `listado-app-filtrado.pdf` inspeccionados hoja por hoja mediante renderizado PDFium. Extracción independiente con pypdf: 30 filas distribuidas 10/13/7 en tres hojas A4 apaisadas; encabezados de tabla repetidos, ninguna clase perdida, ningún control de demo. Filtrado: una hoja y una fila. Se corrigió el fondo beige detectado en zonas vacías y se redujo el espaciado de impresión conservando texto de tabla de 10 pt (datos secundarios 9 pt). Las filas no se dividen entre hojas. Build/lint y prueba E2E correctos.

Esta evidencia amplía la prueba anterior aislada de 25 filas. Continúan teclado/zoom, estados de formularios y consistencia global de P-06; no se declara terminado el prototipo.

## Zoom nativo y recorrido por teclado

Nueva prueba con Chromium aislado y extensión exclusiva de E2E que aplica `chrome.tabs.setZoom(2)`. Se verifica el factor devuelto, duplicación del devicePixelRatio y reducción del ancho CSS a la mitad; no se sustituye el zoom por CSS o un viewport pequeño. El contexto temporal se cierra al finalizar. Referencias del mecanismo: [Playwright](https://playwright.dev/docs/chrome-extensions) y [Chrome tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs).

A 200 %: ingreso, nueve páginas principales, altas de aula/cuenta y pasos de asignación/revisión/éxito sin desbordamiento del documento ni infracciones automáticas Axe A/AA. Se completa una reserva de 26 clases y se guarda un aula. Capturas `frontend/evidence/zoom-200-*.png` tomadas directamente con CDP para evitar recorte de Playwright al capturar una página con zoom; inspeccionadas preparación, asignación, revisión, éxito, indicadores y ambos formularios de alta.

Prueba separada recorre ingreso → nueva periódica → selección de aulas → revisión → confirmación → detalle usando únicamente Tab, Space, Enter y escritura de credenciales, comprobando foco visible de acciones. Ambas E2E correctas. Esto no certifica accesibilidad total: sigue pendiente consolidar la auditoría de todos los estados, consistencia tras modificaciones y correcciones escritas del diseño aprobado.

## Consistencia entre vistas y calendario atómico

Dos E2E adicionales comprueban recorridos que atraviesan módulos. Cambiar alumnos/aula y reprogramar Física actualiza detalle, agenda, listado e indicadores: 243 alumnos-hora tras editar; al trasladar, 198 en el día original y 45 en el nuevo. Cancelar retira sus horas y clases de métricas/agenda, conservándola en el listado de canceladas. Captura `frontend/evidence/consistencia-cancelacion.png` inspeccionada: valores cero y curvas vacías correctos, sin confundirlos con un fallo de consulta.

En el escenario de calendario, extender al 23/12 con R-BLOCK vigente se rechaza sin cambiar el fin 18/12 ni las 26 clases. Cancelar la bloqueante por su operación normal y revisar de nuevo permite guardar exactamente dos clases: 21/12 en 203 y 23/12 en 105. Detalle pasa a 28; agenda e indicadores del 23/12 muestran únicamente la clase vigente, 2 horas y 60 alumnos-hora. Ambas E2E correctas.

### Pendientes encontrados al contrastar todos los README vigentes

- Serie registrada: incorporar proyector a los requisitos de Matemática de los datos de demostración para impedir reasignarla a 204.
- Cuentas: completar selector 20/50/100, además de la paginación existente.
- Validación personalizada: foco y acceso al campo desde los errores; comprobar recuperación por teclado, no solo recorrido exitoso.

Estos pendientes siguen abiertos. Tras corregirlos corresponde ejecutar la suite completa actualizada y cerrar la matriz de aceptación; el objetivo permanece activo.
