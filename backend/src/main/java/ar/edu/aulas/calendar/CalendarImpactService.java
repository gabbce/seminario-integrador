package ar.edu.aulas.calendar;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.reservations.OperationRecovery;
import ar.edu.aulas.reservations.ReservationGuards;
import ar.edu.aulas.rooms.RoomsService;
import java.time.*;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

@Service
public class CalendarImpactService {
    public record Request(UUID operationId,CalendarManagement.Edit proposal,String stamp) {}
    public record Added(String booking,String pattern,String date,String start,String end,String roomId,String room,int modules) {}
    public record Conflict(String booking,String date,String room,String reason,List<Map<String,Object>> occupants,List<String> alternatives) {}
    public record Review(CalendarManagement.Edit calendar,List<Added> added,List<Conflict> conflicts,boolean canConfirm,String stamp) {}
    private final JdbcTemplate db;
    private final CalendarManagement calendars;
    private final RoomsService rooms;
    private final ObjectMapper json;
    private final Clock clock;
    public CalendarImpactService(JdbcTemplate db,CalendarManagement calendars,RoomsService rooms,ObjectMapper json,ObjectProvider<Clock> clocks){this.db=db;this.calendars=calendars;this.rooms=rooms;this.json=json;this.clock=clocks.getIfAvailable(Clock::systemUTC).withZone(ZoneId.of("America/Argentina/Cordoba"));}
    private void admin(long actor){
        var permitted=db.queryForList("select activo and rol='ADMINISTRADOR' from aulas.usuario where id_usuario=?",Boolean.class,actor);
        if(permitted.isEmpty() || !Boolean.TRUE.equals(permitted.getFirst()))throw new DomainError(403,"FORBIDDEN","Solo un administrador activo puede gestionar el impacto del calendario.");
    }
    private CalendarManagement.Config validate(long id,CalendarManagement.Edit edit){
        if(edit==null || edit.version()==null || edit.version()<0)throw DomainError.invalid("Completá el calendario y su versión.");
        var current=calendars.get(id);
        if(current.version()!=edit.version())throw DomainError.conflict("El calendario cambió. Recargalo y revisá la propuesta.");
        if(current.state().equals("Cerrado"))throw DomainError.conflict("El año cerrado es de solo lectura.");
        calendars.validate(edit,current);
        if(current.year()!=edit.year() && db.queryForObject("select count(*) from aulas.curso where id_anio_lectivo=?",Long.class,id)>0)throw DomainError.conflict("No se puede cambiar el número de un año con cursos asociados.");
        new ReservationGuards(db,clock).calendarDependencies(id,current,edit);
        return current;
    }
    private List<Map<String,Object>> reservations(long id){return db.queryForList("select r.*,p.continuidad_cancelada_en,p.id_reserva as periodic from aulas.reserva r join aulas.curso c using(id_curso) left join aulas.reserva_periodica p using(id_reserva) where c.id_anio_lectivo=? order by r.id_reserva",id);}
    private boolean compatible(RoomsService.Room room,Map<String,Object> r){
        List<String> resources;
        try{resources=Arrays.asList((String[])((java.sql.Array)r.get("recursos")).getArray());}catch(java.sql.SQLException e){throw new IllegalStateException(e);}
        return room.state().equals("Habilitada") && room.type().equals(r.get("tipo_aula")) && room.capacity()>=((Number)r.get("cantidad_alumnos")).intValue() && (r.get("pizarron")==null || room.board().equals(r.get("pizarron"))) && room.resources().containsAll(resources);
    }
    private boolean overlaps(Added a,Added b){return a.roomId().equals(b.roomId()) && a.date().equals(b.date()) && a.start().compareTo(b.end())<0 && b.start().compareTo(a.end())<0;}
    private List<Map<String,Object>> occupants(List<Map<String,Object>> occupancy,String room,Added a,boolean excludePattern){
        return occupancy.stream().filter(o->o.get("roomId").toString().equals(room) && o.get("date").toString().equals(a.date()) && LocalTime.parse(o.get("start").toString()).isBefore(LocalTime.parse(a.end())) && LocalTime.parse(o.get("end").toString()).isAfter(LocalTime.parse(a.start())))
            .filter(o->!excludePattern || !o.get("reservation").toString().equals(a.booking()) || !Objects.toString(o.get("pattern"),"").equals(a.pattern()))
            .map(o->{var publicRow=new LinkedHashMap<String,Object>(o);for(String key:List.of("roomId","date","pattern","modules"))publicRow.remove(key);return (Map<String,Object>)publicRow;}).toList();
    }
    private Map<String,List<Map<String,Object>>> grouped(List<Map<String,Object>> rows){
        var result=new HashMap<String,List<Map<String,Object>>>();for(var row:rows)result.computeIfAbsent(row.get("id_reserva").toString(),ignored->new ArrayList<>()).add(row);return result;
    }
    private Review review(long id,CalendarManagement.Edit edit){
        validate(id,edit);
        var now=LocalDateTime.now(clock);var added=new ArrayList<Added>();var conflicts=new ArrayList<Conflict>();
        var bookingVersions=new TreeMap<String,Long>();var roomVersions=new TreeMap<String,Long>();var sources=new HashMap<String,Map<String,Object>>();
        var inventory=rooms.references();var byRoom=new HashMap<String,RoomsService.Room>();inventory.forEach(room->byRoom.put(room.internalId(),room));
        var allPatterns=grouped(db.queryForList("select p.* from aulas.patron_semanal p join aulas.reserva r using(id_reserva) join aulas.curso c using(id_curso) where c.id_anio_lectivo=? order by id_patron",id));
        var allPeriods=grouped(db.queryForList("select p.id_reserva,c.numero from aulas.periodo_asignado p join aulas.cuatrimestre c using(id_cuatrimestre) where c.id_anio_lectivo=?",id));
        var allDetails=grouped(db.queryForList("select d.id_reserva,d.fecha_original::text from aulas.detalle_reserva d join aulas.reserva r using(id_reserva) join aulas.curso c using(id_curso) where c.id_anio_lectivo=?",id));
        var allExcluded=grouped(db.queryForList("select f.id_reserva,f.fecha::text from aulas.fecha_excluida f join aulas.reserva r using(id_reserva) join aulas.curso c using(id_curso) where c.id_anio_lectivo=?",id));
        for(var r:reservations(id)){
            String booking=r.get("id_reserva").toString();sources.put(booking,r);
            if(r.get("periodic")==null || !r.get("estado").equals("CONFIRMADA") || r.get("continuidad_cancelada_en")!=null)continue;
            var patterns=allPatterns.getOrDefault(booking,List.of());
            if(!edit.state().equals("Habilitado"))continue;
            var periods=allPeriods.getOrDefault(booking,List.of()).stream().map(row->((Number)row.get("numero")).intValue()).toList();
            var represented=new HashSet<>(allDetails.getOrDefault(booking,List.of()).stream().map(row->row.get("fecha_original").toString()).toList());
            var excluded=new HashSet<>(allExcluded.getOrDefault(booking,List.of()).stream().map(row->row.get("fecha").toString()).toList());
            for(int period:periods){
                var range=edit.terms().get(period==1?"first":"second");
                for(var day=LocalDate.parse(range.getFirst());!day.isAfter(LocalDate.parse(range.getLast()));day=day.plusDays(1)){
                    if(edit.holidays().contains(day.toString()) || represented.contains(day.toString()) || excluded.contains(day.toString()))continue;
                    for(var p:patterns){
                        var start=((java.sql.Time)p.get("hora_inicio")).toLocalTime();
                        if(day.getDayOfWeek().getValue()!=((Number)p.get("dia")).intValue() || !day.atTime(start).isAfter(now))continue;
                        int modules=((Number)p.get("cantidad_modulos")).intValue();var room=byRoom.get(p.get("id_aula").toString());
                        added.add(new Added(booking,p.get("id_patron").toString(),day.toString(),start.toString(),start.plusMinutes(modules*30L).toString(),room.internalId(),room.id(),modules));
                    }
                }
            }
        }
        added.sort(Comparator.comparing(Added::booking).thenComparing(Added::date).thenComparing(Added::pattern));
        var occupancy=added.isEmpty()?List.<Map<String,Object>>of():db.queryForList("select d.id_reserva::text as reservation,d.id_patron::text as pattern,d.id_aula::text as \"roomId\",d.fecha::text as date,d.cantidad_modulos as modules,m.nombre as subject,r.nombre_docente || ' ' || r.apellido_docente as teacher,r.email_docente as \"teacherEmail\",u.email as \"registrantEmail\",d.hora_inicio::text as start,(d.hora_inicio+d.cantidad_modulos*interval '30 minutes')::time::text as end from aulas.detalle_reserva d join aulas.reserva r using(id_reserva) join aulas.curso c using(id_curso) join aulas.materia m using(id_materia) join aulas.usuario u on u.id_usuario=r.registrado_por where d.estado='CONFIRMADA' and d.fecha+d.hora_inicio+d.cantidad_modulos*interval '30 minutes'>? order by d.id_detalle",now);
        for(var a:added){
            bookingVersions.put(a.booking(),((Number)sources.get(a.booking()).get("version")).longValue());roomVersions.put(a.roomId(),byRoom.get(a.roomId()).version());
            var source=sources.get(a.booking());var room=byRoom.get(a.roomId());var occupied=occupants(occupancy,a.roomId(),a,false);
            boolean duplicate=occupancy.stream().anyMatch(o->o.get("reservation").equals(a.booking()) && o.get("date").equals(a.date()));
            boolean internal=added.stream().anyMatch(b->b!=a && (overlaps(a,b) || (a.booking().equals(b.booking()) && a.date().equals(b.date()))));
            if(!compatible(room,source) || !occupied.isEmpty() || duplicate || internal){
                String reason=!compatible(room,source)?"El aula del patrón ya no cumple los requisitos.":duplicate?"La reserva ya tiene una clase reprogramada en esa fecha.":internal?"Las clases nuevas interfieren entre sí.":"El aula del patrón está ocupada.";
                var patternDates=new ArrayList<>(added.stream().filter(b->b.booking().equals(a.booking()) && b.pattern().equals(a.pattern())).toList());
                for(var o:occupancy)if(o.get("reservation").equals(a.booking()) && Objects.equals(o.get("pattern"),a.pattern()) && LocalDateTime.parse(o.get("date")+"T"+o.get("start")).isAfter(now))patternDates.add(new Added(a.booking(),a.pattern(),o.get("date").toString(),o.get("start").toString(),o.get("end").toString(),o.get("roomId").toString(),"",((Number)o.get("modules")).intValue()));
                var alternatives=inventory.stream().filter(candidate->!candidate.internalId().equals(a.roomId()) && compatible(candidate,source) && patternDates.stream().allMatch(slot->occupants(occupancy,candidate.internalId(),slot,true).isEmpty()))
                    .filter(candidate->patternDates.stream().noneMatch(slot->added.stream().anyMatch(b->!(b.booking().equals(a.booking()) && b.pattern().equals(a.pattern())) && overlaps(new Added(slot.booking(),slot.pattern(),slot.date(),slot.start(),slot.end(),candidate.internalId(),candidate.id(),slot.modules()),b))))
                    .sorted(Comparator.comparing(RoomsService.Room::capacity).thenComparing(RoomsService.Room::id)).map(RoomsService.Room::id).toList();
                conflicts.add(new Conflict(a.booking(),a.date(),a.room(),reason,occupied,alternatives));
            }
        }
        String stamp=digest(canonical(Map.of("id",id,"calendar",edit,"bookings",bookingVersions,"rooms",roomVersions,"added",added,"conflicts",conflicts)));
        return new Review(edit,List.copyOf(added),List.copyOf(conflicts),conflicts.isEmpty(),stamp);
    }
    // Canonical object ordering survives JSON round trips and does not depend on Map iteration order.
    @SuppressWarnings("unchecked") private Object sorted(Object value){
        if(value instanceof Map<?,?> m){var result=new TreeMap<String,Object>();m.forEach((k,v)->result.put(k.toString(),sorted(v)));return result;}
        if(value instanceof List<?> list)return list.stream().map(this::sorted).toList();return value;
    }
    private String canonical(Object value){return json.writeValueAsString(sorted(json.readValue(json.writeValueAsString(value),Object.class)));}
    private String digest(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Review prepare(long actor,long id,CalendarManagement.Edit edit){admin(actor);return review(id,edit);}
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> operation(long actor,UUID key){admin(actor);var rows=db.queryForList("select invalidada_en,resultado::text from aulas.operacion_calendario where actor=? and clave=?",actor,key);if(!rows.isEmpty())OperationRecovery.requireCurrent(rows.getFirst());return rows.isEmpty()?Map.of("found",false):Map.of("found",true,"result",json.readValue(rows.getFirst().get("resultado").toString(),Map.class));}
    @SuppressWarnings("unchecked")
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Map<String,Object> confirm(long actor,long id,Request request){
        if(request==null || request.operationId()==null || request.proposal()==null || request.stamp()==null || !request.stamp().matches("[a-f0-9]{64}"))throw DomainError.invalid("Revisá el impacto antes de confirmar.");
        String content=canonical(Map.of("id",id,"proposal",request.proposal(),"stamp",request.stamp()));
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);admin(actor);
        var previous=db.queryForList("select invalidada_en,contenido,resultado::text from aulas.operacion_calendario where actor=? and clave=?",actor,request.operationId());
        if(!previous.isEmpty()){OperationRecovery.requireCurrent(previous.getFirst());if(!previous.getFirst().get("contenido").equals(content))throw DomainError.conflict("La clave corresponde a otro cambio de calendario.");return json.readValue(previous.getFirst().get("resultado").toString(),Map.class);}
        if(db.queryForList("select id_anio_lectivo from aulas.anio_lectivo where id_anio_lectivo=? for update",Long.class,id).isEmpty())throw new DomainError(404,"NOT_FOUND","El año no existe.");
        var related=reservations(id);
        var roomIds=db.queryForList("select distinct p.id_aula from aulas.patron_semanal p join aulas.reserva r using(id_reserva) join aulas.curso c using(id_curso) where c.id_anio_lectivo=? order by p.id_aula",Long.class,id);
        for(long room:roomIds)db.queryForObject("select id_aula from aulas.aula where id_aula=? for update",Long.class,room);
        for(var r:related)db.queryForObject("select id_reserva from aulas.reserva where id_reserva=? for update",Long.class,r.get("id_reserva"));
        var reviewed=review(id,request.proposal());
        if(!reviewed.canConfirm())throw DomainError.conflict("Hay interferencias. No se guardó el calendario ni nuevas clases. Volvé a revisar el impacto.");
        if(!reviewed.stamp().equals(request.stamp()))throw DomainError.conflict("El impacto cambió después de la revisión. Revisá nuevamente versiones, fechas y aulas.");
        var current=calendars.get(id);var saved=calendars.persist(actor,id,current,request.proposal());var instant=clock.instant();
        var affected=new TreeSet<Long>();
        for(var a:reviewed.added()){
            long booking=Long.parseLong(a.booking());affected.add(booking);
            db.update("insert into aulas.detalle_reserva(id_reserva,id_patron,id_aula,fecha,fecha_original,hora_inicio,cantidad_modulos) values (?,?,?,?,?,?,?)",booking,Long.parseLong(a.pattern()),Long.parseLong(a.roomId()),LocalDate.parse(a.date()),LocalDate.parse(a.date()),LocalTime.parse(a.start()),a.modules());
        }
        for(long booking:affected){
            db.update("update aulas.reserva set version=version+1 where id_reserva=?",booking);
            String detail=String.join("; ",reviewed.added().stream().filter(a->a.booking().equals(Long.toString(booking))).map(a->a.date()+" "+a.start()+"–"+a.end()+" · aula "+a.room()).toList());
            db.update("insert into aulas.evento_auditoria(actor,instante,operacion,entidad,entidad_id,resultado,detalle) values (?,?,'EXTENDER_CALENDARIO','RESERVA',?,'CONFIRMADO',?)",actor,instant.atOffset(ZoneOffset.UTC),booking,"Clases agregadas por calendario: "+detail);
        }
        var result=Map.<String,Object>of("operationId",request.operationId().toString(),"calendar",saved,"added",reviewed.added(),"at",instant.toString());
        db.update("insert into aulas.operacion_calendario(actor,clave,id_anio_lectivo,contenido,resultado) values (?,?,?,?,?::jsonb)",actor,request.operationId(),id,content,json.writeValueAsString(result));
        return json.readValue(json.writeValueAsString(result),Map.class);
    }
}
