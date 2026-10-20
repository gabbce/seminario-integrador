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
- [Decisiones acordadas](docs/especificacion/04-decisiones-acordadas.md).
- [Índice completo y fuentes originales](docs/README.md).
- [Vocabulario del dominio](CONTEXT.md).

Stack acordado: Java/Spring Boot, React/TypeScript/Vite, Tailwind/shadcn, Chart.js, Supabase PostgreSQL/Auth y Docker Compose para la app.

Prototipo preservado en `prototype/v1` (`cc5bdc7`). La integración en `main` incluye I-01 e I-02; cuentas, aulas, calendario y cursos persistentes. I-03 conecta preparación, confirmación y consulta mínima de reservas periódicas. I-04 conecta esporádicas, cancelación, edición, reprogramación e impacto de calendario; I-05 conecta consultas, impresión completa e indicadores históricos; I-06 entrega el paquete Compose y restablecimiento selectivo ensayado.

Las [credenciales de las cuentas de prueba](docs/credenciales-demo.md) sirven para la instancia compartida de integración.

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

La revisión del 19/10 corrigió búsquedas de calendario, alternativas de conflictos, paginación de reservas y carreras de recarga. Nueva validación: **211 pruebas backend, 72 unitarias frontend, 130 de navegador con red simulada y 10 del paquete contra Supabase real**, incluidos privacidad, volumen e impresión completa. Se redujeron los intercambios SQL y se repitieron las mediciones; los resultados, el entorno y los límites de acreditación se registran en el [informe de cumplimiento](docs/planificacion/cierre-cumplimiento-2026-10-19.md). Las [evidencias anteriores de I-06](docs/planificacion/regresion-paquete-i-06.md) se conservan como registro histórico.

Los datos manuales y QA2029 se preservaron. No se ejecutó ningún restablecimiento remoto; hacerlo requiere autorización sobre destino y alcance concretos.
