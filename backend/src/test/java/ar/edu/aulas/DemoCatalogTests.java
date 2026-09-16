package ar.edu.aulas;

import ar.edu.aulas.demo.*;
import ar.edu.aulas.accounts.AuthAdmin;
import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.rooms.RoomsService;
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
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties="AULAS_ENVIRONMENT=demo") @Testcontainers
class DemoCatalogTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired DemoCatalogSeed seed; @Autowired RoomsService rooms; @Autowired CalendarManagement calendars; @Autowired ObjectMapper json; @Autowired ApplicationContext context;
 @MockitoBean AuthAdmin auth;
 @BeforeEach void clean() {db.execute("truncate aulas.evento_auditoria,aulas.materia,aulas.anio_lectivo,aulas.aula,aulas.usuario cascade");}
 long admin() {return new TransactionTemplate(manager).execute(tx->{long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'Admin','Demo','ADMINISTRADOR') returning id_usuario",Long.class,UUID.randomUUID(),UUID.randomUUID()+"@test.local");db.update("insert into aulas.administrador(id_usuario) values (?)",id);return id;});}
 @Test void firstLoadAndRepeatProduceStableFictitiousCatalogWithoutAuth() {
  long admin=admin();var before=db.queryForMap("select * from aulas.usuario where id_usuario=?",admin);
  var result=seed.seed();assertThat(result.roomsCreated()).isEqualTo(20);assertThat(result.yearsCreated()).isEqualTo(2);assertThat(result.coursesCreated()).isEqualTo(40);assertThat(result.discrepancies()).isEmpty();
  assertThat(db.queryForObject("select count(*) from aulas.materia",Long.class)).isEqualTo(10);
  assertThat(db.queryForList("select anio_calendario from aulas.anio_lectivo order by anio_calendario",Integer.class)).containsExactly(2026,2027);
  assertThat(db.queryForObject("select count(*) from aulas.cuatrimestre",Long.class)).isEqualTo(4);assertThat(db.queryForObject("select count(*) from aulas.feriado",Long.class)).isEqualTo(6);
  assertThat(db.queryForObject("select count(*) from aulas.historial_aula where desde='2026-01-01T00:00:00-03:00'::timestamptz",Long.class)).isEqualTo(20);
  assertThat(db.queryForObject("select count(*) from aulas.historial_aula where hasta is null",Long.class)).isEqualTo(20);
  assertThat(db.queryForList("select identificador from aulas.aula",String.class)).contains("105","203","108","Lab 2","301","204");
  assertThat(db.queryForObject("select count(*) from aulas.aula where baja_en is not null",Long.class)).isEqualTo(1);
  var firstIds=db.queryForList("select id_curso from aulas.curso order by id_curso",Long.class);
  var repeat=seed.seed();assertThat(repeat.roomsCreated()).isZero();assertThat(repeat.yearsCreated()).isZero();assertThat(repeat.coursesCreated()).isZero();assertThat(repeat.discrepancies()).isEmpty();
  assertThat(db.queryForList("select id_curso from aulas.curso order by id_curso",Long.class)).isEqualTo(firstIds);
  assertThat(db.queryForObject("select count(*) from aulas.evento_auditoria where operacion='CARGAR_DEMO'",Long.class)).isEqualTo(62);
  assertThat(db.queryForMap("select * from aulas.usuario where id_usuario=?",admin)).isEqualTo(before);verifyNoInteractions(auth);
 }
 @Test void preservesManualEditsAndDoesNotRestoreRemovedCalendarData() {
  long actor=admin();seed.seed();
  long roomId=db.queryForObject("select id_aula from aulas.aula where identificador='105'",Long.class);var room=rooms.get(roomId);
  rooms.save(actor,roomId,new RoomsService.Room(room.internalId(),room.id(),room.version(),room.type(),99,room.state(),room.location(),room.floor(),room.board(),room.resources(),room.computers(),room.history()));
  var year=calendars.list().stream().filter(y->y.year()==2027).findFirst().orElseThrow();
  calendars.edit(actor,Long.parseLong(year.id()),new CalendarManagement.Edit(year.version(),2027,"En preparación",Map.of("first",year.terms().get("first"),"second",List.of("","")),year.holidays(),year.descriptions()));
  db.update("update aulas.materia set nombre='Nombre corregido manualmente' where nombre='Historia'");
  var result=seed.seed();assertThat(result.roomsCreated()).isZero();assertThat(result.yearsCreated()).isZero();assertThat(result.coursesCreated()).isZero();
  assertThat(result.discrepancies()).anyMatch(d->d.contains("Aula 105")).anyMatch(d->d.contains("Año 2027")).anyMatch(d->d.contains("Materia Historia"));
  assertThat(rooms.get(roomId).capacity()).isEqualTo(99);assertThat(calendars.get(Long.parseLong(year.id())).terms().get("second")).containsExactly("","");
  assertThat(db.queryForObject("select count(*) from aulas.materia where nombre='Nombre corregido manualmente'",Long.class)).isEqualTo(1);verifyNoInteractions(auth);
 }
 @Test void requiresDemoAndExistingActiveAdministratorAndNeverSeedsOnNormalStartup() {
  assertThat(context.getBeansOfType(DemoCatalogCommand.class)).isEmpty();assertThat(db.queryForObject("select count(*) from aulas.aula",Long.class)).isZero();
  assertThatThrownBy(seed::seed).isInstanceOf(IllegalStateException.class).hasMessageContaining("Administrador activo");
  admin();var nonDemo=new DemoCatalogSeed(db,json,new MockEnvironment(),rooms,calendars);
  assertThatThrownBy(nonDemo::seed).isInstanceOf(IllegalStateException.class).hasMessageContaining("AULAS_ENVIRONMENT=demo");
  var command=new DemoCatalogCommand(seed,new MockEnvironment());
  assertThatThrownBy(()->command.run(new DefaultApplicationArguments())).isInstanceOf(IllegalStateException.class).hasMessageContaining("web-application-type=none");
  assertThat(db.queryForObject("select count(*) from aulas.aula",Long.class)).isZero();verifyNoInteractions(auth);
 }
 @Test void aFailureRollsBackTheEntireLoad() {
  admin();db.execute("alter table aulas.evento_auditoria add constraint reject_demo_test check (operacion <> 'CARGAR_DEMO' or entidad <> 'CURSO') not valid");
  try {
   assertThatThrownBy(seed::seed).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
   for(String table:List.of("aula","anio_lectivo","materia","curso","evento_auditoria")) assertThat(db.queryForObject("select count(*) from aulas."+table,Long.class)).isZero();
  } finally {db.execute("alter table aulas.evento_auditoria drop constraint reject_demo_test");}
  verifyNoInteractions(auth);
 }
}
