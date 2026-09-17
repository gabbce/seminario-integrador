# Backend Aulas

Java 21, Spring Boot 4.1.1 y Maven Wrapper. I-01 e I-02 incorporan Supabase Auth, perfiles, administración de cuentas, aulas, calendario y referencias con PostgreSQL y migraciones Flyway. I-03 incorpora reservas periódicas persistentes; las operaciones restantes e indicadores se completan en I-04 e I-05.

## Configuración local

Copiar `.env.example` a `.env` **dentro de `backend/`** y completar la conexión del proyecto Supabase. El archivo usa sintaxis Java properties, sin comillas de shell; una barra inversa literal se escribe `\\`. Está ignorado por Git. También se admiten variables de entorno del proceso, que tienen prioridad sobre el archivo.

Ejecutar desde `backend/`, ya que `.env` se resuelve respecto del directorio de trabajo:

```bash
./mvnw spring-boot:run
```

Obtener host/usuario desde Connect → Session pooler. Usar el puerto 5432 y TLS (`sslmode=require`); guardar la contraseña por separado, nunca en la URL. La conexión directa es alternativa si la red permite acceder al host. No imprimir claves ni agregar `.env` al repositorio. Las claves de Auth se usan para validar sesiones y administrar cuentas según los permisos del usuario.

Las migraciones se aplican al esquema `aulas`. JPA valida, no crea/modifica tablas. Flyway no adopta automáticamente bases preexistentes (`baseline-on-migrate=false`) y su limpieza está deshabilitada. Antes del primer arranque remoto, inspeccionar que el esquema no contenga objetos ajenos y que `aulas` no esté entre los esquemas expuestos de Data API. La migración revoca acceso de PUBLIC, anon y authenticated al esquema/objetos. No modifica tablas internas de Auth.

El pool local se limita a cuatro conexiones. `/api/health` informa salud sin detalles internos; escucha en loopback, puerto `PORT` (8080 predeterminado). Ya requiere conexión válida a PostgreSQL para arrancar. Los contratos vigentes de identidad, administración, catálogos y reservas están en `docs/api/`.

## Pruebas

Requieren Docker disponible; no requieren credenciales ni un proyecto Supabase:

```bash
./mvnw test
```

Testcontainers inicia PostgreSQL 17.6 desechable con credenciales propias, sobreescribe los datos de conexión de la app y lo destruye al finalizar. No apunta a la base de demo. Comprueba arranque, migraciones repetidas, UUID/email únicos, especialización compatible obligatoria y cambio transaccional de rol, bloqueo de acceso de roles públicos y preservación de un esquema Auth ficticio.

Las restricciones diferidas permiten crear Usuario y su especialización, o cambiar el rol junto con su perfil, dentro de una misma transacción. No se puede confirmar un usuario sin especialización ni con un perfil de otro rol.

## Estado remoto

Conexión verificada a `nrjykdzvzrcixapkdfsp` con un rol dedicado `aulas_app`, dueño únicamente del esquema `aulas`, sin superusuario ni creación de roles/bases. Su contraseña se generó y guardó en `.env`; no se cambió la de `postgres`. Se consultó el host real del pooler (no se deduce de la región). Java aplicó V1, respondió `UP` y el segundo arranque no repitió migraciones. Se verificó ausencia de acceso al esquema para `anon` y `authenticated`, Data API expone solamente `public,graphql_public` y registro público de Auth deshabilitado.

Referencias técnicas: [inicialización y Flyway en Spring Boot](https://docs.spring.io/spring-boot/how-to/data-initialization.html), [conexión Spring Boot/Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/spring-boot). Dependencias resueltas por el BOM de Spring Boot 4.1.1; Flyway 12.4.0 y Testcontainers 2.0.5.

## Preparación explícita de cuentas (I-01.2)

Completar `AULAS_ADMIN_EMAIL`, `AULAS_ADMIN_NOMBRE`, `AULAS_ADMIN_APELLIDO`, `AULAS_ADMIN_PASSWORD` y las variables Auth en `.env`. Desde `backend/`:

```bash
./mvnw -q compile exec:java -Dexec.args=admin
```

Para las cuatro cuentas ficticias, definir `AULAS_ENVIRONMENT=demo` y `AULAS_DEMO_PASSWORD` y ejecutar:

```bash
./mvnw -q compile exec:java -Dexec.args=demo
```

Cuentas: `admin@demo.local`, `bedel@demo.local`, `docente@demo.local`, `inhabilitado@demo.local`. La última tiene perfil inactivo. Las contraseñas se leen exclusivamente de la configuración local. El comando de demo y el de Admin pueden referirse a la misma cuenta si nombre/apellido/rol/estado coinciden; usar Admin / Demo para el administrador ficticio.

El arranque normal nunca ejecuta estos comandos. Repetirlos conserva identidades, perfiles y contraseñas existentes; una discrepancia informa error sin sobrescribir. La tabla de preparación conserva intención y UUID de operación, nunca claves. Auth recibe una marca administrativa de esa operación para reconocer un alta de resultado incierto. Si falla el guardado local, repetir comprueba Auth y completa el perfil solo cuando la marca coincide. Una cuenta existente ajena no se adopta por email. La referencia al UUID creado se confirma antes de intentar el perfil, para sobrevivir a su rollback. Las llamadas de red se realizan fuera de transacciones JDBC; solo la finalización usuario/perfil/resultado bloquea el registro local. Las búsquedas remotas tienen límite de páginas y tiempo; una falla no se interpreta como ausencia de identidad.

Una respuesta incierta o fallo de Auth no se presenta como éxito. Repetir el comando permite comprobar el resultado; si persiste el error, revisar configuración y estado del proveedor antes de otro intento. No borrar cuentas ajenas ni modificar su contraseña para resolverlo.

## Identidad y permisos (I-01.3)

GET /api/me recibe Bearer JWT de Supabase y devuelve el perfil activo y sus permisos; [contrato OpenAPI](../docs/api/identidad.openapi.yaml). Java valida firma ES256/RS256, emisor, audiencia authenticated y expiración. Rol y estado se consultan en PostgreSQL en cada petición; no se confía en un rol enviado por React o incluido en metadata del token. /api/health permanece público.

401 indica token inválido; 403 perfil no habilitado o permiso insuficiente; 503 indisponibilidad de validación o persistencia. Las pruebas de autorización combinan controladores de test con los endpoints operativos. Se ejecutan sin Auth remoto, con PostgreSQL desechable y claves JWT locales.

## Catálogos de demostración

La carga explícita de I-02 prepara 20 aulas, 2026/2027 y 40 cursos sin modificar cuentas ni claves. Seguir [datos y comando](../docs/planificacion/datos-demo-i-02.md) y [QA manual](../docs/planificacion/qa-manual-i-02.md). El arranque normal no carga datos. Contratos en `docs/api/`: administración, aulas, calendarios y referencias.

## Reservas periódicas (I-03)

[Contrato OpenAPI](../docs/api/reservas.openapi.yaml) y [transacciones, bloqueos y reintentos](../docs/api/reservas-concurrencia.md). La disponibilidad y la confirmación se calculan en Java; el cliente no aporta identidad del registrador ni datos libres del docente. [Avance verificable](../docs/planificacion/avance-i-03.md) y [guía de QA](../docs/planificacion/qa-manual-i-03.md).

La carga explícita de [reservas demo 2026/2027](../docs/planificacion/datos-demo-i-03.md) amplía los catálogos: 12 series y 370 clases. Su repetición detecta diferencias sin duplicar ni restaurar datos. El arranque normal nunca ejecuta esa carga.
