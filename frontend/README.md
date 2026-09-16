# Frontend Aulas — integración I-01

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

Login, sesión, perfil y permisos usan Supabase y Java reales. Reservas, aulas, cursos, calendario, indicadores y administración de cuentas siguen con datos ficticios en memoria hasta sus entregas. Sus cambios se reinician al recargar; editar una cuenta en esa pantalla aún no modifica Auth. La identidad de acceso no se puede cambiar mediante controles de demostración.

El prototipo completo, con escenarios y controles de fallos, permanece en prototype/v1. Los documentos de diseño y su QA describen esa referencia. No constituyen evidencia de integración persistente.

## Comprobaciones

```bash
npm run build
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

62 pruebas unitarias y suite de sesión con proveedor simulado, sin conexión a Supabase. Playwright usa Vite en 5174 con configuración pública ficticia; cubre roles, recarga, cierre, Atrás, errores, renovación acotada, teclado, accesibilidad y anchos 390/768/1440. Capturas en evidence/, ignoradas por Git.

Comprobación adicional explícita con Supabase real, backend encendido y las cuatro cuentas preparadas:

```bash
npm run test:e2e:real
```

Usa Vite en 5175 y lee la contraseña desde backend/.env o AULAS_DEMO_PASSWORD. No habilita trazas ni video. Verifica ingreso, perfil, navegación por rol, recarga, cierre y rechazo del usuario inactivo. Nunca imprimir tokens ni contraseñas en aserciones.

Las 44 pruebas históricas de navegador están en e2e/prototype/, excluidas de esta suite. Se ejecutan en la rama prototype/v1; se adaptarán por módulo durante I-02 a I-05.

## Organización

- src/auth-client.ts y src/use-session.ts: cliente y ciclo de sesión.
- src/App.tsx: acceso y carga de la aplicación.
- src/OperationalApp.tsx: navegación y estado de negocio aún simulado.
- src/pages/, src/components/ y src/App.css: recorridos y diseño B.
- [Avance I-01](../docs/planificacion/avance-i-01.md) y [QA de ingreso real](../docs/planificacion/qa-i-01.md).
