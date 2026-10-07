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

@SpringBootTest @Testcontainers @AutoConfigureMockMvc @Import(SporadicReservationTests.TimeConfig.class)
class SporadicReservationTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 static class MutableClock extends Clock {
  final AtomicReference<Instant> now; final ZoneId zone;
  MutableClock(AtomicReference<Instant> now,ZoneId zone){this.now=now;this.zone=zone;}
  public ZoneId getZone(){return zone;}public Clock withZone(ZoneId zone){return new MutableClock(now,zone);}public Instant instant(){return now.get();}
 }
 @TestConfiguration static class TimeConfig {@Bean MutableClock clock(){return new MutableClock(new AtomicReference<>(Instant.parse("2027-03-08T12:00:00Z")),ZoneOffset.UTC);}}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired CalendarManagement calendars; @Autowired RoomsService rooms;
 @Autowired SporadicPreparation sporadicPreparation; @Autowired SporadicConfirmation sporadicConfirmation; @Autowired PeriodicPreparation preparation; @Autowired PeriodicConfirmation confirmation; @Autowired ReservationQueries queries; @Autowired MutableClock clock; @Autowired MockMvc mvc;
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
 @Test void multipleDatesIncludeRecessAndCanUseDifferentRoomsWithIdempotentRecovery() {
  var p=sporadic("2027-03-15","2027-03-29");var r=reviewedSporadic(p);
  var other=rooms.save(admin,null,new RoomsService.Room(null,"202",null,"General",30,"Habilitada","A",0,"Tiza",List.of("fans"),null,List.of()));
  r=new SporadicConfirmation.Request(r.operationId(),p,r.teacherId(),r.calendarVersion(),List.of(r.selections().getFirst(),new SporadicConfirmation.Selection("2027-03-29",other.internalId(),other.version())));
  var saved=sporadicConfirmation.confirm(bedel,r);
  assertThat(count("reserva_esporadica")).isEqualTo(1);assertThat(count("detalle_reserva")).isEqualTo(2);assertThat(count("patron_semanal")).isZero();
  assertThat(db.queryForList("select distinct id_aula from aulas.detalle_reserva",Long.class)).containsExactlyInAnyOrder(Long.parseLong(classroom.internalId()),Long.parseLong(other.internalId()));
  var reordered=new SporadicPreparation.Request(p.year(),p.courseId(),p.students(),p.type(),p.board(),p.resources(),p.dates().reversed());
  assertThat(sporadicConfirmation.confirm(bedel,new SporadicConfirmation.Request(r.operationId(),reordered,r.teacherId(),r.calendarVersion(),r.selections().reversed()))).isEqualTo(saved);
  assertThat(queries.operation(bedel,r.operationId(),true)).containsEntry("booking",saved);assertThat(queries.operation(admin,r.operationId(),true)).containsEntry("found",false);
  assertThat(queries.get(Long.parseLong(saved.get("id").toString()),false)).doesNotContainKeys("teacherEmail","registrant");
 }
 @Test void rejectsHolidayPastWeekendsOutsideYearAndInvalidRequirementsWithoutWriting() {
  for(String date:List.of("2027-04-12","2027-03-01","2027-03-13","2028-03-15","bad")) assertThatThrownBy(()->sporadicPreparation.prepare(sporadic(date),true)).isInstanceOf(DomainError.class);
  var p=sporadic("2027-03-15");
  assertThatThrownBy(()->sporadicPreparation.prepare(new SporadicPreparation.Request(2027,p.courseId(),25,"General","",List.of("projector"),p.dates()),true)).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->sporadicPreparation.prepare(sporadic("2027-03-15","2027-03-15"),true)).isInstanceOf(DomainError.class);
  assertThat(count("reserva")).isZero();
 }
 @Test void conflictOnLastDateRejectsWholeSetAndContiguousIntervalsRemainAvailable() {
  var multi=reviewedSporadic(sporadic("2027-03-15","2027-03-29"));sporadicConfirmation.confirm(admin,reviewedSporadic(sporadic("2027-03-29")));
  assertThatThrownBy(()->sporadicConfirmation.confirm(bedel,multi)).isInstanceOf(DomainError.class).hasMessageContaining("2027-03-29");
  assertThat(count("reserva")).isEqualTo(1);assertThat(count("detalle_reserva")).isEqualTo(1);
  var p=sporadic("2027-03-29");var adjacent=new SporadicPreparation.Request(p.year(),p.courseId(),p.students(),p.type(),p.board(),p.resources(),List.of(new SporadicPreparation.DateSlot("2027-03-29","11:00",2)));
  assertThat(sporadicPreparation.prepare(adjacent,true).dates().getFirst().availableRooms()).hasSize(1);
 }
 @Test void revalidatesTimeCalendarRoomAndRoleAtConfirmation() {
  var r=reviewedSporadic(sporadic("2027-03-08","2027-03-15"));clock.now.set(Instant.parse("2027-03-08T13:00:00Z"));
  assertThatThrownBy(()->sporadicConfirmation.confirm(admin,r)).isInstanceOf(DomainError.class).hasMessageContaining("2027-03-08");clock.now.set(Instant.parse("2027-03-08T12:00:00Z"));
  assertThatThrownBy(()->sporadicConfirmation.confirm(teacher,r)).isInstanceOf(DomainError.class);
  rooms.save(admin,Long.parseLong(classroom.internalId()),changedRoom("Habilitada",31,classroom.resources()));
  assertThatThrownBy(()->sporadicConfirmation.confirm(admin,r)).isInstanceOf(DomainError.class).hasMessageContaining("aula cambió");
  var fresh=reviewedSporadic(sporadic("2027-03-15"));db.update("update aulas.anio_lectivo set version=version+1 where id_anio_lectivo=?",year);
  assertThatThrownBy(()->sporadicConfirmation.confirm(admin,fresh)).isInstanceOf(DomainError.class).hasMessageContaining("calendario cambió");assertThat(count("reserva")).isZero();
 }
 @Test void auditFailureRollsBackAndSameOperationCanRetry() {
  var r=reviewedSporadic(sporadic("2027-03-15","2027-03-29"));db.execute("alter table aulas.evento_auditoria add constraint reject_confirmation check (operacion<>'CONFIRMAR_RESERVA') not valid");
  try {assertThatThrownBy(()->sporadicConfirmation.confirm(admin,r)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);}finally {db.execute("alter table aulas.evento_auditoria drop constraint reject_confirmation");}
  for(String table:List.of("reserva","reserva_esporadica","detalle_reserva","operacion_reserva")) assertThat(count(table)).isZero();
  sporadicConfirmation.confirm(admin,r);assertThat(count("reserva")).isEqualTo(1);
 }
 @Test void concurrentDifferentOperationsCompeteAndSameOperationDoesNotDuplicate() throws Exception {
  var one=reviewedSporadic(sporadic("2027-03-15"));var two=reviewedSporadic(sporadic("2027-03-15"));var start=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   var a=pool.submit(()->{start.await();try {sporadicConfirmation.confirm(admin,one);return true;}catch(DomainError e){return false;}});
   var b=pool.submit(()->{start.await();try {sporadicConfirmation.confirm(bedel,two);return true;}catch(DomainError e){return false;}});
   start.countDown();assertThat(a.get(10,TimeUnit.SECONDS)).isNotEqualTo(b.get(10,TimeUnit.SECONDS));
  }
  var r=reviewedSporadic(sporadic("2027-03-29"));var together=new CountDownLatch(1);
  try(var pool=Executors.newFixedThreadPool(2)) {
   Callable<Map<String,Object>> action=()->{together.await();return sporadicConfirmation.confirm(admin,r);};var a=pool.submit(action);var b=pool.submit(action);together.countDown();assertThat(a.get(10,TimeUnit.SECONDS)).isEqualTo(b.get(10,TimeUnit.SECONDS));
  }
  assertThat(count("reserva")).isEqualTo(2);
 }
 @Test void alternativesUseTotalMinutesRatherThanPeriodicPriorityAndOmitTeacherContacts() throws Exception {
  sporadicConfirmation.confirm(admin,reviewedSporadic(sporadic("2027-03-15")));
  var second=rooms.save(admin,null,new RoomsService.Room(null,"202",null,"General",30,"Habilitada","A",0,"Tiza",List.of("fans","air"),null,List.of()));
  classroom=second;
  confirmation.confirm(admin,reviewed(proposal("first","10:30",List.of()),UUID.randomUUID()));
  var result=sporadicPreparation.prepare(sporadic("2027-03-15"),true).dates().getFirst();assertThat(result.availableRooms()).isEmpty();
  assertThat(result.alternatives().getFirst().room().id()).isEqualTo("202");assertThat(result.alternatives().getFirst().periodicMinutes()).isEqualTo(30);
  String json="{\"year\":2027,\"students\":25,\"type\":\"General\",\"resources\":[\"fans\"],\"dates\":[{\"date\":\"2027-03-15\",\"start\":\"10:00\",\"modules\":2}]}";
  mvc.perform(post("/api/reservas/esporadicas/preparacion").with(session(teacher)).contentType("application/json").content(json)).andExpect(status().isOk()).andExpect(jsonPath("$.dates[0].alternatives[0].conflicts[0].teacherEmail").doesNotExist()).andExpect(jsonPath("$.dates[0].alternatives[0].conflicts[0].registrant").doesNotExist());
  mvc.perform(post("/api/reservas/esporadicas/confirmacion").with(session(teacher)).contentType("application/json").content("{}")).andExpect(status().isForbidden());
 }
 @Test void changedOperationContentIsRejectedAndPreparationDoesNotReserve() {
  var r=reviewedSporadic(sporadic("2027-03-15"));assertThat(count("reserva")).isZero();sporadicConfirmation.confirm(admin,r);
  assertThatThrownBy(()->sporadicConfirmation.confirm(admin,new SporadicConfirmation.Request(r.operationId(),r.proposal(),"D-02",r.calendarVersion(),r.selections()))).isInstanceOf(DomainError.class).hasMessageContaining("otra propuesta");
  assertThat(count("reserva")).isEqualTo(1);
 }
 @Test void confirmationRejectsInsufficientRoomsMissingDatesAndDisabledAccount() {
  var r=reviewedSporadic(sporadic("2027-03-15","2027-03-29"));
  assertThatThrownBy(()->sporadicConfirmation.confirm(admin,new SporadicConfirmation.Request(r.operationId(),r.proposal(),r.teacherId(),r.calendarVersion(),List.of(r.selections().getFirst())))).isInstanceOf(DomainError.class);
  rooms.save(admin,Long.parseLong(classroom.internalId()),changedRoom("Habilitada",20,classroom.resources()));
  assertThatThrownBy(()->sporadicConfirmation.confirm(admin,r)).isInstanceOf(DomainError.class).hasMessageContaining("requisitos");
  db.update("update aulas.usuario set activo=false where id_usuario=?",bedel);
  assertThatThrownBy(()->sporadicConfirmation.confirm(bedel,r)).isInstanceOf(DomainError.class);assertThat(count("reserva")).isZero();
 }
 @Test void httpConfirmationPersistsAndSecondSessionOmitsPrivateJson() throws Exception {
  var r=reviewedSporadic(sporadic("2027-03-15"));
  String json="""
   {"operationId":"%s","proposal":{"year":2027,"courseId":"%s","students":25,"type":"General","board":"Tiza","resources":["fans"],"dates":[{"date":"2027-03-15","start":"10:00","modules":2}]},"teacherId":"D-01","calendarVersion":%s,"selections":[{"date":"2027-03-15","roomId":"%s","roomVersion":%s}]}
   """.formatted(r.operationId(),course,r.calendarVersion(),classroom.internalId(),classroom.version());
  mvc.perform(post("/api/reservas/esporadicas/confirmacion").with(session(bedel)).contentType("application/json").content(json)).andExpect(status().isOk()).andExpect(jsonPath("$.occurrences.length()").value(1));
  long id=db.queryForObject("select id_reserva from aulas.reserva",Long.class);
  mvc.perform(get("/api/reservas/"+id).with(session(teacher))).andExpect(status().isOk()).andExpect(jsonPath("$.teacherEmail").doesNotExist()).andExpect(jsonPath("$.registrant").doesNotExist());
  mvc.perform(post("/api/reservas/esporadicas/confirmacion").with(session(bedel)).contentType("application/json").content(json)).andExpect(status().isOk());assertThat(count("reserva")).isEqualTo(1);
 }

 @Test void confirmationReportsEveryOccupiedDateWithoutSavingAnyPart() {
  var dates=sporadic("2027-03-15","2027-03-29");var stale=reviewedSporadic(dates);
  sporadicConfirmation.confirm(admin,reviewedSporadic(dates));long reservations=count("reserva"),details=count("detalle_reserva"),operations=count("operacion_reserva");
  assertThatThrownBy(()->sporadicConfirmation.confirm(bedel,stale)).isInstanceOf(DomainError.class).hasMessageContaining("2027-03-15").hasMessageContaining("2027-03-29");
  assertThat(count("reserva")).isEqualTo(reservations);assertThat(count("detalle_reserva")).isEqualTo(details);assertThat(count("operacion_reserva")).isEqualTo(operations);
 }
 @Test void preparationReportsAllStartedOrHolidayDatesWithTheirReasons() {
  assertThatThrownBy(()->sporadicPreparation.prepare(sporadic("2027-03-01","2027-04-12"),true)).hasMessageContaining("2027-03-01 ya comenzó").hasMessageContaining("2027-04-12 es feriado");
  assertThat(count("reserva")).isZero();
 }

 @Test void preparationReportsAllInvalidDatesAndSpecificSyntaxReasons() {
  var base=sporadic("2027-03-15");var mixed=new SporadicPreparation.Request(base.year(),base.courseId(),base.students(),base.type(),base.board(),base.resources(),List.of(
   new SporadicPreparation.DateSlot("2028-03-15","10:00",2),new SporadicPreparation.DateSlot("2027-03-13","10:00",2),
   new SporadicPreparation.DateSlot("2027-03-15","10:00",2),new SporadicPreparation.DateSlot("2027-03-15","06:30",2),new SporadicPreparation.DateSlot("no-fecha","10:00",2)));
  assertThatThrownBy(()->sporadicPreparation.prepare(mixed,true)).isInstanceOfSatisfying(DomainError.class,error->{
   assertThat(error.status).isEqualTo(400);assertThat(error.code).isEqualTo("INVALID_DATA");
   assertThat(error).hasMessageContaining("2028-03-15 no pertenece").hasMessageContaining("2027-03-13 es sábado").hasMessageContaining("2027-03-15 está repetida").hasMessageContaining("horario del 2027-03-15").hasMessageContaining("no-fecha no es válida");
  });
  assertThat(count("reserva")).isZero();assertThat(count("detalle_reserva")).isZero();
 }

}
