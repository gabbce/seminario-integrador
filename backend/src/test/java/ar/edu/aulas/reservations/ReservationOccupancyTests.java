package ar.edu.aulas.reservations;

import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.*;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest @Testcontainers @Transactional
class ReservationOccupancyTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p){p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db;
 long actor,course,a,b,first,contiguous,tuesday;
 final LocalDate from=LocalDate.parse("2027-03-01"),to=from.plusDays(4);
 @BeforeEach void setup(){
  actor=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,'scope@test.local','Scope','Test','ADMINISTRADOR') returning id_usuario",Long.class,UUID.randomUUID());
  db.update("insert into aulas.administrador values (?)",actor);
  long year=db.queryForObject("insert into aulas.anio_lectivo(anio_calendario,estado) values (2027,'HABILITADO') returning id_anio_lectivo",Long.class);
  long matter=db.queryForObject("insert into aulas.materia(nombre,nombre_normalizado) values ('Scope','SCOPE') returning id_materia",Long.class);
  course=db.queryForObject("insert into aulas.curso(id_materia,comision,id_anio_lectivo) values (?,'A',?) returning id_curso",Long.class,matter,year);
  a=room("A");b=room("B");
  first=occurrence(a,"2027-03-01","14:00",false);contiguous=occurrence(a,"2027-03-01","15:00",false);
  occurrence(b,"2027-03-01","14:00",false);tuesday=occurrence(a,"2027-03-02","14:00",false);
  occurrence(a,"2027-03-01","07:00",false);occurrence(a,"2027-03-08","14:00",false);
  occurrence(a,"2027-03-01","14:00",true);
 }
 long room(String name){return db.queryForObject("insert into aulas.aula(identificador,tipo,capacidad,estado,ubicacion,piso,pizarron,ventiladores,aire) values (?,'General',30,'Habilitada','QA',0,'Tiza',false,false) returning id_aula",Long.class,name);}
 long occurrence(long room,String date,String time,boolean cancelled){
  long id=db.queryForObject("insert into aulas.reserva(registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula,estado) values (?,?,'D-01','Laura','Gómez','private@test.local',20,'General',?) returning id_reserva",Long.class,actor,course,cancelled?"CANCELADA":"CONFIRMADA");
  db.update("insert into aulas.reserva_esporadica values (?)",id);
  db.update("insert into aulas.detalle_reserva(id_reserva,id_aula,fecha,hora_inicio,cantidad_modulos,estado,motivo_cancelacion,cancelado_por,cancelado_en) values (?,?,?::date,?::time,2,?,?,?,?)",id,room,date,time,cancelled?"CANCELADA":"CONFIRMADA",cancelled?"QA":null,cancelled?actor:null,cancelled?java.sql.Timestamp.from(Instant.now()):null);
  return id;
 }
 ReservationOccupancy.Window window(Integer day,LocalDate date,String start,String end){return new ReservationOccupancy.Window(day,date,LocalTime.parse(start),LocalTime.parse(end));}
 @Test void onlyMatchingRoomsWeekdayAndHalfOpenOverlapCrossTheDatabaseBoundary(){
  var rows=ReservationOccupancy.read(db,from,to,false,List.of(a),List.of(window(1,null,"14:00","15:00")));
  assertThat(rows).extracting(AlternativeRanking.Occupied::reservationId).containsExactly(Long.toString(first));
  assertThat(rows.getFirst().teacherEmail()).isNull();assertThat(rows.getFirst().registrant()).isNull();
 }
 @Test void explicitDatesAndMultipleWindowsRemainCompleteAndNeverDuplicate(){
  var dates=ReservationOccupancy.read(db,from,from.plusDays(7),true,List.of(a),List.of(window(null,from.plusDays(1),"14:00","15:00")));
  assertThat(dates).extracting(AlternativeRanking.Occupied::reservationId).containsExactly(Long.toString(tuesday));
  assertThat(dates.getFirst().registrant()).isNotNull();
  var overlap=ReservationOccupancy.read(db,from,to,true,List.of(a),List.of(window(1,null,"14:00","16:00"),window(1,null,"14:00","15:00")));
  assertThat(overlap).extracting(AlternativeRanking.Occupied::reservationId).containsExactlyInAnyOrder(Long.toString(first),Long.toString(contiguous));
  assertThat(ReservationOccupancy.read(db,from,to,true,List.of(),List.of(window(1,null,"14:00","16:00")))).isEmpty();
 }
}
