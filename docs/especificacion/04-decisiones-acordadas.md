# Registro de decisiones acordadas

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Registro de las 85 decisiones vigentes de la especificación v1.0.

**DA significa Decisión Acordada.** Cada fila identifica una definición resuelta, su alcance y sus implicaciones. Estado: registro final de la especificación v1.0.

## Decisiones acordadas

| ID | Decisión | Consecuencia |
|---|---|---|
| DA-01 | Respetar lo más posible el diseño de los diagramas; son fuente de verdad, aunque no inmutables. | Justificar y acordar los cambios. No reemplazar el modelo por preferencias de implementación. |
| DA-02 | Primera versión para una institución. | No incluir administración de múltiples instituciones. |
| DA-03 | Administrador crea cuentas docentes de consulta. | Completar RF-02/CU-02 para incluir ese rol; mantener fuera la gestión académica de docentes. |
| DA-04 | Sin integración académica externa ni API de feriados. | Supabase provee PostgreSQL y Auth; docentes y cursos no se sincronizan con otro sistema académico. |
| DA-05 | Esta etapa es exclusivamente de definición y documentación. | No escribir código de aplicación ni ampliar el alcance innecesariamente. |
| DA-06 | Administrador puede realizar todas las operaciones de Bedel; solo Administrador gestiona cuentas y calendario académico. Docente solo consulta. | Ajustar asociaciones de permisos del diagrama CU y permitir que Admin registre reservas. |
| DA-07 | Se puede reservar para un docente sin cuenta, registrando nombre, apellido y email. Las cuentas docentes consultan la ocupación general. | No exigir una cuenta docente como condición de registro ni limitar listados a reservas propias. |
| DA-08 | No existe código institucional para los cursos; el usuario admite un identificador generado por el sistema. | No exigir un código institucional. Precisado posteriormente por DA-48/52: identificador funcional anual compuesto. |
| DA-09 | Los datos del docente se representarán mediante una fuente externa simulada localmente, como propuso el usuario. | Se adopta una lista fija de registros con ID, nombre, apellido y email; no un enum ni una integración real. Selección exclusiva de la lista confirmada por DA-15. |
| DA-10 | Se distinguen cursos por comisión. | El listado no debe mezclar comisiones de una misma materia; referencia estable con ID interno, materia y comisión, completada con año y código visible en DA-51/52. |
| DA-11 | El año y sus cuatrimestres se cargan por etapas; el año se habilita para reservas cuando tiene ambos cuatrimestres completos y sin solapamiento. | Precisar estados y restricciones de cambios posteriores, conservando el ABM individual. |
| DA-12 | Duraciones en módulos de 30 minutos, inicio a las :00 o :30, reservas contiguas permitidas y sin cruce de medianoche. Se admite hoy si el inicio aún no ocurrió. | Precisar RF-18/21/22 y la nota «x minutos» del modelo. |
| DA-13 | El usuario propone gestionar feriados desde el calendario del Administrador. | Incorporar gestión manual mínima de fechas no lectivas; impacto sobre reservas existentes resuelto en DA-17. Autocompletado fuera de la primera versión (DA-18). |
| DA-14 | El usuario admite lunes a viernes de 07:00 a 23:00 como alternativa a un horario configurable. | Se elige esa alternativa para la primera versión, evitando una pantalla de configuración de apertura. Es una elección de alcance dentro de la alternativa autorizada. |
| DA-15 | El docente solicitante se selecciona exclusivamente de la lista fija que simula la fuente externa. | No hay carga libre ni ABM de docentes; no se requiere cuenta de acceso para el docente seleccionado. |
| DA-16 | Las reservas anuales abarcan los dos cuatrimestres, excluyen el receso entre ellos y omiten los feriados cargados. Los feriados también impiden reservas esporádicas. | Validar contra el calendario local y mostrar las fechas excluidas en la preparación de una recurrencia. |
| DA-17 | Antes de guardar un feriado que afecta reservas futuras, se muestran las reservas y se exige cancelarlas o reprogramarlas. | Bloquear el cambio mientras haya reservas futuras vigentes afectadas; no cancelarlas automáticamente. |
| DA-18 | El gestor manual de feriados es suficiente para la primera versión. | Autocompletado como posible mejora futura, fuera del alcance comprometido y sin integración a API de feriados. |
| DA-19 | La preparación de una reserva es temporal: no ocupa aulas ni se guarda como borrador. Al confirmar se registra como CONFIRMADA. | PENDIENTE describe solo la preparación, sin persistencia ni aprobación. |
| DA-20 | Si aparece un conflicto al confirmar, se rechaza la operación completa, se muestran fechas afectadas y se conserva la selección para corregirla. | Confirmación de todas las ocurrencias seleccionadas o ninguna; conservación durante el flujo actual, sin borrador persistente. |
| DA-21 | Se pueden modificar o cancelar una fecha, varias seleccionadas o todas las futuras, preservando ocurrencias iniciadas o pasadas. La cancelación exige motivo. | Aplicar el alcance elegido solo a ocurrencias futuras; no alterar el historial de clases iniciadas. |
| DA-22 | DetalleReserva incorpora estado y motivo de cancelación. La cabecera sigue CONFIRMADA mientras alguna ocurrencia no esté cancelada y queda CANCELADA cuando todas lo estén. | Las canceladas liberan el aula y conservan historial. CONFIRMADA no significa que todavía queden clases futuras. |
| DA-23 | Se admite registrar reservas cuatrimestrales o anuales con el período ya iniciado, generando solo ocurrencias que aún no comenzaron y mostrando las omitidas. | No generar clases retroactivas; combinar con días hábiles, feriados y períodos acordados. |
| DA-24 | Una reserva periódica admite horario de inicio y duración por día de semana. | Por ejemplo, lunes 08–10 y miércoles 10–12; cada ocurrencia conserva su horario concreto. |
| DA-25 | Se puede aplicar un aula a las ocurrencias de un día de semana donde esté disponible y resolver individualmente las restantes. | Validar cada fecha, sin asignar en conflictos ni cambiar aulas silenciosamente. |
| DA-26 | Mostrar hasta tres sugerencias por menor capacidad suficiente y desempatar por identificador. Si hay menos, mostrar las existentes; permitir consultar las demás aulas válidas. | La sugerencia no limita la selección exclusivamente a tres aulas. |
| DA-27 | Se pueden excluir explícitamente fechas antes de confirmar, mostrando cuáles quedan fuera. | Confirmación completa sobre el conjunto final elegido. El «di» de la respuesta 4 se interpretó como «sí» por el contexto y se informó al usuario. |
| DA-28 | Cuando no hay disponibilidad, mostrar aulas compatibles ordenadas por menor cantidad de minutos de superposición y sus reservas conflictivas. | Información para resolver conflictos, sin permitir sobre-reservas. |
| DA-29 | Mantener General, Multimedios y Laboratorio informático y los atributos comunes/específicos de los diagramas. | Conservar la especialización de aulas y usar «Laboratorio informático» como nombre funcional. |
| DA-30 | La capacidad se evalúa por cantidad de personas. La cantidad de PC no es parámetro de búsqueda ni requisito de reserva. | Se conserva cantidad de PC como dato descriptivo del modelo; no filtra, ordena ni valida disponibilidad o sugerencias. |
| DA-31 | Guardar los requisitos solicitados y bloquear cambios de capacidad, tipo o equipamiento que invaliden reservas futuras. | Reasignar o cancelar las clases afectadas antes del cambio. |
| DA-32 | HABILITADA permite reservar; INHABILITADA y MANTENIMIENTO no. Baja lógica retira el aula de la operación habitual conservando historial. | Bloquear paso a no reservable o baja si existen reservas futuras vigentes. |
| DA-33 | Notificar confirmaciones y cancelaciones mediante mensajes en pantalla al operador. | Sin emails en esta versión; el email docente es dato de contacto, sin servicio de envío. |
| DA-34 | Agenda diaria/semanal para los tres roles, con filtros por fecha, tipo y aula. | Docente solo consulta; Bedel y Admin acceden desde ella a modificar/cancelar respetando reglas. |
| DA-35 | Mostrar curso, comisión, nombre docente, aula y horario. | Email docente solo en detalle accesible a Bedel/Admin, no en consultas de Docente. |
| DA-36 | Ocultar canceladas de la agenda de ocupación; consultarlas por filtro de estado en listados. | Identificarlas claramente y no contarlas como ocupación. |
| DA-37 | Vista imprimible para CU-26 y guardado como PDF mediante el navegador. | No incluir exportación a Excel ni generación separada de PDF. |
| DA-38 | Medir horas reservadas sumando duración de ocurrencias no canceladas dentro del rango, con desglose por aula y tipo. | Tiempo reservado, no asistencia ni clase efectivamente dictada. |
| DA-39 | Incluir porcentaje de ocupación: horas reservadas / horas habilitadas para reservar × 100, excluyendo cierres y feriados. | Conservar cuándo estuvo habilitada cada aula para no usar su estado actual como sustituto del histórico. |
| DA-40 | Demanda atendida: cantidad de ocurrencias y horas reservadas por tipo de aula. | No medir solicitudes abandonadas o no satisfechas. |
| DA-41 | Eliminar indicadores de conflictos por complejidad innecesaria. | Ajustar RF/CU-29; no registrar intentos rechazados con fines estadísticos. Conservar validación e información operativa de solapamientos. |
| DA-42 | Incorporar horas pico mediante alumnos teóricos y clases simultáneas, suponiendo 100 % de asistencia. | Vistas por día y semana típica del cuatrimestre; evaluar utilidad de rangos seleccionados. Fuente del número de alumnos acordada por DA-46; agregación y vistas precisadas por DA-43/44/45. |
| DA-43 | Semana típica: promediar cada franja entre días equivalentes del período, incluyendo días lectivos sin reservas como cero y excluyendo feriados. | Comparar lunes y miércoles sin sesgo por distinta cantidad de fechas; mostrar fechas incluidas. |
| DA-44 | Vistas de día concreto, semana típica por cuatrimestre y rango personalizado, en franjas de 30 minutos. | Reutilizar fórmulas y filtros, sin otro tipo de reporte. |
| DA-45 | Incluir pico de concurrencia y alumnos-hora, evitando interpretar repeticiones como personas únicas. | No ofrecer totales de alumnos únicos ni sumar franjas como si fueran personas distintas. No se puede deduplicar alumnos entre clases sin datos individuales. |
| DA-46 | «Capacidad mínima solicitada» se renombra «Cantidad de alumnos prevista» en la reserva, como único dato del pedido. | Se usa para exigir capacidad de aula mayor o igual y para métricas de concurrencia; no se agrega otro campo de capacidad solicitada ni se modifica la capacidad física del aula. |
| DA-47 | Docente, curso/comisión y cantidad de alumnos pueden cambiar mientras ninguna ocurrencia haya comenzado, revalidando aulas. Una vez iniciada la serie quedan fijos. | Para cambiar esos datos después, cancelar futuras afectadas y crear otra reserva; no modificar datos históricos ni agregar versiones por ocurrencia. |
| DA-48 | Identificar el curso mediante código de materia + comisión + año, como pidió el usuario. | La referencia es anual; no se reutiliza la misma identidad de curso entre años. DA-52 define generación numérica y formato exacto. |
| DA-49 | Las ocurrencias canceladas no se reactivan. | Si se necesita nuevamente la clase, registrar una nueva reserva y verificar disponibilidad. |
| DA-50 | Si otro operador cambió una reserva desde que se abrió, avisar y exigir revisar la versión actual antes de guardar. | No sobrescribir silenciosamente cambios ajenos, incluidas cancelaciones. |
| DA-51 | Proteger también aulas con clases en curso ante inhabilitación, baja o retiro de características requeridas. | La protección de futuras se extiende hasta finalizar las clases ya iniciadas. |
| DA-52 | Generar código numérico de materia sin prefijo MAT, reutilizado entre comisiones y años; identificador de curso como 001-A-2026. | Mantener nombre completo para selección; no exigir código institucional. |
| DA-53 | Permitir reservas esporádicas en receso entre cuatrimestres, dentro del año habilitado, días de apertura y sin feriados. | Cubre usos como mesas de finales sin agregar gestión de exámenes. |
| DA-54 | Bloquear cambios de cuatrimestre que dejen clases registradas fuera de su período. Si se amplía el período, extender las reservas periódicas correspondientes. | Reemplaza la propuesta de no agregar clases al ampliar; exige generación de nuevas ocurrencias y resolución de aulas/conflictos. |
| DA-55 | Al quitar un feriado, agregar las clases periódicas correspondientes a ese día. | Reemplaza la propuesta de solo habilitar nuevas reservas; no equivale a reactivar detalles cancelados. Reglas de reconciliación resueltas por DA-57 a DA-60. |
| DA-56 | No restaurar aulas dadas de baja en esta versión. | Para interrupciones temporales se usan INHABILITADA o MANTENIMIENTO. |
| DA-57 | Antes de guardar ampliaciones de cuatrimestre o eliminación de feriados, mostrar las nuevas clases. Proponer el aula de la última ocurrencia no cancelada del mismo día de semana si es válida; resolver las restantes manualmente. | Guardar calendario y nuevas ocurrencias juntos, solo cuando todas las asignaciones estén resueltas y revalidadas. |
| DA-58 | Generar solo fechas futuras omitidas por calendario o agregadas por ampliación. | No recuperar detalles cancelados, fechas excluidas manualmente ni reservas totalmente canceladas. |
| DA-59 | No extender series que quedaron sin continuidad porque se cancelaron todas sus ocurrencias futuras, aunque la cabecera siga CONFIRMADA por clases pasadas. | No confundir este caso con una serie que terminó naturalmente su calendario; preservar intención de cese. |
| DA-60 | Una reprogramación puntual es una excepción de la fecha, no un cambio del patrón semanal. | Las nuevas fechas se generan con día y horario del patrón original, sin duplicar la clase reprogramada. |
| DA-61 | Login con email y contraseña mediante Supabase Auth; sin registro público. | Administrador crea cuentas con rol único de Admin, Bedel o Docente. |
| DA-62 | Política de contraseña y límites de autenticación gestionados por Supabase. | No implementar mínimo, contadores de fallos ni bloqueo propios; mostrar errores del proveedor. |
| DA-63 | Administrador establece la contraseña al crear o restablecer una cuenta desde la app. | Operación privilegiada del backend; sin frase temporal generada, cambio obligatorio ni correo. |
| DA-64 | Deshabilitar impide operaciones de la app; rehabilitar permite acceso con identidad válida. | Java verifica activo y rol actuales en cada solicitud; se conservan reservas e historial sin exigir revocación global instantánea de JWT. |
| DA-65 | Supabase gestiona sesiones, renovación y cierre. | Sin reloj propio de inactividad ni tabla de sesiones. Si no hay identidad válida, solicitar ingreso; la preparación no se recupera. Se respetan los límites del proveedor sobre tokens emitidos. |
| DA-66 | Año lectivo con estados EN PREPARACIÓN, HABILITADO y CERRADO. Solo cerrar sin clases futuras ni en curso. | Preparación permite cargar datos; habilitado permite reservar; cerrado conserva consultas/historial e impide nuevas reservas y cambios. |
| DA-67 | Cuatrimestres sin habilitación independiente; disponibilidad determinada por año y fechas. | Simplificar el atributo estado del modelo original, sin eliminar las fechas ni la pertenencia al año. |
| DA-68 | Eliminar cuatrimestre solo sin reservas asociadas; el año vuelve a preparación. Bloquear si afecta reservas futuras o en curso del año. | Mantener integridad de reservas y regla de dos cuatrimestres para habilitar. |
| DA-69 | No agregar ni quitar feriados de fechas pasadas, ni modificar clases ya iniciadas mediante edición de calendario. | Preservar historial e indicadores; aplicar también a correcciones de fecha que equivalgan a altas/bajas retroactivas. |
| DA-70 | Referencia institucional: facultad de Santa Fe, Argentina, con fechas y horas locales. | Usar zona institucional America/Argentina/Cordoba; no el horario del equipo del visitante. |
| DA-71 | Aplicación web; operación Admin/Bedel principalmente en computadora y consultas docentes cómodas desde celular. | Sin app móvil nativa. |
| DA-72 | No existe estimación de aulas ni reservas. | Adoptar un escenario sintético de validación documentado, sin considerarlo volumen real ni límite del sistema. |
| DA-73 | Demo académica con datos ficticios y carga reproducible. | No exigir respaldos, retención, restauración, alta disponibilidad ni infraestructura de producción. |
| DA-74 | La cátedra no impone tecnologías; deben definirse para el proyecto. | PostgreSQL continúa como requisito original; stack concreto aprobado por DA-81. |
| DA-75 | La app puede ejecutarse localmente o alojarse en la web; necesita internet para Supabase. | Docker Compose facilita ejecución local de la app. Hosting de Java/React se elige al publicar, con HTTPS. |
| DA-76 | Conservar auditoría de operaciones del dominio con consulta técnica. | Sin panel ni réplica en Java de la bitácora interna de autenticación de Supabase. |
| DA-77 | Inicializar identidad Auth y perfil del primer Admin con email y contraseña de variables privadas. | No duplicar ni sobrescribir cuentas al arrancar; completar inicializaciones parciales verificando el vínculo. Sin cambio obligatorio. |
| DA-78 | Backend Java/Spring Boot y frontend React/TypeScript/Vite con shadcn/ui y Tailwind. | Supabase administra base e identidad; las reglas de negocio permanecen en Java. |
| DA-79 | PostgreSQL administrado en Supabase y Docker Compose para la app local. | No levantar base local ni servicio auxiliar de respaldos; registrar versión de PostgreSQL del proyecto elegido. |
| DA-80 | Aprobada la propuesta de gráficos: Chart.js y tabla coloreada para semana típica. | Conservar fórmulas y vistas acordadas; no agregar plataforma analítica. |
| DA-81 | Java/Spring Boot, Spring Security para validar JWT y permisos, JPA/Hibernate, React/TypeScript/Vite, shadcn/Tailwind, Chart.js y Supabase PostgreSQL/Auth. | API de negocio única; cliente usa Auth y Java accede a la base. Las credenciales administrativas se guardan solo en backend. |
| DA-82 | Turno de Bedel y legajo de Docente son datos descriptivos opcionales. | No restringen acceso ni requieren coincidencia con la lista externa simulada. |
| DA-83 | Tipo de aula y equipamiento solicitados quedan fijos cuando comienza la serie, igual que docente, curso y alumnos. | Si cambian, cancelar futuras afectadas y crear otra reserva. Reasignaciones de aula/horario deben seguir cumpliendo el pedido original. |
| DA-84 | Reprogramar una ocurrencia periódica solo dentro de los períodos asignados. | Para recuperar fuera, cancelar la original y registrar una esporádica, respetando año, apertura, feriados y disponibilidad. |
| DA-85 | La ocupación se calcula por disponibilidad del espacio: fechas, apertura institucional, feriados e HistorialAula. El estado administrativo del año controla operaciones, no altera estadísticas. Solo cuentan módulos completos disponibles de 30 minutos. | Precisa los «cierres» de DA-39; no requiere historial de estados del año. Habilitar un aula a las 10:10 aporta disponibilidad desde las 10:30. |

## Cierre de decisiones relevadas

No quedan preguntas funcionales abiertas de la entrevista. Se conserva la numeración P para identificar qué decisiones las resolvieron. Los detalles técnicos derivados se concretan en modelo, contratos y operación local; no se presentan como nuevas funcionalidades aprobadas.

| Pendiente original | Resolución |
|---|---|
| P-01/02: permisos | DA-06/34; matriz única de secciones y API. |
| P-03: identidad de curso | DA-48/52; código materia–comisión–año y referencia interna estable. |
| P-04: docente y cuenta | DA-07/09/15/82; lista de solicitantes independiente de cuentas. |
| P-05: carga y eliminación de cuatrimestres | DA-11/66/67/68. |
| P-06/09: calendario y series | DA-16/17/23/54 a DA-60/69/84. |
| P-07/08: tiempo | DA-12/14/70; zona institucional y módulos de 30 minutos. |
| P-10: PENDIENTE | DA-19; preparación sin persistencia. |
| P-11: edición y cancelación | DA-21/22/47/49/50/83/84. |
| P-12/13: selección y conflictos | DA-24 a DA-28; no sobre-reservar. |
| P-14/15: aulas | DA-29 a DA-32/51/56. |
| P-16: notificaciones | DA-33; mensajes en pantalla. |
| P-17: métricas | DA-38 a DA-46, DA-47/83/85 e HistorialAula del modelo consolidado. |
| P-18: consultas e impresión | DA-34 a DA-37. |
| P-19: cuentas | DA-61 a DA-65/77/82 y contratos de acceso. |
| P-20: auditoría | DA-76, modelo consolidado y operación local. |
| P-21: contexto y tecnología | DA-70 a DA-81; escenario de validación, arquitectura y operación local. |

## Diferencias con los originales

Las fuentes históricas permanecen intactas. El documento 13 explica los cambios al modelo; el documento 18 contiene los casos de uso vigentes. Las principales correcciones son rol registrador de Reserva, cardinalidades académicas, estado de cuatrimestre, PENDIENTE temporal, cancelación por detalle y referencias de curso/docente. Los requisitos de estadísticas de conflictos se excluyen por DA-41; la detección operativa de solapamientos permanece obligatoria.

## Investigación acotada: feriados argentinos

Se verificó la documentación de [ArgentinaDatos — Feriados](https://argentinadatos.com/docs/operations/get-feriados) el 05/09/2026. Ofrece consulta por año y devuelve fecha, tipo y nombre. Es un proveedor no gubernamental y declara La Nación como fuente; la documentación consultada indica años entre 2016 y 2026. No se verificó la cobertura de años futuros ni se probó una integración.

Existe también un [calendario oficial nacional](https://www.argentina.gob.ar/feriados) para consulta humana. La existencia de una API facilita traer fechas, pero no define cuáles suspenden clases en esta institución.

Resultado de la entrevista (DA-18): gestión manual en la primera versión; autocompletado fuera del alcance comprometido. Si en el futuro se adopta, que sea una importación puntual con revisión de Admin y alternativa manual ante fallo o año sin datos; nunca dependencia de red al reservar. La importación de feriados no forma parte de esta versión.

## Regeneración de series: resultado

DA-54/55 requieren conservar el patrón semanal de cada reserva periódica, además de sus ocurrencias. DA-57 a DA-60 resuelven asignación de aula, conflictos, guardado conjunto, protección de exclusiones/cancelaciones y conservación del patrón frente a excepciones. El diseño de datos debe representar esos hechos sin deducirlos solo del estado CONFIRMADA de la cabecera.

## Consolidación técnica

El stack está aprobado en ADR-0001. Los documentos 13 a 18 concretan modelo, pantallas, contratos, historias, operación y casos de uso vigentes. DA-82/83/84 cierran las últimas preguntas de rol y edición. DA-85 cierra la interpretación de ocupación. La especificación 1.0 queda final y aprobada por el usuario; no se ha iniciado código.
