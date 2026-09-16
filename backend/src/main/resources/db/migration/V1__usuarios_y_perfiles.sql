-- Flyway owns only this domain schema. Supabase Auth remains external.
REVOKE ALL ON SCHEMA aulas FROM PUBLIC;

CREATE TABLE aulas.usuario (
    id_usuario bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    supabase_auth_id uuid NOT NULL UNIQUE,
    email text NOT NULL CHECK (btrim(email) <> ''),
    nombre text NOT NULL CHECK (btrim(nombre) <> ''),
    apellido text NOT NULL CHECK (btrim(apellido) <> ''),
    rol text NOT NULL CHECK (rol IN ('ADMINISTRADOR','BEDEL','DOCENTE')),
    activo boolean NOT NULL DEFAULT true,
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    UNIQUE (id_usuario, rol)
);
CREATE UNIQUE INDEX usuario_email_unico ON aulas.usuario (lower(btrim(email)));

CREATE TABLE aulas.administrador (
    id_usuario bigint PRIMARY KEY,
    rol text NOT NULL DEFAULT 'ADMINISTRADOR' CHECK (rol = 'ADMINISTRADOR'),
    FOREIGN KEY (id_usuario, rol) REFERENCES aulas.usuario(id_usuario, rol)
        DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE aulas.bedel (
    id_usuario bigint PRIMARY KEY,
    rol text NOT NULL DEFAULT 'BEDEL' CHECK (rol = 'BEDEL'),
    turno text CHECK (turno IN ('MAÑANA','TARDE','NOCHE')),
    FOREIGN KEY (id_usuario, rol) REFERENCES aulas.usuario(id_usuario, rol)
        DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE aulas.docente (
    id_usuario bigint PRIMARY KEY,
    rol text NOT NULL DEFAULT 'DOCENTE' CHECK (rol = 'DOCENTE'),
    legajo text,
    FOREIGN KEY (id_usuario, rol) REFERENCES aulas.usuario(id_usuario, rol)
        DEFERRABLE INITIALLY DEFERRED
);

-- Deferred checks allow creating/changing the specialization in one transaction.
-- Composite FKs enforce the matching role; this check enforces existence.
CREATE FUNCTION aulas.verificar_perfil() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    ids bigint[];
    usuario_id bigint;
    cantidad integer;
BEGIN
    IF TG_OP = 'INSERT' THEN ids := ARRAY[NEW.id_usuario];
    ELSIF TG_OP = 'DELETE' THEN ids := ARRAY[OLD.id_usuario];
    ELSE ids := ARRAY[OLD.id_usuario, NEW.id_usuario]; END IF;
    FOREACH usuario_id IN ARRAY ids LOOP
        IF EXISTS (SELECT 1 FROM aulas.usuario WHERE id_usuario = usuario_id) THEN
            SELECT count(*) INTO cantidad FROM (
                SELECT id_usuario FROM aulas.administrador WHERE id_usuario = usuario_id
                UNION ALL SELECT id_usuario FROM aulas.bedel WHERE id_usuario = usuario_id
                UNION ALL SELECT id_usuario FROM aulas.docente WHERE id_usuario = usuario_id
            ) perfiles;
            IF cantidad <> 1 THEN
                RAISE EXCEPTION 'El usuario requiere exactamente un perfil compatible'
                    USING ERRCODE = '23514';
            END IF;
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER usuario_perfil AFTER INSERT OR UPDATE OR DELETE ON aulas.usuario
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_perfil();
CREATE CONSTRAINT TRIGGER administrador_perfil AFTER INSERT OR UPDATE OR DELETE ON aulas.administrador
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_perfil();
CREATE CONSTRAINT TRIGGER bedel_perfil AFTER INSERT OR UPDATE OR DELETE ON aulas.bedel
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_perfil();
CREATE CONSTRAINT TRIGGER docente_perfil AFTER INSERT OR UPDATE OR DELETE ON aulas.docente
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION aulas.verificar_perfil();

REVOKE ALL ON ALL TABLES IN SCHEMA aulas FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA aulas FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA aulas FROM PUBLIC;
-- Supabase roles exist remotely; plain PostgreSQL tests may omit them.
DO $$
DECLARE auth_role text;
BEGIN
    FOREACH auth_role IN ARRAY ARRAY['anon','authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = auth_role) THEN
            EXECUTE format('REVOKE ALL ON SCHEMA aulas FROM %I', auth_role);
            EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA aulas FROM %I', auth_role);
            EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA aulas FROM %I', auth_role);
            EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA aulas FROM %I', auth_role);
        END IF;
    END LOOP;
END;
$$;
