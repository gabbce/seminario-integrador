package ar.edu.aulas.reservations;

import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class AlternativeRankingTests {
 private PeriodicPreparation.Room room(long id,int capacity) {return new PeriodicPreparation.Room(Long.toString(id),"A"+id,0,"General",capacity);}
 private AlternativeRanking.Occupied occupied(long room,String date,String start,int modules,String modality) {
  return new AlternativeRanking.Occupied(room,LocalDate.parse(date),LocalTime.parse(start),modules,Long.toString(room),"Historia","001-A-2027",modality,"Laura Gómez",null,null);
 }
 @Test void rankingUsesGroupsAndTheirExactLexicographicCriteria() {
  var candidates=List.of(room(1,40),room(2,30),room(3,30),room(4,30),room(5,30),room(6,30));
  var dates=Set.of("2027-03-08","2027-03-15","2027-03-22");
  var busy=List.of(
   occupied(1,"2027-03-08","09:00",2,"sporadic"),
   occupied(2,"2027-03-08","09:00",1,"sporadic"),
   occupied(3,"2027-03-08","09:00",1,"sporadic"),occupied(3,"2027-03-15","09:00",1,"sporadic"),
   occupied(4,"2027-03-08","09:00",1,"periodic"),occupied(4,"2027-03-15","09:00",1,"sporadic"),
   occupied(5,"2027-03-08","09:00",1,"periodic"),
   occupied(6,"2027-03-08","09:00",2,"periodic")
  );
  var ranked=AlternativeRanking.rank(candidates,busy,dates,LocalTime.of(9,0),LocalTime.of(11,0));
  assertThat(ranked).extracting(a->a.room().id()).containsExactly("A2","A1","A3","A5","A4","A6");
  assertThat(ranked.get(3).group()).isEqualTo("WITH_PERIODIC");assertThat(ranked.get(2).sporadicDates()).isEqualTo(2);
 }
 @Test void minutesAreUnionPerDateAndModalityWithClippingAndContiguousEndpoints() {
  var busy=List.of(
   occupied(1,"2027-03-08","08:30",3,"sporadic"),occupied(1,"2027-03-08","09:30",3,"sporadic"),
   occupied(1,"2027-03-08","09:00",1,"periodic"),occupied(1,"2027-03-08","09:00",2,"periodic"),
   occupied(1,"2027-03-15","09:00",1,"periodic"),
   occupied(1,"2027-03-08","11:00",2,"periodic"),occupied(1,"2027-03-08","08:00",2,"sporadic"),
   occupied(1,"2027-03-22","09:00",2,"periodic")
  );
  var a=AlternativeRanking.rank(List.of(room(1,30)),busy,Set.of("2027-03-08","2027-03-15"),LocalTime.of(9,0),LocalTime.of(11,0)).getFirst();
  assertThat(a.sporadicDates()).isEqualTo(1);assertThat(a.sporadicMinutes()).isEqualTo(120);assertThat(a.periodicMinutes()).isEqualTo(90);
  assertThat(a.conflicts()).hasSize(5);assertThat(a.conflicts().getFirst().overlapStart()).isEqualTo("09:00");assertThat(a.conflicts().getFirst().overlapMinutes()).isEqualTo(60);
 }
 @Test void sameDaySporadicConflictsCountOnceAndCapacityThenIdentifierBreakTies() {
  var candidates=List.of(room(4,40),room(3,30),room(2,30),room(1,30));
  var busy=new ArrayList<AlternativeRanking.Occupied>();
  for(long id:List.of(1L,2L,3L,4L)){busy.add(occupied(id,"2027-03-08","09:00",1,"sporadic"));busy.add(occupied(id,"2027-03-08","10:00",1,"sporadic"));}
  var ranked=AlternativeRanking.rank(candidates,busy,Set.of("2027-03-08"),LocalTime.of(9,0),LocalTime.of(11,0));
  assertThat(ranked).extracting(a->a.room().id()).containsExactly("A1","A2","A3","A4");
  assertThat(ranked).allSatisfy(a->{assertThat(a.sporadicDates()).isEqualTo(1);assertThat(a.sporadicMinutes()).isEqualTo(60);});
 }
}
