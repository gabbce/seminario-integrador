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
class DemoOperationTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p){p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired DemoCatalogSeed catalogs; @Autowired DemoReservationSeed previous; @Autowired ApplicationContext context; @Autowired ReservationQueries queries;
 @MockitoSpyBean DemoOperationSeed seed; @MockitoBean AuthAdmin auth;
 @BeforeEach void clean(){db.execute("truncate aulas.evento_auditoria,aulas.materia,aulas.anio_lectivo,aulas.aula,aulas.usuario cascade");}
 long admin(){return new TransactionTemplate(manager).execute(tx->{long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'Admin','Demo','ADMINISTRADOR') returning id_usuario",Long.class,UUID.randomUUID(),UUID.randomUUID()+"@test.local");db.update("insert into aulas.administrador(id_usuario) values (?)",id);return id;});}
 long count(String table){return db.queryForObject("select count(*) from aulas."+table,Long.class);}
 long id(String key){return db.queryForObject("select id_reserva from aulas.demo_reserva where dataset='operacion-i04' and clave=?",Long.class,key);}
 @Test void additiveDatasetCountsStatesOriginsPatternsAndRepeatAcrossActors(){
  long actor=admin();catalogs.seed();previous.seed();long before=count("detalle_reserva");var result=seed.seed();
  assertThat(result.created()).isEqualTo(8);assertThat(result.occurrencesCreated()).isEqualTo(69);assertThat(result.discrepancies()).isEmpty();assertThat(count("reserva")).isEqualTo(20);assertThat(count("detalle_reserva")).isEqualTo(before+69);
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where estado='CANCELADA'",Long.class)).isEqualTo(18);
  assertThat(db.queryForObject("select count(*) from aulas.reserva where estado='CANCELADA'",Long.class)).isEqualTo(2);
  assertThat(db.queryForObject("select count(*) from aulas.reserva_periodica where continuidad_cancelada_en is not null",Long.class)).isOne();
  long periodic=id("patron-reprogramado-2027");
  assertThat(db.queryForObject("select fecha_original::text from aulas.detalle_reserva where id_reserva=? and fecha='2027-03-17'",String.class,periodic)).isEqualTo("2027-03-16");
  assertThat(db.queryForObject("select a.identificador from aulas.patron_semanal p join aulas.aula a using(id_aula) where p.id_reserva=?",String.class,periodic)).isEqualTo("105");
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where id_reserva=? and fecha='2027-03-23'",Long.class,periodic)).isZero();
  assertThat(queries.get(periodic,false)).doesNotContainKeys("changes","registrant","teacherEmail");assertThat(queries.get(periodic,true)).containsKey("changes");
  assertThat(db.queryForObject("select fecha_original::text from aulas.detalle_reserva where id_reserva=?",String.class,id("origen-esporadica-2027"))).isEqualTo("2027-08-17");
  admin();db.update("update aulas.usuario set activo=false,nombre='Nombre cambiado' where id_usuario=?",actor);
  var repeated=seed.seed();assertThat(repeated.created()).isZero();assertThat(repeated.preserved()).isEqualTo(8);assertThat(repeated.discrepancies()).isEmpty();assertThat(count("detalle_reserva")).isEqualTo(439);verifyNoInteractions(auth);
 }
 @Test void manualChangesDefinitionAndRetiredKeysArePreservedEvenWithEditedCalendar(){
  admin();catalogs.seed();seed.seed();long id=id("receso-2027");
  db.update("update aulas.reserva set cantidad_alumnos=19,version=version+1 where id_reserva=?",id);db.update("update aulas.anio_lectivo set estado='EN_PREPARACION'");
  var data=seed.dataset();doReturn(new DemoOperationSeed.Dataset(data.dataset(),2,data.description(),data.clock(),data.entries().subList(0,7))).when(seed).dataset();
  var result=seed.seed();assertThat(result.created()).isZero();assertThat(result.discrepancies()).anyMatch(s->s.contains("cambios manuales")).anyMatch(s->s.contains("definición")).anyMatch(s->s.contains("retirada"));
  assertThat(db.queryForObject("select cantidad_alumnos from aulas.reserva where id_reserva=?",Integer.class,id)).isEqualTo(19);assertThat(count("reserva")).isEqualTo(8);
 }
 @Test void conflictAfterSeveralNewEntriesRollsBackThemAndKeepsUnregisteredQa(){
  admin();catalogs.seed();var data=seed.dataset();doReturn(new DemoOperationSeed.Dataset(data.dataset(),data.version(),data.description(),data.clock(),List.of(data.entries().getLast()))).when(seed).dataset();seed.seed();
  db.update("delete from aulas.demo_reserva where dataset='operacion-i04'");doReturn(data).when(seed).dataset();long audit=count("evento_auditoria");
  assertThatThrownBy(seed::seed).hasMessageContaining("ocupada o incompatible");assertThat(count("reserva")).isOne();assertThat(count("detalle_reserva")).isEqualTo(31);assertThat(count("mutacion_reserva")).isZero();assertThat(count("demo_reserva")).isZero();assertThat(count("evento_auditoria")).isEqualTo(audit);
 }
 @Test void mismatchedCalendarAndMissingReferencesDoNotPartiallyLoad(){
  admin();catalogs.seed();db.update("insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) select id_anio_lectivo,'2027-06-01','Cambio manual' from aulas.anio_lectivo where anio_calendario=2027");
  assertThatThrownBy(seed::seed).hasMessageContaining("fechas previstas");assertThat(count("reserva")).isZero();
  db.update("delete from aulas.feriado where fecha='2027-06-01'");db.update("delete from aulas.curso where id_anio_lectivo=(select id_anio_lectivo from aulas.anio_lectivo where anio_calendario=2026)");
  assertThatThrownBy(seed::seed).hasMessageContaining("falta el curso");assertThat(count("reserva")).isZero();assertThat(count("operacion_reserva")).isZero();
 }
 @Test void auditFailureRollsBackNewActionsAndPreservesOldDataset(){
  admin();catalogs.seed();previous.seed();long audit=count("evento_auditoria");
  db.execute("alter table aulas.evento_auditoria add constraint reject_i04_seed check (operacion <> 'CARGAR_DEMO_I04') not valid");
  try{assertThatThrownBy(seed::seed).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);}finally{db.execute("alter table aulas.evento_auditoria drop constraint reject_i04_seed");}
  assertThat(count("reserva")).isEqualTo(12);assertThat(count("detalle_reserva")).isEqualTo(370);assertThat(count("mutacion_reserva")).isZero();assertThat(count("evento_auditoria")).isEqualTo(audit);
 }
 @Test void normalStartupAndEnvironmentGuardNeverLoadOrContactAuth(){
  assertThat(context.getBeansOfType(DemoOperationCommand.class)).isEmpty();assertThat(count("reserva")).isZero();assertThatThrownBy(seed::seed).hasMessageContaining("Administrador activo");
  assertThatThrownBy(()->new DemoOperationCommand(seed,new MockEnvironment()).run(new DefaultApplicationArguments())).hasMessageContaining("web-application-type=none");
  var normal=new DemoOperationSeed(db,null,new MockEnvironment(),null,null,null,null,null);assertThatThrownBy(normal::seed).hasMessageContaining("AULAS_ENVIRONMENT=demo");verifyNoInteractions(auth);
 }
}
