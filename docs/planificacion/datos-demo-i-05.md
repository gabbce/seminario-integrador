# Datos demo I-05

Dataset aditivo `volumen-i05`, versión1. Generación determinista (sin PRNG): `python3 tools/demo/generate-volume.py`. Recurso JSON versionado; cada clave combina año/período/aula/día/hora o escenario. Usa catálogos existentes, tres materias/comisiones y cinco docentes ficticios. No crea ni modifica aulas, calendario ni usuarios.

306 reservas, **4613 clases registradas,4612 vigentes y1 cancelada** en estado original:
- 2026 segundo:679.
- 2027 primero:829.
- Anuales2027:2998.
- Esporádicas2027/receso:107.

Franja periódica21–22 para cuatrimestrales y12–13/22–23 para anuales. Aulas101,102,104,106,201,202,205,206,Lab1,Lab2. La104 excluye el segundo lunes de cada patrón. No se usan103/105 ni QA2029; martes laboratorio14–17 queda intacto. Los recorridos manuales I04 de julio08–10:30 y los ejemplos preservados de consulta siguen libres/iguales respecto de esta carga.

Impresión de referencia **23/08/2027**, todos los tipos/aulas, no canceladas: **104 filas**,8 aulas×13 medias horas de09–15:30; **52 horas-aula,780 alumnos-hora**,8 clases simultáneas; pico125 alumnos a10:00,11:30,13:00 y14:30 (cada franja dura30min). A09:00 son120 y a09:30 son115. Es receso, válido para esporádicas. Aula104 el24/08/2027 a19–20: cancelada;26/08 a19–20 vigente. Reprogramada25→27/08/2027 a19–20 en104, origen conservado.

## Comandos explícitos

Desde la raíz, verificar definición sin DB:
```sh
python3 tools/qa/check-volume.py
```

Desde `backend/`, solo para carga pendiente:
```sh
AULAS_ENVIRONMENT=demo ./mvnw spring-boot:run \
  -Dspring-boot.run.arguments="--spring.main.web-application-type=none --aulas.command=seed-volumen-i05"
```
Primera ejecución:306 reservas/4613 clases creadas. Repetición:0/0 creadas,306 conservadas. Discrepancias de cambios manuales se informan y nunca se restauran. Faltantes/conflictos fallan con rollback; no editar ni borrar registros para recargar. No ejecutar semillas al arrancar ni restablecer para iniciar QA.

Inventario privado antes/después con app8080 y configuración local existente:
```sh
node tools/qa/inventory.mjs /ruta/privada/antes.json
# carga explícita, cuando corresponda
node tools/qa/inventory.mjs /ruta/privada/despues.json
python3 tools/qa/check-volume.py /ruta/privada/antes.json /ruta/privada/despues.json /ruta/privada/ids-i05.json
```
Los archivos contienen datos ficticios del dominio/contactos y deben permanecer privados; no contienen tokens/contraseñas. La comparación preserva cada reserva anterior completa, referencias de aulas y las consultas de ranking laboratorio14–16, contigua16–17 y QA esporádica27/29julio08–09.

Estado de carga y evidencia se registra en avance I05. Los totales globales incluyen reservas manuales adicionales; no confundirlos con los4613 del dataset ni con los fixtures exactos aislados. QA del usuario pendiente.

## Línea base compartida inventariada

26/09/2026, antes de volumen:31 reservas/537 detalles,517 vigentes y20 cancelados. Ranking I03 laboratorio martes14–16:Lab2=480min,Lab1=1920min. La consulta contigua16–17 tiene **Lab1 libre**; Lab2 ya tiene la reserva14, Álgebra, martes16–18, ajena al dataset I03. Se conserva ese estado real, sin borrar reservas para forzar el ejemplo original. Ambas fechas QA27/29julio08–09 ofrecen103,105,204,206,101,107,108,201,104,205; el cotejo posterior exige igualdad exacta. No se modifica el añoQA2029.

Con esa línea base, el23/08/2027 las20aulas habilitadas aportan320h:ocupación52/320=16,25% (interfaz16,3%). Semana23–27/08:el conjunto previo aporta las dos clases de I04(reserva27,aula105,24/26ago07–08,20alumnos); el volumen agrega104clases del lunes y dos vigentes104(26/27ago19–20,15/20alumnos). Esperado conjunto:108clases,56horas-aula/1600habilitadas=3,5%,855alumnos-hora. Estos totales son de la línea base inventariada, no una garantía frente a nuevas altas manuales.


## Reproducir evidencia de impresión

Con backend8080, configuración local de Auth y dataset ya cargado, desde `frontend/`:
```sh
npx playwright test --config playwright.real.config.ts e2e/volume-real.spec.ts
```
La prueba de solo lectura crea PDF, filas DOM e imágenes en `artifacts/qa/i05/` (ignorado por Git). No requiere archivos temporales preexistentes. Desde la raíz y con Python+`pypdf`:
```sh
python3 tools/qa/verify-volume-print.py artifacts/qa/i05/volume-real.pdf artifacts/qa/i05/print-rows.json /ruta/privada/ids-i05.json
python3 tools/qa/verify-volume-print.py artifacts/qa/i05/volume-firefox.pdf artifacts/qa/i05/print-rows-firefox.json /ruta/privada/ids-i05.json
```
El último argumento es el manifiesto emitido por el cotejo anterior; para la carga compartida está versionado `docs/evidencias/i05-datos.json`, sin contactos. Compara cada fila de PDF con su contenido completo y el conjunto exacto de IDs del manifiesto. El verificador independiente de volumen exige además8clases en cada franja09–15:30 y los cuatro picos de125alumnos publicados.

Filtros adicionales del QA con la línea base preservada:

| Fecha/filtro | Filas esperadas |
|---|---:|
|23/08/2027, General, vigentes|65|
|23/08/2027, Multimedios, vigentes|39|
|23/08/2027, aula104, vigentes|13|
|24/08/2027, todas las aulas/tipos, todas|2 (una vigente I04 y una cancelada I05)|
|24/08/2027, canceladas|1|
|25/08/2027, todas|0; la reprogramada ocupa27/08|

## Carga compartida verificada el26/09/2026

La comparación posterior confirma las306reservas/4613clases adicionales y la igualdad íntegra de las31reservas previas, referencias, calendarios/cursos y consultas protegidas. Total conjunto en ese momento:337reservas,5150clases registradas,5129vigentes y21canceladas. IDs por clave semántica: [manifiesto](../evidencias/i05-datos.json). No hubo restablecimiento.

`volume-real.spec.ts`:3/3 aprobadas con Supabase Auth/PostgreSQL reales. PDFs Chromium y Firefox:9páginas cada uno,104identidades y contenido completo contrastados con manifiesto. Indicadores día/semana y los seis filtros publicados coinciden; privacidad Docente comprobada. Inspección visual de listado, resumen/curvas, semana móvil y primera página de ambos PDF completada técnicamente. Estos resultados no constituyen QA ni aceptación manual del usuario.

Repetición explícita remota26/09/2026:0reservas/0clases creadas,306conservadas, sin discrepancias. El comando de carga preserva cambios; no usarlo como restablecimiento.
