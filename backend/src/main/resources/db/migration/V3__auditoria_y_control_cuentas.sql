CREATE TABLE aulas.evento_auditoria (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor bigint REFERENCES aulas.usuario(id_usuario),
 instante timestamptz NOT NULL DEFAULT current_timestamp,
 operacion text NOT NULL,
 entidad text NOT NULL,
 entidad_id bigint NOT NULL,
 resultado text NOT NULL,
 detalle text NOT NULL DEFAULT ''
);
-- Serializes account mutations, including the last-active-admin invariant.
CREATE TABLE aulas.control_cuentas (id integer PRIMARY KEY CHECK (id=1));
INSERT INTO aulas.control_cuentas VALUES (1);
REVOKE ALL ON aulas.evento_auditoria, aulas.control_cuentas FROM PUBLIC;
