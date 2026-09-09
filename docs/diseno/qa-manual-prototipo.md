# QA manual del prototipo Aulas

Guía para recorrer todas las superficies del prototipo y sus variantes principales: éxito, validación, conflictos, vacíos, permisos, carga y recuperación. Complementa la [matriz de aceptación automatizada](validacion-prototipo.md) y las [referencias visuales B](README.md). No pretende enumerar todas las combinaciones posibles de entradas.

**Estado de esta checklist:** lista para ejecutar. Las casillas vacías no significan defectos ni casos ya aprobados: registrar aquí una nueva ejecución manual, independientemente de las pruebas anteriores.

## Preparación y registro

1. Iniciar siguiendo el [README del frontend](../../frontend/README.md) y abrir `http://localhost:5173`. Para este QA no hace falta iniciar Java ni configurar Supabase.
2. Usar Chrome/Chromium de escritorio, ventana de 1440 px de ancho y zoom 100 %. Repetir la revisión adaptable al final con 768 y 390 px, además de zoom real del navegador al 200 %.
3. Al pie de la página abrir **Herramientas de demostración**, seleccionar el escenario indicado y pulsar **Aplicar escenario y reiniciar**. Esto vuelve al login y elimina las modificaciones anteriores. **Reiniciar escenario actual** restaura ese mismo escenario.
4. Ingresar con una de estas cuentas; todas tienen contraseña `Aulas2026`:

| Rol | Correo | Superficies esperadas |
|---|---|---|
| Administrador | `admin@demo.local` | Todas, incluida Administración → cuentas y Calendario académico. |
| Bedel | `bedel@demo.local` | Agenda, Disponibilidad, Reservas, Aulas e Indicadores; registro y operaciones sobre reservas/aulas. Sin Administración. |
| Docente | `docente@demo.local` | Agenda, Disponibilidad, Reservas y consulta de Aulas. Sin registro, edición, contactos privados, Indicadores ni Administración. |

**Convenciones:** cada fila se ejecuta desde el escenario recién reiniciado, salvo que indique «continuar». Dentro de una fila, realizar los pasos en orden. Cambiar de escenario obliga a ingresar de nuevo. Cerrar sesión conserva los datos; recargar la página restablece **Reserva nueva** y pierde la sesión. Para conservar una preparación, navegar usando los controles de la app.

El reloj es **08/09/2026 10:00**, no el del equipo. Seleccionar **14/09/2026** para ver las clases de los ejemplos; «Hoy» vuelve al 08/09. Solo **Protección temporal** usa 14/09/2026 14:30. Todas las fechas siguientes son de 2026 salvo indicación contraria. Los campos de fecha pueden presentarse según la configuración del navegador: comprobar siempre el día, mes y año elegidos.

Antes de empezar, copiar este registro para la ejecución:

| Dato | Valor a completar |
|---|---|
| Responsable / fecha | |
| Commit probado (`git rev-parse --short HEAD`) | |
| Navegador / sistema operativo | |
| Anchos y zoom comprobados | |
| Casos aprobados / fallidos / no ejecutados | |
| Carpeta de capturas o informe | |

Marcar la casilla de un caso solo cuando todos sus pasos y resultados coincidan. Si falla, registrar el ID en la sección de incidencias y continuar desde un reinicio cuando sea necesario.

## Recorrido inicial para ver las pantallas

Este recorrido es un vistazo; después ejecutar las pruebas específicas. Como Bedel en **Reserva nueva**: Agenda del 14/09 → Semana → Día → una clase → Detalle → volver → Disponibilidad → preparar reserva → Datos y fechas → Elegir aulas → Revisar → Confirmación → Detalle → Cambiar aula / Reprogramar / Modificar datos / Cancelar clases. Continuar por Reservas → Día / Curso → impresión, Aulas → alta / edición e Indicadores → Día / Semana típica. Como Admin, visitar Administración → cuentas y Calendario académico → revisión de impacto. Como Docente, repetir las consultas y observar las diferencias de acciones y datos.

Los paneles de edición y confirmación forman parte del recorrido aunque no tengan una URL propia. Para ver un error o un vacío, utilizar los casos indicados abajo; no todos aparecen con el escenario inicial.

## A. Ingreso, roles y navegación

| Hecho | ID | Preparación y pasos | Resultado esperado |
|---|---|---|---|
| [ ] | A01 | Reserva nueva. Intentar ingresar con contraseña incorrecta; corregir a `Aulas2026`. | Error comprensible y enfocado, sin perder correo. Al corregir abre Agenda del 08/09. |
| [ ] | A02 | Bedel. Elegir 14/09, abrir una clase, volver con el navegador; cambiar a Semana y volver a Día. | Fecha conservada; detalle identifica fecha, hora y aula consultadas. Navegación sin página rota. |
| [ ] | A03 | Bedel. Cerrar sesión y usar Atrás. Entrar como Docente y recorrer las cuatro consultas. | No reaparece una pantalla operable de la sesión cerrada. Docente puede leer; no tiene acciones de registro/edición, contactos privados ni accesos administrativos/indicadores. |
| [ ] | A04 | Admin. Abrir Administración y Calendario académico. Cerrar sesión y entrar como Bedel. | Admin accede a ambos; Bedel no ve Administración. Las restricciones son de la simulación, no una prueba de seguridad del servidor. |
| [ ] | A05 | Bedel. Preparar una reserva sin confirmar, salir por otra sección y volver a Nueva reserva. | Se descarta la preparación abandonada. En cambio, volver entre los pasos del mismo recorrido conserva los datos. |

## B. Disponibilidad y nuevas reservas

**Datos B de referencia:** Reserva nueva, Bedel, Matemática I / curso `001-A-2026`, Laura Gómez, 30 alumnos previstos, Multimedios, segundo cuatrimestre, lunes y miércoles, inicio 14:00 y duración 2 horas. Solicitar Proyector para reproducir el requisito del diseño aprobado. Elegir **203 para lunes y 105 para miércoles**. El período termina el 18/12; feriados 12/10 y 23/11.

| Hecho | ID | Preparación y pasos | Resultado esperado |
|---|---|---|---|
| [ ] | B01 | Con datos B: Buscar aulas → elegir 203/105 → Revisar reserva → volver a selección → volver a datos → avanzar nuevamente → Confirmar reserva → Ver detalle. | Conserva datos y aulas al volver. Revisión: 26 clases, 12 lunes y 14 miércoles, sin feriados. Una única aula por día semanal durante toda la serie; no hay selección individual por fecha. Éxito y detalle corresponden a lo confirmado. |
| [ ] | B02 | Datos B. Excluir manualmente el 14/09 y completar el registro. | 25 clases; exclusión visible en revisión, sin alterar las aulas de los restantes lunes/miércoles. Agenda del 14/09 no contiene esa clase de Matemática. |
| [ ] | B03 | Datos B. Elegir primer cuatrimestre; intentar avanzar. Luego elegir anual y consultar. | El primer cuatrimestre terminado no permite confirmar una serie sin fechas futuras. Anual omite pasado, receso y feriados; no inventa clases fuera de períodos. Revisar el detalle de omisiones. |
| [ ] | B04 | Reserva nueva. Revisar errores con alumnos 0, ausencia de días, inicio/fin fuera de 07–23 o intervalo inválido, según los controles disponibles. Corregir cada entrada antes de la siguiente. | La UI impide el valor o informa qué corregir; no busca/confirma entradas inválidas ni borra los demás datos. Fin calculado a partir de inicio y duración. |
| [ ] | B05 | Datos B. Probar pizarrón/ventilación/recursos y aumentar alumnos a 49; volver luego a 30. | Resultados respetan capacidad de personas y requisitos. Con 49, 203/105/301 no son candidatas. No existe filtro por cantidad de PCs. Cambiar criterios invalida elecciones incompatibles. |
| [ ] | B06 | Reserva nueva. Crear curso: materia Matemática I y comisión B. Guardar y seleccionar; volver a abrir el selector. Intentar repetir la misma materia/comisión/año. | Curso `001-B-2026` reutilizable; se conserva el código de materia. No duplica el curso. Intentar guardar materia/comisión vacías enfoca el error y permite volver al campo, también en un segundo intento. |
| [ ] | B07 | Reserva nueva. Mantener lunes/miércoles 14–16 y 30 alumnos, cambiar tipo a General, sin recursos Multimedios. Buscar; abrir «Ver reservas y contactos» del lunes. | Hay alternativas con conflictos: fechas/horarios, reservas y contactos ficticios. Son informativas, no seleccionables; no se confirma sin resolver el día. Comparar el orden con el criterio explicado por la UI. |
| [ ] | B08 | Reserva nueva. Elegir esporádica; fecha 14/09 14–16 y fecha 21/09 16–17:30. Agregar y quitar una tercera fecha; elegir 203 para la primera y 105 para la segunda; revisar y confirmar. | Exactamente dos clases, con aula independiente por fecha. No hay recurrencia. Fin y fechas coinciden en revisión, detalle y agenda. |
| [ ] | B09 | Esporádica. Agregar una fecha duplicada/solapada, feriado 12/10 o fecha fuera del horario permitido; intentar avanzar. Corregir. | Mensaje o restricción de entrada apropiada; ninguna confirmación parcial. Quitar la fila inválida permite continuar con las válidas. |
| [ ] | B10 | Bedel. Disponibilidad: consultar datos B y usar Preparar reserva. | Consulta y registro usan los mismos criterios; el traspaso conserva modalidad, período, días, horarios y requisitos. Completar curso/docente si corresponde antes de guardar. |
| [ ] | B11 | Docente. Disponibilidad: consultar datos B y luego General como B07. | Puede revisar disponibilidad y solapamientos permitidos por su vista, sin contactos privados ni botón de preparar/confirmar reserva. |

## C. Agenda, listado, detalle y operaciones

| Hecho | ID | Preparación y pasos | Resultado esperado |
|---|---|---|---|
| [ ] | C01 | Operación diaria, Bedel, Agenda 14/09. Filtrar aula y tipo, limpiar filtros, cambiar Día/Semana, abrir una clase desde ambas. | Cinco clases sin filtro; horarios y aulas coherentes. Filtros conservados al cambiar vista; detalle identifica la ocurrencia elegida. |
| [ ] | C02 | Reserva nueva. Agenda: ir a 12/10 y a domingo 13/09; después volver al 14/09. | Feriado/fin de semana identificados como no reservables; no se confunde ausencia de clases con disponibilidad. «Hoy» vuelve al reloj ficticio. |
| [ ] | C03 | Muchas aulas y listado extenso, Bedel, 14/09. Desplazar agenda horizontal y verticalmente hasta D30. Cambiar a Semana; en móvil usar Día y llegar a D30. | Las 30 clases son accesibles; encabezados legibles, foco visible, sin desbordamiento de toda la página. La lista móvil permite abrir la última clase. |
| [ ] | C04 | Operación diaria. Reservas → día 14/09; aplicar aula, tipo y estado; luego buscar por curso. Probar filtro sin resultados y limpiarlo. | Cinco clases sin filtro; resultados acordes a cada ocurrencia. Vacío explícito y recuperable. Desde el resultado se abre el detalle correcto. |
| [ ] | C05 | Muchas aulas y listado extenso. Reservas del 14/09: páginas 20/50/100, siguiente/anterior. Imprimir con 20 visibles; después filtrar D30 e imprimir otra vez. | 30 resultados totales; segunda página contiene 10. Vista previa/PDF incluye los 30 y luego solo D30. Encabezados repetidos, filas legibles sin cortes, sin navegación ni herramientas demo. Cancelar impresión vuelve a la app. |
| [ ] | C06 | Serie registrada. Abrir Matemática → Cambiar aula. Seleccionar patrón lunes y aula 301; guardar. | Se comparan aula anterior/nueva y alcance. Actualiza los 12 lunes; conserva los 14 miércoles en 105. 204 no es candidata compatible porque falta proyector. Historial identifica cambio y responsable. |
| [ ] | C07 | Serie registrada. Reprogramar solo lunes 14/09 al martes 15/09, mismo horario; revisar y guardar. | Conserva aula 203 y 26 clases totales. Agenda quita 14/09 y agrega 15/09; detalle mantiene referencia al patrón original. Posterior cambio del patrón lunes incluye esa clase trasladada. |
| [ ] | C08 | Serie registrada. Reprogramar dos clases futuras; hacer una propuesta inválida (por ejemplo 12/10) y revisar. Corregir a fechas hábiles libres antes de guardar. | Rechaza todo el conjunto inválido, explica la causa y conserva preparación. No modifica una clase mientras otra falla. La propuesta válida muestra antes/después y guarda todas juntas. |
| [ ] | C09 | Reserva nueva. Abrir Física del 14/09 → Modificar datos. Poner 41 alumnos y guardar; corregir a 30, cambiar curso a Matemática y docente a Laura Gómez; guardar. | Capacidad de 105 bloquea 41. Corrección guarda cabecera y contacto, conserva aula/horario y agrega historial. |
| [ ] | C10 | Serie registrada. Cancelar clases: seleccionar 14/09, intentar sin motivo; agregar «Clase suspendida» y confirmar. Revisar agenda, detalle y listado con estado cancelado. | Motivo obligatorio. Quedan 25 clases activas, cancelada visible en historial/listado y ausente de agenda activa; el aula se libera. |
| [ ] | C11 | Serie registrada. Cancelar todas las futuras con motivo; luego revisar detalle y calendario. | Todas canceladas, sin reactivación desde edición. La serie cesa su continuidad; extender período no debe recrear sus clases canceladas. |
| [ ] | C12 | Protección temporal. Abrir Matemática iniciada a las 14:00 del 14/09. Intentar modificar cabecera, cancelar o trasladar la clase iniciada; operar una fecha futura. | Bloqueo de cabecera y de clases iniciadas. Las futuras conservan las operaciones que les corresponden. |
| [ ] | C13 | Reserva nueva. Física 14/09: cambiar alumnos a 30 y aula a 301; reprogramar al 15/09 y luego cancelar esa fecha. Tras cada guardado visitar agenda, Reservas e Indicadores. | Cambio reflejado en todas las vistas: el 15/09 tiene una clase de 1,5 horas y 45 alumnos-hora antes de cancelar; después no tiene clases y sus valores son cero. Detalle conserva el historial. |

## D. Aulas y administración

| Hecho | ID | Preparación y pasos | Resultado esperado |
|---|---|---|---|
| [ ] | D01 | Reserva nueva, Bedel. Aulas: buscar ID, filtrar tipo/estado/capacidad/recursos y ordenar en ambos sentidos. Crear aula 900 General, 45 personas, completando ubicación/piso/pizarrón y obligatorios. Guardar, buscarla y editar capacidad a 46. | Alta/edición visibles, ID único y estable; aula disponible en consultas compatibles. La cantidad de PCs, si aparece por tipo, es descriptiva. |
| [ ] | D02 | Reserva nueva. Intentar alta con ID 105; corregir a 900. En 105 intentar bajar capacidad a 1, inhabilitar o dar de baja con reservas futuras. | Duplicado enfoca error y enlaza campo; cambios que invaliden reservas se rechazan con dependencias comprensibles. No se cancelan reservas automáticamente. |
| [ ] | D03 | Continuar D01. Dar de baja 900 sin reservas; buscar incluyendo bajas y revisar historial. | Baja registrada y no reservable; no se reactiva como un aula nueva ni se reutiliza silenciosamente su identificador. |
| [ ] | D04 | Muchas aulas y listado extenso. Aulas: siguiente página, ordenar por ID descendente, tamaños 20/50/100, filtro D30 y filtro inexistente. | 20+10, o 30 juntas; orden correcto. Filtrar vuelve a página válida, vacío sin botones de página activos indebidamente. |
| [ ] | D05 | Reserva nueva, Admin → Administración. Crear Mario Prueba, `mario@example.test`, rol Docente, contraseña `Primera123`. Probar primero confirmación distinta y corregir. Editar la cuenta y establecer `Segunda123`. | Error de confirmación con foco y enlace al campo; guarda al corregir. La contraseña anterior deja de funcionar y la nueva permite ingresar como Docente, sin recargar la página. |
| [ ] | D06 | Reserva nueva, Admin. Editar `admin@demo.local` e intentar deshabilitarlo o convertirlo en Bedel. Intentar crear una cuenta con un correo existente. | No permite perder al único Admin activo ni duplicar correos. Mensajes permiten corregir sin perder los demás datos. |
| [ ] | D07 | Continuar D05, entrando de nuevo como Admin. Deshabilitar Mario y probar su login; volver como Admin y habilitarlo. Revisar filtros, orden y selector 20/50/100. | Deshabilitado no ingresa; habilitado puede hacerlo con la última clave. Filtros/orden/tamaño funcionan. Para comprobar segunda página de cuentas manualmente, crear 18 cuentas adicionales (22 en total contando Mario y las tres iniciales), con correos únicos. No existe escenario de cuentas masivas. |
| [ ] | D08 | Impacto de calendario, Admin → Calendario académico. Cambiar Fin 2 del 18/12 al 23/12 y Revisar impacto. Salir y volver sin guardar. | Conflicto de Física en 105 el 23/12 bloquea todo. Calendario sigue en 18/12 y Matemática conserva 26 clases. |
| [ ] | D09 | Continuar D08. Cancelar la Física bloqueante del 23/12 desde Reservas con motivo. Repetir extensión y confirmar. | Propone dos nuevas clases y guarda juntas: 21/12 en 203 y 23/12 en 105. Matemática tiene 28 clases; agenda e indicadores del 23/12 reflejan 2 horas y 60 alumnos-hora. |
| [ ] | D10 | Serie registrada, Admin. Quitar fecha no lectiva 12/10 → revisar → confirmar. | Agrega la clase del lunes 12/10 en 203: 27 clases. No exige asignar aula individual a la fecha recuperada. |
| [ ] | D11 | Serie registrada, Admin. Agregar no lectivo 14/09 con descripción y revisar; descartar. Probar cuatrimestres superpuestos/invertidos y descartar. | Fecha con clases vigentes bloquea el cambio; fechas de períodos inválidas no se guardan. Descartar restaura datos vigentes. |
| [ ] | D12 | Reserva nueva, Admin. Intentar cerrar 2026 con clases futuras. Crear 2027; completar 08/03–02/07 y 13/09–17/12, habilitar mediante revisión. Nueva reserva: seleccionar 2027 y crear Matemática/A. | 2026 no se cierra con dependencias. 2027 requiere períodos completos válidos para habilitarse. Curso generado `001-A-2027` y reserva acotada al calendario de ese año. |
| [ ] | D13 | Reserva nueva, Admin. Crear 2028 vacío en preparación y eliminarlo por su control. Intentar repetir 2026. | Elimina únicamente el año sin dependencias permitido; no duplica años ni elimina los que tienen datos protegidos. |

## E. Indicadores y estados sin actividad

| Hecho | ID | Preparación y pasos | Resultado esperado |
|---|---|---|---|
| [ ] | E01 | Operación diaria, Bedel → Indicadores → Día 14/09, sin filtros. Seleccionar franjas del gráfico/selector y consultar sus valores en tabla. | 8,5 horas-aula, 13,3 % de ocupación, 5 clases, 312 alumnos-hora. 32 franjas 07–23. Etiquetas y unidades; valores accesibles sin depender solo del color. |
| [ ] | E02 | Continuar E01. Filtrar aula y tipo, limpiar; elegir 15/09 sin clases. | Recalcula numeradores y denominadores con filtros. Fecha vacía muestra cero con horas habilitadas, no datos del día anterior. Alumnos-hora no se presenta como personas únicas. |
| [ ] | E03 | Semana típica, Bedel → Indicadores → Semana típica → segundo cuatrimestre. Seleccionar distintas celdas con mouse y teclado. | 108 horas, 54 clases, 2,5 %. Comparación de alumnos-hora promedio lunes a viernes: 60/72/60/72/0. Selección muestra día, franja, valor y fechas que aportan; distingue promedios de máximos reales. |
| [ ] | E04 | Continuar E03. Elegir Rango personalizado; probar 14/09–18/09, solo domingo 13/09 y rango invertido. | Valores recalculados para el rango válido; sin fechas aplicables se informa esa condición. Rango inválido no produce métricas plausibles falsas. |
| [ ] | E05 | Sin clases, Bedel. Revisar Agenda, Reservas e Indicadores del 14/09. | Vacíos explícitos y ocupación 0 % con denominador habilitado; no error de consulta. |
| [ ] | E06 | Sin horas habilitadas, Bedel. Indicadores del 14/09 y Disponibilidad con datos B. | Ocupación sin porcentaje por denominador cero; no aulas seleccionables. No se interpreta como 0 % disponible. |
| [ ] | E07 | Cobertura desconocida, Bedel. Indicadores del 14/09. | Explica ausencia de historial para inferir cobertura; no inventa denominador ni porcentaje. |

## F. Fallos, espera y recuperación controlados

Abrir los controles al pie **después** de preparar la pantalla que se quiere probar. Cada caso comienza desde su escenario restaurado. Los fallos son simulados; no desconectar Internet ni configurar servicios externos.

| Hecho | ID | Preparación y pasos | Resultado esperado |
|---|---|---|---|
| [ ] | F01 | Operación diaria, Bedel → Indicadores. Simular error de indicadores; usar el reintento ofrecido. Si el modo continúa activo, pasar a Respuesta normal y reintentar. | Error distinguible del vacío, sin valores viejos presentados como actuales. Conserva filtros y recupera resultados. |
| [ ] | F02 | Datos B, paso Elegir aulas. Simular error de disponibilidad; recuperar con Respuesta normal y reintento. | No afirma que faltan aulas por haber fallado la consulta. Conserva preparación y permite continuar. |
| [ ] | F03 | Operación diaria → Indicadores. Simular respuesta lenta; cambiar fecha/filtros durante los 1,5 segundos de espera. Repetir en Disponibilidad. | Cargando visible. Solo se presenta la consulta vigente; una respuesta anterior no reemplaza la última. Volver a Respuesta normal al terminar. |
| [ ] | F04 | Datos B en revisión. Simular fallo de guardado → Confirmar reserva. Cambiar a Guardado normal y volver a confirmar. | Falla sin crear reserva ni perder revisión. Segundo intento guarda una vez. Durante los 600 ms de guardado, botón deshabilitado y espera visible. |
| [ ] | F05 | Datos B en revisión. Simular respuesta de guardado incierta → Confirmar reserva → Comprobar estado de la reserva → detalle. | No anuncia éxito antes de comprobar. Recupera la misma reserva, 26 clases, sin reenviarla ni duplicarla. |
| [ ] | F06 | Datos B en revisión. Pulsar Ocupar Aula 203 · 14 y 21/09 · 14–16; confirmar. Elegir 301 para lunes y confirmar nuevamente. | Explica ambas fechas en conflicto, vuelve a selección y conserva preparación. No guarda clases parciales. Con alternativa libre confirma las 26; la bloqueante permanece como reserva aparte. |
| [ ] | F07 | Serie registrada. Abrir Modificar datos y preparar cambio de alumnos. Simular otra versión de reserva y guardar. Volver al detalle y abrir edición otra vez. | Rechaza la edición desactualizada sin modificar datos; nueva apertura usa la versión vigente y permite guardar una propuesta válida. |
| [ ] | F08 | Serie registrada. Preparar una reserva nueva sin guardar; Simular sesión vencida. Reingresar. | Login con aviso; preparación descartada. La serie ya registrada sigue existiendo, sin guardar accidentalmente el borrador. |

## G. Revisión visual y de interacción transversal

Repetir sobre login, agenda diaria/semanal, los tres pasos de reserva, éxito, conflictos, detalle y operaciones, listados, aulas, cuentas, calendario e indicadores. Usar los casos anteriores para llegar a cada estado.

- [ ] **G01 — 1440 / 768 / 390 px:** títulos y textos legibles; campos sin recortes, botones alcanzables, menú móvil abre/cierra y permite cerrar sesión. Sin desplazamiento horizontal de toda la página; los contenedores que sí lo necesitan tienen indicación y pueden desplazarse.
- [ ] **G02 — zoom nativo 200 %:** usar el zoom del navegador, no solo reducir la ventana. Recorrer una reserva completa y los formularios de aulas/cuentas; no se pierde ninguna acción ni contenido esencial.
- [ ] **G03 — solo teclado:** desde login usar Tab, Shift+Tab, Enter, Espacio y flechas según el control. Completar B01. Foco siempre visible, orden comprensible y sin trampas en menús o paneles. Controles no identificados únicamente por icono/color.
- [ ] **G04 — errores con teclado:** contraseña incorrecta, ID de aula duplicado, confirmación de contraseña distinta y curso vacío. Al fallar se enfoca el mensaje; sus enlaces permiten volver al campo/formulario. Repetir el mismo error verifica que vuelve a enfocar.
- [ ] **G05 — formularios móviles:** desplazar hasta los últimos campos y guardar/cancelar. Si se dispone de móvil físico, comprobar también con teclado virtual abierto; registrar «no ejecutado en dispositivo físico» si solo se usó emulación.
- [ ] **G06 — gráficos:** consultar las 32 franjas y valores de semana con teclado/toque, sin requerir hover. Contraste legible, unidades completas y leyendas consistentes.
- [ ] **G07 — referencias B:** comparar con la [guía visual](guia-visual-b.md) y los README vigentes: marfil/verde, jerarquía serif, formularios y densidad operativa. Aplicar las correcciones textuales de las referencias, no copiar erratas de las imágenes.
- [ ] **G08 — salidas:** volver/cancelar desde cada edición sin guardar, abandonar la preparación, navegar atrás/adelante y cerrar sesión. No mostrar éxito si no hubo modificación; no perder cambios ya confirmados al navegar.

## Registro de incidencias y cierre

Copiar una fila por problema. Adjuntar captura con escenario, fecha elegida y estado relevante; no basta con «se ve mal».

| Caso | Escenario / rol / tamaño | Pasos exactos y datos usados | Esperado | Observado | Captura | Prioridad / estado |
|---|---|---|---|---|---|---|
| | | | | | | |

Prioridad sugerida: **bloqueante** si impide completar un recorrido o corrompe resultados; **funcional** si incumple una regla con alternativa de salida; **visual/usabilidad** si afecta lectura o interacción. Un error visual que impide usar un control también puede ser bloqueante.

Para cerrar esta ejecución manual:

- [ ] Todos los casos tienen resultado aprobado, incidencia o motivo de no ejecución.
- [ ] Se revisaron los tres roles, todas las pantallas y los escenarios alternativos.
- [ ] Se adjuntaron evidencias de cada fallo y de las pantallas revisadas en móvil/zoom/impresión.
- [ ] Se distinguieron defectos del prototipo de límites aprobados: datos en memoria, login simulado, sin API de dominio ni integración Supabase. No evaluar aquí respaldos, despliegue o seguridad de servidor inexistente.
- [ ] Se registraron navegador, commit y cualquier revisión en dispositivo físico pendiente.
