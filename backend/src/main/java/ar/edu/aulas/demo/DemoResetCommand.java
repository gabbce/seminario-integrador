package ar.edu.aulas.demo;

import java.util.Arrays;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
@ConditionalOnProperty(name="aulas.command",havingValue="reset-demo")
public class DemoResetCommand implements ApplicationRunner {
    private final DemoResetService service;private final Environment env;private final ObjectMapper json;
    public DemoResetCommand(DemoResetService service,Environment env,ObjectMapper json){this.service=service;this.env=env;this.json=json;}
    public void run(ApplicationArguments args){
        if(!"none".equalsIgnoreCase(env.getProperty("spring.main.web-application-type")))throw new IllegalStateException("El comando requiere --spring.main.web-application-type=none.");
        var selected=Arrays.stream(env.getProperty("aulas.reset.datasets","").split(",",-1)).map(String::strip).toList();
        String confirmation=env.getProperty("aulas.reset.confirm");
        var review=confirmation==null?service.preview(selected):service.reset(selected,confirmation,env.getProperty("aulas.reset.application-stopped",Boolean.class,false));
        System.out.println((confirmation==null?"PREVISUALIZACIÓN — SIN CAMBIOS\n":"RESTABLECIMIENTO CONFIRMADO\n")+json.writerWithDefaultPrettyPrinter().writeValueAsString(review));
    }
}
