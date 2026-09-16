# I-02 · Administración y catálogos persistentes

**Estado:** implementación I-02.1 a I-02.6 completada y verificada automáticamente, con revisión Terra high y commits por corte. QA manual del usuario pendiente; guía en [QA de I-02](qa-manual-i-02.md). I-01 está implementada y aceptada mediante QA manual.

## Resultado acordado

Conservar el diseño B y conectar cuentas, aulas, calendario y referencias de cursos con Java/PostgreSQL. Las operaciones de estos módulos deben sobrevivir a la recarga y verse desde otra sesión autorizada. Preparar una primera carga reproducible de datos ficticios para desarrollar y probar reservas después.

Fuentes: [plan general](integracion.md), [cuentas](../especificacion/10-cuentas-y-acceso.md), [calendario y referencias](../especificacion/06-calendario-y-datos-de-referencia.md), [modelo](../especificacion/13-modelo-consolidado.md) y [contratos](../especificacion/15-operaciones-y-contratos.md).

## Orden aprobado

Cada corte incluye las migraciones necesarias, reglas Java, contrato API, conexión de la interfaz existente y pruebas. Antes del commit: revisión, comprobación visual y documentación. Las partes que resulten grandes se subdividen por comportamientos completos.

| Corte | Resultado verificable | Dependencias |
|---|---|---|
| I-02.1 · Cuentas: consulta y cambios locales | Listar/buscar perfiles persistidos vinculados a Auth; editar nombre, apellido, rol, perfil y estado; proteger el último Admin incluso bajo concurrencia. Versiones y auditoría. Permisos actuales efectivos en la siguiente petición. | I-01 |
| I-02.2 · Cuentas: operaciones con Auth | Crear cuenta completa, cambiar email y establecer contraseña desde la pantalla aprobada. Recuperar fallos parciales sin duplicar ni adoptar identidades ajenas; comunicar resultados inciertos correctamente. | I-02.1 |
| I-02.3 · Aulas | Consultar, crear, editar y dar de baja aulas con subtipos, características, estados e historial persistentes. Filtros/paginación en Java, permisos y rechazo de ediciones desactualizadas. PC solo descriptivas. | I-02.1 para reutilizar contratos de error/auditoría |
| I-02.4 · Calendario base | Gestionar años, dos cuatrimestres y fechas no lectivas; estados, restricciones temporales, dependencias y versiones. Año cerrado de solo lectura. | I-02.1 |
| I-02.5 · Referencias para reservar | Consultar/crear materia y curso desde el formulario existente, sin módulo académico nuevo. Código generado y unicidad materia/comisión/año. Fuente fija de docentes entregada por Java, independiente de cuentas. | I-02.4 |
| I-02.6 · Carga básica y aceptación | Carga explícita y repetible de aulas, calendario, materias/cursos y referencias; guía de datos y QA integrado de los módulos persistidos. | I-02.2 a I-02.5 |

En I-02.2 se prevén subcortes para alta recuperable, cambio de email y contraseña. En I-02.4 se prevén subcortes para años/cuatrimestres y fechas no lectivas. Los criterios acordados se desarrollan a continuación.

## Frontera con las reservas

I-02 no implementa confirmación persistente de reservas ni generación de clases o indicadores. Esos recorridos corresponden a I-03/I-04/I-05.

Las reglas de protección de aulas y calendario frente a reservas siguen siendo obligatorias. I-02 valida las restricciones intrínsecas y dependencias ya persistidas; no acredita casos con reservas persistidas todavía no implementadas. Antes de permitir confirmaciones persistentes en I-03 deberán protegerse las mutaciones de aula/calendario frente a ellas. I-04 completa revisión y generación conjunta de clases por cambios de calendario. No se permiten operaciones que ignoren reservas existentes durante la transición.

No se usarán reservas simuladas como evidencia de integridad del backend. Durante el detalle se fijará cómo consumen los recorridos todavía simulados las referencias migradas, para evitar IDs incompatibles y datos duplicados. No agregar pantallas temporales ni un selector de modo real/simulado.

## Datos de prueba

Todo el contenido es ficticio y la aplicación se usa exclusivamente como demostración del TP. «Persistido» significa guardado en PostgreSQL y no implica uso productivo ni reservas de una institución real.

- Conjunto pequeño para comprobar normalización, unicidad, estados, permisos, versiones, perfiles y resultados esperados.
- Primera carga de demostración: años 2026 y 2027, ambos con sus dos cuatrimestres completos y fechas no lectivas. Aproximadamente 20 aulas compartidas entre años y 40 cursos/comisiones en total como volumen inicial; cada curso pertenece a su año.
- Cuentas reutilizadas desde I-01; sin sobrescribir claves ni estados de cuentas existentes por cargar catálogos.
- Carga determinista por configuración y comando explícito; nunca al arrancar. Repetir no duplica ni sobrescribe cambios del usuario silenciosamente.
- Preparar cobertura histórica de aulas compatible con los datos posteriores; no inventar clases ni métricas en esta entrega.
- Escenarios de reservas para I-03 a I-05: segundo cuatrimestre de 2026 (período en curso al preparar la demo), primer cuatrimestre de 2027 y anuales de 2027. Las anuales requieren los dos cuatrimestres de 2027 y omiten su receso y fechas no lectivas.
- La demo usa reloj normal: el segundo cuatrimestre de 2026 solo será «actual» mientras la fecha de presentación esté dentro de él. Crear una reserva con el período iniciado genera únicamente ocurrencias futuras. Los datos históricos ficticios del dataset se preparan explícitamente, sin habilitar reservas retroactivas en la interfaz.
- Miles de clases y referencias numéricas de indicadores se incorporan progresivamente en I-03 a I-05. El restablecimiento completo se termina y verifica en I-06.

## Ejecución y contratos

Ejecutar I-02.1 a I-02.6 en el orden acordado, subdividiendo según los comportamientos definidos. Cada subcorte debe dejar un recorrido verificable completo, no capas separadas pendientes de conectar.

Antes de implementar cada subcorte, concretar su OpenAPI (entradas, respuestas, errores y permisos), migraciones y casos de prueba conforme a este plan y a la especificación. Los nombres exactos de rutas/tablas/DTO son decisiones de implementación, no nuevos requisitos. Usar los IDs del backend en React, conservar versiones y traducir errores sin mostrar excepciones internas. No confiar en permisos ni validaciones solo del navegador.

Cada corte requiere revisión por subagente Terra high, corrección de hallazgos, pruebas pertinentes, comprobación visual de pantallas afectadas, actualización de avance y commit controlado, según el método solicitado por el usuario. No agregar UI temporal para módulos pendientes. La guía de QA manual de I-02 se entrega al cierre para validación del usuario.

Sin nuevas reglas funcionales, paneles de auditoría, gestión académica, integración externa de docentes/feriados ni infraestructura adicional.

## Detalle I-02.1 · Aprobado

Dependencia: I-01 aceptada. Conectar el listado a PostgreSQL con búsqueda por nombre/email, filtros de rol/estado, orden y paginación. Editar nombre, apellido, rol único y especialización compatible; turno de Bedel y legajo de Docente opcionales. Deshabilitar/rehabilitar conservando identidad e historial. Email y contraseñas corresponden a I-02.2.

Proteger al último Admin activo incluso ante cambios simultáneos. Rechazar versiones desactualizadas; guardar cambios de perfil, rol, estado y auditoría local en la misma transacción. No agregar panel de auditoría.

Aceptación:

- Cambios visibles después de recargar y desde otra sesión autorizada.
- Rol/estado vigentes aplicados en la siguiente petición protegida.
- Bedel y Docente rechazados por API al intentar gestionar cuentas.
- Dos ediciones concurrentes no sobrescriben cambios; dos operaciones simultáneas no dejan cero administradores activos.
- Perfil y especialización consistentes tras cambio de rol; validaciones y errores comprensibles en la interfaz aprobada.
- Pruebas Java/PostgreSQL y navegador, revisión visual y commit del corte.

## Detalle I-02.2 · Aprobado

Dependencia: I-02.1. Tres subcortes completos, conservando los formularios aprobados:

1. **Alta recuperable:** Admin crea cuenta de cualquier rol con email, datos de perfil y contraseña elegida/confirmada. Java coordina Auth y perfil, reutilizando lo preparado en I-01. Solo informa éxito cuando ambos están completos. Email ocupado se rechaza; un fallo parcial permite recuperación técnica sin duplicar ni adoptar identidades ajenas.
2. **Cambio de email:** conservar el UUID y las relaciones de Usuario. Auth confirma el nuevo email y Java actualiza su copia para consultas. Si esa actualización falla, informar operación incompleta y reconciliar contra Auth. No informar que sigue vigente el email anterior cuando el proveedor ya cambió.
3. **Establecer contraseña:** Admin ingresa y confirma la nueva clave; Supabase aplica su política. Sin contraseña temporal generada, cambio obligatorio, correo ni recuperación pública. No guardar secretos en dominio, auditoría o registros de recuperación.

Cada subcorte exige permisos en Java, errores comprensibles y pruebas del recorrido. Ante respuesta incierta del proveedor no anunciar éxito ni repetir ciegamente la escritura. Para contraseñas no se presume poder consultar la clave vigente: informar incertidumbre; si Auth confirmó y solo falló la auditoría, distinguir ambos resultados y no repetir automáticamente el cambio.

Aceptación: cuenta creada puede ingresar con su rol; email modificado permite nuevo ingreso con la misma identidad; cambio de contraseña permite ingresar con la nueva y rechaza la anterior. No prometer invalidación instantánea de JWT existentes. Probar duplicados, rechazos del proveedor, fallos parciales y recuperación, además de acceso prohibido para no administradores. Sin pantallas extra de recuperación ni colas de trabajos.

## Detalle I-02.3 · Aprobado

Dependencia: I-02.1, reutilizando auditoría y contratos comunes. Conectar el inventario aprobado a PostgreSQL, con consulta para los tres roles y mutaciones solo para Admin/Bedel, verificadas también por API.

Subcortes acordados:

1. **Consulta y alta:** listado, filtros, orden, paginación y detalle; alta de General, Multimedios y Laboratorio con sus características y subtipos consistentes. Identificador obligatorio y único incluso entre aulas dadas de baja, capacidad positiva en personas, piso entero (incluidos subsuelos) y PC no negativas solo como dato descriptivo. Iniciar HistorialAula al crear.
2. **Edición y estados:** editar datos y equipamiento; transiciones HABILITADA/INHABILITADA/MANTENIMIENTO y cambio de tipo coherente con su subtipo. Control de versión y auditoría. Cambios de estado/tipo cierran el intervalo histórico vigente y abren el siguiente en una misma transacción, sin intervalos solapados ni edición retroactiva por interfaz.
3. **Baja lógica:** retirar del inventario habitual conservando identidad, historial y consulta mediante los filtros aprobados. Sin borrado físico ni restauración de bajas. No reutilizar identificadores.

No hay ABM de edificios, nuevo diseño ni filtro de cantidad de PC. Rehabilitar un aula inhabilitada o en mantenimiento no equivale a restaurar una baja lógica.

Aceptación: crear y recargar los tres tipos; consultar cambios desde otra sesión; filtrar/ordenar/paginar en Java; rechazar datos inválidos, identificadores duplicados (también concurrentes), combinaciones incompatibles de subtipo, mutaciones de Docente y versiones desactualizadas. Verificar historial y auditoría transaccionales, baja sin pérdida de registros y conservación del diseño en escritorio/móvil.

Protección de reservas: al incorporarlas en I-03, ningún cambio podrá invalidar requisitos de clases futuras o en curso; mantenimiento/inhabilitación/baja se bloquearán si hay clases vigentes afectadas. Se mostrarán las dependencias y no se cancelará ni reasignará automáticamente. I-02 no certifica estos casos con reservas persistidas todavía no implementadas; su integración y pruebas son condición para habilitar el recorrido persistente de I-03.

## Detalle I-02.4 · Aprobado

Dependencia: I-02.1. Conectar la administración de calendario existente a PostgreSQL; solo Admin modifica. Usar fechas institucionales y versión del año para evitar sobrescrituras; mutaciones locales y auditoría se confirman juntas.

Subcortes acordados:

1. **Años y cuatrimestres:** crear año en preparación, cargar progresivamente cuatrimestres 1 y 2 y habilitar solo con ambos completos, dentro del año, en orden y sin solaparse. Número de cuatrimestre único por año, sin estado independiente. Conservar estados EN_PREPARACION/HABILITADO/CERRADO; cerrado es solo lectura y no se reabre. Eliminaciones protegidas por dependencias; quitar un cuatrimestre de un año habilitado y volver a preparación es una operación conjunta. No cambiar el número de año si tiene cursos o reservas dependientes, ni borrar un año con referencias que deban conservarse.
2. **Fechas no lectivas:** listar, agregar, corregir y quitar fechas del año con descripción obligatoria y sin duplicados. Gestión manual, sin servicio externo. No agregar/quitar fechas pasadas ni mover una fecha desde/hacia el pasado; mantener la protección de clases iniciadas. La carga histórica ficticia del dataset es explícita y no flexibiliza la interfaz.

Preparar en la carga de I-02.6 los años 2026 y 2027, cada uno con dos cuatrimestres. No agregar configuración de apertura: lunes a viernes de 07:00 a 23:00. El receso entre cuatrimestres no equivale a cierre institucional.

Aceptación: persistencia y consulta desde otra sesión; rechazo de años/fechas/números duplicados, períodos fuera del año o solapados, habilitación incompleta, mutaciones de no administradores y versiones desactualizadas. Año cerrado no editable. Verificar límites temporales con reloj de prueba y coherencia de cambios conjuntos. Revisión visual de los formularios existentes.

Frontera de integración: I-02 prueba calendario y dependencias disponibles. Antes de habilitar reservas persistidas en I-03 deben existir bloqueos que impidan cerrar años con clases futuras/en curso, borrar períodos con reservas incluso históricas/canceladas o invalidar clases mediante nuevos feriados/recortes. I-04 completa la revisión y confirmación conjunta de ampliaciones y eliminación de feriados que generan clases. Hasta entonces no se permite aplicar sobre series existentes un cambio cuyo efecto aún no pueda procesarse correctamente. No se cancela ni reprograma automáticamente, no se generan clases retroactivas y no se certifican estos casos usando reservas en memoria.

## Detalle I-02.5 · Aprobado

Dependencia: I-02.4. Conectar las referencias usadas por el formulario aprobado de reserva, sin agregar un módulo académico.

Subcortes acordados:

1. **Materias y cursos persistentes:** buscar y seleccionar cursos del año elegido. Admin/Bedel pueden crear materia/curso desde el mismo formulario. Java genera el código numérico de materia y lo reutiliza entre comisiones y años; nombre normalizado por espacios/mayúsculas. Comisión obligatoria normalizada a mayúsculas; curso único por materia, comisión y año. Conservar ID interno estable separado del código visible (ejemplo 001-A-2026). Un curso existente se reutiliza, también ante solicitudes simultáneas, sin duplicarlo. No exigir código institucional ni agregar edición/baja académica fuera del alcance.
2. **Docentes de referencia:** Java sirve la lista fija con IDs estables y datos acordados. Selección exclusiva de esa lista, independiente de las cuentas Docente de Auth. Sin carga libre, ABM ni sincronización externa. Respuestas según permisos; no exponer contactos a cuentas Docente. En I-03, al guardar la reserva, Java valida la selección y copia los datos de referencia, sin confiar en nombres/contactos enviados por el navegador.

Aceptación: materia compartida entre cursos 001-A-2026, 001-B-2026 y 001-A-2027; código de materia reutilizado, curso e ID interno distintos. Creación visible tras recarga y desde otra sesión. Espacios/mayúsculas y solicitudes concurrentes no generan duplicados. Rechazar datos vacíos, año inexistente y altas por rol Docente. Verificar que un docente de referencia sin cuenta de acceso sea seleccionable y que crear una cuenta Docente no amplíe la lista académica.

Transición: el formulario consume referencias de Java desde este corte; registrar un curso persiste el curso, pero no confirma ni persiste una reserva. No mantener un segundo catálogo editable en memoria. Los adaptadores hacia recorridos todavía simulados conservan IDs y códigos recibidos del backend, sin inventarlos ni emparejarlos por posición. No agregar avisos transitorios ni selector de modo.

## Detalle I-02.6 · Aprobado

Dependencias: I-02.2 a I-02.5. Completar la carga básica reproducible y validar conjuntamente los módulos persistidos, sin incorporar todavía reservas ni indicadores persistentes.

### Carga de demostración

Comando explícito, habilitado solo en entorno de demo, separado de migraciones y arranque. Configuración versionada sin secretos: años 2026/2027 habilitados con dos cuatrimestres completos cada uno, recesos y fechas no lectivas ficticias identificadas como datos de ejemplo; aproximadamente 20 aulas y 40 cursos/comisiones en total, distribuidos entre ambos años y reutilizando materias. No se presentan los días de ejemplo como calendario oficial argentino.

Aulas variadas por tipo, capacidad, recursos y estado; incluir ejemplos de mantenimiento, inhabilitación y baja para probar filtros. Historial coherente desde las fechas necesarias para futuras reservas históricas de demo, sin modificar la regla de alta normal desde el momento de creación. Cursos cubren distintas materias y comisiones, con códigos reutilizados entre años. La lista fija de docentes sigue separada de las cuentas.

Reutilizar cuentas de I-01 sin sobrescribir contraseñas, roles o estados. La carga básica de dominio es transaccional y no hace llamadas Auth dentro de esa transacción. Repetir la carga no duplica registros ni deshace cambios manuales: informar discrepancias y mantener datos existentes, sin borrados automáticos. Misma configuración produce los mismos datos de negocio sobre una base vacía; los IDs internos no requieren coincidir entre bases.

### Datos de verificación y aceptación

Mantener un conjunto pequeño aislado para pruebas, con resultados esperados de filtros, normalización, unicidad, roles, estados, versiones e historial. Probar primera carga y repetición, preservación de modificaciones del usuario y ausencia de cambios al arrancar normalmente. Las pruebas destructivas siguen usando PostgreSQL desechable, no el proyecto de demo.

QA integrado: cuentas y Auth, inventario, calendario y referencias desde sus pantallas; recarga y segunda sesión; permisos por API; fallos y recuperación; concurrencia del último Admin, unicidad y versiones. Revisión visual escritorio/móvil y teclado de las superficies afectadas. Documentar comandos, cuentas sin secretos, datos de interés, pasos, resultados y límites en una guía manual de I-02.

Cada corte previo conserva sus pruebas, revisión y commit. El cierre de I-02 requiere comprobaciones aprobadas y documentación consistente. Las miles de clases ficticias, sus operaciones e indicadores se agregan en I-03 a I-05; el restablecimiento completo corresponde a I-06. No se certifica ninguna función pendiente mediante las pantallas todavía simuladas.

## Checklist de cierre de implementación

Las siguientes casillas registran ejecución. Evidencia detallada en [avance](avance-i-02.md), [datos de demo](datos-demo-i-02.md) y pruebas del repositorio.

- [x] I-02.1: cuentas existentes, permisos, versiones, auditoría y último Admin bajo concurrencia.
- [x] I-02.2: alta, email y contraseña mediante Auth, con recuperación de fallos y comprobación del proveedor.
- [x] I-02.3: aulas, subtipos, estados, historial y baja lógica.
- [x] I-02.4: años, cuatrimestres y fechas no lectivas persistentes.
- [x] I-02.5: materias/cursos y fuente fija docente conectados al formulario.
- [x] I-02.6: carga inicial y repetición verificadas; datos del usuario preservados.
- [x] Contratos y documentación actualizados; ningún secreto versionado.
- [x] Pruebas de API/PostgreSQL y navegador aprobadas, con evidencia de concurrencia y recuperación.
- [x] Revisión Terra high y revisión visual completadas por corte; commits guardados.
- [x] QA manual de I-02 entregado y límites de reservas/indicadores pendientes documentados.
- [ ] Resultado de aceptación manual del usuario registrado cuando lo realice.
