package ar.edu.aulas;

import ar.edu.aulas.accounts.AuthAdmin;
import ar.edu.aulas.demo.*;
import ar.edu.aulas.reservations.PeriodicPreparation;
import ar.edu.aulas.reservations.ReservationQueries;
import java.sql.*;
import java.lang.reflect.*;
import org.springframework.jdbc.datasource.AbstractDataSource;
import java.time.*;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import ar.edu.aulas.demo.DemoReservationSeed.*;
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
class DemoReservationTests {
 @TestConfiguration static class TimeConfig { @Bean Clock operationalClock() {return Clock.fixed(Instant.parse("2026-09-17T12:00:00Z"),ZoneId.of("America/Argentina/Cordoba"));} }
 @Autowired PeriodicPreparation operational;
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired DemoCatalogSeed catalogs; @Autowired ApplicationContext context;
 @MockitoSpyBean DemoReservationSeed seed; @MockitoBean AuthAdmin auth;
 @BeforeEach void clean() {db.execute("truncate aulas.evento_auditoria,aulas.materia,aulas.anio_lectivo,aulas.aula,aulas.usuario cascade");}
 long admin() {return new TransactionTemplate(manager).execute(tx->{long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'Admin','Demo','ADMINISTRADOR') returning id_usuario",Long.class,UUID.randomUUID(),UUID.randomUUID()+"@test.local");db.update("insert into aulas.administrador(id_usuario) values (?)",id);return id;});}
 long count(String table) {return db.queryForObject("select count(*) from aulas."+table,Long.class);}
 Dataset entries(Dataset data,List<Entry> entries) {return new Dataset(data.dataset(),data.version(),data.description(),data.clock(),entries);}
 @Test void createsExactly370AndRepeatsAcrossActorsWithoutProfileFalsePositives() {
  long actor=admin();catalogs.seed();var data=seed.dataset();var first=seed.seed();
  assertThat(first.created()).isEqualTo(12);assertThat(first.occurrencesCreated()).isEqualTo(370);assertThat(first.discrepancies()).isEmpty();
  assertThat(count("reserva")).isEqualTo(12);assertThat(count("detalle_reserva")).isEqualTo(370);assertThat(count("demo_reserva")).isEqualTo(12);assertThat(count("operacion_reserva")).isEqualTo(12);
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where extract(year from fecha)=2026",Long.class)).isEqualTo(93);
  var expected=List.of(25L,28L,26L,14L,32L,33L,16L,16L,60L,58L,31L,31L);
  for(int i=0;i<data.entries().size();i++) assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva d join aulas.demo_reserva r using(id_reserva) where r.clave=?",Long.class,data.entries().get(i).key())).isEqualTo(expected.get(i));
  var ids=db.queryForList("select id_reserva from aulas.reserva order by id_reserva",Long.class);
  admin();db.update("update aulas.usuario set activo=false,nombre='Nombre actualizado',email='updated@example.test' where id_usuario=?",actor);
  var repeat=seed.seed();assertThat(repeat.created()).isZero();assertThat(repeat.preserved()).isEqualTo(12);assertThat(repeat.discrepancies()).isEmpty();
  assertThat(db.queryForList("select id_reserva from aulas.reserva order by id_reserva",Long.class)).isEqualTo(ids);
  assertThat(db.queryForObject("select count(*) from aulas.evento_auditoria where operacion='CARGAR_DEMO_RESERVA'",Long.class)).isEqualTo(12);
  assertThat(db.queryForObject("select bool_and((detalle::jsonb->'snapshot')=d.snapshot) from aulas.evento_auditoria a join aulas.demo_reserva d on d.id_reserva=a.entidad_id where operacion='CARGAR_DEMO_RESERVA'",Boolean.class)).isTrue();
  var current=operational.prepare(new PeriodicPreparation.Request(2026,null,"second",30,"General","",List.of(),List.of(),List.of(new PeriodicPreparation.Pattern(1,"14:00",4))));
  assertThat(current.patterns().getFirst().dates()).doesNotContain("2026-09-14").contains("2026-09-21");
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where fecha='2026-09-14'",Long.class)).isEqualTo(2);
  verifyNoInteractions(auth);
 }
 @Test void preservesManualCancellationsExclusionsAndDefinitionChangesWithoutReinterpretingCalendar() {
  long actor=admin();catalogs.seed();seed.seed();var data=seed.dataset();
  long id=db.queryForObject("select min(id_reserva) from aulas.reserva",Long.class);
  new TransactionTemplate(manager).executeWithoutResult(tx->{
   db.update("update aulas.detalle_reserva set estado='CANCELADA',motivo_cancelacion='Cambio manual',cancelado_en=now(),cancelado_por=? where id_detalle=(select min(id_detalle) from aulas.detalle_reserva where id_reserva=?)",actor,id);
   db.update("insert into aulas.fecha_excluida values (?,date '2026-12-31')",id);
  });
  db.update("update aulas.anio_lectivo set estado='EN_PREPARACION'");
  doReturn(new Dataset(data.dataset(),2,data.description(),data.clock(),data.entries())).when(seed).dataset();
  var repeat=seed.seed();assertThat(repeat.created()).isZero();assertThat(repeat.preserved()).isEqualTo(12);
  assertThat(repeat.discrepancies()).anyMatch(d->d.contains("cambios manuales")).anyMatch(d->d.contains("definición"));
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where estado='CANCELADA'",Long.class)).isEqualTo(1);
  assertThat(db.queryForObject("select count(*) from aulas.fecha_excluida where fecha='2026-12-31'",Long.class)).isEqualTo(1);
 }
 @Test void changedCalendarDatesRollBackEarlierSeriesButDescriptionDoesNotChangeDates() {
  admin();catalogs.seed();db.update("update aulas.feriado set descripcion='Descripción actualizada'");
  db.update("insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) select id_anio_lectivo,date '2027-04-06','Extra' from aulas.anio_lectivo where anio_calendario=2027");
  assertThatThrownBy(seed::seed).hasMessageContaining("fechas previstas");
  assertThat(count("reserva")).isZero();assertThat(count("demo_reserva")).isZero();assertThat(count("operacion_reserva")).isZero();
  db.update("delete from aulas.feriado where fecha='2027-04-06'");assertThat(seed.seed().occurrencesCreated()).isEqualTo(370);
 }
 @Test void conflictPreservesUnregisteredReservationAndRollsBackEveryNewSeries() {
  admin();catalogs.seed();var data=seed.dataset();doReturn(entries(data,List.of(data.entries().getLast()))).when(seed).dataset();seed.seed();
  db.update("delete from aulas.demo_reserva");doReturn(data).when(seed).dataset();long audit=count("evento_auditoria");
  assertThatThrownBy(seed::seed).hasMessageContaining("ocupada o incompatible");
  assertThat(count("reserva")).isEqualTo(1);assertThat(count("detalle_reserva")).isEqualTo(31);assertThat(count("demo_reserva")).isZero();assertThat(count("operacion_reserva")).isEqualTo(1);assertThat(count("evento_auditoria")).isEqualTo(audit);
 }
 @Test void missingReferenceAndAuditFailureRollBackWholeLoad() {
  admin();catalogs.seed();db.update("delete from aulas.curso where id_materia=(select id_materia from aulas.materia where nombre='Sistemas operativos')");
  assertThatThrownBy(seed::seed).hasMessageContaining("falta el curso");assertThat(count("reserva")).isZero();
  catalogs.seed();long before=count("evento_auditoria");
  db.execute("alter table aulas.evento_auditoria add constraint reject_demo_reservation_test check (operacion <> 'CARGAR_DEMO_RESERVA') not valid");
  try {assertThatThrownBy(seed::seed).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);assertThat(count("reserva")).isZero();assertThat(count("demo_reserva")).isZero();assertThat(count("operacion_reserva")).isZero();assertThat(count("evento_auditoria")).isEqualTo(before);}
  finally {db.execute("alter table aulas.evento_auditoria drop constraint reject_demo_reservation_test");}
 }
 @Test void normalStartupDoesNotLoadAndExplicitCommandRequiresNonWebAndActiveAdministrator() {
  assertThat(context.getBeansOfType(DemoReservationCommand.class)).isEmpty();assertThat(count("reserva")).isZero();
  assertThatThrownBy(seed::seed).hasMessageContaining("Administrador activo");
  assertThatThrownBy(()->new DemoReservationCommand(seed,new MockEnvironment()).run(new DefaultApplicationArguments())).hasMessageContaining("web-application-type=none");
  var ordinary=new DemoReservationSeed(db,null,new MockEnvironment(),null,null,null,null);
  assertThatThrownBy(ordinary::seed).hasMessageContaining("AULAS_ENVIRONMENT=demo");
  var unmanaged=new DemoReservationSeed(db,null,new MockEnvironment().withProperty("AULAS_ENVIRONMENT","demo"),null,null,null,null);
  assertThatThrownBy(unmanaged::seed).hasMessageContaining("transacción activa");
  verifyNoInteractions(auth);
 }
 @Test void groupedListReadsSixQueriesForTwelveReservationsAndMatchesDetailWithRolePrivacy() {
  admin();catalogs.seed();seed.seed();
  db.update("update aulas.reserva set recursos=array['fans'] where id_reserva=(select min(id_reserva) from aulas.reserva)");
  var statements=new ArrayList<String>();
  var source=new AbstractDataSource() {
   private Connection counted(Connection connection) {
    return (Connection)Proxy.newProxyInstance(Connection.class.getClassLoader(),new Class<?>[]{Connection.class},(proxy,method,args)->{
     if(method.getName().equals("prepareStatement")) statements.add((String)args[0]);
     if(method.getName().equals("createStatement")) statements.add("statement");
     try {return method.invoke(connection,args);} catch(InvocationTargetException failure) {throw failure.getCause();}
    });
   }
   @Override public Connection getConnection() throws SQLException {return counted(db.getDataSource().getConnection());}
   @Override public Connection getConnection(String user,String password) throws SQLException {return counted(db.getDataSource().getConnection(user,password));}
  };
  var reads=new ReservationQueries(new JdbcTemplate(source));
  var operational=reads.list(true);assertThat(statements).hasSize(6);assertThat(operational).hasSize(12);
  assertThat(operational.stream().map(r->Long.parseLong(r.get("id").toString())).toList()).isSortedAccordingTo(Comparator.reverseOrder());
  assertThat(operational.getLast().get("resources")).isEqualTo(List.of("fans"));
  for(var booking:operational) assertThat(reads.get(Long.parseLong(booking.get("id").toString()),true)).isEqualTo(booking);
  statements.clear();var publicBookings=reads.list(false);assertThat(statements).hasSize(6);
  assertThat(statements).noneMatch(sql->sql.contains("email") || sql.contains("aulas.usuario") || sql.contains("registrado_por"));
  for(int i=0;i<publicBookings.size();i++) {
   var publicBooking=publicBookings.get(i);var expected=new LinkedHashMap<>(operational.get(i));expected.remove("teacherEmail");expected.remove("registrant");
   assertThat(publicBooking).isEqualTo(expected).doesNotContainKeys("teacherEmail","registrant");
   assertThat(reads.get(Long.parseLong(publicBooking.get("id").toString()),false)).isEqualTo(publicBooking);
  }
  statements.clear();assertThatThrownBy(()->reads.get(Long.MAX_VALUE,true)).hasMessageContaining("no existe");assertThat(statements).hasSize(1);
 }

}
