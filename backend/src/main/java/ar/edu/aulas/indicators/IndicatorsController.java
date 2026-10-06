package ar.edu.aulas.indicators;
import java.time.LocalDate;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/indicadores")
public class IndicatorsController {
    private final IndicatorQueries queries;
    public IndicatorsController(IndicatorQueries queries) {this.queries=queries;}
    @GetMapping("/serie")
    public IndicatorQueries.Series series(@RequestParam LocalDate from,@RequestParam LocalDate to,@RequestParam(defaultValue="day") String view,
            @RequestParam(defaultValue="") String room,@RequestParam(defaultValue="") String type,
            @RequestParam(defaultValue="") String location,@RequestParam(required=false) Integer floor,@RequestParam(defaultValue="0") int minCapacity,
            @RequestParam(required=false) Integer maxCapacity,@RequestParam(defaultValue="") String resources) {
        return queries.series(from,to,rooms(room,location,floor,minCapacity,maxCapacity,resources),type,view);
    }
    @GetMapping("/resumen")
    public IndicatorQueries.Summary summary(@RequestParam LocalDate from,@RequestParam LocalDate to,
            @RequestParam(defaultValue="") String room,@RequestParam(defaultValue="") String type,
            @RequestParam(defaultValue="") String location,@RequestParam(required=false) Integer floor,@RequestParam(defaultValue="0") int minCapacity,
            @RequestParam(required=false) Integer maxCapacity,@RequestParam(defaultValue="") String resources) {
        return queries.summary(from,to,rooms(room,location,floor,minCapacity,maxCapacity,resources),type);
    }
    private static IndicatorQueries.RoomFilter rooms(String room,String location,Integer floor,int minCapacity,Integer maxCapacity,String resources) {
        var wanted=java.util.Arrays.stream(resources.split(",")).map(String::strip).filter(r->!r.isEmpty()).toList();
        return new IndicatorQueries.RoomFilter(room,location,floor,minCapacity,maxCapacity,wanted);
    }
}
