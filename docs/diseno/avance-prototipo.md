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
| Administración P-04 | Pendiente | Aulas, cuentas, calendario e impacto atómico sobre series. |
| Indicadores P-05 | Pendiente | Cálculos derivados, vistas diaria/semanal/rango, Chart.js y tabla accesible. |
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
