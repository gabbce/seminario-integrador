# Catálogo de requisitos y casos de uso

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: catálogo y trazabilidad de la especificación v1.0 final; conserva la base documental histórica. El detalle literal de los flujos, precondiciones, postcondiciones, alternativas y excepciones se conserva en las [29 fichas originales](../fuentes/02-requerimientos.md#5-fichas-de-casos-de-uso).

Cada fila relaciona el requisito y su caso de uso del mismo número. No se agregaron ni renumeraron RF históricos; las ampliaciones aprobadas se documentan como extensiones en los [casos de uso vigentes](18-casos-de-uso-vigentes.md).

| Requisito | Caso de uso | Nombre |
|---|---|---|
| RF-01 | CU-01 | Autenticación y autorización |
| RF-02 | CU-02 | Registrar usuario |
| RF-03 | CU-03 | Buscar usuarios |
| RF-04 | CU-04 | Modificar usuario |
| RF-05 | CU-05 | Eliminar usuario (baja lógica) |
| RF-06 | CU-06 | Crear aula |
| RF-07 | CU-07 | Buscar aulas |
| RF-08 | CU-08 | Modificar aula |
| RF-09 | CU-09 | Eliminar aula (baja lógica) |
| RF-10 | CU-10 | Buscar año lectivo |
| RF-11 | CU-11 | Crear año lectivo |
| RF-12 | CU-12 | Modificar año lectivo |
| RF-13 | CU-13 | Eliminar año lectivo |
| RF-14 | CU-14 | Buscar cuatrimestre |
| RF-15 | CU-15 | Crear cuatrimestre |
| RF-16 | CU-16 | Modificar cuatrimestre |
| RF-17 | CU-17 | Eliminar cuatrimestre |
| RF-18 | CU-18 | Consultar disponibilidad de aulas |
| RF-19 | CU-19 | Sugerir aulas disponibles |
| RF-20 | CU-20 | Verificar solapamientos |
| RF-21 | CU-21 | Registrar reserva esporádica |
| RF-22 | CU-22 | Registrar reserva por período |
| RF-23 | CU-23 | Confirmar reserva |
| RF-24 | CU-24 | Modificar reserva |
| RF-25 | CU-25 | Cancelar reserva |
| RF-26 | CU-26 | Listar reservas por día |
| RF-27 | CU-27 | Listar reservas por curso |
| RF-28 | CU-28 | Visualización de ocupación (agenda Docente) |
| RF-29 | CU-29 | Dashboards y estadísticas |

## Ajustes acordados respecto de la fuente

DA-03 amplía explícitamente el alta de cuentas de RF-02/CU-02 al rol Docente para consulta. No agrega gestión académica de docentes. DA-04 elimina la necesidad de integración externa sugerida por las notas del DER; DA-48/52 definen posteriormente la identificación del curso.

DA-06 completa los permisos: Admin accede a las operaciones de Bedel y administra exclusivamente cuentas y calendario. DA-07 permite registrar un docente sin cuenta y mantiene consulta general para el rol Docente. DA-08 elimina la exigencia de código institucional del curso; su identidad interna está en definición.

DA-15 exige seleccionar al docente desde la lista fija. DA-16 precisa fechas de recurrencias y bloqueo de feriados. La gestión manual de feriados de DA-13/17/18 es una ampliación solicitada durante la entrevista; su definición y criterios se mantienen en [calendario y datos de referencia](06-calendario-y-datos-de-referencia.md). No se altera la numeración de los requisitos históricos.

DA-19 a DA-23 precisan preparación sin persistencia, confirmación completa, acciones sobre futuras, estados de cancelación y registro en períodos iniciados. Los flujos y criterios se detallan en [ciclo de reservas](07-ciclo-de-reservas.md).

DA-24 a DA-28 precisan RF/CU-18/19/21/22/23: horario por día de semana, aplicación de aula a fechas compatibles, hasta tres sugerencias y acceso a otras, exclusión explícita de fechas e información de menor solapamiento. Ver [selección de aulas](07-ciclo-de-reservas.md#horarios-y-selección-de-aulas-da-24-a-da-28).

DA-29 a DA-32 precisan RF/CU-06 a 09 y 18/19: subtipos de aula originales, capacidad por personas, cantidad de PC solo descriptiva y protección de reservas ante cambios y bajas.

DA-33 a DA-37 concretan mensajes al operador, agenda para los tres roles, datos visibles, consulta de canceladas e impresión del listado diario. Ver [consultas y comunicaciones](08-consultas-y-comunicaciones.md).

DA-38 a DA-42 ajustan RF/CU-29: horas reservadas, ocupación porcentual, demanda atendida y concurrencia teórica de alumnos/clases. Se elimina expresamente la estadística de conflictos, sin quitar validaciones operativas. Ver [indicadores y horas pico](09-indicadores-y-horas-pico.md).

DA-43/44/45 acuerdan promedios de semana típica, vistas por día/cuatrimestre/rango y métricas de concurrencia y alumnos-hora sin presentar personas únicas. DA-46 define el dato de alumnos de la reserva.

DA-46 renombra «capacidad mínima solicitada» a «cantidad de alumnos prevista» en el pedido. Se usa como mínimo de capacidad al buscar aulas y como cantidad para métricas. Los textos originales siguientes conservan su terminología histórica.

DA-47 a DA-51 precisan edición de datos compartidos e historial, identificador anual de curso, exclusión de reactivación, concurrencia de edición y protección de clases en curso.

DA-52 a DA-56 definen código anual de curso, esporádicas en receso, extensión de series al ampliar cuatrimestres o quitar feriados y exclusión de restauración de aulas dadas de baja. DA-57 a DA-60 cierran conflictos y excepciones de regeneración.

DA-57 a DA-60 exigen revisión y guardado conjunto del calendario y nuevas clases, preservando exclusiones, cancelaciones, cese de continuidad y patrón semanal. Ver el ciclo de reservas actualizado.

DA-61 a DA-65 concretan RF/CU-01 a 05: email y contraseña, rol único, política de 12 caracteres, frase temporal y cambio obligatorio, baja/rehabilitación y cierre tras 120 minutos de inactividad. Ver [cuentas y acceso](10-cuentas-y-acceso.md).

DA-66 a DA-69 precisan RF/CU-10 a 17: estados del año, eliminación del estado independiente de cuatrimestre, eliminación protegida y calendario sin cambios retroactivos. El estado de cuatrimestre de los textos originales siguientes queda sustituido por dependencia del año, no por un nuevo campo editable.

DA-74 a DA-77 fijan libertad tecnológica, demo local, auditoría consultable con herramientas técnicas y excepción de Admin inicial por variable de entorno sin cambio obligatorio.

DA-78 a DA-80 reemplazan Django por opciones Java/Node/Laravel y React/Next; aprueban PostgreSQL, Docker Compose y gráficos con Chart.js/tabla coloreada. DA-81 aprueba el stack concreto del documento 12.

DA-81 aprueba Java/Spring Boot y React/Vite con las bibliotecas acordadas. Modelo, pantallas y contratos consolidados se encuentran en documentos 13 a 15; aún no se ha iniciado código.

DA-82/83/84 cierran turno/legajo opcionales, requisitos compartidos fijos tras iniciar la serie y reprogramación dentro de períodos asignados. DA-85 precisa el denominador de ocupación sin historial de estados del año. Los casos de uso vigentes están consolidados en el documento 18.

## Requisitos funcionales originales

### RF-01: Autenticación y autorización

El sistema debe permitir a Administradores, Bedeles y Docentes iniciar y cerrar sesión aplicando control de acceso por rol y bloqueo temporal tras cinco intentos fallidos.

### RF-02: Registrar usuario

El sistema debe permitir al Administrador crear usuarios con nombre, email, rol y contraseña, validando unicidad de email y políticas de contraseña.

### RF-03: Buscar usuarios

El sistema debe permitir al Administrador buscar usuarios por nombre, email, rol y estado, con paginación y ordenamiento de resultados.

### RF-04: Modificar usuario

El sistema debe permitir al Administrador editar datos y rol de un usuario asegurando que no se degrade ni elimine al último Administrador activo.

### RF-05: Eliminar usuario (baja lógica)

El sistema debe permitir al Administrador deshabilitar usuarios con confirmación, impidiendo la baja si es el último Administrador activo y registrando auditoría.

### RF-06: Crear aula

El sistema debe permitir a Administradores y Bedeles crear aulas indicando identificador, edificio/piso, tipo, capacidad, características y estado, validando identificador único.

### RF-07: Buscar aulas

El sistema debe permitir a Bedeles buscar aulas por número, tipo, capacidad mínima, estado y características, devolviendo aulas con capacidad mayor o igual a la requerida.

### RF-08: Modificar aula

El sistema debe permitir a Bedeles actualizar datos y estado de un aula bloqueando la inhabilitación si existen reservas futuras y registrando auditoría

### RF-09: Eliminar aula (baja lógica)

El sistema debe permitir a Bedeles dar de baja aulas con confirmación, impidiendo la operación si existen reservas futuras y dejando traza de auditoría

### RF-10: Buscar año lectivo

El sistema debe permitir a los Administradores listar años lectivos por año y estado con filtros y paginación.

### RF-11: Crear año lectivo

El sistema debe permitir a los Administradores crear años lectivos únicos definiendo su estado y estableciendo que cada año contiene exactamente dos cuatrimestres.

### RF-12: Modificar año lectivo

El sistema debe permitir a los Administradores actualizar los atributos del año lectivo manteniendo la consistencia con sus cuatrimestres asociados.

### RF-13: Eliminar año lectivo

El sistema debe permitir a los Administradores eliminar un año lectivo solo si no tiene cuatrimestres ni reservas asociadas, registrando auditoría.

### RF-14: Buscar cuatrimestre

El sistema debe permitir a los Administradores listar cuatrimestres por año, fechas de inicio y fin y estado, con filtros y paginación.

### RF-15: Crear cuatrimestre

El sistema debe permitir a los Administradores crear cuatrimestres para un año lectivo definiendo fechas de inicio y fin y estado, evitando solapamientos y más de dos por año.

### RF-16: Modificar cuatrimestre

El sistema debe permitir a los Administradores actualizar fechas y estado de un cuatrimestre validando que no se solape con otro del mismo año.

### RF-17: Eliminar cuatrimestre

El sistema debe permitir a Administradores eliminar un cuatrimestre solo si no existen reservas asociadas

### RF-18: Consultar disponibilidad de aulas

El sistema debe permitir a Bedeles y Docentes consultar disponibilidad por tipo de aula, capacidad mínima, características, fecha o período, hora de inicio y duración en múltiplos de 30 minutos, excluyendo aulas inactivas y solapamientos.

### RF-19: Sugerir aulas disponibles

El sistema debe sugerir a Bedeles, para cada día consultado, tres aulas disponibles con capacidad más cercana por exceso a la solicitada, mostrando ubicación y características.

### RF-20: Verificar solapamientos

El sistema debe verificar, antes de confirmar o modificar reservas, la existencia de superposiciones con reservas vigentes del aula y detallar los conflictos detectados.

### RF-21: Registrar reserva esporádica

El sistema debe permitir a Bedeles registrar reservas para una o más fechas específicas indicando curso, docente, email, tipo de aula, capacidad mínima, características, hora de inicio y duración, validando fechas futuras y ausencia de solapamientos.

### RF-22: Registrar reserva por período

El sistema debe permitir a Bedeles registrar reservas periódicas dentro de un cuatrimestre o año seleccionando días, hora de inicio y duración, derivando ocurrencias y validando solapamientos

### RF-23: Confirmar reserva

El sistema debe permitir a Bedeles confirmar reservas válidas generando las mismas de forma transaccional y emitiendo notificaciones.

### RF-24: Modificar reserva

El sistema debe permitir a Bedeles y Administradores modificar aula, horarios, fechas o datos asociados revalidando reglas y solapamientos antes de persistir.

### RF-25: Cancelar reserva

El sistema debe permitir a Bedeles y Administradores cancelar reservas total o parcialmente por fecha registrando el motivo e impidiendo cancelar ocurrencias pasadas.

### RF-26: Listar reservas por día

El sistema debe permitir a Administradores, Bedeles y Docentes listar reservas de una fecha con filtros por tipo y aula, mostrando docente, curso, aula y horario.

### RF-27: Listar reservas por curso

El sistema debe permitir a Administradores, Bedeles y Docentes obtener el listado anual de reservas de un curso o cátedra ordenado cronológicamente.

### RF-28: Visualización de ocupación (agenda Docente)

El sistema debe permitir a Docentes visualizar en modo solo lectura una agenda diaria o semanal con disponibilidad y reservas asociadas.

### RF-29: Dashboards y estadísticas

El sistema debe permitir a Administradores y Bedeles visualizar paneles con indicadores de ocupación, horas reservadas, conflictos y demanda por rangos de fechas.

## Uso durante la definición

Las fichas históricas se mantienen sin reescribir; los cambios de comportamiento están registrados en DA-01 a DA-85. El documento 18 contiene los casos vigentes y sus criterios de aceptación. Este catálogo preserva la numeración y texto original para trazabilidad.
