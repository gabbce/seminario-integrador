# Concurrencia remota extra · 19/10/2026

El usuario pidió hacer commit y push de las correcciones y, después, una prueba adicional contra Supabase remoto. Las correcciones se publicaron como `67ac1a20a2cf15e9285f5ae9c7987529abd5a2e5` en `origin/feat/cumplimiento-requisitos`. Se preservaron sin incluir los cambios abiertos de presentación/marca de otras tareas.

## Alcance y entorno

Instancia Java temporal en `127.0.0.1:8083`, imagen `sha256:4d0457024c75dbe135407770b77f8e4190e7e800331dd8bd80178a678dde3d89`; PostgreSQL/Auth reales del proyecto `nrjykdzvzrcixapkdfsp`, región `us-west-2`. No se cambió el pool, el esquema, los permisos ni los bloqueos de producto. Flyway deshabilitado en la instancia de prueba; no se restablecieron datos ni credenciales.

**Es un ensayo adicional, no el protocolo nominal de RNF-03/05:** usa los datos demo existentes, tres identidades de Auth y 50 clientes lógicos; las escrituras se ensayan en ráfagas separadas. No reproduce 50 identidades distintas con la mezcla nominal de escrituras durante diez minutos. El cliente accede por loopback a Java local; Java se conecta al Supabase remoto.

## Resultado observado

**Lecturas concurrentes aprobadas en este extra:** 50 clientes (2 con Admin, 3 con Bedel y 45 con Docente), rampa de 100 ms por cliente, 30 segundos de calentamiento, 180 segundos medidos y pausa de cinco segundos después de cada respuesta. **1.546 solicitudes medidas, cero errores.** Se comprobaron muestras de los 50 clientes y se recalcularon los percentiles independientemente a partir de los registros.

| Lectura | Solicitudes | p95 ms | Máximo ms |
|---|---:|---:|---:|
| Listado diario | 353 | 1255,6 | 1497,9 |
| Disponibilidad | 793 | 1074,8 | 1298,8 |
| Listado por curso | 400 | 1046,9 | 1421,6 |

Los tres p95 quedaron por debajo de 1.500 ms. [Muestras y metadatos](../evidencias/concurrencia-remota-lecturas-extra-2026-10-19.json).

**La ráfaga inicial de diez confirmaciones idénticas NO aprobó:** siete HTTP 200 y tres HTTP 500. Los éxitos persistieron una sola reserva (`359`); no hubo duplicación. El registro de Java identifica `SQLTransientConnectionException`: espera de 10.000 ms por una conexión Hikari con cuatro conexiones activas y ninguna libre. La respuesta más lenta tardó aproximadamente 20 segundos. Se canceló la reserva 359 y SQL confirmó cero detalles activos.

La confirmación serializa escritores mediante `control_cuentas FOR UPDATE` y conserva una conexión mientras espera y realiza las lecturas de revalidación/detalle. En esta topología, los intercambios remotos prolongan esa retención. El timeout de adquisición del pool es la causa inmediata de los HTTP 500. Aumentar únicamente el pool o el timeout no eliminaría la serialización ni demostraría el objetivo de latencia. [Resultado de la ráfaga](../evidencias/concurrencia-remota-escrituras-extra-2026-10-19.json) y [diagnóstico](../evidencias/concurrencia-remota-diagnostico-extra-2026-10-19.json).

La primera ejecución se detuvo ante ese fallo y limpió su reserva. La carga de lecturas se ejecutó después de forma independiente, sin repetir o ocultar los fallos de escritura. La recuperación del guion se ajustó al contrato `{found,booking}` del endpoint de operaciones y guarda todas las claves antes de lanzar una ráfaga.

## Integridad con concurrencia acotada

La comprobación independiente con tres solicitudes por ráfaga aprobó:

- Tres confirmaciones de la misma operación devolvieron una sola reserva (`360`).
- Docente recibió HTTP 403 al intentar confirmar y no vio contactos privados en el detalle.
- Tres ediciones con versión cero produjeron un HTTP 200 y dos HTTP 409; la versión final fue uno.
- Tres altas distintas compitiendo por el mismo horario produjeron un HTTP 200 y dos HTTP 409; se persistió una sola reserva (`361`).

[Resultado íntegro](../evidencias/concurrencia-remota-integridad-extra-2026-10-19.json). Es un control de integridad con menor presión, no una corrección ni una sustitución del fallo observado con diez solicitudes. Las respuestas de escritura de este control tardaron entre 4,8 y 9,4 segundos: tampoco acredita el objetivo de latencia de escritura de 2.000 ms.

SQL posterior confirmó **cero solapamientos activos** en toda la base y reservas `359`, `360`, `361` en estado `CANCELADA`, sin detalles activos. El inventario pasó de 358 reservas/5.328 detalles a 361/5.331, exclusivamente por esas tres reservas QA canceladas; se conserva su historial y auditoría. Las sesiones temporales se cerraron con alcance local. Se retiró exclusivamente el contenedor de esta prueba, sin reemplazar la demo existente.

## Reproducción

Requiere levantar la instancia Java de revisión con la configuración privada existente y la imagen elegida. El guion obtiene las credenciales desde el entorno o la guía demo y cierra únicamente sus sesiones temporales; no imprime ni conserva tokens. El modo con escrituras exige autorización explícita en el argumento y cancela solo las reservas que creó o recuperó por sus propias claves de operación.

```sh
# Carga de lectura, sin ejecutar escrituras:
node tools/qa/remote-concurrency-extra.mjs --origin=http://127.0.0.1:8083 --reads-only --out=artifacts/qa/requirements/remote-concurrency-reads.json

# Ráfaga inicial de diez + carga si la fase funcional aprueba:
node tools/qa/remote-concurrency-extra.mjs --origin=http://127.0.0.1:8083 --allow-qa-writes

# Integridad con ráfagas menores, sin carga posterior:
node tools/qa/remote-concurrency-extra.mjs --origin=http://127.0.0.1:8083 --allow-qa-writes --functional-only --burst-size=3 --out=artifacts/qa/requirements/remote-concurrency-functional.json
```

**Conclusión:** las lecturas pasaron esta carga remota adicional. No corresponde declarar que toda la concurrencia remota funciona bien: queda un problema reproducible de disponibilidad del pool ante ráfagas de confirmación. El siguiente trabajo requiere reducir la retención de conexiones y evaluar la coordinación de escrituras preservando la autorización vigente, idempotencia y exclusión de solapamientos, con regresiones remotas y el protocolo nominal completo.
