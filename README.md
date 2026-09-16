# Gestión y reservas de aulas

Aplicación para una institución educativa, destinada a una demostración académica con datos ficticios, ejecutable localmente o en la web con Supabase remoto.

El repositorio contiene la **especificación funcional y técnica v1.0**, final y aprobada por el usuario. El prototipo navegable P-01 a P-06 está implementado y verificado en React, con datos en memoria. La entrega I-01 conecta el ingreso y perfil con Supabase Auth/PostgreSQL y Java/Spring Boot.

- [Plan aprobado de integración I-01 a I-06](docs/planificacion/integracion.md).
- [Plan detallado de I-01: base e ingreso real](docs/planificacion/i-01-base-e-ingreso.md).
- [Plan detallado aprobado de I-02: administración y catálogos](docs/planificacion/i-02-administracion-y-catalogos.md).
- [Leer la especificación](docs/especificacion/00-especificacion.md).
- [Diseño B aprobado y referencias vigentes](docs/diseno/README.md).

- [Checklist de QA manual: pantallas, roles y estados](docs/diseno/qa-manual-prototipo.md).
- [Plan de entregas del prototipo navegable](docs/diseno/prototipo-navegable.md).
- [85 decisiones acordadas](docs/especificacion/04-decisiones-acordadas.md).
- [Índice completo y fuentes originales](docs/README.md).
- [Vocabulario del dominio](CONTEXT.md).

Stack acordado: Java/Spring Boot, React/TypeScript/Vite, Tailwind/shadcn, Chart.js, Supabase PostgreSQL/Auth y Docker Compose para la app.

Prototipo preservado en `prototype/v1` (`cc5bdc7`). La integración continúa en `feat/integracion`: I-01 implementada; módulos de negocio todavía simulados.

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

Abrir http://localhost:5173. Cuenta ficticia: `bedel@demo.local`; contraseña en `AULAS_DEMO_PASSWORD` de `backend/.env`. El ingreso requiere backend y Supabase; los datos de negocio aún se reinician al recargar.

- [Instrucciones, recorridos y límites del frontend](frontend/README.md).
- [Arranque y comprobación del backend](backend/README.md).
- [Validación completa, criterios y límites del prototipo](docs/diseno/validacion-prototipo.md).
