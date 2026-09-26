# Gestión y reservas de aulas

**Para incorporarse al equipo:** [guía visual de onboarding y PDF](docs/onboarding/README.md).

Aplicación para una institución educativa, destinada a una demostración académica con datos ficticios, ejecutable localmente o en la web con Supabase remoto.

El repositorio contiene la **especificación funcional y técnica v1.0**, final y aprobada por el usuario. El prototipo navegable P-01 a P-06 está implementado y verificado en React, con datos en memoria. La integración conecta Supabase Auth/PostgreSQL y Java/Spring Boot con cuentas, catálogos y reservas periódicas persistentes.

- [Plan aprobado de integración I-01 a I-06](docs/planificacion/integracion.md).
- [Plan detallado de I-01: base e ingreso real](docs/planificacion/i-01-base-e-ingreso.md).
- [Plan detallado aprobado de I-02: administración y catálogos](docs/planificacion/i-02-administracion-y-catalogos.md).
- [Plan detallado de I-03: reserva periódica](docs/planificacion/i-03-reserva-periodica.md).
- [Avance y evidencia de I-03](docs/planificacion/avance-i-03.md).
- [QA manual de I-03](docs/planificacion/qa-manual-i-03.md).
- [Leer la especificación](docs/especificacion/00-especificacion.md).
- [Diseño B aprobado y referencias vigentes](docs/diseno/README.md).

- [Checklist de QA manual: pantallas, roles y estados](docs/diseno/qa-manual-prototipo.md).
- [Plan de entregas del prototipo navegable](docs/diseno/prototipo-navegable.md).
- [85 decisiones acordadas](docs/especificacion/04-decisiones-acordadas.md).
- [Índice completo y fuentes originales](docs/README.md).
- [Vocabulario del dominio](CONTEXT.md).

Stack acordado: Java/Spring Boot, React/TypeScript/Vite, Tailwind/shadcn, Chart.js, Supabase PostgreSQL/Auth y Docker Compose para la app.

Prototipo preservado en `prototype/v1` (`cc5bdc7`). La integración continúa en `feat/integracion`: I-01 e I-02 implementadas; cuentas, aulas, calendario y cursos persistentes. I-03 conecta preparación, confirmación y consulta mínima de reservas periódicas. I-04 conecta esporádicas, cancelación, edición, reprogramación e impacto de calendario; I-05 conecta consultas, impresión completa e indicadores históricos; I-06 entrega el paquete Compose y restablecimiento selectivo ensayado.

## Ejecutar la demo

Preparar los archivos privados según [instrucciones de Compose](docs/planificacion/ejecutar-demo-i-06.md). Desde la raíz:

```sh
export DEMO_PORT=8082
docker compose --env-file frontend/.env.local build
docker compose --env-file frontend/.env.local up -d
docker compose --env-file frontend/.env.local ps
```

Esperar estado saludable y abrir [demo local](http://127.0.0.1:8082). React y API comparten origen; PostgreSQL/Auth permanecen en Supabase y requieren internet. Usar cuentas existentes y credenciales locales privadas. El arranque no carga ni restablece datos.

- [QA final conjunto I04/I05/I06](docs/planificacion/qa-final-i-04-i-05-i-06.md).
- [Manifiesto de datos, comandos y esperados](docs/planificacion/manifiesto-qa-final.md).
- [Guion de presentación](docs/planificacion/guion-demo-final.md).
- [Restablecimiento selectivo y ensayo aislado](docs/planificacion/restablecer-demo-i-06.md).
- Desarrollo Java+Vite: [frontend](frontend/README.md) y [backend](backend/README.md).

## Estado

I04, I05 e I06 están **implementadas y verificadas técnicamente, listas para QA manual**. La aceptación de cada una sigue pendiente del usuario. Ver avances [I04](docs/planificacion/avance-i-04.md), [I05](docs/planificacion/avance-i-05.md) e [I06](docs/planificacion/avance-i-06.md).

Validación final:174pruebas backend,66unitarias frontend,110UI con red simulada y32casos integrados del paquete en Chromium/Firefox; PDFs completos de104filas. Carga local:50sesiones,5963solicitudes medidas,0errores y p95 dentro de objetivos. La muestra de lecturas contra Supabase remoto excedió objetivos: el resultado local no acredita rendimiento remoto. [Evidencias y reproducción](docs/planificacion/regresion-paquete-i-06.md).

Los datos manuales y QA2029 se preservaron. No se ejecutó ningún restablecimiento remoto; hacerlo requiere autorización sobre destino y alcance concretos.
