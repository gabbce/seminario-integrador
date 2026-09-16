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
 @BeforeEach void clean(){db.execute("truncate aulas.evento_auditoria,aulas.preparacion_cuenta,aulas.operacion_identidad,aulas.usuario cascade");}
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

 @Autowired ar.edu.aulas.accounts.IdentityManagement identities;
 @org.springframework.test.context.bean.override.mockito.MockitoBean ar.edu.aulas.accounts.AuthAdmin auth;
 @Test void identityCreationReplayEmailRecoveryAndPasswordAreControlled() {
  long admin=account("ADMINISTRADOR");
  var remote=new java.util.concurrent.atomic.AtomicReference<ar.edu.aulas.accounts.AuthAdmin.Identity>();
  org.mockito.Mockito.when(auth.findByEmail(org.mockito.ArgumentMatchers.anyString())).thenAnswer(i->java.util.Optional.ofNullable(remote.get()));
  org.mockito.Mockito.when(auth.findById(org.mockito.ArgumentMatchers.any())).thenAnswer(i->java.util.Optional.ofNullable(remote.get()));
  org.mockito.Mockito.when(auth.create(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.any())).thenAnswer(i->{
   assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
   var spec=(ar.edu.aulas.accounts.AccountSpec)i.getArgument(0);
   remote.set(new ar.edu.aulas.accounts.AuthAdmin.Identity(UUID.randomUUID(),spec.email(),i.getArgument(2).toString()));return remote.get();
  });
  var request=new ar.edu.aulas.accounts.IdentityManagement.Create(UUID.randomUUID(),"Cuenta","Prueba","nueva@test.local","Bedel",true,"TARDE",null,"ClavePrueba!","ClavePrueba!");
  var created=identities.create(admin,request);long target=Long.parseLong(created.id());
  assertThat(created.shift()).isEqualTo("TARDE");assertThat(identities.create(admin,request).id()).isEqualTo(created.id());
  org.mockito.Mockito.verify(auth,org.mockito.Mockito.times(1)).create(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.any());
  org.mockito.Mockito.when(auth.changeEmail(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.anyString())).thenAnswer(i->{remote.set(new ar.edu.aulas.accounts.AuthAdmin.Identity(remote.get().id(),i.getArgument(1),remote.get().operationId()));throw new IllegalStateException("Response lost");});
  var email=new ar.edu.aulas.accounts.IdentityManagement.Email(UUID.randomUUID(),created.version(),"nuevo@test.local");
  assertThatThrownBy(()->identities.email(admin,target,email)).isInstanceOf(DomainError.class);
  assertThatThrownBy(()->accounts.edit(admin,target,edit(created.version(),"Bedel",true))).isInstanceOf(DomainError.class);
  var changed=identities.email(admin,target,email);assertThat(changed.email()).isEqualTo("nuevo@test.local");assertThat(changed.id()).isEqualTo(created.id());
  org.mockito.Mockito.verify(auth,org.mockito.Mockito.times(1)).changeEmail(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.anyString());
  var pass=new ar.edu.aulas.accounts.IdentityManagement.Password(UUID.randomUUID(),changed.version(),"NuevaClave!","NuevaClave!");
  identities.password(admin,target,pass);identities.password(admin,target,pass);
  org.mockito.Mockito.verify(auth,org.mockito.Mockito.times(1)).changePassword(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.anyString());
  assertThat(db.queryForObject("select string_agg(solicitud::text,' ') from aulas.operacion_identidad",String.class)).doesNotContain("ClavePrueba","NuevaClave");
 }
 @Test void passwordTimeoutDoesNotRetryAutomaticallyOrClaimFailureToChange() {
  long admin=account("ADMINISTRADOR"),target=account("BEDEL");
  org.mockito.Mockito.doThrow(new IllegalStateException()).when(auth).changePassword(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.anyString());
  var pass=new ar.edu.aulas.accounts.IdentityManagement.Password(UUID.randomUUID(),0L,"Clave!","Clave!");
  assertThatThrownBy(()->identities.password(admin,target,pass)).isInstanceOf(DomainError.class).hasMessageContaining("puede haber cambiado");
  assertThatThrownBy(()->identities.password(admin,target,pass)).isInstanceOf(DomainError.class);
  org.mockito.Mockito.verify(auth,org.mockito.Mockito.times(1)).changePassword(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.anyString());
 }

 @Test void foreignIdentityIsConflictAndUnappliedEmailCanRecover() {
  long admin=account("ADMINISTRADOR"),target=account("BEDEL");
  org.mockito.Mockito.when(auth.findByEmail("ocupado@test.local")).thenReturn(java.util.Optional.of(new ar.edu.aulas.accounts.AuthAdmin.Identity(UUID.randomUUID(),"ocupado@test.local","foreign")));
  var create=new ar.edu.aulas.accounts.IdentityManagement.Create(UUID.randomUUID(),"N","A","ocupado@test.local","Bedel",true,null,null,"Clave!","Clave!");
  assertThatThrownBy(()->identities.create(admin,create)).isInstanceOf(DomainError.class).hasMessageContaining("ya pertenece");
  UUID authId=db.queryForObject("select supabase_auth_id from aulas.usuario where id_usuario=?",UUID.class,target);
  org.mockito.Mockito.when(auth.findById(authId)).thenReturn(java.util.Optional.of(new ar.edu.aulas.accounts.AuthAdmin.Identity(authId,"anterior@test.local",null)));
  org.mockito.Mockito.when(auth.changeEmail(authId,"nuevo@test.local")).thenThrow(new IllegalStateException()).thenReturn(new ar.edu.aulas.accounts.AuthAdmin.Identity(authId,"nuevo@test.local",null));
  var email=new ar.edu.aulas.accounts.IdentityManagement.Email(UUID.randomUUID(),0L,"nuevo@test.local");
  assertThatThrownBy(()->identities.email(admin,target,email)).isInstanceOf(DomainError.class);
  assertThat(identities.email(admin,target,email).email()).isEqualTo("nuevo@test.local");
 }
}
