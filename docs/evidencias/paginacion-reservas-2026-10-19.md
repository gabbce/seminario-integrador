# Paginación de la colección de reservas — 19/10/2026

Corrección H3/RNF03. `GET /api/reservas` devuelve `{items,total,page,size}`. `page` comienza en cero; `size` admite 20, 50 o 100 (por defecto 20). Páginas negativas, tamaños distintos y números inválidos reciben HTTP 400. Una página fuera de rango es válida: conserva el total y devuelve `items: []`. El desplazamiento se calcula con enteros de 64 bits.

El orden es ID descendente. Cabeceras llevan `LIMIT/OFFSET` en PostgreSQL. Recursos, ocurrencias, períodos, exclusiones, patrones e historial filtran en SQL los IDs de esas cabeceras. Una página vacía no ejecuta las lecturas de hijos. Conteo y lecturas comparten una transacción de sólo lectura `REPEATABLE_READ`.

El detalle conserva su contrato y las restricciones Docente. La aplicación operativa ya utiliza `/api/consultas/listado`, agenda e impresión diaria; no requiere descargar esta colección. El método Java de inventario completo permanece exclusivamente para comandos demo y pruebas explícitas. Los inventarios QA de navegador y herramientas recorren páginas de 100 intencionalmente.

## Evidencia local

- RED: `ReservationPaginationTests` falla con `$.total`/`$.items` inexistentes al recibir el array anterior y con SQL sin `LIMIT`; log temporal `/tmp/t3-red.log`.
- GREEN: lote dirigido con PostgreSQL 17.6 efímero, 26 pruebas sin fallos: Pagination (3), PeriodicConfirmation (14), Consultation (6) y DemoVolume (3). Log `/tmp/t3-green.log`. Se mantienen detalle, carga demo, filtros, listado paginado y la impresión completa de más de 100 filas.
- Regresión de paginación: 121 reservas; recorre tamaños 20/50/100; comprueba orden, cardinalidad, total, página vacía grande, valores inválidos, autenticación y privacidad Docente en toda la respuesta. Observación del JdbcTemplate real confirma predicados SQL para los seis grupos de hijos/historial.
- Reejecución reforzada GREEN: 3/3 Pagination con 121 cancelaciones e historiales privados reales; comprueba cada ID, recurso y aula de las tres variantes de tamaño. Log `/tmp/t3-green-enhanced.log`.
- Playwright local: 1 prueba verde, inventario de 205 reservas obtenido en tres páginas de 100 con autorización conservada; API interceptada. Log `/tmp/t3-playwright.log`.
- `node --check` verde en `tools/qa/inventory.mjs` y `tools/qa/measure-reads.mjs`.

Estas pruebas no ejecutan escrituras ni autenticaciones remotas y no acreditan latencia RNF03 contra Supabase ni aceptación manual. La verificación integral del conjunto de correcciones se registra por separado.
