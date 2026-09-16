package ar.edu.aulas.demo;

import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.rooms.RoomsService;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class DemoCatalogSeed {
    public record Dataset(String dataset,String description,String historyFrom,String retiredAt,List<Room> rooms,List<Calendar> calendars,List<String> subjects,List<String> commissions) {}
    public record Room(String id,String type,int capacity,String state,String location,int floor,String board,List<String> resources,Integer computers) {}
    public record Calendar(int year,String state,Map<String,List<String>> terms,List<String> holidays,Map<String,String> descriptions) {}
    public record Result(String dataset,int roomsCreated,int yearsCreated,int coursesCreated,List<String> discrepancies) {}
    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final Environment environment;
    private final RoomsService rooms;
    private final CalendarManagement calendars;
    public DemoCatalogSeed(JdbcTemplate db,ObjectMapper json,Environment environment,RoomsService rooms,CalendarManagement calendars) {this.db=db;this.json=json;this.environment=environment;this.rooms=rooms;this.calendars=calendars;}
    public Dataset dataset() {
        try(var input=new ClassPathResource("demo/catalogos-i02-v1.json").getInputStream()) {return json.readValue(input,Dataset.class);}
        catch(Exception error) {throw new IllegalStateException("No se pudo leer la configuración de demostración versionada.",error);}
    }
    private String normalize(String value) {return value.replaceAll("(?U)\\s+"," ").strip().toUpperCase(Locale.ROOT);}
    private void audit(long actor,long id,String entity,String detail) {db.update("insert into aulas.evento_auditoria(actor,operacion,entidad,entidad_id,resultado,detalle) values (?,'CARGAR_DEMO',?,?,'CONFIRMADO',?)",actor,entity,id,detail);}
    @Transactional public Result seed() {
        if(!"demo".equals(environment.getProperty("AULAS_ENVIRONMENT"))) throw new IllegalStateException("La carga ficticia requiere AULAS_ENVIRONMENT=demo.");
        Dataset data=dataset();
        // Permissions, calendar and catalog writes use the same first lock. Rooms are locked below.
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);
        var actors=db.queryForList("select id_usuario from aulas.usuario where activo and rol='ADMINISTRADOR' order by id_usuario limit 1",Long.class);
        if(actors.isEmpty()) throw new IllegalStateException("Prepará primero un Administrador activo. La carga de catálogos no crea cuentas ni consulta Auth.");
        long actor=actors.getFirst();int roomsCreated=0,yearsCreated=0,coursesCreated=0;
        var discrepancies=new ArrayList<String>();
        for(Room desired:data.rooms()) {
            var existing=db.queryForList("select id_aula from aulas.aula where lower(btrim(identificador))=lower(btrim(?)) for update",Long.class,desired.id());
            if(!existing.isEmpty()) {
                var actual=rooms.get(existing.getFirst());
                if(!sameRoom(actual,desired,data)) discrepancies.add("Aula "+desired.id()+": difiere del ejemplo; se conserva su información e historial.");
                continue;
            }
            long id=insertRoom(desired,data);roomsCreated++;audit(actor,id,"AULA",data.dataset()+": "+desired);
        }
        for(Calendar desired:data.calendars()) {
            var existing=db.queryForList("select id_anio_lectivo from aulas.anio_lectivo where anio_calendario=? for update",Long.class,desired.year());
            long yearId;
            if(existing.isEmpty()) {
                yearId=insertCalendar(desired);yearsCreated++;audit(actor,yearId,"ANIO_LECTIVO",data.dataset()+": "+desired);
            } else {
                yearId=existing.getFirst();var actual=calendars.get(yearId);
                if(!actual.state().equals(desired.state()) || !actual.terms().equals(desired.terms()) || !new HashSet<>(actual.holidays()).equals(new HashSet<>(desired.holidays())) || !actual.descriptions().equals(desired.descriptions())) discrepancies.add("Año "+desired.year()+": difiere del ejemplo; no se cambian estado, períodos ni fechas no lectivas.");
                if(!actual.state().equals("Habilitado")) {discrepancies.add("Año "+desired.year()+": no se agregan cursos porque no está habilitado.");continue;}
            }
            for(String subject:data.subjects()) {
                db.update("insert into aulas.materia(nombre,nombre_normalizado) values (?,?) on conflict(nombre_normalizado) do nothing",subject,normalize(subject));
                long matter=db.queryForObject("select id_materia from aulas.materia where nombre_normalizado=?",Long.class,normalize(subject));
                String actualName=db.queryForObject("select nombre from aulas.materia where id_materia=?",String.class,matter);
                if(!actualName.equals(subject)) discrepancies.add("Materia "+subject+": se conserva el nombre existente «"+actualName+"».");
                for(String commission:data.commissions()) {
                    var inserted=db.queryForList("insert into aulas.curso(id_materia,id_anio_lectivo,comision) values (?,?,?) on conflict(id_materia,comision,id_anio_lectivo) do nothing returning id_curso",Long.class,matter,yearId,normalize(commission));
                    if(!inserted.isEmpty()) {coursesCreated++;audit(actor,inserted.getFirst(),"CURSO",data.dataset()+": "+subject+" / "+commission+" / "+desired.year());}
                }
            }
        }
        return new Result(data.dataset(),roomsCreated,yearsCreated,coursesCreated,List.copyOf(new LinkedHashSet<>(discrepancies)));
    }
    private long insertRoom(Room room,Dataset data) {
        boolean retired=room.state().equals("Baja");String state=retired?"Habilitada":room.state();
        Timestamp from=Timestamp.from(OffsetDateTime.parse(data.historyFrom()).toInstant()),retiredAt=Timestamp.from(OffsetDateTime.parse(data.retiredAt()).toInstant());
        long id=db.queryForObject("insert into aulas.aula(identificador,tipo,capacidad,estado,ubicacion,piso,pizarron,ventiladores,aire,baja_en) values (?,?,?,?,?,?,?,?,?,?) returning id_aula",Long.class,room.id(),room.type(),room.capacity(),state,room.location(),room.floor(),room.board(),room.resources().contains("fans"),room.resources().contains("air"),retired?retiredAt:null);
        if(room.type().equals("Multimedios")) db.update("insert into aulas.aula_multimedios(id_aula,televisor,proyector,computadora) values (?,?,?,?)",id,room.resources().contains("television"),room.resources().contains("projector"),room.resources().contains("computer"));
        if(room.type().equals("Laboratorio")) db.update("insert into aulas.aula_laboratorio(id_aula,cantidad_pc) values (?,?)",id,room.computers());
        db.update("insert into aulas.historial_aula(id_aula,desde,hasta,tipo,estado,baja) values (?,?,?,?,?,false)",id,from,retired?retiredAt:null,room.type(),state);
        if(retired) db.update("insert into aulas.historial_aula(id_aula,desde,tipo,estado,baja) values (?,?,?, ?,true)",id,retiredAt,room.type(),state);
        return id;
    }
    private boolean sameRoom(RoomsService.Room actual,Room expected,Dataset data) {
        String historyFrom=OffsetDateTime.parse(data.historyFrom()).atZoneSameInstant(ZoneId.of("America/Argentina/Cordoba")).toLocalDateTime().toString();
        String retirement=OffsetDateTime.parse(data.retiredAt()).atZoneSameInstant(ZoneId.of("America/Argentina/Cordoba")).toLocalDateTime().toString();
        var history=expected.state().equals("Baja")?List.of(new RoomsService.History(historyFrom,"Habilitada",expected.type()),new RoomsService.History(retirement,"Baja",expected.type())):List.of(new RoomsService.History(historyFrom,expected.state(),expected.type()));
        return actual.id().equals(expected.id()) && actual.type().equals(expected.type()) && actual.capacity()==expected.capacity() && actual.state().equals(expected.state()) && actual.location().equals(expected.location()) && actual.floor()==expected.floor() && actual.board().equals(expected.board()) && new HashSet<>(actual.resources()).equals(new HashSet<>(expected.resources())) && Objects.equals(actual.computers(),expected.computers()) && actual.history().equals(history);
    }
    private long insertCalendar(Calendar calendar) {
        long id=db.queryForObject("insert into aulas.anio_lectivo(anio_calendario,estado) values (?,'HABILITADO') returning id_anio_lectivo",Long.class,calendar.year());
        for(int number=1;number<=2;number++) {var range=calendar.terms().get(number==1?"first":"second");db.update("insert into aulas.cuatrimestre(id_anio_lectivo,numero,inicio,fin) values (?,?,?,?)",id,number,LocalDate.parse(range.get(0)),LocalDate.parse(range.get(1)));}
        for(String day:calendar.holidays()) db.update("insert into aulas.feriado(id_anio_lectivo,fecha,descripcion) values (?,?,?)",id,LocalDate.parse(day),calendar.descriptions().get(day));
        return id;
    }
}
