# Avance I-05

Estado: en implementación. Aceptación manual I-04/I-05/I-06 pendiente.

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
