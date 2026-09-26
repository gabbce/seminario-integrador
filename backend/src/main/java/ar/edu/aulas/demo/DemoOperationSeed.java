package ar.edu.aulas.demo;

import ar.edu.aulas.calendar.CalendarManagement;
import ar.edu.aulas.references.ReferenceManagement;
import ar.edu.aulas.reservations.*;
import ar.edu.aulas.rooms.RoomsService;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;

/** Additive, explicit I-04 dataset. Historical clock never enters operational beans. */
@Service
public class DemoOperationSeed {
    public record Entry(String key,int year,String subject,String commission,String teacherId,int students,String type,String board,List<String> resources,String room,String start,int modules,List<String> dates,String period,Integer day,List<String> excluded,List<String> cancelDates,String targetRoom,String moveDate,String targetDate) {}
    public record Dataset(String dataset,int version,String description,String clock,List<Entry> entries) {}
    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final Environment environment;
    private final CalendarManagement calendars;
    private final RoomsService rooms;
    private final ReservationQueries queries;
    private final ReferenceManagement references;
    private final DemoReservationSeed snapshots;
    public DemoOperationSeed(JdbcTemplate db,ObjectMapper json,Environment environment,CalendarManagement calendars,RoomsService rooms,ReservationQueries queries,ReferenceManagement references,DemoReservationSeed snapshots){this.db=db;this.json=json;this.environment=environment;this.calendars=calendars;this.rooms=rooms;this.queries=queries;this.references=references;this.snapshots=snapshots;}
    public Dataset dataset(){try(var input=new ClassPathResource("demo/operacion-i04-v1.json").getInputStream()){return json.readValue(input,Dataset.class);}catch(Exception e){throw new IllegalStateException("No se pudo leer el conjunto demo I-04.",e);}}
    private String definition(Dataset d,Entry e){return json.writeValueAsString(Map.of("version",d.version(),"clock",d.clock(),"entry",e));}
    private String normalize(String value){return value.replaceAll("(?U)\\s+"," ").strip().toUpperCase(Locale.ROOT);}
    private UUID operation(Dataset d,Entry e,String action){return UUID.nameUUIDFromBytes((d.dataset()+"/"+e.key()+"/"+action).getBytes(StandardCharsets.UTF_8));}
    private long version(long id){return db.queryForObject("select version from aulas.reserva where id_reserva=?",Long.class,id);}
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public DemoReservationSeed.Result seed(){checkEnvironment();return seedDataset(dataset(),false);}
    private void checkEnvironment(){if(!"demo".equals(environment.getProperty("AULAS_ENVIRONMENT")))throw new IllegalStateException("La carga ficticia requiere AULAS_ENVIRONMENT=demo.");}
    DemoReservationSeed.Result seedDataset(Dataset data,boolean strict){
        checkEnvironment();
        if(!TransactionSynchronizationManager.isActualTransactionActive())throw new IllegalStateException("La carga requiere una transacción activa.");
        if(data.dataset()==null || data.dataset().isBlank() || data.version()<1 || data.entries().isEmpty() || data.entries().stream().map(Entry::key).distinct().count()!=data.entries().size())throw new IllegalStateException("Identidad del conjunto demo inválida.");
        db.queryForObject("select id from aulas.control_cuentas where id=1 for update",Integer.class);
        var actors=db.queryForList("select id_usuario from aulas.usuario where activo and rol='ADMINISTRADOR' order by id_usuario limit 1",Long.class);
        if(actors.isEmpty())throw new IllegalStateException("Prepará primero un Administrador activo; la carga no crea cuentas ni consulta Auth.");
        long actor=actors.getFirst();int preserved=0;var pending=new ArrayList<Entry>();var discrepancies=new ArrayList<String>();
        var registered=new HashMap<String,Map<String,Object>>();
        for(var row:db.queryForList("select clave,id_reserva,definicion::text,snapshot::text from aulas.demo_reserva where dataset=?",data.dataset()))registered.put(row.get("clave").toString(),row);
        for(var entry:data.entries()){
            var previous=registered.get(entry.key());
            if(previous==null){pending.add(entry);continue;}
            long id=((Number)previous.get("id_reserva")).longValue();preserved++;
            if(!json.readTree(previous.get("definicion").toString()).equals(json.readTree(definition(data,entry))))discrepancies.add(entry.key()+": cambió la definición; se conserva la reserva "+id+".");
            if(!json.readTree(previous.get("snapshot").toString()).equals(json.readTree(snapshots.snapshot(id))))discrepancies.add(entry.key()+": la reserva "+id+" tiene cambios manuales; no se restauran.");
        }
        var keys=new HashSet<>(data.entries().stream().map(Entry::key).toList());
        for(String key:new TreeSet<>(registered.keySet()))if(!keys.contains(key))discrepancies.add(key+": retirada de configuración; reserva conservada.");
        if(strict && !pending.isEmpty() && !discrepancies.isEmpty())throw new IllegalStateException("Discrepancias previas; no se agregan claves pendientes: "+String.join("; ",discrepancies));
        var yearIds=new TreeSet<Long>();var roomIds=new TreeSet<Long>();
        for(int year:pending.stream().map(Entry::year).distinct().sorted().toList()){
            var ids=db.queryForList("select id_anio_lectivo from aulas.anio_lectivo where anio_calendario=?",Long.class,year);
            if(ids.size()!=1)throw new IllegalStateException(year+": falta el año.");yearIds.add(ids.getFirst());
        }
        for(long id:yearIds)db.queryForObject("select id_anio_lectivo from aulas.anio_lectivo where id_anio_lectivo=? for update",Long.class,id);
        var names=new TreeSet<String>();
        for(var e:pending){names.add(e.room());if(e.targetRoom()!=null)names.add(e.targetRoom());}
        for(String name:names){
            var ids=db.queryForList("select id_aula from aulas.aula where identificador=?",Long.class,name);
            if(ids.size()!=1)throw new IllegalStateException("Falta el aula "+name+".");roomIds.add(ids.getFirst());
        }
        for(long id:roomIds)db.queryForObject("select id_aula from aulas.aula where id_aula=? for update",Long.class,id);
        // Resolutions are scoped to this transaction; preparation still revalidates every booking.
        record CourseKey(String subject,String commission,int year) {}
        var courseIds=new HashMap<CourseKey,String>();
        for(var e:pending){
            var key=new CourseKey(normalize(e.subject()),normalize(e.commission()),e.year());
            if(courseIds.containsKey(key))continue;
            var ids=db.queryForList("select c.id_curso from aulas.curso c join aulas.materia m using(id_materia) join aulas.anio_lectivo a using(id_anio_lectivo) where m.nombre_normalizado=? and c.comision=? and a.anio_calendario=?",Long.class,key.subject(),key.commission(),key.year());
            if(ids.size()!=1)throw new IllegalStateException(e.key()+": falta el curso.");courseIds.put(key,ids.getFirst().toString());
        }
        var clock=Clock.fixed(OffsetDateTime.parse(data.clock()).toInstant(),ZoneId.of("America/Argentina/Cordoba"));
        var factory=new StaticListableBeanFactory();factory.addBean("clock",clock);var clocks=factory.getBeanProvider(Clock.class);
        var periodic=new PeriodicPreparation(db,calendars,rooms,clock);var periodicConfirm=new PeriodicConfirmation(db,periodic,queries,references);
        var sporadic=new SporadicPreparation(db,calendars,rooms,clocks);var sporadicConfirm=new SporadicConfirmation(db,sporadic,queries,references);
        var roomChanges=new RoomMutationService(db,rooms,clocks,json);var reschedules=new RescheduleService(db,calendars,rooms,clocks,json);var cancellations=new CancellationService(db,clocks,json);
        int occurrences=0,processed=0;
        for(var e:pending){
            String course=courseIds.get(new CourseKey(normalize(e.subject()),normalize(e.commission()),e.year()));Map<String,Object> booking;
            if(e.period()!=null){
                var proposal=new PeriodicPreparation.Request(e.year(),course,e.period(),e.students(),e.type(),e.board(),e.resources(),e.excluded(),List.of(new PeriodicPreparation.Pattern(e.day(),e.start(),e.modules())));
                var ready=periodic.prepare(proposal);var pattern=ready.patterns().getFirst();
                if(!pattern.dates().equals(e.dates()))throw new IllegalStateException(e.key()+": el calendario no produce las fechas previstas; ninguna nueva reserva guardada.");
                var room=pattern.availableRooms().stream().filter(r->r.id().equals(e.room())).findFirst().orElseThrow(()->new IllegalStateException(e.key()+": aula ocupada o incompatible."));
                booking=periodicConfirm.confirm(actor,new PeriodicConfirmation.Request(operation(data,e,"create"),proposal,e.teacherId(),ready.calendarVersion(),List.of(new PeriodicConfirmation.Selection(e.day(),room.internalId(),room.version(),pattern.dates()))));
            }else{
                var proposal=new SporadicPreparation.Request(e.year(),course,e.students(),e.type(),e.board(),e.resources(),e.dates().stream().map(date->new SporadicPreparation.DateSlot(date,e.start(),e.modules())).toList());
                var ready=sporadic.prepare(proposal,true);var selections=ready.dates().stream().map(date->{var room=date.availableRooms().stream().filter(r->r.id().equals(e.room())).findFirst().orElseThrow(()->new IllegalStateException(e.key()+": aula ocupada o incompatible."));return new SporadicConfirmation.Selection(date.date(),room.internalId(),room.version());}).toList();
                booking=sporadicConfirm.confirm(actor,new SporadicConfirmation.Request(operation(data,e,"create"),proposal,e.teacherId(),ready.calendarVersion(),selections));
            }
            long id=Long.parseLong(booking.get("id").toString());
            if(e.targetRoom()!=null){
                var target=rooms.references().stream().filter(r->r.id().equals(e.targetRoom())).findFirst().orElseThrow();
                @SuppressWarnings("unchecked") var groups=(List<Map<String,Object>>)roomChanges.options(actor,id,new RoomMutationService.Version(version(id))).get("groups");
                var selections=groups.stream().map(g->{@SuppressWarnings("unchecked") var ids=(List<String>)g.get("detailIds");return new RoomMutationService.Selection(g.get("groupId").toString(),ids,target.internalId(),target.version());}).toList();
                roomChanges.confirm(actor,id,new RoomMutationService.Request(operation(data,e,"rooms"),version(id),selections));
            }
            if(e.moveDate()!=null){
                String detail=db.queryForObject("select id_detalle::text from aulas.detalle_reserva where id_reserva=? and fecha=?",String.class,id,LocalDate.parse(e.moveDate()));
                var dates=List.of(new RescheduleService.DateChange(detail,e.targetDate(),e.start(),e.modules()));
                var proposal=new RescheduleService.Request(operation(data,e,"reschedule"),version(id),dates,null,null);var reviewed=reschedules.prepare(actor,id,proposal);
                @SuppressWarnings("unchecked") var roomVersions=(Map<String,Long>)reviewed.get("roomVersions");
                reschedules.confirm(actor,id,new RescheduleService.Request(proposal.operationId(),proposal.version(),dates,((Number)reviewed.get("calendarVersion")).longValue(),roomVersions));
            }
            if(e.cancelDates()!=null && !e.cancelDates().isEmpty()){
                var ids=e.cancelDates().stream().map(date->db.queryForObject("select id_detalle::text from aulas.detalle_reserva where id_reserva=? and fecha=?",String.class,id,LocalDate.parse(date))).toList();
                cancellations.confirm(actor,id,new CancellationService.Request(operation(data,e,"cancel"),version(id),ids,"Cancelación ficticia del conjunto "+(data.dataset().equals("operacion-i04")?"I-04":data.dataset())+": "+e.key()));
            }
            String snapshot=snapshots.snapshot(id),definition=definition(data,e);
            db.update("insert into aulas.demo_reserva(dataset,clave,version_dataset,id_reserva,definicion,snapshot) values (?,?,?,?,?::jsonb,?::jsonb)",data.dataset(),e.key(),data.version(),id,definition,snapshot);
            db.update("insert into aulas.evento_auditoria(actor,operacion,entidad,entidad_id,resultado,detalle) values (?,?,'RESERVA',?,'CONFIRMADO',?)",actor,data.dataset().equals("operacion-i04")?"CARGAR_DEMO_I04":"CARGAR_DEMO_I05",id,json.writeValueAsString(Map.of("dataset",data.dataset(),"key",e.key(),"definition",json.readTree(definition),"snapshot",json.readTree(snapshot))));
            occurrences+=e.dates().size();processed++;
            if(strict && (processed%25==0 || processed==pending.size())) org.slf4j.LoggerFactory.getLogger(DemoOperationSeed.class).info("Demo {}: {} de {} reservas procesadas; transacción todavía SIN confirmar.",data.dataset(),processed,pending.size());
        }
        return new DemoReservationSeed.Result(data.dataset(),pending.size(),preserved,occurrences,List.copyOf(discrepancies));
    }
}
