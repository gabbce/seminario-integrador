# Validación de cierre del prototipo navegable

Alcance: P-01 a P-06 del [plan aprobado](prototipo-navegable.md), con diseño B, React y estado ficticio compartido. Java/Spring Boot conserva únicamente arranque y salud. La integración del sistema real es la etapa siguiente.

## Matriz de aceptación

Las rutas de pruebas de esta matriz son relativas a `frontend/`. Cada archivo permite reproducir la comprobación, además de las capturas locales de `evidence/` (ignoradas por Git).

| Entrega / criterio del plan | Comprobación reproducible | Resultado |
|---|---|---|
| P-01: ingreso, navegación y recorrido por rol | `e2e/prototype.spec.ts`: ingreso operativo, consulta docente y administración; `e2e/accessibility.spec.ts`: teclado, atrás/adelante y fecha conservada | Admin gestiona, Bedel opera, Docente consulta; sin contactos privados ni creación para Docente. Son restricciones de interfaz simuladas. |
| P-02: periódica y esporádica completas | `e2e/prototype.spec.ts`: registro de ambas modalidades, exclusión, selección conservada, curso/comisión/recursos y consulta → registro; `src/domain.test.ts`, `src/booking-dates.test.ts`, `src/availability.test.ts` | Periódica de 26 clases, o 25 al excluir una; aula fija por día semanal. Esporádica de dos fechas con aulas independientes. |
| P-02: conflictos y guardado | `e2e/confirmation-conflict.spec.ts`; pruebas de conflictos y resultado incierto en `e2e/prototype.spec.ts` | Alternativas informativas, fechas afectadas explícitas, preparación conservada, sin confirmación parcial ni duplicación al comprobar resultado incierto. |
| P-03: agenda, detalle y listados | `e2e/consulted-date.spec.ts`, `e2e/consistency.spec.ts`; pruebas de semana, día y curso en `e2e/prototype.spec.ts` | La entrada desde agenda identifica la ocurrencia consultada; mutaciones se reflejan en las cuatro vistas, incluidos indicadores. |
| P-03: editar, trasladar y cancelar | `e2e/prototype.spec.ts`; `src/room-change.test.ts`, `src/reschedule.test.ts`, `src/cancellation.test.ts`, `src/booking-header.test.ts` | Alcance futuro del patrón, aula conservada al reprogramar, motivo e historial; protección temporal y revalidación del conjunto. |
| P-03: impresión de más de 20 resultados | `e2e/printing-app.spec.ts`, `e2e/printing.spec.tsx` | La app imprime 30 clases completas aunque la página muestre 20. PDF inspeccionado: tres hojas, encabezados repetidos, sin controles ni filas partidas. Filtrar D30 imprime una fila. |
| P-04: aulas y cuentas | `e2e/inventory-pagination.spec.ts`, `e2e/accounts-pagination.spec.ts`; gestión en `e2e/prototype.spec.ts`; `src/room-management.test.ts`, `src/users.test.ts` | Alta/edición, protección de dependencias y último Admin, filtros, orden y páginas de 20/50/100. Cambios afectan la disponibilidad. |
| P-04: calendario y años | `e2e/calendar-atomic.spec.ts`; año y feriados en `e2e/prototype.spec.ts`; `src/calendar.test.ts`, `src/calendar-management.test.ts`, `src/academic-years.test.ts` | Extender al 23/12 bloquea todo ante R-BLOCK; después de cancelarlo agrega exactamente dos clases y actualiza el calendario. Quitar feriado recupera la clase. Años con ciclo de estados y eliminación protegida. |
| P-05: indicadores calculados | `src/metrics.test.ts`, `src/metrics-week.test.ts`, `src/demo-scenarios.test.ts`; indicadores y escenarios en `e2e/prototype.spec.ts` | 32 franjas; diario de referencia: 8,5 h, 13,3 %, 5 clases y 312 alumnos-hora. Semanal: 108 h, 2,5 % y 54 clases. Denominadores históricos, ceros y ausencia de cobertura diferenciados. |
| P-05/P-06: recuperación y estados | Fallo, demora, sesión, versión y guardado en `e2e/prototype.spec.ts`; `e2e/validation-recovery.spec.ts` | Sin datos antiguos presentados como resultado actual. Errores con foco y retorno al formulario/campo; conserva datos corregibles y permite repetir una validación. |
| P-06: escritorio, tablet, móvil y accesibilidad | `e2e/accessibility.spec.ts`, `e2e/zoom.spec.ts`, `e2e/keyboard-booking.spec.ts`, `e2e/validation-recovery.spec.ts` | Anchos 390/768/1440, zoom nativo 200 %, reserva completa con teclado, foco visible, etiquetas y análisis Axe sin infracciones en superficies comprobadas. Gráficos con valores textuales accesibles. |
| P-06: muchas aulas y semana | `e2e/agenda-many.spec.ts` | 30 aulas/clases, desplazamiento por teclado hasta D30, encabezados diarios legibles; semana desplazable y alternativa diaria móvil con las 30 clases y acceso al detalle. |
| P-06: diseño aprobado y documentación | [Referencias vigentes](README.md), [avance y revisiones visuales](avance-prototipo.md), [escenarios](escenarios-demo.md), [inicio frontend](../../frontend/README.md) | Revisión independiente contra el plan y todos los README vigentes. Corregidos los hallazgos de proyector de Matemática, selector de tamaño de cuentas y recuperación de errores. |

## Escenarios cubiertos

[La guía de demostración](escenarios-demo.md) documenta preparación, reloj y reinicio. Los casos base, esporádica y conflictos se recorren mediante registro/consulta; `series` permite modificaciones y cancelación; `started` comprueba protección temporal; `calendar` extensión atómica; `daily` y `weekly` reproducen los números aprobados; `empty`, `closed` y `unknown` distinguen los estados sin actividad y sin cobertura; `many` verifica desplazamiento, paginación e impresión extensa. Cuentas y aulas se prueban mediante sus operaciones normales. Fallos, demora, sesión, versión y ocupación sobrevenida se activan desde herramientas de demostración.

## Evidencia visual y límites

Las capturas y PDF se regeneran al ejecutar Playwright. La revisión visual por corte está registrada en el avance; entre las evidencias finales están `agenda-30-aulas-*`, `cuentas-paginacion-*`, `error-campo-*`, `detalle-fecha-*`, los archivos de zoom y `listado-app-30.pdf`. Se inspeccionaron escritorio y móvil, formularios, resultados, estados de error, gráficos e impresión. Las comprobaciones automáticas de accesibilidad complementan la revisión manual; no constituyen una certificación WCAG ni pruebas en dispositivos físicos o en todos los navegadores.

La simulación no demuestra seguridad de Supabase, concurrencia de servidor ni transacciones PostgreSQL. Recargar pierde cambios y sesión. No hay persistencia, API de dominio, autenticación real, Docker ni despliegue en esta entrega. Estos límites pertenecen al alcance aprobado del prototipo y deben resolverse al integrar el sistema real.

## Ejecución final

Ejecutada el 09/09/2026: `npm run build` y `npm run lint` correctos; `npm test`: 62 pruebas en 18 archivos; `npm run test:e2e`: 44 pruebas aprobadas en la misma ejecución (52,2 segundos). `backend/./mvnw test`: una prueba de contexto, sin fallos. Salud del backend comprobada en `/api/health` con estado `UP`.

P-01 a P-06 completos dentro del alcance de simulación. Sin diferencias funcionales conocidas pendientes respecto del plan revisado. Los próximos trabajos son integración y validación del sistema real, conservando estos recorridos como referencia.
