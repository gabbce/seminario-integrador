-- Preserve original dataset aggregates and operation evidence across an explicit demo reset.
ALTER TABLE aulas.demo_reserva ADD COLUMN snapshot_original jsonb;
ALTER TABLE aulas.operacion_reserva ADD COLUMN invalidada_en timestamptz;
ALTER TABLE aulas.mutacion_reserva ADD COLUMN invalidada_en timestamptz;
ALTER TABLE aulas.operacion_calendario ADD COLUMN invalidada_en timestamptz;
