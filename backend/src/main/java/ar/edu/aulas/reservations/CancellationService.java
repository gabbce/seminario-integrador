package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class CancellationService {
    public record Request(UUID operationId,Long version,List<String> detailIds,String reason) {}
    private final JdbcTemplate db;
    private final Clock clock;
    private final ObjectMapper json;
    public CancellationService(JdbcTemplate db,org.springframework.beans.factory.ObjectProvider<Clock> clocks,ObjectMapper json) {
        this.db=db;this.clock=clocks.getIfAvailable(Clock::systemUTC).withZone(ZoneId.of("America/Argentina/Cordoba"));this.json=json;
    }
    private Request normalized(Request r,boolean confirming) {
        if(r==null || r.version()==null || r.version()<0 || (confirming && r.operationId()==null)
            || r.detailIds()==null || r.detailIds().isEmpty() || r.reason()==null || r.reason().trim().isEmpty() || r.reason().trim().length()>1000)
            throw DomainError.invalid("Seleccioná clases, versión y un motivo de hasta 1000 caracteres.");
        if(r.detailIds().stream().anyMatch(id->id==null || !id.matches("[1-9][0-9]{0,17}")) || new HashSet<>(r.detailIds()).size()!=r.detailIds().size())
            throw DomainError.invalid("La selección debe contener IDs de clases distintos y válidos.");
        return new Request(r.operationId(),r.version(),r.detailIds().stream().sorted().toList(),r.reason().trim());
    }
    private void operator(long actor) {
        var permitted=db.queryForList("select activo and rol in ('ADMINISTRADOR','BEDEL') from aulas.usuario where id_usuario=?",Boolean.class,actor);
        if(permitted.isEmpty() || !Boolean.TRUE.equals(permitted.getFirst()))
            throw new DomainError(403,"FORBIDDEN","Tu cuenta no permite cancelar clases.");
    }
    private Map<String,Object> reservation(long id) {
        var rows=db.queryForList("select r.version,c.id_anio_lectivo from aulas.reserva r join aulas.curso c using(id_curso) where r.id_reserva=?",id);
        if(rows.isEmpty()) throw new DomainError(404,"NOT_FOUND","La reserva no existe.");
        return rows.getFirst();
    }
    private Map<String,Object> review(long id,Request r,LocalDateTime now) {
        if(((Number)reservation(id).get("version")).longValue()!=r.version())
            throw DomainError.conflict("La reserva cambió. Volvé al detalle y revisá la versión actual.");
        var details=db.queryForList("select d.id_detalle,d.fecha,d.hora_inicio,d.cantidad_modulos,d.estado,a.identificador from aulas.detalle_reserva d join aulas.aula a using(id_aula) where d.id_reserva=? order by d.fecha,d.hora_inicio,d.id_detalle",id);
        Set<String> selected=new HashSet<>(r.detailIds());var classes=new ArrayList<Map<String,Object>>();int future=0;
        for(var d:details) {
            var date=((java.sql.Date)d.get("fecha")).toLocalDate();var start=((java.sql.Time)d.get("hora_inicio")).toLocalTime();
            boolean eligible=d.get("estado").equals("CONFIRMADA") && date.atTime(start).isAfter(now);
            if(eligible) future++;
            String key=d.get("id_detalle").toString();
            if(!selected.contains(key)) continue;
            if(!eligible) throw DomainError.conflict("Una clase seleccionada ya comenzó o fue cancelada. No se guardó ningún cambio.");
            classes.add(Map.of("id",key,"date",date.toString(),"start",start.toString(),"end",start.plusMinutes(((Number)d.get("cantidad_modulos")).longValue()*30).toString(),"room",d.get("identificador")));
        }
        if(classes.size()!=selected.size()) throw DomainError.conflict("La selección contiene clases que no pertenecen a esta reserva. No se guardó ningún cambio.");
        boolean periodic=Boolean.TRUE.equals(db.queryForObject("select exists(select 1 from aulas.reserva_periodica where id_reserva=?)",Boolean.class,id));
        return Map.of("reservationId",Long.toString(id),"version",r.version(),"reason",r.reason(),"classes",classes,"count",classes.size(),"continuityCancelled",periodic && future==classes.size());
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> prepare(long actor,long id,Request request) {
        operator(actor);return review(id,normalized(request,false),LocalDateTime.now(clock));
    }
    @SuppressWarnings("unchecked")
    private Map<String,Object> result(String stored) {
        Map<String,Object> value=json.readValue(stored,Map.class);
        value.put("version",((Number)value.get("version")).longValue());return value;
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> operation(long actor,UUID key) {
        operator(actor);
        var rows=db.queryForList("select resultado::text from aulas.mutacion_reserva where actor=? and clave=?",String.class,actor,key);
        return rows.isEmpty()?Map.of("found",false):Map.of("found",true,"result",result(rows.getFirst()));
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Map<String,Object> confirm(long actor,long id,Request request) {
        var r=normalized(request,true);
        String content=json.writeValueAsString(new TreeMap<>(Map.of("reservationId",id,"version",r.version(),"detailIds",r.detailIds(),"reason",r.reason())));
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);
        operator(actor);
        var previous=db.queryForList("select tipo,id_reserva,contenido,resultado::text from aulas.mutacion_reserva where actor=? and clave=?",actor,r.operationId());
        if(!previous.isEmpty()) {
            var old=previous.getFirst();
            if(!old.get("tipo").equals("CANCELAR_CLASES") || ((Number)old.get("id_reserva")).longValue()!=id || !old.get("contenido").equals(content))
                throw DomainError.conflict("La clave de operación corresponde a otro cambio.");
            return result(old.get("resultado").toString());
        }
        var reservation=reservation(id);
        db.queryForObject("select id_anio_lectivo from aulas.anio_lectivo where id_anio_lectivo=? for update",Long.class,reservation.get("id_anio_lectivo"));
        for(long room:db.queryForList("select distinct id_aula from aulas.detalle_reserva where id_reserva=? order by id_aula",Long.class,id))
            db.queryForObject("select id_aula from aulas.aula where id_aula=? for update",Long.class,room);
        db.queryForObject("select id_reserva from aulas.reserva where id_reserva=? for update",Long.class,id);
        var instant=clock.instant();var reviewed=review(id,r,LocalDateTime.ofInstant(instant,clock.getZone()));
        var at=instant.atOffset(ZoneOffset.UTC);
        db.batchUpdate("update aulas.detalle_reserva set estado='CANCELADA',motivo_cancelacion=?,cancelado_por=?,cancelado_en=? where id_reserva=? and id_detalle=?",r.detailIds(),100,(statement,key)->{
            statement.setString(1,r.reason());statement.setLong(2,actor);statement.setObject(3,at);statement.setLong(4,id);statement.setLong(5,Long.parseLong(key));
        });
        if(Boolean.TRUE.equals(reviewed.get("continuityCancelled")))
            db.update("update aulas.reserva_periodica set continuidad_cancelada_en=coalesce(continuidad_cancelada_en,?) where id_reserva=?",at,id);
        String state=Boolean.TRUE.equals(db.queryForObject("select exists(select 1 from aulas.detalle_reserva where id_reserva=? and estado<>'CANCELADA')",Boolean.class,id))?"CONFIRMADA":"CANCELADA";
        db.update("update aulas.reserva set estado=?,version=version+1 where id_reserva=?",state,id);
        var outcome=Map.<String,Object>of("operationId",r.operationId().toString(),"reservationId",Long.toString(id),"version",r.version()+1,"detailIds",r.detailIds(),"reason",r.reason(),"at",instant.toString(),"continuityCancelled",reviewed.get("continuityCancelled"),"state",state);
        db.update("insert into aulas.mutacion_reserva(actor,clave,tipo,id_reserva,contenido,resultado) values (?,?,'CANCELAR_CLASES',?,?,?::jsonb)",actor,r.operationId(),id,content,json.writeValueAsString(outcome));
        db.update("insert into aulas.evento_auditoria(actor,operacion,entidad,entidad_id,resultado,detalle) values (?,'CANCELAR_CLASES','RESERVA',?,'CONFIRMADO',?)",actor,id,"Clases "+r.detailIds()+"; motivo: "+r.reason()+"; operación "+r.operationId());
        return outcome;
    }
}
