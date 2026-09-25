# Confirmación periódica: integridad y concurrencia

La confirmación usa una transacción READ COMMITTED. Todas las escrituras que compiten por elegibilidad comparten este orden de bloqueo: fila `control_cuentas`, año lectivo, aulas por ID ascendente, operación/reserva. Las operaciones que no utilizan un recurso omiten ese paso, sin invertir el orden. La edición de aula adquiere primero `control_cuentas` y después su aula; calendario ya adquiría permisos y año. La administración de identidad mantiene su bloqueo de permisos. La serialización de estas mutaciones es deliberada para este volumen; no se agrega infraestructura.

Bajo el bloqueo de permisos, se valida nuevamente el rol activo. Se busca una operación ya confirmada por `(actor, UUID)` antes de recalcular fechas u ocupación: el reintento no entra en conflicto con su propia reserva. El contenido canónico normaliza listas por orden y pizarrón vacío; la clave no puede representar otro pedido. El resultado y su referencia se guardan en la misma transacción que cabecera, períodos, patrones, exclusiones, detalles y auditoría. El registro de operación no almacena credenciales.

Después de bloquear año y aulas se repite la preparación dentro de esa misma transacción READ COMMITTED. Deben coincidir versión del calendario, fechas revisadas por patrón, versión del aula elegida y disponibilidad. El tiempo institucional puede invalidar una fecha, pero nunca reduce silenciosamente el conjunto confirmado. Los detalles y exclusiones se insertan en lotes. V8 aporta exclusión GiST con extremos `[inicio, fin)` e invariantes diferidas; V9 agrega la identidad de operación sin modificar la migración aplicada.

GET de operación se limita al actor autenticado. `found=false` también puede significar que otro POST sigue pendiente; el cliente mantiene clave y cuerpo inmóviles y permite comprobar o repetir la misma operación. Solo un rechazo conocido libera el intento para revisar una propuesta nueva. Un timeout o error técnico no se presenta como fracaso confirmado.

Las modificaciones administrativas comprueban requisitos de clases futuras/en curso y relaciones históricas. Para calendario, la transición aprobada en I-03 rechaza cambios que exigirían nuevas clases; no guarda una ampliación incompleta. Los cambios sin ese efecto y sin invalidar detalles registrados siguen permitidos. La generación conjunta de series pertenece a I-04.

Las lecturas I-03 son una colección mínima sin paginación más consulta directa por ID. El servidor omite contactos y registrador del JSON de Docente. I-05 conserva consultas completas y paginación; I-04 conserva edición y cancelación.

## Esporádicas (I-04.1)

[Contrato esporádico](esporadicas.openapi.yaml): preparación por fecha concreta y confirmación atómica con el mismo orden de bloqueo e identidad `(actor, UUID)` de las altas periódicas. El contenido canónico empieza por `SPORADIC` y ordena fechas, selecciones y recursos. La confirmación revalida fecha/inicio futuro, apertura, feriados, año, requisitos, versiones y disponibilidad; receso permitido. Se guarda la especialización esporádica y sus detalles junto con operación y auditoría, sin patrones. GET de operación y lecturas existentes recuperan el resultado con la privacidad vigente. Las pruebas concurrentes y de rollback usan PostgreSQL aislado; ver evidencia de acceso real en [avance I-04](../planificacion/avance-i-04.md).

## I-04.2 · Cancelación

Contrato: `cancelaciones.openapi.yaml`. La selección usa IDs persistidos y versión, nunca índices ni un filtro dinámico «todas». Una revisión coherente muestra fechas/aulas y cese de continuidad; no escribe. La confirmación serializa con `control_cuentas → año → aulas ascendentes → reserva`, revalida permisos y tiempo tras bloquear y guarda detalles, cabecera, auditoría y resultado juntos. La cancelación libera espacio aun si el año dejó de estar habilitado; no altera calendario ni requisitos.

V11 crea `mutacion_reserva`, separado del ledger de altas V9 (que limita una operación por reserva). Un actor/UUID identifica tipo, reserva y contenido normalizado; múltiples mutaciones de una reserva tienen claves distintas. Recuperación devuelve el resultado inmutable sin contactos, no una copia obsoleta de la reserva. La UI consulta el detalle actual tras éxito. Una respuesta incierta conserva UUID y cuerpo: `found=false` no habilita una nueva clave ni edición silenciosa. Cancelar la última futura de una periódica registra continuidad cancelada; terminar naturalmente no lo hace.

## I-04.3a · Cabecera

Contrato: `cabecera-reserva.openapi.yaml`. Reutiliza V11 con tipo `EDITAR_CABECERA`, sin cambiar migraciones. Bloquea permisos, año, aulas ascendentes y reserva; revalida rol, versión, año habilitado e inicio después de esperar. Ningún detalle (incluidos cancelados) puede haber iniciado, y debe existir al menos uno vigente. Verifica todas las aulas vigentes contra requisitos nuevos, sin reasignarlas ni alterar detalles/patrones. La cabecera, historial y resultado inmutable se confirman juntos. La lectura de historial agrega una consulta agrupada solo para operadores (siete consultas independientemente de cantidad de reservas); Docente conserva seis y nunca recibe `changes`, contactos ni registrador. La carrera real entre edición y cancelación se prueba con PostgreSQL aislado: una sola versión gana.

## I-04.3b · Aulas

Contrato: `cambio-aulas.openapi.yaml`. Revisión coherente por IDs de detalle/grupo; periódicas comparan exactamente el conjunto futuro vigente del patrón, incluyendo fechas reprogramadas. Confirmación mantiene el orden de bloqueo común, bloquea aulas actuales y propuestas ordenadas, revalida reloj tras espera, requisitos, versiones y ocupación. Compara ocupación externa y superposición interna. V12 conserva GiST con iguales rangos y condición, pero permite diferir su comprobación dentro de la transacción para intercambios de aulas; se fuerza IMMEDIATE después de actualizar el conjunto y antes de registrar resultado. Pasadas/canceladas no se alteran. Patrón/detalles/versión/historial/ledger V11 se confirman juntos. Resultado original recuperable después de cambios posteriores; solo actores operativos reciben historial.

## I-04.4 · Reprogramación

Contrato: `reprogramacion.openapi.yaml`. El conjunto usa IDs de detalles, fechas/inicios/módulos y versión; revisión agrega versiones de calendario y aulas fijas. Confirmación mantiene orden global y revalida reloj al terminar de bloquear. Conserva patrón, aula y origen; V13 admite origen esporádico y prohíbe modificar uno ya fijado. V12 permite intercambio de fechas entre clases seleccionadas sin fallar en estados intermedios, con exclusión forzada antes de ledger/auditoría. Se rechazan fechas vigentes duplicadas de la misma reserva, conflictos externos, períodos/feriados y requisitos inválidos. Tras incertidumbre la UI conserva UUID/cuerpo y reconstruye la propuesta por ID persistido si una lectura posterior cambió el orden del detalle.
