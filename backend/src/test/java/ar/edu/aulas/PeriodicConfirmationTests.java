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

@SpringBootTest @Testcontainers @AutoConfigureMockMvc @Import(PeriodicConfirmationTests.TimeConfig.class)
class PeriodicConfirmationTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 static class MutableClock extends Clock {
  final AtomicReference<Instant> now; final ZoneId zone;
  MutableClock(AtomicReference<Instant> now,ZoneId zone){this.now=now;this.zone=zone;}
  public ZoneId getZone(){return zone;}public Clock withZone(ZoneId zone){return new MutableClock(now,zone);}public Instant instant(){return now.get();}
 }
 @TestConfiguration static class TimeConfig {@Bean MutableClock clock(){return new MutableClock(new AtomicReference<>(Instant.parse("2027-03-08T12:00:00Z")),ZoneOffset.UTC);}}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired CalendarManagement calendars; @Autowired RoomsService rooms;
 @Autowired PeriodicPreparation preparation; @Autowired PeriodicConfirmation confirmation; @Autowired ReservationQueries queries; @Autowired MutableClock clock; @Autowired MockMvc mvc;
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
 @Test void confirmsWholeAnnualSnapshotAndRecoversSameOperationBeforeCheckingOwnOccupancy() {
  var request=request();var saved=confirmation.confirm(bedel,request);String id=saved.get("id").toString();
  assertThat(saved.get("teacher")).isEqualTo("Laura Gómez");assertThat(saved.get("teacherEmail")).isEqualTo("laura.gomez@example.test");
  assertThat(count("reserva")).isEqualTo(1);assertThat(count("periodo_asignado")).isEqualTo(2);assertThat(count("detalle_reserva")).isEqualTo(4);assertThat(count("fecha_excluida")).isEqualTo(1);
  assertThat(confirmation.confirm(bedel,request)).isEqualTo(saved);
  assertThat(queries.operation(bedel,request.operationId(),true)).containsEntry("found",true).containsEntry("booking",saved);
  assertThat(queries.operation(admin,request.operationId(),true)).containsExactly(entry("found",false));
  assertThat(queries.get(Long.parseLong(id),false)).doesNotContainKeys("teacherEmail","registrant");
  assertThat(db.queryForObject("select registrado_por from aulas.reserva",Long.class)).isEqualTo(bedel);
 }
 @Test void requestIdentityIgnoresOrderingButRejectsDifferentContent() {
  var original=request();var saved=confirmation.confirm(admin,original);var p=original.proposal();
  var reordered=new PeriodicPreparation.Request(p.year(),p.courseId(),p.period(),p.students(),p.type(),p.board(),p.resources().reversed(),p.excluded().reversed(),p.patterns().reversed());
  var selections=original.selections().stream().map(s->new PeriodicConfirmation.Selection(s.day(),s.roomId(),s.roomVersion(),s.dates().reversed())).toList();
  assertThat(confirmation.confirm(admin,new PeriodicConfirmation.Request(original.operationId(),reordered,"D-01",original.calendarVersion(),selections))).isEqualTo(saved);
  assertThatThrownBy(()->confirmation.confirm(admin,new PeriodicConfirmation.Request(original.operationId(),p,"D-02",original.calendarVersion(),original.selections()))).isInstanceOf(DomainError.class).hasMessageContaining("otra propuesta");
 }
 @Test void simultaneousRequestsGiveOneReservationAndOneConflictWhileSameKeyRecovers() throws Exception {
  var first=request();var second=new PeriodicConfirmation.Request(UUID.randomUUID(),first.proposal(),first.teacherId(),first.calendarVersion(),first.selections());
  var start=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   Callable<Boolean> a=()->{start.await();try {confirmation.confirm(admin,first);return true;}catch(DomainError conflict){return false;}};
   Callable<Boolean> b=()->{start.await();try {confirmation.confirm(bedel,second);return true;}catch(DomainError conflict){return false;}};
   var x=pool.submit(a);var y=pool.submit(b);start.countDown();assertThat(x.get(10,TimeUnit.SECONDS)).isNotEqualTo(y.get(10,TimeUnit.SECONDS));
  }
  assertThat(count("reserva")).isEqualTo(1);
  var next=reviewed(proposal("annual","10:30",List.of("2027-03-22")),UUID.randomUUID());var together=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   Callable<Map<String,Object>> task=()->{together.await();return confirmation.confirm(admin,next);};var a=pool.submit(task);var b=pool.submit(task);together.countDown();assertThat(a.get(10,TimeUnit.SECONDS)).isEqualTo(b.get(10,TimeUnit.SECONDS));
  }
  assertThat(count("reserva")).isEqualTo(2);assertThat(count("operacion_reserva")).isEqualTo(2);
 }
 @Test void failureAtAuditRollsBackEveryTableAndAllowsRetryOfSameOperation() {
  var request=request();db.execute("alter table aulas.evento_auditoria add constraint reject_confirmation check (operacion<>'CONFIRMAR_RESERVA') not valid");
  try {assertThatThrownBy(()->confirmation.confirm(admin,request)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);}
  finally {db.execute("alter table aulas.evento_auditoria drop constraint reject_confirmation");}
  for(String table:List.of("reserva","reserva_periodica","periodo_asignado","patron_semanal","fecha_excluida","detalle_reserva","operacion_reserva")) assertThat(count(table)).as(table).isZero();
  assertThat(queries.operation(admin,request.operationId(),true)).containsEntry("found",false);confirmation.confirm(admin,request);assertThat(count("reserva")).isEqualTo(1);
 }
 @Test void rechecksCalendarRoomTimeAndPermissionsWithoutDroppingReviewedDates() {
  var request=request();clock.now.set(Instant.parse("2027-03-08T13:00:00Z"));
  assertThatThrownBy(()->confirmation.confirm(admin,request)).isInstanceOf(DomainError.class).hasMessageContaining("2027-03-08");
  clock.now.set(Instant.parse("2027-03-08T12:00:00Z"));rooms.save(admin,Long.parseLong(classroom.internalId()),changedRoom("Habilitada",31,classroom.resources()));
  assertThatThrownBy(()->confirmation.confirm(admin,request)).isInstanceOf(DomainError.class).hasMessageContaining("aula cambió");
  assertThatThrownBy(()->confirmation.confirm(teacher,request)).isInstanceOf(DomainError.class);
  db.update("update aulas.usuario set activo=false where id_usuario=?",bedel);
  assertThatThrownBy(()->confirmation.confirm(bedel,request)).isInstanceOf(DomainError.class);
  assertThat(count("reserva")).isZero();
 }
 @Test void calendarVersionChangeRejectsEvenWhenDatesStillMatch() {
  var request=request();var current=calendars.get(year);calendars.edit(admin,year,edit(current.terms(),current.holidays(),"Habilitado"));
  assertThatThrownBy(()->confirmation.confirm(admin,request)).isInstanceOf(DomainError.class).hasMessageContaining("calendario cambió");assertThat(count("reserva")).isZero();
 }
 @Test void protectsRoomsAndCalendarAndAllowsChangesWithoutInvalidationOrNewClasses() {
  confirmation.confirm(admin,request());long room=Long.parseLong(classroom.internalId());
  for(var change:List.of(changedRoom("Mantenimiento",30,classroom.resources()),changedRoom("Baja",30,classroom.resources()),changedRoom("Habilitada",29,classroom.resources()),changedRoom("Habilitada",30,List.of()))) assertThatThrownBy(()->rooms.save(admin,room,change)).isInstanceOf(DomainError.class).hasMessageContaining("reserva");
  classroom=rooms.save(admin,room,changedRoom("Habilitada",40,classroom.resources()));
  var current=calendars.get(year);
  for(String state:List.of("Cerrado","En preparación")) assertThatThrownBy(()->calendars.edit(admin,year,edit(current.terms(),current.holidays(),state))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->calendars.edit(admin,year,edit(current.terms(),List.of(),"Habilitado"))).isInstanceOf(DomainError.class).hasMessageContaining("generar nuevas clases");
  assertThatThrownBy(()->calendars.edit(admin,year,edit(current.terms(),List.of("2027-04-12","2027-03-15"),"Habilitado"))).isInstanceOf(DomainError.class).hasMessageContaining("2027-03-15");
  var shrink=new HashMap<>(current.terms());shrink.put("second",List.of("2027-04-05","2027-04-16"));assertThatThrownBy(()->calendars.edit(admin,year,edit(shrink,current.holidays(),"Habilitado"))).isInstanceOf(DomainError.class).hasMessageContaining("recorte");
  var expand=new HashMap<>(current.terms());expand.put("second",List.of("2027-04-05","2027-04-26"));assertThatThrownBy(()->calendars.edit(admin,year,edit(expand,current.holidays(),"Habilitado"))).isInstanceOf(DomainError.class).hasMessageContaining("generar nuevas clases");
  // An explicitly excluded date may become a holiday without affecting any class.
  calendars.edit(admin,year,edit(current.terms(),List.of("2027-04-12","2027-03-22"),"Habilitado"));
 }
 @Test void racingDisableOrHolidayAndConfirmationNeverLeaveAnInvalidReservation() throws Exception {
  var request=request();var start=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   var confirm=pool.submit(()->{start.await();try {confirmation.confirm(admin,request);return true;}catch(DomainError conflict){return false;}});
   var disable=pool.submit(()->{start.await();try {rooms.save(admin,Long.parseLong(classroom.internalId()),changedRoom("Mantenimiento",30,classroom.resources()));return true;}catch(DomainError conflict){return false;}});
   start.countDown();assertThat(confirm.get(10,TimeUnit.SECONDS)).isNotEqualTo(disable.get(10,TimeUnit.SECONDS));
  }
  if(count("reserva")>0) assertThat(rooms.get(Long.parseLong(classroom.internalId())).state()).isEqualTo("Habilitada");
 }
 @Test void multiplePatternsStayUniformAndIdempotencyIsScopedToActor() {
  var second=rooms.save(admin,null,new RoomsService.Room(null,"202",null,"General",30,"Habilitada","A",0,"Tiza",List.of("fans","air"),null,List.of()));
  var base=proposal("annual","09:30",List.of("2027-03-22"));
  var p=new PeriodicPreparation.Request(base.year(),base.courseId(),base.period(),base.students(),base.type(),base.board(),base.resources(),base.excluded(),List.of(new PeriodicPreparation.Pattern(3,"10:00",3),new PeriodicPreparation.Pattern(1,"09:30",2)));
  var reviewed=reviewed(p,UUID.randomUUID());
  var choices=reviewed.selections().stream().map(a->a.day()==3?new PeriodicConfirmation.Selection(3,second.internalId(),second.version(),a.dates()):a).toList();
  var request=new PeriodicConfirmation.Request(reviewed.operationId(),p,"D-01",reviewed.calendarVersion(),choices);
  confirmation.confirm(admin,request);
  assertThat(count("patron_semanal")).isEqualTo(2);assertThat(count("detalle_reserva")).isEqualTo(8);
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva d join aulas.patron_semanal p using(id_patron) where d.id_aula<>p.id_aula",Long.class)).isZero();
  var other=reviewed(proposal("first","11:30",List.of()),reviewed.operationId());
  confirmation.confirm(bedel,other);assertThat(count("operacion_reserva")).isEqualTo(2);
 }
 @Test void laterPatternConflictNeverCreatesPartialHeaderOrDetails() {
  var base=proposal("annual","09:30",List.of());
  var p=new PeriodicPreparation.Request(base.year(),base.courseId(),base.period(),base.students(),base.type(),base.board(),base.resources(),base.excluded(),List.of(new PeriodicPreparation.Pattern(1,"09:30",2),new PeriodicPreparation.Pattern(3,"10:00",2)));
  var reviewed=reviewed(p,UUID.randomUUID());
  var busy=new PeriodicPreparation.Request(base.year(),base.courseId(),base.period(),base.students(),base.type(),base.board(),base.resources(),base.excluded(),List.of(new PeriodicPreparation.Pattern(3,"10:00",2)));
  confirmation.confirm(bedel,reviewed(busy,UUID.randomUUID()));
  long details=count("detalle_reserva");
  assertThatThrownBy(()->confirmation.confirm(admin,reviewed)).isInstanceOf(DomainError.class).hasMessageContaining("2027-03-10");
  assertThat(count("reserva")).isEqualTo(1);assertThat(count("detalle_reserva")).isEqualTo(details);assertThat(count("operacion_reserva")).isEqualTo(1);
 }
 @Test void historicalReferencesProtectPeriodsWhilePastClassesAllowClosingAndRoomChanges() {
  confirmation.confirm(admin,request());clock.now.set(Instant.parse("2027-05-01T12:00:00Z"));
  var current=calendars.get(year);var deleted=new HashMap<>(current.terms());deleted.put("first",List.of("",""));
  assertThatThrownBy(()->calendars.edit(admin,year,edit(deleted,current.holidays(),"En preparación"))).isInstanceOf(DomainError.class).hasMessageContaining("históricas");
  rooms.save(admin,Long.parseLong(classroom.internalId()),changedRoom("Mantenimiento",30,classroom.resources()));
  calendars.edit(admin,year,edit(current.terms(),current.holidays(),"Cerrado"));
  assertThat(count("detalle_reserva")).isEqualTo(4);
 }
 @Test void holidayRaceAndPermissionRaceUseTheSameSerializationOrder() throws Exception {
  var request=request();var current=calendars.get(year);var holiday=edit(current.terms(),List.of("2027-04-12","2027-03-15"),"Habilitado");var start=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   var confirm=pool.submit(()->{start.await();try {confirmation.confirm(admin,request);return true;}catch(DomainError conflict){return false;}});
   var change=pool.submit(()->{start.await();try {calendars.edit(admin,year,holiday);return true;}catch(DomainError conflict){return false;}});
   start.countDown();assertThat(confirm.get(10,TimeUnit.SECONDS)).isNotEqualTo(change.get(10,TimeUnit.SECONDS));
  }
  var later=reviewed(proposal("annual","11:30",List.of()),UUID.randomUUID());var together=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   var confirm=pool.submit(()->{together.await();try {confirmation.confirm(bedel,later);return true;}catch(DomainError rejected){return false;}});
   var disable=pool.submit(()->{together.await();new TransactionTemplate(manager).executeWithoutResult(tx->{db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);db.update("update aulas.usuario set activo=false where id_usuario=?",bedel);});return true;});
   together.countDown();boolean saved=confirm.get(10,TimeUnit.SECONDS);disable.get(10,TimeUnit.SECONDS);
   assertThat(queries.operation(bedel,later.operationId(),true).get("found")).isEqualTo(saved);
   assertThatThrownBy(()->confirmation.confirm(bedel,later)).isInstanceOf(DomainError.class);
  }
 }
 @Test void httpReadsRespectPrivacyAndTeacherCannotConfirm() throws Exception {
  var saved=confirmation.confirm(admin,request());String id=saved.get("id").toString();
  for(long actor:List.of(admin,bedel)) mvc.perform(get("/api/reservas/"+id).with(session(actor))).andExpect(status().isOk()).andExpect(jsonPath("$.teacherEmail").value("laura.gomez@example.test")).andExpect(jsonPath("$.registrant.userId").value(Long.toString(admin)));
  mvc.perform(get("/api/reservas/"+id).with(session(teacher))).andExpect(status().isOk()).andExpect(jsonPath("$.teacherEmail").doesNotExist()).andExpect(jsonPath("$.registrant").doesNotExist());
  mvc.perform(get("/api/reservas").with(session(teacher))).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(id)).andExpect(jsonPath("$[0].teacherEmail").doesNotExist());
  mvc.perform(post("/api/reservas/periodicas/confirmacion").with(session(teacher)).contentType("application/json").content("{}")).andExpect(status().isForbidden());
  mvc.perform(get("/api/reservas/"+id)).andExpect(status().isUnauthorized());
 }
 @Test void httpDoesNotCoerceFractionalCountsToIntegers() throws Exception {
  for(String json:List.of("{\"year\":2027,\"period\":\"annual\",\"students\":30.5,\"type\":\"General\",\"resources\":[],\"excluded\":[],\"patterns\":[{\"day\":1,\"start\":\"09:30\",\"modules\":2}]}","{\"year\":2027,\"period\":\"annual\",\"students\":30,\"type\":\"General\",\"resources\":[],\"excluded\":[],\"patterns\":[{\"day\":1,\"start\":\"09:30\",\"modules\":1.5}]}"))
   mvc.perform(post("/api/reservas/periodicas/preparacion").with(session(admin)).contentType("application/json").content(json)).andExpect(status().isBadRequest());
 }
}
