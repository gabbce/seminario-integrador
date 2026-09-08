# Primera entrega — base ejecutable y primer recorrido

Estado: primer subcorte implementado, revisable; el prototipo completo sigue en desarrollo. Backend confirmado por el usuario: Java/Spring Boot.

## Incluido

- `frontend/`: React/TypeScript/Vite, Tailwind y botón shadcn/Base UI; páginas separadas y estado de demostración compartido.
- `backend/`: Java 21/Spring Boot 4.1.1, Maven Wrapper, arranque y `/api/health`.
- Diseño B: navegación superior, paleta institucional, títulos serif, formularios y adaptación móvil.
- Ingreso ficticio de Admin/Bedel/Docente y cierre de sesión.
- Agenda diaria con fecha y filtros; consulta básica de reservas, detalle y aulas.
- Reserva periódica del segundo cuatrimestre 2026: datos, horarios por día semanal, aulas disponibles para todo el patrón, revisión y confirmación en memoria.
- 26 fechas en el ejemplo aprobado: 12 lunes y 14 miércoles; feriados omitidos. Revalidación de capacidad, horarios y solapamientos antes de agregar el conjunto.

Este corte cubre parte de P-01/P-02 y la consulta mínima de P-03. No declara cerrados esos paquetes. La autenticación real y los contratos de backend todavía no están implementados. Las reglas simuladas permiten revisar UX, no sustituyen las validaciones futuras del servidor.

## Siguiente subcorte

Completar P-02: catálogo de cursos, equipamiento, períodos anual/cuatrimestral, exclusiones y fechas omitidas, alternativas informativas con conflictos y contactos, reserva esporádica y consulta independiente por rol. Después: P-03 operación (semana, edición, cancelación, impresión), P-04 administración, P-05 indicadores y P-06 revisión del conjunto.

## Validación ejecutada

- `npm run build`: compilación TypeScript y bundle de producción correctos.
- `npm run lint`: sin hallazgos.
- `npm test`: cuatro pruebas de recurrencia, feriados, intervalos contiguos, bloqueo del patrón y revalidación.
- `npm run test:e2e`: tres pruebas Chromium; creación completa, vuelta sin perder aula, lectura en agenda/detalle, acceso de consulta docente y ausencia de desbordamiento a 390/768 px.
- `./mvnw test`: prueba de contexto correcta. HTTP real `/api/health`: `status: UP`.
- Capturas de escritorio a 1536×1024 y móvil a 390 px comparadas con los PNG aprobados usando inspección visual. Playwright se utilizó al no estar disponible un conector de automatización de navegador.

Las capturas se generan en `frontend/evidence/`, fuera de Git, y se pueden reproducir con las pruebas E2E. No se ha validado todavía todo el conjunto a zoom 200 %, impresión, todos los estados de error ni funcionalidades de entregas futuras.

## Comparación visual con diseño B

| Aspecto | Resultado y diferencias |
|---|---|
| Paleta | Fondo #F5F1E9, texto #24352B y principal #194D3A. Aulas por tipo según guía consolidada, que prevalece sobre colores inconsistentes de la imagen. |
| Tipografía | Georgia para marca/títulos, Arial para cuerpo. Controles nativos pueden variar según navegador y configuración regional. |
| Navegación e iconos | Barra superior y Lucide; menú desplegable en móvil. Rol ficticio y salida directa para revisar cuentas. |
| Agenda | Grilla con desplazamiento 07–23 y alturas proporcionales corregidas. Seis aulas del escenario en lugar de cuatro; Matemática se agrega al registrar. Lista cronológica móvil. |
| Formulario | Datos y horarios en una pantalla, tres pasos y resumen lateral/apilado. Solo segundo cuatrimestre en este subcorte; faltan controles de alcance completo enumerados arriba. |
| Espaciado | Paneles de 12 px, controles de 8 px, márgenes 32/16 px. Formulario con desplazamiento vertical; no se comprime para encajar artificialmente. |
| Legibilidad | Corregido recorte de texto en bloques de 90 minutos. Foco visible y etiquetas de campos; quedan pruebas integrales de accesibilidad en P-06. |

## Diferencias de texto visible respecto de los mockups

- Marca «Aulas / Gestión de espacios» y navegación principal conservadas.
- «Gabriela · Bedel» pasa a «Demo · Bedel» para señalar identidad ficticia.
- Agenda agrega «Agenda diaria» y selector de fecha; alternancia semana pendiente. «Nueva reserva» se conserva.
- «Nueva reserva» pasa a «Nueva reserva periódica» mientras solo esta modalidad esté implementada.
- Pasos: «Datos y horarios», «Elegir aulas», «Revisar y confirmar»; mantienen la secuencia aprobada.
- «Consultar aulas» pasa a «Buscar aulas»; «Confirmar reserva» conserva la acción de confirmación.
- Resumen muestra «26 clases previstas» y los feriados. Aún no ofrece exclusiones ni otros períodos.

Estas diferencias describen el corte actual; no modifican ni eliminan requisitos aprobados. No es una declaración de fidelidad completa de todas las pantallas.

## Ejecución

Consultar [frontend](../../frontend/README.md) y [backend](../../backend/README.md). Los datos se reinician al recargar. No se requieren cuentas externas ni variables con secretos.
