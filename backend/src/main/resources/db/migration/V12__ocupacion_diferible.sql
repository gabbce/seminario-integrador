-- Conserva la misma exclusión; permite intercambios atómicos entre aulas.
-- El comportamiento habitual sigue siendo inmediato.
DO $$
DECLARE previous_name text;
BEGIN
 SELECT conname INTO STRICT previous_name FROM pg_constraint
 WHERE conrelid='aulas.detalle_reserva'::regclass AND contype='x';
 EXECUTE format('ALTER TABLE aulas.detalle_reserva DROP CONSTRAINT %I',previous_name);
END $$;
ALTER TABLE aulas.detalle_reserva ADD CONSTRAINT detalle_reserva_sin_solapamiento
 EXCLUDE USING gist (
  int8range(id_aula,id_aula,'[]') WITH &&,
  tsrange(fecha+hora_inicio,fecha+hora_inicio+cantidad_modulos*interval '30 minutes','[)') WITH &&
 ) WHERE (estado='CONFIRMADA') DEFERRABLE INITIALLY IMMEDIATE;
