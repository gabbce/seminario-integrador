# Cuentas y acceso

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Estado: acuerdos DA-03/06/61 a DA-65 y requisitos originales RF/CU-01 a 05. Administrador inicial definido por variable de entorno (DA-77).

## Identidad y permisos

Ingresar con email y contraseña. No hay registro público. Administrador crea cuentas con nombre, email y un único rol: Administrador, Bedel o Docente. Apellido se conserva como dato de identificación; turno y legajo son opcionales y descriptivos, sin restricciones de acceso ni vínculo obligatorio con la lista ficticia (DA-82).

Se mantiene email único, búsquedas por nombre/email/rol/estado, paginación y ordenamiento. Administrador puede modificar cuentas y rol con las reglas originales; nunca deshabilitar ni degradar al último Administrador activo. La autorización se aplica en backend, no solo ocultando acciones en pantalla.

## Contraseñas definitivas (DA-62)

Longitud mínima de 12 caracteres. Se permiten frases y no se exige combinar mayúsculas, números y símbolos. No se impone una caducidad periódica no solicitada.

Los hashes son la representación de almacenamiento, no contraseñas para entregar a usuarios. No guardar contraseñas en texto claro ni incluirlas en auditoría.

## Alta y restablecimiento (DA-63)

1. Administrador crea una cuenta o solicita restablecer su contraseña.
2. El sistema genera una contraseña temporal como frase aleatoria legible, con palabras separadas de modo sencillo y cumpliendo la longitud mínima. Se genera una nueva por operación; no hay clave fija institucional, ni se deriva de nombre, email o curso.
3. Mostrar la frase al Administrador al completar la operación para que pueda comunicarla al titular fuera de la app. No se envía email ni se integra mensajería.
4. Al ingresar con ella, el usuario debe elegir una nueva contraseña antes de acceder a las funciones habituales. La clave nueva debe diferir de la temporal y cumplir la política.
5. Una vez cambiado el secreto, la contraseña temporal deja de servir.

No mostrar un hash al Administrador ni permitir consultar después la contraseña actual. Si la temporal se pierde, generar otra mediante restablecimiento. Generar cuatro palabras aleatorias independientes a partir de un vocabulario de demo suficientemente amplio, separadas por guiones; usar aleatoriedad criptográfica y comprobar longitud mínima de 12. No derivarlas de datos personales ni incluir contraseñas válidas de ejemplo en documentación.

El cambio obligatorio se aplica también a las cuentas nuevas creadas desde la app. El Administrador inicial de la demo se exceptúa conforme a DA-77. No se crea un proceso de recuperación pública por email.

## Intentos fallidos y bloqueo

Cinco intentos fallidos consecutivos bloquean temporalmente el acceso por 15 minutos. Un inicio correcto reinicia la secuencia de fallos. El bloqueo temporal y la baja lógica son condiciones diferentes: el vencimiento del bloqueo no rehabilita una cuenta deshabilitada.

Registrar los intentos conforme a la bitácora de autenticación original, sin guardar los secretos ingresados. Contar por cuenta: al quinto fallo comienza el bloqueo; los intentos durante el bloqueo no alargan sus 15 minutos. Al vencer se reinicia el contador; una autenticación correcta también lo reinicia.

## Sesiones (DA-65)

Caducan tras 120 minutos de inactividad. La actividad válida del usuario autenticado renueva el plazo; consultas automáticas o refrescos en segundo plano no deben mantener indefinidamente una sesión abandonada. Cerrar sesión invalida el acceso asociado.

Al vencer, se exige ingresar nuevamente. La preparación temporal de reservas se pierde, porque no se guardan borradores (DA-19). Un intento de confirmar desde una sesión ya vencida no registra la reserva. La interfaz muestra el estado de sesión vencida y solicita un nuevo ingreso, conforme a los estados comunes del documento 14; no recupera borradores.

## Deshabilitar y rehabilitar (DA-64)

Deshabilitar una cuenta impide futuros ingresos e invalida sus sesiones abiertas. Conserva su identidad en auditoría e historial, y no cancela reservas ni altera la fuente simulada de docentes.

Administrador puede rehabilitarla. Sus antiguas sesiones no vuelven a ser válidas: debe iniciar sesión nuevamente. La protección del último Administrador activo sigue vigente.

## Criterios de aceptación

| ID | Situación | Resultado esperado |
|---|---|---|
| CA-U01 | Usuario intenta registrarse sin intervención de Admin. | No existe registro público. |
| CA-U02 | Alta con email ya utilizado. | Rechazo sin crear cuenta duplicada. |
| CA-U03 | Nueva contraseña de menos de 12 caracteres. | Rechazo; una frase de longitud válida no requiere categorías de caracteres. |
| CA-U04 | Cinco fallos consecutivos. | Bloqueo de 15 minutos. |
| CA-U05 | Alta o restablecimiento. | Nueva frase temporal legible; no se muestra hash ni se envía email. |
| CA-U06 | Primer ingreso con contraseña temporal. | Exigir cambio antes de permitir operaciones de la app. |
| CA-U07 | Contraseña temporal ya reemplazada. | No permite ingresar. |
| CA-U08 | Deshabilitar un usuario con sesión abierta y reservas registradas. | Sesión invalidada; reservas e historial conservados. |
| CA-U09 | Rehabilitar cuenta. | Permite nuevo ingreso; no restaura sesiones previas. |
| CA-U10 | Se cumplen 120 minutos sin actividad del usuario. | Sesión vencida; no puede confirmar una preparación sin autenticarse nuevamente. |
| CA-U11 | Intentar bajar o quitar rol al último Admin activo. | Operación impedida. |

## Administrador inicial de la demo (DA-77)

Su contraseña se recibe de una variable de entorno durante la inicialización, se valida con la política acordada y se guarda únicamente su hash. No se genera frase temporal ni se exige un cambio al primer ingreso de esa cuenta inicial. Es una excepción acotada al entorno local de demostración.

La creación es idempotente: si el usuario inicial ya existe, el arranque no sobrescribe su contraseña ni otros datos. Cambiar la variable no se interpreta como restablecimiento automático de una cuenta existente. No incluir el secreto en logs, documentación o datos ficticios versionados. El futuro archivo de ejemplo de configuración solo tendrá un valor de muestra claramente sustituible.

No se agrega asistente de aprovisionamiento ni flujo especial de recuperación pública. Las demás altas y restablecimientos desde la app mantienen DA-63.

## Perfiles y cambios de rol

Turno y legajo opcionales conforme a DA-82. Cambiar rol actualiza el perfil en la misma transacción, conserva la identidad de Usuario e invalida sesiones para que no sobrevivan permisos anteriores. Restablecer contraseña también invalida sesiones; la baja/rehabilitación no altera reservas. La auditoría conserva el cambio sin secretos.
