# Ejecutar demo con Compose

Docker Engine/Desktop con Compose v2 e internet. PostgreSQL/Auth permanecen en Supabase: Compose solo inicia la aplicación. Puerto publicado en loopback. No requiere PostgreSQL, Node ni Java instalados para ejecutar este paquete.

## Configuración privada

Desde checkout limpio, copiar `backend/.env.example` a `backend/.env` y `frontend/.env.example` a `frontend/.env.local` y completar localmente, sin sobrescribir archivos existentes.

Conservar/preparar `backend/.env` (formato Java properties, según `backend/README.md`) y `frontend/.env.local` (solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`). Nunca usar una clave service_role/secret como clave pública. Estos archivos están ignorados por Git y excluidos del contexto Docker. No copiar secretos a Dockerfile ni argumentos de build.

El backend monta su archivo privado como `/run/secrets/backend.properties`, solo lectura, al ejecutar; no se incorpora a ninguna capa. Si está en otro sitio, indicar `AULAS_BACKEND_CONFIG=/ruta/privada/backend.properties`. En Linux/WSL el usuario del contenedor debe poder leerlo: predeterminado1000:1000; ajustar `DEMO_UID=$(id -u)` y `DEMO_GID=$(id -g)` si corresponde. Mantener archivo600, sin hacerlo público. Usar UID sin privilegios. En Docker Desktop deben estar compartidas las rutas de los archivos montados.

El frontend incorpora únicamente configuración pública Auth al compilar; un cambio de proyecto/clave pública requiere reconstruir. Las imágenes base están fijadas por digest y dependencias por lockfile/Maven Wrapper/pom.

## Construir e iniciar

Desde la raíz:
```sh
docker compose --env-file frontend/.env.local build
docker compose --env-file frontend/.env.local up -d
docker compose --env-file frontend/.env.local ps
```

Abrir [demo](http://127.0.0.1:8080). Si8080 ya está usado, elegir otro puerto sin detener ese servicio:
```sh
DEMO_PORT=8082 docker compose --env-file frontend/.env.local up -d
```
Abrir entonces [demo8082](http://127.0.0.1:8082). Usar el mismo `DEMO_PORT` en los comandos siguientes para evitar recrear el servicio con otro puerto. El origen sirve HTML/assets y `/api`; una ruta directa como `/reservas/24` funciona también al recargar. Login con cuentas demo existentes; la instancia compartida usa las credenciales ficticias públicas de `docs/credenciales-demo.md`. Para una réplica, usar las credenciales de su preparación privada. Ningún arranque carga ni restablece reservas.

Salud (adaptar puerto):
```sh
curl --fail http://127.0.0.1:8080/api/health
```
Esperado HTTP200 y `UP`. Compose tiene comprobación de salud interna y margen inicial90s para conexión/migraciones. Con Supabase inaccesible la aplicación no queda saludable; no hay éxito ficticio. Las migraciones vigentes se validan/aplican de forma normal, sin editar migraciones ya aplicadas.

## Parar, reiniciar y diagnosticar

```sh
docker compose --env-file frontend/.env.local stop
docker compose --env-file frontend/.env.local start
docker compose --env-file frontend/.env.local logs --tail=80 app
docker compose --env-file frontend/.env.local down
```
`stop/start` conserva contenedor; `down` elimina solo contenedor/red Compose, sin tocar datos Supabase. No hay volumen local PostgreSQL. No ejecutar `down` sobre otros proyectos.

- Puerto ocupado: elegir `DEMO_PORT`; no matar procesos ajenos.
- Archivo privado ilegible: verificar ruta compartida, UID/GID y permisos; no publicar su contenido ni relajar permisos globalmente.
- Error de conexión: comprobar internet, host/puerto/SSL y credenciales del archivo local; no mostrar contraseñas en comandos/logs compartidos.
- URL/clave Auth incorrecta: revisar únicamente las variables públicas y reconstruir.
- Rutas API o assets inexistentes no devuelven index.html; los errores de API mantienen JSON/HTTP y permisos.

No ejecutar `docker compose config` con secretos expandidos ni compartir volcados de entorno. Los comandos normales no necesitan exponer credenciales. El modo de desarrollo Java+Vite sigue en los README de backend/frontend.

Los comandos de carga siguen explícitos en los manifiestos I02/I03/I04/I05. El [restablecimiento selectivo](restablecer-demo-i-06.md) tiene previsualización y ensayo aislado reproducible. Un restablecimiento remoto requiere autorización sobre destino y alcance concretos.

Estado del paquete: I-06 verificada técnicamente y lista para QA; evidencia y comandos en [avance I-06](avance-i-06.md). QA/aceptación manual pendientes.
