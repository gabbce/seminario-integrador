package ar.edu.aulas;

import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.references.ReferenceManagement;
import ar.edu.aulas.api.DomainError;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest @Testcontainers @AutoConfigureMockMvc
class ReferenceTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired ReferenceManagement refs; @Autowired CalendarManagement calendars; @Autowired MockMvc mvc;
 @BeforeEach void clean(){db.execute("truncate aulas.evento_auditoria,aulas.materia,aulas.anio_lectivo,aulas.usuario cascade");}
 long account(String role) {return new TransactionTemplate(manager).execute(tx->{
  long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'Nombre','Apellido',?) returning id_usuario",Long.class,UUID.randomUUID(),UUID.randomUUID()+"@test.local",role);
  db.update("insert into aulas."+(role.equals("ADMINISTRADOR")?"administrador":role.equals("BEDEL")?"bedel":"docente")+"(id_usuario) values (?)",id);return id;
 });}
 org.springframework.test.web.servlet.request.RequestPostProcessor session(long id) {return jwt().jwt(jwt->jwt.subject(db.queryForObject("select supabase_auth_id::text from aulas.usuario where id_usuario=?",String.class,id)));}
 long year(long actor,int year) {
  long id=Long.parseLong(calendars.create(actor,new CalendarManagement.Create(year)).id());
  calendars.edit(actor,id,new CalendarManagement.Edit(0L,year,"Habilitado",Map.of("first",List.of(year+"-03-01",year+"-07-01"),"second",List.of(year+"-08-01",year+"-12-01")),List.of(),Map.of()));return id;
 }
 @Test void matterCodeIsSharedAcrossCommissionsAndYearsAndSearchUsesVisibleCode() {
  long admin=account("ADMINISTRADOR"),bedel=account("BEDEL");year(admin,2026);year(admin,2027);
  var a=refs.create(bedel,new ReferenceManagement.Create(" Matemática   I "," a ",2026));
  var b=refs.create(admin,new ReferenceManagement.Create("MATEMÁTICA\tI","b",2026));
  var other=refs.create(admin,new ReferenceManagement.Create("matemática i","a",2027));
  assertThat(a.subject()).isEqualTo("Matemática I");assertThat(a.commission()).isEqualTo("A");assertThat(b.code()).isEqualTo(a.code());assertThat(other.code()).isEqualTo(a.code());
  assertThat(Set.of(a.id(),b.id(),other.id())).hasSize(3);
  assertThat(refs.create(bedel,new ReferenceManagement.Create("matemática i","A",2026))).isEqualTo(a);
  assertThat(refs.list(2026,String.format("%03d-A-2026",a.code()))).containsExactly(a);
  assertThat(refs.list(2026,"MATEMÁTICA")).hasSize(2);assertThat(refs.list(2027,"")).containsExactly(other);
  assertThat(db.queryForObject("select count(*) from aulas.materia",Long.class)).isEqualTo(1);
  assertThat(db.queryForObject("select count(*) from aulas.evento_auditoria where operacion='CREAR_CURSO'",Long.class)).isEqualTo(3);
 }
 @Test void coursesProtectYearIdentityAndDeletion() {
  long admin=account("ADMINISTRADOR");long year=year(admin,2027);refs.create(admin,new ReferenceManagement.Create("Historia","A",2027));
  var empty=Map.of("first",List.of("",""),"second",List.of("",""));
  assertThatThrownBy(()->calendars.edit(admin,year,new CalendarManagement.Edit(1L,2028,"En preparación",empty,List.of(),Map.of()))).isInstanceOf(DomainError.class).hasMessageContaining("cursos");
  calendars.edit(admin,year,new CalendarManagement.Edit(1L,2027,"En preparación",empty,List.of(),Map.of()));
  assertThatThrownBy(()->calendars.delete(admin,year,2L)).isInstanceOf(DomainError.class).hasMessageContaining("cursos");
  assertThat(refs.list(2027,"")).hasSize(1);
 }
 @Test void rejectsInvalidDataMissingAndNonEnabledYearsAndTeacherWrites() {
  long admin=account("ADMINISTRADOR"),teacher=account("DOCENTE");year(admin,2027);
  calendars.create(admin,new CalendarManagement.Create(2028));
  for(var request:List.of(new ReferenceManagement.Create(" ","A",2027),new ReferenceManagement.Create("Historia"," ",2027),new ReferenceManagement.Create("Historia","A",2029),new ReferenceManagement.Create("Historia","A",2028))) assertThatThrownBy(()->refs.create(admin,request)).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->refs.create(teacher,new ReferenceManagement.Create("Historia","A",2027))).isInstanceOf(DomainError.class);
  assertThat(db.queryForObject("select count(*) from aulas.materia",Long.class)).isZero();
 }
 @Test void concurrentEquivalentCreatesReturnOneCourseAndAudit() throws Exception {
  long admin=account("ADMINISTRADOR");year(admin,2027);var start=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   Callable<ReferenceManagement.Course> first=()->{start.await();return refs.create(admin,new ReferenceManagement.Create("Programación I","a",2027));};
   Callable<ReferenceManagement.Course> second=()->{start.await();return refs.create(admin,new ReferenceManagement.Create(" PROGRAMACIÓN  I "," A ",2027));};
   var a=pool.submit(first);var b=pool.submit(second);start.countDown();assertThat(a.get(10,TimeUnit.SECONDS)).isEqualTo(b.get(10,TimeUnit.SECONDS));
  }
  assertThat(db.queryForObject("select count(*) from aulas.materia",Long.class)).isEqualTo(1);assertThat(db.queryForObject("select count(*) from aulas.curso",Long.class)).isEqualTo(1);
  assertThat(db.queryForObject("select count(*) from aulas.evento_auditoria where operacion='CREAR_CURSO'",Long.class)).isEqualTo(1);
 }
 @Test void apiReturnsFixedTeachersWithoutContactForTeacherAccounts() throws Exception {
  long admin=account("ADMINISTRADOR"),bedel=account("BEDEL"),teacher=account("DOCENTE");year(admin,2027);
  for(long actor:List.of(admin,bedel)) mvc.perform(get("/api/referencias/docentes").with(session(actor))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(5)).andExpect(jsonPath("$[0].id").value("D-01")).andExpect(jsonPath("$[0].email").value("laura.gomez@example.test"));
  mvc.perform(get("/api/referencias/docentes").with(session(teacher))).andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("Laura Gómez")).andExpect(jsonPath("$[0].email").doesNotExist());
  account("DOCENTE");mvc.perform(get("/api/referencias/docentes").with(session(admin))).andExpect(jsonPath("$.length()").value(5));
  for(long actor:List.of(admin,bedel)) mvc.perform(post("/api/referencias/cursos").with(session(actor)).contentType("application/json").content("{\"subject\":\"Historia\",\"commission\":\"A\",\"year\":2027}")).andExpect(status().isOk()).andExpect(jsonPath("$.id").isString());
  mvc.perform(post("/api/referencias/cursos").with(session(teacher)).contentType("application/json").content("{\"subject\":\"Historia\",\"commission\":\"B\",\"year\":2027}")).andExpect(status().isForbidden());
  for(long actor:List.of(admin,bedel,teacher)) mvc.perform(get("/api/referencias/cursos?year=2027").with(session(actor))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
 }
 @Test void failedAuditRollsBackMatterAndCourse() {
  long admin=account("ADMINISTRADOR");year(admin,2027);
  db.execute("alter table aulas.evento_auditoria add constraint reject_reference_test check (operacion <> 'CREAR_CURSO') not valid");
  try {assertThatThrownBy(()->refs.create(admin,new ReferenceManagement.Create("Historia","A",2027))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);assertThat(db.queryForObject("select count(*) from aulas.materia",Long.class)).isZero();assertThat(db.queryForObject("select count(*) from aulas.curso",Long.class)).isZero();}
  finally {db.execute("alter table aulas.evento_auditoria drop constraint reject_reference_test");}
 }
 @Test void courseCreationAndYearRenumberCannotBreakAnnualIdentity() throws Exception {
  long admin=account("ADMINISTRADOR");long yearId=year(admin,2027);var start=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   Callable<Boolean> create=()->{start.await();try{refs.create(admin,new ReferenceManagement.Create("Historia","A",2027));return true;}catch(DomainError ex){return false;}};
   Callable<Boolean> rename=()->{start.await();try{calendars.edit(admin,yearId,new CalendarManagement.Edit(1L,2028,"En preparación",Map.of("first",List.of("",""),"second",List.of("","")),List.of(),Map.of()));return true;}catch(DomainError ex){return false;}};
   var course=pool.submit(create);var renameResult=pool.submit(rename);start.countDown();
   boolean created=course.get(10,TimeUnit.SECONDS),renamed=renameResult.get(10,TimeUnit.SECONDS);
   assertThat(created).isNotEqualTo(renamed);
   if(created) {assertThat(calendars.get(yearId).year()).isEqualTo(2027);assertThat(refs.list(2027,"")).hasSize(1);}
   else {assertThat(calendars.get(yearId).year()).isEqualTo(2028);assertThat(db.queryForObject("select count(*) from aulas.curso",Long.class)).isZero();}
  }
 }

}
