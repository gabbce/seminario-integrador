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
| Operación P-03 | Pendiente | Semana, filtros/listados definitivos, editar, cancelar, reprogramar, imprimir. Protección temporal y control de versión simulado. |
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
