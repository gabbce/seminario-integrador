# Dominio: reservas de aulas

## Estado de diseño y próximo trabajo

Diseño B — PATIO, recorridos, administración, móvil, estados, indicadores y guía visual aprobados. Referencia principal: [diseño consolidado](docs/diseno/README.md). El [plan del prototipo navegable](docs/diseno/prototipo-navegable.md) está listo para comenzar: frontend con datos simulados y escenarios reproducibles, sin integrar todavía Java/Supabase. Aún no se inició implementación. Las correcciones escritas prevalecen sobre imprecisiones de las imágenes generadas; esta etapa no modifica el stack final ni las reglas funcionales.

Vocabulario vigente de la especificación v1.0 final, basado en las fuentes y acuerdos del proyecto. Las decisiones que precisan las fuentes se registran en [registro de decisiones](docs/especificacion/04-decisiones-acordadas.md).

## Lenguaje

**Bedel:** persona que opera la asignación de aulas y el registro de reservas.

**Administrador:** usuario responsable de administrar cuentas y calendario académico, autorizado también a realizar todas las operaciones de Bedel (DA-06).

**Docente:** persona vinculada al dictado de clases, cuyos datos se registran en la reserva aunque no tenga cuenta. El rol Docente permite consultar la ocupación general (DA-07).

**Aula:** espacio con identificador, ubicación, capacidad en personas, características y estado, que se asigna a una ocurrencia de reserva. En laboratorios, cantidad de PC es descriptiva y no participa de búsquedas ni reservas (DA-30).

**Reserva:** cabecera que agrupa datos del pedido y una o más ocurrencias. Puede ser esporádica o periódica.

**Ocurrencia:** asignación concreta de un aula en una fecha y horario. Corresponde a `DetalleReserva`; tiene estado CONFIRMADA/CANCELADA y conserva motivo si se cancela (DA-22).

**Reserva esporádica:** reserva para una o más fechas específicas.

**Reserva periódica:** reserva cuatrimestral o anual cuyas fechas se derivan del período y los días de semana elegidos.

**Año lectivo:** ciclo académico identificado por año calendario; contiene dos cuatrimestres al habilitarse para reservas y admite carga parcial durante su preparación (DA-11).

**Cuatrimestre:** período del año lectivo con número, fecha inicial y fecha final. No tiene habilitación independiente: depende del año y de sus fechas (DA-67).

**Curso/cátedra:** referencia académica para identificar y listar reservas. Las fuentes usan ambos nombres; la identificación debe distinguir materia y comisión (DA-10). No existe código institucional; DA-48 define un identificador compuesto por código de materia, comisión y año, con código numérico generado, por ejemplo 001-A-2026, y sin gestión académica (DA-52).

**Disponibilidad:** posibilidad de asignar un aula que cumple los criterios solicitados y está habilitada, sin reservas vigentes superpuestas.

**Solapamiento:** superposición de horarios de ocurrencias vigentes para una misma aula y fecha. Los horarios contiguos no se solapan (DA-12).

**Módulo:** unidad de duración de 30 minutos (DA-12), que precisa la nota «x minutos» del diagrama original.

**Fuente simulada de docentes:** lista fija de registros con ID, nombre, apellido y email que representa el origen externo del solicitante, sin conexión real ni ABM académico. Es la fuente exclusiva para seleccionar al solicitante de una reserva y es independiente de las cuentas de consulta (DA-15).

**Feriado / fecha no lectiva:** fecha cargada manualmente por Administrador en la que no se admiten reservas esporádicas ni se generan ocurrencias periódicas (DA-16).

**Cantidad de alumnos prevista:** número esperado de alumnos de una reserva, común a sus ocurrencias; exige un aula de capacidad suficiente y alimenta la concurrencia teórica. Reemplaza «capacidad mínima solicitada» como único dato del pedido, sin cambiar la capacidad del aula (DA-46).

**Patrón semanal:** día, inicio/duración y aula asignada que definen la repetición periódica. Se elige una sola aula disponible en todas sus fechas efectivas. Un cambio de aula afecta todas sus futuras vigentes, conservando el aula de las pasadas.

**Fecha excluida:** fecha retirada explícitamente de una serie al prepararla; no genera ocurrencia y se conserva para evitar incorporarla al modificar el calendario.

**Continuidad cancelada:** condición de una serie a la que se cancelaron todas sus clases futuras. Impide extenderla automáticamente aunque conserve clases pasadas confirmadas.

**Materia:** referencia con nombre y código numérico estable, reutilizada por comisiones y años para identificar cursos sin gestión académica.

**Historial de aula:** registro de los períodos de estado y tipo de un aula para interpretar su disponibilidad histórica, sin reconstruir el pasado con su estado actual.

**Ocupación porcentual:** horas reservadas divididas por horas disponibles del mismo rango y aulas, multiplicadas por cien. La disponibilidad considera módulos completos de 30 minutos según apertura, feriados e historial del aula; el estado administrativo del año no modifica las métricas (DA-85).

**Cuenta de acceso:** perfil Usuario vinculado por UUID a una identidad Supabase Auth. Auth administra credenciales y email de acceso; la app administra rol, estado y datos de la persona. La autenticación válida no autoriza operar sin perfil activo.
