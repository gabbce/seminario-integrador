# Datos ficticios · I-02

La aplicación se usa exclusivamente para demostrar el TP. Esta carga prepara catálogos; no contiene reservas ni clases y no acredita indicadores persistentes.

## Ejecutar

Configurar `backend/.env` siguiendo el README del backend. En una base nueva, preparar primero el Administrador y las cuatro cuentas demo mediante el comando de I-01. Sus contraseñas se toman del archivo privado; la carga de catálogos no las consulta ni modifica.

Desde `backend`, con PostgreSQL accesible:

```bash
AULAS_ENVIRONMENT=demo ./mvnw spring-boot:run \
  -Dspring-boot.run.arguments='--aulas.command=seed-catalogos --spring.main.web-application-type=none'
```

El proceso ejecuta Flyway, carga el dataset en una transacción y termina. No necesita detener el servidor. Solo funciona en entorno `demo`, sin servidor web y con un Administrador activo existente. No se conecta a Auth.

Repetir exactamente el comando permite comprobar que crea cero registros adicionales. El arranque habitual (`./mvnw spring-boot:run`) no lleva esos argumentos y nunca carga datos.

## Contenido versionado

Fuente: `backend/src/main/resources/demo/catalogos-i02-v1.json`.

| Datos | Cantidad / cobertura |
|---|---|
| Aulas compartidas | 20; General, Multimedios y Laboratorio; capacidades y equipamiento variados |
| Estados de aula | Habilitada, Inhabilitada, Mantenimiento y Baja |
| Historial | Desde 01/01/2026; ejemplo de baja desde agosto de 2026 |
| Años | 2026 y 2027 habilitados |
| Cuatrimestres | Dos por año; primero marzo–julio y segundo septiembre–diciembre |
| Fechas no lectivas | Tres por año, con descripción que indica su carácter ficticio |
| Materias | 10, código numérico generado y reutilizado |
| Cursos | Comisiones A/B de cada materia en cada año: 40 |
| Docentes | Cinco referencias fijas servidas por Java, independientes de Auth |

Las fechas son ejemplos y no un calendario oficial argentino. El receso entre cuatrimestres no cierra la institución. Se preparan segundo cuatrimestre 2026, primero 2027 y anuales 2027 para futuras cargas de reservas. La fecha del servidor es normal; los períodos no se consideran actuales indefinidamente.

Los IDs internos pueden variar entre bases; no se emparejan registros por posición. El código visible de materia también depende de materias creadas previamente: no esperar siempre `001` si la base ya tiene materias. `105`, `203`, `108`, `Lab 2`, `301` y `204` conservan sus identificadores visibles para la transición del prototipo.

## Repetición y discrepancias

No hay borrado ni restablecimiento en este comando. Si un aula, año o materia ya existe, conserva sus datos y el proceso informa diferencias con la configuración. Un año existente no recupera silenciosamente períodos o feriados que alguien quitó. Si está cerrado o en preparación, no recibe nuevos cursos de la carga. Aulas dadas de baja permanecen así.

Si se agregaron registros durante QA, el total de la base puede superar 20 aulas/40 cursos. El comando informa lo creado en esa ejecución; no elimina esos registros adicionales. Las comprobaciones exactas de cantidades se hacen sobre PostgreSQL desechable vacío en `DemoCatalogTests`.

Las cuentas de I-01 y sus claves se conservan. El restablecimiento completo de una demo se implementará en I-06; no ejecutar limpieza de esquemas en el proyecto Supabase para repetir esta prueba.

## Verificación

1. Ejecutar la carga y abrir Aulas, Calendario y Nueva reserva.
2. Recargar y comprobar datos desde una segunda sesión autorizada.
3. Repetir la carga: cero altas; sin duplicados.
4. Cambiar una capacidad desde Aulas y repetir: conserva el valor y muestra discrepancia.
5. Seguir la [guía de QA manual](qa-manual-i-02.md).

Pruebas aisladas: `cd backend && ./mvnw -Dtest=DemoCatalogTests test`. Requieren Docker para PostgreSQL desechable. No afectan Supabase.
