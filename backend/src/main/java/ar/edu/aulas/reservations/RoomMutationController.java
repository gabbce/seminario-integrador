package ar.edu.aulas.reservations;
import ar.edu.aulas.accounts.Account;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/reservas/{id}/aulas")
public class RoomMutationController {
    private final RoomMutationService service;
    public RoomMutationController(RoomMutationService service){this.service=service;}
    @PostMapping("/opciones")
    public Map<String,Object> options(@RequestAttribute("aulas.account")Account actor,@PathVariable long id,@RequestBody RoomMutationService.Version request){return service.options(actor.id(),id,request);}
    @PostMapping("/preparacion")
    public Map<String,Object> prepare(@RequestAttribute("aulas.account")Account actor,@PathVariable long id,@RequestBody RoomMutationService.Request request){return service.prepare(actor.id(),id,request);}
    @PostMapping("/confirmacion")
    public Map<String,Object> confirm(@RequestAttribute("aulas.account")Account actor,@PathVariable long id,@RequestBody RoomMutationService.Request request){return service.confirm(actor.id(),id,request);}
}
