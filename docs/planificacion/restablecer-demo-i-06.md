# Restablecer datasets demo

El comando devuelve únicamente las reservas de los datasets seleccionados a sus definiciones originales. Conserva cuentas/contraseñas/UUID de Auth, perfiles, aulas e historia, cursos, calendarios, reservas ajenas y QA 2029. Las cargas `seed-*` siguen siendo preservadoras: repetir una carga no es restablecer.

## Ensayo aislado reproducible

Desde la raíz, con la imagen construida según [Compose](ejecutar-demo-i-06.md), Docker y Python 3:

```sh
python3 tools/qa/reset-rehearsal.py
```

El script crea su propia red y PostgreSQL 17.6 descartable, sin publicar puertos ni aceptar una URL de base externa. Ejecuta migraciones y cargas I02/I03/I04 mediante el JAR de la imagen; crea un perfil local ficticio, sin contactar Auth. Modifica una reserva I04, comprueba la previsualización, rechaza una huella incorrecta, restablece y repite. Verifica conservación de I03, perfiles, aulas/historia, cursos/calendarios y testigo 2029. Elimina exclusivamente sus contenedores/red por sus IDs al terminar. Resultado en `artifacts/qa/reset/result.json`; logs privados ignorados por Git. Un cierre forzado del proceso puede requerir revisar recursos con etiqueta `aulas.qa=reset`; no borrar recursos de otros ensayos/proyectos.

Para pruebas de volumen completo, conflictos, origen inmutable, recuperación de operaciones y rollback:

```sh
cd backend
./mvnw -Dtest=DemoResetTests test
```

Testcontainers crea una base aislada y aplica las migraciones reales. Ninguna de estas pruebas restablece Supabase.

## Procedimiento sobre un destino elegido

**Para un destino remoto, primero obtener autorización explícita del usuario sobre ese destino y los datasets concretos.** La planificación y este documento no autorizan ejecutarlo. Los comandos siguientes son instrucciones, no evidencia de ejecución remota.

1. Elegir la configuración privada del destino (`AULAS_BACKEND_CONFIG` si difiere del predeterminado), revisar su host/base sin revelar contraseñas y conservar el mismo archivo durante todo el procedimiento. Seleccionar una lista explícita de datasets completos: `reservas-i03`, `operacion-i04`, `volumen-i05`. Deben estar cargados y corresponder a las definiciones versionadas actuales.
2. Detener la aplicación del destino y cerrar otras herramientas que escriban. Conservar `DEMO_PORT` si se usa un puerto distinto del predeterminado:

```sh
docker compose --env-file frontend/.env.local stop app
```

3. Previsualizar; este ejemplo selecciona únicamente I04:

```sh
docker compose --env-file frontend/.env.local run --rm --no-deps app \
  --spring.main.web-application-type=none --AULAS_ENVIRONMENT=demo \
  --aulas.command=reset-demo --aulas.reset.datasets=operacion-i04
```

Revisar `destination`, `datasets`, cada clave/ID, componentes diferentes, IDs de clases/patrones adicionales que se retirarán y `blockers`. La sección «PREVISUALIZACIÓN — SIN CAMBIOS» describe el alcance. Como en cualquier arranque Java, las migraciones compatibles pendientes se aplican antes del comando; la previsualización no modifica los datos del dominio. No continuar si hay bloqueos ni con una configuración/destino distinto. Cambios de calendario o aulas y ocupación ajena pueden impedir la recuperación; no se reparan ni eliminan automáticamente.

4. Con autorización remota vigente y sin bloqueos, copiar la huella exacta revisada a `HUELLA_REVISADA` y ejecutar la misma selección:

```sh
docker compose --env-file frontend/.env.local run --rm --no-deps app \
  --spring.main.web-application-type=none --AULAS_ENVIRONMENT=demo \
  --aulas.command=reset-demo --aulas.reset.datasets=operacion-i04 \
  --aulas.reset.application-stopped=true --aulas.reset.confirm=HUELLA_REVISADA
```

La ejecución vuelve a validar dentro de una transacción y exige que nada haya cambiado desde la previsualización. Cualquier error revierte todas las reservas seleccionadas. No aceptar una salida parcialmente exitosa: el proceso debe terminar con código 0 y «RESTABLECIMIENTO CONFIRMADO». Ante error, revisar y previsualizar otra vez; nunca omitir la huella ni alterar registros ajenos para forzar el comando.

5. Iniciar la aplicación, comprobar salud, recargar el detalle y los filtros del manifiesto seleccionado:

```sh
docker compose --env-file frontend/.env.local start app
```

Los IDs originales se mantienen y las versiones avanzan. Las clases y patrones adicionales posteriores al seed pueden desaparecer solo dentro de la reserva seleccionada; sus IDs retirados se registran en la vista previa y auditoría. Una esporádica reprogramada conserva su origen inmutable aunque vuelva a la fecha original. El historial registra el restablecimiento. Recuperar o reintentar operaciones invalidadas anteriores responde conflicto: recargar datos y revisar una nueva operación. No reutilizar formularios abiertos antes del reset.

Repetir el procedimiento exige una nueva previsualización: mantiene el estado funcional, pero genera nuevas versiones y auditoría. Los totales globales pueden incluir reservas manuales preservadas; contrastar los esperados del manifiesto y los filtros, no asumir que toda la base vuelve al estado inicial.

Aceptación manual I-04/I-05/I-06: pendiente. Restablecimiento remoto: no ejecutado.
