package ar.edu.aulas;

import ar.edu.aulas.accounts.AuthAdmin;
import ar.edu.aulas.demo.*;
import ar.edu.aulas.reservations.*;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(properties="AULAS_ENVIRONMENT=demo") @Testcontainers
class DemoResetTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p){p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired DemoCatalogSeed catalogs; @Autowired DemoReservationSeed previous; @Autowired DemoOperationSeed operations; @Autowired DemoVolumeSeed volume; @Autowired DemoResetService reset; @Autowired ApplicationContext context;
 @Autowired ar.edu.aulas.calendar.CalendarImpactService impacts; @Autowired HeaderMutationService headers; @Autowired CancellationService cancellations; @Autowired ReservationQueries queries;
 @MockitoBean AuthAdmin auth;
 @org.springframework.boot.test.context.TestConfiguration static class FixedClock {
  @org.springframework.context.annotation.Bean java.time.Clock clock(){return java.time.Clock.fixed(java.time.Instant.parse("2026-09-01T12:00:00Z"),java.time.ZoneId.of("America/Argentina/Cordoba"));}
 }
 long actor;
 @BeforeEach void setup(){db.execute("truncate aulas.evento_auditoria,aulas.materia,aulas.anio_lectivo,aulas.aula,aulas.usuario cascade");actor=new TransactionTemplate(manager).execute(tx->{long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'Admin','Demo','ADMINISTRADOR') returning id_usuario",Long.class,UUID.randomUUID(),"admin@test.local");db.update("insert into aulas.administrador(id_usuario) values (?)",id);return id;});catalogs.seed();operations.seed();}
 long id(String key){return db.queryForObject("select id_reserva from aulas.demo_reserva where dataset='operacion-i04' and clave=?",Long.class,key);}
 String table(String name){return db.queryForObject("select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb)::text from aulas."+name+" t",String.class);}
 long count(String name){return db.queryForObject("select count(*) from aulas."+name,Long.class);}
 void apply(){var preview=reset.preview(List.of("operacion-i04"));assertThat(preview.blockers()).isEmpty();reset.reset(preview.datasets(),preview.stamp(),true);}
 @Test void previewIsReadOnlyAndResetPreservesIdentitiesForeignDataAndAuthWithSafeOldOperations(){
  previous.seed();String users=table("usuario"),rooms=table("aula"),history=table("historial_aula"),courses=table("curso"),years=table("anio_lectivo"),terms=table("cuatrimestre");
  var foreign=db.queryForList("select id_reserva from aulas.demo_reserva where dataset='reservas-i03'",Long.class).stream().map(r->queries.get(r,true)).toList();
  long id=id("receso-2027");String course=db.queryForObject("select id_curso::text from aulas.reserva where id_reserva=?",String.class,id);UUID edit=UUID.randomUUID();
  var request=new HeaderMutationService.Request(edit,0L,course,"D-01",19,"General","",List.of());headers.save(actor,id,request);
  var ids=db.queryForList("select id_detalle::text from aulas.detalle_reserva where id_reserva=? order by id_detalle",String.class,id);
  var cancel=new CancellationService.Request(UUID.randomUUID(),1L,List.of(ids.getFirst()),"Prueba de reset");cancellations.confirm(actor,id,cancel);
  String snapshot=table("reserva"),audit=table("evento_auditoria");var review=reset.preview(List.of("operacion-i04"));
  assertThat(review.items()).hasSize(8);assertThat(review.blockers()).isEmpty();assertThat(table("reserva")).isEqualTo(snapshot);assertThat(table("evento_auditoria")).isEqualTo(audit);
  reset.reset(review.datasets(),review.stamp(),true);
  assertThat(db.queryForObject("select cantidad_alumnos from aulas.reserva where id_reserva=?",Integer.class,id)).isEqualTo(20);
  assertThat(db.queryForObject("select version from aulas.reserva where id_reserva=?",Long.class,id)).isEqualTo(3);
  assertThat(db.queryForList("select id_detalle::text from aulas.detalle_reserva where id_reserva=? order by id_detalle",String.class,id)).isEqualTo(ids);
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where id_reserva=? and estado='CONFIRMADA'",Long.class,id)).isEqualTo(2);
  assertThatThrownBy(()->headers.save(actor,id,request)).hasMessageContaining("restablecimiento demo");
  assertThatThrownBy(()->cancellations.confirm(actor,id,cancel)).hasMessageContaining("restablecimiento demo");
  assertThatThrownBy(()->cancellations.operation(actor,edit)).hasMessageContaining("restablecimiento demo");
  UUID creation=db.queryForObject("select clave from aulas.operacion_reserva where id_reserva=?",UUID.class,id);
  assertThatThrownBy(()->queries.operation(actor,creation,true)).hasMessageContaining("restablecimiento demo");
  assertThat(table("usuario")).isEqualTo(users);assertThat(table("aula")).isEqualTo(rooms);assertThat(table("historial_aula")).isEqualTo(history);assertThat(table("curso")).isEqualTo(courses);assertThat(table("anio_lectivo")).isEqualTo(years);assertThat(table("cuatrimestre")).isEqualTo(terms);
  assertThat(db.queryForList("select id_reserva from aulas.demo_reserva where dataset='reservas-i03'",Long.class).stream().map(r->queries.get(r,true)).toList()).isEqualTo(foreign);
  assertThat(queries.get(id,true).get("changes").toString()).contains("Restablecimiento demo: se restauró el escenario registrado").doesNotContain(review.stamp());
  assertThat(operations.seed().discrepancies()).isEmpty();long details=count("detalle_reserva");apply();assertThat(count("detalle_reserva")).isEqualTo(details);assertThat(operations.seed().discrepancies()).isEmpty();verifyNoInteractions(auth);
 }
 @Test void staleScopeEnvironmentAndMissingIdentityFailWithoutWrites(){
  var review=reset.preview(List.of("operacion-i04"));db.update("update aulas.usuario set nombre='Otro' where id_usuario=?",actor);String before=table("reserva");
  assertThatThrownBy(()->reset.reset(review.datasets(),review.stamp(),true)).hasMessageContaining("cambió");assertThat(table("reserva")).isEqualTo(before);
  assertThatThrownBy(()->reset.reset(review.datasets(),review.stamp(),false)).hasMessageContaining("Detené");
  assertThatThrownBy(()->reset.preview(List.of())).hasMessageContaining("explícitamente");assertThatThrownBy(()->reset.preview(List.of("todo"))).hasMessageContaining("explícitamente");
  assertThat(context.getBeansOfType(DemoResetCommand.class)).isEmpty();
  assertThatThrownBy(()->new DemoResetCommand(reset,new MockEnvironment(),null).run(new DefaultApplicationArguments())).hasMessageContaining("web-application-type");
  assertThatThrownBy(()->new DemoResetService(db,null,new MockEnvironment(),null,null,null,null,null).preview(List.of("operacion-i04"))).hasMessageContaining("AULAS_ENVIRONMENT");
  assertThat(reset.preview(List.of("reservas-i03")).blockers()).anyMatch(s->s.contains("claves registradas"));
 }
 @Test void foreignCollisionAndChangedRoomOrCalendarBlockEntireSelection(){
  long id=id("receso-2027");db.update("update aulas.detalle_reserva set fecha_original=fecha,fecha=fecha+7 where id_reserva=?",id);
  // The original occupied slot now belongs to an unregistered reservation, which reset must not touch.
  new TransactionTemplate(manager).executeWithoutResult(tx->{long copy=db.queryForObject("insert into aulas.reserva(registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula) select registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula from aulas.reserva where id_reserva=? returning id_reserva",Long.class,id);db.update("insert into aulas.reserva_esporadica values (?)",copy);db.update("insert into aulas.detalle_reserva(id_reserva,id_aula,fecha,hora_inicio,cantidad_modulos) select ?,id_aula,fecha_original,hora_inicio,cantidad_modulos from aulas.detalle_reserva where id_reserva=? limit 1",copy,id);});
  String before=table("detalle_reserva");var review=reset.preview(List.of("operacion-i04"));assertThat(review.blockers()).anyMatch(s->s.contains("ajena ocupa"));assertThatThrownBy(()->reset.reset(review.datasets(),review.stamp(),true)).hasMessageContaining("bloqueado");assertThat(table("detalle_reserva")).isEqualTo(before);
  db.update("update aulas.aula set capacidad=1 where identificador='103'");assertThat(reset.preview(List.of("operacion-i04")).blockers()).anyMatch(s->s.contains("incompatible"));
  db.update("insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) select id_anio_lectivo,'2027-04-06','Cambio' from aulas.anio_lectivo where anio_calendario=2027");assertThat(reset.preview(List.of("operacion-i04")).blockers()).anyMatch(s->s.contains("patrón"));
 }
 @Test void auditFailureRollsBackEveryReservationAndLedger(){
  db.update("update aulas.reserva set cantidad_alumnos=19,version=version+1 where id_reserva=?",id("receso-2027"));
  var preview=reset.preview(List.of("operacion-i04"));String reservations=table("reserva"),details=table("detalle_reserva"),ledger=table("operacion_reserva"),datasets=table("demo_reserva");long audit=count("evento_auditoria");
  db.execute("alter table aulas.evento_auditoria add constraint reject_reset check (operacion <> 'RESTABLECER_DEMO') not valid");
  try{assertThatThrownBy(()->reset.reset(preview.datasets(),preview.stamp(),true)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);}finally{db.execute("alter table aulas.evento_auditoria drop constraint reject_reset");}
  assertThat(table("reserva")).isEqualTo(reservations);assertThat(table("detalle_reserva")).isEqualTo(details);assertThat(table("operacion_reserva")).isEqualTo(ledger);assertThat(table("demo_reserva")).isEqualTo(datasets);assertThat(count("evento_auditoria")).isEqualTo(audit);
 }
 @Test void sporadicOriginExtraDetailsAndCalendarRecoveryRemainCoherent(){
  long id=id("receso-2027");long detail=db.queryForObject("select min(id_detalle) from aulas.detalle_reserva where id_reserva=?",Long.class,id);
  db.update("update aulas.detalle_reserva set fecha_original=fecha,fecha=fecha+1 where id_detalle=?",detail);
  long extra=db.queryForObject("insert into aulas.detalle_reserva(id_reserva,id_aula,fecha,hora_inicio,cantidad_modulos) select id_reserva,id_aula,'2027-08-30','09:00',2 from aulas.detalle_reserva where id_detalle=? returning id_detalle",Long.class,detail);
  UUID key=UUID.randomUUID();long year=db.queryForObject("select c.id_anio_lectivo from aulas.reserva r join aulas.curso c using(id_curso) where r.id_reserva=?",Long.class,id);
  db.update("insert into aulas.operacion_calendario(actor,clave,id_anio_lectivo,contenido,resultado) values (?,?,?,'fixture',jsonb_build_object('added',jsonb_build_array(jsonb_build_object('booking',?::text))))",actor,key,year,Long.toString(id));
  UUID unrelated=UUID.randomUUID();db.update("insert into aulas.operacion_calendario(actor,clave,id_anio_lectivo,contenido,resultado) values (?,?,?,'unrelated','{\"added\":[]}'::jsonb)",actor,unrelated,year);
  var preview=reset.preview(List.of("operacion-i04"));assertThat(preview.items()).anyMatch(i->i.reservationId()==id && i.extraDetails()==1 && i.extraDetailIds().equals(List.of(extra)));apply();
  assertThat(db.queryForObject("select fecha::text from aulas.detalle_reserva where id_detalle=?",String.class,detail)).isEqualTo("2027-07-14");
  assertThat(db.queryForObject("select fecha_original::text from aulas.detalle_reserva where id_detalle=?",String.class,detail)).isEqualTo("2027-07-14");
  assertThat(db.queryForObject("select count(*) from aulas.detalle_reserva where id_detalle=?",Long.class,extra)).isZero();
  assertThatThrownBy(()->impacts.operation(actor,key)).hasMessageContaining("restablecimiento demo");assertThat(impacts.operation(actor,unrelated)).containsEntry("found",true);
  assertThat(operations.seed().discrepancies()).isEmpty();apply();assertThat(operations.seed().discrepancies()).isEmpty();
 }
 @Test void fullVolumeSelectionRestoresWithoutDuplicatingAndKeepsManual2029(){
  previous.seed();volume.seed();
  db.update("insert into aulas.anio_lectivo(anio_calendario,estado) values (2029,'EN_PREPARACION')");
  long bookings=count("reserva"),details=count("detalle_reserva");var originalIds=db.queryForList("select id_detalle from aulas.detalle_reserva order by id_detalle",Long.class);
  db.update("update aulas.reserva set cantidad_alumnos=1,version=version+1 where id_reserva=(select min(id_reserva) from aulas.demo_reserva where dataset='volumen-i05')");
  var datasets=List.of("reservas-i03","operacion-i04","volumen-i05");var review=reset.preview(datasets);assertThat(review.blockers()).isEmpty();assertThat(review.items()).hasSize(326);
  reset.reset(datasets,review.stamp(),true);assertThat(count("reserva")).isEqualTo(bookings);assertThat(count("detalle_reserva")).isEqualTo(details);assertThat(db.queryForList("select id_detalle from aulas.detalle_reserva order by id_detalle",Long.class)).isEqualTo(originalIds);
  assertThat(db.queryForObject("select estado from aulas.anio_lectivo where anio_calendario=2029",String.class)).isEqualTo("EN_PREPARACION");
  assertThat(previous.seed().discrepancies()).isEmpty();assertThat(operations.seed().discrepancies()).isEmpty();assertThat(volume.seed().discrepancies()).isEmpty();verifyNoInteractions(auth);
 }
 @Test void removedOriginalDetailBlocksInsteadOfReusingIdentity(){
  long id=id("receso-2027");db.update("delete from aulas.detalle_reserva where id_detalle=(select min(id_detalle) from aulas.detalle_reserva where id_reserva=?)",id);
  var review=reset.preview(List.of("operacion-i04"));assertThat(review.blockers()).anyMatch(s->s.contains("identidad de clase original"));assertThatThrownBy(()->reset.reset(review.datasets(),review.stamp(),true)).hasMessageContaining("bloqueado");
 }

 @Test void extraPatternsAreRemovedWithTheirDetailsAndAudited(){
  long id=id("patron-reprogramado-2027");
  long pattern=new TransactionTemplate(manager).execute(tx->{long p=db.queryForObject("insert into aulas.patron_semanal(id_reserva,dia,hora_inicio,cantidad_modulos,id_aula) select id_reserva,1,'22:00',1,id_aula from aulas.patron_semanal where id_reserva=? limit 1 returning id_patron",Long.class,id);db.update("insert into aulas.detalle_reserva(id_reserva,id_patron,id_aula,fecha,fecha_original,hora_inicio,cantidad_modulos) select id_reserva,id_patron,id_aula,'2027-05-03','2027-05-03',hora_inicio,cantidad_modulos from aulas.patron_semanal where id_patron=?",p);return p;});
  var preview=reset.preview(List.of("operacion-i04"));assertThat(preview.blockers()).isEmpty();assertThat(preview.items()).anyMatch(i->i.reservationId()==id && i.extraPatternIds().equals(List.of(pattern)));
  reset.reset(preview.datasets(),preview.stamp(),true);assertThat(db.queryForObject("select count(*) from aulas.patron_semanal where id_patron=?",Long.class,pattern)).isZero();
  assertThat(db.queryForObject("select detalle from aulas.evento_auditoria where operacion='RESTABLECER_DEMO' and entidad_id=?",String.class,id)).contains("extraPatternIds");assertThat(operations.seed().discrepancies()).isEmpty();
 }

}
