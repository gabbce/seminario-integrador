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

@SpringBootTest @Testcontainers @AutoConfigureMockMvc @Import(RoomMutationTests.TimeConfig.class)
class RoomMutationTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 static class MutableClock extends Clock {
  final AtomicReference<Instant> now; final ZoneId zone;
  MutableClock(AtomicReference<Instant> now,ZoneId zone){this.now=now;this.zone=zone;}
  public ZoneId getZone(){return zone;}public Clock withZone(ZoneId zone){return new MutableClock(now,zone);}public Instant instant(){return now.get();}
 }
 @TestConfiguration static class TimeConfig {@Bean MutableClock clock(){return new MutableClock(new AtomicReference<>(Instant.parse("2027-03-08T12:00:00Z")),ZoneOffset.UTC);}}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired CalendarManagement calendars; @Autowired RoomsService rooms;
 @Autowired SporadicPreparation sporadicPreparation; @Autowired SporadicConfirmation sporadicConfirmation; @Autowired PeriodicPreparation preparation; @Autowired PeriodicConfirmation confirmation; @Autowired ReservationQueries queries; @Autowired ar.edu.aulas.references.ReferenceManagement references; @Autowired RoomMutationService changes; @Autowired CancellationService cancellations; @Autowired MutableClock clock; @Autowired MockMvc mvc;
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


 RoomsService.Room room(String label){return rooms.save(admin,null,new RoomsService.Room(null,label,null,"General",40,"Habilitada","A",0,"Tiza",List.of("fans","air"),null,List.of()));}
 @SuppressWarnings("unchecked") List<Map<String,Object>> groups(long id,long version){return (List<Map<String,Object>>)changes.options(bedel,id,new RoomMutationService.Version(version)).get("groups");}
 @SuppressWarnings("unchecked") RoomMutationService.Selection select(Map<String,Object> group,RoomsService.Room room){return new RoomMutationService.Selection(group.get("groupId").toString(),(List<String>)group.get("detailIds"),room.internalId(),room.version());}
 RoomMutationService.Request change(long id,long version,RoomsService.Room room){return new RoomMutationService.Request(UUID.randomUUID(),version,groups(id,version).stream().map(g->select(g,room)).toList());}
 long key(Map<String,Object> booking){return Long.parseLong(booking.get("id").toString());}
 @Test void changesSporadicDatesAtomicallyWithHistoryAndImmutableRecovery() {
  var b=saved();long id=key(b);var target=room("202");var r=change(id,0,target);var review=changes.prepare(bedel,id,r);assertThat(queries.get(id,true)).isEqualTo(b);
  var result=changes.confirm(bedel,id,r);assertThat(result).containsEntry("changes",review.get("changes")).containsEntry("version",1L);
  assertThat(db.queryForList("select distinct id_aula from aulas.detalle_reserva where id_reserva=?",Long.class,id)).containsExactly(Long.parseLong(target.internalId()));
  assertThat(queries.get(id,true)).containsKey("changes");assertThat(queries.get(id,false)).doesNotContainKeys("teacherEmail","registrant","changes");
  clock.now.set(Instant.parse("2028-01-01T00:00:00Z"));assertThat(changes.confirm(bedel,id,r)).isEqualTo(result);assertThat(cancellations.operation(bedel,r.operationId())).containsEntry("result",result);
  assertThatThrownBy(()->changes.confirm(bedel,id,new RoomMutationService.Request(r.operationId(),1L,r.selections()))).isInstanceOf(DomainError.class);assertThat(count("mutacion_reserva")).isEqualTo(1);
 }
 @Test void wholePatternIncludesRescheduledFutureButKeepsPastAndCancelledDetails() {
  var b=confirmation.confirm(admin,request());long id=key(b);long pattern=db.queryForObject("select id_patron from aulas.patron_semanal where id_reserva=?",Long.class,id);
  String cancelled=db.queryForObject("select id_detalle::text from aulas.detalle_reserva where id_reserva=? and fecha='2027-03-15'",String.class,id);
  cancellations.confirm(bedel,id,cancel(b,List.of(cancelled),"Preservar cancelada"));
  db.update("update aulas.detalle_reserva set fecha='2027-04-06' where id_reserva=? and fecha='2027-04-05'",id);
  clock.now.set(Instant.parse("2027-03-09T12:00:00Z"));var target=room("202");var r=change(id,1,target);
  assertThat(r.selections()).hasSize(1);assertThat(r.selections().getFirst().detailIds()).hasSize(2);
  var selected=r.selections().getFirst();assertThatThrownBy(()->changes.confirm(bedel,id,new RoomMutationService.Request(UUID.randomUUID(),1L,List.of(new RoomMutationService.Selection(selected.groupId(),List.of(selected.detailIds().getFirst()),selected.roomId(),selected.roomVersion()))))).isInstanceOf(DomainError.class);
  changes.confirm(bedel,id,r);
  assertThat(db.queryForObject("select id_aula from aulas.patron_semanal where id_patron=?",Long.class,pattern)).isEqualTo(Long.parseLong(target.internalId()));
  assertThat(db.queryForList("select id_aula from aulas.detalle_reserva where id_reserva=? and fecha in ('2027-03-08','2027-03-15')",Long.class,id)).containsOnly(Long.parseLong(classroom.internalId()));
  assertThat(db.queryForObject("select id_aula from aulas.detalle_reserva where id_reserva=? and fecha='2027-04-06' and fecha_original='2027-04-05'",Long.class,id)).isEqualTo(Long.parseLong(target.internalId()));
 }
 @Test void newOccupationAfterReviewRejectsAllSelectedDates() {
  var b=saved();long id=key(b);var target=room("202");var r=change(id,0,target);changes.prepare(bedel,id,r);
  var p=reviewedSporadic(sporadic("2027-03-29"));sporadicConfirmation.confirm(admin,new SporadicConfirmation.Request(p.operationId(),p.proposal(),p.teacherId(),p.calendarVersion(),List.of(new SporadicConfirmation.Selection("2027-03-29",target.internalId(),target.version()))));
  assertThatThrownBy(()->changes.confirm(bedel,id,r)).isInstanceOf(DomainError.class).hasMessageContaining("ocupada");assertThat(queries.get(id,true)).isEqualTo(b);assertThat(count("mutacion_reserva")).isZero();
 }
 @Test void internalOverlapRejectedAndRoomSwapCommitsWithDeferredExclusion() {
  var target=room("202");var p=reviewedSporadic(sporadic("2027-03-15","2027-03-29"));
  var b=sporadicConfirmation.confirm(admin,new SporadicConfirmation.Request(p.operationId(),p.proposal(),p.teacherId(),p.calendarVersion(),List.of(p.selections().getFirst(),new SporadicConfirmation.Selection("2027-03-29",target.internalId(),target.version()))));long id=key(b);
  db.update("update aulas.detalle_reserva set fecha='2027-03-15' where id_reserva=? and fecha='2027-03-29'",id);
  var gs=groups(id,0);
  assertThat(gs).allSatisfy(g->assertThat((List<?>)g.get("availableRooms")).isEmpty());
  var simultaneous=changes.options(bedel,id,new RoomMutationService.Version(0L,gs.stream().map(g->g.get("groupId").toString()).toList()));
  assertThat((List<?>)simultaneous.get("groups")).allSatisfy(g->assertThat((List<?>)((Map<?,?>)g).get("availableRooms")).hasSize(1));
  var third=room("303");var conflict=new RoomMutationService.Request(UUID.randomUUID(),0L,gs.stream().map(g->select(g,third)).toList());
  assertThatThrownBy(()->changes.confirm(bedel,id,conflict)).isInstanceOf(DomainError.class).hasMessageContaining("superponen");
  var selections=gs.stream().map(g->{String detail=((List<?>)g.get("detailIds")).getFirst().toString();long current=db.queryForObject("select id_aula from aulas.detalle_reserva where id_detalle=?",Long.class,Long.parseLong(detail));return select(g,current==Long.parseLong(classroom.internalId())?target:classroom);}).toList();
  changes.confirm(bedel,id,new RoomMutationService.Request(UUID.randomUUID(),0L,selections));
  for(var s:selections)assertThat(db.queryForObject("select id_aula::text from aulas.detalle_reserva where id_detalle=?",String.class,Long.parseLong(s.detailIds().getFirst()))).isEqualTo(s.roomId());
 }
 @Test void versionRequirementsRoomVersionYearAndOwnershipRejectWithoutWrites() {
  var b=saved();long id=key(b);var target=room("202");var r=change(id,0,target);var first=r.selections().getFirst();
  assertThatThrownBy(()->changes.confirm(bedel,id,new RoomMutationService.Request(UUID.randomUUID(),1L,r.selections()))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->changes.confirm(bedel,id,new RoomMutationService.Request(UUID.randomUUID(),0L,List.of(new RoomMutationService.Selection(first.groupId(),List.of("999999"),target.internalId(),target.version()))))).isInstanceOf(DomainError.class);
  db.update("update aulas.aula set capacidad=10 where id_aula=?",Long.parseLong(target.internalId()));assertThatThrownBy(()->changes.confirm(bedel,id,r)).isInstanceOf(DomainError.class).hasMessageContaining("requisitos");
  db.update("update aulas.aula set capacidad=40,version=1 where id_aula=?",Long.parseLong(target.internalId()));assertThatThrownBy(()->changes.confirm(bedel,id,r)).isInstanceOf(DomainError.class).hasMessageContaining("cambió");
  db.update("update aulas.aula set version=0 where id_aula=?",Long.parseLong(target.internalId()));db.update("update aulas.anio_lectivo set estado='CERRADO' where id_anio_lectivo=?",year);assertThatThrownBy(()->changes.confirm(bedel,id,r)).isInstanceOf(DomainError.class).hasMessageContaining("habilitado");
  assertThat(queries.get(id,true)).isEqualTo(b);assertThat(count("mutacion_reserva")).isZero();
 }
 @Test void auditFailureRollsBackPatternsDetailsVersionAndLedger() {
  var b=confirmation.confirm(admin,request());long id=key(b);var r=change(id,0,room("202"));
  db.execute("alter table aulas.evento_auditoria add constraint reject_rooms check(operacion<>'CAMBIAR_AULAS') not valid");
  try{assertThatThrownBy(()->changes.confirm(bedel,id,r)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);}finally{db.execute("alter table aulas.evento_auditoria drop constraint reject_rooms");}
  assertThat(queries.get(id,true)).isEqualTo(b);assertThat(count("mutacion_reserva")).isZero();changes.confirm(bedel,id,r);
 }
 @Test void simultaneousSameKeyRecoversOneResultAndCancellationRaceHasOneWinner() throws Exception {
  var b=saved();long id=key(b);var r=change(id,0,room("202"));var start=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)){
   var a=pool.submit(()->{start.await();return changes.confirm(bedel,id,r);});var c=pool.submit(()->{start.await();return changes.confirm(bedel,id,r);});start.countDown();assertThat(a.get(10,TimeUnit.SECONDS)).isEqualTo(c.get(10,TimeUnit.SECONDS));
  }
  var r2=change(id,1,room("303"));var fresh=queries.get(id,true);var cancel=cancel(fresh,ids(fresh),"Carrera");var gate=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)){
   var a=pool.submit(()->{gate.await();try{changes.confirm(bedel,id,r2);return true;}catch(DomainError e){return false;}});var c=pool.submit(()->{gate.await();try{cancellations.confirm(bedel,id,cancel);return true;}catch(DomainError e){return false;}});gate.countDown();assertThat(a.get(10,TimeUnit.SECONDS)^c.get(10,TimeUnit.SECONDS)).isTrue();
  }
  assertThat(queries.get(id,true)).containsEntry("version",2L);assertThat(count("mutacion_reserva")).isEqualTo(2);
 }
 @Test void timeAfterLockCannotSilentlyReduceReviewedPattern() throws Exception {
  var b=confirmation.confirm(admin,request());long id=key(b);var r=change(id,0,room("202"));var held=new CountDownLatch(1);var release=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)){
   var blocker=pool.submit(()->new TransactionTemplate(manager).execute(tx->{db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);held.countDown();try{if(!release.await(10,TimeUnit.SECONDS))throw new IllegalStateException("Timeout");}catch(InterruptedException e){throw new RuntimeException(e);}return true;}));
   assertThat(held.await(5,TimeUnit.SECONDS)).isTrue();var attempted=pool.submit(()->{try{changes.confirm(bedel,id,r);return true;}catch(DomainError e){return false;}});
   long limit=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);String sql="select count(*) from pg_stat_activity where wait_event_type='Lock' and query like 'select id from aulas.control_cuentas%'";
   while(db.queryForObject(sql,Long.class)==0 && System.nanoTime()<limit)Thread.sleep(10);assertThat(db.queryForObject(sql,Long.class)).isPositive();
   clock.now.set(Instant.parse("2027-03-08T12:30:00Z"));release.countDown();assertThat(blocker.get(10,TimeUnit.SECONDS)).isTrue();assertThat(attempted.get(10,TimeUnit.SECONDS)).isFalse();
  }finally{release.countDown();}
  assertThat(queries.get(id,true)).isEqualTo(b);
 }
 @Test void apiChecksCurrentPermissionsAndTeacherJsonOmitsAudit() throws Exception {
  var b=saved();long id=key(b);var r=change(id,0,room("202"));String body=new tools.jackson.databind.ObjectMapper().writeValueAsString(r);
  for(String endpoint:List.of("opciones","preparacion","confirmacion"))mvc.perform(post("/api/reservas/"+id+"/aulas/"+endpoint).with(session(teacher)).contentType("application/json").content(body)).andExpect(status().isForbidden());
  mvc.perform(post("/api/reservas/"+id+"/aulas/preparacion").with(session(bedel)).contentType("application/json").content(body)).andExpect(status().isOk());
  mvc.perform(post("/api/reservas/"+id+"/aulas/confirmacion").with(session(bedel)).contentType("application/json").content(body)).andExpect(status().isOk());
  mvc.perform(get("/api/reservas/"+id).with(session(teacher))).andExpect(status().isOk()).andExpect(jsonPath("$.changes").doesNotExist()).andExpect(jsonPath("$.teacherEmail").doesNotExist());
  db.update("update aulas.usuario set activo=false where id_usuario=?",bedel);assertThatThrownBy(()->changes.confirm(bedel,id,r)).isInstanceOf(DomainError.class);
 }
}
