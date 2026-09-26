# Avance I-06

Estado: implementación en curso. I-04/I-05/I-06 mantienen aceptación manual pendiente. I-05 está verificada funcionalmente; la referencia remota de latencia excede objetivos y no acredita RNF. El protocolo completo local de I-06.3 pasó, sin extrapolar a Supabase remoto.

## I-06.1 · Paquete Compose

Contrato previo `docs/api/paquete-demo-i-06.md`. Una aplicación/origen, React dentro de Spring Boot, Supabase remoto, configuración privada montada y cargas siempre explícitas. Verificación técnica completada el 26/09/2026; aceptación manual pendiente.

- Build multietapa y reconstrucción con caché completados. Imagen `sha256:353a92b32da824891405f222f613e72bc76247dfbfb91509edeea4a4318a9b15`; bases por digest, npm lockfile, Maven 3.9.16 con SHA-256 verificado contra SHA-512 oficial. Runtime Temurin 21.0.12.1+1.
- Compose saludable en `127.0.0.1:8082`; React compilado dentro del JAR, sin Vite/Node en runtime. El desarrollo Java + Vite se conserva.
- Seguridad/rutas: 8/8 pruebas Java (SecurityTests + SpaRoutingTests). Paquete real: 5/5 Playwright con Chromium 153.0.8010.12, Auth Supabase y perfiles Admin/Bedel/Docente/inhabilitado. Login, permisos de navegación, ruta profunda y recarga, 20 filas de 104, assets del mismo origen y errores API JSON. Capturas locales `artifacts/qa/package/{admin,bedel,docente}.png`; inspección visual de escritorio y Docente 390×844. Firefox y recorrido final ampliado corresponden a I-06.3.
- `tools/qa/verify-image.py`: 34.787 archivos del JAR (incluidos anidados) y 5.321 archivos de capas runtime revisados; sin coincidencias de valores privados locales inspeccionados ni archivos `.env`; usuario predeterminado sin privilegios. No equivale a un escáner universal de credenciales desconocidas.
- `stop/start` y salud comprobados; inventarios antes/después semánticamente idénticos: 337 reservas, 5.150 clases, 28 aulas, cursos/calendarios y consultas protegidas. Se ignora únicamente orden de claves JSON y orden de recursos (conjuntos). No se ejecutó carga ni reset. Inventarios privados no versionados.
- Lint frontend y `git diff --check` sin errores. Revisión GPT-6 Luna high de especificación y estándares: checksum Maven fijado, escaneo extendido a capas y cierre local de sesión del inventario en `finally`. Sin cambios sobre Auth ni migraciones aplicadas.

Reproducción: [ejecutar demo](ejecutar-demo-i-06.md), `npx playwright test --config=playwright.package.config.ts` desde frontend y `python3 tools/qa/verify-image.py` desde raíz. Para comparar reinicio: `AULAS_API_ORIGIN=http://127.0.0.1:8082 node tools/qa/inventory.mjs /ruta/privada/antes.json`, stop/start, repetir como después.json y comparar JSON normalizando recursos. Mantener esos inventarios privados. No se declara aceptación de I-04/I-05/I-06.

## I-06.2 · Restablecimiento selectivo

Contrato previo [restablecimiento](../api/restablecimiento-demo-i-06.md); [procedimiento y ensayo](restablecer-demo-i-06.md). Implementación verificada técnicamente el 26/09/2026. Aceptación manual pendiente.

Se agregó V15 sin modificar migraciones aplicadas: copia original de snapshots e invalidación de resultados recuperables. `reset-demo` exige modo demo, aplicación web desactivada, selección explícita y confirmación de huella de destino/estado. Preview de solo lectura; reset atómico bajo bloqueos, versiones crecientes y conservación de IDs. Conserva todas las dependencias/cuentas/datos ajenos; bloquea calendario/aula/ocupación incompatibles. No invoca Auth. Retira únicamente clases/patrones extra de reservas seleccionadas, registra sus IDs y preserva origen inmutable/auditoría. Operaciones invalidadas de creación/mutación/calendario responden conflicto; historial operativo muestra explicación legible.

- Pruebas iniciales: 7/7 PostgreSQL Testcontainers, incluyendo 326 reservas I03/I04/I05 y volumen completo, datos ajenos y QA 2029, huella vencida, conflicto externo, aula/calendario, origen, IDs faltantes, recuperación de operaciones y rollback por auditoría. Caso adicional de patrones extra agregado por revisión: repetición final 8/8 sin fallos.
- Ensayo real CLI de la imagen Docker: migración/cargas explícitas sobre red interna y PostgreSQL descartable, preview sin cambios, huella inválida, restauración y repetición; comparación del agregado completo I03 y estado funcional I04 (solo versión excluida de repetición). Sin contacto con Supabase/Auth ni reset remoto. Reporte versionado `docs/evidencias/i06-restablecimiento.json` y logs privados locales en `artifacts/qa/reset/`.
- UI de historial: Playwright con respuestas simuladas, captura inspeccionada y axe sin violaciones. Evidencia local `artifacts/qa/reset/history-ui.png`; se distingue de integración CLI/DB real.
- Revisión GPT-6 Luna high (especificación/estándares): corregidos IDs adicionales en auditoría, retiro de patrones extra y comparaciones completas del ensayo. Contenedores/red de ensayo etiquetados y retirados por IDs propios.
- Ajuste complementario del paquete: COPY explícitos y exclusiones por nivel impiden incorporar tests/targets al contexto de construcción; verificado `No sources to compile` en testCompile del build. Reescaneo de 34.794 archivos del JAR y 5.321 de capas sin valores privados locales inspeccionados. Imagen del ensayo final `sha256:7e6bd4c6374b2fdb5590a65f6e6dd5bf0596759ba2828c7f7f8119ceb5006092`. Lint y diff check sin errores; ambas revisiones cerradas sin hallazgos pendientes.

Incidencia de verificación: un lanzamiento de Maven adicional sobre el mismo `target` coincidió con una regresión y produjo 6 errores de carga de bean entre 173 casos. La repetición serializada pasó 173/173 sin errores. Después del último ajuste de patrones extra pasaron las ocho pruebas de reset. No ejecutar compilaciones Maven simultáneas en el mismo checkout.

## I-06.3 · Verificación final

Contrato previo [carga final](../api/carga-final-i-06.md), [reproducción de carga](carga-final-i-06.md) y [regresión del paquete](regresion-paquete-i-06.md). Verificación técnica completada el26/09/2026; aceptación manual pendiente.

Se preparó runner con 50 identidades JWT firmadas y perfiles reales locales, 30 aulas, 800 series/25.600 clases y 500 esporádicas, 280 altas previstas y diez series propias de modificación. Ciclos, pausas, calentamiento y medición íntegros del documento11. PostgreSQL/JWKS locales; la aplicación publica loopback mediante un bridge adicional con egreso permitido. No usa credenciales ni servicios Supabase. La medición local no elimina la limitación remota documentada en I05.

Incidencias del guion antes de resultado final: primer intento sin puerto publicado por red interna exclusiva, corregido con bridge de acceso propio; corrida preliminar interrumpida para completar evidencia de asignaciones/IDs/ciclos solicitada por revisión. Ninguna se contabiliza como cumplimiento. La corrida final parte de base nueva y ejecuta nuevamente todo el protocolo.

Regresión sobre la imagen final: Chromium/Firefox, roles/rutas/PDF de104filas, indicadores y teclado/reflow; entorno exacto con Auth Supabase real y PostgreSQL local; operaciones I04 en otro escenario descartable con guard de destino. No requiere modificar datos manuales del entorno compartido. Ejecutada después de terminar la ventana de carga, evitando interferencia de otras baterías; resultados detallados debajo.

Resultado de carga final: 5.963 solicitudes medidas, cero errores de todas las fases, pausa mínima5000,0026ms,120s de calentamiento después de activar la sesión50 y600s de medición. p95: disponibilidad14,23ms, listado diario13,43ms, curso94,01ms, alta100,19ms, modificación201,95ms. Auditor independiente recalcula percentiles y verifica sesiones/ciclos/asignaciones/IDs/versiones y ambas series por operador. Reporte, manifiesto, hashes y trazas sin credenciales versionados en `docs/evidencias/i06-carga*`; comando de auditoría en la guía. Revisión Luna high corrigió barreras de contenedores/imagen/red/loopback y exigencia independiente de umbrales, cobertura y series.

Regresión exacta del paquete:4/4 casos (Chromium/Firefox) con Auth real y PostgreSQL descartable; capturas de curvas, ponderación, historia, cobertura parcial, semana y Docente móvil. Inspección visual sin defectos detectados; no se cambiaron datos remotos. Unitarias frontend66/66, build y lint correctos.

Regresión final Java174/174, sin fallos/errores/omitidas; UI con red simulada110/110. Paquete compartido de solo lectura12/12 casos cubiertos en Chromium/Firefox; los cinco primeros casos Chromium se lanzaron antes de salud y fallaron por conexión, repetición con salud5/5. Ambos PDFs:9páginas/104filas, todas cotejadas por IDs y contenido con manifiesto; primera/última página inspeccionadas. Teclado y reflow683×384 verificados; zoom nativo queda para usuario. Capturas de referencia y PDF versionados en `docs/evidencias/i06-visual/`.

Operaciones I04: Chromium8/8. En el primer intento Firefox sobre la misma base,15/16 totales pasaron y una reprogramación esporádica chocó con el destino ya ocupado por Chromium; aplicación rechazó correctamente sin cambio. El guion ahora limita a un navegador por corrida y exige20reservas iniciales, recreando base entre motores. Revisión Luna high cerró esa corrección; Firefox repetido completo sobre base nueva:8/8 aprobados.

Cierre de I-06.3: [reporte final](../evidencias/i06-regresion.json). Comparación de inventario remoto antes/después:337reservas/5150clases/28aulas, calendarios/cursos y disponibilidad protegida idénticos semánticamente (solo orden de recursos normalizado). V15 aplicada normalmente al recrear Compose; ningún seed/reset remoto. Contenedores de ensayos retirados por sus IDs. Revisiones GPT-6 Luna high de especificación/estándares cerradas con correcciones incorporadas. Resta I-06.4 documental para entregar QA al usuario; no se aceptó ninguna entrega manualmente.
