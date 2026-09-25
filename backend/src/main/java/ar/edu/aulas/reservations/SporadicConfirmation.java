package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.references.ReferenceManagement;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SporadicConfirmation {
    public record Selection(String date,String roomId,Long roomVersion) {}
    public record Request(UUID operationId,SporadicPreparation.Request proposal,String teacherId,Long calendarVersion,List<Selection> selections) {}
    private final JdbcTemplate db;
    private final SporadicPreparation preparation;
    private final ReservationQueries queries;
    private final ReferenceManagement references;
    public SporadicConfirmation(JdbcTemplate db,SporadicPreparation preparation,ReservationQueries queries,ReferenceManagement references) {
        this.db=db;this.preparation=preparation;this.queries=queries;this.references=references;
    }
    private String canonical(Request r) {
        if(r==null || r.operationId()==null || r.calendarVersion()==null || r.calendarVersion()<0 || r.selections()==null)
            throw DomainError.invalid("Completá identidad de operación y revisión de la reserva.");
        preparation.validate(r.proposal());var p=r.proposal();
        if(p.courseId()==null) throw DomainError.invalid("Seleccioná un curso.");
        references.teacher(r.teacherId());
        Set<String> dates=new HashSet<>();
        for(var s:r.selections()) {
            if(s==null || s.date()==null || !dates.add(s.date()) || s.roomId()==null || !s.roomId().matches("[1-9][0-9]{0,17}") || s.roomVersion()==null || s.roomVersion()<0)
                throw DomainError.invalid("Revisá el aula de cada fecha.");
        }
        if(!dates.equals(new HashSet<>(p.dates().stream().map(SporadicPreparation.DateSlot::date).toList())))
            throw DomainError.invalid("Elegí exactamente un aula para cada fecha.");
        var normalized=new SporadicPreparation.Request(p.year(),p.courseId(),p.students(),p.type(),Objects.toString(p.board(),""),p.resources().stream().sorted().toList(),p.dates().stream().sorted(Comparator.comparing(SporadicPreparation.DateSlot::date)).toList());
        return "SPORADIC|"+normalized+"|"+r.teacherId()+"|"+r.calendarVersion()+"|"+r.selections().stream().sorted(Comparator.comparing(Selection::date)).toList();
    }
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Map<String,Object> confirm(long actor,Request r) {
        String content=canonical(r);
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);
        if(!Boolean.TRUE.equals(db.queryForObject("select activo and rol in ('ADMINISTRADOR','BEDEL') from aulas.usuario where id_usuario=?",Boolean.class,actor)))
            throw new DomainError(403,"FORBIDDEN","Tu cuenta no permite confirmar reservas.");
        var previous=db.queryForList("select contenido,id_reserva from aulas.operacion_reserva where actor=? and clave=?",actor,r.operationId());
        if(!previous.isEmpty()) {
            if(!previous.getFirst().get("contenido").equals(content)) throw DomainError.conflict("La clave de operación ya corresponde a otra propuesta.");
            return queries.get(((Number)previous.getFirst().get("id_reserva")).longValue(),true);
        }
        var p=r.proposal();
        if(db.queryForList("select id_anio_lectivo from aulas.anio_lectivo where anio_calendario=? for update",Long.class,p.year()).isEmpty())
            throw new DomainError(404,"NOT_FOUND","El año no existe.");
        for(long room:r.selections().stream().map(s->Long.parseLong(s.roomId())).distinct().sorted().toList())
            if(db.queryForList("select id_aula from aulas.aula where id_aula=? for update",Long.class,room).isEmpty()) throw DomainError.conflict("Un aula seleccionada ya no existe.");
        var fresh=preparation.prepare(p,false);
        if(fresh.calendarVersion()!=r.calendarVersion()) throw DomainError.conflict("El calendario cambió desde la revisión. Volvé a consultar.");
        for(var date:fresh.dates()) {
            var selected=r.selections().stream().filter(s->s.date().equals(date.date())).findFirst().orElseThrow();
            var room=date.availableRooms().stream().filter(a->a.internalId().equals(selected.roomId())).findFirst()
                .orElseThrow(()->DomainError.conflict("El aula del "+date.date()+" ya no está disponible o no cumple los requisitos. Revisá la propuesta completa."));
            if(room.version()!=selected.roomVersion()) throw DomainError.conflict("El aula cambió desde la revisión. Volvé a consultar.");
        }
        var teacher=references.teacher(r.teacherId());
        long id=db.queryForObject("insert into aulas.reserva(registrado_por,id_curso,docente_externo_id,nombre_docente,apellido_docente,email_docente,cantidad_alumnos,tipo_aula,pizarron,recursos) values (?,?,?,?,?,?,?,?,?,?::text[]) returning id_reserva",Long.class,actor,Long.parseLong(p.courseId()),teacher.id(),teacher.name(),teacher.surname(),teacher.email(),p.students(),p.type(),p.board()==null || p.board().isEmpty()?null:p.board(),"{"+String.join(",",p.resources())+"}");
        db.update("insert into aulas.reserva_esporadica(id_reserva) values (?)",id);
        db.batchUpdate("insert into aulas.detalle_reserva(id_reserva,id_aula,fecha,hora_inicio,cantidad_modulos) values (?,?,?::date,?::time,?)",p.dates(),100,(statement,date)->{
            var selected=r.selections().stream().filter(s->s.date().equals(date.date())).findFirst().orElseThrow();
            statement.setLong(1,id);statement.setLong(2,Long.parseLong(selected.roomId()));statement.setString(3,date.date());statement.setString(4,date.start());statement.setInt(5,date.modules());
        });
        db.update("insert into aulas.operacion_reserva(actor,clave,contenido,id_reserva) values (?,?,?,?)",actor,r.operationId(),content,id);
        db.update("insert into aulas.evento_auditoria(actor,operacion,entidad,entidad_id,resultado,detalle) values (?,'CONFIRMAR_RESERVA','RESERVA',?,'CONFIRMADO',?)",actor,id,"Reserva esporádica confirmada; operación "+r.operationId());
        return queries.get(id,true);
    }
}
