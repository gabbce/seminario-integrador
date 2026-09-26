# Paquete demo I-06.1

Un único servicio Compose `app`: React compilado dentro del JAR Spring Boot, `/api` en el mismo origen. PostgreSQL/Auth Supabase remotos; no servicio de base en Compose. Puerto interno8080, publicación `127.0.0.1:${DEMO_PORT:-8080}`. Desarrollo Java+Vite conserva127.0.0.1/8080; contenedor sobrescribe dirección a0.0.0.0.

Build multietapa con imágenes fijadas por digest, Node24 y Java21, `npm ci`/lockfile y Maven Wrapper3.9.16/pom. Solo URL/clave pública Auth como argumentos frontend; cambiar estas requiere rebuild. No copiar archivos.env, credenciales, logs, inventarios, `.git`, node_modules ni targets al contexto. Configuración backend provista como archivo privado de solo lectura a runtime, fuera de capas e imagen. No imprimir `docker compose config` expandido con secretos.

GET/HEAD de rutas React conocidas y assets públicos sirven la interfaz/login. Rutas profundas válidas reciben index; `/api/**`, assets inexistentes y rutas desconocidas no reciben fallback SPA. Autorización/validación JWT vigentes se conservan; HTML no concede acceso API. Salud `/api/health` y HEALTHCHECK sin dependencias adicionales de red al proveedor Auth.

Usuario de contenedor sin privilegios, señal de parada dirigida a Java. Arranque/reinicio aplica migraciones compatibles como antes y nunca carga/restablece datos. Comandos de demo siguen explícitos; un reset remoto sigue requiriendo autorización concreta aparte. Documentar build, up, health, logs, stop/start/down y diagnóstico de puerto/conexión. Verificación de paquete: rutas y assets, roles, ausencia de secretos en contexto/bundle/capas, inventario antes/después del reinicio.
