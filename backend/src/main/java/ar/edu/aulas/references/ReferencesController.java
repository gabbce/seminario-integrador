package ar.edu.aulas.references;

import ar.edu.aulas.accounts.Account;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/referencias")
public class ReferencesController {
    private final ReferenceManagement references;
    public ReferencesController(ReferenceManagement references) {this.references=references;}
    @GetMapping("/cursos") public List<ReferenceManagement.Course> courses(@RequestParam int year,@RequestParam(defaultValue="") String query) {return references.list(year,query);}
    @PostMapping("/cursos") public ReferenceManagement.Course create(@RequestAttribute("aulas.account") Account actor,@RequestBody ReferenceManagement.Create request) {return references.create(actor.id(),request);}
    @GetMapping("/docentes") public List<Map<String,String>> teachers(@RequestAttribute("aulas.account") Account actor) {return references.teachers(Set.of("ADMINISTRADOR","BEDEL").contains(actor.rol()));}
}
