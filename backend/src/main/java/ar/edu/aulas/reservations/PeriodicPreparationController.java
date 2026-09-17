package ar.edu.aulas.reservations;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservas/periodicas")
public class PeriodicPreparationController {
    private final PeriodicPreparation preparation;
    public PeriodicPreparationController(PeriodicPreparation preparation) {this.preparation=preparation;}
    @PostMapping("/preparacion")
    public PeriodicPreparation.Preparation prepare(@RequestBody PeriodicPreparation.Request request) {
        return preparation.prepare(request);
    }
}
