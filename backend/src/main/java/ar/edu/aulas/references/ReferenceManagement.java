package ar.edu.aulas.references;

import ar.edu.aulas.api.DomainError;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReferenceManagement {
    public record Course(String id,long code,String subject,String commission,int year) {}
    public record Create(String subject,String commission,Integer year) {}
    private final JdbcTemplate db;
    public ReferenceManagement(JdbcTemplate db) {this.db=db;}
    private static final String SELECT="select c.id_curso,m.id_materia,m.nombre,c.comision,a.anio_calendario from aulas.curso c join aulas.materia m using(id_materia) join aulas.anio_lectivo a using(id_anio_lectivo)";
    private static String clean(String text) {return text==null?"":text.replaceAll("(?U)\\s+"," ").strip();}
    private static String normalized(String text) {return clean(text).toUpperCase(Locale.ROOT);}
    private Course map(java.sql.ResultSet rs,int row) throws java.sql.SQLException {return new Course(rs.getString("id_curso"),rs.getLong("id_materia"),rs.getString("nombre"),rs.getString("comision"),rs.getInt("anio_calendario"));}
    public List<Course> list(int year,String query) {
        if(year<1 || year>9999) throw DomainError.invalid("Indicá un año válido.");
        if(db.queryForObject("select count(*) from aulas.anio_lectivo where anio_calendario=?",Long.class,year)==0) throw new DomainError(404,"NOT_FOUND","El año no existe.");
        String search=normalized(query);
        return db.query(SELECT+" where a.anio_calendario=? and (strpos(upper(m.nombre || ' ' || c.comision),?)>0 or strpos(lpad(m.id_materia::text,greatest(3,length(m.id_materia::text)),'0') || '-' || c.comision || '-' || a.anio_calendario::text,?)>0) order by m.nombre,c.comision,c.id_curso",this::map,year,search,search);
    }
    @Transactional public Course create(long actor,Create request) {
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);
        if(!Boolean.TRUE.equals(db.queryForObject("select activo and rol in ('ADMINISTRADOR','BEDEL') from aulas.usuario where id_usuario=?",Boolean.class,actor))) throw new DomainError(403,"FORBIDDEN","Solo Administrador o Bedel pueden registrar cursos.");
        if(request==null)throw DomainError.invalid("Completá materia, comisión y año.");
        String subject=clean(request.subject()),commission=normalized(request.commission());
        if(subject.isBlank() || commission.isBlank() || request.year()==null || request.year()<1 || request.year()>9999) throw DomainError.invalid("Completá materia, comisión y año.");
        // Account permission lock precedes year lock, matching CalendarManagement.
        var years=db.queryForList("select id_anio_lectivo,estado from aulas.anio_lectivo where anio_calendario=? for update",request.year());
        if(years.isEmpty()) throw new DomainError(404,"NOT_FOUND","El año no existe.");
        if(!years.getFirst().get("estado").equals("HABILITADO")) throw DomainError.conflict("El año debe estar habilitado para registrar cursos desde una reserva.");
        long yearId=((Number)years.getFirst().get("id_anio_lectivo")).longValue();
        db.update("insert into aulas.materia(nombre,nombre_normalizado) values (?,?) on conflict(nombre_normalizado) do nothing",subject,normalized(subject));
        long matter=db.queryForObject("select id_materia from aulas.materia where nombre_normalizado=?",Long.class,normalized(subject));
        var inserted=db.queryForList("insert into aulas.curso(id_materia,id_anio_lectivo,comision) values (?,?,?) on conflict(id_materia,comision,id_anio_lectivo) do nothing returning id_curso",Long.class,matter,yearId,commission);
        Course saved=db.query(SELECT+" where c.id_materia=? and c.id_anio_lectivo=? and c.comision=?",this::map,matter,yearId,commission).getFirst();
        if(!inserted.isEmpty()) db.update("insert into aulas.evento_auditoria(actor,operacion,entidad,entidad_id,resultado,detalle) values (?,'CREAR_CURSO','CURSO',?,'CONFIRMADO',?)",actor,Long.parseLong(saved.id()),saved.toString());
        return saved;
    }
    public record Teacher(String id,String name,String surname,String email) {}
    private static final List<Teacher> TEACHERS=List.of(
        new Teacher("D-01","Laura","Gómez","laura.gomez@example.test"),
        new Teacher("D-02","Ana","Ruiz","ana.ruiz@example.test"),
        new Teacher("D-03","Martín","Díaz","martin.diaz@example.test"),
        new Teacher("D-04","Sofía","Paz","sofia.paz@example.test"),
        new Teacher("D-05","Diego","Luna","diego.luna@example.test")
    );
    public Teacher teacher(String id) {return TEACHERS.stream().filter(t->t.id().equals(id)).findFirst().orElseThrow(()->DomainError.invalid("Seleccioná un docente de la lista."));}
    public List<Map<String,String>> teachers(boolean operational) {return TEACHERS.stream().map(teacher->operational?Map.of("id",teacher.id(),"name",teacher.name()+" "+teacher.surname(),"email",teacher.email()):Map.of("id",teacher.id(),"name",teacher.name()+" "+teacher.surname())).toList();}
}
