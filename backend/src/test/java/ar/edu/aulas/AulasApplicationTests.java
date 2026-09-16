package ar.edu.aulas;

import static org.assertj.core.api.Assertions.*;

import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@Testcontainers
class AulasApplicationTests {
    @Container
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17.6-alpine")
        .withInitScript("supabase-roles.sql");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", postgres::getJdbcUrl);
        properties.add("spring.datasource.username", postgres::getUsername);
        properties.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired DataSource dataSource;
    @Autowired Flyway flyway;

    @Test
    void migrationsAreRepeatableAndOnlyManageDomain() throws Exception {
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            try (var r = s.executeQuery("select count(*) from information_schema.tables where table_schema='aulas' and table_name in ('usuario','administrador','bedel','docente')")) {
                r.next(); assertThat(r.getInt(1)).isEqualTo(4);
            }
            try (var r = s.executeQuery("select marker from auth.protected_fixture")) {
                r.next(); assertThat(r.getString(1)).isEqualTo("unchanged");
            }
        }
    }

    @Test
    void profilesMustMatchRoleAndExistAtCommit() throws Exception {
        try (var c = dataSource.getConnection()) {
            c.setAutoCommit(false);
            long id = insertUser(c, "BEDEL", "bedel@test.local");
            execute(c, "insert into aulas.bedel(id_usuario,turno) values ("+id+",'TARDE')");
            c.commit();
            execute(c, "delete from aulas.bedel where id_usuario="+id);
            assertThatThrownBy(c::commit).isInstanceOf(SQLException.class);
            c.rollback();
            execute(c, "update aulas.usuario set rol='DOCENTE' where id_usuario="+id);
            execute(c, "delete from aulas.bedel where id_usuario="+id);
            execute(c, "insert into aulas.docente(id_usuario,legajo) values ("+id+",'D-1')");
            c.commit();
            execute(c, "insert into aulas.administrador(id_usuario) values ("+id+")");
            assertThatThrownBy(c::commit).isInstanceOf(SQLException.class);
            c.rollback();
        }
    }

    @Test
    void identityAndEmailCannotBeDuplicatedAndOrphansAreRejected() throws Exception {
        try (var c = dataSource.getConnection()) {
            c.setAutoCommit(false);
            long id = insertUser(c, "ADMINISTRADOR", "admin@test.local");
            execute(c, "insert into aulas.administrador(id_usuario) values ("+id+")");
            c.commit();
            assertThatThrownBy(() -> insertUser(c,"DOCENTE","ADMIN@test.local"))
                .isInstanceOf(SQLException.class);
            c.rollback();
            assertThatThrownBy(() -> execute(c,"insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) select supabase_auth_id,'other@test.local','Otro','Usuario','DOCENTE' from aulas.usuario where id_usuario="+id))
                .isInstanceOf(SQLException.class);
            c.rollback();
            insertUser(c, "DOCENTE", "orphan@test.local");
            assertThatThrownBy(c::commit).isInstanceOf(SQLException.class);
            c.rollback();
        }
    }

    @Test
    void publicAuthRolesCannotAccessDomain() throws Exception {
        for (String role : new String[]{"anon", "authenticated"}) {
            try (var c = dataSource.getConnection()) {
                execute(c,"set role "+role);
                assertThatThrownBy(() -> execute(c,"select * from aulas.usuario"))
                    .isInstanceOf(SQLException.class);
                execute(c,"reset role");
            }
        }
    }

    private long insertUser(Connection c, String role, String email) throws SQLException {
        try (var s = c.prepareStatement("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'Nombre','Apellido',?) returning id_usuario")) {
            s.setObject(1, java.util.UUID.randomUUID()); s.setString(2,email); s.setString(3,role);
            try(var r=s.executeQuery()) { r.next(); return r.getLong(1); }
        }
    }
    private void execute(Connection c, String sql) throws SQLException {
        try(var s=c.createStatement()) { s.execute(sql); }
    }
}
