package ar.edu.aulas.accounts;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.core.env.Environment;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class SupabaseAuthAdmin implements AuthAdmin {
    private final Environment environment;
    public SupabaseAuthAdmin(Environment environment) { this.environment = environment; }

    private RestClient client() {
        String secret = environment.getProperty("AULAS_SUPABASE_SECRET_KEY");
        if (secret == null || secret.isBlank())
            throw new ar.edu.aulas.api.DomainError(503, "AUTH_NOT_CONFIGURED",
                "El servidor no tiene configurada la clave secreta de Supabase (AULAS_SUPABASE_SECRET_KEY), así que no puede crear ni modificar cuentas.");
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(15));
        return RestClient.builder().baseUrl(environment.getRequiredProperty("AULAS_SUPABASE_URL")+"/auth/v1")
            .requestFactory(factory)
            .defaultHeader("apikey", secret)
            .build();
    }
    record RemoteUser(UUID id, String email, Map<String,Object> app_metadata) {
        Identity identity() {
            if (id == null || email == null) throw new IllegalStateException("Respuesta de Auth incompleta");
            Object op = app_metadata == null ? null : app_metadata.get("aulas_provision_id");
            return new Identity(id, email, op instanceof String s ? s : null);
        }
    }
    record UserPage(java.util.List<RemoteUser> users) {}

    @Override public Optional<Identity> findByEmail(String email) {
        try {
            RestClient api = client();
            long deadline=System.nanoTime()+Duration.ofSeconds(30).toNanos();
            for (int page=1; page<=20; page++) {
                if (System.nanoTime()>deadline) throw new IllegalStateException();
                var result = api.get().uri("/admin/users?page={page}&per_page=100",page)
                    .retrieve().body(UserPage.class);
                if (result == null || result.users() == null) throw new IllegalStateException();
                for (var user: result.users())
                    if (email.equalsIgnoreCase(user.email())) return Optional.of(user.identity());
                if (result.users().size() < 100) return Optional.empty();
            }
            throw new IllegalStateException();
        } catch (ar.edu.aulas.api.DomainError e) {
            throw e;
        } catch (RuntimeException e) {
            throw new IllegalStateException("No se pudo comprobar Auth. Reintentar la preparación cuando el servicio esté disponible.");
        }
    }
    @Override public Optional<Identity> findById(UUID id) {
        try {
            var user=client().get().uri("/admin/users/{id}",id).retrieve().body(RemoteUser.class);
            if (user==null) throw new IllegalStateException();
            return Optional.of(user.identity());
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            return Optional.empty();
        } catch (ar.edu.aulas.api.DomainError e) {
            throw e;
        } catch (RuntimeException e) {
            throw new IllegalStateException("No se pudo comprobar la identidad Auth; reintentar cuando el servicio esté disponible.");
        }
    }
    @Override public Identity changeEmail(UUID id,String email) {
        var result=update(id,Map.of("email",email,"email_confirm",true));
        if(result==null) throw new IllegalStateException("Respuesta de Auth incompleta");
        return result.identity();
    }
    @Override public void changePassword(UUID id,String password) { update(id,Map.of("password",password)); }
    private RemoteUser update(UUID id,Map<String,Object> fields) {
        try { return client().put().uri("/admin/users/{id}",id).body(fields).retrieve().body(RemoteUser.class); }
        catch (org.springframework.web.client.HttpClientErrorException e) {
            if(e.getStatusCode().value()==400 || e.getStatusCode().value()==422)
                throw rejected(e.getResponseBodyAsString());
            throw new IllegalStateException("No se confirmó el cambio en Auth; su resultado puede ser incierto.");
        } catch (ar.edu.aulas.api.DomainError e) {throw e;
        } catch (RuntimeException e) {throw new IllegalStateException("No se confirmó el cambio en Auth; su resultado puede ser incierto.");}
    }
    @Override public Identity create(AccountSpec account, String password, UUID operationId) {
        try {
            var body = Map.of("email", account.email(), "password", password, "email_confirm", true,
                "app_metadata", Map.of("aulas_provision_id", operationId.toString()));
            var result = client().post().uri("/admin/users").body(body).retrieve().body(RemoteUser.class);
            if (result == null) throw new IllegalStateException();
            return result.identity();
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            if(e.getStatusCode().value()==400 || e.getStatusCode().value()==422)
                throw rejected(e.getResponseBodyAsString());
            throw new IllegalStateException("No se pudo confirmar el alta de Auth.");
        } catch (ar.edu.aulas.api.DomainError e) {
            throw e;
        } catch (RuntimeException e) {
            throw new IllegalStateException("Alta Auth no confirmada. Repetir el comando comprobará el resultado antes de crear otra identidad.");
        }
    }

    /** Translates a Supabase Auth rejection into the concrete reason shown to the administrator. */
    static ar.edu.aulas.api.DomainError rejected(String body) {
        String text = body == null ? "" : body;
        String code = field(text, "error_code"), message = field(text, "msg");
        if (message.isEmpty()) message = field(text, "message");
        if (code.equals("weak_password")) {
            var reasons = new java.util.ArrayList<String>();
            var minimum = java.util.regex.Pattern.compile("at least (\\d+)").matcher(message);
            if (text.contains("\"length\"") || minimum.find())
                reasons.add("debe tener al menos " + (minimum.find(0) ? minimum.group(1) : "6") + " caracteres");
            if (text.contains("\"characters\""))
                reasons.add("debe combinar los tipos de caracteres que exige Supabase (minúsculas, mayúsculas, números o símbolos)");
            if (text.contains("\"pwned\""))
                reasons.add("aparece en filtraciones conocidas; elegí otra");
            return ar.edu.aulas.api.DomainError.invalid("La contraseña no cumple la política de Supabase: " + (reasons.isEmpty() ? message : String.join("; ", reasons)) + ".");
        }
        if (code.equals("email_exists") || code.equals("user_already_exists"))
            return ar.edu.aulas.api.DomainError.conflict("El correo ya está registrado en Supabase Auth.");
        if (code.equals("email_address_invalid") || code.equals("email_address_not_authorized"))
            return ar.edu.aulas.api.DomainError.invalid("Supabase no acepta ese correo; revisá el formato y el dominio.");
        return ar.edu.aulas.api.DomainError.invalid(message.isEmpty()
            ? "Supabase rechazó los datos sin indicar el motivo."
            : "Supabase rechazó los datos: " + message);
    }
    private static String field(String json, String name) {
        var matcher = java.util.regex.Pattern.compile("\"" + name + "\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"").matcher(json);
        return matcher.find() ? matcher.group(1) : "";
    }
}
