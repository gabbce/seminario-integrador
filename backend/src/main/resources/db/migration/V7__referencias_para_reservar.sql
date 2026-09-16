CREATE TABLE aulas.materia (
 id_materia bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 nombre text NOT NULL CHECK (btrim(nombre) <> ''),
 nombre_normalizado text NOT NULL UNIQUE CHECK (btrim(nombre_normalizado) <> '')
);
CREATE TABLE aulas.curso (
 id_curso bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_materia bigint NOT NULL REFERENCES aulas.materia,
 id_anio_lectivo bigint NOT NULL REFERENCES aulas.anio_lectivo,
 comision text NOT NULL CHECK (btrim(comision) <> ''),
 UNIQUE (id_materia, comision, id_anio_lectivo)
);
CREATE INDEX curso_por_anio ON aulas.curso(id_anio_lectivo);
REVOKE ALL ON aulas.materia, aulas.curso FROM PUBLIC;
