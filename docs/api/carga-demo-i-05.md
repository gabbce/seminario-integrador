# Carga aditiva I-05

Contrato previo a implementación. Comando `seed-volumen-i05`, solo `AULAS_ENVIRONMENT=demo` y `spring.main.web-application-type=none`. Dataset `volumen-i05`, versión1, claves deterministas, reloj histórico2026-01-01 limitado al comando. Definición JSON versionada generada por script reproducible sin aleatoriedad.

Al menos3000 detalles adicionales, catálogos existentes. Reservas periódicas2026 segundo,2027 primero y anuales2027; esporádicas de receso, exclusiones, cancelación y reprogramación. Sin cambios de calendarios/historia/cuentas. Prohibido ocupar añoQA2029; reservar franjas de QA I03/I04. Antes/después se comparan inventario anterior íntegro y consultas de disponibilidad protegidas.

Reutiliza preparación/confirmación/mutaciones del dominio dentro de una transacción exterior. Las fechas efectivas deben coincidir con la definición. Conflicto, referencia faltante o calendario divergente revierte todas las nuevas altas. Repetir recupera identidades registradas antes de consultar disponibilidad; no duplica ni restaura modificaciones. Discrepancias se informan; si hay nuevas claves pendientes junto a discrepancias se rechaza todo el complemento.

La carga nunca se ejecuta al arrancar. No es un reset ni el conjunto RNF de30 aulas. Manifiesto de recuentos, filtros y resultados independientes en `docs/planificacion/datos-demo-i-05.md`; inventario verificable mediante herramientas de QA. Carga remota aditiva solo después de validación aislada y comparación de intervalos con inventario real.
