# Cuentas y acceso

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

## Identidad y permisos

Supabase Auth gestiona identidad, contraseñas, autenticación y sesiones. La app ofrece ingreso con email/contraseña y cierre de sesión, sin registro público, recuperación pública por correo ni cambio de contraseña por el titular desde la interfaz de la app. Se desactiva el registro público en la configuración del proveedor, además de omitirlo en las pantallas.

Administrador crea cuentas de Administrador, Bedel o Docente. La app conserva nombre, apellido, rol único, estado y perfiles: turno de Bedel y legajo de Docente son opcionales y descriptivos. Las cuentas son independientes de los docentes de la lista ficticia usada para reservar.

Supabase Auth es la autoridad del email de acceso y su unicidad. Usuario conserva una copia para búsquedas y listados, actualizada por el backend al completar un cambio administrativo de email. El UUID de Auth es el vínculo estable; el email no es la clave de relaciones. El rol y estado autorizados provienen de Usuario, nunca de metadatos editables por el cliente.

Solo Admin puede gestionar cuentas. Se mantienen búsquedas por nombre/email/rol/estado, paginación y ordenamiento, modificación de perfiles y protección del último Admin activo, incluso ante operaciones simultáneas.

## Alta y restablecimiento

1. Admin ingresa nombre, apellido, email, rol y una contraseña elegida para la cuenta. El formulario pide confirmación de contraseña y aplica la política configurada en Supabase.
2. El backend verifica permisos y solicita el alta mediante la API administrativa de Auth, con el email confirmado para esta demo de cuentas creadas por Admin; no se exige correo de activación.
3. Completa el vínculo con Usuario y su perfil. Solo muestra éxito cuando identidad y perfil están disponibles para acceder.
4. Admin comunica las credenciales al titular fuera de la app. No se guardan ni se recuperan contraseñas desde la base del dominio.

Para restablecer, Admin selecciona la cuenta y establece una nueva contraseña mediante el backend. El usuario puede ingresar con la nueva sin paso obligatorio adicional. La interfaz no genera frases temporales ni consulta la contraseña anterior. Un fallo del proveedor no se presenta como éxito; conservar datos corregibles sin persistir ni registrar secretos.

La política de contraseña, límites ante intentos y duración/renovación de sesiones son los del proveedor configurado para la demo. No se implementan políticas propias de contraseñas, contadores de fallos ni reloj de inactividad. Los mensajes traducen errores de Auth de manera comprensible.

## Acceso a la API y sesiones

React usa el cliente de Supabase para login, renovación y cierre de sesión. Envía el access token a Java como Bearer. Spring Security verifica firma, emisor, audiencia y vigencia del token y resuelve su sujeto al Usuario vinculado. Cada solicitud protegida comprueba activo y rol actuales en la base del dominio. Una identidad sin perfil no tiene acceso a la app.

Cerrar sesión usa el cierre del proveedor para la sesión actual y elimina la sesión del cliente. Cuando no es posible renovar o el token es inválido, la app solicita ingreso y no confirma operaciones sin autorización. No hay tabla de sesiones ni temporizador de actividad propios.

Los access tokens ya emitidos pueden seguir siendo válidos hasta su expiración tras cierre o cambio de contraseña: no se promete revocación instantánea global ni se implementa una lista propia de tokens revocados. Deshabilitar una cuenta sí impide desde el cambio confirmado nuevas solicitudes a la API porque se consulta activo, aunque el token sea válido. Un cambio de rol aplica sus permisos actuales en la siguiente solicitud autorizada.

## Deshabilitar y rehabilitar

La baja lógica conserva identidad, perfil histórico y reservas. No elimina la identidad de Auth. Una cuenta deshabilitada puede llegar a autenticarse ante el proveedor, pero Java rechaza su acceso a la app y la interfaz informa la restricción. El último Admin activo no se puede deshabilitar ni degradar.

Rehabilitar restaura el permiso de acceso sujeto a identidad válida y rol actual. Se aplican las sesiones del proveedor: no se garantiza exigir nuevo login si todavía existe una sesión válida. Ninguna de estas operaciones cancela reservas.

## Administrador inicial

La inicialización recibe email y contraseña por variables de entorno privadas del backend y crea la identidad Auth y el perfil Admin mediante el mismo circuito administrativo. La creación es idempotente: no duplica cuentas ni cambia contraseñas/roles existentes al reiniciar. La recuperación de una inicialización incompleta comprueba el vínculo antes de crear o asociar registros; nunca adopta una identidad ajena automáticamente por coincidencia de email.

No hay asistente especial, secreto universal ni dependencia de correo. Las credenciales administrativas de Supabase solo se usan en el servidor. Las instrucciones de demo explican cómo configurar el proyecto y ejecutar la inicialización, sin incluir secretos reales.

## Criterios de aceptación

| ID | Situación | Resultado esperado |
|---|---|---|
| CA-U01 | Intento de registro público. | No hay pantalla ni registro público habilitado en Auth. |
| CA-U02 | Alta con email utilizado. | Rechazo sin duplicar identidad o perfil. |
| CA-U03 | Contraseña rechazada por Supabase. | Error comprensible; no se informa alta o cambio exitoso. |
| CA-U04 | Credenciales incorrectas. | No se accede a la app; se informa error del proveedor sin contador o bloqueo propios. |
| CA-U05 | Admin crea cuenta o restablece contraseña. | Se acepta la clave elegida mediante Auth; no se registra el secreto ni se envía correo. |
| CA-U06 | Primer ingreso de una cuenta completa. | Accede a las funciones del rol sin pantalla de cambio obligatorio. |
| CA-U07 | Login con contraseña anterior después de restablecimiento confirmado. | Rechazado; la nueva permite ingresar. Esto no afirma revocación instantánea de tokens emitidos. |
| CA-U08 | Cuenta deshabilitada con access token válido y reservas. | La siguiente solicitud protegida se rechaza; reservas e historial se conservan. |
| CA-U09 | Cuenta rehabilitada. | Acceso con identidad válida y rol actual; no se altera la programación de reservas. |
| CA-U10 | Token inválido o expirado sin renovación posible. | La API rechaza la solicitud y la interfaz solicita ingreso; no guarda la operación. |
| CA-U11 | Intentar deshabilitar o degradar al último Admin activo. | Operación impedida también bajo concurrencia. |
| CA-U12 | Auth crea identidad pero falla la creación del perfil. | No se informa éxito ni se permite acceso al dominio; se resuelve la operación incompleta sin duplicar cuentas. |
| CA-U13 | Bedel o Docente invoca el cambio administrativo de contraseña. | Backend lo rechaza por permisos. |

## Referencias técnicas

[Alta administrativa](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [actualización administrativa](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) y [cierre de sesión y vigencia de tokens](https://supabase.com/docs/guides/auth/signout). Las llamadas administrativas pueden realizarse desde Java por HTTP; no exigen un backend Node adicional.
