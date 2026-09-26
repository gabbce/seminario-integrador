# Avance I-05

Estado: I-05 implementada y verificada funcionalmente. Aceptación manual I-04/I-05/I-06 pendiente. Referencia de latencia remota con excesos documentados; protocolo completo local I-06.3 aprobado, sin extrapolar al entorno remoto; ver [carga final](carga-final-i-06.md).

## I-05.1 · Consultas acotadas

Contrato previo: `docs/api/consultas.openapi.yaml`. Separar proyecciones públicas de las lecturas de detalle/operación; filtros y páginas en PostgreSQL con snapshot consistente. Conservar navegación y filtros en URL. La consulta de disponibilidad sigue siendo autoridad para reservar.

Base inicial: árbol limpio en `feat/integracion`; frontend 65 pruebas, build y lint aprobados. Pruebas Java en ejecución con Testcontainers PostgreSQL 17.6 aislado. Revisión preparatoria solicitada a gpt-6-luna high; revisión de implementación pendiente. Ninguna carga ni reset ejecutados.

Verificación I-05.1 (26/09/2026, antes del commit):
- Base Java completa aprobada; nueva `ConsultationTests`: 3 pruebas PostgreSQL (120 ocurrencias, páginas 20/50/100, estados, curso/año, tipo histórico, destino reprogramado, privacidad y roles).
- Frontend: 66 pruebas unitarias, TypeScript, build y lint. Regresión UI completa: 101 pruebas aprobadas (Chromium, API simulada); nuevas pruebas cubren retorno/página, fallo/reintento y respuestas tardías.
- Integrada remota de solo lectura: `consultations-real.spec.ts`, Bedel y Docente, 2/2 aprobadas con Auth y PostgreSQL Supabase existentes. Fecha 14/07/2027, aula 103, Historia; semana, detalle, retorno, recarga y JSON sin contactos. No carga/reset ni modificación de datos compartidos. Migraciones V1–V14 validadas, ninguna nueva.
- Inspección visual: listado 1366×768 y 390×844, agenda semanal real 1366×768. Capturas locales `/tmp/i05-listado-desktop.png`, `/tmp/i05-listado-mobile.png`, `/tmp/i05-agenda-real-bedel.png`, `/tmp/i05-listado-real-mobile.png`; regenerables con los tests, no necesarias para ejecutar el QA.
- Revisiones GPT-6 Luna high: eje especificación detectó tipo actual en encabezado/color histórico y falta de opción sin historia; corregidos y agregada prueba navegador. Eje estándares detectó duplicación de cálculo de franjas; extraída a `roomDaySlots`. Revisión posterior y prueba adicional en curso.
- El GET global legado permanece para compatibilidad de integraciones/tests de inventario; la app operativa ya no lo solicita. Detalle y recuperación I-04 conservan contratos. Los tests de inventario remoto lo solicitan explícitamente, sin condicionar el arranque de la app.
- Impresión aún corresponde al siguiente corte I-05.2. Aceptación manual pendiente.

Cierre técnico I-05.1: revisores confirmaron resueltos los hallazgos; import de helper verificado por TypeScript. Pruebas nuevas de navegador 3/3 (incluye tipo histórico y semana→día), lint y 66 unitarias aprobados. Java: 147 pruebas totales incluyendo las tres nuevas, sin fallos. Revisión visual de agenda histórica aprobada técnicamente. Commit: `feat: consultar agenda y listados persistentes con filtros y paginación` (consultar historial Git). Continúa I-05.2; aceptación manual pendiente.

## I-05.2 · Impresión completa

Contrato previo ampliado en `consultas.openapi.yaml`: GET `/api/consultas/impresion-diaria`, una respuesta sin paginación bajo REPEATABLE READ. Comparte filtros/orden/proyección con listado. No se genera PDF en Java.

`PrintDaily` obtiene el conjunto completo, verifica total/identidades, invalida cambios de filtros y errores; solo después abre `window.print`. La impresión directa sin preparación muestra un aviso, no la página parcial. Encabezado identifica fecha, filtros y total; filas completas con encabezado de tabla repetido y sin controles/contactos.

Verificación:
- `ConsultationTests`: 4/4, PostgreSQL aislado. 120 ocurrencias, >100, igualdad exacta con orden del listado, canceladas/vacío, los tres roles sin contactos.
- `printing.spec.ts`: 3/3; Chromium y Firefox 155.0, página visible 2 de tamaño20 y 121 identidades impresas; filtros, error/reintento, vacío, conjunto incompleto y respuesta tardía invalidada. TypeScript, build y lint aprobados.
- PDF navegador Chromium y Firefox: 10 páginas cada uno, 121 filas únicas/esperadas, sin controles. Inspección visual de primera página sin cortes ilegibles. Verificación reproducible: `python tools/qa/verify-print.py /tmp/i052-complete.pdf /tmp/i052-firefox-complete.pdf` con `pypdf`. PDFs/capturas son salidas regenerables del test, no insumos del QA.
- Firefox usa un perfil de prueba propio, impresión silenciosa a PDF y espera el marcador EOF antes de cerrar. Referencia técnica de preferencias: [Mozilla, configuración de impresión](https://bugzilla.mozilla.org/show_bug.cgi?id=2023645#c0); no se activan flags experimentales. No cambia configuración del navegador del usuario.
- Revisión gpt-6-luna high en ejes especificación y estándares: sin hallazgos pendientes. Lectura integrada de impresión en curso. Aceptación manual pendiente.

Cierre I-05.2: lectura integrada Docente con Supabase e impresión de filtro 14/07/2027/aula103 aprobada (1/1; una fila). PDF de ambos navegadores revalidado con `verify-print.py`; vista móvil real inspeccionada con botón de impresión y resultado cargado. Commit `feat: imprimir el listado diario completo desde una lectura consistente`. Aceptación manual pendiente.

## I-05.3 · Resumen histórico

Contrato previo `indicadores.openapi.yaml`: rango institucional inclusivo; resumen, demanda por tipo y desglose por aula; solo Admin/Bedel. Cálculo autoritativo Java sobre snapshot PostgreSQL, lecturas acotadas al rango, estado por detalle y fecha/aula efectiva. Módulos completos con cobertura habilitada continua, tipo al inicio, sin redondear eventos ni usar estado actual para historia. Cobertura desconocida, cero denominador y ninguna fecha elegible tienen estados distintos. Total es cociente de sumas. Indicadores operativos ya no importan `createScenario`; la concurrencia/gráficos se conectan en I-05.4.

Verificación:
- `IndicatorTests`: 6/6 sobre PostgreSQL aislado. Fixtures independientes: A=2/8h→25%; A+B=2/10h→20%; dos clases simultáneas→4h; cambio habilitación10:10/tipo11:10/inhabilitación12:10→1,5h completas, atribuidas1h General+0,5h Multimedios; hueco10:10–10:20 invalida todo módulo y marca cobertura desconocida. Cancelación y destino de reprogramación, baja actual, año cerrado sin alterar historia; feriado, cobertura parcial, cero disponible y permiso Docente.
- Navegador: 3 casos de indicadores en 1366×768/390×844, error/reintento y respuesta tardía; consulta+indicadores tras extraer hook compartido: 6/6. TypeScript/build/lint aprobados.
- Integración real Supabase solo lectura: 14/07/2027/aula103 (receso), 1h reservada/16h habilitadas=6,25%, interfaz6,3%; Docente403. 1/1 aprobado, sin modificar filas. Captura `/tmp/i053-summary-real.png`, reproducible mediante `indicators-real.spec.ts`.
- Inspección visual resumen/filtros/tablas en escritorio/móvil y resumen real. Revisor estándares Luna high pidió desacoplar el hook compartido de consultas de reservas: movido a `use-api-query.ts` y verificado; eje especificación en revisión. Sin aceptación manual.

Cierre técnico I-05.3: eje especificación Luna high sin hallazgos; eje estándares corregido. Commit `feat: calcular resumen e indicadores de ocupación históricos`. Continúa I-05.4; aceptación manual pendiente.

## I-05.4 · Curvas y semana típica

Contrato previo: ampliación de `indicadores.openapi.yaml` con `/api/indicadores/serie`. Resumen y serie solicitada comparten fuente y snapshot. Franjas de media hora, picos independientes con empates, alumnos-hora y medias semanales con fechas elegibles (incluidos ceros); pico de curva media separado del máximo de fecha. React representa valores autoritativos y conserva tabla accesible, teclado y desplazamiento móvil.

Verificación: `IndicatorTests` 9/9 PostgreSQL aislado; 30/50/20 alumnos, 1/2/1 clases, 50 alumnos-hora; contigüidad sin simultaneidad; máximos independientes/empatados; cuatro lunes40/0/20/0→15 y quinto feriado fuera del denominador. Navegador4/4; build/lint aprobados. Integración real de solo lectura1/1: 14/07/2027 aula103,20 alumnos previstos07–08,1 clase,1h/16h; Docente403. Capturas regenerables mediante tests: `/tmp/i054-curves.png`, `/tmp/i054-week.png`, `/tmp/i054-week-mobile.png` y `/tmp/i053-summary-real.png`. Inspeccionadas escritorio/móvil y curva real. Dos revisores gpt-6-luna high, ejes especificación/estándares: sin hallazgos accionables. Ninguna modificación remota. Cierre técnico; aceptación manual pendiente.

## I-05.5 · Volumen aditivo

Contrato previo `carga-demo-i-05.md`; dataset generado determinista `volumen-i05-v1.json`,306 reservas/4613 clases,4612 vigentes/1 cancelada. No crea catálogos ni altera historia. Motor de operaciones I04 compartido preservando su definición/auditoría; modo estricto impide completar nuevas claves si hay discrepancias previas. Reloj histórico solo en el comando explícito.

- Generación repetida produce SHA256 `55dcc85e67d4aa93c09729e9e004ba8199a05d7e8ebf5de958edd13116eb5d4d`.
- Pruebas aisladas `DemoVolumeTests,DemoOperationTests`:9/9. Carga completa, conjunto I03/I04 intacto, historia intacta, ranking/laboratorios contiguos preservados, impresión104=52h/780alumnos-hora/pico8clases, página20 coherente; cambio manual no restaurado al repetir, discrepancia bloquea pendientes, conflicto tardío revierte las305 altas anteriores; regresión I04 seis casos. Se corrigió orden del guard de entorno detectado al extraer motor; mismas pruebas repetidas verdes.
- Inventario remoto previo de solo lectura:31reservas/537detalles(517vigentes/20cancelados); las4613 propuestas no se superponen. Comparación incluye reservas completas y disponibilidades de QA. Diferencia previa documentada:reserva14 ocupa Lab2 martes16–18; se preserva. No se fuerza disponibilidad ficticia.
- Revisión Luna high: estándares sin hallazgos; especificación pidió aserciones numéricas en el verificador independiente. Agregadas y revisor confirmó cierre. Carga remota aditiva realizada después de pruebas/inventario; comparación posterior, repetición e inspección visual completadas según el cierre. No se ejecutó reset.
- Iteración de rendimiento del comando: resolución de registros/años/aulas/cursos agrupada o por valor distinto, sin cambiar `prepare`/`confirm`, bloqueos ni servicios operativos. Regresión9/9 repetida y revisión Luna high sin hallazgos. La primera carga remota conservó la versión inicial cargada en su JVM; la repetición usó la optimización.
- Durante la carga remota, un segundo inventario desde HTTP conservó exactamente las31reservas/537clases y todas las referencias/consultas protegidas: no se observaron altas parciales antes del commit. La demora de carga remota no se interpreta como medición RNF ni aprobación de rendimiento.
- Testigo adicional de preservación: una prueba aislada de volumen repetida con igualdad de tablas usuario/administrador, año/cuatrimestre/feriados, materia/curso e historia de aulas:1/1 aprobada. Inventario remoto ampliado a calendarios2026–2029 y cursos; comprobadas iguales las claves del inventario previo antes de ampliarlo.
- El diagnóstico de la demora remota detectó transferencia de todas las ocupaciones del período en cada preparación. La consulta compartida ahora limita SQL a aulas compatibles y ventanas efectivas solicitadas, conservando intersección semiabierta, ranking, exclusiones/calendario y privacidad. Regresión completa Java160/160 y dos pruebas nuevas de ventanas/contigüidad/fechas efectivas/múltiples condiciones sin duplicados aprobadas. Ambos revisores Luna high sin hallazgos. Esta optimización no cambia contratos ni la transacción de carga ya iniciada.
- Impresión: corregida advertencia de React sobre escritura de ref durante render; criterio activo actualizado en layout effect. Lint limpio y regresión de impresión Chromium/Firefox y respuestas tardías3/3 aprobada. El verificador remoto contrasta también atributos de reserva, duración y fecha original reprogramada. Revisor detectó ventana de desmontaje antes del cleanup pasivo: cambiado también a layout effect, revisión de cierre sin hallazgos y las3 pruebas repetidas aprobadas. Revisión estática final del corte sin hallazgos; verificaciones remotas completadas a continuación.
- Carga remota explícita confirmada26/09/2026 a08:17UTC:306reservas y4613clases creadas; proceso terminó0. Primera ejecución≈70min con versión inicial del motor; registrada como limitación, no como medición RNF. Reiniciado únicamente el backend de esta tarea para validar la versión optimizada; no carga al arrancar. Cotejo y repetición completados según resultados finales de este corte.
- Cotejo remoto posterior aprobado:337reservas/5150clases(5129vigentes/21canceladas); todas las31previas y referencias/consultas protegidas idénticas. Altas contrastadas una por una con definición; IDs semánticos versionados en `docs/evidencias/i05-datos.json`, sin contactos.
- Navegador real Supabase3/3: Firefox Docente, Chromium Bedel día/semana y Docente filtros/privacidad. PDFs9páginas cada uno:104filas completas e identidades exactas con manifiesto. Capturas y PDF inspeccionados visualmente; artefactos regenerables en `artifacts/qa/i05/`. Cifras52/320h,780alumnos-hora, picos125/8 y semana56/1600h,855alumnos-hora verificadas. Repetición completada según cierre del corte.
- Repetición remota finalizada0:0reservas/0clases creadas,306conservadas, sin discrepancias. Cotejo final completado: igualdad completa con el inventario posterior a carga. No reset; aceptación manual pendiente.

Cierre técnico I-05.5: inventario posterior y repetición completamente iguales. Build y66unitarias frontend aprobadas; lint limpio. Revisiones Luna high resueltas. Continúa I-05.6; QA/aceptación manual pendientes.

## I-05.6 · Regresión cruzada y QA exacto

Contrato previo `docs/api/qa-i-05.md`. Cruces de servicios reales aislados y entorno temporal con la misma interfaz/validación Auth; sin cambios en escenarios compartidos. Referencia de latencias separada del protocolo RNF completo de I-06.3. Aceptación manual pendiente.

- `ConsultationMutationTests`:2/2 PostgreSQL aislado. Alta20alumnos×1h por fecha; cabecera25; reasignación A→B; reprogramación27→28julio con1,5h/37,5alumnos-hora; cancelación elimina numerador/agenda pero figura cancelada. Extensión22mar agrega1h/30alumnos-hora sin ampliar32h disponibles; quitar feriado08mar agrega clase y32h elegibles. Listado/impresión iguales y proyección pública sin contactos.
- Entorno exacto temporal iniciado, detenido y recreado; usa las14migraciones y Auth/JWT Supabase reales con perfiles locales. Rechaza puertos ocupados, usa ID propio del contenedor para limpiar. Revisor pidió cerrar sesiones temporales y asegurar permisos de archivos existentes: corregido con logout local/chmod; ninguna sesión existente se cierra. Guía `qa-exacto-i-05.md` con valores/enlaces por caso.
- `indicators-exact.spec.ts`:2/2; todos los cálculos por API y vistas reales, navegación por teclado del mapa, Docente móvil y403; H dada de baja en2022 conserva cifras históricas2021. Se corrigió selector ambiguo del test (50 en tabla y resumen), sin defecto de producto. Repetido tras ajustes de aislamiento y baja histórica.
- Referencia remota descriptiva en `docs/evidencias/i05-lecturas.json`:1sesión,1calentamiento+5lecturas por operación, sin errores. p95 listado1612,87ms y disponibilidad2748,60ms superan el objetivo1500ms; no se acredita cumplimiento RNF remoto. No es el protocolo vigente de50sesiones, que se ejecutará sobre el paquete/entorno declarado en I-06.3. Impresión/agenda/indicadores registrados sin inventarles umbrales.
- Regresión completa:164pruebas Java sin fallos/errores/omisiones y109pruebas Playwright offline aprobadas. Lint limpio. Inspección visual de ponderación25%, curvas30/50/20, H histórico tras baja, cobertura parcial y mapa/listado móvil completada; las capturas se regeneran con el comando exacto. Permisos privados del entorno comprobados:directorio700 y configuración/logs600.
- Cierre de revisión: teardown exacto cierra solo su sesión Auth local;2/2 repetidas aprobadas. Reporte de referencia marca árbol con cambios y límite de trazabilidad inicial; futuras mediciones agregan dirty y hash del colector. Revisores Luna high sin hallazgos pendientes. Entorno exacto detenido por su señal de limpieza, manteniendo artefactos privados regenerables.

Cierre técnico funcional I-05.6 e I-05: seis cortes implementados, contratos/datasets/QA exacto y evidencias disponibles. Continúa I-06. La referencia remota supera1500ms en listado/disponibilidad; no se declara RNF remoto aprobado ni aceptación manual. I-06.3 ejecutará el protocolo completo y conservará esta limitación separada por entorno.
