package ar.edu.aulas;

import ar.edu.aulas.reservations.ConsultationQueries;
import java.time.LocalDate;
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
class ConsultationTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired ConsultationQueries queries; @Autowired MockMvc mvc;
 long actor,course,reservation; UUID auth;
 @BeforeEach void fixture() {
  db.execute("truncate aulas.usuario,aulas.aula,aulas.anio_lectivo,aulas.materia cascade");
  new TransactionTemplate(manager).executeWithoutResult(tx->{
   auth=UUID.randomUUID();
   actor=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,'test@local.test','Test','User','DOCENTE') returning id_usuario",Long.class,auth);
   db.update("insert into aulas.docente values (?)",actor);
   long year=db.queryForObject("insert into aulas.anio_lectivo(anio_calendario,estado) values (2027,'HABILITADO') returning id_anio_lectivo",Long.class);
   long matter=db.queryForObject("insert into aulas.materia(nombre,nombre_normalizado) values ('Consulta','consulta') returning id_materia",Long.class);
   course=db.queryForObject("insert into aulas.curso(id_materia,comision,id_anio_lectivo) values (?,'A',?) returning id_curso",Long.class,matter,year);
   reservation=db.queryForObject("insert into aulas.reserva(registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula) values (?,?,'D-01','Laura','Gómez','private@test.local',30,'General') returning id_reserva",Long.class,actor,course);
   db.update("insert into aulas.reserva_esporadica values (?)",reservation);
   for(int i=0;i<6;i++) {
    long room=db.queryForObject("insert into aulas.aula(identificador,tipo,capacidad,estado,ubicacion,piso,pizarron,ventiladores,aire) values (?,'General',40,'Habilitada','A',0,'Tiza',false,false) returning id_aula",Long.class,"R"+i);
    db.update("insert into aulas.historial_aula(id_aula,desde,tipo,estado,baja) values (?,'2027-01-01T00:00:00Z','General','Habilitada',false)",room);
    for(int slot=0;slot<20;slot++) db.update("insert into aulas.detalle_reserva(id_reserva,id_aula,fecha,hora_inicio,cantidad_modulos) values (?,?,'2027-03-01',time '07:00'+?*interval '30 minutes',1)",reservation,room,slot);
   }
   db.update("update aulas.detalle_reserva set estado='CANCELADA',motivo_cancelacion='Ensayo',cancelado_por=?,cancelado_en=now() where id_detalle=(select min(id_detalle) from aulas.detalle_reserva)",actor);
  });
 }
 @Test void pagesFilterBeforeCountingAndKeepStableIdentity() {
  var date=LocalDate.parse("2027-03-01");
  for(int size:List.of(20,50,100)) {
   var ids=new ArrayList<String>();
   for(int page=0;page<(119+size-1)/size;page++) {
    var result=queries.listing("day",date,null,null,"","","active",page,size);
    assertThat(result.total()).isEqualTo(119);ids.addAll(result.rows().stream().map(ConsultationQueries.Row::id).toList());
   }
   assertThat(ids).hasSize(119).doesNotHaveDuplicates();
  }
  assertThat(queries.listing("day",date,null,null,"R0","General","all",0,20).total()).isEqualTo(20);
  assertThat(queries.listing("day",date,null,null,"","","cancelled",0,20).total()).isEqualTo(1);
  assertThat(queries.listing("course",null,course,2027,"","","all",0,100).total()).isEqualTo(120);
  assertThatThrownBy(()->queries.listing("course",null,course,2026,"","","all",0,20)).hasMessageContaining("filtros");
  assertThat(queries.agenda(date,"week","","").rows()).hasSize(119);
 }
 @Test void effectiveDestinationAndHistoricalTypeAreUsed() {
  db.update("update aulas.detalle_reserva set fecha_original=fecha,fecha='2027-03-02' where id_detalle=(select max(id_detalle) from aulas.detalle_reserva)");
  assertThat(queries.agenda(LocalDate.parse("2027-03-01"),"day","","").total()).isEqualTo(118);
  assertThat(queries.agenda(LocalDate.parse("2027-03-02"),"day","","").total()).isEqualTo(1);
  db.update("update aulas.historial_aula set hasta='2027-04-01T00:00:00Z'");
  db.update("insert into aulas.historial_aula(id_aula,desde,tipo,estado,baja) select id_aula,'2027-04-01T00:00:00Z','Laboratorio','Inhabilitada',true from aulas.aula");
  assertThat(queries.agenda(LocalDate.parse("2027-03-01"),"day","","General").total()).isEqualTo(118);
  assertThat(queries.agenda(LocalDate.parse("2027-03-01"),"day","","Laboratorio").total()).isZero();
 }
 @Test void apiRequiresSessionAndNeverLeaksPrivateData() throws Exception {
  mvc.perform(get("/api/consultas/agenda?date=2027-03-01")).andExpect(status().isUnauthorized());
  for(String role:List.of("DOCENTE","BEDEL","ADMINISTRADOR")) {
   new TransactionTemplate(manager).executeWithoutResult(tx->{
    db.update("delete from aulas.docente where id_usuario=?",actor);db.update("delete from aulas.bedel where id_usuario=?",actor);db.update("delete from aulas.administrador where id_usuario=?",actor);
    db.update("update aulas.usuario set rol=? where id_usuario=?",role,actor);
    db.update("insert into aulas."+(role.equals("DOCENTE")?"docente":role.equals("BEDEL")?"bedel":"administrador")+" values (?)",actor);
   });
   for(String path:List.of("/api/consultas/agenda?date=2027-03-01","/api/consultas/listado?date=2027-03-01","/api/consultas/listado?mode=course&courseId="+course+"&year=2027")) {
    var body=mvc.perform(get(path).with(jwt().jwt(j->j.subject(auth.toString())))).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(119)).andReturn().getResponse().getContentAsString();
    assertThat(body).doesNotContain("private@test.local","teacherEmail","registrant","changes","cancelado_por");
   }
  }
  mvc.perform(get("/api/consultas/listado?date=2027-03-01&size=7").with(jwt().jwt(j->j.subject(auth.toString())))).andExpect(status().isBadRequest());
  mvc.perform(get("/api/consultas/listado?date=bad").with(jwt().jwt(j->j.subject(auth.toString())))).andExpect(status().isBadRequest());
 }
}
