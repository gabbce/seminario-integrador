# Guía visual B — PATIO

Guía aprobada por el usuario. Concreta la dirección visual B, sin iniciar implementación. [Lámina visual](mockups/indicadores-guia-b/03-guia-visual.png). Los valores escritos son la referencia; los píxeles generados son aproximados.

## Color

| Uso | Valor |
|---|---|
| Fondo | #F5F1E9 |
| Superficie | #FFFFFF |
| Texto principal | #24352B |
| Texto secundario | #59645D |
| Acción principal y foco | #194D3A |
| Acento terracota | #AD563B |
| Error / acción destructiva | #B42318 |
| Borde | #D8DCD5 |

Verde para selección y acciones principales; terracota para acentos puntuales, sin confundir selección con error. Estados siempre con texto e icono. General usa fondo salvia #E8EEE4, Multimedios ocre claro #F4ECD9 y Laboratorio arcilla clara #F4E4DC; texto oscuro y nombre de tipo visibles. Estas categorías se mantienen entre pantallas, sin usarlas como escala de intensidad de métricas.

## Tipografía y proporciones

Fuentes del sistema acordadas: Georgia para títulos y cifras destacadas; Arial con alternativa sans-serif para formularios, tablas y texto. Evita depender de una descarga de fuentes para la demo. La apariencia exacta depende del sistema y se verificará al prototipar.

- Título de página: 32 px escritorio, 28 px móvil; sección: 24 px.
- Cuerpo y campos: 16 px; etiquetas secundarias y tablas compactas: 14 px como referencia, sin reducir texto para encajar contenido.
- Interlineado aproximado 1,4–1,5 en texto y 1,2 en títulos. Números alineados en tablas y ejes.
- Espaciado base: 4, 8, 12, 16, 24 y 32 px. Márgenes de página: 32 px escritorio, 16 px móvil.
- Paneles con radio 12 px; controles 8 px. Borde fino, sombra discreta solo cuando ayuda a separar un panel o diálogo.

## Componentes y comportamiento

Una acción principal por zona de trabajo. Guardar/continuar en verde; volver/descartar con estilo secundario; cancelar clases o dar de baja con identificación destructiva y alcance visible. Orden consistente: secundaria antes de primaria en formularios. Acciones deshabilitadas deben explicar su impedimento cuando no resulte evidente.

Etiquetas persistentes, ayuda y errores cerca del campo. El marcador de posición no sustituye la etiqueta. Formularios de alta/edición comparten componentes; datos calculados se muestran como lectura, no selectores. Los listados preservan filtros, orden y paginación y usan separadores antes que tarjetas por fila.

Navegación superior en escritorio; Administración agrupa Usuarios y Calendario para Admin. En móvil, marca compacta y Menú, con cuenta/rol y cerrar sesión dentro del menú. No duplicar navegación superior e inferior. La agenda diaria móvil usa lista; formularios se apilan y desplazan sin agregar pasos.

El foco debe ser visible y los controles operables por teclado; objetivo táctil de 44 px en móvil. Verificar contraste, zoom, teclado y lectores de pantalla en el prototipo: las imágenes no prueban accesibilidad. El pie de acciones reserva espacio y no cubre campos ni mensajes al abrir el teclado.

## Gráficos

Curvas escalonadas para datos por media hora, sin suavizado que invente valores. Alumnos y clases en gráficos separados con el mismo eje temporal. Mapa secuencial de marfil a verde oscuro; cero visible, falta de datos distinguible. Etiquetas y valores consultables por foco, puntero o toque; no depender solo de hover. Ofrecer los valores en una tabla accesible dentro de la vista sin agregar otra exportación.

Mantener exactamente 32 franjas de 07:00 a 23:00. Etiquetar unidades, filtros, rango y cantidad de fechas equivalentes. Diferenciar total de clases, clases simultáneas y promedio; alumnos-hora nunca se etiqueta simplemente como horas o personas.

Esta guía concreta estilos sobre React/Vite y shadcn/Tailwind ya aprobados; no selecciona otra biblioteca ni amplía el alcance.
