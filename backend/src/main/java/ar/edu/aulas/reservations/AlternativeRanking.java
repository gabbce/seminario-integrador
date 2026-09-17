package ar.edu.aulas.reservations;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.*;
import java.util.*;

/** Informational conflicts only: no alternative is a confirmable room selection. */
public final class AlternativeRanking {
    private AlternativeRanking() {}
    public record Registrant(String userId,String name,String email,boolean inactive) {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Conflict(String reservationId,String subject,String course,String modality,
                           String date,String start,String end,String overlapStart,String overlapEnd,
                           int overlapMinutes,String teacher,String teacherEmail,Registrant registrant) {}
    public record Alternative(PeriodicPreparation.Room room,String group,int sporadicDates,
                              int sporadicMinutes,int periodicMinutes,List<Conflict> conflicts) {}
    record Occupied(long room,LocalDate date,LocalTime start,int modules,String reservationId,
                    String subject,String course,String modality,String teacher,String teacherEmail,Registrant registrant) {}
    static boolean overlaps(Occupied o,Set<String> dates,LocalTime start,LocalTime end) {
        return dates.contains(o.date().toString()) && o.start().isBefore(end) && start.isBefore(o.start().plusMinutes(o.modules()*30L));
    }
    static List<Alternative> rank(List<PeriodicPreparation.Room> rooms,List<Occupied> occupied,
                                  Set<String> dates,LocalTime start,LocalTime end) {
        Map<Long,List<Conflict>> byRoom=new HashMap<>();
        for(var o:occupied) {
            if(!overlaps(o,dates,start,end)) continue;
            var finish=o.start().plusMinutes(o.modules()*30L);
            var from=o.start().isAfter(start)?o.start():start;var to=finish.isBefore(end)?finish:end;
            var conflict=new Conflict(o.reservationId(),o.subject(),o.course(),o.modality(),o.date().toString(),o.start().toString(),finish.toString(),from.toString(),to.toString(),(int)Duration.between(from,to).toMinutes(),o.teacher(),o.teacherEmail(),o.registrant());
            byRoom.computeIfAbsent(o.room(),ignored->new ArrayList<>()).add(conflict);
        }
        List<Alternative> result=new ArrayList<>();
        for(var room:rooms) {
            var conflicts=byRoom.getOrDefault(Long.parseLong(room.internalId()),List.of()).stream()
                .sorted(Comparator.comparing(Conflict::date).thenComparing(Conflict::start).thenComparing(Conflict::reservationId)).toList();
            if(conflicts.isEmpty()) continue;
            int periodic=unionMinutes(conflicts,"periodic"),sporadic=unionMinutes(conflicts,"sporadic");
            int sporadicDates=(int)conflicts.stream().filter(c->c.modality().equals("sporadic")).map(Conflict::date).distinct().count();
            result.add(new Alternative(room,periodic>0?"WITH_PERIODIC":"SPORADIC_ONLY",sporadicDates,sporadic,periodic,conflicts));
        }
        return result.stream().sorted(Comparator.comparingInt((Alternative a)->a.periodicMinutes()>0?1:0)
            .thenComparingInt(a->a.periodicMinutes()>0?a.periodicMinutes():a.sporadicDates())
            .thenComparingInt(a->a.periodicMinutes()>0?a.sporadicDates():a.sporadicMinutes())
            .thenComparingInt(a->a.room().capacity()).thenComparing(a->a.room().id())).toList();
    }
    private static int unionMinutes(List<Conflict> conflicts,String modality) {
        Map<String,List<Conflict>> days=new HashMap<>();
        conflicts.stream().filter(c->c.modality().equals(modality)).forEach(c->days.computeIfAbsent(c.date(),ignored->new ArrayList<>()).add(c));
        int total=0;
        for(var day:days.values()) {
            int from=-1,to=-1;
            for(var conflict:day.stream().sorted(Comparator.comparing(Conflict::overlapStart)).toList()) {
                int begin=LocalTime.parse(conflict.overlapStart()).toSecondOfDay()/60,finish=LocalTime.parse(conflict.overlapEnd()).toSecondOfDay()/60;
                if(from<0){from=begin;to=finish;}
                else if(begin<=to) to=Math.max(to,finish);
                else {total+=to-from;from=begin;to=finish;}
            }
            if(from>=0)total+=to-from;
        }
        return total;
    }
}
