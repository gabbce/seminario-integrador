package ar.edu.aulas;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.calendar.CalendarImpactService;
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

@SpringBootTest @Testcontainers @AutoConfigureMockMvc @Import(CalendarImpactTests.TimeConfig.class)
class CalendarImpactTests {
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
 @Autowired CalendarImpactService impact;
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
 CalendarManagement.Edit extension(){return edit(Map.of("first",List.of("2027-03-01","2027-03-29"),"second",List.of("2027-04-05","2027-04-26")),List.of(),"Habilitado");}
 CalendarImpactService.Request impactRequest(CalendarManagement.Edit edit){return new CalendarImpactService.Request(UUID.randomUUID(),edit,impact.prepare(admin,year,edit).stamp());}
 @Test void extensionAndHolidayRemovalAtomicReplayAndHistory() {
  var b=confirmation.confirm(admin,request());long before=count("detalle_reserva");var e=extension();var review=impact.prepare(admin,year,e);
  assertThat(review.canConfirm()).isTrue();assertThat(review.added()).extracting(CalendarImpactService.Added::date).containsExactly("2027-03-29","2027-04-12","2027-04-26");
  assertThat(count("detalle_reserva")).isEqualTo(before);assertThat(calendars.get(year).version()).isZero();
  var req=new CalendarImpactService.Request(UUID.randomUUID(),e,review.stamp());var result=impact.confirm(admin,year,req);
  assertThat(count("detalle_reserva")).isEqualTo(before+3);assertThat(calendars.get(year).version()).isOne();assertThat(queries.get(key(b),true)).containsEntry("version",1L).containsKey("changes");
  clock.now.set(Instant.parse("2028-01-01T12:00:00Z"));assertThat(impact.confirm(admin,year,req)).isEqualTo(result);assertThat(impact.operation(admin,req.operationId())).containsEntry("found",true);assertThatThrownBy(()->impact.operation(bedel,req.operationId())).isInstanceOf(DomainError.class);
 }
 @Test void preserveExcludedCancelledReprogrammedOriginsAndPatternRoom() {
  var b=confirmation.confirm(admin,request());long id=key(b);String first=ids(b).getFirst();
  reschedules.confirm(bedel,id,reviewed(b,List.of(change(first,"2027-03-09"))));
  var fresh=queries.get(id,true);String cancelled=db.queryForObject("select id_detalle::text from aulas.detalle_reserva where id_reserva=? and fecha='2027-03-15'",String.class,id);
  cancellations.confirm(bedel,id,cancel(fresh,List.of(cancelled),"Conservar cancelada"));
  var target=rooms.save(admin,null,new RoomsService.Room(null,"202",null,"General",40,"Habilitada","A",0,"Tiza",List.of("fans","air"),null,List.of()));
  @SuppressWarnings("unchecked") var groups=(List<Map<String,Object>>)roomChanges.options(bedel,id,new RoomMutationService.Version(2L)).get("groups");
  var selections=groups.stream().map(g->new RoomMutationService.Selection(g.get("groupId").toString(),((List<?>)g.get("classes")).stream().map(o->((Map<?,?>)o).get("id").toString()).toList(),target.internalId(),target.version())).toList();
  roomChanges.confirm(bedel,id,new RoomMutationService.Request(UUID.randomUUID(),2L,selections));
  var e=extension();var review=impact.prepare(admin,year,e);assertThat(review.added()).allMatch(a->a.room().equals("202"));
  impact.confirm(admin,year,new CalendarImpactService.Request(UUID.randomUUID(),e,review.stamp()));
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where id_reserva=? and fecha_original in ('2027-03-08','2027-03-15')",Long.class,id)).isEqualTo(2);
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where id_reserva=? and fecha_original='2027-03-22'",Long.class,id)).isZero();
 }
 @Test void naturalEndCanExtendButExplicitCeseCannotAndPastNeverRegenerates() {
  var b=confirmation.confirm(admin,reviewed(proposal("first","09:30",List.of()),UUID.randomUUID()));
  clock.now.set(Instant.parse("2027-03-23T12:00:00Z"));var e=extension();assertThat(impact.prepare(admin,year,e).added()).extracting(CalendarImpactService.Added::date).containsExactly("2027-03-29");
  impact.confirm(admin,year,impactRequest(e));
  var fresh=queries.get(key(b),true);String future=db.queryForObject("select id_detalle::text from aulas.detalle_reserva where id_reserva=? and fecha='2027-03-29'",String.class,key(b));
  cancellations.confirm(bedel,key(b),cancel(fresh,List.of(future),"Cese de continuidad"));
  var next=edit(Map.of("first",List.of("2027-02-01","2027-04-02"),"second",List.of("2027-04-05","2027-04-26")),List.of(),"Habilitado");
  assertThat(impact.prepare(admin,year,next).added()).isEmpty();
 }
 @Test void conflictBlocksEntireCalendarAndShowsContactsAndInformationalRooms() {
  confirmation.confirm(admin,request());sporadicConfirmation.confirm(admin,reviewedSporadic(sporadic("2027-03-29")));
  rooms.save(admin,null,new RoomsService.Room(null,"202",null,"General",40,"Habilitada","A",0,"Tiza",List.of("fans","air"),null,List.of()));
  var e=extension();var review=impact.prepare(admin,year,e);long count=count("detalle_reserva");assertThat(review.canConfirm()).isFalse();assertThat(review.conflicts().getFirst().occupants()).isNotEmpty();assertThat(review.conflicts().getFirst().alternatives()).contains("202");
  assertThatThrownBy(()->impact.confirm(admin,year,new CalendarImpactService.Request(UUID.randomUUID(),e,review.stamp()))).isInstanceOf(DomainError.class);
  assertThat(calendars.get(year).version()).isZero();assertThat(count("detalle_reserva")).isEqualTo(count);assertThat(count("operacion_calendario")).isZero();
 }
 @Test void activeDependenciesRejectHolidayOrShorteningButUnusedChangesSave() {
  confirmation.confirm(admin,request());var c=calendars.get(year);
  assertThatThrownBy(()->impact.prepare(admin,year,edit(c.terms(),List.of("2027-03-15","2027-04-12"),"Habilitado"))).hasMessageContaining("afecta");
  assertThatThrownBy(()->impact.prepare(admin,year,edit(Map.of("first",List.of("2027-03-01","2027-03-14"),"second",c.terms().get("second")),c.holidays(),"Habilitado"))).hasMessageContaining("recorte");
  var e=edit(Map.of("first",List.of("2027-03-01","2027-03-21"),"second",c.terms().get("second")),List.of("2027-03-16","2027-04-12"),"Habilitado");
  assertThat(impact.prepare(admin,year,e).added()).isEmpty();impact.confirm(admin,year,impactRequest(e));assertThat(calendars.get(year).holidays()).contains("2027-03-16");
 }
 @Test void staleCalendarReservationRoomAndNewReservationInvalidateReview() {
  var b=confirmation.confirm(admin,request());var e=extension();var req=impactRequest(e);
  db.update("update aulas.reserva set version=version+1 where id_reserva=?",key(b));assertThatThrownBy(()->impact.confirm(admin,year,req)).hasMessageContaining("impacto cambió");
  var old=impactRequest(e);rooms.save(admin,Long.parseLong(classroom.internalId()),changedRoom("Habilitada",35,List.of("fans","air")));assertThatThrownBy(()->impact.confirm(admin,year,old)).hasMessageContaining("impacto cambió");
  classroom=rooms.get(Long.parseLong(classroom.internalId()));var beforeNew=impactRequest(e);sporadicConfirmation.confirm(admin,reviewedSporadic(sporadic("2027-03-30")));assertThatThrownBy(()->impact.confirm(admin,year,beforeNew)).hasMessageContaining("impacto cambió");
  var beforeCalendar=impactRequest(e);db.update("update aulas.anio_lectivo set version=version+1 where id_anio_lectivo=?",year);assertThatThrownBy(()->impact.confirm(admin,year,beforeCalendar)).hasMessageContaining("calendario cambió");
 }
 @Test void auditFailureRollsBackCalendarDetailsVersionsAndLedger() {
  var b=confirmation.confirm(admin,request());var req=impactRequest(extension());long details=count("detalle_reserva");
  db.execute("create function aulas.fail_calendar_audit() returns trigger language plpgsql as $$ begin if NEW.operacion='EXTENDER_CALENDARIO' then raise exception 'forced audit failure'; end if; return NEW; end $$");
  db.execute("create trigger fail_calendar_audit before insert on aulas.evento_auditoria for each row execute function aulas.fail_calendar_audit()");
  try{assertThatThrownBy(()->impact.confirm(admin,year,req)).isInstanceOf(org.springframework.dao.DataAccessException.class);}finally{db.execute("drop trigger fail_calendar_audit on aulas.evento_auditoria");db.execute("drop function aulas.fail_calendar_audit()");}
  assertThat(calendars.get(year).version()).isZero();assertThat(count("detalle_reserva")).isEqualTo(details);assertThat(count("operacion_calendario")).isZero();assertThat(queries.get(key(b),true)).containsEntry("version",0L);
 }
 @Test void concurrentSameOperationOnlyAppendsOnce() throws Exception {
  confirmation.confirm(admin,request());var req=impactRequest(extension());long before=count("detalle_reserva");
  try(var executor=Executors.newFixedThreadPool(2)){var gate=new CountDownLatch(1);var a=executor.submit(()->{gate.await();return impact.confirm(admin,year,req);});var b=executor.submit(()->{gate.await();return impact.confirm(admin,year,req);});gate.countDown();assertThat(a.get(20,TimeUnit.SECONDS)).isEqualTo(b.get(20,TimeUnit.SECONDS));}
  assertThat(count("detalle_reserva")).isEqualTo(before+3);assertThat(count("operacion_calendario")).isOne();
 }
 @Test void timeRevalidatedAfterRealLock() throws Exception {
  confirmation.confirm(admin,request());var req=impactRequest(extension());var locked=new CountDownLatch(1);var release=new CountDownLatch(1);
  try(var executor=Executors.newFixedThreadPool(2)){
   var holder=executor.submit(()->new TransactionTemplate(manager).execute(tx->{db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);locked.countDown();try{release.await(15,TimeUnit.SECONDS);}catch(InterruptedException ex){throw new RuntimeException(ex);}return null;}));
   assertThat(locked.await(5,TimeUnit.SECONDS)).isTrue();var pending=executor.submit(()->impact.confirm(admin,year,req));
   long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(5);boolean waiting=false;
   while(System.nanoTime()<deadline){if(db.queryForObject("select count(*) from pg_stat_activity where wait_event_type='Lock' and query like '%control_cuentas%'",Long.class)>0){waiting=true;break;}Thread.sleep(20);}
   assertThat(waiting).isTrue();clock.now.set(Instant.parse("2027-03-29T13:00:00Z"));release.countDown();holder.get(10,TimeUnit.SECONDS);assertThatThrownBy(()->pending.get(10,TimeUnit.SECONDS)).hasCauseInstanceOf(DomainError.class);
  }finally{release.countDown();}assertThat(calendars.get(year).version()).isZero();
 }
 @Test void adminApiOnlyOwnRecoveryAndPrivateHistory() throws Exception {
  var b=confirmation.confirm(admin,request());var e=extension();String body=new tools.jackson.databind.ObjectMapper().writeValueAsString(e);
  for(long forbidden:List.of(bedel,teacher))mvc.perform(post("/api/administracion/calendarios/"+year+"/impacto").with(session(forbidden)).contentType("application/json").content(body)).andExpect(status().isForbidden());
  var req=impactRequest(e);impact.confirm(admin,year,req);long other=account("ADMINISTRADOR");assertThat(impact.operation(other,req.operationId())).containsEntry("found",false);
  mvc.perform(get("/api/reservas/"+key(b)).with(session(teacher))).andExpect(status().isOk()).andExpect(jsonPath("$.changes").doesNotExist()).andExpect(jsonPath("$.teacherEmail").doesNotExist());
  db.update("update aulas.usuario set activo=false where id_usuario=?",admin);assertThatThrownBy(()->impact.confirm(admin,year,req)).isInstanceOf(DomainError.class);
 }
 @Test void competingNewReservationCannotOverlapGeneratedClasses() throws Exception {
  confirmation.confirm(admin,request());var calendarRequest=impactRequest(extension());var bookingRequest=reviewedSporadic(sporadic("2027-03-29"));
  try(var executor=Executors.newFixedThreadPool(2)){
   var start=new CountDownLatch(1);
   var a=executor.submit(()->{start.await();try{impact.confirm(admin,year,calendarRequest);return true;}catch(DomainError e){return false;}});
   var b=executor.submit(()->{start.await();try{sporadicConfirmation.confirm(bedel,bookingRequest);return true;}catch(DomainError e){return false;}});
   start.countDown();assertThat(List.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
  }
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where fecha='2027-03-29' and estado='CONFIRMADA'",Long.class)).isOne();
 }
 @Test void simultaneousSeriesConflictAndIncompatiblePatternRoomBlockWholeSet() {
  var b=confirmation.confirm(admin,request());
  var other=reviewed(proposal("second","09:30",List.of()),UUID.randomUUID());
  // Another room permits the existing series, then occupies the newly removed holiday.
  var room2=rooms.save(admin,null,new RoomsService.Room(null,"202",null,"General",40,"Habilitada","A",0,"Tiza",List.of("fans","air"),null,List.of()));
  var selection=other.selections().getFirst();
  confirmation.confirm(admin,new PeriodicConfirmation.Request(other.operationId(),other.proposal(),other.teacherId(),other.calendarVersion(),List.of(new PeriodicConfirmation.Selection(selection.day(),room2.internalId(),room2.version(),selection.dates()))));
  // Only isolated fixtures bypass mutation services to simulate imported, conflicting patterns.
  db.update("update aulas.patron_semanal set id_aula=? where id_reserva<>?",Long.parseLong(classroom.internalId()),key(b));
  assertThat(impact.prepare(admin,year,extension()).conflicts()).anyMatch(c->c.reason().contains("entre sí"));
  db.update("update aulas.aula set capacidad=1,version=version+1 where id_aula=?",Long.parseLong(classroom.internalId()));
  assertThat(impact.prepare(admin,year,extension()).conflicts()).anyMatch(c->c.reason().contains("requisitos"));
 }
 @Test void emptyCalendarCanBeDeletedWithoutErasingImmutableResult() {
  var created=calendars.create(admin,new CalendarManagement.Create(2028));long id=Long.parseLong(created.id());
  var edit=new CalendarManagement.Edit(0L,2028,"En preparación",created.terms(),List.of(),Map.of());
  var req=new CalendarImpactService.Request(UUID.randomUUID(),edit,impact.prepare(admin,id,edit).stamp());var result=impact.confirm(admin,id,req);
  calendars.delete(admin,id,1L);assertThat(impact.confirm(admin,id,req)).isEqualTo(result);
 }

 @Test void calendarAndPatternReassignmentCompeteWithoutPartialPattern() throws Exception {
  var b=confirmation.confirm(admin,request());long id=key(b);var extension=impactRequest(extension());long before=count("detalle_reserva");
  var target=rooms.save(admin,null,new RoomsService.Room(null,"202",null,"General",40,"Habilitada","A",0,"Tiza",List.of("fans","air"),null,List.of()));
  @SuppressWarnings("unchecked") var groups=(List<Map<String,Object>>)roomChanges.options(bedel,id,new RoomMutationService.Version(0L)).get("groups");
  var selections=groups.stream().map(g->{@SuppressWarnings("unchecked") var details=(List<String>)g.get("detailIds");return new RoomMutationService.Selection(g.get("groupId").toString(),details,target.internalId(),target.version());}).toList();
  var reassignment=new RoomMutationService.Request(UUID.randomUUID(),0L,selections);
  boolean calendarWon;
  try(var executor=Executors.newFixedThreadPool(2)){
   var gate=new CountDownLatch(1);
   var a=executor.submit(()->{gate.await();try{impact.confirm(admin,year,extension);return true;}catch(DomainError e){return false;}});
   var c=executor.submit(()->{gate.await();try{roomChanges.confirm(bedel,id,reassignment);return true;}catch(DomainError e){return false;}});
   gate.countDown();calendarWon=a.get(20,TimeUnit.SECONDS);assertThat(c.get(20,TimeUnit.SECONDS)).isNotEqualTo(calendarWon);
  }
  assertThat(count("detalle_reserva")).isEqualTo(before+(calendarWon?3:0));
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva d join aulas.patron_semanal p using(id_patron) where d.id_reserva=? and d.estado='CONFIRMADA' and d.id_aula<>p.id_aula",Long.class,id)).isZero();
  assertThat(db.queryForObject("select version from aulas.reserva where id_reserva=?",Long.class,id)).isOne();
 }

}
