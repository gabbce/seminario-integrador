package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.references.ReferenceManagement;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PeriodicConfirmation {
    public record Selection(Integer day,String roomId,Long roomVersion,List<String> dates) {}
    public record Request(UUID operationId,PeriodicPreparation.Request proposal,String teacherId,Long calendarVersion,List<Selection> selections) {}
    private final JdbcTemplate db;
    private final PeriodicPreparation preparation;
    private final ReservationQueries queries;
    private final ReferenceManagement references;
    public PeriodicConfirmation(JdbcTemplate db,PeriodicPreparation preparation,ReservationQueries queries,ReferenceManagement references) {
        this.db=db;this.preparation=preparation;this.queries=queries;this.references=references;
    }
    private String canonical(Request r) {
        if(r==null || r.operationId()==null || r.calendarVersion()==null || r.calendarVersion()<0 || r.selections()==null) throw DomainError.invalid("Completá identidad de operación y revisión de la reserva.");
        preparation.validate(r.proposal());
        var p=r.proposal();
        if(p.courseId()==null) throw DomainError.invalid("Seleccioná un curso.");
        references.teacher(r.teacherId());
        if(p.excluded().size()>366) throw DomainError.invalid("Demasiadas exclusiones para un año.");
        for(String date:p.excluded()) try {if(!LocalDate.parse(date).toString().equals(date)) throw new IllegalArgumentException();} catch(RuntimeException e) {throw DomainError.invalid("Las exclusiones deben ser fechas válidas.");}
        Set<Integer> days=new HashSet<>();
        for(var s:r.selections()) {
            if(s==null || s.day()==null || !days.add(s.day()) || s.roomId()==null || !s.roomId().matches("[1-9][0-9]{0,17}") || s.roomVersion()==null || s.roomVersion()<0 || s.dates()==null || s.dates().isEmpty() || s.dates().size()>366 || new HashSet<>(s.dates()).size()!=s.dates().size()) throw DomainError.invalid("Revisá el aula y las fechas de cada patrón.");
            for(String date:s.dates()) try {if(!LocalDate.parse(date).toString().equals(date)) throw new IllegalArgumentException();} catch(RuntimeException e) {throw DomainError.invalid("Las fechas revisadas deben ser válidas.");}
        }
        if(!days.equals(new HashSet<>(p.patterns().stream().map(PeriodicPreparation.Pattern::day).toList()))) throw DomainError.invalid("Elegí exactamente un aula por patrón.");
        // All scalar values have a restricted vocabulary; sorted records give a stable identity.
        var normalized=new PeriodicPreparation.Request(p.year(),p.courseId(),p.period(),p.students(),p.type(),Objects.toString(p.board(),""),p.resources().stream().sorted().toList(),p.excluded().stream().sorted().toList(),p.patterns().stream().sorted(Comparator.comparing(PeriodicPreparation.Pattern::day)).toList());
        var selected=r.selections().stream().map(s->new Selection(s.day(),s.roomId(),s.roomVersion(),s.dates().stream().sorted().toList())).sorted(Comparator.comparing(Selection::day)).toList();
        return normalized+"|"+r.teacherId()+"|"+r.calendarVersion()+"|"+selected;
    }
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Map<String,Object> confirm(long actor,Request r) {
        String content=canonical(r);
        // Single lock order for all writers: permissions, year, rooms by ID, operation/reservation.
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);
        if(!Boolean.TRUE.equals(db.queryForObject("select activo and rol in ('ADMINISTRADOR','BEDEL') from aulas.usuario where id_usuario=?",Boolean.class,actor))) throw new DomainError(403,"FORBIDDEN","Tu cuenta no permite confirmar reservas.");
        // The permission lock serializes operation creation. Recover before checking own occupied dates.
        var previous=db.queryForList("select contenido,id_reserva from aulas.operacion_reserva where actor=? and clave=?",actor,r.operationId());
        if(!previous.isEmpty()) {
            if(!previous.getFirst().get("contenido").equals(content)) throw DomainError.conflict("La clave de operación ya corresponde a otra propuesta.");
            return queries.get(((Number)previous.getFirst().get("id_reserva")).longValue(),true);
        }
        var p=r.proposal();
        var years=db.queryForList("select id_anio_lectivo from aulas.anio_lectivo where anio_calendario=? for update",Long.class,p.year());
        if(years.isEmpty()) throw new DomainError(404,"NOT_FOUND","El año no existe.");
        for(long room:r.selections().stream().map(s->Long.parseLong(s.roomId())).distinct().sorted().toList()) {
            if(db.queryForList("select id_aula from aulas.aula where id_aula=? for update",Long.class,room).isEmpty()) throw DomainError.conflict("Un aula seleccionada ya no está disponible. Volvé a consultar.");
        }
        // Joins this READ_COMMITTED transaction, after acquiring every competing resource lock.
        var fresh=preparation.prepare(p);
        if(fresh.calendarVersion()!=r.calendarVersion()) throw DomainError.conflict("El calendario cambió desde la revisión. Volvé a consultar la propuesta.");
        for(var pattern:fresh.patterns()) {
            var selection=r.selections().stream().filter(s->s.day()==pattern.day()).findFirst().orElseThrow();
            if(pattern.dates().isEmpty() || !new HashSet<>(pattern.dates()).equals(new HashSet<>(selection.dates()))) {
                var changed=new TreeSet<>(selection.dates());changed.removeAll(pattern.dates());var added=new TreeSet<>(pattern.dates());added.removeAll(selection.dates());changed.addAll(added);
                throw DomainError.conflict("Las fechas cambiaron o una clase ya comenzó: "+String.join(", ",changed)+". Revisá la propuesta completa.");
            }
            var room=pattern.availableRooms().stream().filter(a->a.internalId().equals(selection.roomId())).findFirst().orElseThrow(()-> {
                var blocked=db.queryForList("select distinct fecha::text from aulas.detalle_reserva where id_aula=? and estado='CONFIRMADA' and hora_inicio<?::time and hora_inicio+cantidad_modulos*interval '30 minutes'>?::time order by fecha::text",String.class,Long.parseLong(selection.roomId()),pattern.end(),pattern.start()).stream().filter(pattern.dates()::contains).toList();
                return DomainError.conflict("El aula del día "+pattern.day()+" ya no está disponible"+(blocked.isEmpty()?" por sus características.":" en "+String.join(", ",blocked)+".")+" Volvé a consultar; la propuesta no se guardó.");
            });
            if(room.version()!=selection.roomVersion()) throw DomainError.conflict("El aula cambió desde la revisión. Volvé a consultar la propuesta.");
        }
        var teacher=references.teacher(r.teacherId());
        long id=db.queryForObject("insert into aulas.reserva(registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula,pizarron,recursos) values (?,?,?,?,?,?,?,?,?,?::text[]) returning id_reserva",Long.class,actor,Long.parseLong(p.courseId()),teacher.id(),teacher.name(),teacher.surname(),teacher.email(),p.students(),p.type(),p.board()==null || p.board().isEmpty()?null:p.board(),"{"+String.join(",",p.resources())+"}");
        db.update("insert into aulas.reserva_periodica(id_reserva,modalidad) values (?,?)",id,p.period().equals("annual")?"ANUAL":"CUATRIMESTRAL");
        db.update("insert into aulas.periodo_asignado select ?,id_cuatrimestre from aulas.cuatrimestre where id_anio_lectivo=? and (?='annual' or numero=?)",id,years.getFirst(),p.period(),p.period().equals("first")?1:2);
        db.batchUpdate("insert into aulas.fecha_excluida(id_reserva,fecha) values (?,?::date)",p.excluded(),100,(statement,date)->{statement.setLong(1,id);statement.setString(2,date);});
        for(var pattern:p.patterns()) {
            var selected=r.selections().stream().filter(s->s.day().equals(pattern.day())).findFirst().orElseThrow();
            long key=db.queryForObject("insert into aulas.patron_semanal(id_reserva,dia,hora_inicio,cantidad_modulos,id_aula) values (?,?,?::time,?,?) returning id_patron",Long.class,id,pattern.day(),pattern.start(),pattern.modules(),Long.parseLong(selected.roomId()));
            db.batchUpdate("insert into aulas.detalle_reserva(id_reserva,id_aula,fecha,hora_inicio,cantidad_modulos,id_patron,fecha_original) values (?,?,?::date,?::time,?,?,?::date)",selected.dates(),100,(statement,date)->{
                statement.setLong(1,id);statement.setLong(2,Long.parseLong(selected.roomId()));statement.setString(3,date);statement.setString(4,pattern.start());statement.setInt(5,pattern.modules());statement.setLong(6,key);statement.setString(7,date);
            });
        }
        db.update("insert into aulas.operacion_reserva(actor,clave,contenido,id_reserva) values (?,?,?,?)",actor,r.operationId(),content,id);
        db.update("insert into aulas.evento_auditoria(actor,operacion,entidad,entidad_id,resultado,detalle) values (?,'CONFIRMAR_RESERVA','RESERVA',?,'CONFIRMADO',?)",actor,id,"Reserva periódica confirmada; operación "+r.operationId());
        return queries.get(id,true);
    }
}
