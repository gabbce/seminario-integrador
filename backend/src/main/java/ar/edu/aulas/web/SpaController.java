package ar.edu.aulas.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Only known client routes fall back to React; API and missing assets retain their errors. */
@Controller
public class SpaController {
 @GetMapping({"/","/agenda","/disponibilidad","/reservas","/reservas/nueva","/reservas/{id:[0-9]+}","/aulas","/indicadores","/administracion","/administracion/calendario"})
 public String index(){return "forward:/index.html";}
}
