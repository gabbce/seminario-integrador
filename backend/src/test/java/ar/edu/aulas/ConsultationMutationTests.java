package ar.edu.aulas;

import ar.edu.aulas.calendar.*;
import ar.edu.aulas.indicators.IndicatorQueries;
import ar.edu.aulas.reservations.*;
import ar.edu.aulas.rooms.RoomsService;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest @Testcontainers @Import(ConsultationMutationTests.TimeConfig.class)
class ConsultationMutationTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p){p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @TestConfiguration static class TimeConfig {@Bean Clock clock(){return Clock.fixed(Instant.parse("2026-01-01T12:00:00Z"),ZoneOffset.UTC);}}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired RoomsService rooms;
 @Autowired SporadicPreparation sporadic; @Autowired SporadicConfirmation create;
 @Autowired PeriodicPreparation periodic; @Autowired PeriodicConfirmation createPeriodic;
 @Autowired HeaderMutationService headers; @Autowired RoomMutationService moveRoom; @Autowired RescheduleService reschedule; @Autowired CancellationService cancel;
 @Autowired ReservationQueries detail; @Autowired ConsultationQueries read; @Autowired IndicatorQueries metrics;
 @Autowired CalendarManagement calendars; @Autowired CalendarImpactService impact;
 long actor,year,course; RoomsService.Room a,b;
 @BeforeEach void setup(){
  db.execute("truncate aulas.evento_auditoria,aulas.materia,aulas.anio_lectivo,aulas.usuario,aulas.aula cascade");
  new TransactionTemplate(manager).executeWithoutResult(tx->{
   actor=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,'cross@test.local','QA','Admin','ADMINISTRADOR') returning id_usuario",Long.class,UUID.randomUUID());db.update("insert into aulas.administrador values (?)",actor);
   year=db.queryForObject("insert into aulas.anio_lectivo(anio_calendario,estado) values (2027,'HABILITADO') returning id_anio_lectivo",Long.class);
   db.update("insert into aulas.cuatrimestre(id_anio_lectivo,numero,inicio,fin) values (?,1,'2027-03-01','2027-03-15'),(?,2,'2027-08-02','2027-08-16')",year,year);
   long matter=db.queryForObject("insert into aulas.materia(nombre,nombre_normalizado) values ('Cruce','CRUCE') returning id_materia",Long.class);
   course=db.queryForObject("insert into aulas.curso(id_materia,id_anio_lectivo,comision) values (?,?,'QA') returning id_curso",Long.class,matter,year);
  });
  a=room("A");b=room("B");
 }
 RoomsService.Room room(String name){return rooms.save(actor,null,new RoomsService.Room(null,name,null,"General",80,"Habilitada","QA",0,"Tiza",List.of(),null,List.of()));}
 LocalDate day(String date){return LocalDate.parse(date);}
 long version(long id){return ((Number)detail.get(id,true).get("version")).longValue();}
 String occurrence(long id,String date){return db.queryForObject("select id_detalle::text from aulas.detalle_reserva where id_reserva=? and fecha=?::date",String.class,id,date);}
 void values(String date,String room,long classes,double hours,double studentHours){
  var d=day(date);var summary=metrics.series(d,d,room,"","day");
  assertThat(summary.summary().classes()).isEqualTo(classes);assertThat(summary.summary().hours()).isEqualTo(hours);assertThat(summary.studentHours()).isEqualTo(studentHours);
  assertThat(read.agenda(d,"day",room,"").total()).isEqualTo(classes);
  assertThat(read.printDay(d,room,"","active").total()).isEqualTo(classes);
  assertThat(read.listing("day",d,null,null,room,"","active",0,20).rows()).isEqualTo(read.printDay(d,room,"","active").rows());
 }
 @Test void operationalChangesImmediatelyMoveMetricsAndPublicConsultationsWithoutDuplicateOrigins(){
  var p=new SporadicPreparation.Request(2027,Long.toString(course),20,"General","",List.of(),List.of(new SporadicPreparation.DateSlot("2027-07-27","08:00",2),new SporadicPreparation.DateSlot("2027-07-29","08:00",2)));
  var prepared=sporadic.prepare(p,true);var saved=create.confirm(actor,new SporadicConfirmation.Request(UUID.randomUUID(),p,"D-01",prepared.calendarVersion(),prepared.dates().stream().map(d->new SporadicConfirmation.Selection(d.date(),a.internalId(),a.version())).toList()));
  long id=Long.parseLong(saved.get("id").toString());String first=occurrence(id,"2027-07-27"),second=occurrence(id,"2027-07-29");
  values("2027-07-27","",1,1,20);values("2027-07-29","",1,1,20);
  headers.save(actor,id,new HeaderMutationService.Request(UUID.randomUUID(),version(id),Long.toString(course),"D-01",25,"General","",List.of()));
  values("2027-07-27","",1,1,25);values("2027-07-29","",1,1,25);
  @SuppressWarnings("unchecked") var groups=(List<Map<String,Object>>)moveRoom.options(actor,id,new RoomMutationService.Version(version(id))).get("groups");
  var group=groups.stream().filter(g->((List<?>)g.get("detailIds")).contains(first)).findFirst().orElseThrow();
  moveRoom.confirm(actor,id,new RoomMutationService.Request(UUID.randomUUID(),version(id),List.of(new RoomMutationService.Selection(group.get("groupId").toString(),List.of(first),b.internalId(),b.version()))));
  values("2027-07-27","A",0,0,0);values("2027-07-27","B",1,1,25);
  var changes=List.of(new RescheduleService.DateChange(first,"2027-07-28","09:00",3));
  var proposal=new RescheduleService.Request(UUID.randomUUID(),version(id),changes,null,null);var review=reschedule.prepare(actor,id,proposal);
  @SuppressWarnings("unchecked") var roomVersions=(Map<String,Long>)review.get("roomVersions");
  reschedule.confirm(actor,id,new RescheduleService.Request(proposal.operationId(),proposal.version(),changes,((Number)review.get("calendarVersion")).longValue(),roomVersions));
  values("2027-07-27","",0,0,0);values("2027-07-28","B",1,1.5,37.5);
  assertThat(read.listing("course",null,course,2027,"","","all",0,20).rows()).hasSize(2);
  assertThat(db.queryForObject("select fecha_original::text from aulas.detalle_reserva where id_detalle=?",String.class,Long.parseLong(first))).isEqualTo("2027-07-27");
  cancel.confirm(actor,id,new CancellationService.Request(UUID.randomUUID(),version(id),List.of(second),"QA cruzado"));
  values("2027-07-29","",0,0,0);assertThat(read.printDay(day("2027-07-29"),"","","cancelled").total()).isOne();
  assertThat(new tools.jackson.databind.ObjectMapper().writeValueAsString(read.printDay(day("2027-07-28"),"","","all"))).doesNotContain("teacherEmail","registrant","changes","@");
 }
 @Test void calendarExtensionChangesNumeratorAndHolidayRemovalAlsoChangesEligibility(){
  db.update("insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) values (?,'2027-03-08','QA')",year);
  var p=new PeriodicPreparation.Request(2027,Long.toString(course),"first",30,"General","",List.of(),List.of(),List.of(new PeriodicPreparation.Pattern(1,"14:00",2)));
  var ready=periodic.prepare(p);createPeriodic.confirm(actor,new PeriodicConfirmation.Request(UUID.randomUUID(),p,"D-01",ready.calendarVersion(),List.of(new PeriodicConfirmation.Selection(1,a.internalId(),a.version(),ready.patterns().getFirst().dates()))));
  values("2027-03-22","",0,0,0);assertThat(metrics.summary(day("2027-03-22"),day("2027-03-22"),"","").availableHours()).isEqualTo(32);
  assertThat(metrics.summary(day("2027-03-08"),day("2027-03-08"),"","").eligible()).isFalse();
  var current=calendars.get(year);var edit=new CalendarManagement.Edit(current.version(),2027,"Habilitado",Map.of("first",List.of("2027-03-01","2027-03-22"),"second",current.terms().get("second")),List.of(),Map.of());
  var review=impact.prepare(actor,year,edit);assertThat(review.added()).hasSize(2);impact.confirm(actor,year,new CalendarImpactService.Request(UUID.randomUUID(),edit,review.stamp()));
  values("2027-03-22","",1,1,30);values("2027-03-08","",1,1,30);
  assertThat(metrics.summary(day("2027-03-22"),day("2027-03-22"),"","").availableHours()).isEqualTo(32);
  assertThat(metrics.summary(day("2027-03-08"),day("2027-03-08"),"","").availableHours()).isEqualTo(32);
 }
}
