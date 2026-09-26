# Avance I-06

Estado: implementación en curso. I-04/I-05/I-06 mantienen aceptación manual pendiente. I-05 está verificada funcionalmente; la referencia remota de latencia excede objetivos y no acredita RNF. Se ejecutará protocolo completo separado en I-06.3.

## I-06.1 · Paquete Compose

Contrato previo `docs/api/paquete-demo-i-06.md`. Una aplicación/origen, React dentro de Spring Boot, Supabase remoto, configuración privada montada y cargas siempre explícitas. Verificación técnica completada el 26/09/2026; aceptación manual pendiente.

- Build multietapa y reconstrucción con caché completados. Imagen `sha256:353a92b32da824891405f222f613e72bc76247dfbfb91509edeea4a4318a9b15`; bases por digest, npm lockfile, Maven 3.9.16 con SHA-256 verificado contra SHA-512 oficial. Runtime Temurin 21.0.12.1+1.
- Compose saludable en `127.0.0.1:8082`; React compilado dentro del JAR, sin Vite/Node en runtime. El desarrollo Java + Vite se conserva.
- Seguridad/rutas: 8/8 pruebas Java (SecurityTests + SpaRoutingTests). Paquete real: 5/5 Playwright con Chromium 153.0.8010.12, Auth Supabase y perfiles Admin/Bedel/Docente/inhabilitado. Login, permisos de navegación, ruta profunda y recarga, 20 filas de 104, assets del mismo origen y errores API JSON. Capturas locales `artifacts/qa/package/{admin,bedel,docente}.png`; inspección visual de escritorio y Docente 390×844. Firefox y recorrido final ampliado corresponden a I-06.3.
- `tools/qa/verify-image.py`: 34.787 archivos del JAR (incluidos anidados) y 5.321 archivos de capas runtime revisados; sin coincidencias de valores privados locales inspeccionados ni archivos `.env`; usuario predeterminado sin privilegios. No equivale a un escáner universal de credenciales desconocidas.
- `stop/start` y salud comprobados; inventarios antes/después semánticamente idénticos: 337 reservas, 5.150 clases, 28 aulas, cursos/calendarios y consultas protegidas. Se ignora únicamente orden de claves JSON y orden de recursos (conjuntos). No se ejecutó carga ni reset. Inventarios privados no versionados.
- Lint frontend y `git diff --check` sin errores. Revisión GPT-6 Luna high de especificación y estándares: checksum Maven fijado, escaneo extendido a capas y cierre local de sesión del inventario en `finally`. Sin cambios sobre Auth ni migraciones aplicadas.

Reproducción: [ejecutar demo](ejecutar-demo-i-06.md), `npx playwright test --config=playwright.package.config.ts` desde frontend y `python3 tools/qa/verify-image.py` desde raíz. Para comparar reinicio: `AULAS_API_ORIGIN=http://127.0.0.1:8082 node tools/qa/inventory.mjs /ruta/privada/antes.json`, stop/start, repetir como después.json y comparar JSON normalizando recursos. Mantener esos inventarios privados. No se declara aceptación de I-04/I-05/I-06.
