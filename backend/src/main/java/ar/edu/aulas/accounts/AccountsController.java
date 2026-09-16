package ar.edu.aulas.accounts;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/administracion/cuentas")
public class AccountsController {
    private final AccountManagement accounts;
    public AccountsController(AccountManagement accounts) { this.accounts=accounts; }
    @GetMapping public AccountManagement.Page list(@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="") String role,@RequestParam(defaultValue="") String status,@RequestParam(defaultValue="name") String sort,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) { return accounts.list(query,role,status,sort,page,size); }
    @PutMapping("/{id}") public AccountManagement.User edit(@RequestAttribute("aulas.account") Account actor,@PathVariable long id,@RequestBody AccountManagement.Edit edit) { return accounts.edit(actor.id(),id,edit); }
}
