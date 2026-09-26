package ar.edu.aulas;
import ar.edu.aulas.indicators.IndicatorQueries;
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
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest @Testcontainers @AutoConfigureMockMvc
class IndicatorTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p){p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired IndicatorQueries queries; @Autowired MockMvc mvc;
 long actor,course,year,a,b; UUID auth; final LocalDate day=LocalDate.parse("2027-03-01");
 @BeforeEach void setup(){
  db.execute("truncate aulas.usuario,aulas.aula,aulas.anio_lectivo,aulas.materia cascade");
  new TransactionTemplate(manager).executeWithoutResult(tx->{
   auth=UUID.randomUUID();actor=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,'metrics@test.local','Test','Admin','ADMINISTRADOR') returning id_usuario",Long.class,auth);db.update("insert into aulas.administrador values (?)",actor);
   year=db.queryForObject("insert into aulas.anio_lectivo(anio_calendario,estado) values (2027,'HABILITADO') returning id_anio_lectivo",Long.class);
   long matter=db.queryForObject("insert into aulas.materia(nombre,nombre_normalizado) values ('Indicadores','indicadores') returning id_materia",Long.class);
   course=db.queryForObject("insert into aulas.curso(id_materia,comision,id_anio_lectivo) values (?,'EXACTO',?) returning id_curso",Long.class,matter,year);
   a=room("A");b=room("B");
  });
  history(a,"2027-01-01T00:00:00", "2027-03-01T07:00:00","General","Inhabilitada",false);
  history(a,"2027-03-01T07:00:00", "2027-03-01T15:00:00","General","Habilitada",false);
  history(a,"2027-03-01T15:00:00",null,"General","Inhabilitada",false);
  history(b,"2027-01-01T00:00:00", "2027-03-01T07:00:00","General","Inhabilitada",false);
  history(b,"2027-03-01T07:00:00", "2027-03-01T09:00:00","General","Habilitada",false);
  history(b,"2027-03-01T09:00:00",null,"General","Inhabilitada",false);
 }
 long room(String name){return db.queryForObject("insert into aulas.aula(identificador,tipo,capacidad,estado,ubicacion,piso,pizarron,ventiladores,aire) values (?,'General',80,'Habilitada','QA',0,'Tiza',false,false) returning id_aula",Long.class,name);}
 void history(long room,String from,String to,String type,String state,boolean deleted){db.update("insert into aulas.historial_aula(id_aula,desde,hasta,tipo,estado,baja) values (?,?::timestamp at time zone 'America/Argentina/Buenos_Aires',?::timestamp at time zone 'America/Argentina/Buenos_Aires',?,?,?)",room,from,to,type,state,deleted);}
 long occurrence(long room,String date,String start,int modules,int students){return new TransactionTemplate(manager).execute(tx->{
  long id=db.queryForObject("insert into aulas.reserva(registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula) values (?,?,'D-01','Laura','Gómez','private@test.local',?,'General') returning id_reserva",Long.class,actor,course,students);
  db.update("insert into aulas.reserva_esporadica values (?)",id);
  return db.queryForObject("insert into aulas.detalle_reserva(id_reserva,id_aula,fecha,hora_inicio,cantidad_modulos) values (?,?,?::date,?::time,?) returning id_detalle",Long.class,id,room,date,start,modules);
 });}
 @Test void exactHoursWeightedOccupancyAndIndependentTypeDemand(){
  occurrence(a,day.toString(),"07:00",4,30);
  var one=queries.summary(day,day,"A","");assertThat(one.hours()).isEqualTo(2);assertThat(one.availableHours()).isEqualTo(8);assertThat(one.occupancy()).isEqualTo(25);assertThat(one.classes()).isEqualTo(1);
  var all=queries.summary(day,day,"","");assertThat(all.availableHours()).isEqualTo(10);assertThat(all.occupancy()).isEqualTo(20);
  occurrence(b,day.toString(),"07:00",4,20);all=queries.summary(day,day,"","");assertThat(all.hours()).isEqualTo(4);assertThat(all.classes()).isEqualTo(2);assertThat(all.demand().getFirst().hours()).isEqualTo(4);
 }
 @Test void yearStateRecessCancelAndDestinationDoNotRewriteHistory(){
  long detail=occurrence(a,day.toString(),"07:00",4,30);
  var original=queries.summary(day,day,"","");db.update("update aulas.anio_lectivo set estado='CERRADO'");assertThat(queries.summary(day,day,"","")).isEqualTo(original);
  db.update("update aulas.aula set estado='Inhabilitada',baja_en=now()");assertThat(queries.summary(day,day,"","")).isEqualTo(original);
  db.update("update aulas.detalle_reserva set fecha_original=fecha,fecha='2027-03-02' where id_detalle=?",detail);
  assertThat(queries.summary(day,day,"","").hours()).isZero();assertThat(queries.summary(day.plusDays(1),day.plusDays(1),"","").hours()).isEqualTo(2);
  db.update("update aulas.detalle_reserva set estado='CANCELADA',motivo_cancelacion='QA',cancelado_por=?,cancelado_en=now() where id_detalle=?",actor,detail);
  assertThat(queries.summary(day,day.plusDays(1),"","").hours()).isZero();
 }
 @Test void exactMinuteBoundariesAndTypeChangeInsideCompleteModule(){
  db.update("delete from aulas.historial_aula where id_aula=?",a);
  history(a,"2027-01-01T00:00:00","2027-03-01T10:10:00","General","Inhabilitada",false);
  history(a,"2027-03-01T10:10:00","2027-03-01T11:10:00","General","Habilitada",false);
  history(a,"2027-03-01T11:10:00","2027-03-01T12:10:00","Multimedios","Habilitada",false);
  history(a,"2027-03-01T12:10:00",null,"Multimedios","Inhabilitada",false);
  occurrence(a,day.toString(),"10:30",3,30);
  assertThat(queries.summary(day,day,"A","").availableHours()).isEqualTo(1.5);
  var general=queries.summary(day,day,"A","General");var multimedia=queries.summary(day,day,"A","Multimedios");
  assertThat(general.availableHours()).isEqualTo(1);assertThat(multimedia.availableHours()).isEqualTo(.5);
  assertThat(general.hours()).isEqualTo(1);assertThat(multimedia.hours()).isEqualTo(.5);
  assertThat(general.classes()).isEqualTo(1);assertThat(multimedia.classes()).isEqualTo(1);
 }
 @Test void unknownCoverageZeroDenominatorAndNoEligibleDatesAreDifferent(){
  db.update("delete from aulas.historial_aula where id_aula=?",a);history(a,"2027-03-01T10:10:00",null,"General","Habilitada",false);
  var partial=queries.summary(day,day,"A","");assertThat(partial.unknownCoverage()).isTrue();assertThat(partial.availableHours()).isEqualTo(12.5);assertThat(partial.occupancy()).isNull();
  var zero=queries.summary(day.plusDays(1),day.plusDays(1),"B","");assertThat(zero.eligible()).isTrue();assertThat(zero.unknownCoverage()).isFalse();assertThat(zero.availableHours()).isZero();assertThat(zero.occupancy()).isNull();
  db.update("insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) values (?,'2027-03-01','QA')",year);
  assertThat(queries.summary(day,day,"","").eligible()).isFalse();assertThat(queries.summary(day,day,"","").availableHours()).isZero();
 }
 @Test void coverageGapInsideModuleAndTypeAtBoundaryStayExact(){
  db.update("delete from aulas.historial_aula where id_aula=?",a);
  history(a,"2027-01-01T00:00:00","2027-03-01T10:10:00","General","Habilitada",false);
  history(a,"2027-03-01T10:20:00","2027-03-01T11:00:00","General","Habilitada",false);
  history(a,"2027-03-01T11:00:00",null,"Multimedios","Habilitada",false);
  var all=queries.summary(day,day,"A","");assertThat(all.unknownCoverage()).isTrue();assertThat(all.availableHours()).isEqualTo(15.5);assertThat(all.occupancy()).isNull();
  assertThat(queries.summary(day,day,"A","General").availableHours()).isEqualTo(3.5);
  assertThat(queries.summary(day,day,"A","Multimedios").availableHours()).isEqualTo(12);
 }
 @Test void rolesAndInvalidRange() throws Exception {
  mvc.perform(get("/api/indicadores/resumen?from=2027-03-01&to=2027-03-01").with(jwt().jwt(j->j.subject(auth.toString())))).andExpect(status().isOk()).andExpect(jsonPath("$.availableHours").value(10));
  new TransactionTemplate(manager).executeWithoutResult(tx->{db.update("delete from aulas.administrador where id_usuario=?",actor);db.update("update aulas.usuario set rol='DOCENTE' where id_usuario=?",actor);db.update("insert into aulas.docente values (?)",actor);});
  mvc.perform(get("/api/indicadores/resumen?from=2027-03-01&to=2027-03-01").with(jwt().jwt(j->j.subject(auth.toString())))).andExpect(status().isForbidden());
  assertThatThrownBy(()->queries.summary(day,day.minusDays(1),"","")).hasMessageContaining("rango válido");
 }
}
