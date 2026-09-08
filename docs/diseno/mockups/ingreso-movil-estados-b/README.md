# Ingreso, móvil y estados — diseño B

Composición y recorridos aprobados por el usuario, con los ajustes de detalle documentados. Mantiene los recorridos aprobados y adapta su presentación; sin implementación.

| Imagen | Qué validar |
|---|---|
| [Ingreso](01-ingreso.png) | Acceso simple con email/contraseña y orientación al administrador para cuentas o cambio de clave. |
| [Agenda móvil](02-agenda-movil.png) | Lista cronológica diaria que conserva cada clase simultánea como entrada independiente. |
| [Formulario móvil](03-formulario-movil.png) | Una sola página desplazable para datos y fechas, con campos apilados. |
| [Error de consulta](04-error-consulta.png) | Diferenciar una consulta fallida de una consulta exitosa sin disponibilidad y permitir reintentar. |

## Navegación y adaptación

El menú móvil contiene las mismas secciones permitidas del escritorio y cerrar sesión. Administrador ve también Usuarios y Calendario; Bedel no. Docente consulta Agenda, Disponibilidad y Reservas, sin Nueva reserva, gestión ni indicadores. Ingresar correctamente lleva a la agenda del día.

La agenda móvil propone la lista diaria como alternativa legible al calendario de columnas. Las clases se ordenan por inicio y se identifican con aula, curso/comisión y docente; no se descartan clases simultáneas. El ejemplo móvil contiene cuatro clases ficticias y es independiente del ejemplo anterior de cinco. La semana sigue disponible mediante una presentación desplazable que preserve la alternativa diaria.

El formulario conserva los tres pasos; desplazarse hacia abajo no crea pasos nuevos. Los grupos de aulas periódicas se apilan por día semanal y las esporádicas por fecha, con el mismo alcance aprobado. El pie de acciones debe reservar espacio y adaptarse al teclado para no cubrir entradas ni errores.

## Estados compartidos propuestos

| Estado | Mensaje y acción | Regla |
|---|---|---|
| Cargando consulta | Indicador junto al área de resultados, «Consultando…». | Conservar filtros; no presentar resultados anteriores como si fueran de la nueva consulta. |
| Sin resultados | «No hay clases para estos filtros». Permitir ajustar filtros. | Resultado válido, no error técnico ni afirmación de disponibilidad universal. |
| Sin aulas disponibles | Explicar fecha o patrón afectado y mostrar alternativas informativas según las reglas. | Nunca habilitar confirmación de una alternativa ocupada. |
| Consulta fallida | «No pudimos consultar la disponibilidad». «Reintentar consulta». | Mantener preparación activa; no afirmar que no existen aulas disponibles. |
| Validación | Error próximo al campo, por ejemplo «Elegí un horario que termine antes de las 23:00 o a esa hora». | Conservar valores y permitir corregir; foco accesible en el error. |
| Guardando | Etiqueta de progreso y acción temporalmente deshabilitada. | Reducir dobles envíos; éxito solo después de guardar. |
| Conflicto al guardar | Identificar fechas afectadas y volver a asignaciones conservando la preparación activa. | No guardar parcialmente ni omitir fechas automáticamente. |
| Cambio de otro usuario | «La reserva fue modificada por otro usuario; revisá los datos actuales». | No sobrescribir ni mezclar cambios silenciosamente. |
| Sesión vencida | «Tu sesión terminó. Volvé a ingresar». | Sin reloj propio de inactividad; no prometer recuperar la preparación tras el nuevo ingreso. |
| Cuenta deshabilitada | Explicar que la cuenta no tiene acceso y orientar al administrador. | Autenticarse no basta para obtener permisos de la app. |
| Fallo de guardado o respuesta incierta | Informar que no se pudo confirmar el resultado. | No mostrar éxito ni promover un reenvío ciego; comprobar estado antes de repetir una operación que pudo guardarse. |

Errores de ingreso se muestran en el formulario sin contadores propios ni recuperación pública. El sistema no promete funcionamiento sin conexión. Los mensajes de resultados vacíos y fallos son patrones de presentación, no módulos nuevos.

## Ajustes para el diseño detallado

- Unificar el encabezado móvil con marca compacta y botón Menú; nombre/rol puede pasar dentro del menú para liberar espacio. No copiar la distinta posición del menú entre imágenes.
- Quitar el botón de calendario sin etiqueta junto a Nueva reserva en la agenda generada: no representa una acción adicional acordada.
- Evitar el resumen de cuatro columnas heredado del escritorio en el formulario: omitirlo en este paso o presentarlo en una línea compacta desplegable. Fecha y fin deben seguir siendo legibles; el fin es calculado.
- Los tamaños de las imágenes no prueban ajuste real a 390 px. Verificar al prototipar el ancho, el teclado, el desplazamiento, las áreas táctiles y que el pie no oculte el último campo.
- Usar texto e icono para estados, no solo color; foco visible, etiquetas asociadas y navegación por teclado. No se afirma que estas imágenes hayan probado accesibilidad.

Referencias: [pantallas](../../../especificacion/14-pantallas-y-navegacion.md), [cuentas y acceso](../../../especificacion/10-cuentas-y-acceso.md). Generación mediante herramienta integrada con referencia B adjunta. [Prompts](prompts.md).
