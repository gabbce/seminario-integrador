package ar.edu.aulas;

import org.junit.jupiter.api.Test;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest @AutoConfigureMockMvc @Testcontainers
class SpaRoutingTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p){p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired MockMvc mvc;
 @Test void publicClientRoutesForwardOnlyToIndex() throws Exception {
  for(String path:new String[]{"/","/agenda","/reservas","/reservas/nueva","/reservas/24","/indicadores","/administracion/calendario"})mvc.perform(get(path)).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
  mvc.perform(head("/reservas/24")).andExpect(status().isOk()).andExpect(forwardedUrl("/index.html"));
 }
 @Test void apiAndMissingAssetsNeverBecomeReact() throws Exception {
  mvc.perform(get("/api/consultas/listado?date=2027-08-23")).andExpect(status().isUnauthorized()).andExpect(content().contentTypeCompatibleWith("application/json"));
  mvc.perform(get("/api/no-existe")).andExpect(status().isUnauthorized()).andExpect(content().contentTypeCompatibleWith("application/json"));
  mvc.perform(get("/assets/no-existe.js")).andExpect(status().isNotFound());
  mvc.perform(post("/reservas/24")).andExpect(status().isUnauthorized());
 }
}
