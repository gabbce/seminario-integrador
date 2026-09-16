-- Test-only stand-ins: migrations must not own or modify Auth's schema.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE SCHEMA auth;
CREATE TABLE auth.protected_fixture(marker text);
INSERT INTO auth.protected_fixture VALUES ('unchanged');
