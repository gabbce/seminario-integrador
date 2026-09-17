package ar.edu.aulas;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.rooms.RoomsService;
import ar.edu.aulas.reservations.PeriodicPreparation;
import ar.edu.aulas.reservations.PeriodicPreparation.*;
import java.time.*;
import java.util.*;
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
class PeriodicPreparationTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired CalendarManagement calendars; @Autowired RoomsService rooms; @Autowired MockMvc mvc;
 PeriodicPreparation service; long year,course,admin;
 @BeforeEach void setup() {
  db.execute("truncate aulas.evento_auditoria,aulas.materia,aulas.anio_lectivo,aulas.usuario,aulas.aula cascade");
  service=new PeriodicPreparation(db,calendars,rooms,Clock.fixed(Instant.parse("2027-03-08T12:00:00Z"),ZoneOffset.UTC));
  admin=account("ADMINISTRADOR");
  year=db.queryForObject("insert into aulas.anio_lectivo(anio_calendario,estado) values (2027,'HABILITADO') returning id_anio_lectivo",Long.class);
  db.update("insert into aulas.cuatrimestre(id_anio_lectivo,numero,inicio,fin) values (?,1,'2027-03-01','2027-03-22'),(?,2,'2027-04-05','2027-04-19')",year,year);
  db.update("insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) values (?,'2027-04-12','Feriado')",year);
  long matter=db.queryForObject("insert into aulas.materia(nombre,nombre_normalizado) values ('Historia','HISTORIA') returning id_materia",Long.class);
  course=db.queryForObject("insert into aulas.curso(id_materia,id_anio_lectivo,comision) values (?,?,'A') returning id_curso",Long.class,matter,year);
 }
 long account(String role) {return new TransactionTemplate(manager).execute(tx->{
  long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'Nombre','Apellido',?) returning id_usuario",Long.class,UUID.randomUUID(),UUID.randomUUID()+"@test.local",role);
  db.update("insert into aulas."+(role.equals("ADMINISTRADOR")?"administrador":role.equals("BEDEL")?"bedel":"docente")+"(id_usuario) values (?)",id);return id;
 });}
 org.springframework.test.web.servlet.request.RequestPostProcessor session(long id) {return jwt().jwt(jwt->jwt.subject(db.queryForObject("select supabase_auth_id::text from aulas.usuario where id_usuario=?",String.class,id)));}
 Request request(String period,String start,List<String> exclusions) {return new Request(2027,Long.toString(course),period,30,"General","",List.of(),exclusions,List.of(new Pattern(1,start,2)));}
 long room(String name,int capacity) {return Long.parseLong(rooms.save(admin,null,new RoomsService.Room(null,name,null,"General",capacity,"Habilitada","A",0,"Tiza",List.of("fans"),null,List.of())).internalId());}
 long booking(long classroom,String date,String start,int modules) {return new TransactionTemplate(manager).execute(tx->{long id=db.queryForObject("insert into aulas.reserva(registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula) values (?,?,'D-01','Laura','Gómez','private@example.test',30,'General') returning id_reserva",Long.class,admin,course);db.update("insert into aulas.reserva_esporadica values (?)",id);occupy(id,classroom,date,start,modules);return id;});}
 void occupy(long booking,long room,String date,String start,int modules) {db.update("insert into aulas.detalle_reserva(id_reserva,id_aula,fecha,hora_inicio,cantidad_modulos) values (?,?,?::date,?::time,?)",booking,room,date,start,modules);}
 @Test void annualUsesUnionAndDistinguishesRecessHolidaysPastAndExplicitExclusions() {
  room("101",30);
  var p=service.prepare(request("annual","09:00",List.of("2027-03-22"))).patterns().getFirst();
  assertThat(p.dates()).containsExactly("2027-03-15","2027-04-05","2027-04-19");
  assertThat(p.omitted()).containsExactly(new Omission("2027-03-01","Ya iniciada"),new Omission("2027-03-08","Ya iniciada"),new Omission("2027-03-22","Exclusión manual"),new Omission("2027-03-29","Receso"),new Omission("2027-04-12","Feriado"));
  assertThat(service.prepare(request("first","09:30",List.of())).patterns().getFirst().dates()).containsExactly("2027-03-08","2027-03-15","2027-03-22");
  assertThat(db.queryForObject("select count(*) from aulas.reserva",Long.class)).isZero();
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva",Long.class)).isZero();
 }
 @Test void availabilityIntersectsAllDatesAndAllowsContiguousAndCancelledClasses() {
  long busy=room("101",30),adjacent=room("102",30),cancelled=room("103",31); room("104",40);room("Too small",29);
  long booking=booking(busy,"2027-03-22","09:30",1);occupy(booking,adjacent,"2027-03-15","10:00",2);occupy(booking,cancelled,"2027-03-15","09:00",2);
  db.update("update aulas.detalle_reserva set estado='CANCELADA',motivo_cancelacion='Fixture',cancelado_en=now(),cancelado_por=? where id_aula=?",admin,cancelled);
  var p=service.prepare(request("first","09:00",List.of())).patterns().getFirst();
  assertThat(p.compatibleCount()).isEqualTo(4);assertThat(p.availableRooms()).extracting(Room::id).containsExactly("102","103","104");
  assertThat(service.prepare(request("first","09:00",List.of("2027-03-22"))).patterns().getFirst().availableRooms()).extracting(Room::id).containsExactly("101","102","103","104");
 }
 @Test void emptyPatternsAndNoCandidatesAreDistinctValidConsultations() {
  var empty=service.prepare(request("first","09:00",List.of("2027-03-15","2027-03-22"))).patterns().getFirst();
  assertThat(empty.dates()).isEmpty();assertThat(empty.availableRooms()).isEmpty();
  var noRooms=service.prepare(request("second","09:00",List.of())).patterns().getFirst();
  assertThat(noRooms.dates()).hasSize(2);assertThat(noRooms.compatibleCount()).isZero();
  long id=room("101",30);booking(id,"2027-04-05","09:00",1);
  var occupied=service.prepare(request("second","09:00",List.of())).patterns().getFirst();
  assertThat(occupied.compatibleCount()).isEqualTo(1);assertThat(occupied.availableRooms()).isEmpty();
 }
 @Test void rejectsManipulatedPatternsCourseYearAndResourceRequirements() {
  var valid=request("annual","09:00",List.of());
  for(var pattern:List.of(new Pattern(0,"09:00",2),new Pattern(6,"09:00",2),new Pattern(1,"06:30",2),new Pattern(1,"22:30",2),new Pattern(1,"09:15",2),new Pattern(1,"09:00",0)))
   assertThatThrownBy(()->service.prepare(new Request(2027,valid.courseId(),"annual",30,"General","",List.of(),List.of(),List.of(pattern)))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->service.prepare(new Request(2027,valid.courseId(),"annual",30,"General","",List.of("projector"),List.of(),valid.patterns()))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->service.prepare(request("annual","09:00",List.of("2027-03-29")))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->service.prepare(new Request(2027,"999999","annual",30,"General","",List.of(),List.of(),valid.patterns()))).isInstanceOf(DomainError.class);
  db.update("update aulas.anio_lectivo set estado='CERRADO'");
  assertThatThrownBy(()->service.prepare(valid)).isInstanceOf(DomainError.class);
 }
 @Test void preparationIsAuthenticatedForAllRolesAndNeverLeaksContacts() throws Exception {
  String json="{\"year\":2027,\"period\":\"annual\",\"students\":30,\"type\":\"General\",\"resources\":[],\"excluded\":[],\"patterns\":[{\"day\":1,\"start\":\"09:00\",\"modules\":2}]}";
  for(long actor:List.of(admin,account("BEDEL"),account("DOCENTE"))) {
   mvc.perform(post("/api/reservas/periodicas/preparacion").with(session(actor)).contentType("application/json").content(json)).andExpect(status().isOk()).andExpect(jsonPath("$.patterns[0].dates").isArray()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("email"))));
  }
  mvc.perform(post("/api/reservas/periodicas/preparacion").contentType("application/json").content(json)).andExpect(status().isUnauthorized());
 }
 @Test void resourcesStateAndCapacityDetermineEligibilityButComputerCountDoesNot() {
  rooms.save(admin,null,new RoomsService.Room(null,"Lab-A",null,"Laboratorio",30,"Habilitada","A",0,"Tiza",List.of("fans"),0,List.of()));
  rooms.save(admin,null,new RoomsService.Room(null,"Lab-B",null,"Laboratorio",30,"Habilitada","A",0,"Tiza",List.of("fans"),100,List.of()));
  rooms.save(admin,null,new RoomsService.Room(null,"Lab-C",null,"Laboratorio",30,"Mantenimiento","A",0,"Tiza",List.of("fans"),50,List.of()));
  var valid=request("first","09:00",List.of());
  var lab=new Request(2027,valid.courseId(),"first",30,"Laboratorio","Tiza",List.of("fans"),List.of(),valid.patterns());
  assertThat(service.prepare(lab).patterns().getFirst().availableRooms()).extracting(Room::id).containsExactly("Lab-A","Lab-B");
  assertThat(service.prepare(new Request(2027,valid.courseId(),"first",30,"Laboratorio","Tiza",List.of("air"),List.of(),valid.patterns())).patterns().getFirst().availableRooms()).isEmpty();
 }
 @Test void schemaRejectsMissingOrAmbiguousSubtypesAndWrongPeriodicOrigins() {
  assertThatThrownBy(()->db.update("insert into aulas.reserva(registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula) values (?,?,'D-01','Laura','Gómez','private@example.test',30,'General')",admin,course)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  long classroom=room("101",30);
  long booking=booking(classroom,"2027-03-15","09:00",2);
  assertThatThrownBy(()->db.update("insert into aulas.reserva_periodica(id_reserva,modalidad) values (?,'ANUAL')",booking)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  // A periodic aggregate can be assembled atomically, but every detail needs its pattern.
  assertThatThrownBy(()->new TransactionTemplate(manager).executeWithoutResult(tx->{
   db.update("delete from aulas.reserva_esporadica where id_reserva=?",booking);
   db.update("insert into aulas.reserva_periodica(id_reserva,modalidad) values (?,'CUATRIMESTRAL')",booking);
   db.update("insert into aulas.patron_semanal(id_reserva,dia,hora_inicio,cantidad_modulos,id_aula) values (?,1,'09:00',2,?)",booking,classroom);
   db.update("insert into aulas.periodo_asignado select ?,id_cuatrimestre from aulas.cuatrimestre where id_anio_lectivo=? and numero=1",booking,year);

  })).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  long otherYear=db.queryForObject("insert into aulas.anio_lectivo(anio_calendario) values (2028) returning id_anio_lectivo",Long.class);
  long otherTerm=db.queryForObject("insert into aulas.cuatrimestre(id_anio_lectivo,numero,inicio,fin) values (?,1,'2028-03-01','2028-06-30') returning id_cuatrimestre",Long.class,otherYear);
  assertThatThrownBy(()->new TransactionTemplate(manager).executeWithoutResult(tx->{
   db.update("delete from aulas.reserva_esporadica where id_reserva=?",booking);
   db.update("insert into aulas.reserva_periodica(id_reserva,modalidad) values (?,'CUATRIMESTRAL')",booking);
   db.update("insert into aulas.patron_semanal(id_reserva,dia,hora_inicio,cantidad_modulos,id_aula) values (?,1,'09:00',2,?)",booking,classroom);
   db.update("insert into aulas.periodo_asignado values (?,?)",booking,otherTerm);
  })).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
 }
 @Test void schemaRequiresOccurrencesAndPatternsAtCommit() {
  long classroom=room("101",30),booking=booking(classroom,"2027-03-15","09:00",2);
  assertThatThrownBy(()->db.update("delete from aulas.detalle_reserva where id_reserva=?",booking)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  assertThatThrownBy(()->new TransactionTemplate(manager).executeWithoutResult(tx->{
   db.update("delete from aulas.reserva_esporadica where id_reserva=?",booking);
   db.update("insert into aulas.reserva_periodica(id_reserva,modalidad) values (?,'CUATRIMESTRAL')",booking);
   db.update("insert into aulas.periodo_asignado select ?,id_cuatrimestre from aulas.cuatrimestre where id_anio_lectivo=? and numero=1",booking,year);
  })).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  new TransactionTemplate(manager).executeWithoutResult(tx->{
   db.update("delete from aulas.reserva_esporadica where id_reserva=?",booking);
   db.update("insert into aulas.reserva_periodica(id_reserva,modalidad) values (?,'CUATRIMESTRAL')",booking);
   db.update("insert into aulas.periodo_asignado select ?,id_cuatrimestre from aulas.cuatrimestre where id_anio_lectivo=? and numero=1",booking,year);
   long pattern=db.queryForObject("insert into aulas.patron_semanal(id_reserva,dia,hora_inicio,cantidad_modulos,id_aula) values (?,1,'09:00',2,?) returning id_patron",Long.class,booking,classroom);
   db.update("update aulas.detalle_reserva set id_patron=?,fecha_original=fecha where id_reserva=?",pattern,booking);
  });
  assertThat(service.prepare(request("first","09:00",List.of())).patterns().getFirst().availableRooms()).isEmpty();
 }
 @Test void postgresRejectsOverlapsWithoutRequiringExtensions() {
  long id=room("101",30),booking=booking(id,"2027-03-15","09:00",2);
  assertThatThrownBy(()->occupy(booking,id,"2027-03-15","09:30",2)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  occupy(booking,id,"2027-03-15","10:00",2);
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva",Long.class)).isEqualTo(2);
 }
}
