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
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(15));
        return RestClient.builder().baseUrl(environment.getRequiredProperty("AULAS_SUPABASE_URL")+"/auth/v1")
            .requestFactory(factory)
            .defaultHeader("apikey", environment.getRequiredProperty("AULAS_SUPABASE_SECRET_KEY"))
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
                throw ar.edu.aulas.api.DomainError.invalid("Supabase rechazó los datos. Revisá el correo o la política de contraseña.");
            throw new IllegalStateException("No se confirmó el cambio en Auth; su resultado puede ser incierto.");
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
                throw ar.edu.aulas.api.DomainError.invalid("Supabase rechazó el alta. Revisá el correo y la política de contraseña.");
            throw new IllegalStateException("No se pudo confirmar el alta de Auth.");
        } catch (RuntimeException e) {
            throw new IllegalStateException("Alta Auth no confirmada. Repetir el comando comprobará el resultado antes de crear otra identidad.");
        }
    }
}
