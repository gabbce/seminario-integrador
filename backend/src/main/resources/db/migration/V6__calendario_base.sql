CREATE TABLE aulas.anio_lectivo (
 id_anio_lectivo bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 anio_calendario integer NOT NULL UNIQUE CHECK (anio_calendario BETWEEN 1 AND 9999),
 estado text NOT NULL DEFAULT 'EN_PREPARACION' CHECK (estado IN ('EN_PREPARACION','HABILITADO','CERRADO')),
 version bigint NOT NULL DEFAULT 0 CHECK (version >= 0)
);
CREATE TABLE aulas.cuatrimestre (
 id_cuatrimestre bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_anio_lectivo bigint NOT NULL REFERENCES aulas.anio_lectivo,
 numero integer NOT NULL CHECK (numero IN (1,2)),
 inicio date,
 fin date,
 UNIQUE (id_anio_lectivo, numero),
 CHECK (inicio IS NOT NULL OR fin IS NOT NULL),
 CHECK (inicio IS NULL OR fin IS NULL OR inicio <= fin)
);
CREATE TABLE aulas.feriado (
 id_feriado bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_anio_lectivo bigint NOT NULL REFERENCES aulas.anio_lectivo,
 fecha date NOT NULL,
 descripcion text NOT NULL CHECK (btrim(descripcion) <> ''),
 UNIQUE (id_anio_lectivo, fecha)
);
REVOKE ALL ON aulas.anio_lectivo, aulas.cuatrimestre, aulas.feriado FROM PUBLIC;
