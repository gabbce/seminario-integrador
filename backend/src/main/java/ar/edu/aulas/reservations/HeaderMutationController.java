package ar.edu.aulas.reservations;

import ar.edu.aulas.accounts.Account;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservas")
public class HeaderMutationController {
    private final HeaderMutationService service;
    public HeaderMutationController(HeaderMutationService service){this.service=service;}
    @PostMapping("/{id}/cabecera")
    public Map<String,Object> save(@RequestAttribute("aulas.account")Account actor,@PathVariable long id,@RequestBody HeaderMutationService.Request request){return service.save(actor.id(),id,request);}
}
