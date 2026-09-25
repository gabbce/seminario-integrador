-- Esporádicas también conservan su fecha original al reprogramarse.
DO $$
DECLARE previous_name text;
BEGIN
 SELECT conname INTO STRICT previous_name FROM pg_constraint
 WHERE conrelid='aulas.detalle_reserva'::regclass AND contype='c'
 AND pg_get_constraintdef(oid) LIKE '%id_patron IS NULL%fecha_original IS NULL%';
 EXECUTE format('ALTER TABLE aulas.detalle_reserva DROP CONSTRAINT %I',previous_name);
END $$;
ALTER TABLE aulas.detalle_reserva ADD CONSTRAINT detalle_origen_periodico
 CHECK (id_patron IS NULL OR fecha_original IS NOT NULL);
CREATE FUNCTION aulas.proteger_origen_detalle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.fecha_original IS NOT NULL AND NEW.fecha_original IS DISTINCT FROM OLD.fecha_original THEN
  RAISE EXCEPTION 'La fecha original de una clase es inmutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;$$;
CREATE TRIGGER detalle_origen_inmutable BEFORE UPDATE ON aulas.detalle_reserva
 FOR EACH ROW EXECUTE FUNCTION aulas.proteger_origen_detalle();
