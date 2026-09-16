package ar.edu.aulas.security;

import java.io.IOException;
import jakarta.servlet.http.HttpServletResponse;

final class ApiErrors {
    private ApiErrors() {}
    static void authentication(jakarta.servlet.http.HttpServletRequest request, HttpServletResponse response, org.springframework.security.core.AuthenticationException error) throws IOException {
        if (error instanceof org.springframework.security.authentication.AuthenticationServiceException)
            write(response,503,"AUTH_UNAVAILABLE","No se pudo verificar la sesión. Intentá nuevamente.");
        else write(response,401,"INVALID_SESSION","Sesión ausente o vencida. Volvé a ingresar.");
    }
    static void write(HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        // Only fixed server-authored strings, never user input.
        response.getWriter().write("{\"code\":\""+code+"\",\"message\":\""+message+"\"}");
    }
}
