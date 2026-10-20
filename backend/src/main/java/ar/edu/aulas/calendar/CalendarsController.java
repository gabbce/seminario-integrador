package ar.edu.aulas.calendar;

import ar.edu.aulas.accounts.Account;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
public class CalendarsController {
    private final CalendarManagement calendars;
    private final CalendarImpactService impact;
    public CalendarsController(CalendarManagement calendars,CalendarImpactService impact) {this.calendars=calendars;this.impact=impact;}
    @GetMapping("/api/referencias/calendarios") public List<CalendarManagement.Config> list() {return calendars.list();}
    @GetMapping("/api/referencias/calendarios/{id}") public CalendarManagement.Config get(@PathVariable long id) {return calendars.get(id);}
    @GetMapping("/api/administracion/calendarios")
    public CalendarManagement.Page search(@RequestParam(required=false) Integer year,@RequestParam(defaultValue="") String state,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) {return calendars.search(year,state,page,size);}
    @GetMapping("/api/administracion/calendarios/{id}/cuatrimestres")
    public CalendarManagement.Terms searchTerms(@PathVariable long id,@RequestParam(defaultValue="") String from,@RequestParam(defaultValue="") String to) {return calendars.searchTerms(id,from,to);}
    @PostMapping("/api/administracion/calendarios") @ResponseStatus(HttpStatus.CREATED)
    public CalendarManagement.Config create(@RequestAttribute("aulas.account") Account actor,@RequestBody CalendarManagement.Create request) {return calendars.create(actor.id(),request);}
    @PutMapping("/api/administracion/calendarios/{id}") public CalendarManagement.Config edit(@RequestAttribute("aulas.account") Account actor,@PathVariable long id,@RequestBody CalendarManagement.Edit request) {return calendars.edit(actor.id(),id,request);}
    @PostMapping("/api/administracion/calendarios/{id}/impacto")
    public CalendarImpactService.Review prepare(@RequestAttribute("aulas.account") Account actor,@PathVariable long id,@RequestBody CalendarManagement.Edit request){return impact.prepare(actor.id(),id,request);}
    @PostMapping("/api/administracion/calendarios/{id}/confirmacion")
    public java.util.Map<String,Object> confirm(@RequestAttribute("aulas.account") Account actor,@PathVariable long id,@RequestBody CalendarImpactService.Request request){return impact.confirm(actor.id(),id,request);}
    @GetMapping("/api/administracion/calendarios/operaciones/{key}")
    public java.util.Map<String,Object> operation(@RequestAttribute("aulas.account") Account actor,@PathVariable java.util.UUID key){return impact.operation(actor.id(),key);}
    @DeleteMapping("/api/administracion/calendarios/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestAttribute("aulas.account") Account actor,@PathVariable long id,@RequestParam Long version) {calendars.delete(actor.id(),id,version);}
}
