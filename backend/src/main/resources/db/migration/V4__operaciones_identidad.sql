CREATE TABLE aulas.operacion_identidad (
 id uuid PRIMARY KEY,
 actor bigint NOT NULL REFERENCES aulas.usuario(id_usuario),
 tipo text NOT NULL CHECK(tipo IN ('ALTA','EMAIL','PASSWORD')),
 usuario_id bigint REFERENCES aulas.usuario(id_usuario),
 solicitud jsonb NOT NULL,
 estado text NOT NULL CHECK(estado IN ('PREPARADA','ENVIADA','CONFIRMADA','COMPLETA','RECHAZADA')) DEFAULT 'PREPARADA',
 creado_en timestamptz NOT NULL DEFAULT current_timestamp
);
CREATE UNIQUE INDEX identidad_cambio_pendiente ON aulas.operacion_identidad(usuario_id)
 WHERE usuario_id IS NOT NULL AND estado IN ('PREPARADA','ENVIADA','CONFIRMADA');
REVOKE ALL ON aulas.operacion_identidad FROM PUBLIC;
