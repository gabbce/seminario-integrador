package ar.edu.aulas.security;

import ar.edu.aulas.accounts.AccountRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

final class CurrentAccountFilter extends OncePerRequestFilter {
    private final AccountRepository accounts;
    CurrentAccountFilter(AccountRepository accounts) { this.accounts=accounts; }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
            throws ServletException, IOException {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken jwt) {
            UUID subject;
            try { subject=UUID.fromString(jwt.getToken().getSubject()); }
            catch (IllegalArgumentException | NullPointerException e) {
                ApiErrors.write(response,401,"INVALID_SESSION","Sesión inválida. Volvé a ingresar."); return;
            }
            try {
                var account=accounts.findByAuthId(subject).orElse(null);
                if (account==null || !account.activo()) {
                    ApiErrors.write(response,403,"ACCOUNT_UNAVAILABLE","La cuenta no tiene acceso habilitado. Contactá al administrador."); return;
                }
                var authenticated=new JwtAuthenticationToken(jwt.getToken(),List.of(new SimpleGrantedAuthority("ROLE_"+account.rol())));
                SecurityContextHolder.getContext().setAuthentication(authenticated);
                request.setAttribute("aulas.account",account);
            } catch (DataAccessException e) {
                ApiErrors.write(response,503,"PROFILE_UNAVAILABLE","No se pudo consultar el perfil. Intentá nuevamente."); return;
            }
        }
        chain.doFilter(request,response);
    }
}
