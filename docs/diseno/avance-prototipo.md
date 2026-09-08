# Avance del prototipo navegable

Objetivo activo: completar P-01 a P-06 del [plan aprobado](prototipo-navegable.md), manteniendo datos simulados y esqueleto Java/Spring Boot. Cada subcorte se revisa visualmente, se prueba y se guarda en un commit antes de continuar. No integrar todavía Supabase ni desplegar.

## Cortes

| Corte | Estado | Alcance y comprobación |
|---|---|---|
| Base | Commit `d6f0b93` | React B, agenda, roles ficticios, primera periódica, Spring Boot. 4 pruebas de dominio y 3 E2E; revisión visual escritorio/móvil. Corregida pérdida de aulas al volver a datos. |
| Períodos y exclusiones | Implementado, validado | Primer/segundo cuatrimestre y anual, omisión del pasado/receso/feriados, exclusiones explícitas, inicio+duración con fin calculado, detalle de omisiones en revisión. 7 pruebas unitarias y 5 E2E. |
| Alternativas y conflictos | Implementado, validado | Aulas ordenadas por capacidad/ID, primeras tres y ver todas, ranking por modalidad/fechas/minutos, detalle y contactos ficticios. 11 pruebas unitarias y 7 E2E. |
| Catálogo y equipamiento | Implementado, validado | Cursos reutilizables con código generado, comisión/año y requisitos de recursos. 14 pruebas unitarias y 8 E2E; compilación y lint correctos. |
| Esporádicas y consulta | Pendiente | Fechas independientes, aula por fecha, disponibilidad compartida solo consulta para Docente. |
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
