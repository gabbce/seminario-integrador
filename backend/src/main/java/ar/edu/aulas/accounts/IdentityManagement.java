package ar.edu.aulas.accounts;

import ar.edu.aulas.api.DomainError;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@Service
public class IdentityManagement {
    public record Create(UUID operationId,String name,String surname,String email,String role,Boolean active,String shift,String staffId,String password,String confirmation) {}
    public record Email(UUID operationId,Long version,String email) {}
    public record Password(UUID operationId,Long version,String password,String confirmation) {}
    record Operation(UUID id,String type,Long userId,String state) {}
    private final JdbcTemplate db;
    private final TransactionTemplate tx;
    private final AccountManagement accounts;
    private final AccountProvisioner provisioner;
    private final AuthAdmin auth;
    private final ObjectMapper json;
    public IdentityManagement(JdbcTemplate db,org.springframework.transaction.PlatformTransactionManager manager,AccountManagement accounts,AccountProvisioner provisioner,AuthAdmin auth,ObjectMapper json) {
        this.db=db;this.tx=new TransactionTemplate(manager);this.accounts=accounts;this.provisioner=provisioner;this.auth=auth;this.json=json;
    }
    private void password(String value,String confirmation) {if(value==null || value.isBlank() || !value.equals(confirmation)) throw DomainError.invalid("Completá la contraseña y su confirmación; las contraseñas no coinciden.");}
    private Operation get(UUID id) {return db.queryForObject("select * from aulas.operacion_identidad where id=?",(r,n)->new Operation(id,r.getString("tipo"),(Long)r.getObject("usuario_id"),r.getString("estado")),id);}
    private Operation prepare(long actor,UUID id,String type,Long target,Long version,Map<String,Object> request) {
        if(id==null || (target!=null && version==null)) throw DomainError.invalid("Faltan identificador de operación o versión.");
        return tx.execute(status->{
            accounts.lockAndAuthorize(actor);
            String body=json.writeValueAsString(request);
            if(db.queryForObject("select count(*) from aulas.operacion_identidad where id=?",Long.class,id)>0) {
                if(db.queryForObject("select count(*) from aulas.operacion_identidad where id=? and actor=? and tipo=? and solicitud=?::jsonb",Long.class,id,actor,type,body)!=1)
                    throw DomainError.conflict("El identificador de operación corresponde a otros datos.");
                return get(id);
            }
            if(target!=null && accounts.get(target).version()!=version) throw DomainError.conflict("La cuenta cambió. Volvé a abrirla.");
            db.update("insert into aulas.operacion_identidad(id,actor,tipo,usuario_id,solicitud) values (?,?,?,?,?::jsonb)",id,actor,type,target,body);
            return get(id);
        });
    }
    private UUID authId(long user) {return db.queryForObject("select supabase_auth_id from aulas.usuario where id_usuario=?",UUID.class,user);}
    private void state(UUID id,String state) {db.update("update aulas.operacion_identidad set estado=? where id=? and estado<>'COMPLETA'",state,id);}
    private boolean claim(UUID id) {return db.update("update aulas.operacion_identidad set estado='ENVIADA' where id=? and estado='PREPARADA'",id)==1;}
    public AccountManagement.User create(long actor,Create request) {
        password(request.password(),request.confirmation());
        if(request.active()==null) throw DomainError.invalid("Seleccioná estado.");
        AccountSpec desired;
        try {desired=new AccountSpec(request.email(),request.name(),request.surname(),AccountManagement.role(request.role()),request.active());}
        catch(IllegalArgumentException e){throw DomainError.invalid("Completá los datos de cuenta válidos.");}
        String shift=request.shift()==null?"":request.shift().strip().toUpperCase(Locale.ROOT), staff=request.staffId()==null?"":request.staffId().strip();
        if(desired.rol().equals("BEDEL") && !shift.isEmpty() && !List.of("MAÑANA","TARDE","NOCHE").contains(shift)) throw DomainError.invalid("Seleccioná un turno válido.");
        var body=Map.<String,Object>of("name",desired.nombre(),"surname",desired.apellido(),"email",desired.email(),"role",desired.rol(),"active",desired.activo(),"shift",shift,"staffId",staff);
        var operation=prepare(actor,request.operationId(),"ALTA",null,null,body);
        if(operation.state().equals("COMPLETA")) return accounts.get(operation.userId());
        if(db.queryForObject("select count(*) from aulas.usuario where lower(email)=?",Long.class,desired.email())>0) throw DomainError.conflict("El correo ya pertenece a otra cuenta.");
        try {
            var existing=auth.findByEmail(desired.email());
            if(existing.isPresent() && !operation.id().toString().equals(existing.get().operationId()))
                throw DomainError.conflict("El correo ya pertenece a otra cuenta en Auth.");
            UUID identity=provisioner.prepare(desired,request.password(),operation.id(),id->{
                accounts.lockAndAuthorize(actor);
                if(desired.rol().equals("BEDEL")) db.update("update aulas.bedel set turno=? where id_usuario=?",shift.isEmpty()?null:shift,id);
                if(desired.rol().equals("DOCENTE")) db.update("update aulas.docente set legajo=? where id_usuario=?",staff.isEmpty()?null:staff,id);
                accounts.audit(actor,id,"CREAR_CUENTA",accounts.get(id).toString());
                db.update("update aulas.operacion_identidad set estado='COMPLETA',usuario_id=? where id=?",id,operation.id());
            });
            return accounts.get(db.queryForObject("select id_usuario from aulas.usuario where supabase_auth_id=?",Long.class,identity));
        } catch(DomainError e){if(e.status==409)state(operation.id(),"RECHAZADA");throw e;}
        catch(RuntimeException e){throw new DomainError(503,"IDENTITY_INCOMPLETE","El alta no está completa. Reintentá con los mismos datos para comprobar y completar la operación.");}
    }
    public AccountManagement.User email(long actor,long target,Email request) {
        String email=request.email()==null?"":request.email().strip().toLowerCase(Locale.ROOT);
        if(!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")) throw DomainError.invalid("Ingresá un correo válido.");
        var operation=prepare(actor,request.operationId(),"EMAIL",target,request.version(),Map.of("user",target,"version",request.version()==null?-1:request.version(),"email",email));
        if(operation.state().equals("COMPLETA")) return accounts.get(target);
        if(operation.state().equals("RECHAZADA")) throw DomainError.invalid("El cambio fue rechazado; iniciá un nuevo intento.");
        try {
            UUID identity=authId(target);
            var remote=auth.findById(identity).orElseThrow(()->new IllegalStateException("Identidad ausente"));
            if(!email.equalsIgnoreCase(remote.email())) {
                // Re-read Auth before retrying the same desired email; the pending operation
                // excludes competing identity changes. Repeating this assignment is idempotent.
                db.update("update aulas.operacion_identidad set estado='ENVIADA' where id=? and estado in ('PREPARADA','ENVIADA')",operation.id());
                remote=auth.changeEmail(identity,email);
            }
            if(!identity.equals(remote.id()) || !email.equalsIgnoreCase(remote.email())) throw new IllegalStateException();
            state(operation.id(),"CONFIRMADA");
            return tx.execute(status->{
                accounts.lockAndAuthorize(actor);
                if(get(operation.id()).state().equals("COMPLETA")) return accounts.get(target);
                var before=accounts.get(target);
                db.update("update aulas.usuario set email=?,version=version+1 where id_usuario=?",email,target);
                accounts.audit(actor,target,"CAMBIAR_EMAIL",before.email()+" -> "+email);
                state(operation.id(),"COMPLETA");return accounts.get(target);
            });
        } catch(DomainError e){if(e.status==400)state(operation.id(),"RECHAZADA");throw e;}
        catch(RuntimeException e){throw new DomainError(503,"IDENTITY_INCOMPLETE","Auth y el perfil pueden haber quedado desincronizados. Reintentá para comprobar el correo vigente y completar el cambio.");}
    }
    public void password(long actor,long target,Password request) {
        password(request.password(),request.confirmation());
        var operation=prepare(actor,request.operationId(),"PASSWORD",target,request.version(),Map.of("user",target,"version",request.version()==null?-1:request.version()));
        if(operation.state().equals("COMPLETA")) return;
        if(operation.state().equals("RECHAZADA")) throw DomainError.conflict("El intento anterior no se confirmó. Podés iniciar otro cambio explícito.");
        if(operation.state().equals("CONFIRMADA")) {completePassword(actor,target,operation.id());return;}
        if(!claim(operation.id())) throw new DomainError(503,"IDENTITY_INCOMPLETE","El resultado de la contraseña es incierto. No se repetirá automáticamente.");
        try {auth.changePassword(authId(target),request.password());}
        catch(DomainError e){state(operation.id(),"RECHAZADA");throw e;}
        catch(RuntimeException e){state(operation.id(),"RECHAZADA");throw new DomainError(503,"PASSWORD_UNCERTAIN","No se confirmó la respuesta de Auth; la contraseña puede haber cambiado. Podés establecerla nuevamente mediante otro intento explícito.");}
        state(operation.id(),"CONFIRMADA");
        completePassword(actor,target,operation.id());
    }
    private void completePassword(long actor,long target,UUID operation) {
        try {tx.executeWithoutResult(status->{accounts.lockAndAuthorize(actor);if(get(operation).state().equals("COMPLETA"))return;accounts.audit(actor,target,"ESTABLECER_PASSWORD","Auth confirmó el cambio; sin registrar contraseña.");state(operation,"COMPLETA");});}
        catch(RuntimeException e){throw new DomainError(503,"AUDIT_INCOMPLETE","Auth confirmó la contraseña, pero falta completar su auditoría. Reintentá para registrar el resultado sin cambiarla otra vez.");}
    }
}
