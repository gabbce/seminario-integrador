package ar.edu.aulas;
import ar.edu.aulas.rooms.RoomsService;
import ar.edu.aulas.api.DomainError;
import java.util.*;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
@SpringBootTest @Testcontainers
class RoomsTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p){p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db;@Autowired PlatformTransactionManager manager;@Autowired RoomsService rooms;
 long actor(String role){return new TransactionTemplate(manager).execute(tx->{long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'QA','Prueba',?) returning id_usuario",Long.class,UUID.randomUUID(),UUID.randomUUID()+"@demo.local",role);db.update("insert into aulas."+(role.equals("BEDEL")?"bedel":"docente")+"(id_usuario) values (?)",id);return id;});}
 RoomsService.Room room(String id,Long version,String type,String state){return new RoomsService.Room(null,id,version,type,30,state,"Edificio A",-1,"Fibrón",type.equals("Multimedios")?List.of("fans","projector"):List.of("fans"),type.equals("Laboratorio")?5:null,null);}
 @Test void subtypeHistoryVersionAndSoftDeletionStayConsistent(){
  long actor=actor("BEDEL");var first=rooms.save(actor,null,room("QA-"+UUID.randomUUID(),null,"General","Habilitada"));long key=Long.parseLong(first.internalId());
  var second=rooms.save(actor,key,room(first.id(),first.version(),"Laboratorio","Mantenimiento"));assertThat(second.history()).hasSize(2);assertThat(second.computers()).isEqualTo(5);assertThat(second.capacity()).isEqualTo(30);
  assertThatThrownBy(()->rooms.save(actor,key,room(first.id(),first.version(),"General","Habilitada"))).isInstanceOf(DomainError.class);
  var deleted=rooms.save(actor,key,room(first.id(),second.version(),"Laboratorio","Baja"));assertThat(deleted.history()).hasSize(3);
  assertThatThrownBy(()->rooms.save(actor,key,room(first.id(),deleted.version(),"General","Habilitada"))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->rooms.save(actor,null,room(first.id(),null,"General","Habilitada"))).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
  assertThat(rooms.list(first.id(),"","Baja","","",0,"id",false,1,20).total()).isEqualTo(1);
  assertThat(rooms.list(first.id(),"","","","",0,"id",false,1,20).total()).isZero();
  assertThat(db.queryForObject("select count(*) from aulas.historial_aula where id_aula=? and hasta is null",Long.class,key)).isEqualTo(1);
 }
 @Test void filtersAndPermissionsAreServerControlled(){
  long bedel=actor("BEDEL"),teacher=actor("DOCENTE");String id="Filtros-"+UUID.randomUUID();
  rooms.save(bedel,null,room(id,null,"Multimedios","Habilitada"));
  assertThat(rooms.list(id,"Multimedios","","Fibrón","projector",30,"capacity",true,1,20).total()).isEqualTo(1);
  assertThat(rooms.list(id,"","","","",31,"id",false,1,20).total()).isZero();
  assertThatThrownBy(()->rooms.save(teacher,null,room("prohibida",null,"General","Habilitada"))).isInstanceOf(DomainError.class);
 }
 @Test void batchHistoriesKeepEachRoomChronologyAcrossDetailListAndReferences() {
  long bedel=actor("BEDEL");String prefix="Historial-"+UUID.randomUUID();
  var first=rooms.save(bedel,null,room(prefix+"-A",null,"General","Habilitada"));
  var second=rooms.save(bedel,null,room(prefix+"-B",null,"Multimedios","Inhabilitada"));
  long firstId=Long.parseLong(first.internalId()),secondId=Long.parseLong(second.internalId());
  first=rooms.save(bedel,firstId,room(first.id(),first.version(),"Laboratorio","Mantenimiento"));
  second=rooms.save(bedel,secondId,room(second.id(),second.version(),"Multimedios","Habilitada"));
  first=rooms.save(bedel,firstId,room(first.id(),first.version(),"Laboratorio","Habilitada"));
  assertThat(first.history()).extracting(RoomsService.History::state).containsExactly("Habilitada","Mantenimiento","Habilitada");
  assertThat(second.history()).extracting(RoomsService.History::state).containsExactly("Inhabilitada","Habilitada");
  var listed=rooms.list(prefix,"","","","",0,"id",false,1,20).items();
  assertThat(listed).containsExactly(first,second);
  assertThat(rooms.references().stream().filter(r->r.id().startsWith(prefix)).toList()).containsExactly(first,second);
  assertThat(rooms.get(firstId)).isEqualTo(first);assertThat(rooms.get(secondId)).isEqualTo(second);
  assertThat(rooms.list(prefix+"-missing","","","","",0,"id",false,1,20).items()).isEmpty();
 }

}
