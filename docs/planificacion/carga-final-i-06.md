# Medición de carga I-06.3

El [contrato del protocolo](../api/carga-final-i-06.md) aplica el documento11 íntegro. Es una medición del paquete con PostgreSQL local, separada de Supabase. La muestra remota I05 superó objetivos: listado p95 1612,87ms, disponibilidad 2748,60ms; no declarar cumplimiento remoto a partir del ensayo local.

## Reproducir

Requiere imagen construida con Compose, Docker, Node24 y Python3. Desde raíz:

```sh
node tools/qa/load/run.mjs
python3 tools/qa/load/verify.py
```

Reservar al menos 15 minutos: preparación más 2 minutos de calentamiento y 10 de medición. No ejecutar otra batería de pruebas/build durante la ventana medida. El runner crea nombres aleatorios y retira únicamente sus contenedores/redes por IDs. No acepta URL de base remota, no usa los `.env` privados ni accede a Supabase. Datos y JWKS quedan en red interna; la aplicación tiene además bridge de acceso por loopback, que no bloquea todo egreso. Las credenciales/JWT son efímeros y locales. Las 50 identidades se autentican mediante JWT firmado validado por la seguridad real de la aplicación y perfiles persistidos.

El generador `tools/qa/load/dataset.py` fija semilla/asignaciones y usa el año actual para elegir histórico cerrado y operativo futuro. Siempre parte de una base nueva: 30 aulas, 800 series de32clases, 500esporádicas, sin colisiones. Se preparan 280 altas y diez series propias (cinco cuatrimestrales32, cinco anuales64) fuera de medición. No se baja la carga ante fallos.

## Evidencia

Archivos locales ignorados en `artifacts/qa/load/`:

- `manifest.json` y `dataset.sql`: datos/fechas/IDs/perfiles ficticios y SQL efectivamente cargado.
- `assignments.json`: propuestas completas y mapa sesión→series/IDs/pares de aulas, sin tokens.
- `setup.json`: imagen, origen temporal, tamaños iniciales y cantidades preparadas.
- `activations.json`: comienzo planeado/real de cada sesión.
- `samples.json`: cada respuesta, fase, ciclo, IDs, versión/objetivo de modificación, estado HTTP y error; ningún outlier se descarta.
- `auxiliary.json`: autenticación/preparaciones separadas; `pauses.json`: espera solicitada y efectiva después de respuesta.
- `result.json`: percentiles/tasas/errores por operación, recursos/topología/versiones, hashes y límites de aplicación.
- `app.log`/`dataset.log`: diagnóstico local privado, no compartir sin revisión.

El auditor `verify.py` recalcula percentiles y comprueba tamaños, sesiones, escalonado, ventanas, pausas, ciclos, asignaciones y versiones con los archivos guardados. Un código de salida 0 del runner exige p95<1500ms disponibilidad/listados y <2000ms altas/modificaciones, sin errores en ninguna fase. El auditor prueba coherencia del registro; no convierte una medición fallida en cumplimiento.

El manifiesto varía de año si la ejecución ocurre en otro año; conserva semilla, esquema y dimensiones. El reporte registra el hash exacto del SQL y de los scripts. Las cifras globales de esta base aislada no son esperados del entorno compartido.

## Resultado técnico · 26/09/2026

Protocolo completo aprobado localmente: 5.963 solicitudes medidas, cero errores medidos o de calentamiento, cero auxiliares durante medición. p95 en ms: disponibilidad14,23; listado diario13,43; listado por curso94,01; alta periódica100,19; modificación periódica201,95. Pausa mínima efectiva5000,0026ms. Cincuenta sesiones y las dos series propias de cada operador verificadas por auditor independiente.

[Reporte](../evidencias/i06-carga.json), [dataset](../evidencias/i06-carga-dataset.json), [hashes/auditoría](../evidencias/i06-carga-auditoria.json) y [trazas sin credenciales](../evidencias/i06-carga-trazas.tar.gz). Para auditar la corrida conservada sin repetir doce minutos:

```sh
mkdir -p artifacts/qa/load-conservada
tar -xzf docs/evidencias/i06-carga-trazas.tar.gz -C artifacts/qa/load-conservada
python3 tools/qa/load/verify.py artifacts/qa/load-conservada
```

La auditoría también conserva hashes de `app.log`, `dataset.log` y `dataset.sql`, que son artefactos locales excluidos del tar y no se requieren para recalcular el protocolo.

La imagen y recursos exactos constan en el reporte. El árbol estaba sucio por este nuevo guion de pruebas; sus hashes fijan las fuentes efectivas. Este resultado no acredita RNF contra Supabase remoto. QA y aceptación manual pendientes.
