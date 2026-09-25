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

@SpringBootTest @Testcontainers @AutoConfigureMockMvc @Import(CancellationTests.TimeConfig.class)
class CancellationTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 static class MutableClock extends Clock {
  final AtomicReference<Instant> now; final ZoneId zone;
  MutableClock(AtomicReference<Instant> now,ZoneId zone){this.now=now;this.zone=zone;}
  public ZoneId getZone(){return zone;}public Clock withZone(ZoneId zone){return new MutableClock(now,zone);}public Instant instant(){return now.get();}
 }
 @TestConfiguration static class TimeConfig {@Bean MutableClock clock(){return new MutableClock(new AtomicReference<>(Instant.parse("2027-03-08T12:00:00Z")),ZoneOffset.UTC);}}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired CalendarManagement calendars; @Autowired RoomsService rooms;
 @Autowired SporadicPreparation sporadicPreparation; @Autowired SporadicConfirmation sporadicConfirmation; @Autowired PeriodicPreparation preparation; @Autowired PeriodicConfirmation confirmation; @Autowired ReservationQueries queries; @Autowired CancellationService cancellations; @Autowired MutableClock clock; @Autowired MockMvc mvc;
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
 @Test void atomicCancellationReleasesRoomPreservesHistoryAndRecoversOriginalResult() {
  var b=saved();long id=Long.parseLong(b.get("id").toString());var keys=ids(b);
  var r=cancel(b,List.of(keys.getFirst()),"  Actividad suspendida  ");
  var review=cancellations.prepare(bedel,id,r);
  assertThat(review.get("count")).isEqualTo(1);assertThat(count("mutacion_reserva")).isZero();
  var result=cancellations.confirm(bedel,id,r);
  assertThat(result).containsEntry("state","CONFIRMADA").containsEntry("version",1L).containsEntry("reason","Actividad suspendida");
  assertThat(db.queryForObject("select motivo_cancelacion from aulas.detalle_reserva where id_detalle=?",String.class,Long.parseLong(keys.getFirst()))).isEqualTo("Actividad suspendida");
  assertThat(sporadicPreparation.prepare(sporadic("2027-03-15"),true).dates().getFirst().availableRooms()).hasSize(1);
  sporadicConfirmation.confirm(admin,reviewedSporadic(sporadic("2027-03-15")));
  var fresh=queries.get(id,true);cancellations.confirm(bedel,id,cancel(fresh,List.of(keys.getLast()),"Cierre"));
  clock.now.set(Instant.parse("2028-03-08T12:00:00Z"));
  assertThat(cancellations.confirm(bedel,id,r)).isEqualTo(result);
  assertThat(cancellations.operation(bedel,r.operationId())).containsEntry("found",true).containsEntry("result",result);
  assertThat(cancellations.operation(admin,r.operationId())).containsEntry("found",false);
  assertThat(db.queryForObject("select estado from aulas.reserva where id_reserva=?",String.class,id)).isEqualTo("CANCELADA");
  assertThat(count("mutacion_reserva")).isEqualTo(2);
 }
 @Test void reasonSelectionVersionAndChangedKeyRejectWithoutPartialChanges() {
  var b=saved();long id=Long.parseLong(b.get("id").toString());var keys=ids(b);
  for(var r:List.of(cancel(b,keys," "),cancel(b,List.of(),"x"),cancel(b,List.of(keys.getFirst(),keys.getFirst()),"x"),cancel(b,List.of(keys.getFirst(),"999999"),"x"),new CancellationService.Request(UUID.randomUUID(),99L,keys,"x")))
   assertThatThrownBy(()->cancellations.confirm(bedel,id,r)).isInstanceOf(DomainError.class);
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where estado='CANCELADA'",Long.class)).isZero();
  var r=cancel(b,List.of(keys.getFirst()),"x");cancellations.confirm(bedel,id,r);
  assertThatThrownBy(()->cancellations.confirm(bedel,id,new CancellationService.Request(r.operationId(),r.version(),r.detailIds(),"different"))).isInstanceOf(DomainError.class).hasMessageContaining("clave");
  assertThatThrownBy(()->cancellations.confirm(bedel,id,cancel(b,keys,"x"))).isInstanceOf(DomainError.class);
 }
 @Test void timeAfterReviewRejectsWholeSetAndPastKeepsHeaderConfirmed() {
  var b=saved();long id=Long.parseLong(b.get("id").toString());var r=cancel(b,ids(b),"x");cancellations.prepare(bedel,id,r);
  clock.now.set(Instant.parse("2027-03-15T13:00:00Z"));
  assertThatThrownBy(()->cancellations.confirm(bedel,id,r)).isInstanceOf(DomainError.class).hasMessageContaining("comenzó");
  assertThat(count("mutacion_reserva")).isZero();
  cancellations.confirm(bedel,id,cancel(b,List.of(ids(b).getLast()),"x"));
  assertThat(db.queryForObject("select estado from aulas.reserva where id_reserva=?",String.class,id)).isEqualTo("CONFIRMADA");
 }
 @Test void periodicExplicitContinuityDiffersFromNaturalEnd() {
  var b=confirmation.confirm(admin,request());long id=Long.parseLong(b.get("id").toString());var keys=ids(b);
  cancellations.confirm(bedel,id,cancel(b,List.of(keys.getFirst()),"Primera"));
  assertThat(db.queryForObject("select continuidad_cancelada_en is null from aulas.reserva_periodica where id_reserva=?",Boolean.class,id)).isTrue();
  var fresh=queries.get(id,true);
  cancellations.confirm(bedel,id,cancel(fresh,keys.subList(1,keys.size()),"Cese"));
  assertThat(db.queryForObject("select continuidad_cancelada_en is not null from aulas.reserva_periodica where id_reserva=?",Boolean.class,id)).isTrue();
  var natural=confirmation.confirm(admin,request());long naturalId=Long.parseLong(natural.get("id").toString());clock.now.set(Instant.parse("2027-12-01T12:00:00Z"));
  assertThat(db.queryForObject("select continuidad_cancelada_en is null from aulas.reserva_periodica where id_reserva=?",Boolean.class,naturalId)).isTrue();
 }
 @Test void auditFailureRollsBackEveryChangeAndAllowsSameKeyRetry() {
  var b=saved();long id=Long.parseLong(b.get("id").toString());var r=cancel(b,ids(b),"x");
  db.execute("alter table aulas.evento_auditoria add constraint reject_cancel check(operacion<>'CANCELAR_CLASES') not valid");
  try {assertThatThrownBy(()->cancellations.confirm(bedel,id,r)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);}finally{db.execute("alter table aulas.evento_auditoria drop constraint reject_cancel");}
  assertThat(count("mutacion_reserva")).isZero();assertThat(queries.get(id,true)).isEqualTo(b);
  cancellations.confirm(bedel,id,r);assertThat(count("mutacion_reserva")).isEqualTo(1);
 }
 @Test void concurrencySameKeyDoesNotDuplicateAndDifferentOperationsCompete() throws Exception {
  var b=saved();long id=Long.parseLong(b.get("id").toString());var r=cancel(b,List.of(ids(b).getFirst()),"x");var start=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   Callable<Map<String,Object>> action=()->{start.await();return cancellations.confirm(bedel,id,r);};var one=pool.submit(action);var two=pool.submit(action);start.countDown();assertThat(one.get(10,TimeUnit.SECONDS)).isEqualTo(two.get(10,TimeUnit.SECONDS));
  }
  assertThat(count("mutacion_reserva")).isEqualTo(1);
  var fresh=queries.get(id,true);var r2=cancel(fresh,List.of(ids(b).getLast()),"y");var r3=cancel(fresh,List.of(ids(b).getLast()),"z");var start2=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   var one=pool.submit(()->{start2.await();try{cancellations.confirm(bedel,id,r2);return true;}catch(DomainError e){return false;}});
   var two=pool.submit(()->{start2.await();try{cancellations.confirm(admin,id,r3);return true;}catch(DomainError e){return false;}});
   start2.countDown();assertThat(one.get(10,TimeUnit.SECONDS)).isNotEqualTo(two.get(10,TimeUnit.SECONDS));
  }
  assertThat(count("mutacion_reserva")).isEqualTo(2);
 }
 @Test void permissionAndJsonPrivacyAreEnforcedByHttpAndCurrentRole() throws Exception {
  var b=saved();long id=Long.parseLong(b.get("id").toString());var r=cancel(b,ids(b),"Suspensión");
  String body=new tools.jackson.databind.ObjectMapper().writeValueAsString(r);
  mvc.perform(post("/api/reservas/"+id+"/cancelaciones/preparacion").with(session(teacher)).contentType("application/json").content(body)).andExpect(status().isForbidden());
  mvc.perform(post("/api/reservas/"+id+"/cancelaciones/confirmacion").with(session(teacher)).contentType("application/json").content(body)).andExpect(status().isForbidden());
  mvc.perform(post("/api/reservas/"+id+"/cancelaciones/confirmacion").with(session(bedel)).contentType("application/json").content(body)).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("CANCELADA"));
  mvc.perform(get("/api/reservas/"+id).with(session(teacher))).andExpect(status().isOk()).andExpect(jsonPath("$.occurrences[0].cancellation.reason").value("Suspensión")).andExpect(jsonPath("$.occurrences[0].cancellation.actor").doesNotExist()).andExpect(jsonPath("$.teacherEmail").doesNotExist()).andExpect(jsonPath("$.registrant").doesNotExist());
  mvc.perform(get("/api/reservas/mutaciones/"+r.operationId()).with(session(teacher))).andExpect(status().isForbidden());
  db.update("update aulas.usuario set activo=false where id_usuario=?",bedel);
  assertThatThrownBy(()->cancellations.confirm(bedel,id,r)).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->cancellations.operation(bedel,r.operationId())).isInstanceOf(DomainError.class);
 }
 @Test void waitingWriterRevalidatesTimeAfterAcquiringLocks() throws Exception {
  var b=saved();long id=Long.parseLong(b.get("id").toString());var r=cancel(b,ids(b),"x");
  var held=new CountDownLatch(1);var release=new CountDownLatch(1);var attempted=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   var blocker=pool.submit(()->new TransactionTemplate(manager).execute(tx->{db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);held.countDown();try{if(!release.await(10,TimeUnit.SECONDS))throw new IllegalStateException("Timeout");}catch(InterruptedException e){throw new RuntimeException(e);}return true;}));
   assertThat(held.await(5,TimeUnit.SECONDS)).isTrue();
   var cancellation=pool.submit(()->{attempted.countDown();try{cancellations.confirm(bedel,id,r);return true;}catch(DomainError e){return false;}});
   assertThat(attempted.await(5,TimeUnit.SECONDS)).isTrue();waitForPermissionLock();clock.now.set(Instant.parse("2027-03-15T13:00:00Z"));release.countDown();
   assertThat(blocker.get(10,TimeUnit.SECONDS)).isTrue();assertThat(cancellation.get(10,TimeUnit.SECONDS)).isFalse();
  }finally{release.countDown();}
  assertThat(count("mutacion_reserva")).isZero();assertThat(queries.get(id,true)).isEqualTo(b);
 }
 @Test void cancellationAfterSeriesStartsPreservesPastAndCancelsContinuity() {
  var b=confirmation.confirm(admin,request());long id=Long.parseLong(b.get("id").toString());clock.now.set(Instant.parse("2027-03-08T12:30:00Z"));
  var keys=ids(b);cancellations.confirm(bedel,id,cancel(b,keys.subList(1,keys.size()),"Cese futuro"));
  assertThat(queries.get(id,true)).containsEntry("state","CONFIRMADA").containsKey("continuityCancelledAt");
  assertThat(db.queryForObject("select estado from aulas.detalle_reserva where id_detalle=?",String.class,Long.parseLong(keys.getFirst()))).isEqualTo("CONFIRMADA");
 }
 @Test void releaseIsAllowedAfterYearClosedButCancelledAndForeignDetailsAreRejected() {
  var b=saved();long id=Long.parseLong(b.get("id").toString());
  var other=sporadicConfirmation.confirm(admin,reviewedSporadic(sporadic("2027-04-05")));
  assertThatThrownBy(()->cancellations.confirm(bedel,id,cancel(b,List.of(ids(b).getFirst(),ids(other).getFirst()),"x"))).isInstanceOf(DomainError.class);
  db.update("update aulas.anio_lectivo set estado='CERRADO' where id_anio_lectivo=?",year);
  cancellations.confirm(bedel,id,cancel(b,List.of(ids(b).getFirst()),"x"));
  var fresh=queries.get(id,true);
  assertThatThrownBy(()->cancellations.confirm(bedel,id,cancel(fresh,ids(b),"x"))).isInstanceOf(DomainError.class);
  assertThat(count("mutacion_reserva")).isEqualTo(1);
 }

 void waitForPermissionLock() throws InterruptedException {
  String sql="select count(*) from pg_stat_activity where datname=current_database() and wait_event_type='Lock' and query like 'select id from aulas.control_cuentas%'";
  long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);
  while(db.queryForObject(sql,Long.class)==0 && System.nanoTime()<deadline) Thread.sleep(10);
  assertThat(db.queryForObject(sql,Long.class)).isPositive();
 }

}
