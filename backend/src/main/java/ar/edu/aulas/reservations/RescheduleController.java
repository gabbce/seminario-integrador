package ar.edu.aulas.reservations;
import ar.edu.aulas.accounts.Account;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/reservas/{id}/reprogramacion")
public class RescheduleController {
    private final RescheduleService service;
    public RescheduleController(RescheduleService service){this.service=service;}
    @PostMapping("/preparacion")
    public Map<String,Object> prepare(@RequestAttribute("aulas.account")Account actor,@PathVariable long id,@RequestBody RescheduleService.Request request){return service.prepare(actor.id(),id,request);}
    @PostMapping("/confirmacion")
    public Map<String,Object> confirm(@RequestAttribute("aulas.account")Account actor,@PathVariable long id,@RequestBody RescheduleService.Request request){return service.confirm(actor.id(),id,request);}
}
