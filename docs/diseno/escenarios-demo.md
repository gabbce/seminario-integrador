# Escenarios del prototipo

Iniciar el frontend según [README](../../frontend/README.md). Al pie de cualquier pantalla, abrir **Herramientas de demostración**. Elegir escenario y pulsar **Aplicar escenario y reiniciar**. Se descartan cambios, sesión y cuentas añadidas; se restauran contraseñas y calendario. Volver a ingresar con `admin@demo.local`, `bedel@demo.local` o `docente@demo.local`, contraseña `Aulas2026`. **Reiniciar escenario actual** repite la misma preparación. Recargar el navegador vuelve a Reserva nueva.

Estos controles pertenecen a la demostración, no al producto final, y no se imprimen. No conectan servicios ni envían mensajes. Los tres roles pueden utilizar los controles de demostración para preparar recorridos independientes; esto no representa permisos de producción.

| Escenario | Recorrido sugerido |
|---|---|
| Reserva nueva | Agenda → Nueva reserva. Matemática lunes/miércoles 14–16 genera 26 clases. Se mantienen cuatro reservas iniciales y seis aulas. |
| Operación diaria | Agenda y listado del 14/09 muestran cinco clases. Indicadores diarios: 8,5 horas, 13,3 %, cinco clases y 312 alumnos-hora; cuatro aulas. |
| Semana típica | Indicadores → Semana típica → segundo cuatrimestre. Dos series independientes: 108 horas, 54 clases, 2,5 %. Medias de alumnos-hora 60/72/60/72/0. |
| Serie registrada | Abrir Matemática en agenda. 26 clases; lunes en 203 y miércoles en 105. Cambiar aula de lunes afecta 12 futuras. |
| Impacto de calendario | Ingresar como Admin. Extender segundo cuatrimestre al 23/12: la esporádica de Física en 105 impide guardar. Cancelar esa clase desde Reservas y repetir. |
| Protección temporal | Reloj institucional 14/09 a las 14:30. Matemática ya comenzó; no permite modificar cabecera. Sus clases futuras siguen operables. «Hoy» abre el 14/09. |
| Sin clases | Indicadores y listados vacíos. Ocupación 0 %, con horas habilitadas. |
| Sin horas habilitadas | Aulas inhabilitadas, sin reservas. Indicadores sin porcentaje; disponibilidad sin aulas seleccionables. |
| Cobertura desconocida | Sin historial de aulas, sin reservas. Indicadores avisan que no pueden inferir disponibilidad. |
| Muchas aulas y listado extenso | Treinta aulas/clases el 14/09. Desplazar agenda, filtrar y consultar listado con paginación. Impresión debe incluir las treinta. |

Salvo Protección temporal, el reloj es 08/09/2026 a las 10:00, zona institucional America/Argentina/Cordoba. El escenario histórico usa un reloj simulado, no el reloj del equipo. Ningún escenario se guarda fuera de la memoria del navegador.

## Pruebas de recuperación

Dentro de Herramientas de demostración:

- **Simular error de indicadores** / **Simular error de disponibilidad** retiran resultados y ofrecen reintento, conservando filtros o preparación. Abrir Indicadores o el paso Elegir aulas.
- **Simular respuesta lenta** demora 1,5 segundos cada consulta de indicadores o disponibilidad. Cambiar fecha o filtro durante la espera invalida la anterior. **Respuesta normal** desactiva la demora.
- **Simular otra versión de reserva** se usa con una reserva abierta y una modificación preparada. Incrementa la versión sin cambiar sus datos; guardar la edición anterior debe rechazarse. Volver al detalle y abrir de nuevo permite usar la versión actual.
- **Simular sesión vencida** termina la sesión, descarta preparación sin guardar y conserva reservas. Volver a ingresar con una cuenta de demo.

El reinicio de escenario limpia también estos estados. Son simulaciones de interfaz; no prueban un proveedor, red ni concurrencia real.

- **Simular fallo de guardado** rechaza una reserva nueva sin guardarla. Conserva la revisión; cambiar a **Guardado normal** permite repetir.
- **Simular respuesta de guardado incierta** guarda una reserva nueva pero oculta la confirmación. **Comprobar estado de la reserva** consulta el mismo ID y confirma sin reenviar. Todos los guardados de reserva nueva muestran una espera de 600 ms y deshabilitan el botón.

La espera se cancela al salir del formulario o vencer la sesión. Antes de guardar se revalidan los datos actuales. P-06 se verificó según la [matriz de aceptación](validacion-prototipo.md). Para repetir la revisión humana completa, usar la [checklist de QA manual](qa-manual-prototipo.md).

### Conflicto después de consultar

En «Reserva nueva», preparar Matemática lunes Aula 203 / miércoles Aula 105 y llegar a revisión. Abrir herramientas y pulsar «Ocupar Aula 203 · 14 y 21/09 · 14–16». Confirmar: se identifican ambas fechas y se vuelve a asignación sin guardar clases. Elegir otra aula compatible para lunes y volver a confirmar. La ocupación de prueba permanece hasta reiniciar; el control no duplica su reserva si se pulsa nuevamente.
