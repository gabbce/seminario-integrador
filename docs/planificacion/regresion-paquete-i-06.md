# Regresión del paquete I-06.3

No ejecutar estas pruebas al mismo tiempo que la medición de carga. Navegadores: Chromium y Firefox instalados por Playwright; registrar sus versiones. Las configuraciones desactivan trazas/video automáticos para no almacenar sesiones o credenciales.

## Paquete contra datos compartidos · solo lectura

Iniciar Compose (puerto8082 si8080 está ocupado). Desde frontend:

```sh
npx playwright test --config=playwright.package.config.ts
```

El origen predeterminado es `http://127.0.0.1:8082`; `AULAS_TEST_ORIGIN` permite indicar otro puerto del mismo paquete. Requiere dataset I05 ya cargado explícitamente y las cuentas existentes. No ejecuta seeds, reset ni operaciones de dominio. Verifica login/perfiles, recarga de rutas, assets/API, permisos, listados/indicadores y PDF completo de104filas en ambos navegadores. Capturas/PDF/filas en `artifacts/qa/package/`.

Contrastar cada PDF con manifiesto independiente (Python3 con pypdf):

```sh
python3 tools/qa/verify-volume-print.py artifacts/qa/package/volume-chromium.pdf artifacts/qa/package/print-rows-chromium.json docs/evidencias/i05-datos.json
python3 tools/qa/verify-volume-print.py artifacts/qa/package/volume-firefox.pdf artifacts/qa/package/print-rows-firefox.json docs/evidencias/i05-datos.json
```

El ensayo automatizado comprueba teclado y reflow con viewport CSS683×384, equivalente al espacio de diseño disponible con zoom200% en escritorio1366×768. El zoom nativo del navegador sigue explícito en el QA manual. No presentarlo como si se hubiera usado la interfaz de zoom nativa.

## Cifras históricas exactas · base aislada, imagen final

Desde raíz:

```sh
node tools/qa/exact-package-env.mjs
```

Mantener abierto; en otra terminal desde frontend:

```sh
npx playwright test --config=playwright.exact.config.ts
```

Interfaz y API en5176, misma imagen final, PostgreSQL descartable, Auth Supabase real. Consulta la [tabla exacta](qa-exacto-i-05.md). `Ctrl+C` elimina únicamente sus contenedores/red. No cambia dominio remoto.

## Operaciones I04 · base aislada, imagen final

Con el entorno exacto anterior detenido, desde raíz:

```sh
node tools/qa/exact-package-env.mjs --operations
```

Este modo prepara perfiles locales vinculados a las identidades Auth existentes y ejecuta cargas I02/I03/I04 únicamente en su PostgreSQL descartable. En otra terminal desde frontend:

```sh
AULAS_QA_BROWSER=chromium npx playwright test --config=playwright.operations.config.ts
```

Después de Chromium, detener el helper con Ctrl+C y volver a iniciar `node tools/qa/exact-package-env.mjs --operations`; ejecutar el mismo comando con `AULAS_QA_BROWSER=firefox`. Cada navegador necesita una base nueva, porque reprogramar libera el origen y conserva ocupado el destino. La guarda exige las20reservas iniciales antes de escribir; no se reutiliza una base ya probada.

Repite alta esporádica, cancelación/liberación, cabecera/historial, cambio de aulas por clase/patrón, reprogramación doble conservando origen e impacto atómico de calendario, con segunda sesión Docente y privacidad. El setup rechaza ejecutarse si no identifica el contenedor aislado esperado en5176 y su JDBC local. Reutiliza los casos integrados I04; las sesiones temporales, incluidas secundarias, se cierran con `scope=local`. Capturas separadas por navegador en `artifacts/qa/operations/`. No ejecutar esta configuración contra Supabase.

Las escrituras de estos ensayos se descartan con `Ctrl+C`. Los datos manuales y QA2029 compartidos se conservan. La regresión técnica complementa, sin sustituir, F06–F09 del usuario.

## Servicios, fallos y concurrencia aislados

Desde backend, sin otra compilación Maven usando ese mismo `target`:

```sh
./mvnw test
```

Testcontainers comprueba persistencia, permisos, concurrencia, rollback, límites temporales, operaciones recuperables, consultas/indicadores y reset. Pruebas UI con respuestas simuladas desde frontend:

```sh
npm test
npx playwright test
npm run build
npm run lint
```

Estado de resultados finales y aceptación: ver [avance I06](avance-i-06.md); ninguna prueba automatizada declara aceptación manual.
