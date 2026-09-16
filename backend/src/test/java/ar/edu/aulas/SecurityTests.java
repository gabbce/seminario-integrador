package ar.edu.aulas;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;


import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DirtiesContext
@Import(SecurityTests.RoleProbe.class)
class SecurityTests {
    static final String ISSUER="https://auth.test.local/auth/v1";
    static final RSAKey key;
    static final HttpServer jwks;
    static {
        try {
            key=new RSAKeyGenerator(2048).keyID("test-key").generate();
            jwks=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
            jwks.createContext("/jwks", exchange->{
                byte[] body=new JWKSet(key.toPublicJWK()).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type","application/json");
                exchange.sendResponseHeaders(200,body.length);
                try(var out=exchange.getResponseBody()) { out.write(body); }
            });
            jwks.start();
        } catch(Exception e) { throw new ExceptionInInitializerError(e); }
    }
    @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
    @DynamicPropertySource static void props(DynamicPropertyRegistry p) {
        p.add("spring.datasource.url",postgres::getJdbcUrl);
        p.add("spring.datasource.username",postgres::getUsername);
        p.add("spring.datasource.password",postgres::getPassword);
        p.add("aulas.auth.issuer",()->ISSUER);
        p.add("aulas.auth.jwks",()->"http://127.0.0.1:"+jwks.getAddress().getPort()+"/jwks");
    }
    @AfterAll static void stop() { jwks.stop(0); }
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean ar.edu.aulas.accounts.AccountRepository accounts;
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate db;
    @Autowired PlatformTransactionManager manager;
    UUID account(String role,boolean active) {
        UUID auth=UUID.randomUUID();
        new TransactionTemplate(manager).executeWithoutResult(status->{
            Long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol,activo) values (?,?,'Nombre','Apellido',?,?) returning id_usuario",Long.class,auth,auth+"@test.local",role,active);
            String table=switch(role) { case "ADMINISTRADOR"->"administrador";case "BEDEL"->"bedel";default->"docente"; };
            db.update("insert into aulas."+table+"(id_usuario) values (?)",id);
        });
        return auth;
    }
    String token(UUID sub) throws Exception { return token(sub.toString(),ISSUER,"authenticated",Instant.now().plusSeconds(300),key); }
    String token(String sub,String issuer,String audience,Instant expiration,RSAKey signer) throws Exception {
        var claims=new JWTClaimsSet.Builder().subject(sub).issuer(issuer).audience(audience)
            .issueTime(Date.from(Instant.now().minusSeconds(600))).claim("role","ADMINISTRADOR");
        if (expiration!=null) claims.expirationTime(Date.from(expiration));
        var jwt=new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key").build(),claims.build());
        jwt.sign(new RSASSASigner(signer)); return jwt.serialize();
    }
    @Test void accountEndpointEnforcesRoles() throws Exception {
        for(String role:new String[]{"ADMINISTRADOR","BEDEL","DOCENTE"}) {
            UUID id=account(role,true);
            mvc.perform(get("/api/administracion/cuentas").header("Authorization","Bearer "+token(id)))
                .andExpect(status().is(role.equals("ADMINISTRADOR")?200:403));
        }
    }
    @Test void validProfilesUseDatabaseRolesNotTokenRoles() throws Exception {
        for(String role:new String[]{"ADMINISTRADOR","BEDEL","DOCENTE"}) {
            UUID id=account(role,true);
            mvc.perform(get("/api/me").header("Authorization","Bearer "+token(id)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.rol").value(role))
                .andExpect(jsonPath("$.permisos").isArray()).andExpect(jsonPath("$.password").doesNotExist());
        }
    }
    @Test void disabledMissingAndChangedProfilesAreRejectedImmediately() throws Exception {
        UUID id=account("BEDEL",true); String bearer=token(id);
        mvc.perform(get("/api/me").header("Authorization","Bearer "+bearer)).andExpect(status().isOk());
        db.update("update aulas.usuario set activo=false where supabase_auth_id=?",id);
        mvc.perform(get("/api/me").header("Authorization","Bearer "+bearer)).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCOUNT_UNAVAILABLE"));
        mvc.perform(get("/api/me").header("Authorization","Bearer "+token(UUID.randomUUID()))).andExpect(status().isForbidden());
    }
    @Test void directRequestsEnforceRoles() throws Exception {
        mvc.perform(get("/api/administracion/probe").header("Authorization","Bearer "+token(account("DOCENTE",true))))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(get("/api/administracion/probe").header("Authorization","Bearer "+token(account("ADMINISTRADOR",true))))
            .andExpect(status().isOk());
        mvc.perform(get("/api/indicadores/probe").header("Authorization","Bearer "+token(account("BEDEL",true))))
            .andExpect(status().isOk());
        mvc.perform(get("/api/indicadores/probe").header("Authorization","Bearer "+token(account("DOCENTE",true))))
            .andExpect(status().isForbidden());
    }
    @Test void invalidCryptographyAndClaimsReturn401() throws Exception {
        UUID id=account("ADMINISTRADOR",true); Instant later=Instant.now().plusSeconds(300);
        String[] invalid={"not-a-jwt",
            token(id.toString(),ISSUER,"authenticated",Instant.now().minusSeconds(120),key),
            token(id.toString(),"https://other.test", "authenticated",later,key),
            token(id.toString(),ISSUER,"other",later,key),
            token(id.toString(),ISSUER,"authenticated",later,new RSAKeyGenerator(2048).generate()),
            token(id.toString(),ISSUER,"authenticated",null,key),
            token("not-uuid",ISSUER,"authenticated",later,key)};
        for(String bearer:invalid) mvc.perform(get("/api/me").header("Authorization","Bearer "+bearer)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
    }
    @Test void profileDatabaseOutageIsNotReportedAsBadCredentials() throws Exception {
        UUID id=UUID.randomUUID();
        org.mockito.Mockito.doThrow(new org.springframework.dao.DataAccessResourceFailureException("offline"))
            .when(accounts).findByAuthId(id);
        mvc.perform(get("/api/me").header("Authorization","Bearer "+token(id)))
            .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("PROFILE_UNAVAILABLE"));
    }
    @RestController static class RoleProbe {
        // Test fixture only: no probe endpoints are shipped in the app.
        @GetMapping({"/api/administracion/probe","/api/indicadores/probe"}) String probe() { return "ok"; }
    }
}
