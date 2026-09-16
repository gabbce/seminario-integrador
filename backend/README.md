# Backend Aulas

Java 21, Spring Boot 4.1.1 y Maven Wrapper. I-01.1 incorpora PostgreSQL, JPA y migraciones Flyway de usuarios/perfiles. Autenticación y operaciones de dominio siguen pendientes de los siguientes cortes.

## Configuración local

Copiar `.env.example` a `.env` **dentro de `backend/`** y completar la conexión del proyecto Supabase. El archivo usa sintaxis Java properties, sin comillas de shell; una barra inversa literal se escribe `\\`. Está ignorado por Git. También se admiten variables de entorno del proceso, que tienen prioridad sobre el archivo.

Ejecutar desde `backend/`, ya que `.env` se resuelve respecto del directorio de trabajo:

```bash
./mvnw spring-boot:run
```

Obtener host/usuario desde Connect → Session pooler. Usar el puerto 5432 y TLS (`sslmode=require`); guardar la contraseña por separado, nunca en la URL. La conexión directa es alternativa si la red permite acceder al host. No imprimir claves ni agregar `.env` al repositorio. Las claves de Auth del ejemplo se preparan para cortes posteriores y no son utilizadas por este corte.

Las migraciones se aplican al esquema `aulas`. JPA valida, no crea/modifica tablas. Flyway no adopta automáticamente bases preexistentes (`baseline-on-migrate=false`) y su limpieza está deshabilitada. Antes del primer arranque remoto, inspeccionar que el esquema no contenga objetos ajenos y que `aulas` no esté entre los esquemas expuestos de Data API. La migración revoca acceso de PUBLIC, anon y authenticated al esquema/objetos. No modifica tablas internas de Auth.

El pool local se limita a cuatro conexiones. `/api/health` informa salud sin detalles internos; escucha en loopback, puerto `PORT` (8080 predeterminado). Ya requiere conexión válida a PostgreSQL para arrancar. No hay endpoints de dominio ni autenticación implementados en I-01.1.

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
