-- Multiple edits per reservation; creation ledger V9 remains unchanged.
CREATE TABLE aulas.mutacion_reserva (
 actor bigint NOT NULL REFERENCES aulas.usuario,
 clave uuid NOT NULL,
 tipo text NOT NULL,
 id_reserva bigint NOT NULL REFERENCES aulas.reserva,
 contenido text NOT NULL,
 resultado jsonb NOT NULL,
 creada_en timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(actor,clave)
);
REVOKE ALL ON aulas.mutacion_reserva FROM PUBLIC;
