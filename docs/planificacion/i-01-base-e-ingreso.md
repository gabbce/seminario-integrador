# I-01 · Base e ingreso real

**Estado:** alcance, entorno, preparación de cuentas, contrato de sesión, subcortes y validación aprobados por el usuario. Plan consolidado; implementación no iniciada. Pertenece al [plan general I-01 a I-06](integracion.md). Cada entrega posterior tendrá su propio detalle antes de comenzar.

## Resultado y límites

Ingresar con Supabase → Java valida identidad y permisos → React muestra perfil y navegación del rol → recargar conserva sesión → cerrar sesión impide seguir operando desde esa sesión del navegador.

Incluye conexión, migraciones iniciales de usuarios/perfiles, preparación explícita del administrador y cuentas ficticias, autorización en servidor, `GET /api/me` y conexión del login existente. No incluye gestión de cuentas en pantalla (I-02), tablas/operaciones persistentes de aulas y reservas, despliegue ni Docker Compose de la app (I-06).

**Corrección expresa del usuario:** no construir avisos, páginas de secciones pendientes ni otra UI transitoria. Conectar el acceso real sobre la interfaz existente; integrar después cada módulo. El estado parcial se documenta para el desarrollador. Los controles que simulan autenticación, cambio de rol o expiración no deben poder sustituir la identidad real. El prototipo íntegro permanece en `prototype/v1`; no agregar un selector permanente entre backend real y simulado.

## Entorno aprobado

- Proyecto Supabase indicado por el usuario: `nrjykdzvzrcixapkdfsp` ([dashboard](https://supabase.com/dashboard/project/nrjykdzvzrcixapkdfsp)). Su configuración y contenido se inspeccionaron y verificaron durante I-01; ver el avance.
- Un proyecto dedicado a desarrollo/demo, sin producción separada por ahora. React y Java se ejecutan localmente.
- PostgreSQL y Auth remotos. Esquema de dominio propio, no accesible mediante la API pública de Supabase; acceso por Java.
- Variables del frontend: URL del proyecto y clave pública de Auth. Variables exclusivamente del backend: conexión PostgreSQL y credencial administrativa de Auth. Ejemplos sin secretos; valores reales fuera de Git y logs.
- Registro público deshabilitado; cuentas creadas mediante preparación explícita o administración futura. Sin registro libre ni recuperación por correo.
- PostgreSQL desechable y separado para pruebas destructivas. Cuentas ficticias identificables para comprobación real de Auth; no borrar datos ajenos a la preparación de pruebas.

Antes de conectar, inspeccionar configuración y contenido existentes, verificar acceso y obtener las variables mediante configuración local segura. No asumir que el proyecto está vacío ni que su configuración ya cumple el plan.

## Persistencia inicial

Respetar [modelo consolidado](../especificacion/13-modelo-consolidado.md) y [cuentas y acceso](../especificacion/10-cuentas-y-acceso.md): Usuario con ID interno numérico estable, UUID Auth único, email, nombre, apellido, rol, estado activo y versión. Conservar especializaciones Administrador, Bedel (turno opcional) y Docente (legajo opcional), con la misma identidad de usuario.

El UUID es el vínculo de identidad; no vincular automáticamente por coincidencia de email. Un perfil utilizable requiere su identidad Auth y especialización compatible. No guardar contraseñas, hashes ni sesiones en nuestras tablas. Las migraciones solo administran el esquema de dominio, nunca las tablas internas de Auth. Herramienta de migraciones, nombres SQL y DTO exactos se concretan al preparar el subcorte, respetando estas reglas y las dependencias del repo.

## Preparación de cuentas

Dos comandos explícitos, separados del arranque del servidor:

1. **Administrador inicial:** toma nombre/apellido, correo y contraseña de variables de entorno; crea identidad y perfil compatibles. Si ya está correctamente creado, informa que está listo y no modifica contraseña ni datos. Ante cuenta incompatible o vínculo dudoso, informa el problema sin promoverla automáticamente.
2. **Cuentas ficticias:** prepara Admin, Bedel, Docente y usuario deshabilitado solo en desarrollo/demo. No se ejecuta automáticamente.

Crear identidad Auth y perfil PostgreSQL no constituye una única transacción. Si falla el perfil, el proceso debe reconocer su creación incompleta y permitir completarla al repetir, sin duplicar usuarios ni anunciar éxito prematuro. Antes de implementar el comando se debe fijar cómo identifica de forma inequívoca una identidad creada por ese mismo proceso; un email coincidente por sí solo no basta. Seguir los [contratos administrativos de identidad](../especificacion/15-operaciones-y-contratos.md).

## Contrato de sesión

| Acción | Comportamiento aprobado |
|---|---|
| Ingresar | React autentica con Supabase y consulta `GET /api/me` con Bearer token. |
| Perfil | Java valida token y usuario activo; devuelve identificador, nombre/apellido, correo, rol y permisos. Sin contraseñas, tokens administrativos ni datos internos innecesarios. |
| Recargar | React recupera la sesión del proveedor y vuelve a consultar el perfil antes de mostrar la app autenticada. |
| Renovar | Cliente Supabase gestiona renovación; Java valida cada token recibido. Sin segunda sesión de servidor ni temporizador propio de inactividad. |
| Cerrar sesión | Cerrar sesión del cliente y limpiar perfil/datos de pantalla. Atrás no recupera una pantalla operable de la sesión cerrada. |

Java valida firma, emisor, audiencia y expiración; además comprueba estado/rol actuales del perfil. Permisos derivados de los tres roles fijos, sin gestor configurable. React adapta navegación usando esos permisos; no es la autoridad de autorización.

| Situación | Respuesta / recuperación |
|---|---|
| Token ausente, inválido o vencido | `401`; recuperar sesión cuando corresponda, sin reintentos infinitos, y volver al ingreso si no es posible. |
| Cuenta deshabilitada o sin perfil habilitado | `403`; explicar acceso no disponible y permitir cerrar sesión. No crear perfil automáticamente. |
| Rol insuficiente | `403`; conservar sesión y explicar que la acción no está permitida. |
| Servicio no disponible | Error con reintento; no confundir con contraseña incorrecta ni borrar una sesión válida automáticamente. |

El cierre de sesión no debe describirse como revocación inmediata universal de todos los JWT emitidos: la validación y los límites de revocación siguen la especificación de Auth. La prueba del navegador verifica limpieza y no reutilización de la sesión cerrada; el estado deshabilitado se comprueba en Java aun ante un token vigente.

## Subcortes en orden

| Corte | Trabajo | Evidencia requerida antes del commit |
|---|---|---|
| I-01.1 · Configuración y persistencia | Revisar proyecto/configuración, dependencias compatibles, conexión Java, migraciones iniciales y ejemplos de variables. | Java conecta; base de prueba desde cero y segunda ejecución de migraciones correctas; restricciones de identidad/perfil probadas. No se alteran tablas internas de Auth. |
| I-01.2 · Preparación de cuentas | Comandos Admin y cuentas de prueba; reconocimiento y recuperación de altas incompletas. | Primera ejecución, repetición sin duplicados/cambio de clave, rechazo de identidad incompatible y recuperación después de fallo de perfil. |
| I-01.3 · Identidad y permisos | Configuración de validación de tokens, perfil activo, roles, `/api/me` y contrato documentado. | Respuestas correctas para tres roles; tokens inválidos y cuentas sin acceso rechazados; permisos probados en servidor. |
| I-01.4 · Sesión React | Conectar login existente, perfil/navegación, restauración, cierre y errores. | Recorrido real integrado, pruebas de navegador, revisión visual escritorio/móvil y teclado. Sin UI temporal de secciones pendientes. |

En cada corte: concretar contrato/configuración que corresponda, implementar, probar, documentar y hacer commit. No agregar endpoints ficticios de producto solo para comprobar permisos: usar endpoints disponibles y pruebas de configuración/autorización. La matriz de permisos se vuelve a verificar al incorporar endpoints de negocio en entregas posteriores.

## Validación acordada

| Grupo | Casos |
|---|---|
| PostgreSQL automático | Migraciones desde cero y repetidas; unicidad de UUID/perfil y relaciones requeridas; aislamiento de la base de demo. |
| Preparación automática | Admin nuevo, repetición, clave no sobrescrita, incompatibilidad, fallo entre Auth y perfil y recuperación segura. |
| Seguridad automática | Token válido, vencido, firma incorrecta, otro emisor y audiencia incorrecta; perfil inexistente, deshabilitado y rol sin permiso. Claves de prueba, sin depender de disponibilidad del proveedor. |
| Auth real explícito | Cuentas ficticias en el proyecto: login, `/api/me`, recarga y cierre. Rechazo de perfil deshabilitado incluso con token vigente. Registrar resultados sin secretos. |
| React | Ingreso válido, contraseña incorrecta, cuenta sin acceso, fallo de servicio y recuperación. Navegación por rol, limpieza al salir y Atrás. Escritorio, móvil y teclado. |

Las pruebas automáticas habituales no requieren Supabase en línea. Las pruebas explícitas del proveedor son adicionales y necesarias para cerrar I-01; no se sustituyen por simulaciones. PostgreSQL desechable sí debe comprobar persistencia real. No ejecutar restablecimientos destructivos contra la base de demo.

## Checklist de cierre

- [x] I-01.1 verificado y guardado en commit; ver [avance](avance-i-01.md).
- [x] I-01.2 verificado y guardado en commit.
- [x] I-01.3 verificado y guardado en commit.
- [x] I-01.4 verificado y guardado en commit.
- [x] Recorrido conjunto real probado con las cuentas preparadas en Supabase.
- [x] Pruebas automáticas aprobadas y evidencia visual registrada.
- [x] Variables, comandos y comprobaciones documentados sin secretos.
- [x] Limitaciones de módulos todavía simulados documentadas fuera de la UI.

Entrega implementada y validada; evidencia y límites en [avance](avance-i-01.md). Antes de iniciar I-02 se detalla y acuerda su propio plan.
