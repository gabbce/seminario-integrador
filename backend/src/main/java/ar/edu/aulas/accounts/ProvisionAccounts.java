package ar.edu.aulas.accounts;

import ar.edu.aulas.AulasApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.core.env.Environment;

/** Explicit provisioning entry point. Normal server startup never calls this. */
public class ProvisionAccounts {
    public static void main(String[] args) {
        if (args.length != 1 || !(args[0].equals("admin") || args[0].equals("demo")))
            throw new IllegalArgumentException("Uso: exec:java -Dexec.args=admin|demo");
        try (var context=new SpringApplicationBuilder(AulasApplication.class).web(WebApplicationType.NONE).run()) {
            Environment e=context.getEnvironment();
            var service=context.getBean(AccountProvisioner.class);
            if (args[0].equals("admin")) {
                service.prepare(new AccountSpec(e.getRequiredProperty("AULAS_ADMIN_EMAIL"),e.getRequiredProperty("AULAS_ADMIN_NOMBRE"),
                    e.getRequiredProperty("AULAS_ADMIN_APELLIDO"),"ADMINISTRADOR",true),e.getRequiredProperty("AULAS_ADMIN_PASSWORD"));
                System.out.println("Administrador preparado. Credenciales existentes conservadas.");
            } else {
                if (!"demo".equals(e.getProperty("AULAS_ENVIRONMENT")))
                    throw new IllegalStateException("La carga ficticia requiere AULAS_ENVIRONMENT=demo");
                String password=e.getRequiredProperty("AULAS_DEMO_PASSWORD");
                service.prepare(new AccountSpec("admin@demo.local","Admin","Demo","ADMINISTRADOR",true),password);
                service.prepare(new AccountSpec("bedel@demo.local","Bedel","Demo","BEDEL",true),password);
                service.prepare(new AccountSpec("docente@demo.local","Docente","Demo","DOCENTE",true),password);
                service.prepare(new AccountSpec("inhabilitado@demo.local","Cuenta","Inhabilitada","DOCENTE",false),password);
                System.out.println("Cuatro cuentas ficticias preparadas. Contraseñas existentes conservadas.");
            }
        }
    }
}
