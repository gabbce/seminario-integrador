# QA manual · I-02

Estado: fase aceptada y cerrada por el usuario el 17/09/2026 tras QA manual y aprobación de los ajustes visuales de alertas y calendario, incluida la separación entre consultar y crear años lectivos. Usar datos ficticios. Las credenciales se consultan en `backend/.env`, nunca se copian a capturas ni al repositorio.

## Preparación y alcance

Arrancar backend y frontend según sus README. Preparar las cuentas demo de I-01 si la base es nueva y ejecutar la [carga básica](datos-demo-i-02.md). Abrir dos perfiles de navegador para verificar sesiones independientes. Cuentas: `admin@demo.local`, `bedel@demo.local`, `docente@demo.local` e `inhabilitado@demo.local`.

Esta entrega persiste cuentas, aulas, calendario y cursos. La lista académica de docentes la sirve Java; no son cuentas de acceso. Reservas, agenda e indicadores conservan todavía el recorrido del prototipo: no usar sus resultados como prueba de persistencia. I-03 a I-05 completan esas funciones y sus datos. No hace falta probarlas para aceptar I-02.

## Cuentas · Administrador

1. En Administración → Cuentas, buscar por nombre/email, combinar rol/estado, ordenar y cambiar tamaño de página. Recargar: resultados siguen viniendo del servidor.
2. Crear una cuenta ficticia de cada rol con contraseña elegida y confirmada. Verificar sus ingresos en otra sesión; Docente no ve acciones de administración y Bedel no administra cuentas/calendario.
3. Cambiar nombre, apellido y rol; turno de Bedel y legajo de Docente son opcionales. Recargar y consultar desde otra sesión. No debe quedar el perfil del rol anterior.
4. Cambiar email con su acción específica; cerrar sesión e ingresar con el nuevo. La identidad y el resto de los datos se conservan.
5. Establecer contraseña con su acción específica. Ingresar con la nueva y comprobar rechazo de la anterior. No exigir revocación instantánea de JWT ya emitidos.
6. Deshabilitar una cuenta de prueba y comprobar rechazo en su siguiente operación; rehabilitarla. No se puede quitar el último Administrador activo.
7. Abrir la misma cuenta en dos sesiones; guardar un cambio en una y luego en la otra: debe rechazarse la versión vieja. Volver a abrir los datos antes de reintentar.
8. Email duplicado, campos faltantes y contraseña rechazada muestran error comprensible. Si una operación queda incompleta, seguir el mensaje y no asumir éxito: el reintento de alta/email conserva la operación; una contraseña incierta requiere una nueva decisión explícita. Estos fallos del proveedor también están cubiertos con pruebas controladas, sin provocarlos sobre identidades ajenas.

## Aulas · Administrador y Bedel

1. En Aulas, crear General, Multimedios y Laboratorio con identificadores distintos. Capacidad son personas; PC de laboratorio solo descriptivas.
2. Cambiar tipo, recursos, ubicación, piso y estado. Recargar y abrir desde otra sesión: se conservan. Cambiar estado/tipo agrega historia; cambios de otros datos no crean un intervalo nuevo.
3. Probar filtros de tipo, estado, capacidad y características; ordenar y paginar. No existe filtro por cantidad de PC.
4. Intentar capacidad cero, PC negativas, identificador duplicado y edición desactualizada: rechazos comprensibles sin cambios parciales.
5. Dar de baja un aula de prueba. Desaparece de operación habitual; el filtro Baja permite verla con su historia y sin edición/restauración. Su identificador no puede reutilizarse.
6. Ingresar como Docente: consulta inventario/detalle sin alta, edición o baja. Los permisos también están verificados por API.

## Calendario · Administrador

1. Administración → Calendario académico: elegir 2026/2027 y revisar sus dos cuatrimestres y fechas ficticias. La carga no es un calendario oficial argentino.
2. Crear un año de prueba sin dependencias. Empieza en preparación. Cargar parcialmente períodos, guardar y recargar.
3. Intentar habilitarlo incompleto, con fechas fuera del año o cuatrimestres solapados: rechazo. Completar ambos correctamente y habilitarlo.
4. Agregar fecha no lectiva futura con descripción; corregir descripción, quitarla y guardar. No se permite agregar/quitar fechas pasadas ni moverlas desde/hacia el pasado. La carga histórica ficticia no modifica esta regla de la interfaz.
5. Abrir dos sesiones: una guarda y la otra rechaza su versión vieja. Recargar calendario debe actualizar tanto el editor como las referencias de las otras pantallas.
6. Quitar un período de un año habilitado lo deja en preparación en la misma operación. Para eliminar un año de prueba, quitar primero períodos y fechas; un año con cursos no puede eliminarse ni renumerarse.
7. Cerrar un año de prueba: queda de solo lectura y no se reabre. No cerrar los años 2026/2027 del dataset si se quieren usar para las próximas entregas.
8. Bedel/Docente no pueden gestionar calendario. Dependencias con reservas se verificarán al implementar su persistencia en I-03/I-04.

## Referencias · Formulario de nueva reserva

1. Como Bedel, abrir Nueva reserva. Elegir año habilitado, buscar una materia/comisión y seleccionar curso. El código visible tiene formato `001-A-2026`; no muestra el ID interno.
2. Crear una materia ficticia con comisión A; crear otra comisión B de la misma materia. Crear A en otro año: comparten código de materia, pero son cursos diferentes.
3. Repetir con espacios extra y cambios de mayúsculas: se reutiliza materia/curso. Recargar y abrir otra sesión: los cursos persisten sin confirmar una reserva.
4. Seleccionar docente de la lista servida por Java. Crear una cuenta de acceso Docente en Administración no agrega una referencia académica.
5. Años no habilitados no permiten crear cursos; las cuentas Docente tampoco. Sus respuestas de referencias docentes no incluyen email.

## Datos, presentación y cierre

- Ejecutar la carga dos veces: la segunda crea cero registros. Cambiar una capacidad manualmente y repetir: se conserva e informa discrepancia.
- Revisar escritorio y móvil (~390 px), navegación con Tab, foco de errores, selectores, botones de guardado y ausencia de desbordamiento horizontal.
- Si la API falla, las pantallas muestran error y reintento; no reemplazan catálogos por ejemplos ocultos.
- Registrar fecha, navegador y resultados por sección. Los casos de concurrencia, rollback y recuperación controlada del proveedor están automatizados; no hace falta alterar la infraestructura remota para repetirlos manualmente.

| Sección | Resultado del usuario | Observaciones |
|---|---|---|
| Cuentas/Auth | Aceptado (17/09/2026) | |
| Aulas | Aceptado (17/09/2026) | |
| Calendario | Aceptado (17/09/2026) | |
| Referencias | Aceptado (17/09/2026) | |
| Repetición de carga y presentación | Aceptado (17/09/2026) | Ajustes visuales aprobados. |
