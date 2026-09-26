package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.rooms.RoomsService;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

@Service
public class RoomMutationService {
    public record Version(Long version,List<String> selectedGroupIds) { public Version(Long version){this(version,List.of());} }
    public record Selection(String groupId,List<String> detailIds,String roomId,Long roomVersion) {}
    public record Request(UUID operationId,Long version,List<Selection> selections) {}
    private record Detail(long id,Long pattern,long room,LocalDate date,LocalTime start,int modules,String roomLabel) {
        LocalTime end(){return start.plusMinutes(modules*30L);}
        Map<String,Object> view(){return Map.of("id",Long.toString(id),"date",date.toString(),"start",start.toString(),"end",end().toString(),"room",roomLabel);}
    }
    private record Group(String id,String label,List<Detail> details) {}
    private record Snapshot(Map<String,Object> reservation,boolean periodic,List<Group> groups) {}
    private record Proposed(String group,Detail detail,RoomsService.Room room) {}
    private final JdbcTemplate db;
    private final RoomsService rooms;
    private final Clock clock;
    private final ObjectMapper json;
    public RoomMutationService(JdbcTemplate db,RoomsService rooms,ObjectProvider<Clock> clocks,ObjectMapper json){this.db=db;this.rooms=rooms;this.clock=clocks.getIfAvailable(Clock::systemUTC).withZone(ZoneId.of("America/Argentina/Cordoba"));this.json=json;}
    private void operator(long actor){
        var roles=db.queryForList("select activo and rol in ('ADMINISTRADOR','BEDEL') from aulas.usuario where id_usuario=?",Boolean.class,actor);
        if(roles.isEmpty() || !Boolean.TRUE.equals(roles.getFirst())) throw new DomainError(403,"FORBIDDEN","Tu cuenta no permite cambiar aulas.");
    }
    private static boolean validId(String value){return value!=null && value.matches("[1-9][0-9]{0,17}");}
    private void version(Long version){if(version==null || version<0)throw DomainError.invalid("Indicá la versión de la reserva.");}
    private Request normalized(Request r,boolean confirming){
        if(r==null)throw DomainError.invalid("Indicá el cambio de aulas.");version(r.version());
        if((confirming && r.operationId()==null) || r.selections()==null || r.selections().isEmpty())throw DomainError.invalid("Seleccioná clases o patrones y sus nuevas aulas.");
        var groups=new HashSet<String>();var details=new HashSet<String>();var selected=new ArrayList<Selection>();
        for(var s:r.selections()){
            if(s==null || s.groupId()==null || !s.groupId().matches("[pd]:[1-9][0-9]{0,17}") || !groups.add(s.groupId()) || !validId(s.roomId()) || s.roomVersion()==null || s.roomVersion()<0 || s.detailIds()==null || s.detailIds().isEmpty())throw DomainError.invalid("Revisá grupos, aulas, versiones y clases sin duplicados.");
            for(String detail:s.detailIds())if(!validId(detail) || !details.add(detail))throw DomainError.invalid("Las clases deben tener IDs válidos y no repetidos.");
            selected.add(new Selection(s.groupId(),s.detailIds().stream().sorted().toList(),s.roomId(),s.roomVersion()));
        }
        return new Request(r.operationId(),r.version(),selected.stream().sorted(Comparator.comparing(Selection::groupId)).toList());
    }
    private Map<String,Object> reservation(long id){
        var rows=db.queryForList("select r.*,c.id_anio_lectivo,a.estado as year_state,exists(select 1 from aulas.reserva_periodica p where p.id_reserva=r.id_reserva) as periodic from aulas.reserva r join aulas.curso c using(id_curso) join aulas.anio_lectivo a using(id_anio_lectivo) where r.id_reserva=?",id);
        if(rows.isEmpty())throw new DomainError(404,"NOT_FOUND","La reserva no existe.");return rows.getFirst();
    }
    private Snapshot snapshot(long id,long expected,LocalDateTime now){
        var r=reservation(id);
        if(((Number)r.get("version")).longValue()!=expected)throw DomainError.conflict("La reserva cambió. Volvé al detalle y revisá la versión actual.");
        if(!r.get("year_state").equals("HABILITADO"))throw DomainError.conflict("El año debe estar habilitado para cambiar aulas.");
        var details=db.query("select d.*,a.identificador from aulas.detalle_reserva d join aulas.aula a using(id_aula) where d.id_reserva=? and d.estado='CONFIRMADA' and d.fecha+d.hora_inicio>? order by d.fecha,d.hora_inicio,d.id_detalle",(rs,n)->new Detail(rs.getLong("id_detalle"),(Long)rs.getObject("id_patron"),rs.getLong("id_aula"),rs.getDate("fecha").toLocalDate(),rs.getTime("hora_inicio").toLocalTime(),rs.getInt("cantidad_modulos"),rs.getString("identificador")),id,now);
        if(details.isEmpty())throw DomainError.conflict("La reserva no tiene clases futuras vigentes para cambiar de aula.");
        boolean periodic=Boolean.TRUE.equals(r.get("periodic"));var grouped=new LinkedHashMap<String,List<Detail>>();
        for(var d:details)grouped.computeIfAbsent(periodic?"p:"+d.pattern():"d:"+d.id(),key->new ArrayList<>()).add(d);
        var patterns=periodic?db.queryForList("select id_patron,dia,hora_inicio,cantidad_modulos from aulas.patron_semanal where id_reserva=?",id):List.<Map<String,Object>>of();
        var labels=new HashMap<String,String>();
        for(var p:patterns){int day=((Number)p.get("dia")).intValue();labels.put("p:"+p.get("id_patron"),List.of("","Lunes","Martes","Miércoles","Jueves","Viernes").get(day)+" "+p.get("hora_inicio")+" · patrón completo");}
        var groups=grouped.entrySet().stream().map(e->new Group(e.getKey(),periodic?labels.get(e.getKey()):e.getValue().getFirst().date()+" "+e.getValue().getFirst().start(),e.getValue())).toList();
        return new Snapshot(r,periodic,groups);
    }
    private boolean compatible(RoomsService.Room room,Map<String,Object> r){
        try {
            var requirements=Arrays.asList((String[])((java.sql.Array)r.get("recursos")).getArray());
            return room.state().equals("Habilitada") && room.type().equals(r.get("tipo_aula")) && room.capacity()>=((Number)r.get("cantidad_alumnos")).intValue() && (r.get("pizarron")==null || room.board().equals(r.get("pizarron"))) && room.resources().containsAll(requirements);
        } catch(java.sql.SQLException e){throw new IllegalStateException(e);}
    }
    private List<Detail> occupied(List<Detail> details){
        var min=details.stream().map(Detail::date).min(Comparator.naturalOrder()).orElseThrow();var max=details.stream().map(Detail::date).max(Comparator.naturalOrder()).orElseThrow();
        return db.query("select id_detalle,id_aula,fecha,hora_inicio,cantidad_modulos from aulas.detalle_reserva where estado='CONFIRMADA' and fecha between ? and ?",(rs,n)->new Detail(rs.getLong(1),null,rs.getLong(2),rs.getDate(3).toLocalDate(),rs.getTime(4).toLocalTime(),rs.getInt(5),""),min,max);
    }
    private boolean overlaps(Detail a,Detail b){return a.date().equals(b.date()) && a.start().isBefore(b.end()) && b.start().isBefore(a.end());}
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> options(long actor,long id,Version request){
        operator(actor);version(request==null?null:request.version());var snapshot=snapshot(id,request.version(),LocalDateTime.now(clock));
        var selected=request.selectedGroupIds()==null?List.<String>of():request.selectedGroupIds();
        if(new HashSet<>(selected).size()!=selected.size() || selected.stream().anyMatch(key->key==null || snapshot.groups().stream().noneMatch(g->g.id().equals(key))))throw DomainError.invalid("Seleccioná grupos vigentes sin duplicados.");
        var vacated=snapshot.groups().stream().filter(g->selected.contains(g.id())).flatMap(g->g.details().stream()).map(Detail::id).toList();
        var inventory=rooms.references();var occupied=occupied(snapshot.groups().stream().flatMap(g->g.details().stream()).toList());
        var groups=new ArrayList<Map<String,Object>>();
        for(var group:snapshot.groups()){
            var own=group.details().stream().map(Detail::id).toList();
            var candidates=inventory.stream().filter(a->compatible(a,snapshot.reservation()) && group.details().stream().anyMatch(d->d.room()!=Long.parseLong(a.internalId())) && group.details().stream().noneMatch(d->occupied.stream().anyMatch(o->!own.contains(o.id()) && !vacated.contains(o.id()) && o.room()==Long.parseLong(a.internalId()) && overlaps(d,o))))
                .sorted(Comparator.comparing(RoomsService.Room::capacity).thenComparing(RoomsService.Room::id))
                .map(a->Map.of("internalId",a.internalId(),"id",a.id(),"version",a.version(),"capacity",a.capacity())).toList();
            groups.add(Map.of("groupId",group.id(),"label",group.label(),"detailIds",own.stream().map(Object::toString).toList(),"classes",group.details().stream().map(Detail::view).toList(),"availableRooms",candidates));
        }
        return Map.of("reservationId",Long.toString(id),"version",request.version(),"periodic",snapshot.periodic(),"groups",groups);
    }
    private List<Proposed> validate(long id,Request request,LocalDateTime now){
        var snapshot=snapshot(id,request.version(),now);var proposed=new ArrayList<Proposed>();
        for(var selection:request.selections()){
            var group=snapshot.groups().stream().filter(g->g.id().equals(selection.groupId())).findFirst().orElseThrow(()->DomainError.conflict("Una clase o patrón ya no es elegible. Revisá el conjunto nuevamente."));
            if(!group.details().stream().map(d->Long.toString(d.id())).sorted().toList().equals(selection.detailIds()))throw DomainError.conflict("Cambió el conjunto de clases futuras del patrón. Revisá todas sus clases nuevamente.");
            var room=rooms.get(Long.parseLong(selection.roomId()));
            if(!room.version().equals(selection.roomVersion()))throw DomainError.conflict("El aula "+room.id()+" cambió. Volvé a consultar opciones.");
            if(!compatible(room,snapshot.reservation()))throw DomainError.conflict("El aula "+room.id()+" no cumple los requisitos de la reserva.");
            if(group.details().stream().allMatch(d->d.room()==Long.parseLong(room.internalId())))throw DomainError.invalid("Elegí un aula diferente de la actual.");
            for(var detail:group.details())proposed.add(new Proposed(group.id(),detail,room));
        }
        var selected=proposed.stream().map(p->p.detail().id()).toList();var occupied=occupied(proposed.stream().map(Proposed::detail).toList());
        for(int i=0;i<proposed.size();i++){
            var p=proposed.get(i);
            if(occupied.stream().anyMatch(o->!selected.contains(o.id()) && o.room()==Long.parseLong(p.room().internalId()) && overlaps(o,p.detail())))throw DomainError.conflict("El aula "+p.room().id()+" está ocupada el "+p.detail().date()+" a las "+p.detail().start()+". No se guardó ningún cambio.");
            for(int j=0;j<i;j++){var other=proposed.get(j);if(other.room().internalId().equals(p.room().internalId()) && overlaps(other.detail(),p.detail()))throw DomainError.conflict("Las clases propuestas se superponen en el aula "+p.room().id()+". No se guardó ningún cambio.");}
        }
        return proposed;
    }
    private Map<String,Object> review(long id,long version,List<Proposed> proposed){
        return Map.of("reservationId",Long.toString(id),"version",version,"changes",proposed.stream().map(p->{var row=new LinkedHashMap<>(p.detail().view());row.put("groupId",p.group());row.put("newRoom",p.room().id());return row;}).toList());
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> prepare(long actor,long id,Request request){operator(actor);var r=normalized(request,false);return review(id,r.version(),validate(id,r,LocalDateTime.now(clock)));}
    @SuppressWarnings("unchecked")
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Map<String,Object> confirm(long actor,long id,Request request){
        var r=normalized(request,true);String content=json.writeValueAsString(new TreeMap<>(Map.of("reservationId",id,"version",r.version(),"selections",r.selections())));
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);operator(actor);
        var previous=db.queryForList("select invalidada_en,tipo,id_reserva,contenido,resultado::text from aulas.mutacion_reserva where actor=? and clave=?",actor,r.operationId());
        if(!previous.isEmpty()){OperationRecovery.requireCurrent(previous.getFirst());
            var old=previous.getFirst();if(!old.get("tipo").equals("CAMBIAR_AULAS") || ((Number)old.get("id_reserva")).longValue()!=id || !old.get("contenido").equals(content))throw DomainError.conflict("La clave de operación corresponde a otro cambio.");
            Map<String,Object> result=json.readValue(old.get("resultado").toString(),Map.class);result.put("version",((Number)result.get("version")).longValue());return result;
        }
        var reservation=reservation(id);db.queryForObject("select id_anio_lectivo from aulas.anio_lectivo where id_anio_lectivo=? for update",Long.class,reservation.get("id_anio_lectivo"));
        var ids=new TreeSet<>(db.queryForList("select distinct id_aula from aulas.detalle_reserva where id_reserva=?",Long.class,id));for(var s:r.selections())ids.add(Long.parseLong(s.roomId()));
        for(long room:ids){if(db.queryForList("select id_aula from aulas.aula where id_aula=? for update",Long.class,room).isEmpty())throw new DomainError(404,"NOT_FOUND","El aula no existe.");}
        db.queryForObject("select id_reserva from aulas.reserva where id_reserva=? for update",Long.class,id);
        var instant=clock.instant();var proposed=validate(id,r,LocalDateTime.ofInstant(instant,clock.getZone()));
        db.execute("set constraints aulas.detalle_reserva_sin_solapamiento deferred");
        for(var p:proposed)db.update("update aulas.detalle_reserva set id_aula=? where id_detalle=? and id_reserva=?",Long.parseLong(p.room().internalId()),p.detail().id(),id);
        for(var selection:r.selections())if(selection.groupId().startsWith("p:"))db.update("update aulas.patron_semanal set id_aula=? where id_patron=? and id_reserva=?",Long.parseLong(selection.roomId()),Long.parseLong(selection.groupId().substring(2)),id);
        db.execute("set constraints aulas.detalle_reserva_sin_solapamiento immediate");
        db.update("update aulas.reserva set version=version+1 where id_reserva=?",id);
        var result=new LinkedHashMap<>(review(id,r.version()+1,proposed));result.put("operationId",r.operationId().toString());result.put("at",instant.toString());
        db.update("insert into aulas.mutacion_reserva(actor,clave,tipo,id_reserva,contenido,resultado) values (?,?,'CAMBIAR_AULAS',?,?,?::jsonb)",actor,r.operationId(),id,content,json.writeValueAsString(result));
        String description=String.join("; ",proposed.stream().map(p->p.detail().date()+" "+p.detail().start()+"–"+p.detail().end()+": aula "+p.detail().roomLabel()+" → "+p.room().id()).toList());
        db.update("insert into aulas.evento_auditoria(actor,instante,operacion,entidad,entidad_id,resultado,detalle) values (?,?,'CAMBIAR_AULAS','RESERVA',?,'CONFIRMADO',?)",actor,instant.atOffset(ZoneOffset.UTC),id,"Cambio de aulas: "+description);
        return result;
    }
}
