# Plan aprobado de integración

**Estado:** planificación aprobada secuencialmente por el usuario; consolidada el 16/09/2026. I-01 implementada y aceptada; I-02 implementada, aceptada y cerrada por el usuario el 17/09/2026, incluidos los ajustes visuales; I-03 está implementada y verificada, pendiente de QA y aceptación del usuario; I-04 a I-06 pendientes de planificación detallada e implementación. El prototipo P-01 a P-06 está terminado y sirve de referencia de interacción, no como prueba de funcionamiento del sistema persistente.

## Objetivo y alcance

Convertir el prototipo en la aplicación persistente de la [especificación v1](../especificacion/00-especificacion.md), conservando el diseño B y los recorridos aprobados. Entregas pequeñas con pruebas, revisión visual de las superficies afectadas y commits. No añadir funciones fuera de los casos de uso ni reabrir decisiones funcionales ya resueltas.

La app debe poder presentarse localmente con PostgreSQL/Auth remotos en Supabase. Despliegue web opcional posterior; sin requisitos nuevos de respaldos, alta disponibilidad o infraestructura avanzada. Docker Compose ejecutará la aplicación propia según la arquitectura vigente; no implica instalar Supabase local.

## Preservación del prototipo

- `prototype/v1`: referencia estable al commit `cc5bdc7`, con frontend simulado, escenarios, pruebas y checklist manual. No incorporar en esta rama la integración.
- `feat/integracion`: rama de trabajo que parte del mismo commit y contiene este plan y los cortes posteriores.
- `feat/prototipo-base`: rama previa conservada; no se reescribe su historia.

Para consultar o ejecutar el prototipo sin alterar el trabajo de integración, desde el repo se puede crear otro checkout con `git worktree add ../seminario-prototipo prototype/v1`. Luego seguir su README de frontend. Si ambos se ejecutan a la vez, usar un puerto distinto para uno de ellos. No hace falta un selector permanente entre simulación y backend real dentro del producto.

## Entregas y criterios de cierre

| Entrega | Trabajo y dependencias | Resultado para cerrar |
|---|---|---|
| I-01 · Base e ingreso real | Migraciones iniciales, conexión PostgreSQL, Supabase Auth, perfil de usuario, permisos en Java y administrador inicial. | Login real y sesión recuperable al recargar; Java valida identidad, estado y rol. Las llamadas directas a API no permiten operar con permisos ajenos. |
| I-02 · Administración y catálogos | Sobre I-01: aulas, cuentas, calendario y cursos persistidos; docentes simulados. Primera carga reproducible de datos ficticios. | Altas y cambios persistentes, validaciones y dependencias respetadas, identidad/perfil coherentes. Datos iniciales verificables y sin duplicación al arrancar. |
| I-03 · Reserva periódica completa | Sobre I-02: disponibilidad, preparación/revisión, confirmación, agenda y detalle mínimos del recorrido. | Aula fija por patrón, persistencia tras recargar y confirmación atómica. Dos solicitudes concurrentes por el mismo espacio/horario no pueden reservar ambas; reintentar una creación no duplica la reserva. |
| I-04 · Operación completa | Sobre I-03: esporádicas, edición, reprogramación, cancelación y efecto del calendario en reservas. | Operaciones consistentes, historial correcto, protección temporal y rechazo de versiones antiguas. Guardados completos o rechazo sin cambios parciales. |
| I-05 · Consultas e indicadores | Sobre I-04: completar agenda/listados, impresión e indicadores persistentes. Ampliar dataset de demo. | Cálculos exactos con el conjunto pequeño; exploración fluida con el amplio. Filtros, denominadores históricos, estados sin datos e impresión completa comprobados. Consistencia entre todas las vistas. |
| I-06 · Demo lista para presentar | Integrar lo anterior; ejecutar QA manual y automatizado, preparar Docker Compose, datos reproducibles e instrucciones. | QA registrado, recorridos principales automatizados, arranque documentado y restablecimiento de datos probado. Defectos funcionales bloqueantes resueltos y detalles menores pendientes explícitos. |

Los cortes internos se concretan antes de implementar cada entrega. No se necesita terminar todo el backend para comenzar a conectar React: I-03 entrega un recorrido completo y persistente antes de ampliar las operaciones.

## Responsabilidades y modelo

| Componente | Responsabilidad |
|---|---|
| React | Pantallas, formularios, navegación y presentación. Validaciones inmediatas de ayuda; no autoridad de negocio. |
| Java / Spring Boot | Permisos, reglas, disponibilidad, reservas, calendario e indicadores. Revalidación antes de guardar, transacciones y control de concurrencia. |
| Supabase Auth | Credenciales y sesiones. React obtiene la sesión; Java verifica identidad y administra identidades mediante operaciones autorizadas del servidor. |
| PostgreSQL en Supabase | Datos persistidos, relaciones y restricciones de integridad. |

React accede directamente a Supabase solo para autenticación. Todo acceso a datos del negocio pasa por Java. Mantener el monolito y los módulos acordados en [arquitectura](../especificacion/12-arquitectura-y-stack.md), sin duplicar reglas en caminos alternativos.

El [modelo consolidado](../especificacion/13-modelo-consolidado.md) y los diagramas son las fuentes para diseñar las tablas. Conservar usuarios/perfiles vinculados a Auth sin contraseñas propias; aulas y sus características e historial; años/cuatrimestres/no lectivos; materias y cursos/comisiones con código visible separado del ID interno; reservas, patrones, ocurrencias y cambios/cancelaciones requeridos. Esta agrupación no reemplaza relaciones, subtipos o restricciones del modelo aprobado.

Las ocurrencias concretas sustentan ocupación, solapamientos e indicadores. Los patrones mantienen la recurrencia para extender períodos o recuperar fechas que dejen de ser feriado, conservando exclusiones y demás reglas. Docentes: catálogo fijo simulado con IDs estables, separado de las cuentas de acceso; sin integración académica externa.

Migraciones versionadas para estructura. Cargas ficticias separadas de las migraciones. Antes de implementar se contrasta el esquema con el DER y se documentan únicamente los ajustes necesarios.

## Datos de prueba aprobados

| Conjunto | Diseño | Uso |
|---|---|---|
| Verificación | Pocas aulas/reservas, fechas fijas, resultados esperados documentados y reloj controlado solo para pruebas. Conservar ejemplos numéricos aprobados del prototipo. | Verificar reglas, operaciones, disponibilidad y cálculos exactos. |
| Demostración | Años académicos 2026 y 2027, ambos con dos cuatrimestres; aproximadamente 20 aulas compartidas, 40 cursos/comisiones en total y varios miles de clases periódicas y esporádicas. Escenarios: segundo cuatrimestre 2026, primero 2027 y anuales 2027. Reloj normal. | Presentación y exploración de indicadores, filtros, listados y disponibilidad con volumen. |

Todos los datos son ficticios y el uso es exclusivamente demostrativo para el TP. Las reservas persistidas se guardan en PostgreSQL; no son reservas productivas. El segundo cuatrimestre de 2026 se considera en curso solo cuando la fecha de ejecución pertenece a ese período. La carga histórica de demo no habilita altas retroactivas mediante la interfaz.

El volumen es una configuración inicial, no un nuevo requisito de capacidad productiva. Distribución deliberadamente variada: horas pico y valles, distintos días, tipos/capacidades/equipamiento, alumnos previstos compatibles, clases pasadas/futuras, cancelaciones y reprogramaciones, feriados/recesos e historial de aulas coherente.

Datos iniciales válidos, sin reservas activas solapadas. Los conflictos se prueban proponiendo operaciones sobre horarios ocupados, no insertando inconsistencias. La generación debe ser determinista: misma configuración, mismos datos de negocio. Identidades y secretos del proveedor se provisionan de forma controlada, sin incorporarlos al repositorio.

Cada conjunto tendrá cuentas/roles de prueba, fechas de interés, pasos y resultados esperados. I-02 habilita la carga básica; I-03/I-04 la amplían junto con reservas y operaciones; I-05 completa el conjunto amplio y sus métricas de referencia.

Restablecimiento mediante comando explícito, separado del arranque y limitado al entorno de demo. El arranque normal no borra ni sobrescribe datos. La implementación debe definir el alcance del restablecimiento de dominio e identidades y comprobar que sea repetible antes de cerrar I-06.

## Contratos de API

Definir entradas, salidas y errores de cada entrega antes de implementarla; documentar mediante OpenAPI. Respetar [operaciones y contratos vigentes](../especificacion/15-operaciones-y-contratos.md), incluidos los fallos parciales de operaciones administrativas con Auth.

- REST/JSON bajo `/api`.
- Fechas `YYYY-MM-DD`, horas de 24 horas y zona institucional. Los horarios de clases no cambian por la ubicación del navegador; auditoría usa instantes inequívocos.
- Listados con filtros, orden y paginación en Java. Impresión obtiene todos los resultados filtrados.
- Errores distinguen validación de campos, conflictos concretos, permisos, sesión, datos desactualizados y fallos técnicos; sin presentar un error como conjunto vacío.
- Versiones para detectar ediciones desactualizadas, según los agregados definidos en la especificación.
- Cambios de dominio completos o ninguno. La atomicidad JDBC no se extiende a llamadas HTTP de Supabase Auth; aplicar el manejo de fallos administrativos previsto en el contrato vigente.
- Cada intento lógico de creación de reserva lleva un identificador único para reconocer resultados y evitar duplicación por reintentos. Su alcance, persistencia y respuesta de comprobación se fijan en el contrato de I-03.

Para reservas separar consulta de disponibilidad, revisión de propuesta y confirmación. Consulta/revisión calculan fechas, exclusiones y alternativas sin retener aulas ni guardar borradores. Confirmación recalcula y revalida contra el estado vigente, con protección de base de datos frente a solapamientos concurrentes. La edición de calendario también tiene revisión de impacto y confirmación revalidada.

## Método por corte y validación

1. Definir contrato y casos de aceptación usando las pantallas y reglas aprobadas.
2. Implementar y probar Java/PostgreSQL, incluidas reglas que no pueden depender del navegador.
3. Conectar el recorrido React y sustituir su simulación.
4. Probar el recorrido integrado, revisar visualmente las pantallas afectadas, actualizar documentación y hacer commit.

Combinar pruebas de reglas, integración con PostgreSQL real y recorridos de navegador. Validar concurrencia real, no solo repositorios simulados. El PostgreSQL de pruebas debe estar aislado de datos de demo; su mecanismo de provisión se decide al preparar los tests y no agrega infraestructura al producto.

La [checklist manual del prototipo](../diseno/qa-manual-prototipo.md) y sus [resultados automatizados](../diseno/validacion-prototipo.md) son referencia, no acreditan por sí solos la integración. Adaptar preparación y controles a los datasets persistentes y agregar login real, permisos de API, persistencia, concurrencia y reintentos. Al cierre repetir QA completo, móvil, teclado, zoom e impresión; registrar lo no ejecutado.

No cerrar entregas con defectos que impidan recorridos o incumplan reglas acordadas. Cualquier detalle menor pendiente se identifica explícitamente. El cierre exige pruebas aprobadas, documentación actualizada y commit.

## Detalle por entrega

El [plan detallado de I-01](i-01-base-e-ingreso.md) está aprobado: alcance, proyecto Supabase, preparación de cuentas, contrato de sesión, cuatro subcortes y validación. I-01 implementada y verificada; ver [avance y evidencia](avance-i-01.md). I-02 está implementada y aceptada, incluidos los ajustes visuales. El [plan detallado de I-03](i-03-reserva-periodica.md) fue aprobado secuencialmente el 17/09/2026 y está implementado y verificado, pendiente de QA y aceptación del usuario; ver [avance y evidencia](avance-i-03.md). I-04 a I-06 pendientes de sus planes detallados. No construir avisos temporales de módulos sin integrar; conectar el acceso sobre la interfaz existente.

Cada entrega posterior se detallará y acordará antes de implementarla. Este plan general no reemplaza ese trabajo. Los contratos técnicos exactos y la configuración se concretan en el subcorte correspondiente, sin cambiar las reglas funcionales aprobadas.

El [plan de I-02](i-02-administracion-y-catalogos.md) tiene alcance y orden aprobados, con escenarios ficticios 2026/2027. I-02.1 a I-02.6 están implementados y verificados, con revisiones Terra high y commits por corte. Ver [avance](avance-i-02.md), [datos reproducibles](datos-demo-i-02.md) y [QA manual y seguimiento visual](qa-manual-i-02.md).
