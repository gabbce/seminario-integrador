# Frontend Aulas — primer corte navegable

React 19, TypeScript, Vite 8, Tailwind 4 y botón shadcn/Base UI. Requiere Node 24 (probado con 24.14.0) y npm 11. Dependencias reproducibles en `package-lock.json`.

```bash
npm ci
npm run dev
```

Abrir http://localhost:5173. Usar `bedel@demo.local`, `admin@demo.local` o `docente@demo.local`, todos con contraseña ficticia `Aulas2026`.

La sesión y las reservas viven en memoria. Navegar conserva los cambios; recargar reinicia todo. El acceso simulado sirve para revisar la interfaz: no implementa autenticación ni autorización reales. No utiliza Supabase ni necesita claves.

## Recorrido reproducible

1. Ingresar como bedel. Agenda comienza en 14/09/2026; «Hoy» usa el reloj ficticio del 08/09/2026.
2. Nueva reserva: Matemática I, 001-A-2026, Laura Gómez, 30 alumnos, Multimedios, lunes/miércoles 14–16.
3. Buscar aulas. Lunes: 203. Miércoles: 105. Cada elección cubre todas las fechas del día semanal.
4. Revisar las 26 fechas y confirmar. Ver detalle; volver a agenda muestra la nueva clase.
5. Cerrar sesión e ingresar como docente para consultar sin acción de creación.

Agenda contiene inicialmente cuatro clases. Matemática se agrega al confirmar el recorrido; no está precargada para evitar duplicaciones. Las seis aulas candidatas aparecen en la agenda. Desplazar verticalmente para recorrer 07–23; inicialmente muestra desde 13. En móvil se usa una lista cronológica.

## Comprobaciones

```bash
npm run build
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
```

Playwright inicia Vite si hace falta. Las capturas quedan en `evidence/` y los resultados en `test-results/`, ignorados por Git. Se verifican recurrencia/feriados, solapamientos, capacidad, confirmación completa, vuelta entre pasos, lectura de la reserva, rol docente y anchos móviles.

## Organización y alcance

- `src/pages/`: páginas y recorrido periódico.
- `src/domain.ts`: datos ficticios, recurrencia, disponibilidad y validación de confirmación.
- `src/App.tsx`: navegación, sesión y estado compartido.
- `src/App.css`: adaptación visual B; `src/components/`: componentes compartidos.

La reserva periódica permite elegir ambos cuatrimestres de 2026 o una anual, omite pasado/receso/feriados y conserva exclusiones manuales. Inicio y duración determinan el fin. Las aulas se ordenan por capacidad y código, con tres sugerencias y opción de ver todas. Cuando no hay disponibilidad, las alternativas muestran conflictos y contactos ficticios, sin permitir elegir un aula ocupada. Se pueden crear y reutilizar cursos por materia/comisión/año y solicitar pizarrón, ventilación y recursos Multimedios. La modalidad esporádica permite agregar/quitar fechas, asignar aula por fecha y confirmar el conjunto. Disponibilidad permite consultar por modalidad sin preparar reserva; Docente no ve contactos privados ni acciones de registro, y operadores pueden continuar con los criterios elegidos. Tampoco están implementadas semana, edición, cancelación, impresión, administración ni indicadores. Sus entradas informan que pertenecen a entregas posteriores. El detalle/listado y aulas son de consulta básica.

El proxy `/api` apunta al Spring Boot local en 8080; el frontend todavía no consume servicios. El alcance completo permanece en la especificación y el plan de entregas.

Estado detallado y próximos cortes: [avance del prototipo](../docs/diseno/avance-prototipo.md).
