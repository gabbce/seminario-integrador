# Backend Aulas — esqueleto Spring Boot

Java 21, Spring Boot 4.1.1 y Maven Wrapper. Incluye Spring MVC, Actuator y prueba de arranque; todavía no implementa reservas, persistencia ni autenticación.

```bash
./mvnw test
./mvnw spring-boot:run
```

Comprobar http://localhost:8080/api/health: debe devolver `status: UP`. Escucha en loopback; `PORT` permite cambiar el puerto. No requiere credenciales. El frontend puede ejecutarse independientemente para validar UX.

La integración con Supabase PostgreSQL/Auth y los contratos del dominio corresponden a entregas posteriores. El endpoint de salud no representa una API funcional de reservas.
