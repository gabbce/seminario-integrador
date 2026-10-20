package ar.edu.aulas;

import java.util.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest @Testcontainers @AutoConfigureMockMvc
class ReservationPaginationTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @MockitoSpyBean JdbcTemplate db;
 @Autowired MockMvc mvc; @Autowired PlatformTransactionManager manager;
 UUID auth;
 List<Long> ids;
 @BeforeEach void fixture() {
  db.execute("truncate aulas.usuario,aulas.aula,aulas.anio_lectivo,aulas.materia cascade");
  new TransactionTemplate(manager).executeWithoutResult(tx->{
   auth=UUID.randomUUID();
   long actor=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,'private@local.test','Test','User','ADMINISTRADOR') returning id_usuario",Long.class,auth);
   db.update("insert into aulas.administrador values (?)",actor);
   long year=db.queryForObject("insert into aulas.anio_lectivo(anio_calendario,estado) values (2027,'HABILITADO') returning id_anio_lectivo",Long.class);
   long matter=db.queryForObject("insert into aulas.materia(nombre,nombre_normalizado) values ('Consulta','consulta') returning id_materia",Long.class);
   long course=db.queryForObject("insert into aulas.curso(id_materia,comision,id_anio_lectivo) values (?,'A',?) returning id_curso",Long.class,matter,year);
   db.update("insert into aulas.reserva(registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula,recursos) select ?,?,'D-01','Laura','Gomez','private@local.test',30,'General',array['Proyector'] from generate_series(1,121)",actor,course);
      db.update("insert into aulas.reserva_esporadica select id_reserva from aulas.reserva");
   db.update("insert into aulas.aula(identificador,tipo,capacidad,estado,ubicacion,piso,pizarron,ventiladores,aire) select 'R'||id_reserva,'General',40,'Habilitada','A',0,'Tiza',false,false from aulas.reserva");
   db.update("insert into aulas.detalle_reserva(id_reserva,id_aula,fecha,hora_inicio,cantidad_modulos) select r.id_reserva,a.id_aula,'2027-03-01','09:00',2 from aulas.reserva r join aulas.aula a on a.identificador='R'||r.id_reserva");
   db.update("update aulas.detalle_reserva set estado='CANCELADA',motivo_cancelacion='Ensayo',cancelado_por=?,cancelado_en=now()",actor);
   db.update("insert into aulas.evento_auditoria(actor,operacion,entidad,entidad_id,resultado,detalle) select ?,'EDITAR_CABECERA','RESERVA',id_reserva,'OK','private history' from aulas.reserva",actor);
  });
  ids=db.queryForList("select id_reserva from aulas.reserva order by id_reserva desc",Long.class);
  clearInvocations(db);
 }
 private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request(String query) {return get("/api/reservas"+query).with(jwt().jwt(j->j.subject(auth.toString())));}
 @Test void collectionIsBoundedStableAndReportsWholeTotal() throws Exception {
  for(int size:List.of(20,50,100)) {
   for(int page=0;page<(121+size-1)/size;page++) {
    var result=mvc.perform(request("?page="+page+"&size="+size)).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(121)).andExpect(jsonPath("$.page").value(page)).andExpect(jsonPath("$.size").value(size)).andExpect(jsonPath("$.items.length()").value(Math.min(size,121-page*size)));
    for(int i=0;i<Math.min(size,121-page*size);i++) {
     String id=ids.get(page*size+i).toString();
     result.andExpect(jsonPath("$.items["+i+"].id").value(id)).andExpect(jsonPath("$.items["+i+"].resources[0]").value("Proyector")).andExpect(jsonPath("$.items["+i+"].occurrences[0].room").value("R"+id));
    }
   }
  }
  mvc.perform(request("?page=2147483647&size=100")).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty()).andExpect(jsonPath("$.total").value(121));
 }
 @Test void defaultAndValidationAndPrivacyApplyToTheEntirePage() throws Exception {
  mvc.perform(request("")).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(20)).andExpect(jsonPath("$.page").value(0));
  for(String query:List.of("?page=-1","?size=0","?size=21","?size=101","?page=bad")) mvc.perform(request(query)).andExpect(status().isBadRequest());
  new TransactionTemplate(manager).executeWithoutResult(tx->{db.update("delete from aulas.administrador where id_usuario in (select id_usuario from aulas.usuario where supabase_auth_id=?)",auth);db.update("update aulas.usuario set rol='DOCENTE' where supabase_auth_id=?",auth);db.update("insert into aulas.docente(id_usuario) select id_usuario from aulas.usuario where supabase_auth_id=?",auth);});
  mvc.perform(request("?size=100")).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(121)).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private@")))).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("registrant")))).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("changes")))).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("\"actor\""))));
  mvc.perform(get("/api/reservas")).andExpect(status().isUnauthorized());
 }
 @Test void sqlRestrictsEveryGroupedChildReadToPageIds() throws Exception {
  mvc.perform(request("?page=1&size=20")).andExpect(status().isOk());
  var reads=mockingDetails(db).getInvocations().stream().map(i->i.getArguments()).filter(a->a.length>0&&a[0] instanceof String).map(a->(String)a[0]).filter(s->s.startsWith("select")).toList();
  assertThat(reads).anyMatch(s->s.contains("limit ? offset ?"));
  for(String table:List.of("unnest","detalle_reserva","reserva_periodica r join aulas.periodo_asignado","fecha_excluida","patron_semanal","evento_auditoria")) {
   assertThat(reads.stream().filter(s->s.contains(table))).isNotEmpty().allMatch(s->s.contains(" in (")&&s.contains("?"));
  }
 }
}
