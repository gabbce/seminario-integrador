# Frontend Aulas — integración

React 19, TypeScript, Vite 8, Tailwind 4 y shadcn/Base UI. Node 24 y npm 11; dependencias en package-lock.json.

## Ejecutar

Preparar `.env.local` a partir de `.env.example`: URL Supabase y clave pública. Nunca incluir la clave administrativa en frontend. En este entorno el archivo ya está configurado. Iniciar Java siguiendo [backend](../backend/README.md) y luego:

```bash
npm ci
npm run dev
```

Abrir http://localhost:5173. Cuentas ficticias: admin@demo.local, bedel@demo.local y docente@demo.local; la contraseña preparada está en AULAS_DEMO_PASSWORD de backend/.env. La cuenta inhabilitado@demo.local debe ser rechazada. La antigua contraseña del prototipo no aplica.

El proxy /api apunta a Java en 8080; AULAS_API_TARGET permite cambiarlo en .env.local. El SDK conserva y renueva la sesión de Supabase; cada recuperación consulta /api/me antes de mostrar la app.

## Alcance actual

Login, sesión, perfil y permisos usan Supabase y Java reales. La gestión de cuentas (alta, perfil, rol, estado, email y contraseña) también está conectada. Aulas, cursos, calendario, preparación y confirmación periódica, agenda/listado mínimos y detalle usan PostgreSQL a través de Java. Los datos ficticios de esos módulos persisten al recargar. Edición, cancelación y alta esporádica corresponden a I-04. Los indicadores aún usan el conjunto separado del prototipo hasta I-05. La identidad de acceso no se puede cambiar mediante controles de demostración.

El prototipo completo, con escenarios y controles de fallos, permanece en prototype/v1. Los documentos de diseño y su QA describen esa referencia. No constituyen evidencia de integración persistente.

## Comprobaciones

```bash
npm run build
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

Pruebas unitarias y suite de sesión con proveedor simulado, sin conexión a Supabase. Playwright usa Vite en 5174 con configuración pública ficticia; cubre roles, recarga, cierre, Atrás, errores, renovación acotada, teclado, accesibilidad y anchos 390/768/1440. Capturas en evidence/, ignoradas por Git.

Comprobación adicional explícita con Supabase real, backend encendido, las cuatro cuentas preparadas y la carga de catálogos de I-02 ejecutada:

```bash
npm run test:e2e:real
```

Usa Vite en 5175 y lee la contraseña desde backend/.env o AULAS_DEMO_PASSWORD. No habilita trazas ni video. Verifica ingreso, perfiles, roles, operaciones Auth, aulas, calendario, referencias, reservas y dataset. Crea registros ficticios QA (año 2028, cursos, cuentas y aulas); las cuentas creadas se deshabilitan y las aulas se dan de baja. La prueba de confirmación periódica también crea una reserva ficticia que se conserva para QA. No borra registros previos. Nunca imprimir tokens ni contraseñas en aserciones.

Las 44 pruebas históricas de navegador están en e2e/prototype/, excluidas de esta suite. Se ejecutan en la rama prototype/v1; se adaptarán por módulo durante I-02 a I-05.

## Organización

- src/auth-client.ts y src/use-session.ts: cliente y ciclo de sesión.
- src/App.tsx: acceso y carga de la aplicación.
- src/OperationalApp.tsx: navegación, referencias y reservas desde Java; indicadores todavía con el conjunto del prototipo.
- src/pages/, src/components/ y src/App.css: recorridos y diseño B.
- [Avance I-01](../docs/planificacion/avance-i-01.md) y [QA de ingreso real](../docs/planificacion/qa-i-01.md).

## Administración persistente (I-02)

Cuentas, Aulas y Calendario guardan por API Java. Nueva reserva consulta y crea cursos persistentes y consulta docentes fijos de Java; crear curso no confirma una reserva. La lista de cuentas Auth no es el catálogo académico. [QA integrado](../docs/planificacion/qa-manual-i-02.md) y [datos ficticios](../docs/planificacion/datos-demo-i-02.md).

## Reservas periódicas (I-03)

[Plan](../docs/planificacion/i-03-reserva-periodica.md), [evidencia](../docs/planificacion/avance-i-03.md) y [QA manual](../docs/planificacion/qa-manual-i-03.md). La fecha operativa usa el reloj institucional de Córdoba. Confirmar requiere disponibilidad actual para todas las fechas del patrón; una respuesta incierta conserva la identidad de la operación para comprobarla o reintentar sin duplicar.
