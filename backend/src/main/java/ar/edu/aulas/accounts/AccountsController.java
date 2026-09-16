package ar.edu.aulas.accounts;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/administracion/cuentas")
public class AccountsController {
    private final AccountManagement accounts;
    private final IdentityManagement identities;
    public AccountsController(AccountManagement accounts,IdentityManagement identities) { this.accounts=accounts;this.identities=identities; }
    @GetMapping public AccountManagement.Page list(@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="") String role,@RequestParam(defaultValue="") String status,@RequestParam(defaultValue="name") String sort,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) { return accounts.list(query,role,status,sort,page,size); }
    @PutMapping("/{id}") public AccountManagement.User edit(@RequestAttribute("aulas.account") Account actor,@PathVariable long id,@RequestBody AccountManagement.Edit edit) { return accounts.edit(actor.id(),id,edit); }
    @PostMapping public AccountManagement.User create(@RequestAttribute("aulas.account") Account actor,@RequestBody IdentityManagement.Create request) {return identities.create(actor.id(),request);}
    @PutMapping("/{id}/email") public AccountManagement.User email(@RequestAttribute("aulas.account") Account actor,@PathVariable long id,@RequestBody IdentityManagement.Email request) {return identities.email(actor.id(),id,request);}
    @PutMapping("/{id}/password") public java.util.Map<String,String> password(@RequestAttribute("aulas.account") Account actor,@PathVariable long id,@RequestBody IdentityManagement.Password request) {identities.password(actor.id(),id,request);return java.util.Map.of("message","Contraseña actualizada.");}
}
