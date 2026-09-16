package ar.edu.aulas.calendar;

import ar.edu.aulas.accounts.Account;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
public class CalendarsController {
    private final CalendarManagement calendars;
    public CalendarsController(CalendarManagement calendars) {this.calendars=calendars;}
    @GetMapping("/api/referencias/calendarios") public List<CalendarManagement.Config> list() {return calendars.list();}
    @GetMapping("/api/referencias/calendarios/{id}") public CalendarManagement.Config get(@PathVariable long id) {return calendars.get(id);}
    @PostMapping("/api/administracion/calendarios") @ResponseStatus(HttpStatus.CREATED)
    public CalendarManagement.Config create(@RequestAttribute("aulas.account") Account actor,@RequestBody CalendarManagement.Create request) {return calendars.create(actor.id(),request);}
    @PutMapping("/api/administracion/calendarios/{id}") public CalendarManagement.Config edit(@RequestAttribute("aulas.account") Account actor,@PathVariable long id,@RequestBody CalendarManagement.Edit request) {return calendars.edit(actor.id(),id,request);}
    @DeleteMapping("/api/administracion/calendarios/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestAttribute("aulas.account") Account actor,@PathVariable long id,@RequestParam Long version) {calendars.delete(actor.id(),id,version);}
}
