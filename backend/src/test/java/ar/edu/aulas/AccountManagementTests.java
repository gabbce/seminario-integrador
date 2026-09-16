package ar.edu.aulas;
import ar.edu.aulas.accounts.AccountManagement;
import ar.edu.aulas.api.DomainError;
import java.util.UUID;
import java.util.concurrent.*;
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
class AccountManagementTests {
 @Container static final PostgreSQLContainer postgres=new PostgreSQLContainer("postgres:17.6-alpine");
 @DynamicPropertySource static void props(DynamicPropertyRegistry p) {p.add("spring.datasource.url",postgres::getJdbcUrl);p.add("spring.datasource.username",postgres::getUsername);p.add("spring.datasource.password",postgres::getPassword);}
 @Autowired JdbcTemplate db; @Autowired PlatformTransactionManager manager; @Autowired AccountManagement accounts;
 @BeforeEach void clean(){db.execute("truncate aulas.evento_auditoria,aulas.usuario cascade");}
 long account(String role) {return new TransactionTemplate(manager).execute(tx->{
   long id=db.queryForObject("insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol) values (?,?,'Nombre','Apellido',?) returning id_usuario",Long.class,UUID.randomUUID(),UUID.randomUUID()+"@test.local",role);
   db.update("insert into aulas."+(role.equals("ADMINISTRADOR")?"administrador":role.equals("BEDEL")?"bedel":"docente")+"(id_usuario) values (?)",id);return id;
 });}
 AccountManagement.Edit edit(long version,String role,boolean active){return new AccountManagement.Edit(version,"Nuevo","Apellido",role,active,"TARDE","L-1");}
 @Test void editsPersistProfileAndAuditAndRejectStaleChanges(){
  long admin=account("ADMINISTRADOR"),target=account("BEDEL");
  var saved=accounts.edit(admin,target,edit(0,"Docente",false));
  assertThat(saved.role()).isEqualTo("Docente");assertThat(saved.active()).isFalse();assertThat(saved.staffId()).isEqualTo("L-1");assertThat(saved.shift()).isNull();
  assertThat(db.queryForObject("select count(*) from aulas.bedel where id_usuario=?",Long.class,target)).isZero();assertThat(accounts.get(target).version()).isEqualTo(1);
  assertThat(db.queryForObject("select detalle from aulas.evento_auditoria limit 1",String.class)).contains("Nombre","Nuevo","L-1");
  assertThatThrownBy(()->accounts.edit(admin,target,edit(0,"Bedel",true))).isInstanceOf(DomainError.class);
  assertThat(db.queryForObject("select count(*) from aulas.evento_auditoria",Long.class)).isEqualTo(1);assertThat(accounts.list("Nuevo","Docente","inactive","name",1,20).total()).isEqualTo(1);
 }
 @Test void onlyActiveAdminCanWriteAndLastAdminCannotBeRemoved(){
  long admin=account("ADMINISTRADOR"),bedel=account("BEDEL");
  assertThatThrownBy(()->accounts.edit(bedel,admin,edit(0,"Administrador",true))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->accounts.edit(admin,admin,edit(0,"Bedel",true))).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->accounts.edit(admin,admin,edit(0,"Administrador",false))).isInstanceOf(DomainError.class);assertThat(accounts.get(admin).version()).isZero();
 }
 @Test void concurrentAdministratorsCannotLeaveZero() throws Exception {
  long first=account("ADMINISTRADOR"),second=account("ADMINISTRADOR");var start=new CountDownLatch(1);
  try(var executor=Executors.newFixedThreadPool(2)) {
   Callable<Boolean> a=()->{start.await();try{accounts.edit(first,first,edit(0,"Bedel",true));return true;}catch(DomainError e){return false;}};
   Callable<Boolean> b=()->{start.await();try{accounts.edit(second,second,edit(0,"Bedel",true));return true;}catch(DomainError e){return false;}};
   var fa=executor.submit(a);var fb=executor.submit(b);start.countDown();assertThat((fa.get(10,TimeUnit.SECONDS)?1:0)+(fb.get(10,TimeUnit.SECONDS)?1:0)).isEqualTo(1);
  }
  assertThat(db.queryForObject("select count(*) from aulas.usuario where activo and rol='ADMINISTRADOR'",Long.class)).isEqualTo(1);
 }
}
