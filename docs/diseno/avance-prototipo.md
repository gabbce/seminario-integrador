# Avance del prototipo navegable

Objetivo activo: completar P-01 a P-06 del [plan aprobado](prototipo-navegable.md), manteniendo datos simulados y esqueleto Java/Spring Boot. Cada subcorte se revisa visualmente, se prueba y se guarda en un commit antes de continuar. No integrar todavía Supabase ni desplegar.

## Cortes

| Corte | Estado | Alcance y comprobación |
|---|---|---|
| Base | Commit `d6f0b93` | React B, agenda, roles ficticios, primera periódica, Spring Boot. 4 pruebas de dominio y 3 E2E; revisión visual escritorio/móvil. Corregida pérdida de aulas al volver a datos. |
| Períodos y exclusiones | Implementado, validado | Primer/segundo cuatrimestre y anual, omisión del pasado/receso/feriados, exclusiones explícitas, inicio+duración con fin calculado, detalle de omisiones en revisión. 7 pruebas unitarias y 5 E2E. |
| Criterios y conflictos | Siguiente | Catálogo de cursos y docentes con contacto, requisitos de equipamiento, orden de candidatas y alternativas informativas por modalidad, detalle de conflictos sin permitir confirmar. |
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
