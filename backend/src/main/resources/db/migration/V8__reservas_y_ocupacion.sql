-- La preparación consulta ocupación; las altas operativas corresponden a I-03.2.
CREATE TABLE aulas.reserva (
 id_reserva bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 registrado_por bigint NOT NULL REFERENCES aulas.usuario,
 id_curso bigint NOT NULL REFERENCES aulas.curso,
 docente_externo_id text NOT NULL, nombre_docente text NOT NULL,
 apellido_docente text NOT NULL, email_docente text NOT NULL,
 cantidad_alumnos integer NOT NULL CHECK(cantidad_alumnos>0),
 tipo_aula text NOT NULL CHECK(tipo_aula IN ('General','Multimedios','Laboratorio')),
 pizarron text CHECK(pizarron IN ('Tiza','Fibrón')),
 recursos text[] NOT NULL DEFAULT '{}',
 fecha_registro timestamptz NOT NULL DEFAULT now(),
 estado text NOT NULL DEFAULT 'CONFIRMADA' CHECK(estado IN ('CONFIRMADA','CANCELADA')),
 version bigint NOT NULL DEFAULT 0 CHECK(version>=0)
);
CREATE TABLE aulas.reserva_periodica (
 id_reserva bigint PRIMARY KEY REFERENCES aulas.reserva,
 modalidad text NOT NULL CHECK(modalidad IN ('CUATRIMESTRAL','ANUAL')),
 continuidad_cancelada_en timestamptz
);
CREATE TABLE aulas.reserva_esporadica (id_reserva bigint PRIMARY KEY REFERENCES aulas.reserva);
CREATE TABLE aulas.periodo_asignado (
 id_reserva bigint NOT NULL REFERENCES aulas.reserva_periodica,
 id_cuatrimestre bigint NOT NULL REFERENCES aulas.cuatrimestre,
 PRIMARY KEY(id_reserva,id_cuatrimestre)
);
CREATE TABLE aulas.patron_semanal (
 id_patron bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_reserva bigint NOT NULL REFERENCES aulas.reserva_periodica,
 dia integer NOT NULL CHECK(dia BETWEEN 1 AND 5),
 hora_inicio time NOT NULL,
 cantidad_modulos integer NOT NULL CHECK(cantidad_modulos BETWEEN 1 AND 32),
 id_aula bigint NOT NULL REFERENCES aulas.aula,
 UNIQUE(id_reserva,dia), UNIQUE(id_patron,id_reserva),
 CHECK(hora_inicio >= time '07:00' AND extract(epoch FROM hora_inicio) + cantidad_modulos*1800 <= 82800),
 CHECK(extract(second FROM hora_inicio)=0 AND extract(minute FROM hora_inicio) IN (0,30))
);
CREATE TABLE aulas.fecha_excluida (
 id_reserva bigint NOT NULL REFERENCES aulas.reserva_periodica,
 fecha date NOT NULL,
 PRIMARY KEY(id_reserva,fecha)
);
CREATE TABLE aulas.detalle_reserva (
 id_detalle bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_reserva bigint NOT NULL REFERENCES aulas.reserva,
 id_aula bigint NOT NULL REFERENCES aulas.aula,
 fecha date NOT NULL, hora_inicio time NOT NULL,
 cantidad_modulos integer NOT NULL CHECK(cantidad_modulos BETWEEN 1 AND 32),
 estado text NOT NULL DEFAULT 'CONFIRMADA' CHECK(estado IN ('CONFIRMADA','CANCELADA')),
 motivo_cancelacion text, cancelado_en timestamptz, cancelado_por bigint REFERENCES aulas.usuario,
 id_patron bigint, fecha_original date,
 FOREIGN KEY(id_patron,id_reserva) REFERENCES aulas.patron_semanal(id_patron,id_reserva),
 UNIQUE(id_reserva,fecha_original),
 CHECK((id_patron IS NULL)=(fecha_original IS NULL)),
 CHECK(extract(isodow FROM fecha) BETWEEN 1 AND 5),
 CHECK(hora_inicio >= time '07:00' AND extract(epoch FROM hora_inicio) + cantidad_modulos*1800 <= 82800),
 CHECK(extract(second FROM hora_inicio)=0 AND extract(minute FROM hora_inicio) IN (0,30)),
 CHECK(estado <> 'CANCELADA' OR (nullif(btrim(motivo_cancelacion),'') IS NOT NULL AND cancelado_en IS NOT NULL AND cancelado_por IS NOT NULL)),
 EXCLUDE USING gist (int8range(id_aula,id_aula,'[]') WITH &&, tsrange(fecha+hora_inicio,fecha+hora_inicio+cantidad_modulos*interval '30 minutes','[)') WITH &&) WHERE (estado='CONFIRMADA')
);
CREATE INDEX detalle_ocupacion ON aulas.detalle_reserva(fecha,id_aula) WHERE estado='CONFIRMADA';
REVOKE ALL ON aulas.reserva,aulas.reserva_periodica,aulas.reserva_esporadica,aulas.periodo_asignado,aulas.patron_semanal,aulas.fecha_excluida,aulas.detalle_reserva FROM PUBLIC;

-- Diferidos para crear cabecera y especialización dentro de la misma transacción.
CREATE FUNCTION aulas.verificar_modelo_reserva() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rid bigint; periodic boolean; sporadic boolean; expected integer; course_year bigint;
BEGIN
 IF TG_OP='DELETE' THEN rid=OLD.id_reserva; ELSE rid=NEW.id_reserva; END IF;
 SELECT c.id_anio_lectivo INTO course_year FROM aulas.reserva r JOIN aulas.curso c USING(id_curso) WHERE r.id_reserva=rid;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT EXISTS(SELECT 1 FROM aulas.reserva_periodica WHERE id_reserva=rid),EXISTS(SELECT 1 FROM aulas.reserva_esporadica WHERE id_reserva=rid) INTO periodic,sporadic;
 IF periodic=sporadic THEN RAISE EXCEPTION 'La reserva requiere exactamente una modalidad' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM aulas.detalle_reserva WHERE id_reserva=rid) THEN RAISE EXCEPTION 'La reserva requiere al menos un detalle' USING ERRCODE='23514'; END IF;
 IF periodic THEN
  IF NOT EXISTS(SELECT 1 FROM aulas.patron_semanal WHERE id_reserva=rid) THEN RAISE EXCEPTION 'La periódica requiere al menos un patrón' USING ERRCODE='23514'; END IF;
  SELECT CASE modalidad WHEN 'ANUAL' THEN 2 ELSE 1 END INTO expected FROM aulas.reserva_periodica WHERE id_reserva=rid;
  IF (SELECT count(*) FROM aulas.periodo_asignado WHERE id_reserva=rid)<>expected OR EXISTS(
   SELECT 1 FROM aulas.periodo_asignado p JOIN aulas.cuatrimestre c USING(id_cuatrimestre) WHERE p.id_reserva=rid AND c.id_anio_lectivo<>course_year
  ) THEN RAISE EXCEPTION 'Los períodos deben corresponder a modalidad y año del curso' USING ERRCODE='23514'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM aulas.detalle_reserva d WHERE d.id_reserva=rid AND (
  (periodic AND d.id_patron IS NULL) OR (sporadic AND d.id_patron IS NOT NULL)
  OR (periodic AND NOT EXISTS(SELECT 1 FROM aulas.patron_semanal p WHERE p.id_patron=d.id_patron AND p.dia=extract(isodow FROM d.fecha_original)))
 )) THEN RAISE EXCEPTION 'El origen del detalle debe corresponder a su modalidad y día semanal' USING ERRCODE='23514'; END IF;
 RETURN NULL;
END;$$;
CREATE CONSTRAINT TRIGGER reserva_modelo AFTER INSERT OR UPDATE ON aulas.reserva DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_modelo_reserva();
CREATE CONSTRAINT TRIGGER periodica_modelo AFTER INSERT OR UPDATE OR DELETE ON aulas.reserva_periodica DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_modelo_reserva();
CREATE CONSTRAINT TRIGGER esporadica_modelo AFTER INSERT OR UPDATE OR DELETE ON aulas.reserva_esporadica DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_modelo_reserva();
CREATE CONSTRAINT TRIGGER periodo_reserva_modelo AFTER INSERT OR UPDATE OR DELETE ON aulas.periodo_asignado DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_modelo_reserva();
CREATE CONSTRAINT TRIGGER detalle_reserva_modelo AFTER INSERT OR UPDATE OR DELETE ON aulas.detalle_reserva DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_modelo_reserva();
CREATE CONSTRAINT TRIGGER patron_reserva_modelo AFTER INSERT OR UPDATE OR DELETE ON aulas.patron_semanal DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_modelo_reserva();
