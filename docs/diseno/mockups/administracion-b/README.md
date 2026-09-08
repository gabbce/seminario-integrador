# Administración — diseño B

Diseño aprobado por el usuario: aulas, cuentas, calendario e impacto de cambios. Imágenes estáticas, sin implementación.

| Pantalla | Imagen | Validación |
|---|---|---|
| Aulas | [Abrir](01-aulas.png) | Listado y edición lateral, capacidad en personas y recursos según tipo. |
| Usuarios | [Abrir](02-usuarios.png) | Búsqueda, perfil y acciones administrativas diferenciadas. |
| Calendario | [Abrir](03-calendario.png) | Año, cuatrimestres y fechas no lectivas en una misma sección. |
| Impacto | [Abrir](04-impacto.png) | Nuevas clases, aula del patrón y bloqueo ante conflictos antes de guardar. |

## Navegación propuesta

Mantener la navegación superior B y agrupar Usuarios y Calendario académico bajo Administración, visible solo para Administrador. Aulas permanece en la navegación operativa porque Bedel también puede gestionarlas. Las pestañas internas permiten alternar las dos secciones administrativas; no se agrega un módulo de configuración general.

## Aulas

El panel sirve para alta y edición. La ubicación debe conservar edificio/ubicación y piso entero, sin agregar gestión de edificios. Los recursos dependen del tipo. Laboratorio muestra cantidad de PC solo como dato descriptivo, nunca filtro ni criterio de capacidad. Los estados son Habilitada, Inhabilitada y Mantenimiento.

Dar de baja es una acción separada, con confirmación y dependencias bloqueantes; no ofrece restauración. Cambiar estado, tipo, capacidad o recursos revalida las reservas según la especificación y no las cancela automáticamente. El formulario muestra errores junto al campo y conserva datos corregibles.

## Usuarios

Crear reutiliza el formulario con nombre, apellido, email, rol y contraseña elegida por Admin con confirmación. Turno de Bedel y legajo de Docente son opcionales. Editar no expone la contraseña actual. Restablecer abre un diálogo con nueva contraseña y confirmación; solo informa éxito tras respuesta confirmada. No se envían credenciales desde la app ni se agrega cambio obligatorio en el primer ingreso.

Deshabilitar/rehabilitar conserva reservas e historial. El último Admin activo no puede deshabilitarse ni degradarse. La cuenta Docente es independiente de la lista fija de solicitantes de reserva. Un alta incompleta o error del proveedor se informa sin presentar acceso exitoso.

## Calendario

El ejemplo usa fechas ficticias: primer cuatrimestre 09/03–03/07/2026 y segundo 14/09–18/12/2026. Las fechas no lectivas del 12/10 y 23/11 tienen descripciones ficticias y carga manual.

- Crear año inicia en preparación; habilitar exige dos cuatrimestres completos, válidos y sin solapamiento. Los cuatrimestres no tienen habilitación individual.
- Agregar/editar fecha no lectiva usa fecha y descripción. Si afecta reservas futuras, se bloquea hasta resolverlas en sus operaciones normales. Quitar una fecha no lectiva puede generar clases periódicas y requiere revisar el impacto.
- Cerrar año exige ausencia de ocurrencias futuras o en curso no canceladas. El botón inicia la comprobación, no cierra directamente; el año del ejemplo tiene reservas que impedirían cerrarlo. Cerrado queda en consulta, sin reapertura dentro del alcance.
- Eliminar año/cuatrimestre mantiene las protecciones de dependencias, incluidas históricas y canceladas. No se ofrece borrar datos relacionados para eludirlas.

## Ejemplo de impacto

La ampliación propuesta del segundo cuatrimestre termina el 23/12 en vez del 18/12. En estos datos solo una serie es elegible para extender: Matemática I, 001-A-2026, Laura Gómez. Genera lunes 21/12, 14:00–16:00, Aula 203, y miércoles 23/12, 14:00–16:00, Aula 105. El miércoles coincide con una esporádica de Física I de 14:00 a 15:00.

El cambio queda sin guardar hasta resolver el conflicto mediante operaciones normales y volver a consultar. No hay selector de aula por fecha, omisión automática ni guardado parcial. La resolución también puede requerir reasignar todo el patrón periódico futuro conforme a las reglas vigentes. Sin conflictos, calendario y nuevas ocurrencias se guardan juntos. Se preservan pasado, exclusiones, cancelaciones y series sin continuidad.

## Precisiones del diseño detallado

- La imagen de Aulas omite Administración en su encabezado; el encabezado real debe ser consistente para el mismo rol en todas las secciones.
- Ubicación no implica un catálogo nuevo. Separar el piso entero del texto de edificio/ubicación. El rótulo de pizarrón debe usar Tiza o Fibrón según el dominio.
- Las tablas conservan paginación, orden y filtros establecidos; su ausencia gráfica en estas vistas reducidas no elimina esos comportamientos.
- En calendario, «Crear año» debe estar disponible para Admin; su tono tenue en la imagen no representa una restricción por tener un año habilitado. La columna de fechas no lectivas debe decir «Descripción», no «Tipo». El texto «No configurable» del horario puede omitirse.
- El primer cuatrimestre del ejemplo se consulta como histórico. Las operaciones concretas siempre obedecen a protecciones y dependencias de la especificación, no solo a su posición cronológica.

Referencias: [calendario](../../../especificacion/06-calendario-y-datos-de-referencia.md), [cuentas](../../../especificacion/10-cuentas-y-acceso.md), [modelo de aulas](../../../especificacion/13-modelo-consolidado.md). Aprobada la composición general con las precisiones documentadas; no verifica accesibilidad ni interacción.

Generadas con la herramienta integrada de imágenes, referencia B adjunta. [Prompts](prompts.md).
