package ar.edu.aulas.indicators;

import ar.edu.aulas.api.DomainError;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
public class IndicatorQueries {
    static final ZoneId ZONE=ZoneId.of("America/Argentina/Buenos_Aires");
    private final JdbcTemplate db;
    private final Clock clock;
    public IndicatorQueries(JdbcTemplate db,org.springframework.beans.factory.ObjectProvider<Clock> clocks) {this.db=db;this.clock=clocks.getIfAvailable(Clock::systemUTC);}
    public record Breakdown(String label,double hours,double availableHours,int classes) {}
    public record Summary(String from,String to,String room,String type,double hours,double availableHours,Double occupancy,
                          int classes,boolean unknownCoverage,boolean eligible,boolean forecast,List<Breakdown> demand,List<Breakdown> rooms) {}
    record History(Instant from,Instant to,String type,boolean enabled) {}
    record Room(long id,String label,List<History> history) {}
    record Occurrence(long id,long room,LocalDate date,LocalTime start,int modules,int students) {}
    record Source(List<Room> rooms,List<Occurrence> occurrences,Set<LocalDate> eligibleDates,boolean missingCalendar) {}
    static class Totals {
        long reserved,available;
        Set<Long> classes=new HashSet<>();
        Breakdown row(String label) {return new Breakdown(label,reserved/2.0,available/2.0,classes.size());}
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Summary summary(LocalDate from,LocalDate to,String room,String type) {
        validate(from,to,room,type);
        return summarize(from,to,room,type,source(from,to,room));
    }
    public record Slot(String start,String end,Double students,Double classes) {}
    public record Day(String date,List<Slot> slots,long peakStudents,long peakClasses,List<String> peakStudentSlots,List<String> peakClassSlots,double studentHours,int classes) {}
    public record WeekDay(int day,List<String> dates,List<Slot> slots,Double studentHours,Double classes,Double peakStudents,Double peakClasses,Double peakDateStudents) {}
    public record Week(List<WeekDay> week,boolean eligible,Double peakStudents,Double peakClasses) {}
    public record Series(Summary summary,Day daily,Week weekly,double studentHours) {}
    static class Curve {
        long[] students=new long[32],classes=new long[32];Set<Long> occurrences=new HashSet<>();
        double studentHours(){return Arrays.stream(students).sum()/2.0;}
        long peakStudents(){return Arrays.stream(students).max().orElse(0);}
        long peakClasses(){return Arrays.stream(classes).max().orElse(0);}
    }
    private static String time(int index){return LocalTime.of(7,0).plusMinutes(index*30L).toString();}
    private static List<Slot> slots(Curve curve,double denominator) {
        var slots=new ArrayList<Slot>();
        for(int i=0;i<32;i++)slots.add(new Slot(time(i),time(i+1),denominator==0?null:curve.students[i]/denominator,denominator==0?null:curve.classes[i]/denominator));
        return slots;
    }
    private static List<String> peaks(long[] values,long max) {
        var peaks=new ArrayList<String>();for(int i=0;i<32;i++)if(values[i]==max)peaks.add(time(i)+"–"+time(i+1));return peaks;
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Series series(LocalDate from,LocalDate to,String room,String type,String view) {
        validate(from,to,room,type);
        if(!Set.of("day","week").contains(view)||view.equals("day")&&!from.equals(to))throw new DomainError(400,"INVALID_VIEW","La vista diaria requiere una única fecha.");
        var source=source(from,to,room);var summary=summarize(from,to,room,type,source);
        var rooms=new HashMap<Long,Room>();source.rooms().forEach(r->rooms.put(r.id(),r));
        var curves=new TreeMap<LocalDate,Curve>();
        for(var o:source.occurrences())for(int i=0;i<o.modules();i++) {
            var start=o.start().plusMinutes(i*30L);var history=at(rooms.get(o.room()).history(),instant(o.date(),start));
            if(!matches(type,history==null?"Sin historia":history.type()))continue;
            int index=(start.getHour()*60+start.getMinute()-420)/30;
            var curve=curves.computeIfAbsent(o.date(),k->new Curve());curve.students[index]+=o.students();curve.classes[index]++;curve.occurrences.add(o.id());
        }
        double studentHours=curves.values().stream().mapToDouble(Curve::studentHours).sum();
        if(view.equals("day")) {
            var curve=curves.getOrDefault(from,new Curve());
            return new Series(summary,new Day(from.toString(),slots(curve,1),curve.peakStudents(),curve.peakClasses(),peaks(curve.students,curve.peakStudents()),peaks(curve.classes,curve.peakClasses()),curve.studentHours(),curve.occurrences.size()),null,studentHours);
        }
        var week=new ArrayList<WeekDay>();
        for(int weekday=1;weekday<=5;weekday++) {
            final int day=weekday;
            var dates=source.eligibleDates().stream().filter(d->d.getDayOfWeek().getValue()==day).sorted().toList();
            var sum=new Curve();long classes=0;double peakDate=0;
            for(var date:dates) {
                var curve=curves.getOrDefault(date,new Curve());classes+=curve.occurrences.size();peakDate=Math.max(peakDate,curve.peakStudents());
                for(int i=0;i<32;i++){sum.students[i]+=curve.students[i];sum.classes[i]+=curve.classes[i];}
            }
            double count=dates.size();
            week.add(new WeekDay(day,dates.stream().map(LocalDate::toString).toList(),slots(sum,count),count==0?null:sum.studentHours()/count,count==0?null:classes/count,count==0?null:sum.peakStudents()/count,count==0?null:sum.peakClasses()/count,count==0?null:peakDate));
        }
        Double maxStudents=week.stream().map(WeekDay::peakStudents).filter(Objects::nonNull).max(Double::compare).orElse(null);
        Double maxClasses=week.stream().map(WeekDay::peakClasses).filter(Objects::nonNull).max(Double::compare).orElse(null);
        return new Series(summary,null,new Week(week,!source.eligibleDates().isEmpty(),maxStudents,maxClasses),studentHours);
    }
    private Summary summarize(LocalDate from,LocalDate to,String room,String type,Source source) {
        var total=new Totals();var types=new TreeMap<String,Totals>();var rooms=new TreeMap<String,Totals>();
        boolean unknown=source.missingCalendar();
        var byId=new HashMap<Long,Room>();source.rooms().forEach(r->byId.put(r.id(),r));
        for(var r:source.rooms()) for(var date:source.eligibleDates()) for(int i=0;i<32;i++) {
            var start=instant(date,LocalTime.of(7,0).plusMinutes(i*30L));var end=start.plusSeconds(1800);
            var history=at(r.history(),start);String kind=history==null?"Sin historia":history.type();
            if(!covered(r.history(),start,end,false)) unknown=true;
            if(matches(type,kind) && covered(r.history(),start,end,true)) {
                total.available++;types.computeIfAbsent(kind,k->new Totals()).available++;
                rooms.computeIfAbsent(r.label(),k->new Totals()).available++;
            }
        }
        for(var o:source.occurrences()) {
            var r=byId.get(o.room());
            for(int i=0;i<o.modules();i++) {
                var history=at(r.history(),instant(o.date(),o.start().plusMinutes(i*30L)));
                String kind=history==null?"Sin historia":history.type();
                if(!matches(type,kind)) continue;
                reserve(total,o.id());reserve(types.computeIfAbsent(kind,k->new Totals()),o.id());reserve(rooms.computeIfAbsent(r.label(),k->new Totals()),o.id());
            }
        }
        return new Summary(from.toString(),to.toString(),room,type,total.reserved/2.0,total.available/2.0,
            unknown||total.available==0?null:100.0*total.reserved/total.available,total.classes.size(),unknown,!source.eligibleDates().isEmpty(),
            to.isAfter(LocalDate.now(clock.withZone(ZONE))),types.entrySet().stream().map(e->e.getValue().row(e.getKey())).toList(),rooms.entrySet().stream().map(e->e.getValue().row(e.getKey())).toList());
    }
    private void reserve(Totals totals,long id) {totals.reserved++;totals.classes.add(id);}
    static boolean matches(String filter,String kind) {return filter.isEmpty()||filter.equals(kind);}
    static Instant instant(LocalDate date,LocalTime time) {return date.atTime(time).atZone(ZONE).toInstant();}
    static History at(List<History> history,Instant instant) {
        for(var h:history) if(!h.from().isAfter(instant)&&(h.to()==null||h.to().isAfter(instant))) return h;
        return null;
    }
    /** Advance through every interval, preserving gaps and exact event instants. */
    static boolean covered(List<History> history,Instant start,Instant end,boolean requireEnabled) {
        var cursor=start;
        while(cursor.isBefore(end)) {
            var h=at(history,cursor);
            if(h==null || (requireEnabled&&!h.enabled())) return false;
            if(h.to()==null||!h.to().isBefore(end)) return true;
            cursor=h.to();
        }
        return true;
    }
    private void validate(LocalDate from,LocalDate to,String room,String type) {
        if(from==null||to==null||from.isAfter(to)||from.getYear()<1||to.getYear()>9999||room==null||type==null||!Set.of("","General","Multimedios","Laboratorio","Sin historia").contains(type)) throw new DomainError(400,"INVALID_RANGE","Elegí un rango válido y revisá los filtros.");
    }
    private Source source(LocalDate from,LocalDate to,String room) {
        var args=room.isEmpty()?new Object[]{}:new Object[]{room};String roomWhere=room.isEmpty()?"":" where a.identificador=?";
        var history=new HashMap<Long,List<History>>();
        var hargs=new ArrayList<Object>();hargs.add(instant(to,LocalTime.MAX).atOffset(ZoneOffset.UTC));hargs.add(instant(from,LocalTime.MIN).atOffset(ZoneOffset.UTC));if(!room.isEmpty())hargs.add(room);
        db.query("select h.* from aulas.historial_aula h join aulas.aula a using(id_aula) where h.desde<=? and (h.hasta is null or h.hasta>?)"+(room.isEmpty()?"":" and a.identificador=?")+" order by h.desde desc,h.id desc",rs->{
            var until=rs.getObject("hasta",OffsetDateTime.class);
            history.computeIfAbsent(rs.getLong("id_aula"),k->new ArrayList<>()).add(new History(rs.getObject("desde",OffsetDateTime.class).toInstant(),until==null?null:until.toInstant(),rs.getString("tipo"),rs.getString("estado").equals("Habilitada")&&!rs.getBoolean("baja")));
        },hargs.toArray());
        var rooms=db.query("select a.id_aula,a.identificador from aulas.aula a"+roomWhere+" order by a.identificador",(rs,n)->new Room(rs.getLong(1),rs.getString(2),history.getOrDefault(rs.getLong(1),List.of())),args);
        var oargs=new ArrayList<Object>(List.of(from,to));if(!room.isEmpty())oargs.add(room);
        var occurrences=db.query("select d.id_detalle,d.id_aula,d.fecha,d.hora_inicio,d.cantidad_modulos,r.cantidad_alumnos from aulas.detalle_reserva d join aulas.reserva r using(id_reserva) join aulas.aula a using(id_aula) where d.fecha between ? and ? and d.estado<>'CANCELADA'"+(room.isEmpty()?"":" and a.identificador=?"),(rs,n)->new Occurrence(rs.getLong(1),rs.getLong(2),rs.getDate(3).toLocalDate(),rs.getTime(4).toLocalTime(),rs.getInt(5),rs.getInt(6)),oargs.toArray());
        var years=db.queryForList("select anio_calendario from aulas.anio_lectivo where anio_calendario between ? and ?",Integer.class,from.getYear(),to.getYear());
        var holidays=new HashSet<>(db.query("select fecha from aulas.feriado where fecha between ? and ?",(rs,n)->rs.getDate(1).toLocalDate(),from,to));
        var eligible=new TreeSet<LocalDate>();long coveredDays=0;
        for(int year:years) {
            var first=LocalDate.of(year,1,1);if(first.isBefore(from))first=from;
            var last=LocalDate.of(year,12,31);if(last.isAfter(to))last=to;
            coveredDays+=ChronoUnit.DAYS.between(first,last)+1;
            for(var day=first;!day.isAfter(last);day=day.plusDays(1)) if(day.getDayOfWeek().getValue()<=5&&!holidays.contains(day))eligible.add(day);
        }
        return new Source(rooms,occurrences,eligible,coveredDays!=ChronoUnit.DAYS.between(from,to)+1);
    }
}
