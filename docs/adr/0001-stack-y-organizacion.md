---
status: accepted
---

# Java, React y Supabase para la app web

Java/Spring Boot concentra el dominio y las transacciones, con JPA/Hibernate sobre PostgreSQL administrado en Supabase. Supabase Auth gestiona identidad, credenciales y sesiones; Spring Security valida tokens y aplica rol y estado actuales del perfil de la app.

React/TypeScript/Vite usa Tailwind, shadcn/ui y Chart.js. Spring sirve API y frontend compilado bajo el mismo origen. Docker Compose permite ejecutar la app local; se admite alojamiento web con HTTPS. Ambos modos requieren internet para Supabase.

El navegador solo usa Auth directamente; los datos del dominio pasan por Java. Las credenciales administrativas permanecen en backend. No hay autenticación propia, servicio de respaldos ni infraestructura de alta disponibilidad. Modelo y contratos concretan permisos, integridad y resultados parciales de las operaciones de identidad.

[Arquitectura](../especificacion/12-arquitectura-y-stack.md) y [operación](../especificacion/17-operacion-local-y-verificacion.md) definen la configuración. Esta especificación no inicia implementación.
