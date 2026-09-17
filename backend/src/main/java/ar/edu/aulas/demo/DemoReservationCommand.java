package ar.edu.aulas.demo;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="aulas.command",havingValue="seed-reservas")
public class DemoReservationCommand implements ApplicationRunner {
    private final DemoReservationSeed seed;
    private final Environment environment;
    public DemoReservationCommand(DemoReservationSeed seed,Environment environment) {this.seed=seed;this.environment=environment;}
    @Override public void run(ApplicationArguments arguments) {
        if(!"none".equalsIgnoreCase(environment.getProperty("spring.main.web-application-type"))) throw new IllegalStateException("La carga explícita requiere --spring.main.web-application-type=none.");
        var result=seed.seed();
        System.out.println("Carga "+result.dataset()+": "+result.created()+" reservas y "+result.occurrencesCreated()+" clases creadas; "+result.preserved()+" reservas conservadas.");
        result.discrepancies().forEach(detail->System.out.println("Discrepancia: "+detail));
    }
}
