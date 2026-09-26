package ar.edu.aulas.reservations;

import java.time.LocalDate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/consultas")
public class ConsultationsController {
    private final ConsultationQueries queries;
    public ConsultationsController(ConsultationQueries queries) {this.queries=queries;}
    @GetMapping("/agenda")
    public ConsultationQueries.Result agenda(@RequestParam LocalDate date,@RequestParam(defaultValue="day") String view,
            @RequestParam(defaultValue="") String room,@RequestParam(defaultValue="") String type) {
        return queries.agenda(date,view,room,type);
    }
    @GetMapping("/impresion-diaria")
    public ConsultationQueries.Result printDay(@RequestParam LocalDate date,@RequestParam(defaultValue="") String room,
            @RequestParam(defaultValue="") String type,@RequestParam(defaultValue="active") String status) {
        return queries.printDay(date,room,type,status);
    }
    @GetMapping("/listado")
    public ConsultationQueries.Result listing(@RequestParam(defaultValue="day") String mode,@RequestParam(required=false) LocalDate date,
            @RequestParam(required=false) Long courseId,@RequestParam(required=false) Integer year,
            @RequestParam(defaultValue="") String room,@RequestParam(defaultValue="") String type,
            @RequestParam(defaultValue="active") String status,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {
        return queries.listing(mode,date,courseId,year,room,type,status,page,size);
    }
}
