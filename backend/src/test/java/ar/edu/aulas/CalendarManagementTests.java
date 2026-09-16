package ar.edu.aulas;

import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.api.DomainError;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest @Testcontainers @org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
class CalendarManagementTests {
 @org.springframework.boot.test.context.TestConfiguration static class TimeConfiguration {
  @org.springframework.context.annotation.Bean Clock testClock() {return Clock.fixed(Instant.parse("2026-09-16T12:00:00Z"),ZoneOffset.UTC);}
 }
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired CalendarManagement calendars;
 @BeforeEach void clean(){db.execute("truncate aulas.evento_auditoria,aulas.anio_lectivo,aulas.usuario cascade");}
 long account(String role) {return new TransactionTemplate(manager).execute(tx->{
  long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'Nombre','Apellido',?) returning id_usuario",Long.class,UUID.randomUUID(),UUID.randomUUID()+"@test.local",role);
  db.update("insert into aulas."+(role.equals("ADMINISTRADOR")?"administrador":role.equals("BEDEL")?"bedel":"docente")+"(id_usuario) values (?)",id);return id;
 });}
 CalendarManagement.Edit edit(long version,String state,Map<String,List<String>> terms,List<String> holidays,Map<String,String> descriptions) {return new CalendarManagement.Edit(version,2027,state,terms,holidays,descriptions);}
 Map<String,List<String>> terms() {return Map.of("first",List.of("2027-03-01","2027-07-01"),"second",List.of("2027-08-01","2027-12-01"));}
 Map<String,List<String>> empty() {return Map.of("first",List.of("",""),"second",List.of("",""));}
 @Test void persistenceVersionsDependenciesAndClosedReadOnly() {
  long admin=account("ADMINISTRADOR");var created=calendars.create(admin,new CalendarManagement.Create(2027));long id=Long.parseLong(created.id());
  assertThat(created.state()).isEqualTo("En preparación");
  assertThatThrownBy(()->calendars.edit(admin,id,edit(0,"Habilitado",empty(),List.of(),Map.of()))).isInstanceOf(DomainError.class);
  var saved=calendars.edit(admin,id,edit(0,"Habilitado",terms(),List.of("2027-10-12"),Map.of("2027-10-12","Día ficticio")));
  assertThat(calendars.list()).containsExactly(saved);assertThat(saved.version()).isEqualTo(1);
  assertThatThrownBy(()->calendars.edit(admin,id,edit(0,"Habilitado",terms(),List.of(),Map.of()))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->calendars.delete(admin,id,1L)).isInstanceOf(DomainError.class);
  long termId=db.queryForObject("select id_cuatrimestre from aulas.cuatrimestre where id_anio_lectivo=? and numero=1",Long.class,id);
  var single=Map.of("first",terms().get("first"),"second",List.of("",""));
  var preparation=calendars.edit(admin,id,edit(1,"En preparación",single,List.of(),Map.of()));
  assertThat(preparation.state()).isEqualTo("En preparación");assertThat(db.queryForObject("select id_cuatrimestre from aulas.cuatrimestre where id_anio_lectivo=?",Long.class,id)).isEqualTo(termId);
  calendars.edit(admin,id,edit(2,"Cerrado",single,List.of(),Map.of()));
  assertThatThrownBy(()->calendars.edit(admin,id,edit(3,"En preparación",single,List.of(),Map.of()))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->calendars.delete(admin,id,3L)).isInstanceOf(DomainError.class);
  assertThat(db.queryForObject("select count(*) from aulas.evento_auditoria",Long.class)).isEqualTo(4);
 }
 @Test void rejectsDuplicateYearsInvalidRangesAndUnauthorizedWrites() {
  long admin=account("ADMINISTRADOR"),bedel=account("BEDEL"),docente=account("DOCENTE");
  long id=Long.parseLong(calendars.create(admin,new CalendarManagement.Create(2027)).id());
  assertThatThrownBy(()->calendars.create(admin,new CalendarManagement.Create(2027))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  for(long actor:List.of(bedel,docente)) {
   assertThatThrownBy(()->calendars.create(actor,new CalendarManagement.Create(2028))).isInstanceOf(DomainError.class);
   assertThatThrownBy(()->calendars.edit(actor,id,edit(0,"Habilitado",terms(),List.of(),Map.of()))).isInstanceOf(DomainError.class);
   assertThatThrownBy(()->calendars.delete(actor,id,0L)).isInstanceOf(DomainError.class);
  }
  for(var range:List.of(List.of("2026-12-01","2027-07-01"),List.of("2027-04-01","2027-03-01"),List.of("2027-08-01","2027-08-15"))) {
   assertThatThrownBy(()->calendars.edit(admin,id,edit(0,"Habilitado",Map.of("first",range,"second",terms().get("second")),List.of(),Map.of()))).isInstanceOf(DomainError.class);
  }
  assertThatThrownBy(()->calendars.edit(admin,id,edit(0,"Habilitado",terms(),List.of("2027-10-12","2027-10-12"),Map.of("2027-10-12","Duplicado")))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->calendars.edit(admin,id,edit(0,"Habilitado",terms(),List.of("2027-10-12"),Map.of("2027-10-12"," ")))).isInstanceOf(DomainError.class);
  calendars.edit(admin,id,edit(0,"En preparación",Map.of("first",List.of("2027-03-01",""),"second",List.of("","")),List.of(),Map.of()));
  assertThat(calendars.get(id).version()).isEqualTo(1);
 }
 @Test void pastProtectionUsesInstitutionalDateAndAllowsDescriptionCorrection() {
  long admin=account("ADMINISTRADOR");long id=Long.parseLong(calendars.create(admin,new CalendarManagement.Create(2027)).id());
  // UTC Jan 2 is still Jan 1 in Córdoba: Jan 1 may be added.
  var jan1=new CalendarManagement(db,Clock.fixed(Instant.parse("2027-01-02T02:30:00Z"),ZoneOffset.UTC));
  var tx=new TransactionTemplate(manager);
  tx.execute(s->jan1.edit(admin,id,edit(0,"En preparación",empty(),List.of("2027-01-01"),Map.of("2027-01-01","Original"))));
  var jan2=new CalendarManagement(db,Clock.fixed(Instant.parse("2027-01-02T03:01:00Z"),ZoneOffset.UTC));
  assertThatThrownBy(()->tx.execute(s->jan2.edit(admin,id,edit(1,"En preparación",empty(),List.of(),Map.of())))).isInstanceOf(DomainError.class).hasMessageContaining("pasadas");
  assertThatThrownBy(()->tx.execute(s->jan2.edit(admin,id,edit(1,"En preparación",empty(),List.of("2027-01-02"),Map.of("2027-01-02","Movido"))))).isInstanceOf(DomainError.class);
  tx.execute(s->jan2.edit(admin,id,edit(1,"En preparación",empty(),List.of("2027-01-01"),Map.of("2027-01-01","Corregido"))));
  assertThat(calendars.get(id).descriptions()).containsEntry("2027-01-01","Corregido");
  long other=Long.parseLong(calendars.create(admin,new CalendarManagement.Create(2028)).id());
  var future=new CalendarManagement(db,Clock.fixed(Instant.parse("2028-01-02T12:00:00Z"),ZoneOffset.UTC));
  var past=new CalendarManagement.Edit(0L,2028,"En preparación",empty(),List.of("2028-01-01"),Map.of("2028-01-01","Pasado"));
  assertThatThrownBy(()->tx.execute(s->future.edit(admin,other,past))).isInstanceOf(DomainError.class).hasMessageContaining("pasado");
 }
 @Test void staleConcurrentWritesAndAuditRollback() throws Exception {
  long admin=account("ADMINISTRADOR");long id=Long.parseLong(calendars.create(admin,new CalendarManagement.Create(2027)).id());
  var start=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   Callable<Boolean> write=()->{start.await();try{calendars.edit(admin,id,edit(0,"Habilitado",terms(),List.of(),Map.of()));return true;}catch(DomainError ex){return false;}};
   var first=pool.submit(write);var second=pool.submit(write);start.countDown();
   assertThat((first.get(10,TimeUnit.SECONDS)?1:0)+(second.get(10,TimeUnit.SECONDS)?1:0)).isEqualTo(1);
  }
  db.execute("alter table aulas.evento_auditoria add constraint reject_calendar_test check (operacion <> 'EDITAR_CALENDARIO') not valid");
  try {
   assertThatThrownBy(()->calendars.edit(admin,id,edit(1,"En preparación",empty(),List.of(),Map.of()))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
   assertThat(calendars.get(id).state()).isEqualTo("Habilitado");assertThat(calendars.get(id).version()).isEqualTo(1);
   assertThat(db.queryForObject("select count(*) from aulas.cuatrimestre where id_anio_lectivo=?",Long.class,id)).isEqualTo(2);
  } finally {db.execute("alter table aulas.evento_auditoria drop constraint reject_calendar_test");}
 }
 @Test void emptyYearCanBeRenamedAndDeletedWithAudit() {
  long admin=account("ADMINISTRADOR");long id=Long.parseLong(calendars.create(admin,new CalendarManagement.Create(2026)).id());
  calendars.edit(admin,id,edit(0,"En preparación",empty(),List.of(),Map.of()));assertThat(calendars.get(id).year()).isEqualTo(2027);
  calendars.delete(admin,id,1L);assertThat(calendars.list()).isEmpty();
  assertThat(db.queryForObject("select count(*) from aulas.evento_auditoria where entidad_id=?",Long.class,id)).isEqualTo(3);
 }
 @Autowired org.springframework.test.web.servlet.MockMvc mvc;
 org.springframework.test.web.servlet.request.RequestPostProcessor session(long id) {
  String subject=db.queryForObject("select supabase_auth_id::text from aulas.usuario where id_usuario=?",String.class,id);
  return org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt().jwt(jwt->jwt.subject(subject));
 }
 @Test void apiUsesPersistedRolesAndReturnsStableSnapshotContract() throws Exception {
  long admin=account("ADMINISTRADOR"),bedel=account("BEDEL"),docente=account("DOCENTE");
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/administracion/calendarios").with(session(admin)).contentType("application/json").content("{\"year\":2027}"))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isCreated())
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.id").isString())
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.state").value("En preparación"))
   .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.terms.first[0]").value(""));
  long id=Long.parseLong(calendars.list().getFirst().id());
  for(long actor:List.of(admin,bedel,docente)) mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/referencias/calendarios").with(session(actor))).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk()).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$[0].year").value(2027));
  for(long actor:List.of(bedel,docente)) {
   mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/administracion/calendarios").with(session(actor)).contentType("application/json").content("{\"year\":2028}")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
   mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/administracion/calendarios/"+id+"?version=0").with(session(actor))).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());
  }
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/referencias/calendarios")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
  mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/administracion/calendarios/"+id+"?version=0").with(session(admin))).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isNoContent());
 }

}
