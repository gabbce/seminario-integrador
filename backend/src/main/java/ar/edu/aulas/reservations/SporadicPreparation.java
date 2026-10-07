package ar.edu.aulas.reservations;

import ar.edu.aulas.api.DomainError;
import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.rooms.RoomsService;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SporadicPreparation {
    public record DateSlot(String date,String start,Integer modules) {}
    public record Request(Integer year,String courseId,Integer students,String type,String board,List<String> resources,List<DateSlot> dates) {}
    public record PreparedDate(String date,String start,String end,List<PeriodicPreparation.Room> availableRooms,int compatibleCount,List<AlternativeRanking.Alternative> alternatives) {}
    public record Preparation(int year,long calendarVersion,List<PreparedDate> dates) {}
    private final JdbcTemplate db;
    private final CalendarManagement calendars;
    private final RoomsService rooms;
    private final Clock clock;
    public SporadicPreparation(JdbcTemplate db,CalendarManagement calendars,RoomsService rooms,ObjectProvider<Clock> clocks) {
        this.db=db;this.calendars=calendars;this.rooms=rooms;this.clock=clocks.getIfAvailable(Clock::systemUTC).withZone(ZoneId.of("America/Argentina/Cordoba"));
    }
    void validate(Request r) {
        if(r==null || r.year()==null || r.year()<1 || r.year()>9999 || r.students()==null || r.students()<1
            || r.type()==null || !List.of("General","Multimedios","Laboratorio").contains(r.type()) || r.resources()==null
            || r.dates()==null || r.dates().isEmpty() || r.dates().size()>366)
            throw DomainError.invalid("Completá año, alumnos, tipo y al menos una fecha.");
        if(r.courseId()!=null && !r.courseId().matches("[1-9][0-9]{0,17}")) throw DomainError.invalid("Curso inválido.");
        if(r.board()!=null && !List.of("","Tiza","Fibrón").contains(r.board())) throw DomainError.invalid("Pizarrón inválido.");
        var allowed=r.type().equals("Multimedios")?List.of("fans","air","projector","television","computer"):List.of("fans","air");
        if(r.resources().stream().anyMatch(v->v==null || !allowed.contains(v)) || new HashSet<>(r.resources()).size()!=r.resources().size())
            throw DomainError.invalid("Los recursos deben corresponder al tipo solicitado, sin duplicados.");
        Set<String> dates=new HashSet<>();var rejected=new ArrayList<String>();
        for(int index=0;index<r.dates().size();index++) {
            var slot=r.dates().get(index);
            if(slot==null){rejected.add("La fila "+(index+1)+" no contiene una fecha válida.");continue;}
            String label=slot.date()==null?"(sin fecha)":slot.date();LocalDate date=null;
            try {date=LocalDate.parse(slot.date());if(!date.toString().equals(slot.date()))throw new IllegalArgumentException();}
            catch(RuntimeException e){rejected.add("La fecha "+label+" no es válida.");}
            if(date!=null) {
                if(date.getYear()!=r.year())rejected.add("La fecha "+label+" no pertenece al año lectivo "+r.year()+".");
                if(date.getDayOfWeek().getValue()>5)rejected.add("La fecha "+label+" es "+(date.getDayOfWeek()==DayOfWeek.SATURDAY?"sábado":"domingo")+": solo se reservan días de lunes a viernes.");
            }
            if(!dates.add(slot.date()))rejected.add("La fecha "+label+" está repetida.");
            if(slot.modules()==null || slot.modules()<1 || slot.modules()>32 || slot.start()==null
                || !slot.start().matches("(0[7-9]|1[0-9]|2[0-2]):(00|30)")
                || LocalTime.parse(slot.start()).toSecondOfDay()+slot.modules()*1800>23*3600)
                rejected.add("El horario del "+label+" debe quedar entre 07 y 23, en módulos de 30 minutos.");
        }
        if(!rejected.isEmpty())throw DomainError.invalid(String.join(" ",rejected)+" Revisá todas las fechas y sus horarios.");
    }

    @Transactional(readOnly=true,isolation=org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
    public Preparation prepare(Request r,boolean operational) {
        validate(r);
        var ids=db.queryForList("select id_anio_lectivo from aulas.anio_lectivo where anio_calendario=?",Long.class,r.year());
        if(ids.isEmpty()) throw new DomainError(404,"NOT_FOUND","El año no existe.");
        var calendar=calendars.get(ids.getFirst());
        if(!calendar.state().equals("Habilitado")) throw DomainError.conflict("El año debe estar habilitado.");
        if(r.courseId()!=null && db.queryForObject("select count(*) from aulas.curso where id_curso=? and id_anio_lectivo=?",Long.class,Long.parseLong(r.courseId()),ids.getFirst())==0)
            throw DomainError.invalid("El curso debe pertenecer al año seleccionado.");
        var now=LocalDateTime.now(clock);
        var rejected=new ArrayList<String>();
        for(var slot:r.dates().stream().sorted(Comparator.comparing(DateSlot::date)).toList()) {
            if(!LocalDate.parse(slot.date()).atTime(LocalTime.parse(slot.start())).isAfter(now))
                rejected.add("La clase del "+slot.date()+" ya comenzó.");
            if(calendar.holidays().contains(slot.date()))rejected.add("La fecha "+slot.date()+" es feriado.");
        }
        if(!rejected.isEmpty())throw DomainError.conflict(String.join(" ",rejected)+" Revisá todas las fechas.");
        var compatible=rooms.references().stream().filter(room->room.state().equals("Habilitada") && room.type().equals(r.type())
            && room.capacity()>=r.students() && (r.board()==null || r.board().isEmpty() || r.board().equals(room.board()))
            && room.resources().containsAll(r.resources()))
            .sorted(Comparator.comparing(RoomsService.Room::capacity).thenComparing(RoomsService.Room::id))
            .map(room->new PeriodicPreparation.Room(room.internalId(),room.id(),room.version(),room.type(),room.capacity())).toList();
        var ordered=r.dates().stream().sorted(Comparator.comparing(DateSlot::date)).toList();
        var windows=ordered.stream().map(p->new ReservationOccupancy.Window(null,LocalDate.parse(p.date()),LocalTime.parse(p.start()),LocalTime.parse(p.start()).plusMinutes(p.modules()*30L))).toList();
        var occupied=ReservationOccupancy.read(db,LocalDate.parse(ordered.getFirst().date()),LocalDate.parse(ordered.getLast().date()),operational,compatible.stream().map(room->Long.parseLong(room.internalId())).toList(),windows);
        var result=new ArrayList<PreparedDate>();
        for(var slot:ordered) {
            var start=LocalTime.parse(slot.start());var end=start.plusMinutes(slot.modules()*30L);var dates=Set.of(slot.date());
            var available=compatible.stream().filter(room->occupied.stream().noneMatch(o->o.room()==Long.parseLong(room.internalId()) && AlternativeRanking.overlaps(o,dates,start,end))).toList();
            var alternatives=available.isEmpty()?AlternativeRanking.rank(compatible,occupied,dates,start,end).stream()
                .sorted(Comparator.comparingInt((AlternativeRanking.Alternative a)->a.sporadicMinutes()+a.periodicMinutes()).thenComparingInt(a->a.room().capacity()).thenComparing(a->a.room().id())).toList():List.<AlternativeRanking.Alternative>of();
            result.add(new PreparedDate(slot.date(),slot.start(),end.toString(),available,compatible.size(),alternatives));
        }
        return new Preparation(r.year(),calendar.version(),result);
    }
}
