# Plan de preparación del prototipo navegable

**En implementación por subcortes.** Diseño aprobado consolidado en el [índice](README.md). Consultar el [avance por cortes](avance-prototipo.md) y la [primera entrega](entrega-01.md). Este plan describe el alcance completo pendiente, no lo declara implementado.

## Objetivo y límite de esta etapa

Permitir recorrer y evaluar los flujos aprobados con datos ficticios coherentes, componentes reales y adaptación móvil. La entrega será un frontend navegable con estado de demostración, no una colección de imágenes enlazadas.

Base: React, TypeScript, Vite, Tailwind/shadcn y Chart.js, ya acordados. Ubicación: `frontend/` en la raíz del repo, con dependencias bloqueadas en package-lock.json. `backend/` contiene el esqueleto Java/Spring Boot ejecutable solicitado por el usuario.

El prototipo usa un servicio local en memoria para consultas y operaciones simuladas. Una interfaz pequeña entre vistas y datos permitirá integrar luego los contratos reales; no se necesita un framework propio de repositorios ni reproducir toda la arquitectura Java. El esqueleto Java incluye arranque y salud, sin lógica del dominio todavía. Sin integración Supabase, Docker, despliegue ni credenciales reales en esta etapa. El sistema final conserva su stack y autenticación aprobados: esta simulación es exclusiva del prototipo.

Se mantienen cambios mientras se navega; recargar reinicia los datos y pierde preparaciones. No hay persistencia de borradores. Los controles de escenarios y reinicio son herramientas de demostración separadas de la navegación del producto. Las cuentas de prueba y sus claves ficticias se documentarán para el evaluador; el login simulado no valida seguridad ni sustituye a Supabase.

## Mapa de navegación a preparar

| Superficie | Entrada y salida | Referencias UI |
|---|---|---|
| Ingreso | Login ficticio por rol → agenda del día; cerrar sesión → ingreso. | UI-01 |
| Agenda | Día/semana, fecha, aula/tipo → detalle; Nueva reserva para operadores. | UI-03 |
| Disponibilidad | Criterios → resultados; operadores continúan a preparación; Docente solo consulta sin contactos privados. | UI-04 |
| Nueva reserva | Datos y fechas → aulas por día/fecha → revisar → éxito → detalle/agenda. Volver conserva preparación activa. | UI-05 |
| Reservas | Pestañas día/curso → detalle; imprimir solo listado diario. | UI-06/15 |
| Detalle y edición | Datos compartidos, aula o fecha/horario, según reglas → revisión/guardado → detalle actualizado. | UI-07/08 |
| Cancelación | Fechas y motivo → confirmar → detalle y agenda actualizados. | UI-08 |
| Aulas | Listado → alta/edición; baja/cambio bloqueado con dependencias. | UI-09 |
| Administración | Usuarios o Calendario; formularios y confirmaciones simples. | UI-10/11/12/13 |
| Indicadores | Día/semana típica, cuatrimestre/rango, filtros → valores de gráficos y tabla por tipo. | UI-14 |

No hace falta una URL por diálogo. Las páginas principales deben admitir navegación atrás/adelante y recarga coherente con la sesión simulada. La consulta de disponibilidad reutiliza controles y resultados del flujo de reserva; no requiere otro lenguaje visual.

## Secuencia de trabajo y resultado comprobable

| Orden | Trabajo | Resultado para revisar |
|---|---|---|
| P-01 | Base visual y navegación: tokens, formularios, tabla, diálogo, roles, menú y datos de prueba. | Shell B consistente en escritorio y móvil; login y navegación permitida por rol. |
| P-02 | Reserva periódica y esporádica, consulta compartida, resumen y éxito. | Completar ambos recorridos y ver la nueva reserva en agenda/detalle; volver sin perder la preparación activa. |
| P-03 | Agenda, listados, detalle, edición, cancelación e impresión. | Mutaciones reflejadas en todas las vistas; filtros y estados coherentes; impresión completa. |
| P-04 | Aulas, usuarios y calendario con impacto. | Altas/ediciones simuladas, restricciones comprensibles y ningún cambio parcial de calendario. |
| P-05 | Indicadores calculados y estados comunes. | Gráficos correctos para datos de prueba, valores accesibles, cero/error/cargando diferenciados. |
| P-06 | Revisión de recorridos, tamaños, teclado y consistencia. | Evidencia de validación y lista concreta de diferencias pendientes antes de integrar backend. |

La adaptación móvil acompaña cada entrega; P-06 verifica el conjunto, no posterga toda la adaptación hasta el final. Presentar P-02 primero para probar pronto el flujo principal. No crear tickets remotos ni tareas adicionales automáticamente.

## Escenarios de demostración

Reloj de prueba fijo: 08/09/2026, 10:00, zona America/Argentina/Cordoba. El selector de fecha de la agenda permite ir al 14/09; no confundir la fecha mostrada con «hoy». Escenario histórico separado adelanta el reloj para verificar protección de clases iniciadas. Los escenarios son independientes y se restablecen; no mezclar los estados alternativos de los mockups como si fueran una única base.

| Escenario | Preparación | Resultado esperado |
|---|---|---|
| Reserva nueva | Año 2026 habilitado; cuatrimestres 09/03–03/07 y 14/09–18/12; no lectivos 12/10 y 23/11. Sin Matemática registrada aún. | Crear periódica lunes/miércoles 14–16, 30 alumnos: 26 clases, 12 lunes y 14 miércoles; aulas constantes por patrón. |
| Esporádica | Mismo calendario; fechas 14/09 14–16 y 21/09 16–17:30. | Dos ocurrencias y aulas independientes; ninguna recurrencia extra. |
| Conflictos | Reservas bloqueantes controladas en aulas compatibles. | Prioridad informativa periódica por modalidad/fechas/minutos; esporádica por minutos; ocupado no se confirma. |
| Operación diaria | Las cinco clases y recursos del ejemplo diario de indicadores. | Agenda y listado muestran las mismas cinco; impresión coincide. |
| Serie registrada | Matemática con las 26 clases, requisitos y aulas del recorrido aprobado. | Cambiar aula de lunes afecta 12; cancelar una deja 25; reprogramar una conserva aula y no altera el patrón. |
| Protección temporal | Reloj durante una clase o después de ella; ocurrencias canceladas incluidas. | Sin editar/cancelar iniciadas ni reactivar canceladas; cabecera de serie iniciada no editable. |
| Calendario | Serie registrada y esporádica bloqueante el 23/12 en Aula 105. | Extender al 23/12 propone dos clases, bloquea todo hasta resolver; luego guarda cambio y clases juntos. |
| Cuentas/aulas | Un único Admin activo; aula con reserva futura. | Impedir degradar/deshabilitar al último Admin y cambios de aula que invaliden reservas; no cancelar automáticamente. |
| Indicadores | Datos exactos diario y semanal del documento de indicadores visuales, por separado. | Diario 8,5 h, 13,3 %, 5 clases, 312 alumnos-hora; semanal 108 h, 2,5 %, 54 clases. |
| Estados | Fallo de consulta, respuesta tardía, versión desactualizada, sesión vencida, cero y cobertura desconocida. | Mensaje y salida apropiados; sin éxito falso ni datos viejos presentados como actuales. |

La simulación implementa lo necesario para que estos recorridos sean coherentes. Casos de autenticación, concurrencia y fallo incierto pueden activarse de forma controlada; no se presentan como prueba del proveedor ni como garantía de transacciones reales. Los contactos se usan solo como datos ficticios visibles para roles operativos; no se envían mensajes.

Aulas de referencia: 105 Multimedios/40; 203 Multimedios/32; 108 General/60; Lab 2 Laboratorio/24; candidatas 301 Multimedios/48 y 204 Multimedios/60. El estado del laboratorio depende del escenario: habilitado en métricas, inhabilitado en el ejemplo administrativo. Datos de docente/cuenta se mantienen separados. Cada escenario debe declarar reservas iniciales y estados, evitando duplicar la reserva que el evaluador va a crear.

## Criterios de aceptación del prototipo

- Operar un recorrido completo por rol sin enlaces muertos ni botones que aparenten guardar sin modificar el estado simulado.
- Periódica mantiene aula por día semanal; esporádica por fecha. Conflictos, exclusiones, fechas omitidas y alcance de modificaciones siguen la especificación.
- Reservas confirmadas/canceladas y sus cambios se reflejan consistentemente en agenda, detalle, listados e indicadores del mismo escenario.
- Mostrar consulta de disponibilidad para Docente sin acciones ni datos privados de operadores. Ocultar navegación no se presenta como implementación de seguridad real.
- Impresión incluye todos los resultados filtrados de una prueba con más de 20 filas; no solo la página visible.
- Gráficos usan datos calculados en 32 franjas, con etiquetas, denominadores y alumnos-hora correctos. Validar ceros, ausencia de fechas aplicables y denominador cero.
- Verificar anchos de 390, 768 y 1440 px, zoom 200 %, foco visible, teclado, formularios con etiquetas y contraste de texto/controles. No ocultar acciones bajo el teclado ni usar color como única señal.
- Verificar semana y conjuntos de muchas aulas con desplazamiento explícito y encabezados legibles; móvil siempre tiene alternativa diaria utilizable.
- Respetar todas las correcciones consolidadas del índice y los README de cada grupo de imágenes.
- Documentar cómo iniciar, elegir/resetear escenarios y recorrer la demo; identificar claramente simulaciones y funciones pendientes de backend.

Validación al implementar: revisión visual en navegador y pruebas de interacción de ambos registros, modificación/cancelación e impresión. Añadir pruebas puntuales de recurrencia, solapamiento y métricas cuando esos cálculos se implementen en la simulación; no duplicar todas las pruebas de backend ni probar meramente el texto de cada componente.

## Entrega esperada

Frontend ejecutable con instrucciones, escenarios reproducibles, recorridos verificados y diferencias visuales corregidas. No requiere desplegar ni conectar cuentas externas. El paso posterior será acordar la integración con los contratos Java/Supabase, conservando el diseño y sustituyendo la simulación. No se declara el prototipo listo hasta ejecutar sus comprobaciones.
