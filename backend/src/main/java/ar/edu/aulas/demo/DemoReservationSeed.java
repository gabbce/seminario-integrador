package ar.edu.aulas.demo;

import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.references.ReferenceManagement;
import ar.edu.aulas.reservations.*;
import ar.edu.aulas.rooms.RoomsService;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

/** Explicit demo command: HTTP services retain their real institutional clock. */
@Service
public class DemoReservationSeed {
    public record Pattern(int day,String start,int modules,String room,List<String> expectedDates) {}
    public record Entry(String key,int year,String period,String subject,String commission,String teacherId,int students,String type,String board,List<String> resources,List<String> excluded,List<Pattern> patterns) {}
    public record Dataset(String dataset,int version,String description,String clock,List<Entry> entries) {}
    public record Result(String dataset,int created,int preserved,int occurrencesCreated,List<String> discrepancies) {}
    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final Environment environment;
    private final CalendarManagement calendars;
    private final RoomsService rooms;
    private final ReservationQueries queries;
    private final ReferenceManagement references;
    public DemoReservationSeed(JdbcTemplate db,ObjectMapper json,Environment environment,CalendarManagement calendars,RoomsService rooms,ReservationQueries queries,ReferenceManagement references) {
        this.db=db;this.json=json;this.environment=environment;this.calendars=calendars;this.rooms=rooms;this.queries=queries;this.references=references;
    }
    public Dataset dataset() {
        try(var input=new ClassPathResource("demo/reservas-i03-v1.json").getInputStream()) {return json.readValue(input,Dataset.class);}
        catch(Exception error) {throw new IllegalStateException("No se pudo leer el conjunto de reservas demo versionado.",error);}
    }
    private String normalize(String value) {return value.replaceAll("(?U)\\s+"," ").strip().toUpperCase(Locale.ROOT);}
    private String definition(Dataset data,Entry entry) {return json.writeValueAsString(Map.of("version",data.version(),"clock",data.clock(),"entry",entry));}
    // Complete persisted aggregate, including cancellation metadata, excluding mutable user profiles.
    private String snapshot(long id) {
        return db.queryForObject("""
            select jsonb_build_object('reserva',to_jsonb(r),
              'periodica',(select to_jsonb(p) from aulas.reserva_periodica p where p.id_reserva=r.id_reserva),
              'esporadica',(select to_jsonb(e) from aulas.reserva_esporadica e where e.id_reserva=r.id_reserva),
              'periodos',coalesce((select jsonb_agg(to_jsonb(p) order by p.id_cuatrimestre) from aulas.periodo_asignado p where p.id_reserva=r.id_reserva),'[]'::jsonb),
              'patrones',coalesce((select jsonb_agg(to_jsonb(p) order by p.id_patron) from aulas.patron_semanal p where p.id_reserva=r.id_reserva),'[]'::jsonb),
              'exclusiones',coalesce((select jsonb_agg(to_jsonb(e) order by e.fecha) from aulas.fecha_excluida e where e.id_reserva=r.id_reserva),'[]'::jsonb),
              'detalles',coalesce((select jsonb_agg(to_jsonb(d) order by d.id_detalle) from aulas.detalle_reserva d where d.id_reserva=r.id_reserva),'[]'::jsonb))::text
            from aulas.reserva r where r.id_reserva=?
            """,String.class,id);
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Result seed() {
        if(!"demo".equals(environment.getProperty("AULAS_ENVIRONMENT"))) throw new IllegalStateException("La carga ficticia requiere AULAS_ENVIRONMENT=demo.");
        // Manually constructed confirmation below joins this real outer transaction.
        if(!TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("La carga requiere una transacción activa.");
        Dataset data=dataset();
        if(data.dataset()==null || data.dataset().isBlank() || data.version()<1 || data.entries().isEmpty() || data.entries().stream().map(Entry::key).distinct().count()!=data.entries().size()) throw new IllegalStateException("Identidad del conjunto demo inválida.");
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);
        var actors=db.queryForList("select id_usuario from aulas.usuario where activo and rol='ADMINISTRADOR' order by id_usuario limit 1",Long.class);
        if(actors.isEmpty()) throw new IllegalStateException("Prepará primero un Administrador activo; la carga no crea cuentas ni consulta Auth.");
        long actor=actors.getFirst();var discrepancies=new ArrayList<String>();var pending=new ArrayList<Entry>();int preserved=0;
        // Recover identities before interpreting edited calendars, rooms or own occupied dates.
        for(Entry entry:data.entries()) {
            var previous=db.queryForList("select id_reserva,definicion=?::jsonb as same_definition from aulas.demo_reserva where dataset=? and clave=?",definition(data,entry),data.dataset(),entry.key());
            if(previous.isEmpty()) {pending.add(entry);continue;}
            long id=((Number)previous.getFirst().get("id_reserva")).longValue();preserved++;
            if(!Boolean.TRUE.equals(previous.getFirst().get("same_definition"))) discrepancies.add(entry.key()+": cambió la definición versionada; se conserva la reserva "+id+".");
            if(!Boolean.TRUE.equals(db.queryForObject("select snapshot=?::jsonb from aulas.demo_reserva where dataset=? and clave=?",Boolean.class,snapshot(id),data.dataset(),entry.key()))) discrepancies.add(entry.key()+": la reserva "+id+" tiene cambios manuales; no se restauran.");
        }
        Set<String> keys=new HashSet<>(data.entries().stream().map(Entry::key).toList());
        for(String key:db.queryForList("select clave from aulas.demo_reserva where dataset=? order by clave",String.class,data.dataset())) if(!keys.contains(key)) discrepancies.add(key+": ya no figura en la configuración; se conserva su reserva.");
        // Lock all competing resources before first write, matching the operational lock order.
        var yearIds=new TreeSet<Long>();var roomIds=new TreeSet<Long>();
        for(Entry entry:pending) {
            var ids=db.queryForList("select id_anio_lectivo from aulas.anio_lectivo where anio_calendario=?",Long.class,entry.year());
            if(ids.size()!=1) throw new IllegalStateException(entry.key()+": falta el año "+entry.year()+".");yearIds.add(ids.getFirst());
        }
        for(long id:yearIds) db.queryForObject("select id_anio_lectivo from aulas.anio_lectivo where id_anio_lectivo=? for update",Long.class,id);
        for(Entry entry:pending) for(Pattern pattern:entry.patterns()) {
            var ids=db.queryForList("select id_aula from aulas.aula where identificador=?",Long.class,pattern.room());
            if(ids.size()!=1) throw new IllegalStateException(entry.key()+": falta el aula "+pattern.room()+".");roomIds.add(ids.getFirst());
        }
        for(long id:roomIds) db.queryForObject("select id_aula from aulas.aula where id_aula=? for update",Long.class,id);
        var historical=new PeriodicPreparation(db,calendars,rooms,Clock.fixed(OffsetDateTime.parse(data.clock()).toInstant(),ZoneId.of("America/Argentina/Cordoba")));
        var confirmation=new PeriodicConfirmation(db,historical,queries,references);int occurrences=0;
        for(Entry entry:pending) {
            var courses=db.queryForList("select c.id_curso from aulas.curso c join aulas.materia m using(id_materia) join aulas.anio_lectivo a using(id_anio_lectivo) where m.nombre_normalizado=? and c.comision=? and a.anio_calendario=?",Long.class,normalize(entry.subject()),normalize(entry.commission()),entry.year());
            if(courses.size()!=1) throw new IllegalStateException(entry.key()+": falta el curso "+entry.subject()+" / "+entry.commission()+" / "+entry.year()+".");
            var proposal=new PeriodicPreparation.Request(entry.year(),courses.getFirst().toString(),entry.period(),entry.students(),entry.type(),entry.board(),entry.resources(),entry.excluded(),entry.patterns().stream().map(p->new PeriodicPreparation.Pattern(p.day(),p.start(),p.modules())).toList());
            var prepared=historical.prepare(proposal);var selections=new ArrayList<PeriodicConfirmation.Selection>();
            for(Pattern pattern:entry.patterns()) {
                var actual=prepared.patterns().stream().filter(p->p.day()==pattern.day()).findFirst().orElseThrow();
                if(!actual.dates().equals(pattern.expectedDates())) throw new IllegalStateException(entry.key()+": el calendario no produce las fechas previstas; no se crea ninguna reserva nueva.");
                var room=actual.availableRooms().stream().filter(r->r.id().equals(pattern.room())).findFirst().orElseThrow(()->new IllegalStateException(entry.key()+": aula "+pattern.room()+" ocupada o incompatible; no se crea ninguna reserva nueva."));
                selections.add(new PeriodicConfirmation.Selection(pattern.day(),room.internalId(),room.version(),actual.dates()));
            }
            UUID operation=UUID.nameUUIDFromBytes((data.dataset()+"/"+entry.key()).getBytes(StandardCharsets.UTF_8));
            var saved=confirmation.confirm(actor,new PeriodicConfirmation.Request(operation,proposal,entry.teacherId(),prepared.calendarVersion(),selections));
            long id=Long.parseLong(saved.get("id").toString());String definition=definition(data,entry),snapshot=snapshot(id);
            db.update("insert into aulas.demo_reserva(dataset,clave,version_dataset,id_reserva,definicion,snapshot) values (?,?,?,?,?::jsonb,?::jsonb)",data.dataset(),entry.key(),data.version(),id,definition,snapshot);
            String audit=json.writeValueAsString(Map.of("dataset",data.dataset(),"key",entry.key(),"definition",json.readTree(definition),"snapshot",json.readTree(snapshot)));
            db.update("insert into aulas.evento_auditoria(actor,operacion,entidad,entidad_id,resultado,detalle) values (?,'CARGAR_DEMO_RESERVA','RESERVA',?,'CONFIRMADO',?)",actor,id,audit);
            occurrences+=selections.stream().mapToInt(s->s.dates().size()).sum();
        }
        return new Result(data.dataset(),pending.size(),preserved,occurrences,List.copyOf(discrepancies));
    }
}
