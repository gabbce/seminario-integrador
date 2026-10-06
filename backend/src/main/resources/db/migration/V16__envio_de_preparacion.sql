-- Marks the attempt that is sending the Auth create of a preparation. A definitive rejection
-- frees the e-mail only when no other attempt can still be creating the identity.
ALTER TABLE aulas.preparacion_cuenta ADD COLUMN envio uuid, ADD COLUMN envio_desde timestamptz;
