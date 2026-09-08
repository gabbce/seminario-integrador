# Pantallas y navegación

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: definición de interfaz derivada de los casos de uso y acuerdos DA. No constituye diseño gráfico final ni implementación. React/Vite y shadcn/Tailwind están aprobados; no se agregan capacidades porque exista un componente para ellas.

**Estado visual consolidado:** todos los bloques presentados y la guía B están aprobados. El [índice de diseño](../diseno/README.md) reúne referencias y correcciones; el [plan del prototipo](../diseno/prototipo-navegable.md) define ejecución y verificaciones pendientes sin iniciar código.

## Dirección visual aprobada

Se adopta la dirección **B — PATIO** de la [segunda exploración visual](../diseno/mockups/v2/README.md): navegación superior en escritorio, fondo marfil, verde bosque como color principal, acentos terracota, títulos serif y paneles redondeados. Es la base visual del sistema, conservando legibilidad y densidad adecuadas para uso diario. La navegación mantiene los permisos de cada rol; su adaptación móvil se validará en el diseño detallado.

Las imágenes aprueban la dirección visual, no cada texto, cifra, alineación o interacción representada. Los comportamientos se rigen por esta especificación. El [plan de validación de interfaces](../diseno/validacion-interfaces.md) organiza el trabajo de diseño pendiente sin ampliar el alcance funcional.

## Entrada y navegación por rol

Se aprueba el [diseño B de administración](../diseno/mockups/administracion-b/README.md): aulas con listado/formulario, usuarios, calendario con fechas no lectivas y revisión del impacto de cambios. Usuarios y Calendario se agrupan bajo Administración para ese rol; Aulas conserva el acceso operativo de Bedel. Se mantienen las precisiones de campos y estados documentadas junto a las imágenes.

Ingresar con email y contraseña. Supabase autentica y Java comprueba perfil activo y permisos. Al ingresar, mostrar agenda del día como punto de partida común. Navegación por secciones visibles según permisos; el backend aplica las mismas restricciones.

| Sección | Administrador | Bedel | Docente |
|---|---|---|---|
| Agenda | Consulta y acceso a acciones permitidas | Consulta y acceso a acciones permitidas | Solo consulta |
| Disponibilidad | Consulta y paso a reserva | Consulta y paso a reserva | Solo consulta |
| Reservas/listados | Consulta, nueva, modificar/cancelar según vigencia | Igual | Solo consulta |
| Aulas | ABM y consulta | ABM y consulta | Sin gestión |
| Calendario académico | Gestión | Sin gestión | Sin gestión |
| Usuarios | Gestión | Sin gestión | Sin gestión |
| Estadísticas | Consulta | Consulta | Sin acceso |

No incluir panel de auditoría, gestión académica, notificaciones internas, recuperación pública ni configuración de horarios. Cerrar sesión permanece disponible para todos.

## Inventario de pantallas

| ID | Pantalla | Contenido y acciones | Trazabilidad |
|---|---|---|---|
| UI-01 | Ingreso | Email, contraseña y errores de Auth; sin registro público. | CU-01, DA-61/62 |
| UI-03 | Agenda | Día/semana, fecha, tipo y aula; bloques de ocurrencias no canceladas con curso/comisión/docente/horario. | CU-28, DA-34/35/36 |
| UI-04 | Disponibilidad | Tipo, alumnos previstos, características, fecha/período y horarios; resultados por fecha esporádica o patrón periódico, con disponibilidad completa y conflictos informativos. | CU-18/19/20, DA-24 a DA-30 |
| UI-05 | Nueva reserva | Flujo guiado descrito debajo, sin borrador persistente. | CU-21/22/23 |
| UI-06 | Listados | Pestañas por día y por curso/año; filtros, estado de ocurrencia, paginación y acceso a detalle. | CU-26/27, DA-36 |
| UI-07 | Detalle de reserva | Cabecera, fechas, aulas y estados; contacto solo para roles operativos; alcance de edición/cancelación. | CU-24/25, DA-35/47 |
| UI-08 | Editar/cancelar | Selección explícita de fechas, edición permitida o motivo obligatorio y resumen de alcance. | CU-24/25, DA-21/49/50 |
| UI-09 | Aulas | Listado filtrado y formularios alta/edición; estado/baja con confirmación y dependencias bloqueantes. | CU-06 a 09, DA-29 a DA-32/51/56 |
| UI-10 | Años y cuatrimestres | Listado por año/estado, detalle con dos períodos, transiciones y eliminación protegida. | CU-10 a 17, DA-66 a DA-69 |
| UI-11 | Feriados del año | Lista por fecha; agregar/corregir/quitar, impacto sobre clases, restricciones temporales. | DA-13/17/55/69 |
| UI-12 | Revisar cambio de calendario | Cambio propuesto, nuevas clases con aula del patrón, conflictos bloqueantes y confirmación conjunta. | DA-54 a DA-60 |
| UI-13 | Usuarios | Buscar, crear, editar, deshabilitar/rehabilitar y restablecer contraseña ingresada por Admin; errores del proveedor y alta incompleta. | CU-02 a 05, DA-63/64/77 |
| UI-14 | Estadísticas | Filtros por fecha/rango/cuatrimestre y aula/tipo donde corresponda; horas, ocupación, demanda atendida y horas pico. | CU-29, DA-38 a DA-46 |
| UI-15 | Listado diario imprimible | Resultados completos de filtros activos, sin controles de operación; impresión/PDF de navegador. | CU-26, DA-37 |

UI-08 y UI-12 pueden implementarse como pasos o diálogos de la sección correspondiente; este inventario no exige una URL o página independiente para cada uno.

## Flujo de registro

Para reservas periódicas se aprueba el [recorrido visual B](../diseno/mockups/flujo-periodico-b/README.md): una pantalla **Datos y fechas** reúne docente, curso, alumnos previstos, requisitos, período y horarios; continúa con **Aulas por día** y **Revisar**, donde se confirma. El éxito se muestra después del guardado, sin exigir otra confirmación. Los puntos siguientes describen las operaciones dentro de esos pasos, no pantallas independientes.

También se aprueba la [variante esporádica B](../diseno/mockups/flujo-esporadico-b/README.md): **Datos y fechas** con una fila por fecha concreta y horario, **Aulas por fecha** y **Revisar**. El resultado exitoso reutiliza el patrón de confirmación, con detalle por fecha y sin agrupación semanal.

1. Elegir esporádica o periódica. Seleccionar docente de lista fija, curso anual y cantidad de alumnos prevista; ingresar o reutilizar materia/comisión en el mismo flujo cuando corresponda.
2. Indicar tipo y características requeridas del aula. No mostrar filtro de PC.
3. Elegir fechas específicas o período y días con inicio/duración por día de semana. Mostrar reglas de apertura y omisiones de calendario.
4. En esporádicas, consultar y seleccionar aula por fecha. En periódicas, mostrar un bloque por día semanal con horario y número de fechas efectivas: seleccionar un aula disponible para todas. Fechas desplegables solo como detalle, sin radios de aula por fecha ni acción «Aplicar a fechas compatibles». Las exclusiones explícitas se revisan en datos/fechas y obligan a recalcular disponibilidad completa.
5. Revisar resumen: datos, fechas incluidas, aulas, horarios y fechas omitidas/excluidas identificadas. Exigir al menos una ocurrencia válida.
6. Si no hay disponibilidad, mostrar alternativas ordenadas en «Requieren resolver conflictos», con fechas y reservas; operadores ven registrador/contacto y docente solicitante diferenciados. No hay selector confirmable, envío de mensajes ni reasignación automática. Después de resolver por fuera del flujo, volver a consultar.
7. Confirmar. Mostrar éxito solo después de guardar todo; ante conflicto volver a asignaciones conservando datos de la preparación activa.

La selección no ocupa un aula. Deshabilitar el botón mientras se envía reduce dobles clics, pero no sustituye las validaciones del backend. Abandonar o vencer sesión pierde la preparación, de acuerdo con DA-19/65.

## Edición y cancelación

Se aprueba el [diseño B de listados, impresión y reprogramación](../diseno/mockups/listados-b/README.md): pestañas por día y curso, estado por ocurrencia, salida diaria imprimible con todos los resultados filtrados y comparación de fecha/horario original y propuesto para reprogramar una clase conservando el aula del patrón. Se mantienen las precisiones documentadas junto a las imágenes.

Abrir desde agenda o listado. Para una reserva histórica o clase iniciada, mostrar la restricción antes de que el operador complete un formulario inútil. Para futuras, seleccionar una, varias o todas las futuras y mostrar exactamente el alcance.

Una cancelación requiere motivo y confirmación; no usar la misma etiqueta para «cancelar la operación del formulario» y «cancelar la reserva». Cuando se cancela una clase, liberar ocupación y actualizar listados/indicadores tras respuesta exitosa.

Si cambió la versión, avisar «La reserva fue modificada por otro usuario; revisá los datos actuales» sin sobrescribir. Una cancelada no ofrece reactivación. Para cambiar docente/curso/alumnos de una serie iniciada, explicar el procedimiento acordado de cancelar futuras y registrar otra reserva.

## Agenda y móvil

Se aprueba la [propuesta B de operación diaria](../diseno/mockups/operacion-diaria-b/README.md): agenda diaria de escritorio con horas en filas y aulas en columnas, detalle de reserva, cambio de aula con alcance por patrón periódico y cancelación con selección y motivo. Los ajustes de representación indicados junto a los mockups se completarán en el diseño detallado.

En computadora, vista semanal con hora y día. En celular, priorizar día seleccionado y controles legibles; la semana puede requerir desplazamiento, pero debe existir una alternativa diaria utilizable. Los datos y permisos son los mismos; no se crea una app móvil distinta.

Una franja vacía en un aula inhabilitada o día no lectivo se identifica como no reservable. Ningún rol obtiene permiso de edición por hacer clic en un bloque si la API lo prohíbe.

## Estadísticas

Se aprueban la [composición diaria y semanal de indicadores](../diseno/mockups/indicadores-guia-b/README.md) y la [guía visual B](../diseno/guia-visual-b.md). Los gráficos se construirán con datos y fórmulas vigentes, aplicando las correcciones de escalas, unidades, filtros y tabla por tipo documentadas; las imágenes no son resultados de cálculo.

- Panel de horas reservadas, ocupación porcentual y demanda atendida, con unidades claras y fechas del filtro.
- Vista diaria de alumnos previstos/clases simultáneas por media hora, marcando picos.
- Semana típica con mapa coloreado de promedios por día/franja, escala y valores visibles.
- Comparación de días con pico y media diaria de alumnos-hora, sin «alumnos únicos».
- Rango personalizado usa las mismas fórmulas; no se suman promedios como si fueran totales.
- No mostrar indicadores de conflictos. Distinguir cero, sin horas habilitadas y cobertura histórica desconocida.

La carga de datos debe reflejar su estado real. Si cambia el filtro mientras hay una consulta pendiente, no mostrar una respuesta anterior como si correspondiera al filtro nuevo.

## Estados comunes de interfaz

Se aprueba el [diseño B de ingreso, móvil y estados](../diseno/mockups/ingreso-movil-estados-b/README.md), con sus ajustes documentados: ingreso simple, agenda móvil en lista diaria, formulario desplazable conservando pasos y error de consulta con reintento. Los estados comunes allí definidos complementan las reglas siguientes.

Para cada pantalla: cargando, datos listos, sin resultados, error corregible, error técnico y sesión vencida cuando corresponda. Validar campos y mostrar errores próximos al dato. Permisos y estados no se comunican solo mediante color. Etiquetas y navegación por teclado deben permitir operar formularios y diálogos.

Listados paginados conservan filtros y orden. Como convención técnica de v1.0, 20 resultados por página y opciones 20/50/100; no convertirlo en límite de cantidad de reservas o aulas. La agenda se consulta por día/semana y filtros, manteniendo completa la ocupación del conjunto mostrado; si se pagina por aulas, indicarlo y no omitir silenciosamente clases de esas aulas.

La presentación está en español y muestra horas de 24 horas. La documentación de API puede usar fechas ISO, pero los formularios deben presentar fechas comprensibles para el usuario.
