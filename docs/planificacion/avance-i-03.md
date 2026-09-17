# Avance de I-03

Plan: [reserva periódica persistente](i-03-reserva-periodica.md), aprobado el 17/09/2026. Implementación completa autorizada por el usuario, con revisión Terra high, pruebas, comprobación visual y commits por corte. La aceptación manual corresponde al usuario después de la entrega.

| Corte | Estado |
|---|---|
| I-03.1 · Preparación y disponibilidad | Implementado y verificado |
| I-03.2 · Confirmación y consulta | En ejecución |
| I-03.3 · Alternativas | Pendiente |
| I-03.4 · Datos y QA | Pendiente |

## Evidencia

Se registrarán aquí resultados realmente ejecutados, revisiones y limitaciones por corte. Las pruebas del prototipo no acreditan persistencia. Browser plugin no disponible en esta sesión; se utiliza Playwright del repositorio para comprobar interacción, escritorio/móvil y capturas.

Base antes de implementar: 39 pruebas backend con PostgreSQL desechable, 62 unitarias frontend, 18 recorridos Playwright offline, build y lint aprobados.

También se verificaron los cuatro ingresos reales con Supabase (Admin, Bedel, Docente y cuenta inhabilitada). Se conservan las cuentas y credenciales existentes.

## I-03.1

Preparación periódica calculada por Java: períodos, fechas efectivas y omitidas, requisitos y disponibilidad completa por patrón. React presenta esa respuesta, conserva el diseño B, ofrece tres candidatas y acceso al resto e invalida selecciones al cambiar criterios. La consulta no ocupa aulas ni guarda borradores; confirmación corresponde al corte siguiente.

V8 crea el modelo de reservas con restricciones diferidas de modalidad/relaciones y exclusión de intervalos en PostgreSQL usando rangos nativos, sin extensiones ni permisos nuevos. Aplicada correctamente en Supabase después de ambas revisiones Terra high (especificación y estándares) sin bloqueantes.

Verificación: 48 pruebas backend con PostgreSQL, 62 unitarias frontend, build/lint y 23 recorridos offline aprobados. Tras aislar la nueva API en el fixture general, se repitieron los siete recorridos afectados: aprobados. Cinco casos nuevos comprueban selección/revisión, exclusión total y corrección, invalidación de selección, fallos/reintento y consulta Docente; axe, ausencia de errores de página y overflow verificados. Capturas de selección y revisión inspeccionadas en 390/1440 px, fuera de Git (`/tmp/i031-*.png`).

Recorrido real con Supabase aprobado: Bedel, primer cuatrimestre 2027, selección por patrón y resumen con cantidad de fechas servida por Java. No guarda reservas. Captura real de revisión inspeccionada. Migración v8 y backend local activos para continuar I-03.2.
