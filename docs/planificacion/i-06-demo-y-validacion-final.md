# I-06 · Demo y validación final

**Estado:** plan detallado aprobado por bloques el 26/09/2026. Implementación en curso; I-06.1 verificada técnicamente. Ver [avance](avance-i-06.md). Depende de I-05 técnicamente verificada; I-04/I-05 conservan aceptación manual pendiente hasta el QA conjunto. Esta planificación no autoriza ejecutar restablecimientos remotos.

## Objetivo y fronteras

Entregar una demo reproducible y presentable, empaquetada bajo un mismo origen, con comandos explícitos y seguros de datos, evidencia técnica y [QA final conjunto](qa-final-i-04-i-05-i-06.md). Se admite presentación local con internet y Supabase remoto. Sin hosting obligatorio, alta disponibilidad, respaldos ni restauración de infraestructura.

## Subcortes y dependencias

| Corte | Resultado aprobado | Dependencia |
|---|---|---|
| I-06.1 | Empaquetado reproducible con Compose, frontend compilado + Java bajo mismo origen, configuración privada y Supabase remoto; comprobar arranque/recarga/rutas | I-05 técnicamente verificada |
| I-06.2 | Comando explícito de restablecimiento demo con alcance aprobado y pruebas de repetición/seguridad; instrucciones de carga y recuperación de escenario | Dataset I-05 y decisión del bloque 5 |
| I-06.3 | Verificación final del paquete: navegadores, roles, concurrencia, regresión y protocolo de carga ya especificado | I-06.1–2 |
| I-06.4 | Guion de presentación, instrucciones y ejecución del QA manual final conjunto; registrar aceptación por entrega | I-06.3 y usuario para aceptación |

Restablecimiento no significa respaldo/restauración ni autoriza borrar el entorno compartido. El alcance exacto, preservación de identidades y casos manuales y entorno de ensayo se validarán en el bloque 5 antes de implementar. No se agrega hosting obligatorio ni infraestructura de producción.

## Fuentes y reglas de ejecución

Aplicar especificación vigente y DA aprobadas, [plan general](integracion.md), [registro de los seis bloques](preparacion-i-05-i-06.md) y contratos existentes en `docs/api/`. El código de I-04 y sus migraciones aplicadas se preservan. Las frases históricas de cierre documental no acreditan estado de implementación.

Cada subcorte incluye contrato antes de código, backend/persistencia, interfaz B — PATIO, pruebas relevantes, inspección visual y commit controlado. Mantener revisión con GPT-6 Luna high por iteración según el flujo vigente, resolver hallazgos y registrar evidencia; no sustituir silenciosamente el revisor solicitado. Los subcortes pueden dividirse técnicamente sin omitir alcance ni aceptar escrituras incompletas. No repetir aprobación funcional de reglas ya resueltas; consultar contradicciones reales o cambios de alcance.

No alterar código ni datos por aprobar este documento. Durante ejecución, preservar cambios ajenos, secretos y escenarios de QA; no editar migraciones aplicadas ni interpretar un arranque como autorización de carga/reset. Crear avance por entrega con tarea, contrato, criterios, pruebas, revisión, incidencias y commit. Distinguir pruebas automatizadas, recorridos reales y aceptación del usuario.

## Empaquetado y restablecimiento · I-06.1–2

Corresponde a I-06.1–2. No introduce hosting obligatorio, respaldos ni instalación local de Supabase.

### Empaquetado y contrato operativo

- Un servicio de aplicación: build React servido por Spring Boot junto a `/api`, mismo origen. Construcción multietapa con versiones fijadas/lockfiles; no usar Vite dev como servidor final ni añadir servidor Node en ejecución.
- Compose construye/inicia/detiene ese servicio; PostgreSQL y Auth permanecen remotos. Puerto configurable, publicado en loopback para demo local; Java debe escuchar dentro del contenedor en la interfaz adecuada (actualmente application.properties usa 127.0.0.1). No romper el modo de desarrollo existente.
- Variables privadas del backend en configuración local ignorada por Git y provistas al contenedor, nunca en capas de imagen, bundle o logs. `.dockerignore` excluye .env, credenciales y evidencias privadas. Frontend incorpora únicamente URL/clave pública de Auth; documentar si cambiar estas requiere reconstruir la imagen.
- Conservar migraciones no destructivas al arrancar; ningún arranque/reinicio ejecuta carga o reset. Inicialización del Admin y cuentas demo sigue explícita y sin sobrescribir identidades. No ejecutar cambios sobre tablas internas de Auth.
- Instrucciones desde checkout limpio: configuración, build, arranque, salud, ingreso, recarga de rutas profundas, parada/reinicio, diagnóstico de puerto ocupado y conexión remota. Indicar dependencia de internet.
- Pruebas: build reproducible con dependencias fijadas, carga de assets sin CDN, `/api/health`, fallback de rutas de React sin interceptar errores API, roles y tokens, ausencia de secretos en bundle/imagen, reinicio conserva datos y modo Java+Vite sigue disponible.

### Restablecimiento aprobado: reservas de datasets seleccionados

Distinguir comandos de carga preservadores de un comando nuevo y explícito que devuelve reservas de un dataset gestionado a su definición original. Alcance acotado a claves registradas de I-03/I-04/I-05, seleccionadas explícitamente; no TRUNCATE global ni borrado/recreación del esquema. No cambiar el comportamiento de los seeds existentes.

- Preservar cuentas/perfiles, contraseñas y UUID de Auth; ninguna llamada destructiva a Auth. Preservar aulas, historia de aulas, materias/cursos y calendarios actuales. Preservar reservas manuales/QA ajenas al dataset y QA 2029.
- Las reservas gestionadas incluidas en el reset sí recuperan sus datos originales, deshaciendo modificaciones realizadas sobre ellas. Esto se advierte en la previsualización; mantener IDs de reserva/clases existentes cuando el escenario los conserva y documentar cualquier remapeo inevitable por claves semánticas. No dejar referencias huérfanas ni identidades reutilizadas incorrectamente.
- Preparar informe de destino, datasets/claves, diferencias y bloqueos sin escribir. Ejecutar solo en modo demo, con aplicación detenida para el procedimiento documentado, selección explícita y confirmación del alcance. Revalidar dentro de la transacción; detener si el estado cambió desde la revisión.
- Un calendario/aula modificado o una reserva manual ocupando un intervalo original puede impedir el reset. En ese caso informar dependencias y rechazar todo, sin corregir/eliminar datos ajenos ni restaurar calendarios silenciosamente.
- Mantener coherentes registros de dataset, operaciones recuperables y auditoría. Especificar manejo de resultados antiguos de operaciones para que no se repongan mutaciones anteriores tras un reset; el contrato técnico debe probarlo. Conservar la historia de acciones y registrar el restablecimiento explícito, sin fingir una reserva de nueva creación ni omitir trazabilidad técnica.
- El reset del alcance seleccionado es completo o no produce cambios; repetirlo deja el mismo estado funcional y no duplica. Reloj histórico demo limitado al comando, sin habilitar mutaciones retroactivas de la API.
- Ensayar primero y de forma automatizada sobre PostgreSQL aislado con el mismo esquema/servicios; no ejecutar reset sobre el proyecto compartido como consecuencia implícita de aprobar un plan o de iniciar pruebas. Antes de una ejecución remota, presentar el destino y alcance concreto para la autorización correspondiente.

El resultado es recuperación de escenarios gestionados, no un clon exacto de toda la base: los registros manuales preservados pueden alterar los totales globales. Los esperados se vinculan al manifiesto/dataset y filtros; no prometer totales globales originales tras conservar datos adicionales. Una preparación desde entorno vacío utiliza las cargas explícitas normales, no necesita borrar Auth.

### Pruebas y aceptación

Compose: app accesible por un origen, mismo comportamiento y permisos, recarga de rutas, arranque/parada/reinicio sin pérdida ni recarga automática. Reset: previsualización sin escritura, selección exacta, rechazo fuera de demo, preservación de cuentas/QA/calendarios, recuperación de escenario gestionado modificado, conflicto con reserva ajena sin borrarla, fallo inducido con rollback, repetición sin duplicados y tratamiento seguro de operaciones antiguas. Evidencia y comandos para el QA final; ninguna ejecución se da por realizada al planificar.

## Verificación final · I-06.3

Usar el paquete construido, declarar versiones/entorno/recursos y repetir regresión de permisos, consultas, operaciones I-04, impresión y cálculos. Chromium/Firefox con versiones registradas, escritorio 1366×768 y consultas Docente 390×844, teclado y zoom. Separar UI/red simulada de verificación integrada real. No causar fallos deliberados a Supabase compartido para demostrar errores.

Aplicar íntegro el protocolo de carga del [documento 11](../especificacion/11-contexto-de-demo-y-validacion.md), con datasets aislados y detalles aprobados en [I-05](i-05-consultas-e-indicadores.md): 30 aulas, dos años/cuatro cuatrimestres, 200 series por cuatrimestre, hasta 25.600 clases antes de omisiones y 500 esporádicas; 45 Docente + 5 operativas; inicio escalonado de 100 ms, calentamiento de 2 minutos, medición de 10 minutos y pausa de 5 segundos tras respuesta. Mantener ciclos/mezcla/alternancia de series y registrar auxiliares, errores y tasas. Preparar suficientes asignaciones nominales válidas por sesión.

p95 disponibilidad/listados < 1,5 s y altas/modificaciones periódicas < 2 s. Dashboard/impacto no heredan esos umbrales. Medir y declarar red/región/proveedor/recursos; una medición aislada no acredita el mismo resultado contra Supabase remoto. Si se necesita acceso externo adicional, concretarlo antes de ejecutar. No reducir carga ni ocultar errores para aprobar. Corregir resultados fallidos y registrar limitaciones sin reescribir RNF.

Completar ensayos de arranque/reinicio y reset selectivo con fallos/rollback/repetición. Los resultados antiguos de operaciones no deben reintroducir mutaciones revertidas; tratar identidades/historial/dataset de forma coherente. Mantener testigos de datos ajenos y cuentas para comprobar conservación.

## Presentación y QA · I-06.4

Plan aprobado en [QA final conjunto](qa-final-i-04-i-05-i-06.md). Orden: preparación/arranque, lectura de escenarios existentes, consultas/impresión/indicadores de referencia, operaciones nuevas de QA y comprobación de efectos, impacto de calendario dedicado, presentación y restablecimiento ensayado en entorno aislado. Preservar cobertura de cada sección de QA I-04 y aceptación separada de I-04/I-05/I-06.

Usar Chromium/Firefox con versiones registradas, escritorio 1366×768 y consultas Docente 390×844, teclado y revisión visual. Dos sesiones independientes para permisos/concurrencia. Pruebas temporales difíciles, fallos de persistencia/red y carga se acreditan por evidencia automatizada independiente, no se piden caídas deliberadas de Supabase ni modificar el reloj real.

Preparar un manifiesto con identificadores semánticos/IDs resueltos, fechas/filtros, cifras esperadas calculadas independientemente, entorno/commit y precondiciones. I-05/I-06 deben completarlo antes de entregar QA; el usuario no tiene que inventar resultados. Operaciones de QA en cursos/reservas propios; conservar datasets de referencia. Cada caso registra pendiente/aprobado/fallido/bloqueado/no ejecutado, rol, navegador, datos y evidencia; nunca inferir aceptación de una prueba automatizada.

El QA conjunto tiene pruebas compartidas y cobertura por entrega; una incidencia puede bloquear una o varias sin aceptar automáticamente ninguna. Tras corregir, repetir casos afectados y dependientes. Solo el usuario acepta cada entrega. Aprobar este bloque aprueba planificación, no ejecución ni reset remoto.

### Entregables técnicos previos al QA del usuario

Crear `avance-i-06.md`, instrucciones definitivas de Compose/configuración/arranque/parada/diagnóstico y comando de reset con revisión/confirmación; manifiesto de destino/datasets/esperados; evidencias de paquete/carga/reset y guion de presentación. Completar todos los campos operativos pendientes en la guía conjunta antes de presentarla como lista. Los ejemplos y comandos no deben depender de `/tmp` ni archivos exclusivos del implementador.

| Corte | Contrato | Condición técnica de salida | QA final |
|---|---|---|---|
| I-06.1 | Build/servicio/origen/puerto/configuración/salud y rutas | Checkout limpio→build→login→ruta profunda→reinicio; datos conservados, secretos no expuestos, desarrollo Java+Vite preservado | F01, F10, F12 |
| I-06.2 | Previsualización/reset por dataset, destino/confirmación, atomicidad y conservación | Repetición, bloqueos por datos ajenos, rollback y reintentos antiguos seguros; sin Auth destructivo ni carga/reset al arranque | F11 |
| I-06.3 | Guion/manifest/versiones/entorno y protocolo de medición | Regresión y carga reproducibles; resultados/errores/límites transparentes; verificación visual y técnica del paquete | F04, F10–11 |
| I-06.4 | Guía conjunta ejecutable y guion de presentación | Cobertura F01–F12 preparada, datos/esperados/comandos completos, resultados manuales pendientes hasta participación real del usuario | F01–F12 |

### Aceptación

La implementación puede entregarse **verificada y lista para QA**, pero no cerrar la aceptación manual en nombre del usuario. Registrar aprobación de I-04, I-05 e I-06 por separado. Faltas de credenciales/entorno o pruebas no ejecutadas se informan; no se convierten en evidencia positiva. Si una incidencia afecta varias entregas, preservar esa cobertura al corregir y repetir. El reset compartido exige autorización de destino/alcance concreto; ensayarlo aisladamente no borra ningún dato compartido.
