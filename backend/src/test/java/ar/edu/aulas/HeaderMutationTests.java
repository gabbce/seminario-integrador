package ar.edu.aulas;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.rooms.RoomsService;
import ar.edu.aulas.reservations.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest @Testcontainers @AutoConfigureMockMvc @Import(HeaderMutationTests.TimeConfig.class)
class HeaderMutationTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 static class MutableClock extends Clock {
  final AtomicReference<Instant> now; final ZoneId zone;
  MutableClock(AtomicReference<Instant> now,ZoneId zone){this.now=now;this.zone=zone;}
  public ZoneId getZone(){return zone;}public Clock withZone(ZoneId zone){return new MutableClock(now,zone);}public Instant instant(){return now.get();}
 }
 @TestConfiguration static class TimeConfig {@Bean MutableClock clock(){return new MutableClock(new AtomicReference<>(Instant.parse("2027-03-08T12:00:00Z")),ZoneOffset.UTC);}}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired CalendarManagement calendars; @Autowired RoomsService rooms;
 @Autowired SporadicPreparation sporadicPreparation; @Autowired SporadicConfirmation sporadicConfirmation; @Autowired PeriodicPreparation preparation; @Autowired PeriodicConfirmation confirmation; @Autowired ReservationQueries queries; @Autowired ar.edu.aulas.references.ReferenceManagement references; @Autowired HeaderMutationService headers; @Autowired CancellationService cancellations; @Autowired MutableClock clock; @Autowired MockMvc mvc;
 long year,course,admin,bedel,teacher;RoomsService.Room classroom;
 @BeforeEach void setup() {
  db.execute("truncate aulas.evento_auditoria,aulas.materia,aulas.anio_lectivo,aulas.usuario,aulas.aula cascade");
  clock.now.set(Instant.parse("2027-03-08T12:00:00Z"));
  admin=account("ADMINISTRADOR");bedel=account("BEDEL");teacher=account("DOCENTE");
  year=db.queryForObject("insert into aulas.anio_lectivo(anio_calendario,estado) values (2027,'HABILITADO') returning id_anio_lectivo",Long.class);
  db.update("insert into aulas.cuatrimestre(id_anio_lectivo,numero,inicio,fin) values (?,1,'2027-03-01','2027-03-22'),(?,2,'2027-04-05','2027-04-19')",year,year);
  db.update("insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) values (?,'2027-04-12','Feriado')",year);
  long matter=db.queryForObject("insert into aulas.materia(nombre,nombre_normalizado) values ('Historia','HISTORIA') returning id_materia",Long.class);
  course=db.queryForObject("insert into aulas.curso(id_materia,id_anio_lectivo,comision) values (?,?,'A') returning id_curso",Long.class,matter,year);
  classroom=rooms.save(admin,null,new RoomsService.Room(null,"101",null,"General",30,"Habilitada","A",0,"Tiza",List.of("fans","air"),null,List.of()));
 }
 long account(String role) {return new TransactionTemplate(manager).execute(tx->{long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'Nombre','Apellido',?) returning id_usuario",Long.class,UUID.randomUUID(),UUID.randomUUID()+"@test.local",role);db.update("insert into aulas."+(role.equals("ADMINISTRADOR")?"administrador":role.equals("BEDEL")?"bedel":"docente")+"(id_usuario) values (?)",id);return id;});}
 org.springframework.test.web.servlet.request.RequestPostProcessor session(long id) {return jwt().jwt(jwt->jwt.subject(db.queryForObject("select supabase_auth_id::text from aulas.usuario where id_usuario=?",String.class,id)));}
 PeriodicPreparation.Request proposal(String period,String start,List<String> excluded) {return new PeriodicPreparation.Request(2027,Long.toString(course),period,30,"General","Tiza",List.of("fans","air"),excluded,List.of(new PeriodicPreparation.Pattern(1,start,2)));}
 PeriodicConfirmation.Request reviewed(PeriodicPreparation.Request p,UUID key) {
  var result=preparation.prepare(p);
  return new PeriodicConfirmation.Request(key,p,"D-01",result.calendarVersion(),result.patterns().stream().map(pattern->new PeriodicConfirmation.Selection(pattern.day(),classroom.internalId(),classroom.version(),pattern.dates())).toList());
 }
 PeriodicConfirmation.Request request(){return reviewed(proposal("annual","09:30",List.of("2027-03-22")),UUID.randomUUID());}
 RoomsService.Room changedRoom(String state,int capacity,List<String> resources){return new RoomsService.Room(classroom.internalId(),classroom.id(),classroom.version(),classroom.type(),capacity,state,classroom.location(),classroom.floor(),classroom.board(),resources,null,List.of());}
 CalendarManagement.Edit edit(Map<String,List<String>> terms,List<String> holidays,String state){var current=calendars.get(year);var descriptions=new HashMap<String,String>();holidays.forEach(day->descriptions.put(day,"Feriado"));return new CalendarManagement.Edit(current.version(),2027,state,terms,holidays,descriptions);}
 long count(String table){return db.queryForObject("select count(*) from aulas."+table,Long.class);}
 SporadicPreparation.Request sporadic(String... dates) {return new SporadicPreparation.Request(2027,Long.toString(course),25,"General","Tiza",List.of("fans"),Arrays.stream(dates).map(d->new SporadicPreparation.DateSlot(d,"10:00",2)).toList());}
 SporadicConfirmation.Request reviewedSporadic(SporadicPreparation.Request p) {
  var ready=sporadicPreparation.prepare(p,true);
  return new SporadicConfirmation.Request(UUID.randomUUID(),p,"D-01",ready.calendarVersion(),ready.dates().stream().map(d->new SporadicConfirmation.Selection(d.date(),classroom.internalId(),classroom.version())).toList());
 }

 @SuppressWarnings("unchecked") List<String> ids(Map<String,Object> b) {return ((List<Map<String,Object>>)b.get("occurrences")).stream().map(d->d.get("id").toString()).toList();}
 Map<String,Object> saved(){return sporadicConfirmation.confirm(admin,reviewedSporadic(sporadic("2027-03-15","2027-03-29")));}
 CancellationService.Request cancel(Map<String,Object> b,List<String> ids,String reason){return new CancellationService.Request(UUID.randomUUID(),((Number)b.get("version")).longValue(),ids,reason);}

 HeaderMutationService.Request edit(Map<String,Object> b,int students){return new HeaderMutationService.Request(UUID.randomUUID(),((Number)b.get("version")).longValue(),Long.toString(course),"D-02",students,"General","Tiza",List.of("fans"));}
 @Test void editsSharedHeaderAndHistoryWithoutChangingOccurrencesAndRecoversOriginalResult() {
  var b=saved();long id=Long.parseLong(b.get("id").toString());var request=edit(b,30);var outcome=headers.save(bedel,id,request);
  var after=queries.get(id,true);assertThat(after).containsEntry("teacher","Ana Ruiz").containsEntry("students",30).containsEntry("version",1L).containsEntry("occurrences",b.get("occurrences")).containsKey("changes");
  assertThat(queries.get(id,false)).doesNotContainKeys("teacherEmail","registrant","changes");
  clock.now.set(Instant.parse("2028-03-08T12:00:00Z"));assertThat(headers.save(bedel,id,request)).isEqualTo(outcome);assertThat(cancellations.operation(bedel,request.operationId())).containsEntry("result",outcome);
  assertThatThrownBy(()->headers.save(bedel,id,new HeaderMutationService.Request(request.operationId(),request.version(),request.courseId(),"D-03",30,request.type(),request.board(),request.resources()))).isInstanceOf(DomainError.class);
  assertThat(count("mutacion_reserva")).isEqualTo(1);
 }
 @Test void rejectsIncompatibleRequirementsVersionAndCourseYearWithoutChanges() {
  var b=saved();long id=Long.parseLong(b.get("id").toString());
  assertThatThrownBy(()->headers.save(bedel,id,edit(b,31))).isInstanceOf(DomainError.class).hasMessageContaining("101");
  var r=edit(b,30);
  assertThatThrownBy(()->headers.save(bedel,id,new HeaderMutationService.Request(r.operationId(),r.version(),r.courseId(),r.teacherId(),30,"Multimedios","Tiza",List.of("projector")))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->headers.save(bedel,id,new HeaderMutationService.Request(r.operationId(),99L,r.courseId(),r.teacherId(),30,r.type(),r.board(),r.resources()))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->headers.save(bedel,id,new HeaderMutationService.Request(r.operationId(),0L,"999999",r.teacherId(),30,r.type(),r.board(),r.resources()))).isInstanceOf(DomainError.class);
  assertThat(queries.get(id,true)).isEqualTo(b);assertThat(count("mutacion_reserva")).isZero();
 }
 @Test void rejectsAfterAnyOriginalOrCancelledOccurrenceStartsAndWhenAllCancelled() {
  var b=saved();long id=Long.parseLong(b.get("id").toString());cancellations.confirm(bedel,id,cancel(b,List.of(ids(b).getFirst()),"x"));var fresh=queries.get(id,true);
  clock.now.set(Instant.parse("2027-03-15T13:00:00Z"));assertThatThrownBy(()->headers.save(bedel,id,edit(fresh,30))).isInstanceOf(DomainError.class).hasMessageContaining("iniciarse");
  clock.now.set(Instant.parse("2027-03-08T12:00:00Z"));cancellations.confirm(bedel,id,cancel(fresh,List.of(ids(b).getLast()),"x"));var cancelled=queries.get(id,true);
  assertThatThrownBy(()->headers.save(bedel,id,edit(cancelled,30))).isInstanceOf(DomainError.class);
 }
 @Test void editAgainstCancellationHasOneWinnerAndNoMixedAggregate() throws Exception {
  var b=saved();long id=Long.parseLong(b.get("id").toString());var request=edit(b,30);var cancelRequest=cancel(b,ids(b),"x");var start=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   var edit=pool.submit(()->{start.await();try{headers.save(bedel,id,request);return true;}catch(DomainError e){return false;}});
   var cancel=pool.submit(()->{start.await();try{cancellations.confirm(admin,id,cancelRequest);return true;}catch(DomainError e){return false;}});
   start.countDown();assertThat(edit.get(10,TimeUnit.SECONDS)).isNotEqualTo(cancel.get(10,TimeUnit.SECONDS));
  }
  assertThat(count("mutacion_reserva")).isEqualTo(1);assertThat(queries.get(id,true)).containsEntry("version",1L);
 }
 @Test void auditFailureRollsBackHeaderAndLedgerAndRetryUsesSameKey() {
  var b=saved();long id=Long.parseLong(b.get("id").toString());var request=edit(b,30);
  db.execute("alter table aulas.evento_auditoria add constraint reject_header check(operacion<>'EDITAR_CABECERA') not valid");
  try{assertThatThrownBy(()->headers.save(bedel,id,request)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);}finally{db.execute("alter table aulas.evento_auditoria drop constraint reject_header");}
  assertThat(queries.get(id,true)).isEqualTo(b);assertThat(count("mutacion_reserva")).isZero();headers.save(bedel,id,request);
 }
 @Test void currentRolesAndDisabledYearAndResourceValidationAreAuthoritative() throws Exception {
  var b=saved();long id=Long.parseLong(b.get("id").toString());var r=edit(b,30);String body=new tools.jackson.databind.ObjectMapper().writeValueAsString(r);
  mvc.perform(post("/api/reservas/"+id+"/cabecera").with(session(teacher)).contentType("application/json").content(body)).andExpect(status().isForbidden());
  assertThatThrownBy(()->headers.save(teacher,id,r)).isInstanceOf(DomainError.class);
  db.update("update aulas.anio_lectivo set estado='CERRADO' where id_anio_lectivo=?",year);assertThatThrownBy(()->headers.save(bedel,id,r)).isInstanceOf(DomainError.class);
  db.update("update aulas.anio_lectivo set estado='HABILITADO' where id_anio_lectivo=?",year);
  assertThatThrownBy(()->headers.save(bedel,id,new HeaderMutationService.Request(r.operationId(),r.version(),r.courseId(),r.teacherId(),30,"General","Tiza",List.of("projector")))).isInstanceOf(DomainError.class);
  mvc.perform(post("/api/reservas/"+id+"/cabecera").with(session(bedel)).contentType("application/json").content(body)).andExpect(status().isOk());
  mvc.perform(get("/api/reservas/"+id).with(session(teacher))).andExpect(status().isOk()).andExpect(jsonPath("$.teacher").value("Ana Ruiz")).andExpect(jsonPath("$.teacherEmail").doesNotExist()).andExpect(jsonPath("$.changes").doesNotExist());
 }
 @Test void revalidatesEveryAssignedRoomAndAcceptsAnotherCourseOnlyWithinSameYear() {
  var other=rooms.save(admin,null,new RoomsService.Room(null,"202",null,"General",28,"Habilitada","A",0,"Tiza",List.of("fans"),null,List.of()));
  var creation=reviewedSporadic(sporadic("2027-03-15","2027-03-29"));
  var selections=List.of(creation.selections().getFirst(),new SporadicConfirmation.Selection("2027-03-29",other.internalId(),other.version()));
  var b=sporadicConfirmation.confirm(admin,new SporadicConfirmation.Request(creation.operationId(),creation.proposal(),creation.teacherId(),creation.calendarVersion(),selections));long id=Long.parseLong(b.get("id").toString());
  assertThatThrownBy(()->headers.save(bedel,id,edit(b,30))).isInstanceOf(DomainError.class).hasMessageContaining("202");
  var r=edit(b,28);assertThatThrownBy(()->headers.save(bedel,id,new HeaderMutationService.Request(r.operationId(),0L,r.courseId(),r.teacherId(),28,"General","Tiza",List.of("air")))).isInstanceOf(DomainError.class).hasMessageContaining("202");
  db.update("insert into aulas.anio_lectivo(anio_calendario,estado) values (2028,'HABILITADO')");
  var foreign=references.create(admin,new ar.edu.aulas.references.ReferenceManagement.Create("Otra materia","B",2028));
  assertThatThrownBy(()->headers.save(bedel,id,new HeaderMutationService.Request(r.operationId(),0L,foreign.id(),r.teacherId(),28,r.type(),r.board(),r.resources()))).isInstanceOf(DomainError.class).hasMessageContaining("mismo año");
  assertThat(queries.get(id,true)).isEqualTo(b);
  var course2=references.create(admin,new ar.edu.aulas.references.ReferenceManagement.Create("Otra materia","B",2027));
  headers.save(bedel,id,new HeaderMutationService.Request(r.operationId(),0L,course2.id(),r.teacherId(),28,r.type(),r.board(),r.resources()));
  assertThat(queries.get(id,true)).containsEntry("subject","Otra materia").containsEntry("courseId",course2.id()).containsEntry("occurrences",b.get("occurrences"));
 }
 @Test void periodicHeaderKeepsWeeklyPatternsAndDetails() {
  var b=confirmation.confirm(admin,request());long id=Long.parseLong(b.get("id").toString());headers.save(bedel,id,edit(b,29));var after=queries.get(id,true);
  assertThat(after).containsEntry("patterns",b.get("patterns")).containsEntry("schedule",b.get("schedule")).containsEntry("occurrences",b.get("occurrences"));
 }
 @Test void clockIsRevalidatedAfterWaitingForWriterAndDisabledActorCannotReplay() throws Exception {
  var b=saved();long id=Long.parseLong(b.get("id").toString());var r=edit(b,30);var held=new CountDownLatch(1);var release=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   var blocker=pool.submit(()->new TransactionTemplate(manager).execute(tx->{db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);held.countDown();try{if(!release.await(10,TimeUnit.SECONDS))throw new IllegalStateException("Timeout");}catch(InterruptedException e){throw new RuntimeException(e);}return true;}));
   assertThat(held.await(5,TimeUnit.SECONDS)).isTrue();var edit=pool.submit(()->{try{headers.save(bedel,id,r);return true;}catch(DomainError e){return false;}});
   waitForPermissionLock();clock.now.set(Instant.parse("2027-03-15T13:00:00Z"));release.countDown();assertThat(blocker.get(10,TimeUnit.SECONDS)).isTrue();assertThat(edit.get(10,TimeUnit.SECONDS)).isFalse();
  }finally{release.countDown();}
  assertThat(queries.get(id,true)).isEqualTo(b);
  clock.now.set(Instant.parse("2027-03-08T12:00:00Z"));headers.save(bedel,id,r);db.update("update aulas.usuario set activo=false where id_usuario=?",bedel);
  assertThatThrownBy(()->headers.save(bedel,id,r)).isInstanceOf(DomainError.class);
 }

 void waitForPermissionLock() throws InterruptedException {
  String sql="select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like 'select id from aulas.control_cuentas%'";
  long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
  while(db.queryForObject(sql,Long.class)==0 && System.nanoTime()<deadline) Thread.sleep(10);
  assertThat(db.queryForObject(sql,Long.class)).isPositive();
 }

}
