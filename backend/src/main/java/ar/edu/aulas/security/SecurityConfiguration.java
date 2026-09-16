package ar.edu.aulas.security;

import ar.edu.aulas.accounts.AccountRepository;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.client.RestTemplate;

@Configuration
@ConditionalOnWebApplication(type=ConditionalOnWebApplication.Type.SERVLET)
public class SecurityConfiguration {
    @Bean JwtDecoder jwtDecoder(Environment env) {
        String issuer=env.getRequiredProperty("aulas.auth.issuer");
        var factory=new JdkClientHttpRequestFactory(java.net.http.HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(5));
        var decoder=NimbusJwtDecoder.withJwkSetUri(env.getRequiredProperty("aulas.auth.jwks"))
            .jwsAlgorithms(algorithms->{ algorithms.clear(); algorithms.add(SignatureAlgorithm.ES256); algorithms.add(SignatureAlgorithm.RS256); })
            .restOperations(new RestTemplate(factory)).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer),
            new JwtClaimValidator<List<String>>("aud",aud->aud!=null && aud.contains("authenticated")),
            new JwtClaimValidator<Object>("exp",exp->exp!=null)));
        return decoder;
    }
    @Bean SecurityFilterChain api(HttpSecurity http,AccountRepository accounts) throws Exception {
        return http.csrf(csrf->csrf.disable())
            .sessionManagement(session->session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .requestCache(cache->cache.disable())
            .authorizeHttpRequests(rules->rules
                .requestMatchers("/api/health", "/api/health/**").permitAll()
                .requestMatchers("/api/me").authenticated()
                .requestMatchers(org.springframework.http.HttpMethod.GET,"/api/aulas","/api/referencias/**").authenticated()
                .requestMatchers("/api/aulas","/api/aulas/**").hasAnyRole("ADMINISTRADOR","BEDEL")
                .requestMatchers(org.springframework.http.HttpMethod.POST,"/api/referencias/cursos").hasAnyRole("ADMINISTRADOR","BEDEL")
                .requestMatchers("/api/administracion/**").hasRole("ADMINISTRADOR")
                .requestMatchers("/api/indicadores/**").hasAnyRole("ADMINISTRADOR","BEDEL")
                .anyRequest().denyAll())
            .oauth2ResourceServer(oauth->oauth.jwt(jwt->{})
                .authenticationEntryPoint(ApiErrors::authentication))
            .exceptionHandling(errors->errors
                .authenticationEntryPoint(ApiErrors::authentication)
                .accessDeniedHandler((req,res,error)->ApiErrors.write(res,403,"FORBIDDEN","No tenés permiso para esta operación.")))
            .addFilterAfter(new CurrentAccountFilter(accounts),BearerTokenAuthenticationFilter.class)
            .build();
    }
}
