# Datos demo · I-04

Conjunto aditivo `operacion-i04`, versión 1, en `backend/src/main/resources/demo/operacion-i04-v1.json`: **8 reservas, 69 clases registradas**, de las cuales **18 canceladas y 51 vigentes** al cargar. Se conserva íntegro el dataset I-03 (12 reservas/370 clases) y toda reserva manual o QA previa. No es una carga de volumen para indicadores; eso corresponde a I-05.

## Carga explícita y repetición

Con catálogos I-02 y un Administrador activo, desde `backend/`:

```sh
AULAS_ENVIRONMENT=demo ./mvnw spring-boot:run \
  -Dspring-boot.run.arguments="--spring.main.web-application-type=none --aulas.command=seed-operacion-i04"
```

El arranque normal no ejecuta la carga. Primera ejecución esperada: `8 reservas y 69 clases creadas; 0 reservas conservadas`. Repetición: `0 reservas y 0 clases creadas; 8 reservas conservadas`. No hace falta restablecer ni borrar tablas. El [contrato del comando](../api/carga-demo-i-04.md) detalla garantías.

El registro V10 usa dataset/clave, definición y snapshot completos. Repetir con otro administrador no duplica. Una definición modificada, clave retirada o reserva editada se informa como discrepancia y se conserva; no se restaura la versión de demostración. No borrar identidades para forzar recarga. Si faltan referencias, cambió el calendario efectivo o hay ocupación, revierte todas las nuevas altas y operaciones de esa ejecución sin alterar datos previos.

Solo este comando usa reloj histórico fijo al 01/01/2026 para construir la historia ficticia, dentro de una transacción real. Usa los servicios y restricciones operativos. No cambia el reloj de HTTP/UI, no habilita altas retroactivas y no modifica Auth, contraseñas ni perfiles.

## Escenarios del conjunto

Todos usan **Historia A**, docente ficticia **Laura Gómez**, 20 alumnos, tipo General, sin recursos adicionales. Aula inicial103 y horario07–08, salvo lo indicado. Fechas son institucionales de Córdoba. El total global puede ser mayor.

| Clave | Escenario / fechas | Resultado inicial | Clases |
|---|---|---|---:|
| receso-2027 | 14 y16/07/2027, esporádica | Ambas vigentes en103; válidas durante receso | 2 |
| cancelacion-parcial-2027 | 20 y22/07/2027 | 20 cancelada con motivo; 22 vigente103 | 2 |
| cancelacion-total-2026 | 06 y08/10/2026 | Ambas canceladas; cabecera Cancelada, espacio libre | 2 |
| aulas-esporadica-2027 | 24 y26/08/2027 | Ambas103→105; fechas/horarios iguales; historial | 2 |
| origen-esporadica-2027 | 17/08→18/08/2027 | Vigente103, origen17/08 visible | 1 |
| patron-reprogramado-2027 | Martes del primer cuatrimestre; excluye23/03 | Patrón103→105;09/03 cancelada;16/03 movida al17/03 conservando origen y patrón martes; las demás vigentes105 | 15 |
| cese-periodica-2026 | Jueves del segundo cuatrimestre | Todas canceladas con cese explícito; ampliación no las regenera | 14 |
| anual-2027 | Miércoles08–09, ambos cuatrimestres, aula103 | 31 vigentes, sin receso ni feriados; continuidad normal | 31 |

Los calendarios originales usan primer período2027 09/03–03/07 y segundo14/09–18/12. Una edición manual que conserve exactamente las fechas esperadas permite cargar; un cambio efectivo de fechas bloquea las altas pendientes. Las identidades ya cargadas siempre se recuperan antes de reinterpretar calendario/ocupación.

## Reservas QA previas conservadas

Estas se crearon durante los recorridos reales y **no** forman parte del comando repetible. No se borran ni se sobrescriben:

| Reserva / curso | Escenario real conservado |
|---|---|
|15 /83|Esporádica19 y21/07/2027,14–16, aulas103/105|
|16 /84|22 y23/07/2027,11–12, aula103, cancelada|
|17 /84|Mismas fechas/horario/aula, nueva reserva que prueba liberación|
|18 /85|«QA I04 Cabecera»,26 y28/07/2027,11–12, aula105;25 alumnos, Ana Ruiz|
|19 /86|«QA I04 Aulas esporádicas»,30/07 y03/08/2027,11–12,103→105|
|20 /87|«QA I04 Aulas periódicas»,viernes20–21, primer período2027, patrón103→105|
|21 /88|«QA I04 Reprogramar esporádica», origen10/08→11/08→13/08/2027,18–19:30,103; segunda12/08,11–12|
|22 /89|«QA I04 Reprogramar periódica», origen11/03→12/03→15/03/2027,18–19:30,103; regla jueves19–20 intacta|
|23 /90|«QA I04 Impacto calendario», año QA2029 (id4); lunes05,12,19/03,18–19,103; calendario y dos nuevas clases confirmados juntos|

Las pruebas reales usan datos ficticios identificables y mantienen los años2026/2027 y QA anteriores. El año2028 preexistente se preservó; por eso la prueba de calendario eligió2029. No repetir pruebas `*-real.spec.ts` para restablecer estos ejemplos: agregan nuevas identidades.

## Verificación y reloj

`DemoOperationTests` usa PostgreSQL17.6 aislado y comprueba carga, repetición, cambios manuales, conservación de I-03, fallos de referencia/fechas/ocupación/auditoría y ausencia de carga automática. `CalendarImpactTests` cubre ampliación/quitar feriado, interferencias, exclusiones/origen/canceladas, fin natural y cese en escenarios controlados.

Al25/09/2026, parte del segundo período2026 es histórica; el primer2027/anual2027 todavía es futuro. Las cantidades persistidas siguen siendo69 aunque pase el tiempo; las acciones disponibles dependen del inicio real. Para reproducir fin natural y espera de bloqueo se usan tests con reloj controlado, sin cambiar la demo compartida.

Estado de carga remota y evidencia final: consultar [avance I-04](avance-i-04.md). No se atribuye aceptación del usuario a las verificaciones automatizadas.


## Carga y lectura remota realizadas

25/09/2026: primera carga Supabase **8 reservas/69 clases** (`/tmp/i046-seed-real.log`); segunda **0 creadas/8 conservadas**, sin discrepancias (`/tmp/i046-seed-repeat.log`). No es necesario cargar para iniciar QA. IDs: **24** receso, **25** parcial, **26** total, **27** cambio de aulas esporádico, **28** origen esporádico, **29** patrón reprogramado, **30** cese periódico, **31** anual. Lectura real de solo consulta **1/1** (`/tmp/i046-real-browser.log`), verificando ocho identidades/69 detalles/18 cancelados y presencia de QA15–23. Segunda sesión Docente sin contactos, registrante, historial ni actor de cancelación. Capturas Bedel1440, cancelación parcial390 y Docente390 inspeccionadas. Se conserva todo para QA manual.
