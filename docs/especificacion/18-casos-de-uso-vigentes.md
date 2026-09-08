# Casos de uso vigentes y trazabilidad

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Versión 1.0. Conserva CU-01 a CU-29 y los relaciona con RF del mismo número. Las fichas literales de 2025 están en fuentes/02-requerimientos.md; estas fichas incorporan los acuerdos de la entrevista y son las que describen el comportamiento vigente.

## Condiciones comunes

Salvo ingreso y provisión inicial, todo caso requiere identidad válida, perfil activo y rol autorizado. Las escrituras del dominio validan datos y estado, y guardan cambios y auditoría en transacciones. Las operaciones de identidad en Auth y perfil aplican el manejo de resultados parciales del documento 15. Cancelar un formulario no cambia datos. Un fallo de almacenamiento se informa sin éxito; los errores de consulta no alteran estado. Las versiones evitan sobrescribir ediciones ajenas.

Las precondiciones específicas se expresan en cada flujo. La salida indica postcondición de éxito; los controles y alternativas precisan rechazo o ausencia de resultados. Las operaciones de actor Admin/Bedel incluyen ambos roles por DA-06.

## CU-01 — Autenticación y autorización

- **Fuente:** RF-01; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Todos.
- **Flujo y resultado:** Ingresar email/contraseña con Auth; Java verifica perfil activo y rol. Cerrar la sesión del proveedor y eliminar la sesión del cliente.
- **Controles y alternativas:** Credenciales incorrectas, token inválido o cuenta sin perfil/inhabilitada impiden acceso. Política y sesiones de Supabase; no se garantiza revocación instantánea de JWT emitidos.
- **Interfaz:** UI-01. **Aceptación:** CA-U03/04/06/07/08/10.

## CU-02 — Registrar usuario

- **Fuente:** RF-02; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin.
- **Flujo y resultado:** Ingresar identificación, rol y contraseña; crear identidad Auth y perfil vinculado desde backend. Mostrar éxito solo con ambos completos.
- **Controles y alternativas:** Email duplicado o política del proveedor incumplida impiden alta; un fallo parcial se resuelve sin duplicar identidad/perfil. Turno/legajo opcionales; Admin inicial se trata por OP-01.
- **Interfaz:** UI-13. **Aceptación:** CA-U01/02/05/12.

## CU-03 — Buscar usuarios

- **Fuente:** RF-03; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin.
- **Flujo y resultado:** Aplicar nombre/email, rol y estado; devolver listado ordenado y paginado.
- **Controles y alternativas:** Sin filtros lista cuentas; sin coincidencias devuelve lista vacía válida. Nunca devolver hashes/contraseñas.
- **Interfaz:** UI-13. **Aceptación:** CA-X01.

## CU-04 — Modificar usuario

- **Fuente:** RF-04; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin.
- **Flujo y resultado:** Abrir cuenta y versión; editar datos/rol; guardar cambios locales con auditoría; un cambio de email coordina Auth y copia local conforme al documento 15.
- **Controles y alternativas:** Impedir degradar último Admin activo y sobrescribir versión vieja; cada solicitud usa rol vigente, sin confiar en permisos antiguos del token.
- **Interfaz:** UI-13. **Aceptación:** CA-U11, CA-X02.

## CU-05 — Eliminar usuario: baja lógica

- **Fuente:** RF-05; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin.
- **Flujo y resultado:** Seleccionar cuenta; confirmar deshabilitación local y auditar; rechazar nuevas solicitudes a la app incluso con token válido.
- **Controles y alternativas:** Impedir baja del último Admin activo; cancelar el diálogo no cambia datos. Reservas e historial se conservan.
- **Interfaz:** UI-13. **Aceptación:** CA-U08/11.

## CU-06 — Crear aula

- **Fuente:** RF-06; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin/Bedel.
- **Flujo y resultado:** Ingresar identificador, ubicación, tipo, capacidad y recursos; validar; guardar base/subtipo e intervalo histórico inicial.
- **Controles y alternativas:** Identificador duplicado o capacidad no positiva impiden alta. Tipo coherente; PC descriptivas solo en laboratorio.
- **Interfaz:** UI-09. **Aceptación:** CA-A01/02/03, CA-X03.

## CU-07 — Buscar aulas

- **Fuente:** RF-07; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin/Bedel.
- **Flujo y resultado:** Filtrar identificador, tipo, capacidad mínima en personas, estado y características; mostrar coincidencias.
- **Controles y alternativas:** Sin filtros lista aulas de operación habitual; cantidadPC no es filtro. Búsqueda de inventario no asegura disponibilidad horaria.
- **Interfaz:** UI-09. **Aceptación:** CA-A03, CA-X01.

## CU-08 — Modificar aula

- **Fuente:** RF-08; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin/Bedel.
- **Flujo y resultado:** Editar con versión; comparar nuevos datos contra requisitos de reservas futuras/en curso; guardar datos, subtipo e historia afectados.
- **Controles y alternativas:** Rechazar cambios que invaliden clases o estado no reservable con clases protegidas. Cancelar formulario no cambia nada.
- **Interfaz:** UI-09. **Aceptación:** CA-A04/05/06/07.

## CU-09 — Eliminar aula: baja lógica

- **Fuente:** RF-09; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin/Bedel.
- **Flujo y resultado:** Seleccionar y confirmar baja; comprobar dependencias; registrar baja e historia.
- **Controles y alternativas:** Bloquear con futuras/en curso vigentes; mantener referencias históricas y no ofrecer restauración.
- **Interfaz:** UI-09. **Aceptación:** CA-A06/08.

## CU-10 — Buscar año lectivo

- **Fuente:** RF-10; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin.
- **Flujo y resultado:** Filtrar año/estado y paginar resultados; abrir detalle.
- **Controles y alternativas:** Sin coincidencias es resultado válido; mostrar estados reales sin confundir cierre con eliminación.
- **Interfaz:** UI-10. **Aceptación:** CA-X01.

## CU-11 — Crear año lectivo

- **Fuente:** RF-11; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin.
- **Flujo y resultado:** Registrar año único en preparación; cargar los períodos mediante CU-15.
- **Controles y alternativas:** Año duplicado rechazado; no habilitar hasta contar con ambos cuatrimestres válidos.
- **Interfaz:** UI-10. **Aceptación:** CA-K01/02.

## CU-12 — Modificar año lectivo

- **Fuente:** RF-12; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin.
- **Flujo y resultado:** Editar atributos permitidos o pedir habilitación/cierre; validar dependencias y estado/version.
- **Controles y alternativas:** Habilitar requiere dos períodos válidos; cerrar requiere sin futuras/en curso. Cerrado solo consulta. No renombrar año con cursos/reservas dependientes.
- **Interfaz:** UI-10. **Aceptación:** CA-K01/02/03/04.

## CU-13 — Eliminar año lectivo

- **Fuente:** RF-13; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin.
- **Flujo y resultado:** Seleccionar año no cerrado sin cuatrimestres ni reservas ni cursos que lo referencien; confirmar y eliminar con auditoría.
- **Controles y alternativas:** Con dependencias rechazar; no borrar historial ni eliminar en cascada reservas. Cursos son una dependencia añadida por el modelo anual.
- **Interfaz:** UI-10. **Aceptación:** CA-X04.

## CU-14 — Buscar cuatrimestre

- **Fuente:** RF-14; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin.
- **Flujo y resultado:** Elegir año y filtrar fechas; listar períodos y contexto del año.
- **Controles y alternativas:** No hay filtro de estado independiente; puede mostrarse el estado del año etiquetado como tal.
- **Interfaz:** UI-10. **Aceptación:** CA-K09.

## CU-15 — Crear cuatrimestre

- **Fuente:** RF-15; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin.
- **Flujo y resultado:** Indicar número 1/2, fechas y año; validar límites del año, orden y no solapamiento; guardar.
- **Controles y alternativas:** Rechazar tercer período, número duplicado, fechas inválidas o año cerrado. No habilitar cuatrimestre por separado.
- **Interfaz:** UI-10. **Aceptación:** CA-K01/02/09, CA-X05.

## CU-16 — Modificar cuatrimestre

- **Fuente:** RF-16; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin.
- **Flujo y resultado:** Editar fechas de año editable; evaluar clases y preparar efecto si se amplía; confirmar con EX-02 cuando genera ocurrencias.
- **Controles y alternativas:** Bloquear recortes que dejan clases registradas fuera, cambios retroactivos de clases y solapamiento entre períodos. No guardar calendario separado de sus nuevas clases.
- **Interfaz:** UI-10/12. **Aceptación:** CA-R24/25/30, CA-X05.

## CU-17 — Eliminar cuatrimestre

- **Fuente:** RF-17; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin.
- **Flujo y resultado:** Comprobar ausencia de reservas asociadas y otras clases afectadas del año; confirmar; eliminar y volver año a preparación juntos.
- **Controles y alternativas:** Reservas históricas/canceladas asociadas bloquean; futuras/en curso del año también si se afectan. Año cerrado no se edita.
- **Interfaz:** UI-10. **Aceptación:** CA-K05/06/07.

## CU-18 — Consultar disponibilidad

- **Fuente:** RF-18; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Todos.
- **Flujo y resultado:** Recibir tipo, alumnos, recursos, fechas o patrón y horario; descartar no reservables y superposiciones; devolver por fecha.
- **Controles y alternativas:** Fechas/horarios inválidos se señalan. Sin disponibilidad mostrar opciones de menor solapamiento compatibles; sin aulas compatibles informarlo. No retiene espacios.
- **Interfaz:** UI-04. **Aceptación:** CA-A01/02/03/07, CA-R15/18.

## CU-19 — Sugerir aulas por fecha

- **Fuente:** RF-19; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin/Bedel.
- **Flujo y resultado:** Ordenar aulas válidas por capacidad suficiente ascendente e identificador; mostrar hasta tres; permitir otras válidas y selección.
- **Controles y alternativas:** Menos de tres no se completan con ocupadas. Aplicar aula a un día semanal asigna solo ocurrencias compatibles y deja las otras visibles para resolver.
- **Interfaz:** UI-04/05. **Aceptación:** CA-R12/13/14.

## CU-20 — Verificar solapamientos

- **Fuente:** RF-20; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Invocado por operaciones autorizadas.
- **Flujo y resultado:** Comparar intervalos vigentes de misma aula/fecha; excluir el propio detalle al editar; comprobar también choques dentro de la propuesta y al persistir.
- **Controles y alternativas:** Intervalos contiguos no chocan. Conflicto incluye fechas y reservas informativas; nunca habilita sobre-reserva. Es paso obligatorio, no extensión opcional.
- **Interfaz:** UI-04/05/08/12. **Aceptación:** CA-R02/15/30.

## CU-21 — Registrar reserva esporádica

- **Fuente:** RF-21; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin/Bedel.
- **Flujo y resultado:** Seleccionar docente, curso anual, alumnos y recursos; elegir fechas/horarios; consultar, asignar, excluir explícitamente y confirmar con CU-23.
- **Controles y alternativas:** Solo fechas futuras del mismo año habilitado; admite receso, no feriados/cierre. Al menos una fecha incluida. No exige cuenta del docente ni genera borrador.
- **Interfaz:** UI-05. **Aceptación:** CA-R01/16/17, CA-A01/02.

## CU-22 — Registrar reserva periódica

- **Fuente:** RF-22; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin/Bedel.
- **Flujo y resultado:** Elegir curso y docente, tipo/recursos/alumnos; período, días y horario por día; derivar fechas; omitir calendario/pasado; seleccionar aulas/exclusiones; confirmar.
- **Controles y alternativas:** Anual une ambos cuatrimestres. Con período iniciado solo generar futuras. Conservar patrón/exclusiones; ninguna fecha válida impide confirmar.
- **Interfaz:** UI-05. **Aceptación:** CA-R09/10/11/12/16/17.

## CU-23 — Confirmar reserva

- **Fuente:** RF-23; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin/Bedel.
- **Flujo y resultado:** Revisar resumen; recalcular/validar propuesta vigente y guardar cabecera, patrón/exclusiones/detalles y auditoría en una transacción; mensaje de éxito.
- **Controles y alternativas:** Conflicto conserva preparación activa para corregir; fallo no guarda parcialmente. Abandono no ocupa aulas. No email.
- **Interfaz:** UI-05. **Aceptación:** CA-R01/02/03/16/17, CA-C01/02.

## CU-24 — Modificar reserva

- **Fuente:** RF-24; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin/Bedel.
- **Flujo y resultado:** Seleccionar una, varias o todas las futuras, revisar versión y editar campos permitidos; revalidar todo el alcance y guardar conjuntamente.
- **Controles y alternativas:** Iniciadas/canceladas no editables; cabecera fija después de inicio. Periódicas siguen en períodos asignados. Excepción no cambia patrón; versión vieja vuelve a revisión.
- **Interfaz:** UI-07/08. **Aceptación:** CA-R07/19/20/22/23/29, CA-X06.

## CU-25 — Cancelar reserva

- **Fuente:** RF-25; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin/Bedel.
- **Flujo y resultado:** Elegir ocurrencias futuras vigentes y motivo; confirmar; cancelar detalles, actualizar cabecera/continuidad y auditar juntos; mensaje de alcance.
- **Controles y alternativas:** Motivo vacío o fecha iniciada rechazan. No borrar ni reactivar. Todas las futuras canceladas detienen extensión aun con cabecera confirmada histórica.
- **Interfaz:** UI-07/08. **Aceptación:** CA-R04/05/06/07/08/21/28, CA-C03.

## CU-26 — Listar reservas por día

- **Fuente:** RF-26; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Todos.
- **Flujo y resultado:** Elegir fecha, tipo/aula y estado de detalle; mostrar agrupado por tipo, docente, curso/comisión, aula y horario. Imprimir conjunto filtrado mediante UI-15.
- **Controles y alternativas:** Paginación no recorta impresión. Canceladas solo mediante filtro y marcadas. Docente no recibe email. Sin datos no es fallo.
- **Interfaz:** UI-06/15. **Aceptación:** CA-C06/07/09/10.

## CU-27 — Listar reservas por curso

- **Fuente:** RF-27; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Todos.
- **Flujo y resultado:** Seleccionar materia/comisión/año por código o nombre; listar ocurrencias cronológicamente con filtro de estado.
- **Controles y alternativas:** No mezclar comisiones ni años. Cabecera confirmada puede contener detalles cancelados; email restringido.
- **Interfaz:** UI-06. **Aceptación:** CA-C06/07/08/10.

## CU-28 — Visualizar ocupación

- **Fuente:** RF-28; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Todos.
- **Flujo y resultado:** Elegir día/semana, fecha, tipo y aula; mostrar agenda con datos autorizados. Roles operativos pueden abrir modificación/cancelación.
- **Controles y alternativas:** Docente solo consulta y usa móvil; canceladas no ocupan. Franjas cerradas/no reservables no se muestran como disponibilidad por estar vacías.
- **Interfaz:** UI-03. **Aceptación:** CA-C04/05/06/07.

## CU-29 — Visualizar indicadores

- **Fuente:** RF-29; ajustes DA del registro y capítulo temático correspondiente.
- **Actor:** Admin/Bedel.
- **Flujo y resultado:** Elegir rango/cuatrimestre/vista/filtros; calcular horas, ocupación y demanda atendida, picos por franja, semana típica y alumnos-hora.
- **Controles y alternativas:** Excluir canceladas; sin denominador no porcentaje. No medir conflictos, asistencia real o individuos únicos. Historia de aula y medias por días elegibles según documento 09.
- **Interfaz:** UI-14. **Aceptación:** CA-M01 a CA-M11.

## Extensiones acordadas, sin renumerar los originales

| ID | Actor | Flujo y resultado | Reglas / aceptación |
|---|---|---|---|
| EX-01 — Gestionar feriados | Admin | Listar, agregar, corregir o quitar fecha y descripción del año. Alta verifica clases afectadas; eliminación puede activar EX-02. | No retroactividad, duplicados ni cambios de clases iniciadas. Resolver futuras antes de alta. CA-K08, CA-R26. |
| EX-02 — Actualizar series por calendario | Admin | Preparar cambio, derivar nuevas futuras, proponer aula antecedente del patrón, resolver todas y confirmar conjunto de calendario/reservas. | Respetar exclusiones, cancelaciones, fecha original y continuidad. Revalidar versión y no solapamiento. CA-R24 a CA-R30. |
| EX-03 — Restablecer contraseña | Admin | Ingresar nueva contraseña y confirmación; backend actualiza identidad en Auth. | Sin correo ni cambio obligatorio; errores del proveedor sin éxito falso. CA-U03/05/07/13. |
| EX-04 — Rehabilitar usuario | Admin | Cambiar cuenta inactiva a activa y auditar. | Acceso con identidad válida y rol actual; no alterar reservas. CA-U09. |
| OP-01 — Inicializar demo | Responsable | Configurar Supabase y app; crear identidad Auth y perfil Admin mediante variables privadas. | Sin duplicar ni sobrescribir; resolver inicialización incompleta. Documento 17. |
| OP-02 — Consultar auditoría | Responsable local | Consultar eventos con herramientas técnicas. | Sin panel en app, sin secretos ni estadísticas de conflictos. Documento 17. |
| OP-03 — Preparar datos ficticios | Responsable | Cargar escenario conocido para presentar o verificar la app. | Carga explícita y reproducible; no repoblar destructivamente al reiniciar. Documento 17. |

## Criterios adicionales para completar cobertura

| ID | Dado / cuando | Entonces |
|---|---|---|
| CA-X01 | Una búsqueda administrativa sin coincidencias. | Lista vacía válida, filtros conservados, sin error técnico. |
| CA-X02 | Dos cambios simultáneos de rol sobre el último Admin activo. | Se conserva al menos un Admin activo; cambios incompatibles se rechazan. |
| CA-X03 | Alta de aula duplicada o capacidad cero/negativa. | Se rechaza sin guardar base/subtipo parcial. |
| CA-X04 | Eliminación de año con cuatrimestre, curso o reserva dependiente. | Se rechaza; no borra relaciones en cascada. |
| CA-X05 | Período solapado, tercero o fechas fuera del año. | Se rechaza sin afectar el calendario válido. |
| CA-X06 | Reprogramación periódica fuera de sus períodos o cambio de requisitos después del inicio. | Se rechaza y se indica el circuito de cancelación/nueva reserva acordado. |
| CA-M01 | Dos clases no canceladas de dos horas, simultáneas en aulas diferentes. | Cuatro horas-aula reservadas. |
| CA-M02 | Dos horas reservadas sobre ocho habilitadas. | Ocupación 25 %. Con cero horas habilitadas, estado sin denominador. |
| CA-M03 | Reserva de 30 alumnos en aula de capacidad 50, durante dos horas. | 30 alumnos teóricos por franja activa y 60 alumnos-hora. No contar 50 ni personas únicas. |
| CA-M04 | Clase A 14–15 con 30 alumnos y B 14:30–15:30 con 20. | Franjas con 30, 50 y 20 alumnos; clases simultáneas 1, 2 y 1. |
| CA-M05 | Cuatro lunes elegibles, uno sin reservas y otro lunes feriado fuera de ese conjunto. | Promedio por franja divide por cuatro, incluyendo el cero y excluyendo el feriado. |
| CA-M06 | Un aula cambia de tipo o se da de baja hoy. | El desglose y denominador históricos usan sus intervalos previos, no el tipo/estado actual. |
| CA-M07 | Se cancela una fecha dentro de una cabecera CONFIRMADA. | Esa fecha deja de sumar en todos los indicadores. |
| CA-M08 | Consulta de indicadores con rol Docente. | Acceso rechazado; la API no entrega datos del panel. |
| CA-M09 | Un año pasa de HABILITADO a CERRADO sin cambiar reservas, feriados ni historia de aulas. | La consulta del mismo rango conserva numerador, denominador y porcentaje. El estado administrativo no excluye fechas de las métricas. |
| CA-M10 | Aula habilitada a las 10:10, consultando 10:00–11:00 de un día de apertura sin feriado. | Solo el módulo 10:30–11:00 aporta al denominador: 0,5 horas. Inhabilitarla a las 10:10, si antes estaba habilitada, hace que ninguno de los módulos de ese rango sea completo. |
| CA-M11 | Aula habilitada cambia de General a Multimedios a las 10:10, sin interrupción de disponibilidad, en rango 10:00–11:00. | Aporta una hora disponible total: 0,5 a General y 0,5 a Multimedios según tipo al inicio de cada módulo. No se pierde ni duplica tiempo por la reclasificación. |

## Cobertura documental

Los 29 RF y 29 CU originales tienen ficha vigente en este documento. Los 5 RNF se precisan en documentos 05, 11 y 17. Las historias HU del documento 16 cubren caminos principales, alternativos y errores; los criterios CA de documentos 03, 06, 07, 08, 10 y este documento permiten verificarlos. Esta trazabilidad no significa que las pruebas de aplicación hayan sido ejecutadas.
