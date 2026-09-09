# Diseño aprobado — Aulas

**Estado:** dirección B — PATIO, recorridos y guía visual aprobados. Preparación documental del prototipo navegable completa; todavía no hay implementación ni pruebas de interfaz ejecutadas.

## Punto de partida

1. Leer la [guía visual](guia-visual-b.md): colores, tipografías, tamaños, componentes y adaptación.
2. Consultar las referencias aprobadas de la tabla siguiente.
3. Ejecutar el [plan del prototipo navegable](prototipo-navegable.md) usando sus escenarios y criterios.
4. Resolver comportamiento según la [especificación de pantallas](../especificacion/14-pantallas-y-navegacion.md) y los capítulos funcionales vinculados.

## Referencias vigentes

| Área | Referencia aprobada | Qué se reutiliza |
|---|---|---|
| Identidad | [B — PATIO](mockups/v2/README.md), [guía](guia-visual-b.md) | Marfil, verde bosque, títulos serif, navegación superior. |
| Reserva periódica | [Cuatro pantallas](mockups/flujo-periodico-b/README.md) | Datos y fechas juntos; aula por día semanal; revisión; éxito. |
| Reserva esporádica | [Tres pantallas](mockups/flujo-esporadico-b/README.md) | Fechas y horarios concretos; aula por fecha; revisión. |
| Sin disponibilidad periódica | [Conflictos B](mockups/v2/b-seleccion-aula.png) | Opciones informativas, responsables/contactos y nueva consulta. |
| Operación diaria | [Cuatro pantallas](mockups/operacion-diaria-b/README.md) | Agenda por aulas, detalle, cambio de aula y cancelación. |
| Consultas | [Listados e impresión](mockups/listados-b/README.md) | Día/curso, estado por ocurrencia, impresión completa. |
| Reprogramación | [Antes y después](mockups/listados-b/04-reprogramar.png) | Una clase, aula del patrón conservada. |
| Administración | [Cuatro pantallas](mockups/administracion-b/README.md) | Aulas, cuentas, calendario y revisión de impacto. |
| Ingreso y móvil | [Cuatro pantallas y estados](mockups/ingreso-movil-estados-b/README.md) | Login, lista diaria móvil, formulario desplazable y errores. |
| Indicadores | [Día, semana y componentes](mockups/indicadores-guia-b/README.md) | Datos exactos del ejemplo, gráficos y valores consultables. |

Las alternativas A y la primera ronda de selección por fecha son antecedentes exploratorios, no instrucciones de implementación. Los prompts preservan cómo se generaron las imágenes y tampoco sustituyen las reglas vigentes.

## Autoridad y correcciones consolidadas

La especificación define alcance y reglas. Esta consolidación y la guía definen el diseño aprobado. Las notas de cada serie precisan las imágenes. Ante una diferencia gráfica, aplicar el texto vigente y no reproducir el defecto.

- Unificar encabezado, cuenta y Administración según rol. En móvil, marca compacta y Menú; cuenta y cerrar sesión dentro de ese menú. Quitar controles accesorios no definidos.
- Periódicas siempre asignan por patrón semanal; esporádicas por fecha. Mantener los tres pasos con etiquetas correctas. El éxito es resultado del guardado, no otra confirmación.
- El día de semana y la hora de fin son derivados. El período académico se consulta desde la reserva, no se edita allí. Ubicación y piso conservan los campos del dominio; pizarrón Tiza/Fibrón.
- Carga, vacío, error y sesión vencida son estados distintos. Una consulta fallida no prueba falta de disponibilidad. Ninguna imagen habilita mensajes, borradores persistentes o excepciones de aula.
- Agenda: trazar intervalos reales, mostrar curso/comisión en todos los bloques y mantener colores por tipo. Mostrar explícitamente qué aulas se están viendo.
- Indicadores: calcular los 32 módulos de media hora; no copiar las curvas rasterizadas. Quitar la tarjeta extra de aulas abiertas y la tabla inventada de asignaturas; conservar demanda atendida por tipo. Fecha y rango son controles; alumnos-hora lleva su unidad completa.
- Móvil: quitar el resumen de cuatro columnas del formulario y el botón de calendario accesorio. Mantener desplazamiento y espacio para el pie sin ocultar campos.
- Calendario: Crear año disponible; descripción de fecha no lectiva, sin catálogo adicional. Revisar cierre y dependencias antes de mutar. El conflicto bloquea el cambio completo.
- No trasladar textos accesorios sobre ausencia de correos ni erratas del generador al producto. Las confirmaciones y cancelaciones deben identificar su alcance real.

## Lo que falta comprobar

La aprobación visual no verifica navegación real, respuesta de controles, teclado, contraste, tamaños de pantalla, gráficos calculados ni integración. Esos puntos tienen criterios en el plan del prototipo. No quedan elecciones de dirección visual pendientes para comenzar esa etapa.

## Prototipo implementado

P-01 a P-06 completados como simulación navegable. Ver la [matriz de aceptación, resultados y límites](validacion-prototipo.md) y los [escenarios para recorrerlo](escenarios-demo.md).
