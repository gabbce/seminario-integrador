# Operación local y verificación de la demo

**Versión:** 1.0 final, aprobada. Alcance vigente definido en la [especificación general](00-especificacion.md).

Versión 1.0. Especificación técnica derivada de demo local, Docker Compose, PostgreSQL y RNF originales. No contiene comandos ejecutados ni afirma que exista ya una aplicación desplegada.

## Base tecnológica y reproducibilidad

Java 21, Spring Boot con sus versiones administradas de Spring Security/JPA/Hibernate, React con TypeScript y Vite, Tailwind y shadcn/ui, Chart.js, PostgreSQL y Docker Compose. Maven para backend, npm para frontend. No añadir un servidor Next ni un backend Node paralelo al de Java.

La base seleccionada para implementar es Spring Boot 4.1, PostgreSQL 18, React 19, Vite 8, Tailwind 4 y Chart.js 4; Node 22 con versión al menos 22.12 para las herramientas del frontend. Se fijará el parche compatible concreto en las futuras definiciones de dependencias y archivos de bloqueo antes de ejecutar la aplicación. Los componentes shadcn elegidos y su configuración quedarán versionados en el repo. No usar etiquetas flotantes como única definición reproducible del entorno.

Estas versiones son una concreción técnica, no funcionalidades adicionales ni una afirmación de pruebas de compatibilidad realizadas. La [documentación de Spring Boot](https://docs.spring.io/spring-boot/system-requirements.html) incluye Java 21 en su rango compatible; [Vite](https://vite.dev/guide/) documenta los requisitos de Node y build React; [Tailwind](https://tailwindcss.com/docs/installation/using-vite) documenta su integración con Vite. Si al resolver dependencias aparece incompatibilidad, corregir parches o registrar el cambio de base antes de programar sobre una combinación no validada.

## Componentes en ejecución

- Servicio de aplicación Java que sirve API y archivos estáticos compilados de React bajo un mismo origen local.
- Servicio PostgreSQL con volumen persistente.
- Servicio auxiliar de respaldos locales con herramientas de PostgreSQL; su única función es cumplir copia diaria/retención. No es un servicio del dominio ni un sistema de mensajería.

El build puede usar etapas Node y Java. Durante desarrollo se permite Vite con proxy a la API. Durante la presentación no se necesita el servidor de desarrollo de Vite ni conexión a CDN para interfaz/gráficos. Descargar dependencias/imágenes inicialmente sí puede requerir internet.

Detener y volver a iniciar la demo conserva datos del volumen. No borrar ni repoblar datos automáticamente en cada arranque. Una reinicialización completa es una operación técnica explícita del responsable, fuera de los flujos de app.

## Configuración

| Dato de entorno | Propósito |
|---|---|
| Credenciales/nombre de base | Conectar aplicación y herramientas de respaldo al PostgreSQL local. |
| Email de Admin inicial | Identidad de la primera cuenta. |
| Contraseña de Admin inicial | Se recibe de variable, cumple política, se guarda como hash y no exige cambio inicial (DA-77). |
| Puerto local de aplicación | Permitir acceso reproducible desde navegador. |
| Directorio/volumen de respaldos | Persistir copias fuera del volumen de datos del servidor. |
| Activación de datos ficticios iniciales | Carga explícita y única de referencias/escenarios de demo. |

La zona funcional es America/Argentina/Cordoba por acuerdo, no una preferencia editable en la app. No exponer secretos en variables públicas de Vite. La ausencia de credenciales necesarias debe producir un error de inicio claro, no una contraseña universal de respaldo.

Crear el Admin solo si no existe. Si ya existe, no cambiar contraseña/rol al reiniciar. Los demás usuarios y las referencias ficticias se cargan sin duplicarse y sin destruir cambios previos de la demo. La creación de materia/curso nueva desde una preparación de reserva se confirma junto con la reserva, evitando referencias huérfanas por abandonar el formulario.

## Respaldo diario y retención

Usar respaldo lógico de la base en formato de archivo de PostgreSQL y restauración mediante sus herramientas oficiales. [pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html) obtiene un respaldo lógico; [pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html) permite restaurar el formato de archivo. Usar herramientas de la misma versión mayor que el servidor de la demo.

El servicio de respaldos ejecuta una copia diaria a las 03:00 del horario institucional mientras el entorno está encendido. Al iniciar, si no existe una copia exitosa reciente de menos de 24 horas, realiza una de recuperación de frecuencia; no inventa copias de días en que el equipo estuvo apagado.

Guardar con fecha/hora y marcar éxito solo cuando termina correctamente. Un archivo parcial no cuenta como respaldo válido. Conservar archivos exitosos durante 14 días; la limpieza no debe borrar la última copia válida como consecuencia de un fallo nuevo ni tocar el volumen de datos. Registrar hora, resultado y archivo, sin credenciales.

La demo no promete copias mientras la computadora está apagada ni un SLA de producción. Cumplimiento verificable: programación configurada, ejecución bajo entorno activo, retención demostrada con fechas de archivos de prueba y recuperación real comprobada.

## Restauración de prueba

1. Preparar un conjunto conocido de datos ficticios con una reserva confirmada, una cancelación y una entrada de auditoría.
2. Ejecutar respaldo y verificar que se completó sin error.
3. Restaurarlo en una base de prueba separada y vacía, sin sobrescribir la base de la demo activa.
4. Comprobar esquema, relaciones, cabeceras, detalles, estados y auditoría esperados. Levantar la app de prueba contra esa base y verificar ingreso/consulta.
5. Registrar archivo, fecha, resultado y duración de la restauración como evidencia. No confundir «el archivo existe» con «puede restaurarse».

La copia cubre base y datos; configuración local y secretos se conservan separadamente por el responsable de la demo. No introducir una pantalla de backup/restauración. La pérdida potencial de datos depende del último respaldo exitoso; con servicio diario activo se espera como máximo el intervalo desde esa copia, sin garantía cuando el entorno estuvo apagado o falló.

## Auditoría

Registrar ingreso válido/fallido, bloqueo y cierres relevantes, y mutaciones de usuarios, aulas, calendario y reservas. Campos mínimos: actor cuando existe, instante, operación, tipo/ID de entidad y resultado. Para cambios registrar diferencias necesarias, sin claves, hashes ni cookies. La bitácora permanece durante la vida de la base, sin panel o borrado desde la app.

Mutación y evento de éxito se guardan juntos. Los intentos de autenticación fallidos deben permanecer aunque no haya operación de negocio exitosa. No registrar consultas rutinarias ni añadir contadores estadísticos de conflictos rechazados. El responsable puede inspeccionar eventos con cliente SQL durante la presentación.

## Verificación funcional

Usar API y navegador como puntos de prueba, y PostgreSQL real para integridad y transacciones. Cubrir todos los CU y extensiones del documento 18; las historias HU son un listado de cobertura, no pruebas ya ejecutadas. Pruebas de lógica de calendario/indicadores pueden usar fechas fijas para comprobar cálculos sin depender del reloj real.

Casos de concurrencia imprescindibles:

- Dos confirmaciones para la misma aula/franja: nunca guardar ambas.
- Dos ediciones de una reserva: la segunda sobre versión anterior debe revisar datos actuales.
- Confirmación simultánea con inhabilitación de aula o alta de feriado: nunca dejar reserva vigente en una condición prohibida.
- Actualización de calendario con nuevas clases: error en una fecha no deja cambio parcial.
- Dos operaciones que intentan quitar el último Admin activo: conservar al menos uno.

Verificar que no se entregan emails docentes al rol de consulta y que una sesión deshabilitada o con cambio de rol no mantiene acceso. No probar solo ocultación visual de botones.

## Navegadores y carga

Matriz de demo: navegadores Chromium y Firefox estables disponibles al ejecutar validación, registrando versiones concretas; viewport de computadora 1366×768 y móvil 390×844 para consultas docentes. No constituye soporte garantizado de versiones antiguas. Validar formularios, teclado, agenda diaria alternativa e impresión completa.

Escenario y protocolo de RNF-03/05 en documento 11: 30 aulas, hasta 25.600 ocurrencias periódicas más 500 esporádicas, 50 sesiones (5 operativas/45 docentes), dos minutos de calentamiento y diez de medición. Aplicar los ciclos fijos por rol, una operación por sesión a la vez y espera de 5 segundos tras cada respuesta definidos en el documento 11; reportar la tasa efectiva, sin equiparar sesiones con peticiones por segundo. Medir percentiles por operación y reportar equipo, carga, errores y entorno. Datos sintéticos, no estimación institucional ni máximo del producto.

## Evidencias que deberá producir la implementación

- Inicio local reproducible a partir de instrucciones y configuración de ejemplo sin secretos.
- Matriz de aceptación CU/EX con resultado y evidencia.
- Prueba de restauración y retención.
- Resultados de concurrencia y rendimiento con PostgreSQL.
- Capturas de agenda, reservas, conflictos, calendario y métricas en desktop/móvil.

Ninguna de estas evidencias se declara obtenida por completar esta especificación. Son entregables de la futura implementación.
