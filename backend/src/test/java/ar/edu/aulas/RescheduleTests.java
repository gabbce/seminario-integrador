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

@SpringBootTest @Testcontainers @AutoConfigureMockMvc @Import(RescheduleTests.TimeConfig.class)
class RescheduleTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 static class MutableClock extends Clock {
  final AtomicReference<Instant> now; final ZoneId zone;
  MutableClock(AtomicReference<Instant> now,ZoneId zone){this.now=now;this.zone=zone;}
  public ZoneId getZone(){return zone;}public Clock withZone(ZoneId zone){return new MutableClock(now,zone);}public Instant instant(){return now.get();}
 }
 @TestConfiguration static class TimeConfig {@Bean MutableClock clock(){return new MutableClock(new AtomicReference<>(Instant.parse("2027-03-08T12:00:00Z")),ZoneOffset.UTC);}}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired CalendarManagement calendars; @Autowired RoomsService rooms;
 @Autowired SporadicPreparation sporadicPreparation; @Autowired SporadicConfirmation sporadicConfirmation; @Autowired PeriodicPreparation preparation; @Autowired PeriodicConfirmation confirmation; @Autowired ReservationQueries queries; @Autowired ar.edu.aulas.references.ReferenceManagement references; @Autowired RescheduleService reschedules; @Autowired RoomMutationService roomChanges; @Autowired CancellationService cancellations; @Autowired MutableClock clock; @Autowired MockMvc mvc;
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


 long key(Map<String,Object> b){return Long.parseLong(b.get("id").toString());}
 RescheduleService.DateChange change(String id,String date){return new RescheduleService.DateChange(id,date,"11:00",3);}
 @SuppressWarnings("unchecked") RescheduleService.Request reviewed(Map<String,Object> b,List<RescheduleService.DateChange> dates){
  var r=new RescheduleService.Request(UUID.randomUUID(),((Number)b.get("version")).longValue(),dates,null,null);
  var review=reschedules.prepare(bedel,key(b),r);
  return new RescheduleService.Request(r.operationId(),r.version(),r.dates(),((Number)review.get("calendarVersion")).longValue(),(Map<String,Long>)review.get("roomVersions"));
 }
 @Test void sporadicOriginSurvivesSuccessiveMovesAndReplayAfterLaterMutation() {
  var b=saved();long id=key(b);String detail=ids(b).getFirst();var r=reviewed(b,List.of(change(detail,"2027-03-16")));
  assertThat(queries.get(id,true)).isEqualTo(b);var result=reschedules.confirm(bedel,id,r);
  var fresh=queries.get(id,true);var second=reviewed(fresh,List.of(change(detail,"2027-03-17")));reschedules.confirm(bedel,id,second);
  assertThat(db.queryForObject("select fecha_original::text from aulas.detalle_reserva where id_detalle=?",String.class,Long.parseLong(detail))).isEqualTo("2027-03-15");
  assertThat(db.queryForObject("select id_aula::text from aulas.detalle_reserva where id_detalle=?",String.class,Long.parseLong(detail))).isEqualTo(classroom.internalId());
  assertThat(queries.get(id,true)).containsKey("changes");assertThat(queries.get(id,false)).doesNotContainKeys("changes","teacherEmail","registrant");
  clock.now.set(Instant.parse("2028-01-01T00:00:00Z"));assertThat(reschedules.confirm(bedel,id,r)).isEqualTo(result);assertThat(cancellations.operation(bedel,r.operationId())).containsEntry("found",true);
  assertThatThrownBy(()->reschedules.confirm(bedel,id,new RescheduleService.Request(r.operationId(),r.version(),List.of(change(detail,"2027-03-18")),r.calendarVersion(),r.roomVersions()))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->db.update("update aulas.detalle_reserva set fecha_original='2027-03-16' where id_detalle=?",Long.parseLong(detail))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
 }
 @Test void periodicKeepsPatternAndMembershipAfterMovingOffWeekday() {
  var b=confirmation.confirm(admin,request());long id=key(b);String detail=ids(b).getFirst();var r=reviewed(b,List.of(change(detail,"2027-03-09")));reschedules.confirm(bedel,id,r);
  var fresh=queries.get(id,true);assertThat(fresh).containsEntry("patterns",b.get("patterns")).containsEntry("schedule",b.get("schedule"));
  assertThat(db.queryForObject("select fecha_original::text from aulas.detalle_reserva where id_detalle=?",String.class,Long.parseLong(detail))).isEqualTo("2027-03-08");
  var target=rooms.save(admin,null,new RoomsService.Room(null,"202",null,"General",40,"Habilitada","A",0,"Tiza",List.of("fans","air"),null,List.of()));
  @SuppressWarnings("unchecked") var groups=(List<Map<String,Object>>)roomChanges.options(bedel,id,new RoomMutationService.Version(1L)).get("groups");
  @SuppressWarnings("unchecked") var details=(List<String>)groups.getFirst().get("detailIds");assertThat(details).contains(detail);
  roomChanges.confirm(bedel,id,new RoomMutationService.Request(UUID.randomUUID(),1L,List.of(new RoomMutationService.Selection(groups.getFirst().get("groupId").toString(),details,target.internalId(),target.version()))));
  assertThat(db.queryForObject("select id_aula::text from aulas.detalle_reserva where id_detalle=?",String.class,Long.parseLong(detail))).isEqualTo(target.internalId());
 }
 @Test void rejectsOutsideAssignedPeriodsAndHolidaysButSporadicAllowsRecess() {
  var p=confirmation.confirm(admin,request());
  for(String date:List.of("2027-03-30","2027-04-12","2028-03-15"))assertThatThrownBy(()->reviewed(p,List.of(change(ids(p).getFirst(),date)))).isInstanceOf(DomainError.class);
  var b=sporadicConfirmation.confirm(admin,reviewedSporadic(sporadic("2027-03-29")));reschedules.confirm(bedel,key(b),reviewed(b,List.of(change(ids(b).getFirst(),"2027-03-30"))));
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where id_reserva=? and fecha='2027-03-30'",Long.class,key(b))).isEqualTo(1);
 }
 @Test void validatesModulesDatesUniqueIdsAndSameReservationDates() {
  var b=saved();var detail=ids(b).getFirst();
  for(var d:List.of(new RescheduleService.DateChange(detail,"2027-03-20","10:00",2),new RescheduleService.DateChange(detail,"2027-03-16","10:10",2),new RescheduleService.DateChange(detail,"2027-03-16","22:30",2),new RescheduleService.DateChange(detail,"2027-03-16","10:00",0)))assertThatThrownBy(()->reviewed(b,List.of(d))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->reviewed(b,List.of(change(detail,"2027-03-16"),change(detail,"2027-03-17")))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->reviewed(b,List.of(change(detail,"2027-03-16"),change(ids(b).getLast(),"2027-03-16")))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->reviewed(b,List.of(change(detail,"2027-03-29")))) .isInstanceOf(DomainError.class).hasMessageContaining("otra clase");
  assertThatThrownBy(()->reviewed(b,List.of(change("999999","2027-03-16")))).isInstanceOf(DomainError.class);assertThat(queries.get(key(b),true)).isEqualTo(b);
 }
 @Test void swapsDatesAtomicallyAndCanOccupyDateOfCancelledClass() {
  var b=saved();long id=key(b);var r=reviewed(b,List.of(new RescheduleService.DateChange(ids(b).getFirst(),"2027-03-29","10:00",2),new RescheduleService.DateChange(ids(b).getLast(),"2027-03-15","10:00",2)));reschedules.confirm(bedel,id,r);
  var fresh=queries.get(id,true);cancellations.confirm(bedel,id,cancel(fresh,List.of(ids(b).getLast()),"Libre para recuperación"));
  fresh=queries.get(id,true);reschedules.confirm(bedel,id,reviewed(fresh,List.of(change(ids(b).getFirst(),"2027-03-15"))));
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where id_reserva=? and fecha='2027-03-15'",Long.class,id)).isEqualTo(2);
 }
 @Test void concurrentOccupationAndChangedCalendarOrRoomVersionsRejectWholeSet() {
  var b=saved();long id=key(b);var r=reviewed(b,List.of(change(ids(b).getFirst(),"2027-03-16"),change(ids(b).getLast(),"2027-03-30")));
  db.update("update aulas.anio_lectivo set version=version+1 where id_anio_lectivo=?",year);assertThatThrownBy(()->reschedules.confirm(bedel,id,r)).isInstanceOf(DomainError.class).hasMessageContaining("cambiaron");
  db.update("update aulas.anio_lectivo set version=version-1 where id_anio_lectivo=?",year);db.update("update aulas.aula set version=version+1 where id_aula=?",Long.parseLong(classroom.internalId()));assertThatThrownBy(()->reschedules.confirm(bedel,id,r)).isInstanceOf(DomainError.class).hasMessageContaining("cambiaron");
  db.update("update aulas.aula set version=version-1 where id_aula=?",Long.parseLong(classroom.internalId()));
  var occupied=new SporadicPreparation.Request(2027,Long.toString(course),25,"General","Tiza",List.of("fans"),List.of(new SporadicPreparation.DateSlot("2027-03-30","11:00",2)));sporadicConfirmation.confirm(admin,reviewedSporadic(occupied));
  assertThatThrownBy(()->reschedules.confirm(bedel,id,r)).isInstanceOf(DomainError.class).hasMessageContaining("ocupada");assertThat(queries.get(id,true)).isEqualTo(b);assertThat(count("mutacion_reserva")).isZero();
 }
 @Test void failedAuditRollsBackDatesOriginsVersionAndLedger() {
  var b=saved();long id=key(b);var r=reviewed(b,List.of(change(ids(b).getFirst(),"2027-03-16")));
  db.execute("alter table aulas.evento_auditoria add constraint reject_reschedule check(operacion<>'REPROGRAMAR') not valid");
  try{assertThatThrownBy(()->reschedules.confirm(bedel,id,r)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);}finally{db.execute("alter table aulas.evento_auditoria drop constraint reject_reschedule");}
  assertThat(queries.get(id,true)).isEqualTo(b);assertThat(count("mutacion_reserva")).isZero();reschedules.confirm(bedel,id,r);
 }
 @Test void simultaneousReplayAndCancellationRaceDoNotMixResults() throws Exception {
  var b=saved();long id=key(b);var r=reviewed(b,List.of(change(ids(b).getFirst(),"2027-03-16")));var gate=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)){
   var a=pool.submit(()->{gate.await();return reschedules.confirm(bedel,id,r);});var c=pool.submit(()->{gate.await();return reschedules.confirm(bedel,id,r);});gate.countDown();assertThat(a.get(10,TimeUnit.SECONDS)).isEqualTo(c.get(10,TimeUnit.SECONDS));
  }
  var fresh=queries.get(id,true);var r2=reviewed(fresh,List.of(change(ids(b).getFirst(),"2027-03-17")));var cancel=cancel(fresh,ids(fresh),"Carrera");var start=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)){
   var a=pool.submit(()->{start.await();try{reschedules.confirm(bedel,id,r2);return true;}catch(DomainError e){return false;}});var c=pool.submit(()->{start.await();try{cancellations.confirm(bedel,id,cancel);return true;}catch(DomainError e){return false;}});start.countDown();assertThat(a.get(10,TimeUnit.SECONDS)^c.get(10,TimeUnit.SECONDS)).isTrue();
  }
  assertThat(queries.get(id,true)).containsEntry("version",2L);assertThat(count("mutacion_reserva")).isEqualTo(2);
 }
 @Test void revalidatesStartAfterWaitingForWriterLock() throws Exception {
  var b=saved();long id=key(b);var r=reviewed(b,List.of(change(ids(b).getFirst(),"2027-03-16")));var held=new CountDownLatch(1);var release=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)){
   var blocker=pool.submit(()->new TransactionTemplate(manager).execute(tx->{db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);held.countDown();try{if(!release.await(10,TimeUnit.SECONDS))throw new IllegalStateException("Timeout");}catch(InterruptedException e){throw new RuntimeException(e);}return true;}));
   assertThat(held.await(5,TimeUnit.SECONDS)).isTrue();var attempted=pool.submit(()->{try{reschedules.confirm(bedel,id,r);return true;}catch(DomainError e){return false;}});
   long limit=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);String sql="select count(*) from pg_stat_activity where wait_event_type='Lock' and query like 'select id from aulas.control_cuentas%'";
   while(db.queryForObject(sql,Long.class)==0 && System.nanoTime()<limit)Thread.sleep(10);assertThat(db.queryForObject(sql,Long.class)).isPositive();clock.now.set(Instant.parse("2027-03-15T13:00:00Z"));release.countDown();assertThat(blocker.get(10,TimeUnit.SECONDS)).isTrue();assertThat(attempted.get(10,TimeUnit.SECONDS)).isFalse();
  }finally{release.countDown();}
  assertThat(queries.get(id,true)).isEqualTo(b);
 }
 @Test void apiPermissionsHistoryPrivacyAndCancelledStartedSelections() throws Exception {
  var b=saved();long id=key(b);var r=reviewed(b,List.of(change(ids(b).getFirst(),"2027-03-16")));String body=new tools.jackson.databind.ObjectMapper().writeValueAsString(r);
  mvc.perform(post("/api/reservas/"+id+"/reprogramacion/preparacion").with(session(teacher)).contentType("application/json").content(body)).andExpect(status().isForbidden());
  mvc.perform(post("/api/reservas/"+id+"/reprogramacion/confirmacion").with(session(bedel)).contentType("application/json").content(body)).andExpect(status().isOk());
  mvc.perform(get("/api/reservas/"+id).with(session(teacher))).andExpect(status().isOk()).andExpect(jsonPath("$.changes").doesNotExist()).andExpect(jsonPath("$.teacherEmail").doesNotExist());
  db.update("update aulas.usuario set activo=false where id_usuario=?",bedel);assertThatThrownBy(()->reschedules.confirm(bedel,id,r)).isInstanceOf(DomainError.class);db.update("update aulas.usuario set activo=true where id_usuario=?",bedel);
  var fresh=queries.get(id,true);cancellations.confirm(bedel,id,cancel(fresh,List.of(ids(b).getFirst()),"No reprogramar"));
  var cancelled=queries.get(id,true);assertThatThrownBy(()->reviewed(cancelled,List.of(change(ids(b).getFirst(),"2027-03-17")))).isInstanceOf(DomainError.class).hasMessageContaining("cancelada");
 }
}
