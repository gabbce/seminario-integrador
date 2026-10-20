# Guion de video demo mudo · máximo 10 minutos

Versión de trabajo: 19/10/2026. Base: `main`, `2c7dc7b`. Destinado al coloquio: el video muestra la aplicación y el equipo explica en vivo, pausando cuando haga falta. Objetivo de montaje **9:40**, incluidos títulos y transiciones; techo **10:00**. El tiempo de explicación y las pausas del reproductor no se cuentan como duración del archivo.

## Cómo grabarlo

Grabar clips separados, sin micrófono ni audio del sistema, y unirlos en el orden de la tabla. No intentar hacer todas las operaciones en una toma de diez minutos. Recortar tipeo repetido, esperas y cambios de sesión; conservar la secuencia **acción → revisión → resultado**. Mantener los resultados importantes al menos 2–3 segundos. Usar títulos breves con el nombre del capítulo, sin párrafos ni narración escrita.

Capturar solo el navegador, en 1920×1080 si los controles siguen legibles; usar 1366×768 si luego van a proyectar a esa resolución. Mantener tamaño y zoom durante los clips de escritorio. Configurar el navegador/sistema en español y comprobar el orden día/mes en los campos de fecha antes de grabar. Mostrar Docente en una ventana móvil de 390×844 dentro del último clip. Ocultar notificaciones, favoritos personales y el autocompletado. Contraseñas siempre enmascaradas, sin abrir configuración, consola, panel de red ni archivos privados en la grabación. Preparar dos perfiles de navegador: Bedel y Administrador, más una sesión Docente independiente.

Cada clip tiene un presupuesto fijo. Si sobra tiempo, sostener el resultado; si falta, recortar tipeo o una repetición. No acelerar los mensajes ni hacer ilegibles las confirmaciones. Ensayar una vez y revisar el archivo exportado: duración ≤600 segundos, sin audio y texto legible al tamaño de proyección.

## Preparación fuera de cámara

1. Supabase activo y app saludable en [demo local](http://127.0.0.1:8082). Iniciar con `DEMO_PORT=8082 docker compose --env-file frontend/.env.local up -d`; comprobar `/api/health`. El arranque no carga datos. No ejecutar seeds ni reset para grabar.
2. Usar cuentas demo existentes; credenciales por el canal ya preparado. Crear los registros propios que haga falta durante el ensayo con un nombre reconocible, por ejemplo `Demo coloquio · 19-10`, sin modificar las series de referencia 24–31 ni el volumen I05.
3. Registrar curso/comisión/año, IDs de reservas, aulas elegidas, fechas y estado final. Para volver a grabar un alta, usar un registro propio nuevo: el primer intento ya quedó persistido. No borrar resultados ni ejecutar un reset para simular que una operación nunca ocurrió.
4. Para los clips de alta y operación usar 2027 y fechas futuras disponibles. Elegir el aula ofrecida por la búsqueda, no fijar una que haya quedado ocupada. La 103 admite **24 personas**: una edición 20→24 es válida solo si las demás condiciones también se cumplen; 20→25 debe rechazarse en esa aula.
5. Reservar una esporádica propia de dos fechas para editar, cambiar aula, reprogramar y cancelar. Preparar también una periódica propia para mostrar patrón, exclusiones, cambio de aula de patrón completo y cese. Las pruebas de revisión pueden haber ocupado horarios: consultar otra vez antes de grabar.
6. Preparar una cuenta y un aula ficticias propias para altas, edición y bajas. No cambiar roles, email ni contraseña de las cuentas que usa el equipo para presentar. Una cuenta inactiva puede rehabilitarse; un aula dada de baja no se restaura desde la interfaz.
7. Calendario: usar un año QA propio y una reserva propia para el impacto. Leer su estado actual: el QA2029 ya fue ampliado en una revisión anterior y no debe tratarse como un año intacto. Para mostrar cierre, retiro de períodos o eliminación, usar años auxiliares propios sin dependencias; no quitar períodos de 2026/2027. Después de crear un año esperar a que terminen de recargarse las referencias; volver a abrirlo y comprobar los valores del formulario antes de revisar impacto.
8. Antes del video comprobar las cifras del 23/08/2027. La referencia del 07/10 fue 104 clases, 52/272 horas habilitadas, 19,1 %, 780 alumnos-hora y picos de 125 alumnos/8 clases. Son datos de referencia, no constantes del producto: si cambia la base, registrar y explicar lo observado.

## Montaje de 9:40

| Tiempo | Rol y pantalla | Acciones visibles y resultado que hay que conservar | Apoyo para hablar durante el coloquio |
|---|---|---|---|
| **00:00–00:25 · 25 s** | Bedel · Ingreso | Título «Gestión y reservas de aulas». Ingresar con contraseña enmascarada. Mostrar nombre/rol y navegación. | Acceso autenticado, datos ficticios y permisos por rol. |
| **00:25–01:10 · 45 s** | Bedel · Agenda | Abrir 23/08/2027. Alternar día/semana; cambiar página de aulas y filtrar por aula/tipo, curso y docente. Abrir una clase y volver. Dejar visible el aviso de que un espacio vacío bajo filtros no garantiza disponibilidad. | Ocupación efectiva, detalle contextual, consulta filtrada y conservación de contexto. |
| **01:10–02:10 · 60 s** | Bedel · Disponibilidad | Consultar aula por alumnos, tipo, recursos y horario. Mostrar opciones sugeridas y otras compatibles. Consultar un patrón de laboratorio ocupado para mostrar alternativas y detalle de interferencias; regresar a una propuesta válida y usar la acción para preparar la reserva. | Disponibilidad por fecha o patrón completo; capacidad y equipamiento; alternativas informativas, sin reasignación automática. Los contactos son para operadores. |
| **02:10–03:20 · 70 s** | Bedel · Nueva reserva periódica | Elegir explícitamente curso y docente; mostrar creación de un curso propio desde el selector. Elegir año, cuatrimestre, días y duración; abrir las fechas calculadas y excluir una fecha propia. Mostrar opción anual sin confirmar una segunda reserva. Buscar, elegir un aula por patrón, revisar y confirmar. Abrir detalle y recargar. | Curso/comisión/año, generación de fechas por calendario, exclusiones, anual/cuatrimestral, asignación completa y persistencia. |
| **03:20–04:05 · 45 s** | Bedel · Nueva esporádica | Cambiar modalidad, agregar dos fechas futuras concretas —puede ser receso—, buscar y elegir aula por fecha. Mostrar revisión, confirmación y detalle. | Requisitos compartidos y fechas independientes; posibilidad de aulas distintas; alta completa. |
| **04:05–05:20 · 75 s** | Bedel · Operaciones y detalle | En la esporádica propia, editar alumnos/docente antes de su inicio; cambiar aula de una fecha y reprogramarla. Conservar comparación antes/después y origen original. Cancelar una fecha con motivo, mostrar la restante y después el resultado de cancelar el resto. Insertar un clip de la periódica propia: cambio de aula por patrón completo y cancelación de continuidad futura. Terminar en historial y detalle recargado. | Edición de cabecera, cambio puntual/periódico, reprogramación, cancelación parcial/total, cese e historial. Las clases iniciadas/canceladas quedan protegidas. |
| **05:20–06:00 · 40 s** | Bedel · Reservas e impresión | Listado 23/08/2027, página 2 de 20 filas; cambiar filtros y estado. Mostrar consulta por curso/comisión/año. Imprimir el conjunto filtrado y abrir primera/última página del PDF completo; volver al filtro. | Paginación e impresión son alcances distintos: la referencia son 104 filas completas, no solo las 20 de pantalla. Canceladas siguen consultables. |
| **06:00–07:00 · 60 s** | Bedel · Indicadores | Mostrar día 23/08, tarjetas, curvas de alumnos y clases simultáneas; señalar una franja. Abrir semana típica y seleccionar un rango/cuatrimestre. Cambiar filtros de tipo, edificio, piso, capacidad y recursos. Abrir «Comparar períodos», elegir A/B y sostener la tabla de diferencias. | Horas-aula, ocupación, alumnos-hora, picos y promedios. La comparación normaliza por día hábil; porcentajes difieren en puntos porcentuales. Son previsiones de programación, no asistencia ni personas únicas. |
| **07:00–07:40 · 40 s** | Bedel · Aulas | Buscar por identificador; mostrar filtros de tipo/estado, ubicación, capacidad, pizarrón y recursos. Montaje de alta de aula propia, edición de capacidad/equipamiento y estado. Dar de baja esa aula sin reservas y consultar el filtro Baja. | Catálogo, subtipos, historial y baja lógica. Un aula con dependencias protegidas no se puede invalidar. |
| **07:40–08:30 · 50 s** | Administrador · Cuentas | Buscar y filtrar rol/estado. Crear una cuenta propia; editar perfil/rol. Mostrar cambio de correo y establecimiento de contraseña con campos siempre enmascarados; guardar y mostrar mensajes. Inhabilitar y rehabilitar la cuenta propia; dejarla finalmente inactiva y mostrar que no accede. | Gestión de identidad y perfil, permisos, bloqueo por estado y rehabilitación. No se muestran contraseñas existentes ni se envían correos desde la app. |
| **08:30–09:20 · 50 s** | Administrador · Calendario académico | En año QA propio: crear/abrir año, definir ambos cuatrimestres, habilitar y agregar una fecha no lectiva. En el año propio con serie, ampliar período/quitar feriado, «Revisar impacto», mostrar nuevas clases y confirmar. Montaje corto con año auxiliar sin reservas: quitar período, volver a preparación; cerrar otro año vacío habilitado; eliminar un año propio vacío sin dependencias. | Períodos y feriados, estados del año, restricciones por dependencias e impacto atómico: calendario y nuevas clases se guardan juntos. Año cerrado es de consulta. |
| **09:20–09:40 · 20 s** | Docente · Consulta móvil y cierre | Abrir agenda/detalle en móvil; mostrar consulta de disponibilidad y listado sin acciones de escritura, historial administrativo ni contactos privados. Mostrar ausencia de Indicadores/Administración. Cerrar sesión y terminar en login. | Mismos datos operativos con permisos de consulta y privacidad; cierre de sesión. |

**Total: 580 segundos = 9:40.** Reservar hasta 20 segundos para ajustes de edición; títulos y transiciones deben entrar en ese margen. No agregar un cierre técnico de Docker, terminal, pruebas de carga o reset al video: son preparación y evidencia para responder preguntas del tribunal, no pantallas funcionales de la app.

## Datos y enlaces para preparar los clips

- Agenda y listado: `/agenda?fecha=2027-08-23` y `/reservas?date=2027-08-23&page=1&size=20` (página indexada desde cero).
- Indicadores día: `/indicadores?date=2027-08-23`. Semana: `/indicadores?mode=week&from=2027-08-23&to=2027-08-27`.
- Comparación: seleccionar primero rangos cortos 23–27/08 y 30/08–03/09/2027 para el ensayo; luego elegir los cuatrimestres si la consulta está suficientemente ágil para el clip. La lectura real del 19/10 dio A = 4,1 %, B = 0 % y diferencia −4,1 puntos porcentuales, con cinco días hábiles en cada rango. Volver a consultar antes de grabar. Nunca copiar porcentajes de las pruebas simuladas al video real.
- Escenarios de lectura conservados: reserva 24 (receso), 25 (cancelación parcial), 26 (total), 28 (origen de una reprogramación), 29 (patrón con excepción), 30 (cese), 31 (anual). Verificar su estado antes de cada grabación; los IDs son referencias, no entradas obligatorias.
- Alternativas periódicas de referencia: Laboratorio, martes del primer período de 2027, 14–16. Según la base puede cambiar el ranking: elegir un resultado real y no prometer un orden fijo. La revisión real del 19/10 confirmó Lab 2 (480 minutos de conflicto) y Lab1 (1920 minutos). Para una alternativa esporádica consultar una fecha concreta que el propio calendario indique como hábil y con ocupación verificable.
- Operaciones nuevas y sus IDs: completar desde el [registro de revisión del 19/10](revision-demo-2026-10-19.md). Los datos creados durante QA se conservan; no presentar una reserva ya cancelada como si fuera editable.

## Control de cobertura antes de exportar

La cobertura significa mostrar cada función de usuario al menos una vez, con un ejemplo legible; no ejecutar todas sus combinaciones ni todos los casos de error. Para las confirmaciones repetitivas puede usarse montaje, pero cada función debe tener acción y resultado reales.

| Funciones | Clip | Casos vigentes |
|---|---|---|
| Ingreso, rol, rechazo por estado, salida | 1, 10, 12 | CU-01 |
| Alta, búsqueda, edición, rol, baja/rehabilitación, correo y contraseña de cuenta | 10 | CU-02–05, EX-03–04 |
| Alta, filtros, modificación/estado/equipamiento y baja de aula | 9 | CU-06–09 |
| Buscar/crear/modificar año, habilitar/cerrar, eliminación sin dependencias | 11 | CU-10–13 |
| Consultar/crear/editar/quitar cuatrimestres; feriados e impacto | 11 | CU-14–17, EX-01–02 |
| Disponibilidad, sugerencias, alternativas e interferencias | 3 | CU-18–20 |
| Alta esporádica y periódica; curso, docente, revisión, confirmación | 4–5 | CU-21–23 |
| Edición de datos/aulas, reprogramación, historial y cancelación/cese | 6 | CU-24–25 |
| Consulta diaria y por curso; filtros, paginación e impresión completa | 7 | CU-26–27 |
| Agenda diaria/semanal y filtros nuevos; consulta móvil y privacidad | 2, 12 | CU-28 |
| Indicadores diarios/semanales, atributos del aula y comparación A/B | 8 | CU-29, DA-87–88 |

Cotejar con [casos de uso vigentes](../especificacion/18-casos-de-uso-vigentes.md). No representar una función como verificada solo por aparecer en esta tabla: la evidencia de ejecución figura en el registro de revisión.

## Ensayo y puntos para pausar en el coloquio

Pausas útiles: revisión de reserva periódica; origen y patrón después de reprogramar; motivo/historial de cancelación; PDF completo; comparación A/B; impacto del calendario. Las notas de la última columna son para los expositores y no se sobreimprimen como texto largo.

Antes de exportar comprobar: duración ≤10:00, pistas de audio ausentes, todos los capítulos presentes, mensajes legibles y datos coherentes entre clips. Después de cambiar correo o contraseña, recargar Cuentas y reabrir el registro antes de cambiar su estado, para operar con la versión actual. Si una confirmación queda pendiente, consultar su resultado con la misma operación antes de reintentar; conservar esa explicación para las preguntas del coloquio. No mezclar tomas de una reserva antes/después en orden inverso. Si se cambia una fecha/aula para repetir una toma, actualizar el registro y no conservar una cifra de la toma anterior. Grabar el cierre de sesión al final de cada perfil o cerrar únicamente las sesiones creadas durante el ensayo.

La revisión técnica no sustituye la aceptación manual de I04/I05/I06. El [QA completo](qa-final-i-04-i-05-i-06.md), el [manifiesto](manifiesto-qa-final.md), el ensayo de reset y la carga permanecen como material de respaldo para preguntas.
