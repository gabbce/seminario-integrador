package ar.edu.aulas;

import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.reservations.PeriodicPreparation;
import ar.edu.aulas.reservations.SporadicPreparation;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.*;
import org.springframework.test.context.*;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Remote Postgres pays for every JDBC round trip, even when each query is fast. */
@SpringBootTest @Testcontainers
class ReadRoundTripsTests {
  @Container static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17.6-alpine");
  @DynamicPropertySource static void properties(DynamicPropertyRegistry p) {
    p.add("spring.datasource.url", postgres::getJdbcUrl);
    p.add("spring.datasource.username", postgres::getUsername);
    p.add("spring.datasource.password", postgres::getPassword);
  }
  @MockitoSpyBean JdbcTemplate db;
  @Autowired CalendarManagement calendars;
  @Autowired PeriodicPreparation preparation;
  @Autowired SporadicPreparation sporadic;
  long year;
  @BeforeEach void fixture() {
    db.execute("truncate aulas.usuario,aulas.aula,aulas.anio_lectivo,aulas.materia cascade");
    year = db.queryForObject("insert into aulas.anio_lectivo(anio_calendario,estado) values (2027,'HABILITADO') returning id_anio_lectivo", Long.class);
    db.update("insert into aulas.cuatrimestre(id_anio_lectivo,numero,inicio,fin) values (?,1,'2027-03-01','2027-07-02'),(?,2,'2027-08-02','2027-11-26')", year, year);
    db.update("insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) values (?,'2027-03-24','Feriado')", year);
    db.update("insert into aulas.anio_lectivo(anio_calendario) values (2028),(2029),(2030)");
    db.update("insert into aulas.aula(identificador,tipo,capacidad,estado,ubicacion,piso,pizarron,ventiladores,aire) values ('R-1','General',40,'Habilitada','A',0,'Tiza',false,false)");
    clearInvocations(db);
  }
  private long reads() {
    // Count the public SQL entry point, not JdbcTemplate's internal overload delegation.
    return mockingDetails(db).getInvocations().stream().filter(i -> {
      String name = i.getMethod().getName(); Object[] args = i.getArguments();
      return name.equals("queryForList") || name.equals("queryForObject") ||
        (name.equals("query") && args.length > 1 && (args[1] instanceof RowMapper<?> || args[1] instanceof RowCallbackHandler));
    }).count();
  }
  @Test void calendarDetailHasOneReadWithPeriodsAndHolidays() {
    var config = calendars.get(year);
    assertThat(config.terms().get("first")).containsExactly("2027-03-01", "2027-07-02");
    assertThat(config.descriptions()).containsEntry("2027-03-24", "Feriado");
    assertThat(reads()).as("calendar detail must not make three network reads").isLessThanOrEqualTo(1);
  }
  @Test void calendarReferencesDoNotAddQueriesPerYear() {
    assertThat(calendars.list()).hasSize(4);
    assertThat(reads()).as("calendar references must be loaded together, not per year").isLessThanOrEqualTo(1);
  }
  @Test void availabilityDoesNotLoadRoomHistoryOrRepeatCalendarQueries() {
    var result = preparation.prepare(new PeriodicPreparation.Request(2027, null, "first", 20, "General", "", List.of(), List.of(),
      List.of(new PeriodicPreparation.Pattern(1, "09:00", 2))));
    assertThat(result.patterns()).hasSize(1);
    assertThat(result.patterns().getFirst().availableRooms()).extracting(PeriodicPreparation.Room::id).containsExactly("R-1");
    assertThat(reads()).as("availability must load one coherent statement snapshot").isLessThanOrEqualTo(1);
  }
  @Test void sporadicAvailabilityIncludesOptionalCourseValidationInOneRead() {
    long subject=db.queryForObject("insert into aulas.materia(nombre,nombre_normalizado) values ('Materia','MATERIA') returning id_materia",Long.class);
    long course=db.queryForObject("insert into aulas.curso(id_materia,id_anio_lectivo,comision) values (?,?,'A') returning id_curso",Long.class,subject,year);
    clearInvocations(db);
    var result=sporadic.prepare(new SporadicPreparation.Request(2027,Long.toString(course),20,"General","Tiza",List.of(),
      List.of(new SporadicPreparation.DateSlot("2027-03-01","09:00",2))),false);
    assertThat(result.dates().getFirst().availableRooms()).extracting(PeriodicPreparation.Room::id).containsExactly("R-1");
    assertThat(reads()).isEqualTo(1);
  }
  @Test void eachPreparationReflectsCurrentCalendarAndRoomVersionsWithoutCachedState() {
    var request=new PeriodicPreparation.Request(2027,null,"first",20,"General","",List.of(),List.of(),List.of(new PeriodicPreparation.Pattern(1,"09:00",2)));
    var before=preparation.prepare(request);
    assertThat(before.patterns().getFirst().dates()).contains("2027-03-01");
    db.update("update aulas.anio_lectivo set version=version+1 where id_anio_lectivo=?",year);
    db.update("insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) values (?,'2027-03-01','Nuevo feriado')",year);
    db.update("update aulas.aula set capacidad=19,version=version+1 where identificador='R-1'");
    clearInvocations(db);
    var after=preparation.prepare(request);
    assertThat(after.calendarVersion()).isEqualTo(before.calendarVersion()+1);
    assertThat(after.patterns().getFirst().dates()).doesNotContain("2027-03-01");
    assertThat(after.patterns().getFirst().omitted()).contains(new PeriodicPreparation.Omission("2027-03-01","Feriado"));
    assertThat(after.patterns().getFirst().compatibleCount()).isZero();
    assertThat(reads()).isEqualTo(1);
  }
}
