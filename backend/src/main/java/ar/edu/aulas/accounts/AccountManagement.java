package ar.edu.aulas.accounts;

import ar.edu.aulas.api.DomainError;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountManagement {
    public record User(String id,long version,String name,String surname,String email,String role,boolean active,String shift,String staffId) {}
    public record Page(List<User> items,long total,int page,int size,long activeAdmins) {}
    public record Edit(Long version,String name,String surname,String role,Boolean active,String shift,String staffId) {}
    private final JdbcTemplate db;
    public AccountManagement(JdbcTemplate db) { this.db=db; }
    private static final String SELECT="select u.*,b.turno,d.legajo from aulas.usuario u left join aulas.bedel b using(id_usuario) left join aulas.docente d using(id_usuario)";
    private static String displayRole(String role) { return switch(role) {case "ADMINISTRADOR"->"Administrador";case "BEDEL"->"Bedel";default->"Docente";}; }
    public static String role(String role) {
        if(role==null) throw DomainError.invalid("Seleccioná un rol válido.");
        return switch(role) {case "Administrador"->"ADMINISTRADOR";case "Bedel"->"BEDEL";case "Docente"->"DOCENTE";default->throw DomainError.invalid("Seleccioná un rol válido.");};
    }
    private User map(java.sql.ResultSet r,int row) throws java.sql.SQLException {
        return new User(r.getString("id_usuario"),r.getLong("version"),r.getString("nombre"),r.getString("apellido"),r.getString("email"),displayRole(r.getString("rol")),r.getBoolean("activo"),r.getString("turno"),r.getString("legajo"));
    }
    public User get(long id) {
        return db.query(SELECT+" where u.id_usuario=?",this::map,id).stream().findFirst().orElseThrow(()->new DomainError(404,"NOT_FOUND","La cuenta no existe."));
    }
    public Page list(String query,String filterRole,String status,String sort,int page,int size) {
        if(page<1 || !List.of(20,50,100).contains(size) || !List.of("name","email").contains(sort) || !List.of("","active","inactive").contains(status)) throw DomainError.invalid("Filtros o paginación inválidos.");
        var args=new ArrayList<Object>();
        String where=" where true";
        if(!query.isBlank()) { where+=" and strpos(lower(u.nombre || ' ' || u.apellido || ' ' || u.email),lower(?))>0";args.add(query.strip()); }
        if(!filterRole.isBlank()) { where+=" and u.rol=?";args.add(role(filterRole)); }
        if(!status.isBlank()) {where+=" and u.activo=?";args.add(status.equals("active"));}
        long total=db.queryForObject("select count(*) from aulas.usuario u"+where,Long.class,args.toArray());
        int current=(int)Math.min(page,Math.max(1,(total+size-1)/size));
        args.add(size);args.add((current-1)*size);
        String order=sort.equals("email")?"u.email,u.id_usuario":"u.apellido,u.nombre,u.id_usuario";
        return new Page(db.query(SELECT+where+" order by "+order+" limit ? offset ?",this::map,args.toArray()),total,current,size,db.queryForObject("select count(*) from aulas.usuario where activo and rol='ADMINISTRADOR'",Long.class));
    }
    public void lockAndAuthorize(long actor) {
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);
        Boolean allowed=db.queryForObject("select activo and rol='ADMINISTRADOR' from aulas.usuario where id_usuario=?",Boolean.class,actor);
        if(!Boolean.TRUE.equals(allowed)) throw new DomainError(403,"FORBIDDEN","Solo un administrador activo puede gestionar cuentas.");
    }
    public void audit(long actor,long id,String operation,String detail) {
        db.update("insert into aulas.evento_auditoria(actor,operacion,entidad,entidad_id,resultado,detalle) values (?,?,'USUARIO',?,'CONFIRMADO',?)",actor,operation,id,detail);
    }
    @Transactional
    public User edit(long actor,long id,Edit edit) {
        if(edit.version()==null || edit.active()==null) throw DomainError.invalid("Completá versión y estado de la cuenta.");
        lockAndAuthorize(actor);
        if(db.queryForObject("select count(*) from aulas.operacion_identidad where usuario_id=? and estado in ('PREPARADA','ENVIADA','CONFIRMADA')",Long.class,id)>0)
            throw DomainError.conflict("Hay un cambio de identidad pendiente. Completalo antes de editar el perfil.");
        User current=get(id);
        if(current.version()!=edit.version().longValue()) throw DomainError.conflict("La cuenta cambió. Volvé a abrirla para revisar la versión actual.");
        String role=role(edit.role());
        if(edit.name()==null || edit.name().isBlank() || edit.surname()==null || edit.surname().isBlank()) throw DomainError.invalid("Completá nombre y apellido.");
        String shift=edit.shift()==null || edit.shift().isBlank()?null:edit.shift().strip().toUpperCase(Locale.ROOT);
        if(role.equals("BEDEL") && shift!=null && !List.of("MAÑANA","TARDE","NOCHE").contains(shift)) throw DomainError.invalid("Turno válido: MAÑANA, TARDE o NOCHE.");
        if(current.active() && current.role().equals("Administrador") && (!edit.active() || !role.equals("ADMINISTRADOR")) && db.queryForObject("select count(*) from aulas.usuario where activo and rol='ADMINISTRADOR'",Long.class)==1) throw DomainError.conflict("Debe quedar al menos un administrador activo.");
        db.update("delete from aulas.administrador where id_usuario=?",id);
        db.update("delete from aulas.bedel where id_usuario=?",id);
        db.update("delete from aulas.docente where id_usuario=?",id);
        db.update("update aulas.usuario set nombre=?,apellido=?,rol=?,activo=?,version=version+1 where id_usuario=?",edit.name().strip(),edit.surname().strip(),role,edit.active(),id);
        switch(role) {
            case "ADMINISTRADOR" -> db.update("insert into aulas.administrador(id_usuario) values (?)",id);
            case "BEDEL" -> db.update("insert into aulas.bedel(id_usuario,turno) values (?,?)",id,shift);
            case "DOCENTE" -> db.update("insert into aulas.docente(id_usuario,legajo) values (?,?)",id,edit.staffId()==null?null:edit.staffId().strip());
        }
        User saved=get(id);
        audit(actor,id,"EDITAR_CUENTA",current+" -> "+saved);
        return saved;
    }
}
