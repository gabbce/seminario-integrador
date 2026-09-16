-- Recovery record for explicit provisioning. No passwords or tokens.
CREATE TABLE aulas.preparacion_cuenta (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE,
    nombre text NOT NULL,
    apellido text NOT NULL,
    rol text NOT NULL CHECK (rol IN ('ADMINISTRADOR','BEDEL','DOCENTE')),
    activo boolean NOT NULL,
    auth_id uuid,
    completada boolean NOT NULL DEFAULT false
);
REVOKE ALL ON aulas.preparacion_cuenta FROM PUBLIC;
DO $$
DECLARE r text;
BEGIN
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=r) THEN
            EXECUTE format('REVOKE ALL ON aulas.preparacion_cuenta FROM %I',r);
        END IF;
    END LOOP;
END;
$$;
