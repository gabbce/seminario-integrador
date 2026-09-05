---
status: accepted
---

# Java/Spring Boot y React para la demo local

Se adopta Java/Spring Boot con Spring Security y JPA/Hibernate, PostgreSQL y una interfaz React/TypeScript/Vite con Tailwind y shadcn/ui. Chart.js cubre gráficos y Docker Compose la ejecución local. El usuario aprobó el conjunto en DA-81 tras descartar Django y considerar Java, Node y Laravel.

Se mantiene un backend único organizado por módulos para preservar transacciones conjuntas entre calendario y reservas. La elección de React/Vite evita requerir un servidor de frontend adicional para funciones que ya resuelve Java; implica definir explícitamente navegación y contratos HTTP. Las entidades y especializaciones académicas se conservan, incorporando los ajustes funcionales acordados.

La decisión establece tecnologías y organización, no el inicio de implementación. Las versiones base y la ejecución local están en el [documento 17](../especificacion/17-operacion-local-y-verificacion.md); los parches de dependencias se fijarán con compatibilidad verificable al implementar.
