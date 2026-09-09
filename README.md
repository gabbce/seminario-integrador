# Gestión y reservas de aulas

Aplicación para una institución educativa, destinada a una demostración académica con datos ficticios, ejecutable localmente o en la web con Supabase remoto.

El repositorio contiene la **especificación funcional y técnica v1.0**, final y aprobada por el usuario. El prototipo navegable P-01 a P-06 está implementado y verificado en React, con datos en memoria y un esqueleto ejecutable Java/Spring Boot.

- [Leer la especificación](docs/especificacion/00-especificacion.md).
- [Diseño B aprobado y referencias vigentes](docs/diseno/README.md).
- [Plan de entregas del prototipo navegable](docs/diseno/prototipo-navegable.md).
- [85 decisiones acordadas](docs/especificacion/04-decisiones-acordadas.md).
- [Índice completo y fuentes originales](docs/README.md).
- [Vocabulario del dominio](CONTEXT.md).

Stack acordado: Java/Spring Boot, React/TypeScript/Vite, Tailwind/shadcn, Chart.js, Supabase PostgreSQL/Auth y Docker Compose para la app.

## Ejecutar el prototipo

En dos terminales, desde la raíz:

```bash
cd frontend
npm ci
npm run dev
```

```bash
cd backend
./mvnw spring-boot:run
```

Abrir http://localhost:5173. Cuenta ficticia: `bedel@demo.local` / `Aulas2026`. El frontend funciona sin el backend y reinicia los datos al recargar.

- [Instrucciones, recorridos y límites del frontend](frontend/README.md).
- [Arranque y comprobación del backend](backend/README.md).
- [Validación completa, criterios y límites del prototipo](docs/diseno/validacion-prototipo.md).
