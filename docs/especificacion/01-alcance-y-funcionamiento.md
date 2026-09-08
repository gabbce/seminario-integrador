# Alcance y funcionamiento

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: alcance funcional consolidado 1.0 tras la entrevista. Fuentes: [presentación](../fuentes/01-presentacion.md) y [requerimientos](../fuentes/02-requerimientos.md).

## Contexto de la primera versión

Demo académica con datos ficticios para una facultad de Santa Fe. Aplicación web: operación Admin/Bedel desde computadora y consultas docentes también desde celular. Horario institucional de Santa Fe, sin app móvil nativa (DA-70/71/73). Puede ejecutarse localmente o en alojamiento web; necesita internet para Supabase en ambos casos. No se exigen respaldos ni recuperación de copias. El volumen real no está estimado; se usa un escenario sintético de validación, no un límite del producto (DA-72).

## Problema y objetivo

Digitalizar el circuito de reserva y asignación de aulas de centros educativos. Bedelía necesita asignar espacios adecuados al dictado de clases considerando capacidad, recursos, fechas y horarios, evitando superposiciones. La solución debe admitir operación concurrente y permitir consultar y auditar las asignaciones.

El objetivo es registrar reservas esporádicas y recurrentes, consultar disponibilidad, gestionar aulas y calendario académico, y ofrecer listados, agenda e indicadores de uso.

## Alcance documentado

- Inicio con email/contraseña y permisos por rol único: Administrador, Bedel y Docente. Sin registro público; autenticación y sesiones gestionadas por Supabase (DA-61/65).
- Alta, búsqueda, modificación y baja lógica de cuentas de administradores y bedeles. Se acuerda que el Administrador crea también cuentas docentes de consulta (DA-03).
- Gestión de aulas generales, multimedios y laboratorios informáticos. La capacidad se mide por personas; cantidad de PC queda como dato descriptivo y no es parámetro de búsqueda ni reserva (DA-29/30).
- Gestión de años lectivos en preparación, habilitados o cerrados. Cuatrimestres dependientes del año, carga por etapas y habilitación con ambos completos (DA-11/66/67).
- Gestión manual de feriados por Administrador, incorporada durante la entrevista (DA-13); bloqueando altas de feriados con reservas futuras afectadas hasta resolverlas (DA-17).
- Consulta de disponibilidad por criterios; sugerencia de tres aulas por día para Bedel.
- Registro esporádico y periódico, confirmación, modificación y cancelación de reservas.
- Listados por día y por curso/comisión/año; agenda diaria/semanal para todos los roles. Docente solo consulta (DA-34).
- Paneles de ocupación porcentual, horas reservadas, demanda atendida y horas pico de alumnos/clases para Administrador y Bedel. Se excluyen indicadores de conflictos (DA-38 a DA-42).
- Mensajes en pantalla al operador al confirmar/cancelar; sin envío de emails (DA-33).
- Vista imprimible del listado diario y PDF mediante el navegador, sin Excel (DA-37).

## Fuera de alcance explícito

Gestión académica de cátedras y gestión académica de docentes. Esto no elimina los datos del docente y curso necesarios para registrar una reserva, las cuentas de consulta las crea Administrador (DA-03).

## Límites acordados

Una institución, sin integración académica externa; Supabase provee PostgreSQL y autenticación. Los datos necesarios de docente y curso se registran en la reserva. El docente proviene de una lista fija que simula el origen externo (DA-09). Se distinguen comisiones (DA-10). Los diagramas son fuente de verdad y se respeta su diseño tanto como sea posible; los ajustes se justificarán y acordarán.

## Límites del alcance definido

La optimización automática global de horarios no forma parte de los casos de uso definidos. El autocompletado de feriados queda fuera de la primera versión (DA-18). La sugerencia documentada de aulas se limita al criterio de capacidad descrito en RF-19.

## Circuito principal documentado

1. Administrador prepara cuentas y calendario; los actores autorizados cargan aulas.
2. Bedel inicia una reserva, informa curso y docente, tipo de aula, cantidad de alumnos prevista y características requeridas.
3. En modalidad esporádica indica fechas; en periódica elige período y días de semana.
4. Indica hora de inicio y duración múltiplo de 30 minutos; en periódicas puede definirlos por día de semana (DA-24).
5. El sistema consulta disponibilidad por fecha, descarta aulas inactivas y conflictos y sugiere las de menor capacidad suficiente.
6. Bedel selecciona un aula por fecha, pudiendo aplicarla a las fechas compatibles de un día de semana. Puede consultar otras aulas válidas y excluir fechas explícitamente; revisa asignaciones y exclusiones antes de confirmar (DA-25/26/27).
7. Al confirmar, se revalidan las asignaciones y se registra la operación de forma transaccional; se notifica el resultado.
8. Bedel o Administrador pueden modificar o cancelar según las reglas de vigencia. Las cancelaciones admiten alcance total o por fecha y motivo.
9. Los usuarios consultan listados; Docente consulta agenda; Administrador y Bedel acceden a estadísticas.

DA-19 define preparación temporal sin borradores guardados, ocupación ni aprobación de otro actor. DA-20 exige confirmación completa o ninguna ante conflictos; DA-21/22 habilitan acciones sobre futuras con historial y estados por ocurrencia. Ver el [ciclo acordado](07-ciclo-de-reservas.md).

## Permisos acordados (DA-06 y DA-07)

Administrador puede realizar todas las operaciones de Bedel. La gestión de cuentas y calendario académico es exclusiva de Administrador. Docente consulta disponibilidad, listados y agenda de ocupación general; no registra ni modifica reservas.

| Operación | Administrador | Bedel | Docente |
|---|---|---|---|
| Iniciar/cerrar sesión | Sí | Sí | Sí |
| Administrar cuentas | Sí | No | No |
| Crear/buscar/modificar/dar de baja aulas | Sí | Sí | No |
| Gestionar años y cuatrimestres | Sí | No | No |
| Consultar disponibilidad | Sí | Sí | Sí |
| Sugerencias y registro/confirmación de reservas | Sí | Sí | No |
| Modificar/cancelar reservas | Sí | Sí | No |
| Listados por día y curso | Sí | Sí | Sí |
| Agenda diaria/semanal de ocupación | Sí | Sí | Sí |
| Estadísticas | Sí | Sí | No |

La decisión corrige la asociación del calendario a Bedel del diagrama y completa los permisos de Admin omitidos en algunas fichas. No altera la especialización Usuario–Administrador/Bedel/Docente: compartir permisos no exige que Administrador sea subtipo de Bedel.

## Docente solicitante y cuenta de consulta (DA-07)

Al reservar se registran nombre, apellido y email del docente. DA-09/15 establecen su selección exclusiva desde la lista fija que simula la fuente externa, sin carga libre ni ABM. No es obligatorio que tenga cuenta. La cuenta docente permite consultar la ocupación general; no define la titularidad exclusiva de las reservas ni restringe los listados a reservas propias. El email docente solo se muestra en el detalle a Bedel y Administrador (DA-35).

La apertura de la primera versión es lunes a viernes de 07:00 a 23:00 (DA-14). Las reglas de fechas, módulos y feriados están en [calendario y datos de referencia](06-calendario-y-datos-de-referencia.md).

DA-31 conserva los requisitos solicitados para impedir cambios de aula que invaliden reservas futuras. DA-32 define estados no reservables y baja lógica con conservación del historial; ver [reglas de aulas](03-dominio-y-reglas.md#aulas-tipos-capacidad-y-protección-de-reservas-da-29-a-da-32).

DA-46 renombra el dato de capacidad mínima del pedido a «cantidad de alumnos prevista»: se utiliza tanto para seleccionar aulas de capacidad suficiente como para los indicadores teóricos. No cambia la capacidad propia de cada aula.

Admin establece contraseñas mediante Auth, sin cambio obligatorio; se aplica la política del proveedor. Java rechaza operaciones de cuentas deshabilitadas sin cancelar reservas; se permite rehabilitar (DA-62/63/64). Ver [cuentas y acceso](10-cuentas-y-acceso.md).
