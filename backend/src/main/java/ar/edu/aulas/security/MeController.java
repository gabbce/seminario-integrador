package ar.edu.aulas.security;

import ar.edu.aulas.accounts.Account;
import java.util.ArrayList;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {
    public record Profile(long id,String nombre,String apellido,String email,String rol,List<String> permisos) {}
    @GetMapping("/api/me")
    public Profile me(@RequestAttribute("aulas.account") Account account) {
        var permissions=new ArrayList<>(List.of("agenda:read","disponibilidad:read","reservas:read","aulas:read"));
        if (!account.rol().equals("DOCENTE")) permissions.addAll(List.of("reservas:write","aulas:write","indicadores:read"));
        if (account.rol().equals("ADMINISTRADOR")) permissions.addAll(List.of("cuentas:write","calendario:write"));
        return new Profile(account.id(),account.nombre(),account.apellido(),account.email(),account.rol(),List.copyOf(permissions));
    }
}
