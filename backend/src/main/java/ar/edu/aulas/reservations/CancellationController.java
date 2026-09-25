package ar.edu.aulas.reservations;

import ar.edu.aulas.accounts.Account;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservas")
public class CancellationController {
    private final CancellationService service;
    public CancellationController(CancellationService service){this.service=service;}
    @PostMapping("/{id}/cancelaciones/preparacion")
    public Map<String,Object> prepare(@RequestAttribute("aulas.account")Account actor,@PathVariable long id,@RequestBody CancellationService.Request request){return service.prepare(actor.id(),id,request);}
    @PostMapping("/{id}/cancelaciones/confirmacion")
    public Map<String,Object> confirm(@RequestAttribute("aulas.account")Account actor,@PathVariable long id,@RequestBody CancellationService.Request request){return service.confirm(actor.id(),id,request);}
    @GetMapping("/mutaciones/{key}")
    public Map<String,Object> operation(@RequestAttribute("aulas.account")Account actor,@PathVariable UUID key){return service.operation(actor.id(),key);}
}
