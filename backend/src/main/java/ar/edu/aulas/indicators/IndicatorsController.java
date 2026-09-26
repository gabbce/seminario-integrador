package ar.edu.aulas.indicators;
import java.time.LocalDate;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/indicadores")
public class IndicatorsController {
    private final IndicatorQueries queries;
    public IndicatorsController(IndicatorQueries queries) {this.queries=queries;}
    @GetMapping("/resumen")
    public IndicatorQueries.Summary summary(@RequestParam LocalDate from,@RequestParam LocalDate to,
            @RequestParam(defaultValue="") String room,@RequestParam(defaultValue="") String type) {
        return queries.summary(from,to,room,type);
    }
}
