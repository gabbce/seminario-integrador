package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.references.ReferenceManagement;
import ar.edu.aulas.rooms.RoomsService;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class HeaderMutationService {
    public record Request(UUID operationId,Long version,String courseId,String teacherId,Integer students,String type,String board,List<String> resources) {}
    private final JdbcTemplate db;
    private final Clock clock;
    private final ObjectMapper json;
    private final ReferenceManagement references;
    private final RoomsService rooms;
    public HeaderMutationService(JdbcTemplate db,org.springframework.beans.factory.ObjectProvider<Clock> clocks,ObjectMapper json,ReferenceManagement references,RoomsService rooms) {
        this.db=db;this.clock=clocks.getIfAvailable(Clock::systemUTC).withZone(ZoneId.of("America/Argentina/Cordoba"));this.json=json;this.references=references;this.rooms=rooms;
    }
    private Request normalized(Request r) {
        if(r==null || r.operationId()==null || r.version()==null || r.version()<0 || r.courseId()==null || !r.courseId().matches("[1-9][0-9]{0,17}")
            || r.teacherId()==null || r.teacherId().isBlank() || r.students()==null || r.students()<1 || r.type()==null || !List.of("General","Multimedios","Laboratorio").contains(r.type())
            || r.board()==null || !List.of("","Tiza","Fibrón").contains(r.board()) || r.resources()==null)
            throw DomainError.invalid("Completá versión, curso, docente, alumnos y requisitos de aula.");
        var allowed=r.type().equals("Multimedios")?List.of("fans","air","projector","television","computer"):List.of("fans","air");
        if(r.resources().stream().anyMatch(resource->resource==null || !allowed.contains(resource)) || new HashSet<>(r.resources()).size()!=r.resources().size())
            throw DomainError.invalid("Los recursos deben corresponder al tipo solicitado, sin duplicados.");
        return new Request(r.operationId(),r.version(),r.courseId(),r.teacherId(),r.students(),r.type(),r.board(),r.resources().stream().sorted().toList());
    }
    private String courseLabel(long id) {
        return db.queryForObject("select m.nombre || ' ' || lpad(m.id_materia::text,greatest(3,length(m.id_materia::text)),'0') || '-' || c.comision || '-' || a.anio_calendario from aulas.curso c join aulas.materia m using(id_materia) join aulas.anio_lectivo a using(id_anio_lectivo) where c.id_curso=?",String.class,id);
    }
    @SuppressWarnings("unchecked")
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Map<String,Object> save(long actor,long id,Request request) {
        var r=normalized(request);
        String content=json.writeValueAsString(new TreeMap<>(Map.of("reservationId",id,"version",r.version(),"courseId",r.courseId(),"teacherId",r.teacherId(),"students",r.students(),"type",r.type(),"board",r.board(),"resources",r.resources())));
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);
        var permissions=db.queryForList("select activo and rol in ('ADMINISTRADOR','BEDEL') from aulas.usuario where id_usuario=?",Boolean.class,actor);
        if(permissions.isEmpty() || !Boolean.TRUE.equals(permissions.getFirst())) throw new DomainError(403,"FORBIDDEN","Tu cuenta no permite modificar reservas.");
        var previous=db.queryForList("select invalidada_en,tipo,id_reserva,contenido,resultado::text from aulas.mutacion_reserva where actor=? and clave=?",actor,r.operationId());
        if(!previous.isEmpty()) {
            OperationRecovery.requireCurrent(previous.getFirst());
            var old=previous.getFirst();
            if(!old.get("tipo").equals("EDITAR_CABECERA") || ((Number)old.get("id_reserva")).longValue()!=id || !old.get("contenido").equals(content))
                throw DomainError.conflict("La clave de operación corresponde a otro cambio.");
            Map<String,Object> result=json.readValue(old.get("resultado").toString(),Map.class);result.put("version",((Number)result.get("version")).longValue());return result;
        }
        var rows=db.queryForList("select r.*,c.id_anio_lectivo from aulas.reserva r join aulas.curso c using(id_curso) where r.id_reserva=?",id);
        if(rows.isEmpty()) throw new DomainError(404,"NOT_FOUND","La reserva no existe.");
        var before=rows.getFirst();long year=((Number)before.get("id_anio_lectivo")).longValue();
        String yearState=db.queryForObject("select estado from aulas.anio_lectivo where id_anio_lectivo=? for update",String.class,year);
        var roomIds=db.queryForList("select distinct id_aula from aulas.detalle_reserva where id_reserva=? order by id_aula",Long.class,id);
        for(long room:roomIds) db.queryForObject("select id_aula from aulas.aula where id_aula=? for update",Long.class,room);
        long version=db.queryForObject("select version from aulas.reserva where id_reserva=? for update",Long.class,id);
        var instant=clock.instant();var now=LocalDateTime.ofInstant(instant,clock.getZone());
        if(version!=r.version()) throw DomainError.conflict("La reserva cambió. Volvé al detalle y revisá la versión actual.");
        if(!"HABILITADO".equals(yearState)) throw DomainError.conflict("El año debe estar habilitado para editar la reserva.");
        if(Boolean.TRUE.equals(db.queryForObject("select exists(select 1 from aulas.detalle_reserva where id_reserva=? and fecha+hora_inicio<=?)",Boolean.class,id,now)))
            throw DomainError.conflict("Los datos compartidos quedan fijos al iniciarse la reserva. Cancelá futuras y registrá otra reserva para necesidades diferentes.");
        if(!Boolean.TRUE.equals(db.queryForObject("select exists(select 1 from aulas.detalle_reserva where id_reserva=? and estado='CONFIRMADA')",Boolean.class,id)))
            throw DomainError.conflict("No se puede editar una reserva completamente cancelada.");
        if(!Boolean.TRUE.equals(db.queryForObject("select exists(select 1 from aulas.curso where id_curso=? and id_anio_lectivo=?)",Boolean.class,Long.parseLong(r.courseId()),year)))
            throw DomainError.conflict("Elegí un curso del mismo año de la reserva.");
        var teacher=references.teacher(r.teacherId());var incompatible=new ArrayList<String>();
        for(long roomId:db.queryForList("select distinct id_aula from aulas.detalle_reserva where id_reserva=? and estado='CONFIRMADA' order by id_aula",Long.class,id)) {
            var room=rooms.get(roomId);
            if(!room.state().equals("Habilitada") || !room.type().equals(r.type()) || room.capacity()<r.students() || (!r.board().isEmpty() && !room.board().equals(r.board())) || !room.resources().containsAll(r.resources()))
                incompatible.add(room.id());
        }
        if(!incompatible.isEmpty()) throw DomainError.conflict("Las aulas "+String.join(", ",incompatible)+" no cumplen los nuevos requisitos. Ajustá los datos o reasigná las aulas antes de guardar.");
        db.update("update aulas.reserva set id_curso=?,docente_externo_id=?,nombre_docente=?,apellido_docente=?,email_docente=?,cantidad_alumnos=?,tipo_aula=?,pizarron=?,recursos=?::text[],version=version+1 where id_reserva=?",Long.parseLong(r.courseId()),teacher.id(),teacher.name(),teacher.surname(),teacher.email(),r.students(),r.type(),r.board().isEmpty()?null:r.board(),"{"+String.join(",",r.resources())+"}",id);
        var result=Map.<String,Object>of("operationId",r.operationId().toString(),"reservationId",Long.toString(id),"version",version+1,"at",instant.toString());
        db.update("insert into aulas.mutacion_reserva(actor,clave,tipo,id_reserva,contenido,resultado) values (?,?,'EDITAR_CABECERA',?,?,?::jsonb)",actor,r.operationId(),id,content,json.writeValueAsString(result));
        String description="Datos compartidos: curso "+courseLabel(((Number)before.get("id_curso")).longValue())+" → "+courseLabel(Long.parseLong(r.courseId()))+"; docente "+before.get("nombre_docente")+" "+before.get("apellido_docente")+" → "+teacher.name()+" "+teacher.surname()+"; alumnos "+before.get("cantidad_alumnos")+" → "+r.students()+"; tipo "+before.get("tipo_aula")+" → "+r.type()+"; pizarrón "+Objects.toString(before.get("pizarron"),"Sin preferencia")+" → "+(r.board().isEmpty()?"Sin preferencia":r.board())+"; recursos "+before.get("recursos")+" → "+r.resources();
        db.update("insert into aulas.evento_auditoria(actor,instante,operacion,entidad,entidad_id,resultado,detalle) values (?,?,'EDITAR_CABECERA','RESERVA',?,'CONFIRMADO',?)",actor,instant.atOffset(ZoneOffset.UTC),id,description);
        return result;
    }
}
