package ar.edu.aulas;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.rooms.RoomsService;
import ar.edu.aulas.reservations.*;
import java.time.*;
import java.util.*;
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

@SpringBootTest @Testcontainers @AutoConfigureMockMvc @Import(AlternativePreparationTests.TimeConfig.class)
class AlternativePreparationTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @TestConfiguration static class TimeConfig {@Bean Clock clock(){return Clock.fixed(Instant.parse("2027-03-08T12:00:00Z"),ZoneOffset.UTC);}}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired RoomsService rooms;
 @Autowired PeriodicPreparation preparation; @Autowired PeriodicConfirmation confirmation; @Autowired MockMvc mvc;
 long year,course,admin,bedel,teacher,registrant;
 @BeforeEach void setup() {
  db.execute("truncate aulas.evento_auditoria,aulas.materia,aulas.anio_lectivo,aulas.usuario,aulas.aula cascade");
  admin=account("ADMINISTRADOR");bedel=account("BEDEL");teacher=account("DOCENTE");registrant=account("BEDEL");
  year=db.queryForObject("insert into aulas.anio_lectivo(anio_calendario,estado) values (2027,'HABILITADO') returning id_anio_lectivo",Long.class);
  db.update("insert into aulas.cuatrimestre(id_anio_lectivo,numero,inicio,fin) values (?,1,'2027-03-01','2027-03-22'),(?,2,'2027-04-05','2027-04-19')",year,year);
  long matter=db.queryForObject("insert into aulas.materia(nombre,nombre_normalizado) values ('Historia','HISTORIA') returning id_materia",Long.class);
  course=db.queryForObject("insert into aulas.curso(id_materia,id_anio_lectivo,comision) values (?,?,'A') returning id_curso",Long.class,matter,year);
 }
 long account(String role) {return new TransactionTemplate(manager).execute(tx->{long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'Nombre','Apellido',?) returning id_usuario",Long.class,UUID.randomUUID(),UUID.randomUUID()+"@test.local",role);db.update("insert into aulas."+(role.equals("ADMINISTRADOR")?"administrador":role.equals("BEDEL")?"bedel":"docente")+"(id_usuario) values (?)",id);return id;});}
 org.springframework.test.web.servlet.request.RequestPostProcessor session(long id) {return jwt().jwt(jwt->jwt.subject(db.queryForObject("select supabase_auth_id::text from aulas.usuario where id_usuario=?",String.class,id)));}
 RoomsService.Room room(String name,int capacity,String state){return rooms.save(admin,null,new RoomsService.Room(null,name,null,"General",capacity,state,"A",0,"Tiza",List.of("fans"),null,List.of()));}
 record Lesson(String date,String start,int modules) {}
 long reserve(RoomsService.Room classroom,boolean periodic,Lesson... lessons) {
  return new TransactionTemplate(manager).execute(tx->{
   long id=db.queryForObject("insert into aulas.reserva(registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula) values (?,?,'D-01','Docente guardado','Prueba','snapshot@example.test',30,'General') returning id_reserva",Long.class,registrant,course);
   Long pattern=null;
   if(periodic) {
    db.update("insert into aulas.reserva_periodica(id_reserva,modalidad) values (?,'CUATRIMESTRAL')",id);
    db.update("insert into aulas.periodo_asignado select ?,id_cuatrimestre from aulas.cuatrimestre where id_anio_lectivo=? and numero=1",id,year);
    pattern=db.queryForObject("insert into aulas.patron_semanal(id_reserva,dia,hora_inicio,cantidad_modulos,id_aula) values (?,1,?::time,?,?) returning id_patron",Long.class,id,lessons[0].start(),lessons[0].modules(),Long.parseLong(classroom.internalId()));
   } else db.update("insert into aulas.reserva_esporadica values (?)",id);
   for(var lesson:lessons)db.update("insert into aulas.detalle_reserva(id_reserva,id_aula,fecha,hora_inicio,cantidad_modulos,id_patron,fecha_original) values (?,?,?::date,?::time,?,?,?::date)",id,Long.parseLong(classroom.internalId()),lesson.date(),lesson.start(),lesson.modules(),pattern,periodic?lesson.date():null);
   return id;
  });
 }
 PeriodicPreparation.Request request(List<String> excluded) {return new PeriodicPreparation.Request(2027,Long.toString(course),"first",30,"General","Tiza",List.of("fans"),excluded,List.of(new PeriodicPreparation.Pattern(1,"09:30",2)));}
 String json(){return "{\"year\":2027,\"period\":\"first\",\"students\":30,\"type\":\"General\",\"resources\":[\"fans\"],\"excluded\":[],\"patterns\":[{\"day\":1,\"start\":\"09:30\",\"modules\":2}]}";}
 @Test void ranksRealMixedOccupancyAndReturnsInformationalDetailsWithoutSavingQueries() {
  var a=room("A",30,"Habilitada");var b=room("B",30,"Habilitada");var c=room("C",30,"Habilitada");var d=room("D",30,"Habilitada");
  room("Insuficiente",29,"Habilitada");room("Mantenimiento",30,"Mantenimiento");
  reserve(a,false,new Lesson("2027-03-08","09:30",1),new Lesson("2027-03-08","10:00",1));
  reserve(b,false,new Lesson("2027-03-15","09:30",2));
  reserve(c,false,new Lesson("2027-03-08","09:30",1),new Lesson("2027-03-15","09:30",1));
  reserve(d,true,new Lesson("2027-03-08","09:30",1));
  long audit=db.queryForObject("select count(*) from aulas.evento_auditoria",Long.class);
  var pattern=preparation.prepare(request(List.of()),true).patterns().getFirst();
  assertThat(pattern.availableRooms()).isEmpty();assertThat(pattern.compatibleCount()).isEqualTo(4);
  assertThat(pattern.alternatives()).extracting(option->option.room().id()).containsExactly("A","B","C","D");
  assertThat(pattern.alternatives().getFirst().sporadicDates()).isEqualTo(1);assertThat(pattern.alternatives().getFirst().sporadicMinutes()).isEqualTo(60);
  var conflict=pattern.alternatives().getFirst().conflicts().getFirst();
  assertThat(conflict.modality()).isEqualTo("sporadic");assertThat(conflict.course()).endsWith("-A-2027");assertThat(conflict.start()).isEqualTo("09:30");assertThat(conflict.overlapMinutes()).isEqualTo(30);
  preparation.prepare(request(List.of()),true);
  assertThat(db.queryForObject("select count(*) from aulas.reserva",Long.class)).isEqualTo(4);assertThat(db.queryForObject("select count(*) from aulas.evento_auditoria",Long.class)).isEqualTo(audit);assertThat(db.queryForObject("select count(*) from aulas.operacion_reserva",Long.class)).isZero();
  var attempt=new PeriodicConfirmation.Request(UUID.randomUUID(),request(List.of()),"D-01",0L,List.of(new PeriodicConfirmation.Selection(1,a.internalId(),a.version(),pattern.dates())));
  assertThatThrownBy(()->confirmation.confirm(admin,attempt)).isInstanceOf(DomainError.class).hasMessageContaining("2027-03-08");
  assertThat(db.queryForObject("select count(*) from aulas.reserva",Long.class)).isEqualTo(4);
 }
 @Test void filtersCancelledContiguousHolidayExcludedAndOutsideDatesAndHidesAlternativesWhenFree() {
  var room=room("A",30,"Habilitada");
  reserve(room,false,new Lesson("2027-03-08","09:00",1),new Lesson("2027-03-08","10:30",1),new Lesson("2027-03-15","09:30",2),new Lesson("2027-03-22","09:30",2),new Lesson("2027-03-29","09:30",2));
  long cancelled=reserve(room,false,new Lesson("2027-03-08","09:30",2));
  db.update("update aulas.detalle_reserva set estado='CANCELADA',motivo_cancelacion='Fixture',cancelado_en=now(),cancelado_por=? where id_reserva=?",admin,cancelled);
  db.update("update aulas.reserva set estado='CANCELADA' where id_reserva=?",cancelled);
  db.update("insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) values (?,'2027-03-15','Feriado')",year);
  var result=preparation.prepare(request(List.of("2027-03-22")),true).patterns().getFirst();
  assertThat(result.dates()).containsExactly("2027-03-08");assertThat(result.availableRooms()).extracting(PeriodicPreparation.Room::id).containsExactly("A");assertThat(result.alternatives()).isEmpty();
  var empty=preparation.prepare(request(List.of("2027-03-08","2027-03-22")),true).patterns().getFirst();assertThat(empty.alternatives()).isEmpty();
 }
 @Test void apiSeparatesSnapshotTeacherFromCurrentInactiveRegistrantAndOmitsPrivateFieldsForTeacher() throws Exception {
  reserve(room("A",30,"Habilitada"),false,new Lesson("2027-03-08","09:30",2));
  db.update("update aulas.usuario set nombre='Registrador actualizado',email='actual@example.test',activo=false where id_usuario=?",registrant);
  for(long actor:List.of(admin,bedel)) mvc.perform(post("/api/reservas/periodicas/preparacion").with(session(actor)).contentType("application/json").content(json())).andExpect(status().isOk()).andExpect(jsonPath("$.patterns[0].alternatives[0].conflicts[0].teacherEmail").value("snapshot@example.test")).andExpect(jsonPath("$.patterns[0].alternatives[0].conflicts[0].registrant.email").value("actual@example.test")).andExpect(jsonPath("$.patterns[0].alternatives[0].conflicts[0].registrant.inactive").value(true));
  mvc.perform(post("/api/reservas/periodicas/preparacion").with(session(teacher)).contentType("application/json").content(json())).andExpect(status().isOk()).andExpect(jsonPath("$.patterns[0].alternatives[0].conflicts[0].teacher").value("Docente guardado Prueba")).andExpect(jsonPath("$.patterns[0].alternatives[0].conflicts[0].teacherEmail").doesNotExist()).andExpect(jsonPath("$.patterns[0].alternatives[0].conflicts[0].registrant").doesNotExist()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("@example.test")))).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("teacherEmail")))).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("registrant"))));
  assertThat(preparation.prepare(request(List.of())).patterns().getFirst().alternatives().getFirst().conflicts().getFirst().registrant()).isNull();
 }
 @Test void onlyEffectiveOccupancyChangesFreeAnAlternativeAndNoCompatibleRoomsRemainDistinct() {
  var room=room("A",30,"Habilitada");long reservation=reserve(room,false,new Lesson("2027-03-08","09:30",2));
  var first=preparation.prepare(request(List.of()),true).patterns().getFirst();assertThat(first.alternatives()).hasSize(1);
  db.update("update aulas.usuario set email='otro@example.test' where id_usuario=?",registrant);
  assertThat(preparation.prepare(request(List.of()),true).patterns().getFirst().availableRooms()).isEmpty();
  db.update("update aulas.detalle_reserva set estado='CANCELADA',motivo_cancelacion='Fixture',cancelado_en=now(),cancelado_por=? where id_reserva=?",admin,reservation);
  db.update("update aulas.reserva set estado='CANCELADA' where id_reserva=?",reservation);
  assertThat(preparation.prepare(request(List.of()),true).patterns().getFirst().availableRooms()).hasSize(1);
  rooms.save(admin,Long.parseLong(room.internalId()),new RoomsService.Room(room.internalId(),room.id(),room.version(),room.type(),29,room.state(),room.location(),room.floor(),room.board(),room.resources(),null,List.of()));
  var incompatible=preparation.prepare(request(List.of()),true).patterns().getFirst();assertThat(incompatible.compatibleCount()).isZero();assertThat(incompatible.alternatives()).isEmpty();
 }
}
