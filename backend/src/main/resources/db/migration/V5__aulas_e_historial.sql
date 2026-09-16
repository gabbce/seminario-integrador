CREATE TABLE aulas.aula (
 id_aula bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 identificador text NOT NULL CHECK(btrim(identificador)<>''),
 tipo text NOT NULL CHECK(tipo IN ('General','Multimedios','Laboratorio')),
 capacidad integer NOT NULL CHECK(capacidad>0),
 estado text NOT NULL CHECK(estado IN ('Habilitada','Inhabilitada','Mantenimiento')),
 ubicacion text NOT NULL CHECK(btrim(ubicacion)<>''),piso integer NOT NULL,
 pizarron text NOT NULL CHECK(pizarron IN ('Tiza','Fibrón')),
 ventiladores boolean NOT NULL,aire boolean NOT NULL,
 baja_en timestamptz, version bigint NOT NULL DEFAULT 0,
 UNIQUE(id_aula,tipo)
);
CREATE UNIQUE INDEX aula_identificador_unico ON aulas.aula(lower(btrim(identificador)));
CREATE TABLE aulas.aula_multimedios (
 id_aula bigint PRIMARY KEY,tipo text NOT NULL DEFAULT 'Multimedios' CHECK(tipo='Multimedios'),
 televisor boolean NOT NULL,proyector boolean NOT NULL,computadora boolean NOT NULL,
 FOREIGN KEY(id_aula,tipo) REFERENCES aulas.aula(id_aula,tipo) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE aulas.aula_laboratorio (
 id_aula bigint PRIMARY KEY,tipo text NOT NULL DEFAULT 'Laboratorio' CHECK(tipo='Laboratorio'),cantidad_pc integer NOT NULL CHECK(cantidad_pc>=0),
 FOREIGN KEY(id_aula,tipo) REFERENCES aulas.aula(id_aula,tipo) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE aulas.historial_aula (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,id_aula bigint NOT NULL REFERENCES aulas.aula,
 desde timestamptz NOT NULL,hasta timestamptz,tipo text NOT NULL,estado text NOT NULL,baja boolean NOT NULL,
 CHECK(hasta IS NULL OR hasta>=desde)
);
CREATE UNIQUE INDEX historial_actual_unico ON aulas.historial_aula(id_aula) WHERE hasta IS NULL;
CREATE FUNCTION aulas.verificar_subtipo_aula() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE aid bigint; kind text; n integer;
BEGIN
 IF TG_OP='DELETE' THEN aid=OLD.id_aula;ELSE aid=NEW.id_aula;END IF;
 SELECT tipo INTO kind FROM aulas.aula WHERE id_aula=aid;
 IF NOT FOUND THEN RETURN NULL;END IF;
 SELECT (SELECT count(*) FROM aulas.aula_multimedios WHERE id_aula=aid)+(SELECT count(*) FROM aulas.aula_laboratorio WHERE id_aula=aid) INTO n;
 IF (kind='General' AND n<>0) OR (kind<>'General' AND n<>1) THEN RAISE EXCEPTION 'Subtipo de aula incompatible' USING ERRCODE='23514';END IF;
 RETURN NULL;
END;$$;
CREATE CONSTRAINT TRIGGER aula_subtipo AFTER INSERT OR UPDATE ON aulas.aula DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_subtipo_aula();
CREATE CONSTRAINT TRIGGER multimedia_subtipo AFTER INSERT OR UPDATE OR DELETE ON aulas.aula_multimedios DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_subtipo_aula();
CREATE CONSTRAINT TRIGGER laboratorio_subtipo AFTER INSERT OR UPDATE OR DELETE ON aulas.aula_laboratorio DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_subtipo_aula();
REVOKE ALL ON aulas.aula,aulas.aula_multimedios,aulas.aula_laboratorio,aulas.historial_aula FROM PUBLIC;
