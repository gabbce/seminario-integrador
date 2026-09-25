package ar.edu.aulas.reservations;

import ar.edu.aulas.accounts.Account;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservas/esporadicas")
public class SporadicController {
    private final SporadicPreparation preparation;
    private final SporadicConfirmation confirmation;
    public SporadicController(SporadicPreparation preparation,SporadicConfirmation confirmation) {this.preparation=preparation;this.confirmation=confirmation;}
    @PostMapping("/preparacion")
    public SporadicPreparation.Preparation prepare(@RequestAttribute("aulas.account") Account actor,@RequestBody SporadicPreparation.Request request) {
        return preparation.prepare(request,!actor.rol().equals("DOCENTE"));
    }
    @PostMapping("/confirmacion")
    public Map<String,Object> confirm(@RequestAttribute("aulas.account") Account actor,@RequestBody SporadicConfirmation.Request request) {
        return confirmation.confirm(actor.id(),request);
    }
}
