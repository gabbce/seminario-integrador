package ar.edu.aulas.accounts;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class AccountProvisioner {
    private final JdbcTemplate db;
    private final TransactionTemplate transactions;
    private final AuthAdmin auth;
    public AccountProvisioner(JdbcTemplate db, org.springframework.transaction.PlatformTransactionManager manager, AuthAdmin auth) {
        this.db=db; this.transactions=new TransactionTemplate(manager); this.auth=auth;
    }
    record Operation(UUID id, AccountSpec account, UUID authId, boolean completed) {}

    private Operation operation(String email, boolean lock) {
        return db.queryForObject("select * from aulas.preparacion_cuenta where email=?"+(lock?" for update":""),(r,n)->
            new Operation(r.getObject("id",UUID.class), new AccountSpec(r.getString("email"),r.getString("nombre"),
                r.getString("apellido"),r.getString("rol"),r.getBoolean("activo")),r.getObject("auth_id",UUID.class),r.getBoolean("completada")),email);
    }
    public UUID prepare(AccountSpec desired, String password) { return prepare(desired,password,null,id->{}); }
    public UUID prepare(AccountSpec desired,String password,UUID requestId,java.util.function.LongConsumer completedProfile) {
        if (password == null || password.isBlank()) throw new IllegalArgumentException("Falta la contraseña de preparación");
        // Persist intent before HTTP. Concurrent commands share the same operation UUID.
        var op=transactions.execute(status -> {
            db.update("""
                insert into aulas.preparacion_cuenta(id,email,nombre,apellido,rol,activo)
                values (?,?,?,?,?,?) on conflict(email) do nothing
                """,requestId==null?UUID.randomUUID():requestId,desired.email(),desired.nombre(),desired.apellido(),desired.rol(),desired.activo());
            return operation(desired.email(),false);
        });
        if (op == null || (requestId!=null && !requestId.equals(op.id())) || !op.account().equals(desired)) throw new IllegalStateException("Existe una preparación incompatible; no se modificó la cuenta");
        // Network calls hold no JDBC transaction/connection. Auth enforces email uniqueness.
        var identity=op.authId()==null ? auth.findByEmail(desired.email()) : auth.findById(op.authId());
        if ((op.completed() || op.authId()!=null) && identity.isEmpty()) throw new IllegalStateException("La identidad preparada ya no existe; requiere revisión");
        var user=identity.orElseGet(()->auth.create(desired,password,op.id()));
        if (!op.id().toString().equals(user.operationId()) || !desired.email().equalsIgnoreCase(user.email())
            || (op.authId()!=null && !op.authId().equals(user.id())))
            throw new IllegalStateException("Identidad existente ajena o incompatible; no se vinculó ni modificó");
        // This UUID must survive a later profile rollback.
        transactions.executeWithoutResult(status -> {
            var current=operation(desired.email(),true);
            if (current.authId()!=null && !current.authId().equals(user.id())) throw new IllegalStateException("La referencia Auth cambió; requiere revisión");
            db.update("update aulas.preparacion_cuenta set auth_id=? where id=?",user.id(),op.id());
        });
        return transactions.execute(status -> {
            var current=operation(desired.email(),true);
            if (current.completed()) {
                Integer matches=db.queryForObject("""
                    select count(*) from aulas.usuario where supabase_auth_id=? and lower(btrim(email))=?
                    and nombre=? and apellido=? and rol=? and activo=?
                    """,Integer.class,user.id(),desired.email(),desired.nombre(),desired.apellido(),desired.rol(),desired.activo());
                if (matches == null || matches != 1) throw new IllegalStateException("El perfil cambió; la preparación no lo sobrescribe");
                return user.id();
            }
            Long id=db.queryForObject("""
                insert into aulas.usuario(supabase_auth_id,email,nombre,apellido,rol,activo)
                values (?,?,?,?,?,?) returning id_usuario
                """,Long.class,user.id(),desired.email(),desired.nombre(),desired.apellido(),desired.rol(),desired.activo());
            String table=switch(desired.rol()) { case "ADMINISTRADOR"->"administrador"; case "BEDEL"->"bedel"; case "DOCENTE"->"docente"; default->throw new IllegalArgumentException(); };
            db.update("insert into aulas."+table+"(id_usuario) values (?)",id);
            completedProfile.accept(id);
            db.update("update aulas.preparacion_cuenta set completada=true where id=?",op.id());
            return user.id();
        });
    }
}
