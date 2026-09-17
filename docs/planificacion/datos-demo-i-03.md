# Datos de demostración de reservas I-03

El recurso `backend/src/main/resources/demo/reservas-i03-v1.json` define el conjunto ficticio `reservas-i03`, versión 1: doce reservas periódicas y 370 clases. Usa los catálogos de I-02, cinco docentes externos ficticios y aulas existentes. No incluye reservas esporádicas, cancelaciones/reprogramaciones demo ni indicadores de volumen amplio.

## Carga explícita

Preparar primero los catálogos con `seed-catalogos` y una cuenta Administrador activa. Usar las variables de conexión habituales del backend, sin escribir credenciales en el repositorio. Desde `backend`, ejecutar:

```sh
AULAS_ENVIRONMENT=demo ./mvnw spring-boot:run \
  -Dspring-boot.run.arguments="--spring.main.web-application-type=none --aulas.command=seed-reservas"
```

El comando requiere entorno `demo` y modo sin servidor web. El arranque normal no registra el ejecutor ni carga reservas. Selecciona al Administrador activo de menor ID, cuya identidad queda registrada en las reservas y auditoría. No crea usuarios ni consulta Auth. La migración V10 agrega únicamente el registro del conjunto; no inserta datos demo.

La primera carga imprime `12 reservas y 370 clases creadas; 0 reservas conservadas`. Una repetición imprime `0 reservas y 0 clases creadas; 12 reservas conservadas`. El proceso no elimina datos anteriores, por lo que los totales globales pueden ser mayores. Las reservas de QA externas al conjunto se conservan.

## Escenarios y recuentos

| Clave | Año / período | Curso | Patrones / aulas | Clases |
|---|---|---|---|---:|
| matematica-2026-segundo | 2026 segundo | Matemática I A | Lunes 14–16 / 105; miércoles 14–16 / 204 | 25 |
| fisica-2026-segundo | 2026 segundo | Física I B | Martes y jueves 17–19 / 108 | 28 |
| programacion-2026-segundo | 2026 segundo | Programación I A | Lunes 18–20 / Lab 2; miércoles 18–20 / Lab1 | 26 |
| ingles-2026-segundo | 2026 segundo | Inglés técnico B | Viernes 09–10 / 106 | 14 |
| matematica-2027-primero | 2027 primero | Matemática I A | Lunes 09–11 / 105; miércoles 09–11 / 204 | 32 |
| fisica-2027-primero | 2027 primero | Física I A | Martes y jueves 17–19 / 108 | 33 |
| programacion-2027-primero | 2027 primero | Programación I A | Martes 14–16 / Lab1 | 16 |
| bases-2027-primero | 2027 primero | Bases de datos B | Martes 15:30–16 / Lab 2 | 16 |
| historia-2027-anual | 2027 anual | Historia A | Lunes 18–20 / 101; miércoles 18–20 / 107 | 60 |
| estadistica-2027-anual | 2027 anual | Estadística B | Martes y jueves 10–12 / 203 | 58 |
| quimica-2027-anual | 2027 anual | Química A | Viernes 14–16 / 201 | 31 |
| sistemas-2027-anual | 2027 anual | Sistemas operativos B | Miércoles 18–20 / Lab 2 | 31 |

Total: 93 clases de 2026 y 277 de 2027. Las exclusiones manuales son 2026-09-30 y 2027-03-17 en Matemática, y 2027-09-16 en Estadística. Se omiten los feriados y el receso entre cuatrimestres. Hay capacidad justa en aulas 105 (30), 203 (40) y laboratorios (24), además de patrones en un aula y en aulas distintas.

Antes del inicio del primer cuatrimestre 2027, consultar martes 14–16, Laboratorio, 24 alumnos, Ventiladores (sin otros recursos): Lab 2 interfiere 480 minutos (16 fechas de 30 minutos), seguido de Lab1 con 1920 minutos (16 fechas de 120 minutos). El 25 de mayo se omite. Martes 16–17 queda contiguo y libre en ambos laboratorios. Aulas adicionales o modificaciones del usuario pueden cambiar legítimamente la disponibilidad y el ranking.

## Identidad, preservación y atomicidad

`aulas.demo_reserva` identifica cada serie por `(dataset, clave)`, independientemente del actor. Conserva versión, definición JSONB y snapshot JSONB completo del agregado: cabecera, subtipos, períodos, patrones, exclusiones y detalles, incluyendo cancelaciones. No incluye perfiles actuales de usuarios ni credenciales. El snapshot también integra la auditoría `CARGAR_DEMO_RESERVA`; la confirmación produce su auditoría habitual dentro de la misma transacción.

Repetir con otro Administrador no duplica. Primero se recuperan las identidades registradas: cambios manuales o de definición se informan como discrepancias sin sobrescribir ni restaurar reservas. Cambiar el nombre/email del registrador no produce una discrepancia falsa. Una clave retirada de la configuración conserva su reserva y se informa. No borrar filas de registro para intentar recargar: la ocupación preexistente debe resolverse mediante los flujos operativos correspondientes.

Cada patrón contiene fechas esperadas explícitas. Antes de cualquier alta se compara la preparación con esas fechas; un calendario que cambia el conjunto efectivo provoca error, mientras que cambiar sólo descripciones de feriados no afecta la carga. Un curso/aula faltante, un aula incompatible u ocupada, o un fallo de auditoría revierte todas las altas de esa ejecución. Las reservas anteriores permanecen intactas.

La transacción exterior real es `READ_COMMITTED`, con bloqueos de permisos, años y aulas ordenados. La preparación con reloj fijo al 1 de enero de 2026 se construye exclusivamente dentro de esa transacción para admitir la historia ficticia declarada; usa el mismo confirmador, restricciones GiST e invariantes que una reserva operativa. No altera beans de reloj ni agrega opciones HTTP/UI retroactivas. La interfaz usa siempre la fecha institucional actual, por lo que al avanzar el tiempo disminuyen las fechas futuras consultables; los recuentos persistidos del conjunto siguen siendo 370.

## Verificación local

`DemoReservationTests` verifica recuentos exactos, repetición con otro actor, cambios manuales, configuración modificada, fechas de calendario, referencias faltantes, ocupación previa, auditoría transaccional y ausencia de carga en arranque normal. Ejecutar desde `backend`:

```sh
./mvnw -Dtest=DemoReservationTests test
```

Estas pruebas usan PostgreSQL efímero. La carga y aceptación contra Supabase se registran por separado en la guía QA y el avance de I-03.

## Carga realizada para QA

El 17/09/2026 se aplicó V10 y se ejecutó la carga en Supabase: doce reservas y 370 clases nuevas. La segunda ejecución conservó las doce sin crear registros ni informar discrepancias. También permanece la reserva ficticia de 33 clases creada al verificar I-03.2: el total observado es trece reservas y 403 clases. No hace falta volver a cargar para iniciar el QA. Se mantienen las aulas y otros datos de pruebas anteriores; el escenario de alternativas pide Ventiladores para distinguir los laboratorios del conjunto de las aulas QA sin ese recurso.
