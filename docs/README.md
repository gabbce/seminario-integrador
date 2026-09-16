# Documentación del sistema de gestión y reservas de aulas

**Versión 1.0 final, aprobada por el usuario.** Las 85 decisiones de la entrevista y revisión están resueltas. El prototipo P-01 a P-06 está implementado y verificado; I-01 incorpora acceso real y perfiles persistentes; ver [avance](planificacion/avance-i-01.md).

Comenzar por la [especificación de la aplicación](especificacion/00-especificacion.md), que resume el alcance, las reglas y las exclusiones.

El [diseño B — PATIO](diseno/README.md), sus recorridos y [guía visual](diseno/guia-visual-b.md) están aprobados. El [prototipo navegable](diseno/validacion-prototipo.md) conserva esos recorridos con datos simulados. El siguiente trabajo sigue el [plan aprobado de integración I-01 a I-06](planificacion/integracion.md).

[I-02](planificacion/i-02-administracion-y-catalogos.md) está implementada: administración y catálogos persistentes, con datos ficticios para 2026/2027. Ver [avance](planificacion/avance-i-02.md), [carga de datos](planificacion/datos-demo-i-02.md) y [QA manual](planificacion/qa-manual-i-02.md). La siguiente entrega a detallar es I-03.

## Documentos de detalle

- [Alcance y funcionamiento](especificacion/01-alcance-y-funcionamiento.md).
- [Catálogo de requisitos y casos de uso](especificacion/02-requisitos-y-casos-de-uso.md).
- [Modelo del dominio y reglas](especificacion/03-dominio-y-reglas.md).
- [Registro de decisiones acordadas](especificacion/04-decisiones-acordadas.md).
- [Calidad y validación](especificacion/05-calidad-y-validacion.md).
- [Calendario y datos de referencia](especificacion/06-calendario-y-datos-de-referencia.md).
- [Ciclo de reservas](especificacion/07-ciclo-de-reservas.md).
- [Consultas y comunicaciones](especificacion/08-consultas-y-comunicaciones.md).
- [Indicadores y horas pico](especificacion/09-indicadores-y-horas-pico.md).
- [Cuentas y acceso](especificacion/10-cuentas-y-acceso.md).
- [Contexto de demostración y validación](especificacion/11-contexto-de-demo-y-validacion.md).
- [Arquitectura y stack](especificacion/12-arquitectura-y-stack.md).
- [Modelo consolidado de datos y reglas](especificacion/13-modelo-consolidado.md).
- [Pantallas y navegación](especificacion/14-pantallas-y-navegacion.md).
- [Operaciones y contratos de la aplicación](especificacion/15-operaciones-y-contratos.md).
- [Historias de usuario](especificacion/16-historias-de-usuario.md).
- [Operación y verificación de la demo](especificacion/17-operacion-local-y-verificacion.md).
- [Casos de uso vigentes y trazabilidad](especificacion/18-casos-de-uso-vigentes.md).

- [Vocabulario del dominio](../CONTEXT.md).
- [ADR del stack aprobado](adr/0001-stack-y-organizacion.md).

## Fuentes preservadas

- [Presentación de la idea, en Markdown](fuentes/01-presentacion.md), presentada el 25/08/2025.
- [Requerimientos y 29 fichas de casos de uso, en Markdown](fuentes/02-requerimientos.md), presentados el 19/12/2025.
- [Modelos y justificaciones, en Markdown](fuentes/03-modelos.md), presentados el 19/12/2025.
- [Diagramas y sus fuentes textuales](fuentes/04-diagramas.md).
- Los archivos originales permanecen en `definicion-alto-nivel/`. Las imágenes embebidas se conservan en `fuentes/recursos/`.

## Autoridad y mantenimiento

Las fuentes preservan literalmente la documentación histórica, con 29 RF, 5 RNF y 29 CU. Las decisiones DA explicitan los ajustes acordados; no se corrigen silenciosamente los originales ni sus diagramas.

La síntesis 00 orienta la lectura. Los capítulos 01–11 desarrollan las reglas por tema; 12–18 concretan arquitectura, modelo vigente, interfaz, contratos, historias, operación y casos de uso actualizados. El registro 04 reúne las 85 decisiones acordadas (DA); no quedan preguntas funcionales abiertas.

Ante diferencias con la versión histórica, aplicar el ajuste DA documentado y el modelo/caso vigente. Las decisiones técnicas derivadas se identifican como tales; no son requisitos adicionales de negocio. Cambios futuros de alcance deben quedar registrados y actualizar los documentos afectados.

Esta entrega constituye el estado final de la especificación v1.0. La validación del prototipo está documentada por separado; las pruebas del sistema persistente y su integración son trabajo de la siguiente etapa.
