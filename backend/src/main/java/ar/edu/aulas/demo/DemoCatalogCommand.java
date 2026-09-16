package ar.edu.aulas.demo;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** Never registered on normal startup; no Auth calls or background scheduling. */
@Component
@ConditionalOnProperty(name="aulas.command",havingValue="seed-catalogos")
public class DemoCatalogCommand implements ApplicationRunner {
    private final DemoCatalogSeed seed;
    private final Environment environment;
    public DemoCatalogCommand(DemoCatalogSeed seed,Environment environment) {this.seed=seed;this.environment=environment;}
    @Override public void run(ApplicationArguments arguments) {
        if(!"none".equalsIgnoreCase(environment.getProperty("spring.main.web-application-type"))) throw new IllegalStateException("La carga explícita requiere --spring.main.web-application-type=none.");
        var result=seed.seed();
        System.out.println("Carga "+result.dataset()+": "+result.roomsCreated()+" aulas, "+result.yearsCreated()+" años y "+result.coursesCreated()+" cursos creados. Datos existentes conservados.");
        result.discrepancies().forEach(detail->System.out.println("Discrepancia: "+detail));
    }
}
