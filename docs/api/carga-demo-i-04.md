# Contrato de carga demo I-04

Comando explícito `seed-operacion-i04`, solo `AULAS_ENVIRONMENT=demo`, modo no web. Recurso independiente `demo/operacion-i04-v1.json`, dataset `operacion-i04`, versión 1. Ocho identidades nuevas, 69 detalles; ningún cambio a definición ni registros de `reservas-i03`.

Reutiliza registro V10 por dataset/clave. Antes de validar disponibilidad recupera identidades existentes: mismo dataset/clave siempre conserva reserva. Detecta definición/snapshot diferente e informa discrepancia sin sobreescribir. Una nueva versión no restaura datos manuales. Claves retiradas conservadas e informadas.

La carga entera es una transacción READ_COMMITTED: permiso actual/actor Admin activo de menor ID, todos los años ascendentes, todas las aulas iniciales/destino ascendentes, altas y operaciones existentes con reloj histórico limitado al comando. Fechas periódicas explícitas deben coincidir con calendario actual. Faltante, conflicto o fallo de auditoría revierte todas las nuevas reservas y acciones de esa ejecución. HTTP/UI mantienen reloj institucional real. No toca Auth ni contraseñas ni crea cuentas.

Requisitos: catálogo I02, aulas103/105 habilitadas, curso Historia A2026/2027, docentes de referencia. Escenarios: receso2027; cancelación esporádica parcial/total; cambioaula esporádico; origen esporádico; patrón periódico reasignado con cancelación parcial y reprogramación; continuidad periódica2026cancelada; anual2027. Evidencia individual, repetición conotroactor y conservación de cambios manuales; rollback por conflicto/auditoría; arranque normal sin carga.
