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


    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Autowired org.springframework.transaction.PlatformTransactionManager manager;

    static class FakeAuth implements ar.edu.aulas.accounts.AuthAdmin {
        final java.util.Map<String,Identity> users=new java.util.HashMap<>();
        int creates; boolean uncertain;
        public java.util.Optional<Identity> findByEmail(String email) {
            assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return java.util.Optional.ofNullable(users.get(email));
        }
        public java.util.Optional<Identity> findById(java.util.UUID id) {
            assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return users.values().stream().filter(u->u.id().equals(id)).findFirst();
        }
        public Identity create(ar.edu.aulas.accounts.AccountSpec a,String password,java.util.UUID op) {
            assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            creates++;
            var identity=new Identity(java.util.UUID.randomUUID(),a.email(),op.toString());
            users.put(a.email(),identity);
            if (uncertain) { uncertain=false; throw new IllegalStateException("timeout simulado"); }
            return identity;
        }
    }
    private ar.edu.aulas.accounts.AccountSpec spec(String email) {
        return new ar.edu.aulas.accounts.AccountSpec(email,"Nombre","Apellido","DOCENTE",true);
    }
    @Test void provisioningRepeatsWithoutRecreatingOrChangingProfile() {
        var auth=new FakeAuth(); var service=new ar.edu.aulas.accounts.AccountProvisioner(jdbc,manager,auth);
        var account=spec("repeat@test.local"); var id=service.prepare(account,"Primera123");
        assertThat(service.prepare(account,"Diferente123")).isEqualTo(id);
        assertThat(auth.creates).isEqualTo(1);
        jdbc.update("update aulas.usuario set activo=false where supabase_auth_id=?",id);
        assertThatThrownBy(()->service.prepare(account,"Diferente123")).hasMessageContaining("no lo sobrescribe");
        assertThat(jdbc.queryForObject("select activo from aulas.usuario where supabase_auth_id=?",Boolean.class,id)).isFalse();
    }
    @Test void provisioningRecoversUncertainRemoteResultAndRejectsForeignIdentity() {
        var auth=new FakeAuth(); auth.uncertain=true;
        var service=new ar.edu.aulas.accounts.AccountProvisioner(jdbc,manager,auth);
        var account=spec("uncertain@test.local");
        assertThatThrownBy(()->service.prepare(account,"Inicial123")).hasMessageContaining("timeout");
        service.prepare(account,"Inicial123"); assertThat(auth.creates).isEqualTo(1);
        auth.users.put("foreign@test.local",new ar.edu.aulas.accounts.AuthAdmin.Identity(java.util.UUID.randomUUID(),"foreign@test.local",null));
        assertThatThrownBy(()->service.prepare(spec("foreign@test.local"),"Inicial123")).hasMessageContaining("ajena");
        assertThat(auth.creates).isEqualTo(1);
    }
    @Test void provisioningRecoversWhenLocalProfileTransactionFails() throws Exception {
        long collision;
        try(var c=dataSource.getConnection()) {
            c.setAutoCommit(false); collision=insertUser(c,"DOCENTE","local-failure@test.local");
            execute(c,"insert into aulas.docente(id_usuario) values ("+collision+")");c.commit();
        }
        var auth=new FakeAuth(); var service=new ar.edu.aulas.accounts.AccountProvisioner(jdbc,manager,auth);
        var account=spec("local-failure@test.local");
        assertThatThrownBy(()->service.prepare(account,"Inicial123")).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThat(auth.creates).isEqualTo(1);
        assertThat(jdbc.queryForObject("select auth_id from aulas.preparacion_cuenta where email=?",java.util.UUID.class,account.email())).isEqualTo(auth.users.get(account.email()).id());
        assertThat(jdbc.queryForObject("select completada from aulas.preparacion_cuenta where email=?",Boolean.class,account.email())).isFalse();
        new org.springframework.transaction.support.TransactionTemplate(manager).executeWithoutResult(st->{
            jdbc.update("delete from aulas.docente where id_usuario=?",collision);
            jdbc.update("delete from aulas.usuario where id_usuario=?",collision);
        });
        service.prepare(account,"Inicial123"); assertThat(auth.creates).isEqualTo(1);
        assertThat(jdbc.queryForObject("select auth_id from aulas.preparacion_cuenta where email=?",java.util.UUID.class,account.email())).isEqualTo(auth.users.get(account.email()).id());
        assertThat(jdbc.queryForObject("select completada from aulas.preparacion_cuenta where email=?",Boolean.class,account.email())).isTrue();
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
