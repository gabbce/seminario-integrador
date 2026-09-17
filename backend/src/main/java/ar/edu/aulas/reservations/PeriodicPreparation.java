package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.rooms.RoomsService;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PeriodicPreparation {
    public record Pattern(Integer day, String start, Integer modules) {}
    public record Request(Integer year, String courseId, String period, Integer students, String type,
                          String board, List<String> resources, List<String> excluded, List<Pattern> patterns) {}
    public record Omission(String date, String reason) {}
    public record Room(String internalId, String id, long version, String type, int capacity) {}
    public record PreparedPattern(int day, String start, String end, List<String> dates,
                                  List<Omission> omitted, List<Room> availableRooms, int compatibleCount) {}
    public record Preparation(int year, long calendarVersion, List<PreparedPattern> patterns) {}
    private record Occupied(long room, LocalDate date, LocalTime start, int modules) {}
    private final JdbcTemplate db;
    private final CalendarManagement calendars;
    private final RoomsService rooms;
    private final Clock clock;
    @Autowired public PeriodicPreparation(JdbcTemplate db, CalendarManagement calendars, RoomsService rooms, ObjectProvider<Clock> clocks) {
        this(db, calendars, rooms, clocks.getIfAvailable(Clock::systemUTC));
    }
    public PeriodicPreparation(JdbcTemplate db, CalendarManagement calendars, RoomsService rooms, Clock clock) {
        this.db=db; this.calendars=calendars; this.rooms=rooms;
        this.clock=clock.withZone(ZoneId.of("America/Argentina/Cordoba"));
    }
    void validate(Request r) {
        if (r==null || r.year()==null || r.year()<1 || r.year()>9999 || r.period()==null || !List.of("first","second","annual").contains(r.period())
            || r.students()==null || r.students()<1 || r.type()==null || !List.of("General","Multimedios","Laboratorio").contains(r.type())
            || r.resources()==null || r.excluded()==null || r.patterns()==null || r.patterns().isEmpty() || r.patterns().size()>5)
            throw DomainError.invalid("Completá año, período, alumnos, tipo y días de la propuesta.");
        if(r.board()!=null && !List.of("","Tiza","Fibrón").contains(r.board())) throw DomainError.invalid("Pizarrón inválido.");
        var allowed=r.type().equals("Multimedios")?List.of("fans","air","projector","television","computer"):List.of("fans","air");
        if(r.resources().stream().anyMatch(resource->resource==null || !allowed.contains(resource)) || new HashSet<>(r.resources()).size()!=r.resources().size())
            throw DomainError.invalid("Los recursos deben corresponder al tipo solicitado, sin duplicados.");
        var days=new HashSet<Integer>();
        for(var p:r.patterns()) {
            if(p==null || p.day()==null || p.day()<1 || p.day()>5 || !days.add(p.day()) || p.modules()==null || p.modules()<1 || p.modules()>32
                || p.start()==null || !p.start().matches("(0[7-9]|1[0-9]|2[0-2]):(00|30)")
                || LocalTime.parse(p.start()).toSecondOfDay()+p.modules()*1800>23*3600)
                throw DomainError.invalid("Indicá un patrón por día, de lunes a viernes, entre 07 y 23 y en módulos de 30 minutos.");
        }
        if(new HashSet<>(r.excluded()).size()!=r.excluded().size()) throw DomainError.invalid("No repitas exclusiones.");
        if(r.courseId()!=null && !r.courseId().matches("[1-9][0-9]{0,17}")) throw DomainError.invalid("Curso inválido.");
    }
    @Transactional(readOnly=true, isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Preparation prepare(Request r) {
        validate(r);
        var yearIds=db.queryForList("select id_anio_lectivo from aulas.anio_lectivo where anio_calendario=?",Long.class,r.year());
        if(yearIds.isEmpty()) throw new DomainError(404,"NOT_FOUND","El año no existe.");
        var calendar=calendars.get(yearIds.getFirst());
        if(!calendar.state().equals("Habilitado")) throw DomainError.conflict("El año debe estar habilitado para consultar esta propuesta.");
        if(r.courseId()!=null && db.queryForObject("select count(*) from aulas.curso where id_curso=? and id_anio_lectivo=?",Long.class,Long.parseLong(r.courseId()),yearIds.getFirst())==0)
            throw DomainError.invalid("El curso debe pertenecer al año seleccionado.");
        var ranges=(r.period().equals("annual")?List.of("first","second"):List.of(r.period())).stream()
            .map(key->calendar.terms().get(key).stream().map(LocalDate::parse).toList()).toList();
        var start=ranges.getFirst().getFirst(); var end=ranges.getLast().getLast();
        Set<LocalDate> excluded=new HashSet<>();
        for(String raw:r.excluded()) {
            LocalDate date;
            try {date=LocalDate.parse(raw);if(!date.toString().equals(raw)) throw new IllegalArgumentException();}
            catch(RuntimeException invalid) {throw DomainError.invalid("Fecha excluida inválida.");}
            if(ranges.stream().noneMatch(range->!date.isBefore(range.getFirst()) && !date.isAfter(range.getLast()))
                || r.patterns().stream().noneMatch(p->p.day()==date.getDayOfWeek().getValue()))
                throw DomainError.invalid("Las exclusiones deben pertenecer al período y a los días seleccionados.");
            excluded.add(date);
        }
        var compatible=rooms.references().stream().filter(room->room.state().equals("Habilitada") && room.type().equals(r.type())
            && room.capacity()>=r.students() && (r.board()==null || r.board().isEmpty() || r.board().equals(room.board()))
            && room.resources().containsAll(r.resources())).sorted(Comparator.comparing(RoomsService.Room::capacity).thenComparing(RoomsService.Room::id)).toList();
        var occupied=db.query("select id_aula,fecha,hora_inicio,cantidad_modulos from aulas.detalle_reserva where estado='CONFIRMADA' and fecha between ? and ?",
            (rs,n)->new Occupied(rs.getLong(1),rs.getDate(2).toLocalDate(),rs.getTime(3).toLocalTime(),rs.getInt(4)),java.sql.Date.valueOf(start),java.sql.Date.valueOf(end));
        var now=LocalDateTime.now(clock);
        var result=new ArrayList<PreparedPattern>();
        for(var pattern:r.patterns()) {
            var time=LocalTime.parse(pattern.start()); var finish=time.plusMinutes(pattern.modules()*30L);
            var dates=new ArrayList<String>(); var omitted=new ArrayList<Omission>();
            for(var date=start;!date.isAfter(end);date=date.plusDays(1)) {
                if(date.getDayOfWeek().getValue()!=pattern.day()) continue;
                LocalDate current=date;
                String reason=ranges.stream().noneMatch(range->!current.isBefore(range.getFirst()) && !current.isAfter(range.getLast()))?"Receso"
                    :calendar.holidays().contains(date.toString())?"Feriado"
                    :!date.atTime(time).isAfter(now)?"Ya iniciada"
                    :excluded.contains(date)?"Exclusión manual":null;
                if(reason==null) dates.add(date.toString()); else omitted.add(new Omission(date.toString(),reason));
            }
            Set<String> effective=new HashSet<>(dates);
            var available=dates.isEmpty()?List.<Room>of():compatible.stream().filter(room->occupied.stream().noneMatch(o->o.room()==Long.parseLong(room.internalId())
                && effective.contains(o.date().toString()) && o.start().isBefore(finish) && time.isBefore(o.start().plusMinutes(o.modules()*30L))))
                .map(room->new Room(room.internalId(),room.id(),room.version(),room.type(),room.capacity())).toList();
            result.add(new PreparedPattern(pattern.day(),pattern.start(),finish.toString(),dates,omitted,available,compatible.size()));
        }
        return new Preparation(r.year(),calendar.version(),result);
    }
}
