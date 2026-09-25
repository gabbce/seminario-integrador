package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.rooms.RoomsService;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

@Service
public class RescheduleService {
    public record DateChange(String detailId,String date,String start,Integer modules) {}
    public record Request(UUID operationId,Long version,List<DateChange> dates,Long calendarVersion,Map<String,Long> roomVersions) {}
    private record Move(long id,long room,String label,LocalDate original,LocalDate beforeDate,LocalTime beforeStart,int beforeModules,LocalDate date,LocalTime start,int modules) {
        LocalTime end(){return start.plusMinutes(modules*30L);}
        Map<String,Object> view(){return Map.of("id",Long.toString(id),"room",label,"originalDate",original.toString(),"before",Map.of("date",beforeDate.toString(),"start",beforeStart.toString(),"end",beforeStart.plusMinutes(beforeModules*30L).toString()),"after",Map.of("date",date.toString(),"start",start.toString(),"end",end().toString()));}
    }
    private record Review(List<Move> moves,Map<String,Object> result) {}
    private final JdbcTemplate db;
    private final CalendarManagement calendars;
    private final RoomsService rooms;
    private final Clock clock;
    private final ObjectMapper json;
    public RescheduleService(JdbcTemplate db,CalendarManagement calendars,RoomsService rooms,ObjectProvider<Clock> clocks,ObjectMapper json){this.db=db;this.calendars=calendars;this.rooms=rooms;this.clock=clocks.getIfAvailable(Clock::systemUTC).withZone(ZoneId.of("America/Argentina/Cordoba"));this.json=json;}
    private void operator(long actor){
        var roles=db.queryForList("select activo and rol in ('ADMINISTRADOR','BEDEL') from aulas.usuario where id_usuario=?",Boolean.class,actor);
        if(roles.isEmpty() || !Boolean.TRUE.equals(roles.getFirst()))throw new DomainError(403,"FORBIDDEN","Tu cuenta no permite reprogramar clases.");
    }
    private Request normalized(Request r,boolean confirming){
        if(r==null || r.version()==null || r.version()<0 || r.dates()==null || r.dates().isEmpty() || r.dates().size()>366)throw DomainError.invalid("Seleccioná clases y la versión de la reserva.");
        if(confirming && (r.operationId()==null || r.calendarVersion()==null || r.calendarVersion()<0 || r.roomVersions()==null || r.roomVersions().isEmpty()))throw DomainError.invalid("Revisá las fechas antes de confirmar la operación.");
        if(r.roomVersions()!=null && r.roomVersions().entrySet().stream().anyMatch(e->e.getKey()==null || !e.getKey().matches("[1-9][0-9]{0,17}") || e.getValue()==null || e.getValue()<0))throw DomainError.invalid("Versiones de aulas inválidas.");
        var ids=new HashSet<String>();var dates=new HashSet<String>();
        for(var d:r.dates()){
            if(d==null || d.detailId()==null || !d.detailId().matches("[1-9][0-9]{0,17}") || !ids.add(d.detailId()))throw DomainError.invalid("Seleccioná clases distintas por ID.");
            LocalDate date;
            try{date=LocalDate.parse(d.date());if(!date.toString().equals(d.date()))throw new IllegalArgumentException();}catch(RuntimeException e){throw DomainError.invalid("Indicá fechas válidas.");}
            if(date.getDayOfWeek().getValue()>5 || !dates.add(d.date()))throw DomainError.invalid("Elegí fechas distintas de lunes a viernes.");
            if(d.modules()==null || d.modules()<1 || d.modules()>32 || d.start()==null || !d.start().matches("(0[7-9]|1[0-9]|2[0-2]):(00|30)") || LocalTime.parse(d.start()).toSecondOfDay()+d.modules()*1800>23*3600)throw DomainError.invalid("Los horarios deben estar entre 07 y 23, en módulos de 30 minutos.");
        }
        return new Request(r.operationId(),r.version(),r.dates().stream().sorted(Comparator.comparing(DateChange::detailId)).toList(),r.calendarVersion(),r.roomVersions()==null?null:new TreeMap<>(r.roomVersions()));
    }
    private Map<String,Object> reservation(long id){
        var rows=db.queryForList("select r.*,c.id_anio_lectivo,exists(select 1 from aulas.reserva_periodica p where p.id_reserva=r.id_reserva) as periodic from aulas.reserva r join aulas.curso c using(id_curso) where r.id_reserva=?",id);
        if(rows.isEmpty())throw new DomainError(404,"NOT_FOUND","La reserva no existe.");return rows.getFirst();
    }
    private Review review(long id,Request request,LocalDateTime now,boolean confirming){
        var r=reservation(id);if(((Number)r.get("version")).longValue()!=request.version())throw DomainError.conflict("La reserva cambió. Volvé al detalle y revisá la versión actual.");
        var calendar=calendars.get(((Number)r.get("id_anio_lectivo")).longValue());
        if(!calendar.state().equals("Habilitado"))throw DomainError.conflict("El año debe estar habilitado para reprogramar.");
        var ranges=db.queryForList("select c.inicio,c.fin from aulas.periodo_asignado p join aulas.cuatrimestre c using(id_cuatrimestre) where p.id_reserva=?",id);
        var details=db.queryForList("select d.*,a.identificador from aulas.detalle_reserva d join aulas.aula a using(id_aula) where d.id_reserva=?",id);
        var moves=new ArrayList<Move>();var versions=new TreeMap<String,Long>();var inventory=new HashMap<Long,RoomsService.Room>();
        List<String> resources;
        try{resources=Arrays.asList((String[])((java.sql.Array)r.get("recursos")).getArray());}catch(java.sql.SQLException e){throw new IllegalStateException(e);}
        for(var change:request.dates()){
            long key=Long.parseLong(change.detailId());
            var d=details.stream().filter(row->((Number)row.get("id_detalle")).longValue()==key).findFirst().orElseThrow(()->DomainError.conflict("Una clase seleccionada no pertenece a la reserva."));
            LocalDate beforeDate=((java.sql.Date)d.get("fecha")).toLocalDate();LocalTime beforeStart=((java.sql.Time)d.get("hora_inicio")).toLocalTime();
            if(!d.get("estado").equals("CONFIRMADA") || !beforeDate.atTime(beforeStart).isAfter(now))throw DomainError.conflict("Una clase seleccionada ya comenzó o fue cancelada. No se guardó ningún cambio.");
            LocalDate date=LocalDate.parse(change.date());LocalTime start=LocalTime.parse(change.start());
            if(date.getYear()!=calendar.year())throw DomainError.conflict("La fecha debe pertenecer al mismo año de la reserva.");
            if(!date.atTime(start).isAfter(now))throw DomainError.conflict("La nueva fecha y hora deben ser futuras.");
            if(calendar.holidays().contains(date.toString()))throw DomainError.conflict("La fecha "+date+" es feriado.");
            if(Boolean.TRUE.equals(r.get("periodic")) && ranges.stream().noneMatch(range->!date.isBefore(((java.sql.Date)range.get("inicio")).toLocalDate()) && !date.isAfter(((java.sql.Date)range.get("fin")).toLocalDate())))throw DomainError.conflict("La fecha debe pertenecer a los períodos asignados. Fuera de ellos, cancelá la original y registrá una esporádica.");
            long roomId=((Number)d.get("id_aula")).longValue();var room=inventory.computeIfAbsent(roomId,rooms::get);versions.put(room.internalId(),room.version());
            if(!room.state().equals("Habilitada") || !room.type().equals(r.get("tipo_aula")) || room.capacity()<((Number)r.get("cantidad_alumnos")).intValue() || (r.get("pizarron")!=null && !room.board().equals(r.get("pizarron"))) || !room.resources().containsAll(resources))throw DomainError.conflict("El aula "+room.id()+" ya no cumple los requisitos de la reserva.");
            var original=d.get("fecha_original")==null?beforeDate:((java.sql.Date)d.get("fecha_original")).toLocalDate();
            moves.add(new Move(key,roomId,room.id(),original,beforeDate,beforeStart,((Number)d.get("cantidad_modulos")).intValue(),date,start,change.modules()));
        }
        if(confirming && (calendar.version()!=request.calendarVersion() || !versions.equals(request.roomVersions())))throw DomainError.conflict("El calendario o las aulas cambiaron después de la revisión. Volvé a revisar la propuesta.");
        var selected=moves.stream().map(Move::id).toList();
        for(var move:moves){
            if(details.stream().anyMatch(d->!selected.contains(((Number)d.get("id_detalle")).longValue()) && d.get("estado").equals("CONFIRMADA") && d.get("fecha").toString().equals(move.date().toString())))throw DomainError.conflict("Ya hay otra clase vigente de esta reserva en la fecha elegida.");
            boolean occupied=db.queryForList("select id_detalle from aulas.detalle_reserva where estado='CONFIRMADA' and id_aula=? and fecha=? and hora_inicio<? and hora_inicio+cantidad_modulos*interval '30 minutes'>?",Long.class,move.room(),move.date(),move.end(),move.start()).stream().anyMatch(detail->!selected.contains(detail));
            if(occupied)throw DomainError.conflict("El aula "+move.label()+" está ocupada el "+move.date()+" en el nuevo horario. No se guardó ningún cambio.");
        }
        return new Review(moves,Map.of("reservationId",Long.toString(id),"version",request.version(),"calendarVersion",calendar.version(),"roomVersions",versions,"changes",moves.stream().map(Move::view).toList()));
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Map<String,Object> prepare(long actor,long id,Request request){operator(actor);var r=normalized(request,false);return review(id,r,LocalDateTime.now(clock),false).result();}
    @SuppressWarnings("unchecked")
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Map<String,Object> confirm(long actor,long id,Request request){
        var r=normalized(request,true);String content=json.writeValueAsString(new TreeMap<>(Map.of("reservationId",id,"version",r.version(),"dates",r.dates(),"calendarVersion",r.calendarVersion(),"roomVersions",r.roomVersions())));
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);operator(actor);
        var previous=db.queryForList("select tipo,id_reserva,contenido,resultado::text from aulas.mutacion_reserva where actor=? and clave=?",actor,r.operationId());
        if(!previous.isEmpty()){
            var old=previous.getFirst();if(!old.get("tipo").equals("REPROGRAMAR") || ((Number)old.get("id_reserva")).longValue()!=id || !old.get("contenido").equals(content))throw DomainError.conflict("La clave de operación corresponde a otro cambio.");
            Map<String,Object> result=json.readValue(old.get("resultado").toString(),Map.class);result.put("version",((Number)result.get("version")).longValue());result.put("calendarVersion",((Number)result.get("calendarVersion")).longValue());
            Map<String,Number> stored=(Map<String,Number>)result.get("roomVersions");var versions=new TreeMap<String,Long>();stored.forEach((key,value)->versions.put(key,value.longValue()));result.put("roomVersions",versions);return result;
        }
        var reservation=reservation(id);db.queryForObject("select id_anio_lectivo from aulas.anio_lectivo where id_anio_lectivo=? for update",Long.class,reservation.get("id_anio_lectivo"));
        for(long room:db.queryForList("select distinct id_aula from aulas.detalle_reserva where id_reserva=? order by id_aula",Long.class,id))db.queryForObject("select id_aula from aulas.aula where id_aula=? for update",Long.class,room);
        db.queryForObject("select id_reserva from aulas.reserva where id_reserva=? for update",Long.class,id);
        var instant=clock.instant();var reviewed=review(id,r,LocalDateTime.ofInstant(instant,clock.getZone()),true);
        db.execute("set constraints aulas.detalle_reserva_sin_solapamiento deferred");
        for(var m:reviewed.moves())db.update("update aulas.detalle_reserva set fecha=?,hora_inicio=?,cantidad_modulos=?,fecha_original=coalesce(fecha_original,fecha) where id_detalle=? and id_reserva=?",m.date(),m.start(),m.modules(),m.id(),id);
        db.execute("set constraints aulas.detalle_reserva_sin_solapamiento immediate");db.update("update aulas.reserva set version=version+1 where id_reserva=?",id);
        var result=new LinkedHashMap<>(reviewed.result());result.put("version",r.version()+1);result.put("operationId",r.operationId().toString());result.put("at",instant.toString());
        db.update("insert into aulas.mutacion_reserva(actor,clave,tipo,id_reserva,contenido,resultado) values (?,?,'REPROGRAMAR',?,?,?::jsonb)",actor,r.operationId(),id,content,json.writeValueAsString(result));
        var description=String.join("; ",reviewed.moves().stream().map(m->m.beforeDate()+" "+m.beforeStart()+"–"+m.beforeStart().plusMinutes(m.beforeModules()*30L)+" → "+m.date()+" "+m.start()+"–"+m.end()+" · aula "+m.label()+" · origen "+m.original()).toList());
        db.update("insert into aulas.evento_auditoria(actor,instante,operacion,entidad,entidad_id,resultado,detalle) values (?,?,'REPROGRAMAR','RESERVA',?,'CONFIRMADO',?)",actor,instant.atOffset(ZoneOffset.UTC),id,"Reprogramación: "+description);return result;
    }
}
