-- Own-actor idempotency for aggregate calendar changes, independent of reservation ledgers.
CREATE TABLE aulas.operacion_calendario (
 actor bigint NOT NULL REFERENCES aulas.usuario,
 clave uuid NOT NULL,
 id_anio_lectivo bigint NOT NULL,
 contenido text NOT NULL,
 resultado jsonb NOT NULL,
 creada_en timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(actor,clave)
);
REVOKE ALL ON aulas.operacion_calendario FROM PUBLIC;
