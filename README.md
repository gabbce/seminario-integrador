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

Prototipo preservado en `prototype/v1` (`cc5bdc7`). La integración continúa en `feat/integracion`: I-01 e I-02 implementadas; cuentas, aulas, calendario y cursos persistentes. I-03 conecta preparación, confirmación y consulta mínima de reservas periódicas. I-04 conecta esporádicas, cancelación, edición, reprogramación e impacto de calendario; los indicadores aún usan el conjunto del prototipo hasta I-05.

## Ejecutar la integración

Configurar los archivos locales de variables según los README de frontend/backend. En este entorno ya están preparados. En dos terminales, desde la raíz:

```bash
cd frontend
npm ci
npm run dev
```

```bash
cd backend
./mvnw spring-boot:run
```

Abrir http://localhost:5173. Cuenta ficticia: `bedel@demo.local`; contraseña en `AULAS_DEMO_PASSWORD` de `backend/.env`. El ingreso requiere backend y Supabase. Los catálogos y las reservas confirmadas se mantienen al recargar. PostgreSQL y Auth ya están alojados en Supabase; no se inicia una base local.

- [Instrucciones, recorridos y límites del frontend](frontend/README.md).
- [Arranque y comprobación del backend](backend/README.md).
- [Validación completa, criterios y límites del prototipo](docs/diseno/validacion-prototipo.md).

- [Carga reproducible de catálogos ficticios](docs/planificacion/datos-demo-i-02.md).
- [QA manual de I-02](docs/planificacion/qa-manual-i-02.md).

- [Carga reproducible de reservas 2026/2027](docs/planificacion/datos-demo-i-03.md).

## Estado y próximas entregas

I-04 está **implementada y verificada, pendiente de QA y aceptación del usuario**. Ver [avance](docs/planificacion/avance-i-04.md) y [QA I-04](docs/planificacion/qa-manual-i-04.md).

Los planes detallados de [I-05 · Consultas e indicadores](docs/planificacion/i-05-consultas-e-indicadores.md) e [I-06 · Demo y validación final](docs/planificacion/i-06-demo-y-validacion-final.md) fueron aprobados por bloques el 26/09/2026; implementación todavía no iniciada. El [QA manual final conjunto I-04/I-05/I-06](docs/planificacion/qa-final-i-04-i-05-i-06.md) está planificado, no ejecutado, y conserva aceptación separada por entrega. [Registro de acuerdos](docs/planificacion/preparacion-i-05-i-06.md).
