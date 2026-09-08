# Estado de validación del diseño

**Todos los bloques presentados y la guía visual B están aprobados por el usuario.** La consolidación y el plan están listos; no se ha implementado ni probado el prototipo navegable.

Consultar el [índice de diseño aprobado](README.md) como entrada principal y el [plan del prototipo](prototipo-navegable.md) para comenzar el trabajo.

| Bloque | Estado | Referencia |
|---|---|---|
| Identidad B y componentes | Aprobado | [Guía visual](guia-visual-b.md) |
| Reserva periódica | Aprobado | [Recorrido](mockups/flujo-periodico-b/README.md) |
| Reserva esporádica | Aprobado | [Recorrido](mockups/flujo-esporadico-b/README.md) |
| Agenda, detalle, aula y cancelación | Aprobado | [Operación diaria](mockups/operacion-diaria-b/README.md) |
| Listados, impresión y reprogramación | Aprobado | [Pantallas](mockups/listados-b/README.md) |
| Administración | Aprobado | [Aulas, cuentas y calendario](mockups/administracion-b/README.md) |
| Ingreso, móvil y estados | Aprobado | [Pantallas y patrones](mockups/ingreso-movil-estados-b/README.md) |
| Indicadores | Aprobado | [Día y semana típica](mockups/indicadores-guia-b/README.md) |

## Verificación pendiente en el prototipo

Las aprobaciones cubren composición, recorridos y patrones con sus correcciones escritas. Se deben comprobar interacción real, teclado, contraste, adaptación, representación semanal con muchas aulas, estados y gráficos calculados. Son tareas concretas de ejecución definidas en el plan, no una nueva ronda de elección visual.

Disponibilidad independiente reutiliza búsqueda y resultados de reserva; altas y edición de datos compartidos reutilizan formularios; restablecimiento y confirmaciones reutilizan diálogos. No hace falta una imagen nueva para cada variante. Las reglas y permisos siguen la especificación.

El prototipo permitirá revisar estos comportamientos antes de integrar backend y servicios. La validación visual no constituye prueba de autenticación, concurrencia ni persistencia reales.
