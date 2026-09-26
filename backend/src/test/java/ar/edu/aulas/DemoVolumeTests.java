package ar.edu.aulas;

import ar.edu.aulas.accounts.AuthAdmin;
import ar.edu.aulas.demo.*;
import ar.edu.aulas.reservations.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(properties="AULAS_ENVIRONMENT=demo") @Testcontainers
class DemoVolumeTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p){p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired DemoCatalogSeed catalogs; @Autowired DemoReservationSeed previous; @Autowired ApplicationContext context; @Autowired ReservationQueries queries;
 @Autowired DemoOperationSeed operations; @MockitoSpyBean DemoVolumeSeed seed; @MockitoBean AuthAdmin auth;
 @BeforeEach void clean(){db.execute("truncate aulas.evento_auditoria,aulas.materia,aulas.anio_lectivo,aulas.aula,aulas.usuario cascade");}
 long admin(){return new TransactionTemplate(manager).execute(tx->{long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'Admin','Demo','ADMINISTRADOR') returning id_usuario",Long.class,UUID.randomUUID(),UUID.randomUUID()+"@test.local");db.update("insert into aulas.administrador(id_usuario) values (?)",id);return id;});}
 long count(String table){return db.queryForObject("select count(*) from aulas."+table,Long.class);}
 @Autowired PeriodicPreparation preparation;
 @Autowired ConsultationQueries consultations;
 @Autowired ar.edu.aulas.indicators.IndicatorQueries indicators;
 PeriodicPreparation.Preparation protectedLab(String start,int modules){return preparation.prepare(new PeriodicPreparation.Request(2027,null,"first",24,"Laboratorio","",List.of("fans"),List.of(),List.of(new PeriodicPreparation.Pattern(2,start,modules))));}
 @Test void volumePreservesExistingSnapshotsQueriesAndHistoryAndHasExactPrintCounts(){
  admin();catalogs.seed();previous.seed();operations.seed();
  var existing=queries.list(true);
  var ranking=protectedLab("14:00",4);var adjacent=protectedLab("16:00",2);
  var history=db.queryForList("select * from aulas.historial_aula order by id");
  var witnesses=new TreeMap<String,List<Map<String,Object>>>();
  for(String table:List.of("usuario","administrador","anio_lectivo","cuatrimestre","feriado","materia","curso"))witnesses.put(table,db.queryForList("select * from aulas."+table+" order by 1"));
  var result=seed.seed();
  assertThat(result.created()).isEqualTo(306);assertThat(result.occurrencesCreated()).isEqualTo(4613);
  assertThat(result.discrepancies()).isEmpty();
  assertThat(queries.list(true)).containsAll(existing);
  assertThat(protectedLab("14:00",4)).isEqualTo(ranking);assertThat(protectedLab("16:00",2)).isEqualTo(adjacent);
  assertThat(db.queryForList("select * from aulas.historial_aula order by id")).isEqualTo(history);
  witnesses.forEach((table,rows)->assertThat(db.queryForList("select * from aulas."+table+" order by 1")).isEqualTo(rows));
  assertThat(count("detalle_reserva")).isEqualTo(5052);
  var day=LocalDate.parse("2027-08-23");
  var printed=consultations.printDay(day,"","","active");
  assertThat(printed.total()).isEqualTo(104);assertThat(printed.rows()).hasSize(104);
  var paged=consultations.listing("day",day,null,null,"","","active",1,20);
  assertThat(paged.total()).isEqualTo(104);assertThat(paged.rows()).isEqualTo(printed.rows().subList(20,40));
  var metrics=indicators.series(day,day,"","","day");
  assertThat(metrics.summary().classes()).isEqualTo(104);assertThat(metrics.summary().hours()).isEqualTo(52);
  assertThat(metrics.daily().peakClasses()).isEqualTo(8);
  assertThat(metrics.studentHours()).isEqualTo(780);
  long id=db.queryForObject("select id_reserva from aulas.demo_reserva where dataset='volumen-i05' order by id_reserva limit 1",Long.class);
  db.update("update aulas.reserva set cantidad_alumnos=9,version=version+1 where id_reserva=?",id);
  var repeat=seed.seed();assertThat(repeat.created()).isZero();assertThat(repeat.preserved()).isEqualTo(306);assertThat(repeat.discrepancies()).anyMatch(s->s.contains("cambios manuales"));assertThat(count("detalle_reserva")).isEqualTo(5052);
  verifyNoInteractions(auth);
 }
 @Test void lateConflictRollsBackAllNewEntries(){
  admin();catalogs.seed();var all=seed.dataset();
  var last=all.entries().getLast();
  doReturn(new DemoOperationSeed.Dataset("qa-manual",1,all.description(),all.clock(),List.of(last))).when(seed).dataset();
  seed.seed();
  doReturn(all).when(seed).dataset();
  assertThatThrownBy(seed::seed).hasMessageContaining("ocupada");
  assertThat(count("reserva")).isOne();assertThat(count("detalle_reserva")).isOne();
 }
 @Test void commandsAreExplicitAndDiscrepanciesBlockPendingKeys(){
  assertThat(context.getBeansOfType(DemoVolumeCommand.class)).isEmpty();
  assertThatThrownBy(()->new DemoVolumeCommand(seed,new MockEnvironment()).run(new DefaultApplicationArguments())).hasMessageContaining("web-application-type=none");
  admin();catalogs.seed();var all=seed.dataset();
  doReturn(new DemoOperationSeed.Dataset(all.dataset(),1,all.description(),all.clock(),all.entries().subList(0,1))).when(seed).dataset();seed.seed();
  db.update("update aulas.reserva set cantidad_alumnos=9,version=version+1");
  doReturn(all).when(seed).dataset();assertThatThrownBy(seed::seed).hasMessageContaining("Discrepancias previas");
  assertThat(count("reserva")).isOne();
 }
}
