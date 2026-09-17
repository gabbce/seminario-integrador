package ar.edu.aulas.reservations;

import ar.edu.aulas.accounts.Account;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservas")
public class ReservationsController {
    private final PeriodicConfirmation confirmation;
    private final ReservationQueries queries;
    public ReservationsController(PeriodicConfirmation confirmation,ReservationQueries queries) {this.confirmation=confirmation;this.queries=queries;}
    @PostMapping("/periodicas/confirmacion")
    public Map<String,Object> confirm(@RequestAttribute("aulas.account")Account actor,@RequestBody PeriodicConfirmation.Request request) {return confirmation.confirm(actor.id(),request);}
    @GetMapping public List<Map<String,Object>> list(@RequestAttribute("aulas.account")Account actor) {return queries.list(!actor.rol().equals("DOCENTE"));}
    @GetMapping("/{id}") public Map<String,Object> get(@RequestAttribute("aulas.account")Account actor,@PathVariable long id) {return queries.get(id,!actor.rol().equals("DOCENTE"));}
    @GetMapping("/operaciones/{key}") public Map<String,Object> operation(@RequestAttribute("aulas.account")Account actor,@PathVariable UUID key) {return queries.operation(actor.id(),key,!actor.rol().equals("DOCENTE"));}
}
