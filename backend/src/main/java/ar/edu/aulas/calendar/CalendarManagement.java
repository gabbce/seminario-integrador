package ar.edu.aulas.calendar;

import ar.edu.aulas.api.DomainError;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CalendarManagement {
    public record Config(String id,int year,String state,long version,Map<String,List<String>> terms,List<String> holidays,Map<String,String> descriptions) {}
    public record Create(Integer year) {}
    public record Edit(Long version,Integer year,String state,Map<String,List<String>> terms,List<String> holidays,Map<String,String> descriptions) {}
    private final JdbcTemplate db;
    private final Clock clock;
    @Autowired public CalendarManagement(JdbcTemplate db,org.springframework.beans.factory.ObjectProvider<Clock> clocks) { this(db,clocks.getIfAvailable(()->Clock.system(ZoneId.of("America/Argentina/Cordoba")))); }
    public CalendarManagement(JdbcTemplate db,Clock clock) { this.db=db;this.clock=clock.withZone(ZoneId.of("America/Argentina/Cordoba")); }
    private String state(String state) {
        if(state==null) throw DomainError.invalid("Completá el estado del año.");
        return switch(state) {case "En preparación"->"EN_PREPARACION";case "Habilitado"->"HABILITADO";case "Cerrado"->"CERRADO";default->throw DomainError.invalid("Estado de año inválido.");};
    }
    private String label(String state) {return switch(state) {case "EN_PREPARACION"->"En preparación";case "HABILITADO"->"Habilitado";default->"Cerrado";};}
    private void authorize(long actor) {
        // Same lock order as account mutations: permission cannot change during a write.
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);
        if(!Boolean.TRUE.equals(db.queryForObject("select activo and rol='ADMINISTRADOR' from aulas.usuario where id_usuario=?",Boolean.class,actor)))
            throw new DomainError(403,"FORBIDDEN","Solo un administrador activo puede gestionar el calendario.");
    }
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public List<Config> list() {return db.queryForList("select id_anio_lectivo from aulas.anio_lectivo order by anio_calendario",Long.class).stream().map(this::get).toList();}
    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Config get(long id) {
        var rows=db.queryForList("select * from aulas.anio_lectivo where id_anio_lectivo=?",id);
        if(rows.isEmpty()) throw new DomainError(404,"NOT_FOUND","El año no existe.");
        var row=rows.getFirst();
        var terms=new LinkedHashMap<String,List<String>>();terms.put("first",List.of("",""));terms.put("second",List.of("",""));
        db.queryForList("select numero,inicio,fin from aulas.cuatrimestre where id_anio_lectivo=? order by numero",id).forEach(term->terms.put(((Number)term.get("numero")).intValue()==1?"first":"second",List.of(Objects.toString(term.get("inicio"),""),Objects.toString(term.get("fin"),""))));
        var descriptions=new LinkedHashMap<String,String>();
        db.queryForList("select fecha,descripcion from aulas.feriado where id_anio_lectivo=? order by fecha",id).forEach(day->descriptions.put(day.get("fecha").toString(),day.get("descripcion").toString()));
        return new Config(Long.toString(id),((Number)row.get("anio_calendario")).intValue(),label(row.get("estado").toString()),((Number)row.get("version")).longValue(),terms,new ArrayList<>(descriptions.keySet()),descriptions);
    }
    private void year(Integer year) {if(year==null || year<1 || year>9999) throw DomainError.invalid("Completá un año entre 1 y 9999.");}
    private Config lock(long id,Long version) {
        if(version==null || version<0) throw DomainError.invalid("Completá la versión del año.");
        if(db.queryForList("select id_anio_lectivo from aulas.anio_lectivo where id_anio_lectivo=? for update",Long.class,id).isEmpty()) throw new DomainError(404,"NOT_FOUND","El año no existe.");
        Config current=get(id);
        if(current.version()!=version) throw DomainError.conflict("El calendario cambió. Volvé a cargarlo antes de guardar.");
        if(current.state().equals("Cerrado")) throw DomainError.conflict("El año está cerrado y es de solo lectura.");
        return current;
    }
    private void audit(long actor,long id,String operation,String detail) {db.update("insert into aulas.evento_auditoria(actor,operacion,entidad,entidad_id,resultado,detalle) values (?,?,'ANIO_LECTIVO',?,'CONFIRMADO',?)",actor,operation,id,detail);}
    @Transactional public Config create(long actor,Create request) {
        authorize(actor);if(request==null)throw DomainError.invalid("Completá el año.");year(request.year());
        long id=db.queryForObject("insert into aulas.anio_lectivo(anio_calendario) values (?) returning id_anio_lectivo",Long.class,request.year());
        Config saved=get(id);audit(actor,id,"CREAR_CALENDARIO",saved.toString());return saved;
    }
    private LocalDate date(String value,int year,boolean empty) {
        if(empty && "".equals(value)) return null;
        try {LocalDate parsed=LocalDate.parse(value);if(parsed.getYear()!=year || !parsed.toString().equals(value)) throw new IllegalArgumentException();return parsed;}
        catch(RuntimeException e) {throw DomainError.invalid("Las fechas deben ser válidas y pertenecer al año indicado.");}
    }
    private void validate(Edit edit,Config current) {
        year(edit.year());state(edit.state());
        if(edit.terms()==null || !edit.terms().keySet().equals(Set.of("first","second")) || edit.holidays()==null || edit.descriptions()==null) throw DomainError.invalid("Completá cuatrimestres y fechas no lectivas.");
        LocalDate previousEnd=null;
        for(String key:List.of("first","second")) {
            var range=edit.terms().get(key);
            if(range==null || range.size()!=2) throw DomainError.invalid("Cada cuatrimestre requiere inicio y fin.");
            LocalDate start=date(range.get(0),edit.year(),true),end=date(range.get(1),edit.year(),true);
            if(edit.state().equals("Habilitado") && (start==null || end==null)) throw DomainError.invalid("Para habilitar el año completá ambos cuatrimestres.");
            if(start!=null && end!=null && start.isAfter(end)) throw DomainError.invalid("El inicio del cuatrimestre debe ser anterior o igual al fin.");
            if(key.equals("second") && previousEnd!=null && ((start!=null && !previousEnd.isBefore(start)) || (end!=null && !previousEnd.isBefore(end)))) throw DomainError.invalid("Los cuatrimestres deben estar ordenados y no solaparse.");
            if(key.equals("first")) previousEnd=end==null?start:end;
        }
        var dates=new HashSet<String>();
        for(String day:edit.holidays()) {
            date(day,edit.year(),false);
            if(!dates.add(day)) throw DomainError.invalid("No se permiten fechas no lectivas duplicadas.");
            if(edit.descriptions().get(day)==null || edit.descriptions().get(day).isBlank()) throw DomainError.invalid("Completá la descripción de cada fecha no lectiva.");
        }
        if(!edit.descriptions().keySet().equals(dates)) throw DomainError.invalid("Las descripciones deben corresponder a las fechas no lectivas.");
        LocalDate today=LocalDate.now(clock);
        for(String day:current.holidays()) if(!dates.contains(day) && LocalDate.parse(day).isBefore(today)) throw DomainError.conflict("No se pueden quitar ni mover fechas no lectivas pasadas.");
        for(String day:dates) if(!current.holidays().contains(day) && LocalDate.parse(day).isBefore(today)) throw DomainError.conflict("No se pueden agregar ni mover fechas no lectivas al pasado.");
    }
    @Transactional public Config edit(long actor,long id,Edit edit) {
        authorize(actor);if(edit==null)throw DomainError.invalid("Completá el calendario.");Config current=lock(id,edit.version());validate(edit,current);
        db.update("update aulas.anio_lectivo set anio_calendario=?,estado=?,version=version+1 where id_anio_lectivo=?",edit.year(),state(edit.state()),id);
        for(int number=1;number<=2;number++) {
            var range=edit.terms().get(number==1?"first":"second");
            LocalDate start=date(range.get(0),edit.year(),true),end=date(range.get(1),edit.year(),true);
            if(start==null && end==null) db.update("delete from aulas.cuatrimestre where id_anio_lectivo=? and numero=?",id,number);
            else db.update("insert into aulas.cuatrimestre(id_anio_lectivo,numero,inicio,fin) values (?,?,?,?) on conflict(id_anio_lectivo,numero) do update set inicio=excluded.inicio,fin=excluded.fin",id,number,start,end);
        }
        for(String day:current.holidays()) if(!edit.holidays().contains(day)) db.update("delete from aulas.feriado where id_anio_lectivo=? and fecha=?",id,LocalDate.parse(day));
        for(String day:edit.holidays()) db.update("insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) values (?,?,?) on conflict(id_anio_lectivo,fecha) do update set descripcion=excluded.descripcion",id,LocalDate.parse(day),edit.descriptions().get(day).strip());
        Config saved=get(id);audit(actor,id,"EDITAR_CALENDARIO",current+" -> "+saved);return saved;
    }
    @Transactional public void delete(long actor,long id,Long version) {
        authorize(actor);Config current=lock(id,version);
        if(db.queryForObject("select count(*) from aulas.cuatrimestre where id_anio_lectivo=?",Long.class,id)>0 || !current.holidays().isEmpty()) throw DomainError.conflict("El año tiene cuatrimestres o fechas no lectivas. Quitá esas dependencias antes de eliminarlo.");
        db.update("delete from aulas.anio_lectivo where id_anio_lectivo=?",id);audit(actor,id,"ELIMINAR_CALENDARIO",current.toString());
    }
}
