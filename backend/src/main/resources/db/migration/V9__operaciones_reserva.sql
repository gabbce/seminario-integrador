CREATE TABLE aulas.operacion_reserva (
 actor bigint NOT NULL REFERENCES aulas.usuario,
 clave uuid NOT NULL,
 contenido text NOT NULL,
 id_reserva bigint NOT NULL UNIQUE REFERENCES aulas.reserva,
 creada_en timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(actor,clave)
);
REVOKE ALL ON aulas.operacion_reserva FROM PUBLIC;
